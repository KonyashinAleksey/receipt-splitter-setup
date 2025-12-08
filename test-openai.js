require('dotenv').config();
const OpenAI = require('openai');

async function testOpenAI() {
  try {
    console.log('🔑 Тестируем OpenAI API ключ...');
    console.log('📋 Ключ:', process.env.OPENAI_API_KEY ? 'Найден' : 'Не найден');
    
    if (!process.env.OPENAI_API_KEY) {
      console.error('❌ OPENAI_API_KEY не найден в .env файле');
      return;
    }
    
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    
    // Простой тестовый запрос
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "user",
          content: "Привет! Это тестовое сообщение."
        }
      ],
      max_tokens: 10
    });
    
    console.log('✅ OpenAI API работает!');
    console.log('📝 Ответ:', response.choices[0].message.content);
    
  } catch (error) {
    console.error('❌ Ошибка OpenAI API:', error.message);
    
    if (error.status === 401) {
      console.log('\n🔧 Возможные решения:');
      console.log('1. Проверьте ключ на https://platform.openai.com/account/api-keys');
      console.log('2. Убедитесь, что ключ активен и не истек');
      console.log('3. Проверьте баланс аккаунта OpenAI');
      console.log('4. Создайте новый ключ, если текущий не работает');
    }
  }
}

testOpenAI();


