const { v2: cloudinary } = require('cloudinary');

cloudinary.config({
  cloud_name: 'dl8onsu6w',
  api_key: '381418591325965',
  api_secret: 'tq4MjEe-1JSk5VRLiOb5ZT7hvJw'
});

const BROWSERLESS_TOKEN = '2UIT0JKjRg1QyJL56144746b3c0182241600035afc22d5600';

async function getImageViaBrowserless(imageUrl) {
  // Use Browserless to take a screenshot of the image URL
  const response = await fetch(`https://chrome.browserless.io/screenshot?token=${BROWSERLESS_TOKEN}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: imageUrl,
      options: {
        type: 'jpeg',
        quality: 85,
        fullPage: false
      },
      viewport: {
        width: 800,
        height: 600
      },
      waitFor: 2000
    })
  });

  if (!response.ok) throw new Error('Browserless error: ' + response.status);
  const buffer = await response.arrayBuffer();
  return Buffer.from(buffer);
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
    var imageBuffer = await getImageViaBrowserless(body.image_url);

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
