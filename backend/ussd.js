const { getWeather } = require('./weather');
const { getRuleBasedAdvice } = require('./advice');

// In-memory session store (use Redis/DB for production)
const sessions = {};

async function handleUSSD(req, res) {
  const { sessionId, serviceCode, phoneNumber, text } = req.body;

  // Default SA location — in production, map phoneNumber to stored location
  const LAT = -26.2041;
  const LON = 28.0473;

  let response = '';
  const input = text ? text.trim() : '';
  const parts = input.split('*');
  const level = parts.length;
  const last = parts[parts.length - 1];

  // Level 0 — main menu
  if (input === '') {
    response = `CON Welcome to Harvest Nation 🌾
1. Today's weather
2. Farming advice
3. Soil & irrigation tips
4. Report crop issue
5. About`;

  // Level 1 selections
  } else if (level === 1) {
    if (last === '1') {
      try {
        const w = await getWeather(LAT, LON);
        response = `END Weather now:
Temp: ${w.temperature}°C
Rain: ${w.precipitation}mm
Humidity: ${w.humidity}%
Wind: ${w.windspeed} km/h
3-day rain: ${w.forecast.map(f => f.rainMm + 'mm').join(', ')}`;
      } catch {
        response = 'END Could not fetch weather. Try again.';
      }

    } else if (last === '2') {
      try {
        const w = await getWeather(LAT, LON);
        const advice = getRuleBasedAdvice(w);
        // Keep to 182 chars for USSD
        response = `END Farming Advice:\n${advice.slice(0, 180)}`;
      } catch {
        response = 'END Could not get advice. Try again later.';
      }

    } else if (last === '3') {
      response = `CON Soil & Irrigation:
1. When to irrigate
2. Best irrigation time
3. Soil health tips`;

    } else if (last === '4') {
      response = `CON Report crop issue:
1. Pests seen
2. Disease/fungus
3. Drought stress
4. Flooding`;

    } else if (last === '5') {
      response = `END Harvest Nation v1.0
Helping SA farmers with real-time weather & AI advice.
Powered by Open-Meteo & Claude AI.`;

    } else {
      response = 'END Invalid option. Dial again.';
    }

  // Level 2 — submenu responses
  } else if (level === 2) {
    const [menu, sub] = parts;

    if (menu === '3') {
      const tips = {
        '1': 'Irrigate when soil feels dry 3cm below surface or when leaves begin to wilt in the morning.',
        '2': 'Best time to irrigate: early morning (5-8am) or evening (6-8pm) to reduce evaporation.',
        '3': 'Healthy soil tip: add compost after harvest and rotate crops yearly to restore nutrients.'
      };
      response = `END ${tips[sub] || 'Invalid option.'}`;

    } else if (menu === '4') {
      const issues = {
        '1': 'END Pest alert sent to extension officer. Check for aphids, whitefly, or bollworm. Use neem oil spray.',
        '2': 'END Disease alert sent. Remove affected leaves. Avoid overhead watering. Apply copper fungicide if severe.',
        '3': 'END Drought stress noted. Mulch around plants immediately. Water deeply 2x per week.',
        '4': 'END Flood report received. Clear drainage channels. Avoid working wet soil. Check for root rot in 5 days.'
      };
      response = issues[sub] || 'END Invalid option.';
    } else {
      response = 'END Invalid selection.';
    }
  } else {
    response = 'END Session ended. Dial *123# to start again.';
  }

  res.set('Content-Type', 'text/plain');
  res.send(response);
}

module.exports = { handleUSSD };