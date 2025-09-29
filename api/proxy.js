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

      // Google Script URL
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

// Умный парсинг данных Яндекс Форм
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

  // Убираем префикс
  let text = rawData.replace('Raw data from Yandex: ', '');
  
  // Вытаскиваем дату отправки (последняя дата в формате DD.MM.YYYY)
  const dateMatch = text.match(/(\d{2}\.\d{2}\.\d{4})$/);
  if (dateMatch) {
    result.submitDate = dateMatch[1];
    text = text.replace(dateMatch[0], '').trim();
  }

  // Разбиваем по ключевым словам вопросов
  const patterns = [
    { key: 'fullName', pattern: /^(.+?)(?=E-mail)/ },
    { key: 'email', pattern: /E-mail\s+(.+?)(?=Ваш номер телефона)/ },
    { key: 'phone', pattern: /Ваш номер телефона[^]*?(\+?[\d\s\-\(\)]+?)(?=Ссылка на скан|Уровень образования|Фамилия указанная|Серия документа|Номер документа|Дата вашего рождения|СНИЛС|Гражданство|$)/ },
    { key: 'educationDocLink', pattern: /Ссылка на скан или фото документа об образовании[^]*?(https?:\/\/[^\s]+)/ },
    { key: 'nameChangeDocLink', pattern: /Ссылка на скан или фото документа о смене фамилии[^]*?(https?:\/\/[^\s]+)/ },
    { key: 'educationLevel', pattern: /Уровень образования ВО СПО\s+(.+?)(?=Фамилия указанная|Серия документа|Номер документа|Дата вашего рождения|СНИЛС|Гражданство|$)/ },
    { key: 'diplomaSurname', pattern: /Фамилия указанная в дипломе[^]*?(.+?)(?=Серия документа|Номер документа|Дата вашего рождения|СНИЛС|Гражданство|$)/ },
    { key: 'documentSeries', pattern: /Серия документа[^]*?(.+?)(?=Номер документа|Дата вашего рождения|СНИЛС|Гражданство|$)/ },
    { key: 'documentNumber', pattern: /Номер документа[^]*?(.+?)(?=Дата вашего рождения|СНИЛС|Гражданство|$)/ },
    { key: 'birthDate', pattern: /Дата вашего рождения\s+(\d{4}-\d{2}-\d{2})/ },
    { key: 'snils', pattern: /СНИЛС[^]*?(\d{2,3}[\-\s]?\d{3}[\-\s]?\d{3}[\s]?\d{2})/ },
    { key: 'citizenship', pattern: /Гражданство\s+(.+)$/ }
  ];

  patterns.forEach(({ key, pattern }) => {
    const match = text.match(pattern);
    if (match && match[1]) {
      result[key] = match[1].trim();
      
      // Убираем найденное из текста для следующих поисков
      if (key !== 'fullName') { // fullName особый случай
        text = text.replace(match[0], '');
      }
    }
  });

  // Особый случай для ФИО - берем все до первого E-mail
  const nameMatch = text.match(/^(.+?)(?=E-mail)/);
  if (nameMatch) {
    result.fullName = nameMatch[1].trim();
  }

  return result;
}
