/**
 * File Upload and Parsing Module
 * Supports: CSV, PDF, Excel (XLSX), JSON, Word (DOCX)
 */

const fs = require('fs').promises;
const path = require('path');
const csvParser = require('csv-parser');
const { Readable } = require('stream');
const xlsx = require('xlsx');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');

/**
 * Parse uploaded file based on type
 * Returns structured portfolio data as string
 */
async function parseFile(filePath, fileType) {
  try {
    switch (fileType.toLowerCase()) {
      case 'csv':
        return await parseCSV(filePath);
      case 'pdf':
        return await parsePDF(filePath);
      case 'xlsx':
      case 'xls':
        return await parseExcel(filePath);
      case 'json':
        return await parseJSON(filePath);
      case 'docx':
      case 'doc':
        return await parseWord(filePath);
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'tiff':
      case 'bmp':
        return await parseImage(filePath);
      default:
        throw new Error(`Unsupported file type: ${fileType}`);
    }
  } catch (error) {
    console.error('Error parsing file:', error);
    throw new Error(`Failed to parse ${fileType} file: ${error.message}`);
  }
}

/**
 * Parse CSV file
 * Expected columns: Ticker, Quantity, Price (or variations)
 */
async function parseCSV(filePath) {
  return new Promise(async (resolve, reject) => {
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const rows = [];

    Readable.from(fileContent)
      .pipe(csvParser())
      .on('data', (row) => rows.push(row))
      .on('end', () => {
        // Format rows as readable text
        const formatted = rows.map(row => {
          const ticker = row.Ticker || row.ticker || row.Symbol || row.symbol || '';
          const quantity = row.Quantity || row.quantity || row.Shares || row.shares || '';
          const price = row.Price || row.price || row.Value || row.value || '';

          if (ticker) {
            return `${ticker}: ${quantity} shares @ $${price}`;
          }
          return JSON.stringify(row);
        }).join('\n');

        resolve(formatted || JSON.stringify(rows, null, 2));
      })
      .on('error', reject);
  });
}

/**
 * Parse PDF file
 * Extract text content or use OCR if needed
 */
async function parsePDF(filePath) {
  try {
    // First try text extraction
    const dataBuffer = await fs.readFile(filePath);
    const data = await pdfParse(dataBuffer);
    const extractedText = (data.text || '').trim();

    // If we got good text, use it
    if (extractedText.length > 100) {
      console.log('✅ PDF text extraction successful');
      return extractedText;
    }

    // Otherwise, this might be a scanned PDF - use OCR
    console.log('⚠️  PDF has little text, attempting OCR...');
    const { ocrPDF } = require('./ocr');
    const ocrResult = await ocrPDF(filePath);

    return `[OCR Extracted - Confidence: ${ocrResult.confidence.toFixed(1)}%]\n\n${ocrResult.text}`;

  } catch (error) {
    console.error('PDF parsing error:', error);
    return 'Failed to extract text from PDF';
  }
}

/**
 * Parse Excel file (XLSX/XLS)
 * Read first sheet
 */
async function parseExcel(filePath) {
  const workbook = xlsx.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  // Convert to JSON
  const jsonData = xlsx.utils.sheet_to_json(sheet);

  // Format as readable text
  const formatted = jsonData.map(row => {
    const ticker = row.Ticker || row.ticker || row.Symbol || row.symbol || '';
    const quantity = row.Quantity || row.quantity || row.Shares || row.shares || '';
    const price = row.Price || row.price || row.Value || row.value || '';

    if (ticker) {
      return `${ticker}: ${quantity} shares @ $${price}`;
    }
    return JSON.stringify(row);
  }).join('\n');

  return formatted || JSON.stringify(jsonData, null, 2);
}

/**
 * Parse JSON file
 */
async function parseJSON(filePath) {
  const fileContent = await fs.readFile(filePath, 'utf-8');
  const data = JSON.parse(fileContent);

  // If array of holdings, format nicely
  if (Array.isArray(data)) {
    return data.map(item => {
      if (item.ticker || item.Ticker) {
        const ticker = item.ticker || item.Ticker;
        const quantity = item.quantity || item.Quantity || item.shares || '';
        const price = item.price || item.Price || item.value || '';
        return `${ticker}: ${quantity} shares @ $${price}`;
      }
      return JSON.stringify(item);
    }).join('\n');
  }

  return JSON.stringify(data, null, 2);
}

/**
 * Parse Word document (DOCX)
 */
async function parseWord(filePath) {
  const buffer = await fs.readFile(filePath);
  const result = await mammoth.extractRawText({ buffer });
  return result.value || 'No text extracted from Word document';
}

/**
 * Parse image file using OCR
 */
async function parseImage(filePath) {
  const { performOCR } = require('./ocr');
  const ocrResult = await performOCR(filePath);
  return `[OCR Image - Confidence: ${ocrResult.confidence.toFixed(1)}%]\n\n${ocrResult.text}`;
}

/**
 * Extract portfolio holdings from text
 * Tries to find ticker symbols and values
 */
function extractHoldings(text) {
  const holdings = [];

  // Pattern: AAPL 100 $150.00 or AAPL: 100 shares @ $150.00
  const patterns = [
    /([A-Z]{1,5})\s*:?\s*([\d,]+)\s*shares?\s*@?\s*\$?([\d,.]+)/gi,
    /([A-Z]{1,5})\s+([\d,]+)\s+\$?([\d,.]+)/g,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      holdings.push({
        ticker: match[1],
        quantity: match[2].replace(/,/g, ''),
        price: match[3].replace(/,/g, ''),
      });
    }
  }

  return holdings;
}

module.exports = {
  parseFile,
  extractHoldings,
};
