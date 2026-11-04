import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

const cityIdSchema = z.string().regex(/^\/m\/[a-z0-9_]+$/);
const iataCodeSchema = z.string().regex(/^[A-Z]{3}$/);
const bindingSchema = z.object({
	city: z.object({ value: z.string().url() }),
	cityLabel: z.object({ value: z.string().min(1) }),
	freebaseID: z.object({ value: cityIdSchema }),
	stateLabel: z.object({ value: z.string().min(1) }).optional(),
	airportCode: z.object({ value: iataCodeSchema }).optional(),
});
const responseSchema = z.object({
	results: z.object({ bindings: z.array(bindingSchema) }),
});

const query = `
SELECT DISTINCT ?city ?cityLabel ?freebaseID ?stateLabel ?airportCode WHERE {
  ?city wdt:P31/wdt:P279* wd:Q515;
        wdt:P17 wd:Q30;
        wdt:P646 ?freebaseID.
  OPTIONAL {
    ?city wdt:P131+ ?state.
    ?state wdt:P31/wdt:P279* wd:Q35657.
  }
  OPTIONAL {
    ?airport wdt:P931 ?city;
             wdt:P238 ?airportCode;
             wdt:P17 wd:Q30.
    ?airport wdt:P31/wdt:P279* wd:Q1248784.
  }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}
`;

const params = new URLSearchParams({ query, format: "json" });
const response = await fetch(`https://query.wikidata.org/sparql?${params}`, {
	headers: {
		accept: "application/sparql-results+json",
		"user-agent": "FlightWeekendPlanner/1.0 (US city list refresh)",
	},
});
if (!response.ok) throw new Error(`Wikidata returned ${response.status}`);
const result = responseSchema.parse(await response.json());

const cities = new Map<
	string,
	{ name: string; state: string | null; id: string; airports: Set<string> }
>();
for (const { city, cityLabel, freebaseID, stateLabel, airportCode } of result
	.results.bindings) {
	const existing = cities.get(city.value) ?? {
		name: cityLabel.value,
		state: stateLabel?.value ?? null,
		id: freebaseID.value,
		airports: new Set<string>(),
	};
	if (airportCode) existing.airports.add(airportCode.value);
	cities.set(city.value, existing);
}

// Wikidata currently classifies this historical settlement as a city but can
// omit the modern Los Angeles city from the query result.
for (const [key, city] of cities) {
	if (city.id === "/m/025t2x8") cities.delete(key);
}
cities.set("https://www.wikidata.org/wiki/Q65", {
	name: "Los Angeles",
	state: "California",
	id: "/m/030qb3t",
	airports: new Set(),
});

const entries = [...cities.values()];
const nameCounts = new Map<string, number>();
for (const city of entries) {
	const key = city.name.toLocaleLowerCase("en-US");
	nameCounts.set(key, (nameCounts.get(key) ?? 0) + 1);
}
const output = entries
	.map(({ name, state, id, airports }) => ({
		name,
		label:
			(nameCounts.get(name.toLocaleLowerCase("en-US")) ?? 0) > 1
				? `${name}, ${state ?? id}`
				: name,
		id,
		airports: [...airports].sort(),
	}))
	.sort((a, b) => a.label.localeCompare(b.label, "en-US"));

const outputPath = fileURLToPath(
	new URL("../src/data/us-cities.json", import.meta.url),
);
await mkdir(dirname(outputPath), { recursive: true });
const json = JSON.stringify(output, null, "\t").replace(
	/"airports": \[\n((?:\t{3}"[A-Z]{3}",?\n)+)\t{2}\]/g,
	(_, lines: string) =>
		`"airports": [${lines
			.split("\n")
			.map((line) => line.trim().replace(/,$/, ""))
			.filter(Boolean)
			.join(", ")}]`,
);
await writeFile(outputPath, `${json}\n`);
console.log(`Wrote ${output.length} cities to ${outputPath}`);
