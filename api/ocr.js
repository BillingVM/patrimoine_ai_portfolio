/**
 * OCR Module using Tesseract.js + Google Cloud Vision API
 * Handles scanned documents and images
 */

const { createWorker } = require('tesseract.js');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

let ocrWorker = null;

/**
 * Initialize Tesseract worker (reusable)
 */
async function initOCR() {
  if (!ocrWorker) {
    console.log('🔧 Initializing Tesseract OCR worker...');
    ocrWorker = await createWorker('eng', 1, {
      logger: m => {
        if (m.status === 'recognizing text') {
          console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
        }
      }
    });
    console.log('✅ OCR worker ready');
  }
  return ocrWorker;
}

/**
 * Perform OCR using Google Cloud Vision API
 */
async function performGoogleVisionOCR(imagePath) {
  try {
    const vision = require('@google-cloud/vision');

    // Create client
    const client = new vision.ImageAnnotatorClient({
      keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    });

    console.log(`🔍 Running Google Vision OCR on: ${path.basename(imagePath)}`);

    // Read image file
    const imageBuffer = await fs.readFile(imagePath);

    // Perform text detection
    const [result] = await client.textDetection(imageBuffer);
    const detections = result.textAnnotations;

    if (!detections || detections.length === 0) {
      return { text: '', confidence: 0, words: 0 };
    }

    // First annotation contains full text
    const fullText = detections[0].description || '';

    // Calculate average confidence from all detections
    let totalConfidence = 0;
    let wordCount = 0;

    for (let i = 1; i < detections.length; i++) {
      if (detections[i].confidence) {
        totalConfidence += detections[i].confidence * 100;
        wordCount++;
      }
    }

    const avgConfidence = wordCount > 0 ? totalConfidence / wordCount : 95;

    console.log(`✅ Google Vision OCR complete - Confidence: ${avgConfidence.toFixed(2)}%, Words: ${wordCount}`);

    return {
      text: fullText,
      confidence: avgConfidence,
      words: wordCount,
    };

  } catch (error) {
    console.error('❌ Google Vision OCR error:', error);
    throw new Error(`Google Vision OCR failed: ${error.message}`);
  }
}

/**
 * Perform OCR on an image file
 * Uses Google Vision if available, falls back to Tesseract
 */
async function performOCR(imagePath) {
  // Try Google Vision first if enabled
  const useGoogleVision = process.env.USE_GOOGLE_VISION === 'true';

  if (useGoogleVision && process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    try {
      console.log('📸 Using Google Cloud Vision API for OCR');
      return await performGoogleVisionOCR(imagePath);
    } catch (error) {
      console.log('⚠️  Google Vision failed, falling back to Tesseract:', error.message);
    }
  }

  // Use Tesseract.js
  try {
    const worker = await initOCR();

    console.log(`🔍 Running Tesseract OCR on: ${path.basename(imagePath)}`);

    const { data } = await worker.recognize(imagePath);

    const result = {
      text: data.text || '',
      confidence: data.confidence || 0,
      words: (data.words && data.words.length) || 0,
    };

    console.log(`✅ OCR complete - Confidence: ${result.confidence.toFixed(2)}%, Words: ${result.words}`);

    return result;

  } catch (error) {
    console.error('❌ OCR error:', error);
    throw new Error(`OCR failed: ${error.message}`);
  }
}

/**
 * Convert PDF to images and run OCR
 */
async function ocrPDF(pdfPath) {
  try {
    const { fromPath } = require('pdf2pic');

    // Configure PDF to image conversion
    const options = {
      density: 200,       // DPI
      saveFilename: path.basename(pdfPath, '.pdf'),
      savePath: path.dirname(pdfPath),
      format: 'png',
      width: 2000,
      height: 2000,
    };

    const convert = fromPath(pdfPath, options);

    console.log('📄 Converting PDF to images for OCR...');

    // Convert first 3 pages (adjust as needed)
    const pageLimit = 3;
    const results = [];

    for (let page = 1; page <= pageLimit; page++) {
      try {
        const pageImage = await convert(page, { responseType: 'image' });

        if (pageImage && pageImage.path) {
          console.log(`📄 Processing page ${page}...`);
          const ocrResult = await performOCR(pageImage.path);
          results.push({
            page,
            text: ocrResult.text,
            confidence: ocrResult.confidence,
          });

          // Clean up temp image
          await fs.unlink(pageImage.path).catch(() => {});
        }
      } catch (pageError) {
        console.log(`⚠️  Page ${page} conversion failed, stopping OCR`);
        break;
      }
    }

    // Combine all pages
    const combinedText = results.map(r => r.text).join('\n\n');
    const avgConfidence = results.reduce((sum, r) => sum + r.confidence, 0) / results.length;

    return {
      text: combinedText,
      confidence: avgConfidence,
      pages: results.length,
    };

  } catch (error) {
    console.error('❌ PDF OCR error:', error);
    throw new Error(`PDF OCR failed: ${error.message}`);
  }
}

/**
 * Detect if PDF needs OCR (is it scanned or text-based?)
 */
async function needsOCR(pdfPath) {
  try {
    const pdfParse = require('pdf-parse');
    const dataBuffer = await fs.readFile(pdfPath);
    const data = await pdfParse(dataBuffer);

    // If extracted text is very short, likely a scanned PDF
    const textLength = (data.text || '').trim().length;

    return textLength < 50; // Less than 50 chars = probably scanned

  } catch (error) {
    // If text extraction fails, assume it needs OCR
    return true;
  }
}

/**
 * Cleanup OCR worker on shutdown
 */
async function terminateOCR() {
  if (ocrWorker) {
    await ocrWorker.terminate();
    ocrWorker = null;
    console.log('🛑 OCR worker terminated');
  }
}

module.exports = {
  initOCR,
  performOCR,
  ocrPDF,
  needsOCR,
  terminateOCR,
};
