const axios = require('axios');

async function getWeather(lat, lon) {
  const url = `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,precipitation,windspeed_10m,relative_humidity_2m` +
    `&daily=precipitation_sum,temperature_2m_max,temperature_2m_min` +
    `&timezone=Africa%2FJohannesburg&forecast_days=3`;

  const { data } = await axios.get(url);

  return {
    temperature: data.current.temperature_2m,
    humidity: data.current.relative_humidity_2m,
    windspeed: data.current.windspeed_10m,
    precipitation: data.current.precipitation,
    forecast: data.daily.time.map((date, i) => ({
      date,
      rainMm: data.daily.precipitation_sum[i],
      maxTemp: data.daily.temperature_2m_max[i],
      minTemp: data.daily.temperature_2m_min[i],
    })),
    lat, lon
  };
}

module.exports = { getWeather };