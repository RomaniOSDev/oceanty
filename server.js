const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.set('trust proxy', true);

// Список разрешенных стран (ISO коды)
const ALLOWED_COUNTRIES = ['US', 'RU']; // Замените на свои

// Пороговая дата для сравнения
const THRESHOLD_DATE = '25.02.2026';

// Функция для получения страны по IP
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

// Функция для парсинга даты из формата DD.MM.YYYY
function parseDate(dateStr) {
  const [day, month, year] = dateStr.split('.').map(Number);
  return new Date(year, month - 1, day);
}

// Функция для сравнения дат
function isDateValid(dateStr) {
  try {
    const clientDate = parseDate(dateStr);
    const thresholdDate = parseDate(THRESHOLD_DATE);
    
    // Проверяем, что дата не меньше пороговой (>= пороговой)
    return clientDate >= thresholdDate;
  } catch (error) {
    console.error('Date parsing error:', error);
    return false;
  }
}

// Middleware для проверки
app.post('/api/check', async (req, res) => {
  try {
    // 1. Получаем параметры из запроса
    const { deviceType, appVersion, clientDate } = req.body;
    
    // Проверяем наличие всех параметров
    if (!deviceType || !appVersion || !clientDate) {
      return res.status(400).json({ 
        ocean: false, 
        my: "", 
        ty: "",
        error: "Missing required parameters" 
      });
    }
    
    // 2. Получаем реальный IP пользователя
    const userIP = req.headers['x-forwarded-for']?.split(',')[0].trim() 
                  || req.ip 
                  || req.socket.remoteAddress;
    
    console.log(`Request from IP: ${userIP}, Device: ${deviceType}, App Version: ${appVersion}, Date: ${clientDate}`);
    
    // 3. Определяем страну по IP
    const countryCode = await getCountryFromIP(userIP);
    
    // 4. Проверяем условия
    const isIPAllowed = countryCode && ALLOWED_COUNTRIES.includes(countryCode);
    const isDeviceAllowed = deviceType === 'iPhone' || deviceType === 'iOS';
    const isDateValidFlag = isDateValid(clientDate);
    
    console.log(`Country: ${countryCode}, IP Allowed: ${isIPAllowed}, Device Allowed: ${isDeviceAllowed}, Date Valid: ${isDateValidFlag}`);
    
    // 5. Формируем ответ
    let response = {
      ocean: false,
      my: "",
      ty: ""
    };
    
    // Все условия должны быть true
    if (isIPAllowed && isDeviceAllowed && isDateValidFlag) {
      response = {
        ocean: true,
        my: "google",
        ty: ".com"
      };
    }
    
    // 6. Отправляем ответ
    res.json(response);
    
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ 
      ocean: false, 
      my: "", 
      ty: "",
      error: "Internal server error" 
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    thresholdDate: THRESHOLD_DATE
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Threshold date set to: ${THRESHOLD_DATE}`);
});
