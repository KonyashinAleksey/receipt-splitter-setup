const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require('fs');

/**
 * Инициализация Gemini клиента лениво
 */
const getGeminiModel = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY не задан в .env файле');
  }
  const genAI = new GoogleGenerativeAI(apiKey);
  // Используем быструю и эффективную модель gemini-2.5-flash, чтобы избежать лимитов Rate Limit
  return genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
};

/**
 * Распознавание чека с помощью Google Gemini
 * @param {string} imagePath - путь к изображению чека
 * @returns {Object} - объект с данными чека
 */
async function recognizeReceiptGemini(imagePath) {
  try {
    console.log('🤖 Используем Google Gemini для распознавания чека...');
    
    const model = getGeminiModel();
    
    // Читаем изображение
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');
    
    const prompt = `Распознай чек на этом изображении и извлеки следующую информацию в формате JSON:

{
  "restaurant": "название ресторана",
  "address": "адрес ресторана", 
  "date": "дата чека (DD.MM.YYYY)",
  "total": "общая сумма чека (числом)",
  "items": [
    {
      "name": "название блюда",
      "quantity": "количество (числом)",
      "price": "цена за единицу (числом)",
      "total_price": "общая цена позиции"
    }
  ]
}

Важно:
- Извлекай только реальные позиции меню (блюда и напитки), не служебную информацию (налоги, скидки, итоги, сдача и т.д.)
- Если название блюда переносится на несколько строк, объедини их в одну строку
- Количество может быть дробным (например, 0.5 или 1.25)
- Цены указывай числом, без символов валюты
- Отвечай ТОЛЬКО чистым JSON без markdown форматирования (без \`\`\`json ...)`;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: base64Image,
          mimeType: "image/jpeg",
        },
      },
    ]);

    const response = await result.response;
    const text = response.text();
    
    console.log('📝 Gemini ответ (raw):', text);

    // Парсим JSON ответ (очищаем от markdown если он все же есть)
    let receiptData;
    try {
      const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/\{[\s\S]*\}/);
      const jsonString = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : text;
      receiptData = JSON.parse(jsonString);
    } catch (parseError) {
      console.error('❌ Ошибка парсинга JSON от Gemini:', parseError.message);
      throw new Error('Не удалось распарсить ответ Gemini');
    }

    // Нормализуем данные
    const normalizedData = normalizeGeminiData(receiptData);
    
    console.log('✅ Gemini успешно распознал чек');
    console.log(`🏪 Ресторан: ${normalizedData.restaurant}`);
    console.log(`💰 Итого: ${normalizedData.total}₽`);
    console.log(`🍽️ Позиций: ${normalizedData.items.length}`);
    
    return normalizedData;

  } catch (error) {
    console.error('❌ Ошибка Gemini OCR:', error);
    throw error;
  }
}

/**
 * Нормализация данных от Gemini
 */
function normalizeGeminiData(data) {
  const normalized = {
    restaurant: data.restaurant || 'Неизвестный ресторан',
    address: data.address || '',
    date: data.date || new Date().toLocaleDateString('ru-RU'),
    total: parseFloat(data.total) || 0,
    items: []
  };

  // Обрабатываем позиции
  if (Array.isArray(data.items)) {
    data.items.forEach(item => {
      if (item.name && item.price) {
        const quantity = parseFloat(item.quantity) || 1;
        const price = parseFloat(item.price);
        
        // Нормализуем количество для весовых позиций (если вес > 50, считаем как 1 позицию)
        let normalizedQuantity = quantity;
        let finalPrice = price;

        // Если Gemini вернул total_price, используем его как основу для расчета
        if (item.total_price) {
           finalPrice = parseFloat(item.total_price);
        } else {
           // Если total_price нет, считаем сами
           finalPrice = price * quantity;
        }

        // Если количество похоже на вес (например > 50), сбрасываем его в 1,
        // но цену оставляем полной (total_price)
        if (quantity > 50) {
          normalizedQuantity = 1;
        } else {
          // Если количество нормальное (например 2 пива),
          // то price в выходном объекте должен быть UNIT PRICE (цена за единицу),
          // потому что бот потом сам пересчитывает total_price или берет его готовым.
          // НО! В текущей реализации бота (bot.js) мы ожидаем, что OCR вернет объект,
          // где price - это unit price, а total_price (опционально) - общая.
          
          // Однако, чтобы не путаться: давайте возвращать структуру, совместимую с ботом.
          // Бот ожидает: name, price (unit), quantity, total_price (optional).
          
          // В случае весового товара (200г за 660р):
          // Gemini: q=200, p=3.3, total=660
          // Мы хотим: q=1, price=660
          
          // В случае штучного товара (2 пива по 300р):
          // Gemini: q=2, p=300, total=600
          // Мы хотим: q=2, price=300, total_price=600
        }

        // Важно! Мы формируем объект для bot.js.
        // Если мы нормализовали количество до 1 (был вес), то цена должна быть полной.
        // Если количество осталось оригинальным, цена должна быть за единицу.
        
        // Исправленная логика:
        // Если это был вес (q > 50), мы говорим "это 1 порция за полную стоимость".
        if (quantity > 50) {
           normalizedQuantity = 1;
           // Если был total_price, берем его. Если нет - вычисляем.
           const total = item.total_price ? parseFloat(item.total_price) : (price * quantity);
           finalPrice = total; 
        } else {
           // Если это штучный товар, оставляем цену за единицу
           finalPrice = price;
        }
        
        normalized.items.push({
          name: item.name.trim(),
          quantity: normalizedQuantity,
          price: finalPrice, // Это Unit Price (для штучных) или Total Price (для весовых, ставших 1 шт)
          total_price: item.total_price, // Пробрасываем total_price для бота
          emoji: getItemEmoji(item.name)
        });
      }
    });
  }

  return normalized;
}

/**
 * Определение эмодзи для позиции
 */
function getItemEmoji(name) {
  const lowerName = name.toLowerCase();
  
  if (lowerName.includes('хлеб') || lowerName.includes('bread')) return '🍞';
  if (lowerName.includes('кофе') || lowerName.includes('капучино') || lowerName.includes('латте')) return '☕';
  if (lowerName.includes('пиво') || lowerName.includes('beer')) return '🍺';
  if (lowerName.includes('вино') || lowerName.includes('wine')) return '🍷';
  if (lowerName.includes('вода') || lowerName.includes('water')) return '💧';
  if (lowerName.includes('салат') || lowerName.includes('salad')) return '🥗';
  if (lowerName.includes('суп') || lowerName.includes('soup')) return '🍲';
  if (lowerName.includes('мясо') || lowerName.includes('говядина') || lowerName.includes('свинина')) return '🥩';
  if (lowerName.includes('рыба') || lowerName.includes('лосось') || lowerName.includes('тунец')) return '🐟';
  if (lowerName.includes('десерт') || lowerName.includes('торт') || lowerName.includes('мороженое')) return '🍰';
  if (lowerName.includes('пицца') || lowerName.includes('pizza')) return '🍕';
  if (lowerName.includes('паста') || lowerName.includes('pasta')) return '🍝';
  if (lowerName.includes('бургер') || lowerName.includes('burger')) return '🍔';
  
  return '🍽️'; // По умолчанию
}

module.exports = { recognizeReceiptGemini };

