const https = require('https');
const http = require('http');
const { v2: cloudinary } = require('cloudinary');

cloudinary.config({
  cloud_name: 'dl8onsu6w',
  api_key: '381418591325965',
  api_secret: 'tq4MjEe-1JSk5VRLiOb5ZT7hvJw'
});

function downloadImage(url, maxBytes) {
  maxBytes = maxBytes || 10 * 1024 * 1024;
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://www.google.com'
      }
    };
    const req = protocol.get(url, options, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 307) {
        return downloadImage(res.headers.location, maxBytes).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error('HTTP ' + res.statusCode));
      }
      const chunks = [];
      let total = 0;
      res.on('data', function(chunk) {
        total += chunk.length;
        if (total > maxBytes) {
          req.destroy();
          return reject(new Error('Image too large'));
        }
        chunks.push(chunk);
      });
      res.on('end', function() { resolve(Buffer.concat(chunks)); });
      res.on('error', reject);
    });
    req.on('error', reject);
    req.setTimeout(10000, function() { req.destroy(); reject(new Error('Timeout')); });
  });
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
    var imageBuffer = await downloadImage(body.image_url);
    var result = await new Promise(function(resolve, reject) {
      var stream = cloudinary.uploader.upload_stream(
        { folder: 'lighttrends', resource_type: 'image',
          transformation: [{ width: 600, height: 450, crop: 'fill', quality: 80 }] },
        function(error, result) { if (error) reject(error); else resolve(result); }
      );
      stream.end(imageBuffer);
    });
    return res.status(200).json({ cloudinary_url: result.secure_url });
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
};
