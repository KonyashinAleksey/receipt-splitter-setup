const fetch = require('node-fetch');
require('dotenv').config();

async function listModels() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    console.log('No GEMINI_API_KEY found');
    return;
  }
  
  console.log('Checking available models for key ending in ...' + key.slice(-4));
  
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.error) {
      console.error('Error listing models:', data.error);
      return;
    }
    
    if (data.models) {
      console.log('\nAvailable Models:');
      data.models.forEach(m => {
        // Filter for models that support generateContent
        if (m.supportedGenerationMethods && m.supportedGenerationMethods.includes('generateContent')) {
            console.log(`- ${m.name} (${m.displayName})`);
            console.log(`  Supported methods: ${m.supportedGenerationMethods.join(', ')}`);
        }
      });
    } else {
      console.log('No models found in response:', data);
    }
  } catch (error) {
    console.error('Network error:', error);
  }
}

listModels();

