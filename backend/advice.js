const Anthropic = require('@anthropic-ai/sdk');
const client = new Anthropic();

// Simple rule-based advice (works offline, no API key needed)
function getRuleBasedAdvice(weather) {
  const tips = [];
  const { temperature, precipitation, humidity, forecast } = weather;
  const nextRainMm = forecast?.[0]?.rainMm ?? 0;

  if (nextRainMm > 15) {
    tips.push('Heavy rain forecast. Delay planting and check drainage.');
  } else if (nextRainMm > 5) {
    tips.push('Light rain expected. Good time for transplanting seedlings.');
  } else if (nextRainMm === 0 && humidity < 40) {
    tips.push('Dry conditions. Irrigate early morning to reduce evaporation.');
  }

  if (temperature > 35) {
    tips.push('Very hot today. Avoid fieldwork 11am–3pm. Water crops twice daily.');
  } else if (temperature < 5) {
    tips.push('Risk of frost. Cover sensitive crops overnight.');
  } else if (temperature >= 18 && temperature <= 28) {
    tips.push('Ideal growing temperature. Good day for planting.');
  }

  if (humidity > 85) {
    tips.push('High humidity. Watch for fungal disease on crops.');
  }

  return tips.length > 0 ? tips.join(' ') : 'Conditions are normal. Continue routine farm activities.';
}

// Claude AI advice (more detailed, USSD/SMS friendly)
async function getAIAdvice(weather, question = null) {
  const ruleAdvice = getRuleBasedAdvice(weather);
  const prompt = question
    ? `You are an agriculture advisor for South African farmers. 
       Current weather: ${JSON.stringify(weather)}.
       Rule-based advice: ${ruleAdvice}
       Farmer question: "${question}"
       Give a SHORT, practical answer in 1-2 sentences. Plain text only.`
    : `You are an agriculture advisor for South African farmers.
       Current weather: temp ${weather.temperature}°C, rain ${weather.precipitation}mm, humidity ${weather.humidity}%.
       3-day forecast rain: ${weather.forecast?.map(f => f.rainMm + 'mm').join(', ')}.
       Give ONE short farming tip (max 2 sentences). Plain text only. No bullet points.`;

  const msg = await client.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 150,
    messages: [{ role: 'user', content: prompt }]
  });

  return msg.content[0].text;
}

async function getAdvice(weather, question = null) {
  try {
    return await getAIAdvice(weather, question);
  } catch {
    // Fallback if Claude API fails
    return getRuleBasedAdvice(weather);
  }
}

module.exports = { getAdvice, getRuleBasedAdvice };