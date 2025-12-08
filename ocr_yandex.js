const fs = require('fs');
const fetch = require('node-fetch');
const { parseReceiptText } = require('./ocr');

async function recognizeReceiptYandex(imagePath) {
  const apiKey = process.env.YANDEX_API_KEY;
  const folderId = process.env.YANDEX_FOLDER_ID;
  if (!apiKey || !folderId) {
    throw new Error('YANDEX_API_KEY/YANDEX_FOLDER_ID are not set');
  }

  const bytes = fs.readFileSync(imagePath);
  const base64 = bytes.toString('base64');

  const url = 'https://vision.api.cloud.yandex.net/vision/v1/batchAnalyze';

  const body = {
    analyze_specs: [
      {
        content: base64,
        features: [
          {
            type: 'TEXT_DETECTION',
            text_detection_config: {
              language_codes: ['ru', 'en']
            }
          }
        ]
      }
    ]
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Api-Key ${apiKey}`,
      'x-folder-id': folderId,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Yandex Vision error: ${res.status} ${text}`);
  }

  const data = await res.json();
  const firstResult = data?.results?.[0]?.results?.find(r => r.textDetection) || data?.results?.[0]?.results?.[0];
  const textDet = firstResult?.textDetection;
  let fullText = '';

  // Try fullTextAnnotation.text
  fullText = textDet?.fullTextAnnotation?.text || '';

  // Fallback: concatenate pages/blocks/lines/words
  if (!fullText && Array.isArray(textDet?.pages)) {
    for (const page of textDet.pages) {
      for (const block of page.blocks || []) {
        for (const line of block.lines || []) {
          const lineText = (line.words || []).map(w => w.text).join(' ');
          if (lineText) fullText += lineText + '\n';
        }
      }
    }
  }

  // Fallback: older field name
  if (!fullText) {
    fullText = textDet?.fullText || '';
  }

  // Final fallback: join all found words just in case
  if (!fullText && textDet) {
    const words = [];
    for (const page of textDet.pages || []) {
      for (const block of page.blocks || []) {
        for (const line of block.lines || []) {
          for (const w of line.words || []) {
            if (w.text) words.push(w.text);
          }
        }
      }
    }
    if (words.length) fullText = words.join(' ');
  }

  if (!fullText) {
    return { restaurant: { name: 'Неизвестный ресторан', address: 'Адрес не найден' }, date: null, time: null, items: [], total_amount: 0, raw_text: '' };
  }

  return parseReceiptText(fullText);
}

module.exports = { recognizeReceiptYandex };


