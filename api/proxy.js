// api/proxy.js
export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      // Получаем сырые данные от Яндекс Форм
      const rawBody = await getRawBody(req);
      console.log('Raw data from Yandex:', rawBody);

      // Умный парсинг текстовых данных
      const parsedData = parseYandexFormData(rawBody);
      console.log('Parsed data:', parsedData);

      // Google Script URL (ЗАМЕНИ НА СВОЙ)
      const googleScriptUrl = 'https://script.google.com/macros/s/AKfycbxeVcTESx1jiQjeVv80fR8a-ThN95pXamLEL9FkDc4VGNVi8vt58IV5MptKh4y5_IiZmg/exec';

      // Отправляем в Google Script как JSON
      const response = await fetch(googleScriptUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(parsedData)
      });

      const result = await response.text();
      console.log('Google Script response:', result);

      res.status(200).send(result);

    } catch (error) {
      console.error('Proxy error:', error);
      res.status(500).send('Proxy error: ' + error.message);
    }
  } else {
    res.status(405).send('Method not allowed');
  }
}

// Функция для получения raw body
async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => data += chunk);
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

// ИСПРАВЛЕННЫЙ ПАРСЕР
function parseYandexFormData(rawData) {
  const result = {
    fullName: '',
    email: '',
    phone: '',
    educationDocLink: '',
    nameChangeDocLink: '',
    educationLevel: '',
    diplomaSurname: '',
    documentSeries: '',
    documentNumber: '',
    birthDate: '',
    snils: '',
    citizenship: '',
    submitDate: ''
  };

  let text = rawData;
  
  // Извлекаем дату отправки (первая дата в формате DD.MM.YYYY)
  const dateMatch = text.match(/^(\d{2}\.\d{2}\.\d{4})/);
  if (dateMatch) {
    result.submitDate = dateMatch[1];
    text = text.replace(dateMatch[0], '').trim();
  }

  // Разбиваем на строки и очищаем
  const lines = text.split('\n').map(line => line.trim()).filter(line => line);
  
  console.log('Lines for parsing:', lines);

  // Парсим каждую строку
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // ФИО
    if (line.includes('ФИО (как в паспорте):') || line.includes('ФИО как в паспорте')) {
      result.fullName = getNextNonEmptyLine(lines, i);
    }
    // Email
    else if (line.includes('E-mail:')) {
      result.email = getNextNonEmptyLine(lines, i);
    }
    // Телефон
    else if (line.includes('Ваш номер телефона')) {
      result.phone = cleanPhone(getNextNonEmptyLine(lines, i));
    }
    // Ссылка на документ об образовании
    else if (line.includes('Ссылка на скан или фото документа об образовании')) {
      result.educationDocLink = getNextNonEmptyLine(lines, i);
    }
    // Ссылка на документ о смене фамилии
    else if (line.includes('Ссылка на скан или фото документа о смене фамилии')) {
      result.nameChangeDocLink = getNextNonEmptyLine(lines, i);
    }
    // Уровень образования
    else if (line.includes('Уровень образования ВО/СПО:')) {
      result.educationLevel = getNextNonEmptyLine(lines, i);
    }
    // Фамилия в дипломе
    else if (line.includes('Фамилия указанная в дипломе о ВО или СПО:')) {
      result.diplomaSurname = getNextNonEmptyLine(lines, i);
    }
    // Серия документа
    else if (line.includes('Серия документа о ВО/СПО:')) {
      result.documentSeries = getNextNonEmptyLine(lines, i);
    }
    // Номер документа
    else if (line.includes('Номер документа о ВО/СПО:')) {
      result.documentNumber = getNextNonEmptyLine(lines, i);
    }
    // Дата рождения
    else if (line.includes('Дата вашего рождения:')) {
      result.birthDate = getNextNonEmptyLine(lines, i);
    }
    // СНИЛС
    else if (line.includes('СНИЛС в формате 123-456-789 98:')) {
      result.snils = getNextNonEmptyLine(lines, i);
    }
    // Гражданство
    else if (line.includes('Гражданство:')) {
      result.citizenship = getNextNonEmptyLine(lines, i);
    }
  }

  return result;
}

// Функция для получения следующей непустой строки
function getNextNonEmptyLine(lines, currentIndex) {
  for (let i = currentIndex + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Если нашли следующую строку и она не пустая и не является новым вопросом
    if (line && !isQuestionLine(line)) {
      return line;
    }
  }
  return '';
}

// Функция для проверки, является ли строка вопросом
function isQuestionLine(line) {
  const questionPatterns = [
    'ФИО',
    'E-mail',
    'Ваш номер телефона',
    'Ссылка на скан',
    'Уровень образования',
    'Фамилия указанная в дипломе',
    'Серия документа',
    'Номер документа',
    'Дата вашего рождения',
    'СНИЛС',
    'Гражданство'
  ];
  
  return questionPatterns.some(pattern => line.includes(pattern));
}

// Функция для очистки номера телефона
function cleanPhone(phone) {
  if (!phone) return '';
  
  // Убираем все кроме цифр
  const cleaned = phone.replace(/\D/g, '');
  
  // Если номер начинается с 7 или 8, оставляем как есть, иначе добавляем 7
  if (cleaned.startsWith('7') || cleaned.startsWith('8')) {
    return '7' + cleaned.substring(1);
  }
  
  return '7' + cleaned;
}
