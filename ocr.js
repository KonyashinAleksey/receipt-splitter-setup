const Tesseract = require('tesseract.js');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

/**
 * OCR функция для распознавания текста с чека
 * @param {string} imagePath - путь к изображению
 * @returns {Object} - распознанные данные чека
 */
async function recognizeReceipt(imagePath) {
  try {
    console.log('🔍 Начинаем распознавание чека...');
    
    // Предобработка изображения для лучшего распознавания
    const processedImagePath = await preprocessImage(imagePath);
    
    // Распознавание текста с русским языком
    const { data: { text } } = await Tesseract.recognize(
      processedImagePath,
      'rus+eng', // русский + английский
      {
        logger: m => {
          if (m.status === 'recognizing text') {
            console.log(`📊 Прогресс: ${Math.round(m.progress * 100)}%`);
          }
        }
      }
    );
    
    console.log('✅ Текст распознан, парсим данные...');
    
    // Парсинг распознанного текста
    const receiptData = parseReceiptText(text);
    
    // Удаляем временный файл
    if (processedImagePath !== imagePath) {
      fs.unlinkSync(processedImagePath);
    }
    
    return receiptData;
    
  } catch (error) {
    console.error('❌ Ошибка OCR:', error);
    throw error;
  }
}

/**
 * Предобработка изображения для улучшения распознавания
 */
async function preprocessImage(imagePath) {
  const outputPath = imagePath.replace(/\.[^/.]+$/, '_processed.jpg');
  
  await sharp(imagePath)
    .resize(2000, null, { withoutEnlargement: true }) // Увеличиваем размер
    .sharpen() // Увеличиваем резкость
    .normalize() // Нормализуем контраст
    .jpeg({ quality: 90 })
    .toFile(outputPath);
    
  return outputPath;
}


/**
 * Парсинг распознанного текста для извлечения данных чека
 */
function parseReceiptText(text) {
  console.log('📝 Распознанный текст:', text);
  
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  // Поиск названия ресторана (обычно в начале)
  const restaurantName = findRestaurantName(lines);
  
  // Поиск даты и времени
  const { date, time } = findDateTime(lines);
  
  // Поиск адреса
  const address = findAddress(lines);
  
  // Поиск позиций и цен
  const items = findItems(lines);
  
  // Поиск общей суммы
  const totalAmount = findTotalAmount(lines);
  
  return {
    restaurant: {
      name: restaurantName,
      address: address
    },
    date: date,
    time: time,
    items: items,
    total_amount: totalAmount,
    raw_text: text
  };
}

/**
 * Поиск названия ресторана
 */
function findRestaurantName(lines) {
  // Ищем строки, которые могут быть названием ресторана
  for (let i = 0; i < Math.min(5, lines.length); i++) {
    const line = lines[i];
    // Пропускаем строки с датой, временем, адресом
    if (!isDateTime(line) && !isAddress(line) && line.length > 3) {
      return line;
    }
  }
  return 'Неизвестный ресторан';
}

/**
 * Поиск даты и времени
 */
function findDateTime(lines) {
  let date = null;
  let time = null;
  
  for (const line of lines) {
    // Поиск даты в формате DD.MM.YYYY или DD/MM/YYYY
    const dateMatch = line.match(/(\d{1,2}[./]\d{1,2}[./]\d{2,4})/);
    if (dateMatch) {
      date = dateMatch[1];
    }
    
    // Поиск времени в формате HH:MM
    const timeMatch = line.match(/(\d{1,2}:\d{2})/);
    if (timeMatch) {
      time = timeMatch[1];
    }
  }
  
  return { date, time };
}

/**
 * Поиск адреса
 */
function findAddress(lines) {
  // Ищем строки, которые могут быть адресом
  for (const line of lines) {
    if (isAddress(line)) {
      return line;
    }
  }
  return 'Адрес не найден';
}

/**
 * Поиск позиций и цен
 */
function findItems(lines) {
  const items = [];
  
  // Сначала найдем блок с позициями (между заголовками и итогами)
  const itemsBlock = findItemsBlock(lines);
  if (!itemsBlock) {
    return items;
  }
  
  // Попробуем специальный парсер для структуры "название -> количество -> цена"
  const specialItems = findItemsSpecialFormat(lines, itemsBlock);
  if (specialItems.length >= 2) {
    return validateAndFilterItems(specialItems);
  }
  
  // Обрабатываем блок позиций обычным способом
  for (let idx = itemsBlock.start; idx < itemsBlock.end; idx++) {
    const line = lines[idx];
    
    // Пропускаем служебные строки
    if (isServiceLine(line)) {
      continue;
    }
    
    // Ищем позиции в разных форматах
    const item = findItemInLine(lines, idx, itemsBlock.end);
    if (item) {
      items.push(item);
      // Пропускаем использованные строки
      if (item.consumedLines > 1) {
        idx += item.consumedLines - 1;
      }
    }
  }
  
  // Если позиций мало, попробуем альтернативный парсинг
  if (items.length < 2) {
    const altItems = findItemsAlternative(lines, itemsBlock);
    if (altItems.length > items.length) {
      return validateAndFilterItems(altItems);
    }
  }
  
  // Фильтруем и валидируем позиции
  return validateAndFilterItems(items);
}

/**
 * Поиск общей суммы
 */
function findTotalAmount(lines) {
  // Ищем строки с "ИТОГО", "СУММА", "ВСЕГО"
  for (const line of lines) {
    if (line.match(/ИТОГО|СУММА|ВСЕГО|TOTAL/i)) {
      const priceMatch = line.match(/(\d+[.,]\d{2})\s*[₽р]?/);
      if (priceMatch) {
        return parseFloat(priceMatch[1].replace(',', '.'));
      }
    }
  }
  
  // Если не нашли, суммируем все позиции
  const items = findItems(lines);
  return items.reduce((sum, item) => sum + item.price, 0);
}

/**
 * Проверка, является ли строка датой/временем
 */
function isDateTime(line) {
  return /(\d{1,2}[./]\d{1,2}[./]\d{2,4})|(\d{1,2}:\d{2})/.test(line);
}

/**
 * Проверка, является ли строка адресом
 */
function isAddress(line) {
  return /(ул\.|улица|проспект|пр\.|переулок|пер\.|дом|д\.)/i.test(line);
}

/**
 * Находит блок с позициями в чеке
 */
function findItemsBlock(lines) {
  let start = -1;
  let end = lines.length;
  
  // Ищем начало блока (заголовки "Блюдо", "Кол-во", "Сумма")
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/(Блюдо|Кол-во|Количество|Сумма|Товар|Наименование)/i.test(line)) {
      start = i + 1;
      break;
    }
  }
  
  // Ищем конец блока (итоговые строки) - ищем после начала блока
  for (let i = start; i < lines.length; i++) {
    const line = lines[i];
    // Ищем только настоящие итоговые строки, не заголовки
    if (/(ИТОГО|ВСЕГО|TOTAL|Итого к оплате|Всего:|Итого:)/i.test(line) && 
        !/(Кол-во|Сумма|Блюдо)/i.test(line)) {
      // Для некоторых чеков цены идут после "Всего:", поэтому расширяем блок
      if (line.includes('Всего:')) {
        // Ищем следующую строку с итоговой суммой
        for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
          const nextLine = lines[j];
          if (/(\d+[.,]\d{2})\s*[₽р]?/.test(nextLine)) {
            end = j + 1; // Включаем строку с итоговой суммой
            break;
          }
        }
        if (end === lines.length) {
          end = i + 5; // Расширяем на несколько строк после "Всего:"
        }
      } else {
        end = i;
      }
      break;
    }
  }
  
  return start >= 0 ? { start, end } : null;
}

/**
 * Ищет позицию в конкретной строке и соседних
 */
function findItemInLine(lines, idx, maxIdx) {
  const line = lines[idx];
  const next1 = lines[idx + 1] || '';
  const next2 = lines[idx + 2] || '';
  const next3 = lines[idx + 3] || '';
  
  // Формат 1: название количество цена в одной строке
  let match = line.match(/(.+?)\s+(\d+[.,]?\d*)\s+(\d+[.,]\d{2})\s*[₽р]?/);
  if (match) {
    const name = match[1].trim();
    const quantity = parseFloat(match[2].replace(',', '.')) || 1;
    const price = parseFloat(match[3].replace(',', '.'));
    
    if (isValidItem(name, price, quantity)) {
      return {
        name: name,
        price: price,
        quantity: quantity,
        consumedLines: 1
      };
    }
  }
  
  // Формат 1.1: название в одной строке, количество и цена в следующей строке
  if (looksLikeItemName(line) && idx + 1 < maxIdx) {
    const nextLine = next1;
    const qtyPriceMatch = nextLine.match(/^(\d+[.,]?\d*)\s+(\d+[.,]\d{2})\s*[₽р]?$/);
    
    
    if (qtyPriceMatch) {
      const name = line.trim();
      const quantity = parseFloat(qtyPriceMatch[1].replace(',', '.')) || 1;
      const price = parseFloat(qtyPriceMatch[2].replace(',', '.'));
      
      if (isValidItem(name, price, quantity)) {
        return {
          name: name,
          price: price,
          quantity: quantity,
          consumedLines: 2
        };
      }
    }
  }
  
  // Формат 1.2: название в одной строке, количество в следующей, цена через строку, продолжение названия через еще строку
  // Структура: "Название" -> "количество" -> "цена" -> "продолжение названия"
  if (looksLikeItemName(line) && idx + 3 < maxIdx) {
    const nextLine = next1;
    const nextNextLine = next2;
    const nextNextNextLine = next3;
    
    const qtyMatch = nextLine.match(/^(\d+[.,]?\d*)$/);
    const priceMatch = nextNextLine.match(/^(\d+[.,]\d{2})\s*[₽р]?$/);
    const isContinuation = looksLikeItemName(nextNextNextLine) && 
                          !nextNextNextLine.match(/^\d+[.,]?\d*$/) && 
                          !nextNextNextLine.match(/^\d+[.,]\d{2}$/) && 
                          nextNextNextLine.length < 15;
    
    
    if (qtyMatch && priceMatch && isContinuation) {
      const quantity = parseFloat(qtyMatch[1].replace(',', '.')) || 1;
      const price = parseFloat(priceMatch[1].replace(',', '.'));
      const combinedName = `${line.trim()} ${nextNextNextLine.trim()}`;
      
      if (isValidItem(combinedName, price, quantity)) {
        return {
          name: combinedName,
          price: price,
          quantity: quantity,
          consumedLines: 4
        };
      }
    }
  }
  
  // Формат 1.5: название в одной строке, количество и цена в следующей строке
  if (looksLikeItemName(line) && idx + 1 < maxIdx) {
    const nextLine = next1;
    const qtyPriceMatch = nextLine.match(/^(\d+[.,]?\d*)\s+(\d+[.,]\d{2})\s*[₽р]?$/);
    
    if (qtyPriceMatch) {
      const name = line.trim();
      const quantity = parseFloat(qtyPriceMatch[1].replace(',', '.')) || 1;
      const price = parseFloat(qtyPriceMatch[2].replace(',', '.'));
      
      if (isValidItem(name, price, quantity)) {
        return {
          name: name,
          price: price,
          quantity: quantity,
          consumedLines: 2
        };
      }
    }
  }
  
  // Формат 2: название цена в одной строке
  match = line.match(/(.+?)\s+(\d+[.,]\d{2})\s*[₽р]?$/);
  if (match) {
    const name = match[1].trim();
    const price = parseFloat(match[2].replace(',', '.'));
    
    if (isValidItem(name, price, 1)) {
      return {
        name: name,
        price: price,
        quantity: 1,
        consumedLines: 1
      };
    }
  }
  
  // Формат 3: название в одной строке, количество и цена в следующих
  if (looksLikeItemName(line) && idx + 2 < maxIdx) {
    const qtyMatch = next1.match(/^(\d+[.,]?\d*)$/);
    const priceMatch = next2.match(/^(\d+[.,]\d{2})\s*[₽р]?$/);
    
    if (qtyMatch && priceMatch) {
      const name = line.trim();
      const quantity = parseFloat(qtyMatch[1].replace(',', '.')) || 1;
      const price = parseFloat(priceMatch[1].replace(',', '.'));
      
      if (isValidItem(name, price, quantity)) {
        return {
          name: name,
          price: price,
          quantity: quantity,
          consumedLines: 3
        };
      }
    }
  }
  
  // Формат 4: название в одной строке, цена в следующей
  if (looksLikeItemName(line) && idx + 1 < maxIdx) {
    const priceMatch = next1.match(/^(\d+[.,]\d{2})\s*[₽р]?$/);
    
    if (priceMatch) {
      const name = line.trim();
      const price = parseFloat(priceMatch[1].replace(',', '.'));
      
      if (isValidItem(name, price, 1)) {
        return {
          name: name,
          price: price,
          quantity: 1,
          consumedLines: 2
        };
      }
    }
  }
  
  // Формат 4.5: название в одной строке, количество в следующей, цена через строку
  if (looksLikeItemName(line) && idx + 2 < maxIdx) {
    const qtyMatch = next1.match(/^(\d+[.,]?\d*)$/);
    const priceMatch = next2.match(/^(\d+[.,]\d{2})\s*[₽р]?$/);
    
    if (qtyMatch && priceMatch) {
      const name = line.trim();
      const quantity = parseFloat(qtyMatch[1].replace(',', '.')) || 1;
      const price = parseFloat(priceMatch[1].replace(',', '.'));
      
      if (isValidItem(name, price, quantity)) {
        return {
          name: name,
          price: price,
          quantity: quantity,
          consumedLines: 3
        };
      }
    }
  }
  
  // Формат 5: разорванные названия (например: "Жаркое из якутской" + "КОНИНЫ")
  // Специальный случай: название в первой строке, количество и цена во второй, продолжение названия в третьей
  if (looksLikeItemName(line) && idx + 2 < maxIdx) {
    const nextLine = next1;
    const nextNextLine = next2;
    
    // Проверяем: следующая строка - количество и цена, через строку - продолжение названия
    const qtyPriceMatch = nextLine.match(/^(\d+[.,]?\d*)\s+(\d+[.,]\d{2})\s*[₽р]?$/);
    
    // Более гибкое условие для продолжения названия:
    // - должно быть похоже на название (не содержит только цифры)
    // - не должно содержать цифры (кроме случаев, когда это часть названия)
    // - должно быть коротким (менее 15 символов) - это ключевое изменение!
    const isContinuation = looksLikeItemName(nextNextLine) && 
                          !nextNextLine.match(/^\d+[.,]?\d*$/) && 
                          !nextNextLine.match(/^\d+[.,]\d{2}$/) && // не цена
                          !nextNextLine.match(/^\d+[.,]?\d*\s+\d+[.,]\d{2}$/) && // не количество + цена
                          nextNextLine.length < 15; // увеличили лимит с 8 до 15
    
    if (qtyPriceMatch && isContinuation) {
      const quantity = parseFloat(qtyPriceMatch[1].replace(',', '.')) || 1;
      const price = parseFloat(qtyPriceMatch[2].replace(',', '.'));
      const combinedName = `${line.trim()} ${nextNextLine.trim()}`;
      
      if (isValidItem(combinedName, price, quantity)) {
        return {
          name: combinedName,
          price: price,
          quantity: quantity,
          consumedLines: 3
        };
      }
    }
  }
  
  // Формат 5.1: разорванные названия где продолжение идет ПОСЛЕ цены
  // Структура: "Название" -> "количество" -> "цена" -> "продолжение названия"
  if (looksLikeItemName(line) && idx + 3 < maxIdx) {
    const nextLine = next1;
    const nextNextLine = next2;
    const nextNextNextLine = next3;
    
    // Проверяем: следующая строка - количество, через строку - цена, через еще строку - продолжение
    const qtyMatch = nextLine.match(/^(\d+[.,]?\d*)$/);
    const priceMatch = nextNextLine.match(/^(\d+[.,]\d{2})\s*[₽р]?$/);
    const isContinuation = looksLikeItemName(nextNextNextLine) && 
                          !nextNextNextLine.match(/^\d+[.,]?\d*$/) && 
                          !nextNextNextLine.match(/^\d+[.,]\d{2}$/) && 
                          nextNextNextLine.length < 15;
    
    if (qtyMatch && priceMatch && isContinuation) {
      const quantity = parseFloat(qtyMatch[1].replace(',', '.')) || 1;
      const price = parseFloat(priceMatch[1].replace(',', '.'));
      const combinedName = `${line.trim()} ${nextNextNextLine.trim()}`;
      
      if (isValidItem(combinedName, price, quantity)) {
        return {
          name: combinedName,
          price: price,
          quantity: quantity,
          consumedLines: 4
        };
      }
    }
  }

  // Формат 6: исправленный парсинг для структуры "название -> количество -> цена"
  // Обрабатываем случай, когда цена идет сразу после количества
  if (looksLikeItemName(line) && idx + 2 < maxIdx) {
    const nextLine = next1;
    const nextNextLine = next2;
    
    // Проверяем: следующая строка - количество, через строку - цена
    const qtyMatch = nextLine.match(/^(\d+[.,]?\d*)$/);
    const priceMatch = nextNextLine.match(/^(\d+[.,]\d{2})\s*[₽р]?$/);
    
    // Проверяем, что через строку НЕ название (не начинается с буквы)
    const isNotNextItem = !looksLikeItemName(nextNextLine) || 
                         nextNextLine.match(/^\d+[.,]\d{2}$/) ||
                         nextNextLine.match(/^\d+[.,]?\d*\s+\d+[.,]\d{2}$/);
    
    if (qtyMatch && priceMatch && isNotNextItem) {
      const name = line.trim();
      const quantity = parseFloat(qtyMatch[1].replace(',', '.')) || 1;
      const price = parseFloat(priceMatch[1].replace(',', '.'));
      
      if (isValidItem(name, price, quantity)) {
        return {
          name: name,
          price: price,
          quantity: quantity,
          consumedLines: 3
        };
      }
    }
  }

  // Формат 7: специальный парсер для структуры "название -> количество -> цена -> следующее название"
  // Обрабатывает случай когда позиции идут подряд без пропусков
  if (looksLikeItemName(line) && idx + 3 < maxIdx) {
    const nextLine = next1;      // количество
    const nextNextLine = next2;  // цена
    const nextNextNextLine = next3; // следующее название или продолжение
    
    const qtyMatch = nextLine.match(/^(\d+[.,]?\d*)$/);
    const priceMatch = nextNextLine.match(/^(\d+[.,]\d{2})\s*[₽р]?$/);
    
    // Если следующая строка - это название (не продолжение текущего)
    const isNextItemName = looksLikeItemName(nextNextNextLine) && 
                          !nextNextNextLine.match(/^\d+[.,]?\d*$/) && 
                          !nextNextNextLine.match(/^\d+[.,]\d{2}$/) &&
                          nextNextNextLine.length > 5; // достаточно длинное название
    
    if (qtyMatch && priceMatch && isNextItemName) {
      const name = line.trim();
      const quantity = parseFloat(qtyMatch[1].replace(',', '.')) || 1;
      const price = parseFloat(priceMatch[1].replace(',', '.'));
      
      if (isValidItem(name, price, quantity)) {
        return {
          name: name,
          price: price,
          quantity: quantity,
          consumedLines: 3
        };
      }
    }
  }
  
  // Формат 5.2: обычные разорванные названия (например: "Жаркое из якутской" + "КОНИНЫ")
  if (looksLikeItemName(line) && idx + 1 < maxIdx) {
    const nextLine = next1;
    // Объединяем только если следующая строка тоже похожа на название и не содержит цифры
    // И если следующая строка очень короткая (скорее всего продолжение названия)
    if (looksLikeItemName(nextLine) && !nextLine.match(/^\d+[.,]?\d*$/) && !nextLine.match(/\d/) && nextLine.length < 7) {
      // Объединяем названия
      const combinedName = `${line.trim()} ${nextLine.trim()}`;
      
      // Ищем количество и цену в следующих строках
      for (let i = 2; i <= 4 && idx + i < maxIdx; i++) {
        const qtyPriceLine = lines[idx + i] || '';
        const qtyPriceMatch = qtyPriceLine.match(/^(\d+[.,]?\d*)\s+(\d+[.,]\d{2})\s*[₽р]?$/);
        
        if (qtyPriceMatch) {
          const quantity = parseFloat(qtyPriceMatch[1].replace(',', '.')) || 1;
          const price = parseFloat(qtyPriceMatch[2].replace(',', '.'));
          
          if (isValidItem(combinedName, price, quantity)) {
            return {
              name: combinedName,
              price: price,
              quantity: quantity,
              consumedLines: i + 1
            };
          }
        }
      }
    }
  }
  
  return null;
}

/**
 * Проверяет, похожа ли строка на название позиции
 */
function looksLikeItemName(line) {
  if (!line || line.length < 2) return false;
  
  // Служебные строки
  if (isServiceLine(line)) return false;
  
  // Содержит буквы и не является только числом
  const hasLetters = /[А-Яа-яA-Za-z]/.test(line);
  const isOnlyNumber = /^\d+[.,]?\d*$/.test(line);
  
  return hasLetters && !isOnlyNumber;
}

/**
 * Специальный парсер для структуры "название -> количество -> цена"
 * Обрабатывает случаи когда позиции идут строго по 3 строки
 */
function findItemsSpecialFormat(lines, itemsBlock) {
  const items = [];
  const blockLines = lines.slice(itemsBlock.start, itemsBlock.end);
  
  console.log('  🔍 Специальный парсинг для структуры "название -> количество -> цена":');
  console.log(`  📊 Блок строк: ${blockLines.length}`);
  
  let i = 0;
  while (i < blockLines.length - 2) {
    const nameLine = blockLines[i];
    const qtyLine = blockLines[i + 1];
    const priceLine = blockLines[i + 2];
    
    // Пропускаем служебные строки
    if (isServiceLine(nameLine)) {
      i++;
      continue;
    }
    
    // Проверяем паттерн: название -> количество -> цена
    const isName = looksLikeItemName(nameLine);
    const qtyMatch = qtyLine.match(/^(\d+[.,]?\d*)$/);
    const priceMatch = priceLine.match(/^(\d+[.,]\d{2})\s*[₽р]?$/);
    
    if (isName && qtyMatch && priceMatch) {
      const name = nameLine.trim();
      let quantity = parseFloat(qtyMatch[1].replace(',', '.')) || 1;
      const price = parseFloat(priceMatch[1].replace(',', '.'));

      // Нормализация веса/объема: если количество выглядит как граммы/миллилитры (например 200.0)
      // считаем это одной позицией с указанной итоговой суммой
      if (quantity >= 50 && Number.isFinite(quantity)) {
        quantity = 1;
      }
      
      // Проверяем, не является ли следующая строка продолжением названия
      let finalName = name;
      let consumedLines = 3;
      
      if (i + 3 < blockLines.length) {
        const continuationCandidate = blockLines[i + 3];
        // Подсмотрим вперед: если после continuationCandidate идут количество+цена,
        // то это НАЧАЛО следующей позиции, а не продолжение текущей
        const lookaheadQty = i + 4 < blockLines.length ? blockLines[i + 4] : '';
        const lookaheadPrice = i + 5 < blockLines.length ? blockLines[i + 5] : '';
        const nextItemPattern = /^\d+[.,]?\d*$/;
        const nextPricePattern = /^\d+[.,]\d{2}\s*[₽р]?$/;
        const looksLikeNextItem = nextItemPattern.test(lookaheadQty) && nextPricePattern.test(lookaheadPrice);

        // Разрешаем продолжение названия только если это явно короткое слово
        // и НЕ начинается новый товар далее (отсутствует шаблон количества и цены)
        const canBeContinuation = looksLikeItemName(continuationCandidate) &&
          !/^\d+[.,]?\d*$/.test(continuationCandidate) &&
          !/^\d+[.,]\d{2}$/.test(continuationCandidate) &&
          continuationCandidate.length < 15 &&
          !looksLikeNextItem;

        if (canBeContinuation) {
          finalName = `${name} ${continuationCandidate.trim()}`;
          consumedLines = 4;
        }
      }
      
      if (isValidItem(finalName, price, quantity)) {
        items.push({
          name: finalName,
          price: price,
          quantity: quantity,
          emoji: '🍽️'
        });
        console.log(`    ✅ Найдена позиция: ${finalName} - ${quantity} шт. × ${price}₽`);
        i += consumedLines;
        continue;
      }
    }
    
    // Если не нашли полный паттерн, попробуем найти только название и цену
    if (isName && !qtyMatch && !priceMatch) {
      // Ищем цену в следующих строках
      for (let j = i + 1; j < Math.min(i + 4, blockLines.length); j++) {
        const testLine = blockLines[j];
        const testPriceMatch = testLine.match(/^(\d+[.,]\d{2})\s*[₽р]?$/);
        
        if (testPriceMatch) {
          const price = parseFloat(testPriceMatch[1].replace(',', '.'));
          const quantity = 1; // По умолчанию 1
          
          if (isValidItem(blockLines[i], price, quantity)) {
            items.push({
              name: blockLines[i].trim(),
              price: price,
              quantity: quantity,
              emoji: '🍽️'
            });
            console.log(`    ✅ Найдена позиция (только название-цена): ${blockLines[i].trim()} - ${quantity} шт. × ${price}₽`);
            i = j + 1;
            break;
          }
        }
      }
    }
    
    i++;
  }
  
  console.log(`  📦 Найдено позиций: ${items.length}`);
  return items;
}

/**
 * Проверяет, является ли строка служебной
 */
function isServiceLine(line) {
  if (!line) return true;
  
  const servicePatterns = [
    /(Блюдо|Кол-во|Количество|Сумма|Товар|Наименование)/i,
    /(ИТОГО|СУММА|ВСЕГО|TOTAL|Итого к оплате|Всего:|Итого:)/i,
    /(Рубли|руб|₽)/i,
    /(Вознаграждение|Service|отзовик)/i,
    /(Дата|Время|ИНН|РН ККТ|ЗН ККТ)/i,
    /^\s*$/
  ];
  
  return servicePatterns.some(pattern => pattern.test(line));
}

/**
 * Проверяет валидность позиции
 */
function isValidItem(name, price, quantity) {
  return name && 
         name.length > 2 && 
         price > 0 && 
         price < 10000 && 
         quantity > 0 && 
         quantity < 100 &&
         !isServiceLine(name);
}

/**
 * Альтернативный парсинг для неструктурированных чеков
 */
function findItemsAlternative(lines, itemsBlock) {
  const items = [];
  const blockLines = lines.slice(itemsBlock.start, itemsBlock.end);
  
  console.log('  🔍 Альтернативный парсинг:');
  console.log(`  📊 Блок строк: ${blockLines.length}`);
  
  // Собираем все названия позиций
  const itemNames = [];
  const prices = [];
  
  for (let i = 0; i < blockLines.length; i++) {
    const line = blockLines[i];
    console.log(`    Строка ${i}: "${line}"`);
    
    if (isServiceLine(line)) {
      console.log(`      ❌ Служебная строка`);
      continue;
    }
    
    // Ищем названия позиций (строки с буквами, но без цен)
    if (looksLikeItemName(line) && !line.match(/\d+[.,]\d{2}/)) {
      itemNames.push(line.trim());
      console.log(`      ✅ Название: "${line.trim()}"`);
    }
    
    // Ищем цены (строки только с числами)
    const priceMatch = line.match(/^(\d+[.,]\d{2})\s*[₽р]?$/);
    if (priceMatch) {
      const price = parseFloat(priceMatch[1].replace(',', '.'));
      if (price > 0 && price < 10000) {
        prices.push(price);
        console.log(`      ✅ Цена: ${price}`);
      }
    }
  }
  
  console.log(`  📋 Найдено названий: ${itemNames.length}`);
  console.log(`  💰 Найдено цен: ${prices.length}`);
  
  // Сопоставляем названия с ценами
  const minLength = Math.min(itemNames.length, prices.length);
  for (let i = 0; i < minLength; i++) {
    if (isValidItem(itemNames[i], prices[i], 1)) {
      items.push({
        name: itemNames[i],
        price: prices[i],
        quantity: 1,
        consumedLines: 1
      });
      console.log(`  ✅ Позиция: ${itemNames[i]} - ${prices[i]}₽`);
    }
  }
  
  return items;
}

/**
 * Валидирует и фильтрует позиции
 */
function validateAndFilterItems(items) {
  // Удаляем дубликаты по названию
  const uniqueItems = [];
  const seenNames = new Set();
  
  for (const item of items) {
    const normalizedName = item.name.toLowerCase().trim();
    if (!seenNames.has(normalizedName)) {
      seenNames.add(normalizedName);
      uniqueItems.push(item);
    }
  }
  
  // Фильтруем аномальные цены
  return uniqueItems.filter(item => 
    item.price > 0 && 
    item.price < 10000 && 
    item.quantity > 0 && 
    item.quantity < 100
  );
}

module.exports = { recognizeReceipt, parseReceiptText };
