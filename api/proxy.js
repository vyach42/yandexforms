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

// Функция для восстановления ссылок из ебанного формата Яндекса
function fixYandexUrl(brokenUrl) {
  if (!brokenUrl) return '';
  
  // Восстанавливаем нормальный URL
  let fixed = brokenUrl
    .replace(/^https /, 'https://')
    .replace(/^http /, 'http://')
    .replace(/\s+/g, '/') // Заменяем пробелы на слеши
    .replace(/\/$/, ''); // Убираем trailing slash если есть
  
  return fixed;
}

// Функция для извлечения URL из ответа
function extractUrl(text) {
  // Пробуем найти нормальный URL
  const urlMatch = text.match(/(https?:\/\/[^\s]+)/);
  if (urlMatch) return urlMatch[1];
  
  // Если нет нормального URL, пробуем восстановить из ебанного формата Яндекса
  const yandexUrlMatch = text.match(/(https?)\s+([^\s]+(?:\s+[^\s]+)*)/);
  if (yandexUrlMatch) {
    const protocol = yandexUrlMatch[1];
    const path = yandexUrlMatch[2];
    return fixYandexUrl(`${protocol} ${path}`);
  }
  
  return text;
}

// Функция для извлечения даты из ответа
function extractDate(text) {
  const dateMatch = text.match(/(\d{4}-\d{2}-\d{2})/);
  return dateMatch ? dateMatch[1] : text;
}

// Функция для очистки ответа от остатков вопросов
function cleanAnswer(answer, allQuestions) {
  let cleaned = answer;
  
  // Ищем в ответе начало любого другого вопроса и обрезаем до него
  allQuestions.forEach(question => {
    const questionIndex = cleaned.indexOf(question);
    if (questionIndex !== -1) {
      cleaned = cleaned.substring(0, questionIndex).trim();
    }
  });
  
  return cleaned;
}

// Простой и надежный парсинг по точным вопросам С ЗАЩИТОЙ
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

  // Точные тексты вопросов (как приходят в данных) - В ТОЧНОМ ПОРЯДКЕ
  const questions = [
    'ФИО как в паспорте',
    'E-mail', 
    'Ваш номер телефона в формате 70001234567 не используйте , - и скобки',
    'Ссылка на скан или фото документа об образовании Яндекс.Диск',
    'Ссылка на скан или фото документа о смене фамилии, если ФИО в паспорте не соответствуют ФИО в документе об образовании Яндекс.Диск',
    'Уровень образования ВО СПО',
    'Фамилия указанная в дипломе о ВО или СПО',
    'Серия документа о ВО СПО',
    'Номер документа о ВО СПО',
    'Дата вашего рождения',
    'СНИЛС в формате 123-456-789 98',
    'Гражданство'
  ];

  // Создаем массив найденных вопросов с их позициями
  const foundQuestions = [];
  
  questions.forEach(question => {
    const position = text.indexOf(question);
    if (position !== -1) {
      foundQuestions.push({
        question: question,
        position: position
      });
    }
  });

  // Сортируем вопросы по их позиции в тексте
  foundQuestions.sort((a, b) => a.position - b.position);

  // Обрабатываем каждый найденный вопрос
  for (let i = 0; i < foundQuestions.length; i++) {
    const currentQ = foundQuestions[i];
    const nextQ = foundQuestions[i + 1];
    
    const startIndex = currentQ.position + currentQ.question.length;
    const endIndex = nextQ ? nextQ.position : text.length;
    
    let answer = text.substring(startIndex, endIndex).trim();
    
    // Очищаем ответ от возможных остатков других вопросов
    answer = cleanAnswer(answer, questions);
    
    // Сохраняем в соответствующее поле
    switch(currentQ.question) {
      case 'ФИО как в паспорте':
        result.fullName = answer;
        break;
      case 'E-mail':
        result.email = answer;
        break;
      case 'Ваш номер телефона в формате 70001234567 не используйте , - и скобки':
        result.phone = answer;
        break;
      case 'Ссылка на скан или фото документа об образовании Яндекс.Диск':
        result.educationDocLink = extractUrl(answer);
        break;
      case 'Ссылка на скан или фото документа о смене фамилии, если ФИО в паспорте не соответствуют ФИО в документе об образовании Яндекс.Диск':
        result.nameChangeDocLink = extractUrl(answer);
        break;
      case 'Уровень образования ВО СПО':
        result.educationLevel = answer;
        break;
      case 'Фамилия указанная в дипломе о ВО или СПО':
        result.diplomaSurname = answer;
        break;
      case 'Серия документа о ВО СПО':
        result.documentSeries = answer;
        break;
      case 'Номер документа о ВО СПО':
        result.documentNumber = answer;
        break;
      case 'Дата вашего рождения':
        result.birthDate = extractDate(answer);
        break;
      case 'СНИЛС в формате 123-456-789 98':
        result.snils = answer;
        break;
      case 'Гражданство':
        result.citizenship = answer;
        break;
    }
  }

  return result;
}
