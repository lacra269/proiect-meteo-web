require('dotenv').config();
const express = require('express');
const fetch = require('node-fetch');
const path = require('path');

const app = express();
const PORT = 3000;
const API_KEY = process.env.API_KEY;

app.use(express.json());
app.use(express.static('public'));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Funcție pentru a obține direcția vântului în funcție de gradele returnate de API
function directionFromDegrees(degree) {
  const directions = [
    "nord", "nord-est", "est", "sud-est",
    "sud", "sud-vest", "vest", "nord-vest"
  ];
  const index = Math.round(degree / 45) % 8;
  return directions[index];
}

// Funcție pentru a obține direcția vântului (acesta va fi folosită și pe frontend)
function getWindDirection(deg) {
  if (deg === undefined) {
    return 'necunoscut';
  }
  return directionFromDegrees(deg);
}

// Route principal (dacă folosești ejs, altfel poți ignora)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

// ✅ Endpoint complet pentru vreme curentă + prognoză
app.post('/fullweather', async (req, res) => {
  const { city } = req.body;

  try {
    const [currentRes, forecastRes] = await Promise.all([
      fetch(`https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${API_KEY}&units=metric&lang=ro`),
      fetch(`https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${API_KEY}&units=metric&lang=ro`)
    ]);

    if (!currentRes.ok || !forecastRes.ok) {
      return res.status(400).json({ error: "Orașul nu a fost găsit." });
    }

    const current = await currentRes.json();
    const forecast = await forecastRes.json();

    // Vreme curentă
    const currentWeather = {
      oras: current.name,
      temperaturaC: current.main.temp,
      temperaturaF: (current.main.temp * 9/5) + 32,
      descriere: current.weather[0].description,
      umiditate: current.main.humidity,
      vant: `${current.wind.speed} m/s - ${getWindDirection(current.wind.deg)}`,
      rasarit: new Date(current.sys.sunrise * 1000).toLocaleTimeString('ro-RO'),
      apus: new Date(current.sys.sunset * 1000).toLocaleTimeString('ro-RO'),
      mesaj: current.main.temp > 25 ? "E cald afară, nu uita de loțiune!" : current.main.temp < 10 ? "Ia o haină groasă! O raceala nu este ce-ti doresti acum" : "O zi plăcută! Go get fun"
    };

    // Prognoză pe ore (următoarele 8 înregistrări = 24h)
    const peOre = forecast.list.slice(0, 8).map(item => ({
      data: item.dt_txt,
      temperaturaC: item.main.temp.toFixed(1),
      descriere: item.weather[0].description,
      umiditate: item.main.humidity,
      vant: `${item.wind.speed} m/s - ${getWindDirection(item.wind.deg)}` // Direcția vântului adăugată
}));

    // Prognoză pe zile (una pe zi la ora 12:00:00)
    const peZile = forecast.list.filter(item => item.dt_txt.includes('12:00:00')).slice(0, 5).map(item => ({
      data: new Date(item.dt * 1000).toLocaleDateString('ro-RO', { weekday: 'long', day: 'numeric', month: 'long' }),
      temperaturaC: item.main.temp.toFixed(1),
      descriere: item.weather[0].description,
      umiditate: item.main.humidity,
      vant: `${item.wind.speed} m/s - ${getWindDirection(item.wind.deg)}` // Direcția vântului adăugată
     }));
    res.json({ currentWeather, peOre, peZile });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Eroare la procesarea datelor meteo." });
  }
});

// Pornire server
app.listen(PORT, () => {
  console.log(`Serverul rulează la http://localhost:${PORT}`);
});
