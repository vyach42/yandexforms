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

  // Более точные паттерны для парсинга
  const patterns = [
    // ФИО - всё до E-mail
    { key: 'fullName', pattern: /^(.+?)(?=E-mail)/ },
    
    // Email - после E-mail до "Ваш номер телефона"
    { key: 'email', pattern: /E-mail\s+(.+?)(?=Ваш номер телефона)/ },
    
    // Телефон - ищем последовательность цифр с пробелами/дефисами
    { key: 'phone', pattern: /Ваш номер телефона[^]*?([7]\s?[0-9\s\-\(\)]{10,})/ },
    
    // Ссылка на документ об образовании
    { key: 'educationDocLink', pattern: /документа об образовании[^]*?(http[^\s]+)/ },
    
    // Уровень образования - после "Уровень образования ВО СПО"
    { key: 'educationLevel', pattern: /Уровень образования ВО СПО\s+(\S+)/ },
    
    // Фамилия в дипломе - после "Фамилия указанная в дипломе"
    { key: 'diplomaSurname', pattern: /Фамилия указанная в дипломе[^]*?([А-Яа-яЁё\s]+?)(?=Серия документа|Номер документа|Дата|СНИЛС|Гражданство|$)/ },
    
    // Серия документа - после "Серия документа о ВО СПО"
    { key: 'documentSeries', pattern: /Серия документа о ВО СПО\s+([А-Яа-яЁёA-Za-z0-9]+)/ },
    
    // Номер документа - после "Номер документа о ВО СПО"  
    { key: 'documentNumber', pattern: /Номер документа о ВО СПО\s+([А-Яа-яЁёA-Za-z0-9]+)/ },
    
    // Дата рождения - в формате YYYY-MM-DD
    { key: 'birthDate', pattern: /Дата вашего рождения\s+(\d{4}-\d{2}-\d{2})/ },
    
    // СНИЛС - пока пустое
    { key: 'snils', pattern: /СНИЛС[^]*?(\d{2,3}[\-\s]?\d{3}[\-\s]?\d{3}[\s]?\d{2})/ },
    
    // Гражданство - всё после "Гражданство"
    { key: 'citizenship', pattern: /Гражданство\s+(.+)$/ }
  ];

  patterns.forEach(({ key, pattern }) => {
    const match = text.match(pattern);
    if (match && match[1]) {
      result[key] = match[1].trim();
      console.log(`Found ${key}: ${match[1].trim()}`);
    }
  });

  return result;
}
