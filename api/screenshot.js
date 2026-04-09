const { v2: cloudinary } = require('cloudinary');
const https = require('https');
const http = require('http');

cloudinary.config({
  cloud_name: 'dl8onsu6w',
  api_key: '381418591325965',
  api_secret: 'tq4MjEe-1JSk5VRLiOb5ZT7hvJw'
});

const BROWSERLESS_TOKEN = '2UIT0JKjRg1QyJL56144746b3c0182241600035afc22d5600';

// Download image using Browserless as a proxy with real browser headers
function downloadWithBrowserHeaders(imageUrl) {
  return new Promise((resolve, reject) => {
    // Call Browserless /function with NO page navigation - just pure Node.js fetch
    const payload = JSON.stringify({
      code: `
        module.exports = async (context) => {
          const https = require('https');
          const url = '${imageUrl.replace(/'/g, "\\'")}';
          
          return new Promise((resolve, reject) => {
            const options = {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
                'Referer': 'https://www.marset.com/',
                'sec-fetch-dest': 'image',
                'sec-fetch-mode': 'no-cors',
                'sec-fetch-site': 'same-origin'
              }
            };
            
            https.get(url, options, (res) => {
              const chunks = [];
              res.on('data', chunk => chunks.push(chunk));
              res.on('end', () => {
                const buffer = Buffer.concat(chunks);
                resolve({
                  data: buffer.toString('base64'),
                  type: 'application/json'
                });
              });
              res.on('error', reject);
            }).on('error', reject);
          });
        };
      `
    });

    const urlObj = new URL('https://chrome.browserless.io/function?token=' + BROWSERLESS_TOKEN);
    const req = https.request({
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, (res) => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        try {
          const body = JSON.parse(Buffer.concat(chunks).toString());
          if (body.data) {
            resolve(Buffer.from(body.data, 'base64'));
          } else {
            reject(new Error('No data in response: ' + JSON.stringify(body)));
          }
        } catch(e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

module.exports = async function(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const body = req.body;
  if (!body || !body.image_url) return res.status(400).json({ error: 'No image_url' });

  try {
    const imageBuffer = await downloadWithBrowserHeaders(body.image_url);
    
    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: 'lighttrends', resource_type: 'image',
          transformation: [{ width: 600, height: 450, crop: 'fill', quality: 80 }] },
        (error, result) => error ? reject(error) : resolve(result)
      );
      stream.end(imageBuffer);
    });

    return res.status(200).json({ cloudinary_url: result.secure_url });
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
};
