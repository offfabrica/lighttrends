const chromium = require('@sparticuz/chromium');
const puppeteer = require('puppeteer-core');
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: 'dl8onsu6w',
  api_key: '381418591325965',
  api_secret: 'tq4MjEe-1JSk5VRLiOb5ZT7hvJw'
});

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { image_url, name } = req.body;
  if (!image_url) return res.status(400).json({ error: 'No image_url' });

  try {
    const browser = await puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 800, height: 600 });
    
    // Try direct image first
    const response = await page.goto(image_url, { 
      waitUntil: 'networkidle2', 
      timeout: 15000 
    });
    
    const screenshot = await page.screenshot({ type: 'jpeg', quality: 85 });
    await browser.close();

    // Upload to Cloudinary
    const result = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        { folder: 'lighttrends', resource_type: 'image' },
        (error, result) => error ? reject(error) : resolve(result)
      )(screenshot);
    });

    return res.status(200).json({ cloudinary_url: result.secure_url });
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
};
