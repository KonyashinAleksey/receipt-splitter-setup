const { recognizeReceipt: recognizeWithTesseract, parseReceiptText } = require('./ocr');
const { recognizeReceiptYandex } = require('./ocr_yandex');
const { recognizeReceiptGPT } = require('./ocr_gpt');
const { recognizeReceiptGemini } = require('./ocr_gemini');

async function recognizeReceipt(imagePath) {
  const engine = (process.env.OCR_ENGINE || 'yandex').toLowerCase();
  
  switch (engine) {
    case 'gemini':
      console.log('🤖 Используем Google Gemini OCR');
      return recognizeReceiptGemini(imagePath);
    case 'gpt':
      console.log('🤖 Используем GPT Vision OCR');
      return recognizeReceiptGPT(imagePath);
    case 'yandex':
      console.log('🔍 Используем Yandex Vision OCR');
      return recognizeReceiptYandex(imagePath);
    case 'tesseract':
    default:
      console.log('📖 Используем Tesseract OCR');
      return recognizeWithTesseract(imagePath);
  }
}

module.exports = { recognizeReceipt, parseReceiptText };
