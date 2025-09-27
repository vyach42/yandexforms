// api/proxy.js
export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      // Правильно получаем данные от Яндекс Форм
      let body = '';
      
      // Если данные в формате текста (как приходило на webhook.site)
      if (req.body && typeof req.body === 'object') {
        body = req.body;
      } else {
        // Если данные как raw string
        body = await getRawBody(req);
      }
      
      console.log('Raw data from Yandex:', body);
      
      // Google Script URL
      const googleScriptUrl = 'https://script.google.com/macros/s/AKfycbxnoo5_bv4z4U0qxkI7a9UgEyXw0QuYZBCiTS4vqlBVDUz1XdI44ueU1OBjs2dafdBrBg/exec';
      
      // Пересылаем в Google Script как TEXT (как было на webhook.site)
      const response = await fetch(googleScriptUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain', // Меняем на text/plain!
        },
        body: body // Пересылаем как есть
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
