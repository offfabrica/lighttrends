const { v2: cloudinary } = require('cloudinary');

cloudinary.config({
  cloud_name: 'dl8onsu6w',
  api_key: '381418591325965',
  api_secret: 'tq4MjEe-1JSk5VRLiOb5ZT7hvJw'
});

module.exports = async function(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  var body = req.body;
  if (!body || !body.image_url) return res.status(400).json({ error: 'No image_url' });

  try {
    // Let Cloudinary fetch the image directly from the URL
    var result = await cloudinary.uploader.upload(body.image_url, {
      folder: 'lighttrends',
      resource_type: 'image',
      transformation: [{ width: 600, height: 450, crop: 'fill', quality: 80 }],
      timeout: 20000
    });
    return res.status(200).json({ cloudinary_url: result.secure_url });
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
};
