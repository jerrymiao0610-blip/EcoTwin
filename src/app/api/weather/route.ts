import { NextResponse } from "next/server";
import {
  parseWeatherContextApiRequest,
  WeatherContextApiError,
} from "../../../lib/context/api";
import { createContextSnapshot } from "../../../lib/context/context";
import { DEFAULT_WEATHER_LOCATION } from "../../../lib/context/defaults";
import { OpenMeteoWeatherProvider } from "../../../lib/weather/openMeteo";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const input = parseWeatherContextApiRequest(await request.json());
    const context = await createContextSnapshot(
      DEFAULT_WEATHER_LOCATION,
      new OpenMeteoWeatherProvider(),
      { manualFallbackTemperature: input.manualFallbackTemperature },
    );

    return NextResponse.json(context, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (error instanceof WeatherContextApiError || error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "The weather request was not valid." },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }
    return NextResponse.json(
      { error: "EcoTwin could not prepare weather context." },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
