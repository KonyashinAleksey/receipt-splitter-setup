const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');

// Инициализация OpenAI клиента лениво, внутри функции
const getOpenAIClient = () => {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY не задан в .env файле');
  }
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });
};

/**
 * Распознавание чека с помощью GPT Vision
 * @param {string} imagePath - путь к изображению чека
 * @returns {Object} - объект с данными чека
 */
async function recognizeReceiptGPT(imagePath) {
  try {
    console.log('🤖 Используем GPT Vision для распознавания чека...');
    
    const openai = getOpenAIClient();
    
    // Читаем изображение
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');
    
    // Отправляем запрос к GPT Vision
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Распознай чек на этом изображении и извлеки следующую информацию в формате JSON:

{
  "restaurant": "название ресторана",
  "address": "адрес ресторана", 
  "date": "дата чека",
  "total": "общая сумма чека",
  "items": [
    {
      "name": "название блюда",
      "quantity": "количество",
      "price": "цена за единицу",
      "total_price": "общая цена позиции"
    }
  ]
}

Важно:
- Извлекай только реальные позиции меню, не служебную информацию
- Если название блюда переносится на несколько строк, объедини их
- Количество может быть в разных единицах (шт, мл, г, л)
- Цены указывай в рублях без символа ₽
- Если количество выглядит как вес/объем (например, 200.0), оставь как есть
- Отвечай только JSON, без дополнительного текста`
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`
              }
            }
          ]
        }
      ],
      max_tokens: 2000,
      temperature: 0.1
    });

    const content = response.choices[0].message.content;
    console.log('📝 GPT Vision ответ:', content);
    
    // Парсим JSON ответ
    let receiptData;
    try {
      // Убираем возможные markdown блоки
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/\{[\s\S]*\}/);
      const jsonString = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content;
      receiptData = JSON.parse(jsonString);
    } catch (parseError) {
      console.error('❌ Ошибка парсинга JSON от GPT:', parseError.message);
      console.log('📄 Сырой ответ GPT:', content);
      throw new Error('Не удалось распарсить ответ GPT Vision');
    }

    // Валидируем и нормализуем данные
    const normalizedData = normalizeGPTData(receiptData);
    
    console.log('✅ GPT Vision успешно распознал чек');
    console.log(`🏪 Ресторан: ${normalizedData.restaurant}`);
    console.log(`📅 Дата: ${normalizedData.date}`);
    console.log(`💰 Итого: ${normalizedData.total}₽`);
    console.log(`🍽️ Позиций: ${normalizedData.items.length}`);
    
    return normalizedData;
    
  } catch (error) {
    console.error('❌ Ошибка GPT Vision:', error.message);
    throw error;
  }
}

/**
 * Нормализация данных от GPT Vision
 */
function normalizeGPTData(data) {
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
        
        // Нормализуем количество для весовых позиций
        const normalizedQuantity = quantity > 100 ? 1 : quantity;
        
        normalized.items.push({
          name: item.name.trim(),
          quantity: normalizedQuantity,
          price: price,
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
  
  return '🍽️'; // По умолчанию
}

module.exports = { recognizeReceiptGPT };


