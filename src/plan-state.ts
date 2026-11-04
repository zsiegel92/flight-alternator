import { createParser } from "nuqs";
import { z } from "zod";
import {
	calendarDateSchema,
	departureSchema,
	nextSaturday,
	returnDaySchema,
} from "./date-utils.ts";
import { timeWindowSchema } from "./flights.ts";

export const flightTimesSchema = z.object({
	friday: timeWindowSchema,
	saturday: timeWindowSchema,
	sunday: timeWindowSchema,
	monday: timeWindowSchema,
});
const personSchema = z.object({
	name: z.string(),
	symbol: z.string(),
	every: z.string(),
	city: z.string(),
	departure: departureSchema,
	returnDay: returnDaySchema,
	times: flightTimesSchema,
});
const planSchema = z.object({
	people: z.tuple([personSchema, personSchema]),
	firstSaturday: calendarDateSchema.nullable(),
	nonstopOnly: z.boolean(),
	numerator: z.string(),
	denominator: z.string(),
	cost: z.string(),
});
export type PersonDraft = z.infer<typeof personSchema>;
export type FlightTimes = PersonDraft["times"];
export type Plan = z.infer<typeof planSchema>;

function defaultTimes(): FlightTimes {
	return {
		friday: { start: 18, end: 23 },
		saturday: { start: 6, end: 11 },
		sunday: { start: 18, end: 23 },
		monday: { start: 4, end: 6 },
	};
}

export const initialPlan: Plan = {
	people: [
		{
			name: "Zach",
			symbol: "ℤ",
			every: "4",
			city: "Orlando",
			departure: "friday",
			returnDay: "sunday",
			times: defaultTimes(),
		},
		{
			name: "Estrella",
			symbol: "⭐️",
			every: "6",
			city: "Philadelphia",
			departure: "saturday",
			returnDay: "sunday",
			times: defaultTimes(),
		},
	],
	firstSaturday: nextSaturday(),
	nonstopOnly: true,
	numerator: "1",
	denominator: "1",
	cost: "330",
};

function encodePlan(plan: Plan): string {
	let bytes = "";
	for (const byte of new TextEncoder().encode(JSON.stringify(plan))) {
		bytes += String.fromCharCode(byte);
	}
	return btoa(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function decodePlan(value: string): unknown {
	const json = value.startsWith("{")
		? value // Links created before base64url encoding.
		: new TextDecoder("utf-8", { fatal: true }).decode(
				Uint8Array.from(
					atob(value.replace(/-/g, "+").replace(/_/g, "/")),
					(character) => character.charCodeAt(0),
				),
			);
	return JSON.parse(json);
}

export const planParser = createParser<Plan>({
	parse(value) {
		try {
			const result = planSchema.safeParse(decodePlan(value));
			return result.success ? result.data : null;
		} catch {
			return null;
		}
	},
	serialize: encodePlan,
	eq: (a, b) => JSON.stringify(a) === JSON.stringify(b),
})
	.withDefault(initialPlan)
	.withOptions({ clearOnDefault: false });
