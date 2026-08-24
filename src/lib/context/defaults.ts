import type { Location } from "./types";

/** Honest demo reference point; it does not claim a campus or sensor identity. */
export const DEFAULT_WEATHER_LOCATION: Readonly<Location> = {
  name: "Shanghai reference location",
  latitude: 31.2304,
  longitude: 121.4737,
};
