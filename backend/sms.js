const AfricasTalking = require('africastalking');

const at = AfricasTalking({
  apiKey: process.env.AT_API_KEY,
  username: process.env.AT_USERNAME, // 'sandbox' for testing
});
const sms = at.SMS;

async function sendSMS(req, res) {
  const { to, message } = req.body;

  // Validate
  if (!to || !message) {
    return res.status(400).json({ error: 'to and message are required' });
  }

  try {
    const result = await sms.send({
      to: Array.isArray(to) ? to : [to],
      message: message.slice(0, 160), // SMS limit
      from: 'HarvestNtn',
    });
    res.json({ success: true, result });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

// Utility: send weather alert to a list of farmers
async function sendWeatherAlert(phones, weather) {
  const { getRuleBasedAdvice } = require('./advice');
  const advice = getRuleBasedAdvice(weather);
  const msg = `[Harvest Nation] Temp:${weather.temperature}°C Rain:${weather.precipitation}mm | ${advice.slice(0, 100)}`;

  return sms.send({
    to: phones,
    message: msg,
    from: 'HarvestNtn',
  });
}

module.exports = { sendSMS, sendWeatherAlert };