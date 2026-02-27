const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.set('trust proxy', true);

const ALLOWED_COUNTRIES = ['US', 'CA', 'GB', 'DE', 'FR', 'RU'];

async function getCountryFromIP(ip) {
  try {
    const response = await fetch(`http://ip-api.com/json/${ip}?fields=countryCode`);
    const data = await response.json();
    return data.countryCode || null;
  } catch (error) {
    console.error('GeoIP error:', error);
    return null;
  }
}

app.post('/api/check', async (req, res) => {
  try {
    const { deviceType } = req.body;
    const userIP = req.headers['x-forwarded-for']?.split(',')[0].trim()
                  || req.ip
                  || req.socket.remoteAddress;
    
    console.log(`Request from IP: ${userIP}, Device: ${deviceType}`);
    
    const countryCode = await getCountryFromIP(userIP);
    const isIPAllowed = countryCode && ALLOWED_COUNTRIES.includes(countryCode);
    const isDeviceAllowed = deviceType === 'iPhone' || deviceType === 'iOS';
    
    let response = { ocean: false, my: "", ty: "" };
    
    if (isIPAllowed && isDeviceAllowed) {
      response = { ocean: true, my: "google", ty: ".com" };
    }
    
    console.log(`Country: ${countryCode}, Allowed: ${isIPAllowed}`);
    res.json(response);
    
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ ocean: false, my: "", ty: "" });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'OK' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
