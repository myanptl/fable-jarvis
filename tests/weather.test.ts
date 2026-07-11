import { describe, test, expect, afterEach, vi } from "vitest";
import { geocodeCity, getWeather, formatWeather } from "../src/collectors/weather.js";

afterEach(() => {
  vi.unstubAllGlobals();
});

function mockFetch(payload: unknown, ok = true): void {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({
      ok,
      status: ok ? 200 : 500,
      json: async () => payload,
    })),
  );
}

describe("weather collector", () => {
  test("geocodes a city", async () => {
    mockFetch({
      results: [{ name: "Westford", latitude: 42.58, longitude: -71.44, admin1: "Massachusetts" }],
    });
    const geo = await geocodeCity("Westford");
    expect(geo).toEqual({ city: "Westford, Massachusetts", latitude: 42.58, longitude: -71.44 });
  });

  test("returns null when city is not found", async () => {
    mockFetch({ results: [] });
    expect(await geocodeCity("Nowhereville")).toBeNull();
  });

  test("returns null when the network fails", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => {
      throw new Error("network down");
    }));
    expect(await geocodeCity("Boston")).toBeNull();
    expect(await getWeather(42, -71)).toBeNull();
  });

  test("parses current weather", async () => {
    mockFetch({
      current: {
        temperature_2m: 72.4,
        apparent_temperature: 74.9,
        weather_code: 2,
        wind_speed_10m: 8.2,
      },
    });
    const weather = await getWeather(42.58, -71.44);
    expect(weather).toEqual({
      temperatureF: 72,
      feelsLikeF: 75,
      description: "partly cloudy",
      windMph: 8,
    });
  });

  test("handles non-ok responses", async () => {
    mockFetch({}, false);
    expect(await getWeather(42, -71)).toBeNull();
  });

  test("formats weather into one line", async () => {
    const line = formatWeather(
      { temperatureF: 72, feelsLikeF: 75, description: "partly cloudy", windMph: 8 },
      "Westford, Massachusetts",
    );
    expect(line).toBe(
      "72°F and partly cloudy in Westford, Massachusetts (feels like 75°F, wind 8 mph)",
    );
  });
});
