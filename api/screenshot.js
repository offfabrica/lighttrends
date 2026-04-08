const { v2: cloudinary } = require('cloudinary');

cloudinary.config({
  cloud_name: 'dl8onsu6w',
  api_key: '381418591325965',
  api_secret: 'tq4MjEe-1JSk5VRLiOb5ZT7hvJw'
});

const BROWSERLESS_TOKEN = '2UIT0JKjRg1QyJL56144746b3c0182241600035afc22d5600';

async function getImageUrlViaBrowserless(pageUrl) {
  // Use Browserless to get the page content and extract image src
  const response = await fetch(`https://chrome.browserless.io/function?token=${BROWSERLESS_TOKEN}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code: `
        module.exports = async ({ page }) => {
          await page.goto('${pageUrl}', { waitUntil: 'networkidle2', timeout: 15000 });
          // Get the main product image src
          const imgSrc = await page.evaluate(() => {
            const imgs = Array.from(document.querySelectorAll('img'));
            const big = imgs.find(img => img.naturalWidth > 400 && img.src && img.src.startsWith('http'));
            return big ? big.src : null;
          });
          return { data: imgSrc, type: 'application/json' };
        };
      `
    })
  });

  if (!response.ok) throw new Error('Browserless function error: ' + response.status);
  const data = await response.json();
  return data.data || null;
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
    // Get the actual image URL via Browserless
    var actualImageUrl = await getImageUrlViaBrowserless(body.image_url);
    if (!actualImageUrl) throw new Error('No image found on page');

    // Let Cloudinary fetch it directly
    var result = await cloudinary.uploader.upload(actualImageUrl, {
      folder: 'lighttrends',
      resource_type: 'image',
      transformation: [{ width: 600, height: 450, crop: 'fill', quality: 80 }],
      timeout: 30000
    });

    return res.status(200).json({ cloudinary_url: result.secure_url });
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
};
