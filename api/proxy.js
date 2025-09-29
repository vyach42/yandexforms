// Простой и надежный парсинг по ключевым словам
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
  
  // Дата отправки
  const dateMatch = text.match(/(\d{2}\.\d{2}\.\d{4})$/);
  if (dateMatch) {
    result.submitDate = dateMatch[1];
    text = text.replace(dateMatch[0], '').trim();
  }

  // Разбиваем текст по ключевым словам
  const sections = text.split(/(?=E-mail|Ваш номер телефона|Ссылка на скан|Уровень образования|Фамилия указанная|Серия документа|Номер документа|Дата вашего рождения|СНИЛС|Гражданство)/);

  sections.forEach(section => {
    section = section.trim();
    
    if (section.startsWith('E-mail')) {
      result.email = section.replace('E-mail', '').trim();
    } 
    else if (section.startsWith('Ваш номер телефона')) {
      // Ищем номер телефона (цифры после описания)
      const phoneMatch = section.match(/([7]\s?[0-9\s\-\(\)]{10,})/);
      if (phoneMatch) result.phone = phoneMatch[1].trim();
    }
    else if (section.includes('документа об образовании') && section.includes('http')) {
      const linkMatch = section.match(/(http[^\s]+)/);
      if (linkMatch) result.educationDocLink = linkMatch[1];
    }
    else if (section.startsWith('Уровень образования')) {
      result.educationLevel = section.replace('Уровень образования ВО СПО', '').trim();
    }
    else if (section.startsWith('Фамилия указанная')) {
      result.diplomaSurname = section.replace('Фамилия указанная в дипломе о ВО или СПО', '').trim();
    }
    else if (section.startsWith('Серия документа')) {
      result.documentSeries = section.replace('Серия документа о ВО СПО', '').trim();
    }
    else if (section.startsWith('Номер документа')) {
      result.documentNumber = section.replace('Номер документа о ВО СПО', '').trim();
    }
    else if (section.startsWith('Дата вашего рождения')) {
      const dateMatch = section.match(/(\d{4}-\d{2}-\d{2})/);
      if (dateMatch) result.birthDate = dateMatch[1];
    }
    else if (section.startsWith('СНИЛС')) {
      // Парсинг СНИЛС
    }
    else if (section.startsWith('Гражданство')) {
      result.citizenship = section.replace('Гражданство', '').trim();
    }
    else if (!section.includes('E-mail') && !section.includes('Ваш номер')) {
      // Это ФИО (первая секция без ключевых слов)
      result.fullName = section.trim();
    }
  });

  return result;
}
