require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // Required for USSD

const { getWeather } = require('./weather');
const { getAdvice } = require('./advice');
const { handleUSSD } = require('./ussd');
const { sendSMS } = require('./sms');

// GET /weather?lat=-26.2&lon=28.04
app.get('/weather', async (req, res) => {
  const { lat = -26.2041, lon = 28.0473 } = req.query;
  try {
    const data = await getWeather(lat, lon);
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /advice — body: { lat, lon }
app.post('/advice', async (req, res) => {
  const { lat = -26.2041, lon = 28.0473 } = req.body;
  try {
    const weather = await getWeather(lat, lon);
    const advice = await getAdvice(weather);
    res.json({ weather, advice });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /ussd — Africa's Talking posts here
app.post('/ussd', handleUSSD);

// POST /sms — send alert to a number
app.post('/sms', sendSMS);

// POST /iot-data — simulated IoT sensor input
app.post('/iot-data', (req, res) => {
  const { soilMoisture, location, farmerId } = req.body;
  // In a real system, store in DB and push to nearby farmers
  const alert = soilMoisture < 30
    ? 'LOW soil moisture detected. Consider irrigating today.'
    : 'Soil moisture OK. No action needed.';
  console.log(`[IoT] Farm: ${location} | Moisture: ${soilMoisture}% → ${alert}`);
  res.json({ received: true, alert, soilMoisture, location });
});

// POST /register-farmer — called when farmer completes registration
app.post('/register-farmer', async (req, res) => {
  const { name, area, crop, phone, hasIoT } = req.body;
  try {
    const weather = await getWeather();
    const advice = getRuleAdvice(weather);
    const message = `Welcome to Harvest Nation, ${name}! 🌾 You're registered for ${crop} updates in ${area}. Today: ${weather.temperature}°C, ${weather.precipitation}mm rain. Tip: ${advice.slice(0, 80)}`;
    await sms.send({
      to: [phone.startsWith('+') ? phone : `+27${phone}`],
      message: message.slice(0, 160),
      from: 'HarvestNtn',
    });
    res.json({ success: true, message });
  } catch (e) {
    console.error('Register SMS error:', e.message);
    res.json({ success: false, error: e.message });
  }
});

app.listen(process.env.PORT || 3000, () =>
  console.log(`Harvest Nation backend running on port ${process.env.PORT || 3000}`)
);
// POST /chat — rule-based chatbot (no API key needed)
app.post('/chat', async (req, res) => {
  const { question } = req.body;
  if (!question) return res.status(400).json({ error: 'question required' });

  try {
    const weather = await getWeather();
    const q = question.toLowerCase();

    // Smart keyword matching
    let answer = '';

    if (q.includes('plant') || q.includes('planting') || q.includes('when')) {
      const rain = weather.forecast?.[0]?.rainMm ?? 0;
      if (rain > 15) answer = `Avoid planting now — heavy rain (${rain}mm) expected tomorrow. Wait 2-3 days for soil to drain.`;
      else if (weather.temperature >= 18 && weather.temperature <= 28) answer = `Good time to plant! Temperature is ideal at ${weather.temperature}°C with light rain expected.`;
      else if (weather.temperature > 35) answer = `Too hot to plant right now (${weather.temperature}°C). Wait for cooler weather or plant in the early morning.`;
      else answer = `Current temp is ${weather.temperature}°C. Best planting window is 18-28°C. Monitor forecast before planting.`;

    } else if (q.includes('water') || q.includes('irrigat') || q.includes('moisture')) {
      if (weather.precipitation > 5) answer = `No need to irrigate today — ${weather.precipitation}mm of rain already recorded. Check soil moisture before watering.`;
      else if (weather.humidity < 40) answer = `Low humidity (${weather.humidity}%). Irrigate early morning (5-8am) to reduce evaporation. Water deeply twice a week.`;
      else answer = `Humidity is ${weather.humidity}%. Irrigate when soil feels dry 3cm below the surface. Best time is early morning.`;

    } else if (q.includes('rain') || q.includes('weather') || q.includes('forecast')) {
      const rain = weather.forecast?.[0]?.rainMm ?? 0;
      answer = `Today: ${weather.temperature}°C, ${weather.precipitation}mm rain. Tomorrow: ${rain}mm expected. ${rain > 10 ? 'Prepare for heavy rain — check drainage.' : 'Conditions look manageable.'}`;

    } else if (q.includes('pest') || q.includes('insect') || q.includes('bug')) {
      answer = `High humidity (${weather.humidity}%) increases pest risk. Inspect crops early morning. Use neem oil spray as first line of defence. Report to extension officer if spreading.`;

    } else if (q.includes('disease') || q.includes('fungus') || q.includes('fungal')) {
      if (weather.humidity > 80) answer = `Warning: humidity at ${weather.humidity}% creates high fungal disease risk. Remove affected leaves immediately and apply copper fungicide.`;
      else answer = `Fungal risk is moderate. Avoid overhead watering, improve air circulation between plants, and monitor daily.`;

    } else if (q.includes('harvest') || q.includes('ready') || q.includes('pick')) {
      answer = `Check crop maturity visually — look for colour change and firmness. Harvest in the morning when temps are cooler (currently ${weather.temperature}°C). Avoid harvesting after heavy rain.`;

    } else if (q.includes('fertiliz') || q.includes('nutrient') || q.includes('soil')) {
      answer = `Apply fertiliser when rain is light (under 5mm). Current rain: ${weather.precipitation}mm. Avoid fertilising before heavy rain — nutrients wash away. Test soil pH yearly.`;

    } else if (q.includes('frost') || q.includes('cold') || q.includes('freez')) {
      if (weather.temperature < 5) answer = `⚠️ Frost risk! Temperature is ${weather.temperature}°C. Cover sensitive crops tonight with fleece or plastic. Water soil before sunset — wet soil retains heat better.`;
      else answer = `No frost risk currently (${weather.temperature}°C). Frost typically occurs below 4°C — keep monitoring overnight temperatures in winter.`;

    } else if (q.includes('maize') || q.includes('corn')) {
      answer = `Maize needs 18-32°C and 500-800mm rain per season. Current temp: ${weather.temperature}°C. ${weather.temperature >= 18 && weather.temperature <= 32 ? 'Conditions are suitable.' : 'Temperature outside ideal range — monitor closely.'}`;

    } else if (q.includes('tomato')) {
      answer = `Tomatoes grow best at 20-27°C. Current: ${weather.temperature}°C. ${weather.humidity > 80 ? 'High humidity — watch for blight. Ensure good air circulation.' : 'Humidity levels OK for tomatoes.'}`;

    } else if (q.includes('wheat')) {
      answer = `Wheat prefers 15-20°C during growing season. Current: ${weather.temperature}°C. ${weather.temperature > 30 ? 'Heat stress risk — ensure adequate moisture.' : 'Temperature manageable for wheat.'}`;

    } else {
      // Default — give weather-based advice
      const advice = getRuleAdvice(weather);
      answer = `Based on current conditions (${weather.temperature}°C, ${weather.humidity}% humidity): ${advice}`;
    }

    res.json({ answer });
  } catch (e) {
    console.error('Chat error:', e.message);
    res.json({ answer: 'Sorry, I could not process that. Please try again.' });
  }
});