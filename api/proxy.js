// api/proxy.js
export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      // Логируем что пришло от Яндекс
      console.log('Data from Yandex:', req.body);
      
      // Пересылаем в Google Script
      const googleScriptUrl = 'https://script.google.com/macros/s/AKfycbxnoo5_bv4z4U0qxkI7a9UgEyXw0QuYZBCiTS4vqlBVDUz1XdI44ueU1OBjs2dafdBrBg/exec';
      
      const response = await fetch(googleScriptUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(req.body)
      });
      
      const result = await response.text();
      
      // Возвращаем ответ Яндекс Формам
      res.status(200).send(result);
      
    } catch (error) {
      console.error('Proxy error:', error);
      res.status(500).send('Proxy error');
    }
  } else {
    res.status(405).send('Method not allowed');
  }
}
