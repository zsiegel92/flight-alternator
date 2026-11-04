import { z } from "zod";
import { cityIdSchema, type FlightLocation } from "./cities.ts";
import {
	type CalendarDate,
	calendarDateSchema,
	isCalendarDateBefore,
	toIsoDate,
} from "./date-utils.ts";

export const citySchema = z.string().trim().min(1).max(60);

export const timeWindowSchema = z
	.object({
		start: z.number().int().min(0).max(22),
		end: z.number().int().min(1).max(23),
	})
	.refine((window) => window.start < window.end, "End must be after start");
export type TimeWindow = z.infer<typeof timeWindowSchema>;

const searchSchema = z
	.object({
		origin: z.discriminatedUnion("kind", [
			z.object({ id: cityIdSchema, kind: z.literal("city") }),
			z.object({
				id: z.string().regex(/^[A-Z]{3}$/),
				kind: z.literal("airport"),
			}),
		]),
		destination: z.discriminatedUnion("kind", [
			z.object({ id: cityIdSchema, kind: z.literal("city") }),
			z.object({
				id: z.string().regex(/^[A-Z]{3}$/),
				kind: z.literal("airport"),
			}),
		]),
		depart: calendarDateSchema,
		returnDate: calendarDateSchema,
		nonstopOnly: z.boolean().default(false),
		outboundTime: timeWindowSchema.optional(),
		returnTime: timeWindowSchema.optional(),
	})
	.refine((trip) => isCalendarDateBefore(trip.depart, trip.returnDate));

export function googleFlightsUrl(input: {
	origin: FlightLocation;
	destination: FlightLocation;
	depart: CalendarDate;
	returnDate: CalendarDate;
	nonstopOnly?: boolean;
	outboundTime?: TimeWindow;
	returnTime?: TimeWindow;
}): string {
	const {
		origin,
		destination,
		depart,
		returnDate,
		nonstopOnly,
		outboundTime,
		returnTime,
	} = searchSchema.parse(input);

	const encoder = new TextEncoder();
	const varint = (number: number): number[] => {
		const output: number[] = [];
		do {
			output.push((number & 127) | (number > 127 ? 128 : 0));
			number = Math.floor(number / 128);
		} while (number);
		return output;
	};
	const numberField = (field: number, value: number) => [
		...varint(field * 8),
		...varint(value),
	];
	const bytes = (field: number, value: string | number[]) => {
		const data = typeof value === "string" ? [...encoder.encode(value)] : value;
		return [...varint(field * 8 + 2), ...varint(data.length), ...data];
	};
	const location = ({ id, kind }: FlightLocation) => [
		...numberField(1, kind === "airport" ? 1 : 3),
		...bytes(2, id),
	];
	const leg = (
		date: CalendarDate,
		origin: FlightLocation,
		destination: FlightLocation,
		time?: TimeWindow,
	) =>
		bytes(3, [
			...bytes(2, toIsoDate(date)),
			...(nonstopOnly ? numberField(5, 0) : []),
			...(time
				? [
						...numberField(8, time.start),
						...numberField(9, time.end),
						...numberField(10, 0),
						...numberField(11, 23),
					]
				: []),
			...bytes(13, location(origin)),
			...bytes(14, location(destination)),
		]);
	const data = [
		...numberField(1, 28),
		...numberField(2, 2),
		...leg(depart, origin, destination, outboundTime),
		...leg(returnDate, destination, origin, returnTime),
		...numberField(8, 1),
		...numberField(9, 1),
		...numberField(14, 1),
		...bytes(16, [8, ...Array(9).fill(255), 1]),
		...numberField(19, 1),
	];
	const tfs = btoa(String.fromCharCode(...data))
		.replace(/\+/g, "-")
		.replace(/\//g, "_")
		.replace(/=+$/, "");
	return `https://www.google.com/travel/flights/search?tfs=${tfs}&tfu=EgYIABAAGAA`;
}
