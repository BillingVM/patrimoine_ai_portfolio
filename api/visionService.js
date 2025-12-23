/**
 * Vision Service
 * Hybrid image/document analysis using Qwen2.5-VL-7B + OCR fallback
 */

const path = require('path');
const fs = require('fs').promises;

class VisionService {
    constructor(modelManager, ocrModule) {
        this.modelManager = modelManager;
        this.ocr = ocrModule;
    }

    /**
     * Analyze file using hybrid approach
     * @param {String} filePath - Absolute path to file
     * @param {String} fileType - File extension (jpg, pdf, etc.)
     * @param {String} prompt - Optional analysis prompt
     */
    async analyzeFile(filePath, fileType, prompt = null) {
        const imageTypes = ['jpg', 'jpeg', 'png'];
        const documentTypes = ['pdf', 'tiff', 'tif', 'bmp'];
        const structuredTypes = ['csv', 'xlsx', 'xls', 'json', 'txt', 'doc', 'docx'];

        console.log(`\n🔍 Vision Service: Analyzing ${fileType.toUpperCase()} file`);
        console.log(`   File: ${path.basename(filePath)}`);

        // Route: Images → Vision AI (Qwen2.5-VL-7B)
        if (imageTypes.includes(fileType.toLowerCase())) {
            return await this.analyzeWithVision(filePath, prompt);
        }

        // Route: Documents → OCR
        if (documentTypes.includes(fileType.toLowerCase())) {
            return await this.analyzeWithOCR(filePath, fileType, prompt);
        }

        // Route: Structured files → Text parsing (handled by caller using raw_data)
        if (structuredTypes.includes(fileType.toLowerCase())) {
            console.log(`   Method: Text parsing (structured data)`);
            return {
                method: 'text',
                success: true,
                content: null, // Caller should use raw_data from database
                note: 'Structured file - use raw_data from database'
            };
        }

        // Unsupported type
        return {
            method: 'none',
            success: false,
            error: `Unsupported file type: ${fileType}`
        };
    }

    /**
     * Analyze image using Qwen2.5-VL-7B vision model
     * @param {String} imagePath - Path to image file
     * @param {String} prompt - Analysis prompt
     */
    async analyzeWithVision(imagePath, prompt) {
        try {
            console.log('   Method: Vision AI (Qwen2.5-VL-7B)');

            // Read image and convert to base64
            const imageBuffer = await fs.readFile(imagePath);
            const base64Image = imageBuffer.toString('base64');
            const mimeType = this.getMimeType(imagePath);
            const dataUrl = `data:${mimeType};base64,${base64Image}`;

            console.log(`   Image size: ${(imageBuffer.length / 1024).toFixed(1)} KB`);
            console.log(`   MIME type: ${mimeType}`);

            // Default analysis prompt
            const analysisPrompt = prompt ||
                `Analyze this image in detail. Extract any text, numbers, financial data, tickers, amounts, dates, or portfolio holdings. Identify the document type and structure.`;

            // Call vision model
            const response = await this.modelManager.callVisionModel(dataUrl, analysisPrompt);

            console.log(`✅ Vision analysis successful`);
            console.log(`   Model: ${response.modelUsed}`);
            console.log(`   Tokens: ${JSON.stringify(response.usage || {})}`);
            console.log(`   Content length: ${response.content ? response.content.length : 0} chars`);

            return {
                method: 'vision',
                success: true,
                content: response.content,
                model: response.modelUsed,
                modelId: response.modelId,
                tokens: response.usage
            };

        } catch (error) {
            console.error('❌ Vision analysis failed:', error.message);
            console.log('   Falling back to OCR...');

            // Fallback to OCR if vision fails
            return await this.analyzeWithOCR(imagePath, 'image', prompt);
        }
    }

    /**
     * Analyze document using OCR (Tesseract.js or Google Vision)
     * @param {String} filePath - Path to document file
     * @param {String} fileType - File extension
     * @param {String} prompt - Optional prompt (not used in OCR)
     */
    async analyzeWithOCR(filePath, fileType, prompt) {
        try {
            console.log('   Method: OCR (Tesseract.js)');

            let ocrResult;

            // PDF files need special handling
            if (fileType.toLowerCase() === 'pdf') {
                console.log('   Processing PDF...');
                ocrResult = await this.ocr.ocrPDF(filePath);
            } else {
                // Image files (jpg, png, tiff, bmp)
                ocrResult = await this.ocr.performOCR(filePath);
            }

            console.log(`✅ OCR analysis successful`);
            console.log(`   Text length: ${ocrResult.text ? ocrResult.text.length : 0} chars`);
            console.log(`   Confidence: ${ocrResult.confidence || 0}%`);
            console.log(`   Words detected: ${ocrResult.words || 0}`);

            return {
                method: 'ocr',
                success: true,
                content: ocrResult.text,
                confidence: ocrResult.confidence,
                words: ocrResult.words
            };

        } catch (error) {
            console.error('❌ OCR analysis failed:', error.message);

            return {
                method: 'ocr',
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get MIME type for image file
     * @param {String} filePath - Path to image file
     */
    getMimeType(filePath) {
        const ext = path.extname(filePath).toLowerCase();
        const types = {
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.webp': 'image/webp'
        };
        return types[ext] || 'application/octet-stream';
    }

    /**
     * Analyze multiple files in parallel
     * @param {Array} files - Array of {path, type} objects
     * @param {String} prompt - Optional analysis prompt
     */
    async analyzeMultipleFiles(files, prompt = null) {
        console.log(`\n📚 Analyzing ${files.length} files in parallel...`);

        const analyses = await Promise.all(
            files.map(file => this.analyzeFile(file.path, file.type, prompt))
        );

        const successful = analyses.filter(a => a.success).length;
        console.log(`✅ Completed: ${successful}/${files.length} successful`);

        return analyses;
    }
}

module.exports = VisionService;
