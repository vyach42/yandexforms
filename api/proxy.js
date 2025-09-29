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

// НОВЫЙ ПАРСЕР С ПРАВИЛЬНОЙ ОБРАБОТКОЙ ДАТЫ
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

  let text = rawData.replace('Raw data from Yandex: ', '');
  
  // ВЫНОСИМ ДАТУ В САМОЕ НАЧАЛО - ищем дату в формате DD.MM.YYYY
  const dateMatch = text.match(/(\d{2}\.\d{2}\.\d{4})/);
  if (dateMatch) {
    result.submitDate = dateMatch[1];
    // Убираем дату из текста - заменяем на специальный маркер
    text = text.replace(dateMatch[0], '%%DATE_REMOVED%%').trim();
  }

  // Разбиваем на строки и парсим
  const lines = text.split('\n').map(line => line.trim()).filter(line => line);
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Пропускаем маркер даты
    if (line.includes('%%DATE_REMOVED%%')) continue;
    
    // Определяем поле по заголовку и берем следующую строку как значение
    if (line.includes('ФИО (как в паспорте):')) {
      result.fullName = cleanValue(getValueFromNextLine(lines, i));
    }
    else if (line.includes('E-mail:')) {
      result.email = cleanValue(getValueFromNextLine(lines, i));
    }
    else if (line.includes('Ваш номер телефона')) {
      result.phone = cleanValue(getValueFromNextLine(lines, i));
    }
    else if (line.includes('Ссылка на скан или фото документа об образовании')) {
      result.educationDocLink = cleanValue(getValueFromNextLine(lines, i));
    }
    else if (line.includes('Ссылка на скан или фото документа о смене фамилии')) {
      result.nameChangeDocLink = cleanValue(getValueFromNextLine(lines, i));
    }
    else if (line.includes('Уровень образования ВО/СПО:')) {
      result.educationLevel = cleanValue(getValueFromNextLine(lines, i));
    }
    else if (line.includes('Фамилия указанная в дипломе о ВО или СПО:')) {
      result.diplomaSurname = cleanValue(getValueFromNextLine(lines, i));
    }
    else if (line.includes('Серия документа о ВО/СПО:')) {
      result.documentSeries = cleanValue(getValueFromNextLine(lines, i));
    }
    else if (line.includes('Номер документа о ВО/СПО:')) {
      result.documentNumber = cleanValue(getValueFromNextLine(lines, i));
    }
    else if (line.includes('Дата вашего рождения:')) {
      result.birthDate = cleanValue(getValueFromNextLine(lines, i));
    }
    else if (line.includes('СНИЛС в формате 123-456-789 98:')) {
      result.snils = cleanValue(getValueFromNextLine(lines, i));
    }
    else if (line.includes('Гражданство:')) {
      result.citizenship = cleanValue(getValueFromNextLine(lines, i));
    }
  }

  return result;
}

// Функция для очистки значения от прилипшей даты
function cleanValue(value) {
  if (!value) return '';
  
  // Убираем дату в формате DD.MM.YYYY если она прилипла
  return value.replace(/(\d{2}\.\d{2}\.\d{4})$/, '').trim();
}

// Функция для получения значения из следующей строки
function getValueFromNextLine(lines, currentIndex) {
  if (currentIndex + 1 < lines.length) {
    const nextLine = lines[currentIndex + 1];
    // Проверяем, что следующая строка не является новым заголовком
    if (!nextLine.includes(':') || nextLine.endsWith('):')) {
      return nextLine;
    }
  }
  return '';
}
