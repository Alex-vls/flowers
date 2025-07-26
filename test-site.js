#!/usr/bin/env node

const https = require('https');
const http = require('http');

const BASE_URL = 'https://msk-flower.su';

// Функция для HTTP запроса
function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    
    client.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: data
        });
      });
    }).on('error', reject);
  });
}

// Тесты
async function runTests() {
  console.log('🧪 Запуск тестов для MSK Flower...\n');
  
  const tests = [
    {
      name: 'Главная страница',
      url: BASE_URL,
      expectedStatus: 200,
      expectedContent: ['MSK Flower', 'доставка цветов']
    },
    {
      name: 'Telegram Mini App',
      url: `${BASE_URL}/telegram`,
      expectedStatus: 200,
      expectedContent: ['MSK Flower', 'Yandex.Metrika']
    },
    {
      name: 'API - Список цветов',
      url: `${BASE_URL}/api/v1/flowers`,
      expectedStatus: 200,
      expectedContent: ['items', 'total']
    },
    {
      name: 'API - Telegram webhook info',
      url: `${BASE_URL}/api/v1/telegram/webhook-info`,
      expectedStatus: 200,
      expectedContent: ['ok', 'result']
    }
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      console.log(`⏳ ${test.name}...`);
      const result = await makeRequest(test.url);
      
      // Проверка статуса
      if (result.statusCode !== test.expectedStatus) {
        console.log(`❌ ${test.name} - Неверный статус: ${result.statusCode} (ожидался ${test.expectedStatus})`);
        failed++;
        continue;
      }
      
      // Проверка содержимого
      let contentCheck = true;
      for (const expectedText of test.expectedContent) {
        if (!result.data.includes(expectedText)) {
          console.log(`❌ ${test.name} - Не найден текст: "${expectedText}"`);
          contentCheck = false;
        }
      }
      
      if (contentCheck) {
        console.log(`✅ ${test.name} - OK`);
        passed++;
      } else {
        failed++;
      }
      
    } catch (error) {
      console.log(`❌ ${test.name} - Ошибка: ${error.message}`);
      failed++;
    }
  }

  console.log(`\n📊 Результаты тестов:`);
  console.log(`✅ Пройдено: ${passed}`);
  console.log(`❌ Провалено: ${failed}`);
  console.log(`📈 Общий результат: ${passed}/${passed + failed} (${Math.round(passed / (passed + failed) * 100)}%)`);

  if (failed === 0) {
    console.log('\n🎉 Все тесты пройдены успешно!');
  } else {
    console.log('\n⚠️  Некоторые тесты провалились.');
  }
}

// Запуск
runTests().catch(console.error); 