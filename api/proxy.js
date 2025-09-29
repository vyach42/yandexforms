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
      const googleScriptUrl = 'https://script.google.com/macros/s/AKfycbwJI7zQ0JSygFlJWuzCREjBC05Pl8_D5cF4RQy4aG7pMb1ubUIM7Wek0oci3OkHIUvheQ/exec';

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

// Точный парсинг по вопросам из Яндекс Форм
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
  
  // Вытаскиваем дату отправки (последняя дата в формате DD.MM.YYYY)
  const dateMatch = text.match(/(\d{2}\.\d{2}\.\d{4})$/);
  if (dateMatch) {
    result.submitDate = dateMatch[1];
    text = text.replace(dateMatch[0], '').trim();
  }

  // Точные вопросы из Яндекс Форм (как в твоем файле)
  const questions = [
    'ФИО (как в паспорте)',
    'E-mail',
    'Ваш номер телефона в формате 70001234567 (не используйте "+", "-" и скобки)',
    'Ссылка на скан или фото документа об образовании (Яндекс.Диск)',
    'Ссылка на скан или фото документа о смене фамилии, если ФИО в паспорте не соответствуют ФИО в документе об образовании (Яндекс.Диск)',
    'Уровень образования ВО/СПО',
    'Фамилия указанная в дипломе о ВО или СПО',
    'Серия документа о ВО/СПО',
    'Номер документа о ВО/СПО',
    'Дата вашего рождения',
    'СНИЛС в формате 123-456-789 98',
    'Гражданство'
  ];

  // Создаем regex паттерны для каждого вопроса
  const patterns = [
    // ФИО (как в паспорте) - всё до E-mail
    { 
      key: 'fullName', 
      pattern: /ФИО \(как в паспорте\)(.+?)(?=E-mail)/,
      clean: (str) => str.replace('ФИО (как в паспорте)', '').trim()
    },
    
    // E-mail
    { 
      key: 'email', 
      pattern: /E-mail(.+?)(?=Ваш номер телефона)/,
      clean: (str) => str.replace('E-mail', '').trim()
    },
    
    // Ваш номер телефона
    { 
      key: 'phone', 
      pattern: /Ваш номер телефона в формате 70001234567 \(не используйте "\+", "-" и скобки\)(.+?)(?=Ссылка на скан|Уровень образования|Фамилия указанная|Серия документа|Номер документа|Дата вашего рождения|СНИЛС|Гражданство)/,
      clean: (str) => str.replace('Ваш номер телефона в формате 70001234567 (не используйте "+", "-" и скобки)', '').trim()
    },
    
    // Ссылка на скан документа об образовании
    { 
      key: 'educationDocLink', 
      pattern: /Ссылка на скан или фото документа об образовании \(Яндекс\.Диск\)(.+?)(?=Ссылка на скан или фото документа о смене фамилии|Уровень образования|Фамилия указанная|Серия документа|Номер документа|Дата вашего рождения|СНИЛС|Гражданство)/,
      clean: (str) => {
        const cleaned = str.replace('Ссылка на скан или фото документа об образовании (Яндекс.Диск)', '').trim();
        const urlMatch = cleaned.match(/(https?:\/\/[^\s]+)/);
        return urlMatch ? urlMatch[1] : cleaned;
      }
    },
    
    // Ссылка на скан документа о смене фамилии
    { 
      key: 'nameChangeDocLink', 
      pattern: /Ссылка на скан или фото документа о смене фамилии, если ФИО в паспорте не соответствуют ФИО в документе об образовании \(Яндекс\.Диск\)(.+?)(?=Уровень образования|Фамилия указанная|Серия документа|Номер документа|Дата вашего рождения|СНИЛС|Гражданство)/,
      clean: (str) => {
        const cleaned = str.replace('Ссылка на скан или фото документа о смене фамилии, если ФИО в паспорте не соответствуют ФИО в документе об образовании (Яндекс.Диск)', '').trim();
        const urlMatch = cleaned.match(/(https?:\/\/[^\s]+)/);
        return urlMatch ? urlMatch[1] : cleaned;
      }
    },
    
    // Уровень образования ВО/СПО
    { 
      key: 'educationLevel', 
      pattern: /Уровень образования ВО\/СПО(.+?)(?=Фамилия указанная|Серия документа|Номер документа|Дата вашего рождения|СНИЛС|Гражданство)/,
      clean: (str) => str.replace('Уровень образования ВО/СПО', '').trim()
    },
    
    // Фамилия указанная в дипломе
    { 
      key: 'diplomaSurname', 
      pattern: /Фамилия указанная в дипломе о ВО или СПО(.+?)(?=Серия документа|Номер документа|Дата вашего рождения|СНИЛС|Гражданство)/,
      clean: (str) => str.replace('Фамилия указанная в дипломе о ВО или СПО', '').trim()
    },
    
    // Серия документа
    { 
      key: 'documentSeries', 
      pattern: /Серия документа о ВО\/СПО(.+?)(?=Номер документа|Дата вашего рождения|СНИЛС|Гражданство)/,
      clean: (str) => str.replace('Серия документа о ВО/СПО', '').trim()
    },
    
    // Номер документа
    { 
      key: 'documentNumber', 
      pattern: /Номер документа о ВО\/СПО(.+?)(?=Дата вашего рождения|СНИЛС|Гражданство)/,
      clean: (str) => str.replace('Номер документа о ВО/СПО', '').trim()
    },
    
    // Дата рождения
    { 
      key: 'birthDate', 
      pattern: /Дата вашего рождения(.+?)(?=СНИЛС|Гражданство)/,
      clean: (str) => {
        const cleaned = str.replace('Дата вашего рождения', '').trim();
        const dateMatch = cleaned.match(/(\d{4}-\d{2}-\d{2})/);
        return dateMatch ? dateMatch[1] : cleaned;
      }
    },
    
    // СНИЛС
    { 
      key: 'snils', 
      pattern: /СНИЛС в формате 123-456-789 98(.+?)(?=Гражданство)/,
      clean: (str) => str.replace('СНИЛС в формате 123-456-789 98', '').trim()
    },
    
    // Гражданство
    { 
      key: 'citizenship', 
      pattern: /Гражданство(.+)/,
      clean: (str) => str.replace('Гражданство', '').trim()
    }
  ];

  // Парсим каждый вопрос
  patterns.forEach(({ key, pattern, clean }) => {
    const match = text.match(pattern);
    if (match && match[1]) {
      result[key] = clean(match[1]);
    } else {
      // Пробуем альтернативный поиск
      const question = questions.find(q => text.includes(q));
      if (question) {
        const startIndex = text.indexOf(question) + question.length;
        const nextQuestion = questions.find(q => text.indexOf(q) > startIndex);
        const endIndex = nextQuestion ? text.indexOf(nextQuestion) : text.length;
        
        const value = text.substring(startIndex, endIndex).trim();
        if (value && !value.includes('ФИО') && !value.includes('E-mail') && !value.includes('Ваш номер')) {
          result[key] = value;
        }
      }
    }
  });

  return result;
}

// Для Vercel - нужно указать максимальный размер body
export const config = {
  api: {
    bodyParser: false,
    responseLimit: false,
  },
};
