import { z } from "zod";
import cityData from "./data/us-cities.json" with { type: "json" };

export const cityIdSchema = z.string().regex(/^\/m\/[a-z0-9_]+$/);
const airportCodeSchema = z.string().regex(/^[A-Z]{3}$/);
const cityListSchema = z.array(
	z.object({
		name: z.string().trim().min(1),
		label: z.string().trim().min(1),
		id: cityIdSchema,
		airports: z.array(airportCodeSchema),
	}),
);

export const usCities = cityListSchema.parse(cityData);

export type FlightLocation =
	| { id: string; kind: "city" }
	| { id: string; kind: "airport" };

// These IDs are already used in Google Flights city searches.
const verifiedCityLocations: Record<string, string> = {
	burbank: "/m/0r00l",
	houston: "/m/03l2n",
	jacksonville: "/m/0ggh3",
	"los angeles": "/m/030qb3t",
	miami: "/m/0f2v0",
	orlando: "/m/0ply0",
	philadelphia: "/m/0dclg",
	"san antonio": "/m/0f2w0",
	seattle: "/m/0d9jr",
	tampa: "/m/0n1rj",
	"new york": "/m/02_286",
	"new york city": "/m/02_286",
};
const citiesByLabel = new Map(
	usCities.map((city) => [normalizeCity(city.label), city]),
);
const citiesByName = new Map<string, (typeof usCities)[number][]>();
for (const city of usCities) {
	const key = normalizeCity(city.name);
	citiesByName.set(key, [...(citiesByName.get(key) ?? []), city]);
}

function normalizeCity(name: string): string {
	return name.trim().toLocaleLowerCase("en-US");
}

export const cityOptions = [
	...new Set([
		...usCities.map((city) => city.label),
		"Burbank",
		"Houston",
		"Jacksonville",
		"Los Angeles",
		"Miami",
		"Orlando",
		"Philadelphia",
		"San Antonio",
		"New York",
		"Tampa",
	]),
].sort((a, b) => a.localeCompare(b, "en-US"));

export function flightLocationFor(name: string): FlightLocation | null {
	const key = normalizeCity(name);
	const verifiedCityId = verifiedCityLocations[key];
	if (verifiedCityId) return { id: verifiedCityId, kind: "city" };

	const city =
		citiesByLabel.get(key) ??
		(citiesByName.get(key)?.length === 1
			? citiesByName.get(key)?.[0]
			: undefined);
	if (!city) return null;

	if (city.airports.length === 1) {
		return { id: city.airports[0], kind: "airport" };
	}
	return { id: city.id, kind: "city" };
}
