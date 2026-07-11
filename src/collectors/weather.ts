/** Open-Meteo: free, no API key. https://open-meteo.com */

export interface GeoResult {
  city: string;
  latitude: number;
  longitude: number;
}

export interface Weather {
  temperatureF: number;
  feelsLikeF: number;
  description: string;
  windMph: number;
}

const FETCH_TIMEOUT_MS = 6000;

const WEATHER_CODES: Record<number, string> = {
  0: "clear skies",
  1: "mostly clear",
  2: "partly cloudy",
  3: "overcast",
  45: "foggy",
  48: "icy fog",
  51: "light drizzle",
  53: "drizzle",
  55: "heavy drizzle",
  61: "light rain",
  63: "rain",
  65: "heavy rain",
  66: "freezing rain",
  67: "heavy freezing rain",
  71: "light snow",
  73: "snow",
  75: "heavy snow",
  77: "snow grains",
  80: "light showers",
  81: "showers",
  82: "violent showers",
  85: "snow showers",
  86: "heavy snow showers",
  95: "thunderstorms",
  96: "thunderstorms with hail",
  99: "severe thunderstorms with hail",
};

async function fetchJson(url: string): Promise<unknown> {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }
  return response.json();
}

export async function geocodeCity(city: string): Promise<GeoResult | null> {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`;
  try {
    const data = (await fetchJson(url)) as {
      results?: Array<{ name: string; latitude: number; longitude: number; admin1?: string }>;
    };
    const match = data.results?.[0];
    if (!match) return null;
    const region = match.admin1 ? `, ${match.admin1}` : "";
    return {
      city: `${match.name}${region}`,
      latitude: match.latitude,
      longitude: match.longitude,
    };
  } catch {
    return null;
  }
}

export async function getWeather(latitude: number, longitude: number): Promise<Weather | null> {
  const params = [
    `latitude=${latitude}`,
    `longitude=${longitude}`,
    "current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m",
    "temperature_unit=fahrenheit",
    "wind_speed_unit=mph",
  ].join("&");
  try {
    const data = (await fetchJson(`https://api.open-meteo.com/v1/forecast?${params}`)) as {
      current?: {
        temperature_2m: number;
        apparent_temperature: number;
        weather_code: number;
        wind_speed_10m: number;
      };
    };
    if (!data.current) return null;
    return {
      temperatureF: Math.round(data.current.temperature_2m),
      feelsLikeF: Math.round(data.current.apparent_temperature),
      description: WEATHER_CODES[data.current.weather_code] ?? "unusual conditions",
      windMph: Math.round(data.current.wind_speed_10m),
    };
  } catch {
    return null;
  }
}

export function formatWeather(weather: Weather, city?: string): string {
  const where = city ? ` in ${city}` : "";
  return `${weather.temperatureF}°F and ${weather.description}${where} (feels like ${weather.feelsLikeF}°F, wind ${weather.windMph} mph)`;
}
