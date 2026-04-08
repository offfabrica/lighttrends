const { v2: cloudinary } = require('cloudinary');

cloudinary.config({
  cloud_name: 'dl8onsu6w',
  api_key: '381418591325965',
  api_secret: 'tq4MjEe-1JSk5VRLiOb5ZT7hvJw'
});

const BROWSERLESS_TOKEN = '2UIT0JKjRg1QyJL56144746b3c0182241600035afc22d5600';

async function downloadImageViaBrowserless(imageUrl) {
  // Use Browserless /function to fetch just the image bytes with browser headers
  const response = await fetch(`https://chrome.browserless.io/function?token=${BROWSERLESS_TOKEN}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code: `
        const https = require('https');
        const http = require('http');
        
        module.exports = async ({ page }) => {
          // Use page.evaluate to fetch the image as a browser would
          const imageData = await page.evaluate(async (url) => {
            const response = await fetch(url);
            const blob = await response.blob();
            return new Promise((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result);
              reader.readAsDataURL(blob);
            });
          }, '${imageUrl}');
          
          return {
            data: imageData,
            type: 'application/json'
          };
        };
      `
    })
  });

  if (!response.ok) throw new Error('Browserless error: ' + response.status);
  const result = await response.json();
  
  // result.data is a base64 data URL like "data:image/jpeg;base64,..."
  if (!result.data) throw new Error('No image data returned');
  const base64 = result.data.split(',')[1];
  return Buffer.from(base64, 'base64');
}

module.exports = async function(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  var body = req.body;
  if (!body || !body.image_url) return res.status(400).json({ error: 'No image_url' });

  try {
    var imageBuffer = await downloadImageViaBrowserless(body.image_url);

    var result = await new Promise(function(resolve, reject) {
      var stream = cloudinary.uploader.upload_stream(
        {
          folder: 'lighttrends',
          resource_type: 'image',
          transformation: [{ width: 600, height: 450, crop: 'fill', quality: 80 }]
        },
        function(error, result) { if (error) reject(error); else resolve(result); }
      );
      stream.end(imageBuffer);
    });

    return res.status(200).json({ cloudinary_url: result.secure_url });
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
};
