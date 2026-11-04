import { z } from "zod";
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
		from: citySchema,
		to: citySchema,
		depart: calendarDateSchema,
		returnDate: calendarDateSchema,
		nonstopOnly: z.boolean().default(false),
		outboundTime: timeWindowSchema.optional(),
		returnTime: timeWindowSchema.optional(),
	})
	.refine((trip) => isCalendarDateBefore(trip.depart, trip.returnDate));

// City IDs from the city-wide Google Flights link provided for this route.
const cityIds: Record<string, string> = {
	orlando: "/m/0dclg",
	philadelphia: "/m/0ply0",
};

export function googleFlightsUrl(input: {
	from: string;
	to: string;
	depart: CalendarDate;
	returnDate: CalendarDate;
	nonstopOnly?: boolean;
	outboundTime?: TimeWindow;
	returnTime?: TimeWindow;
}): string {
	const {
		from,
		to,
		depart,
		returnDate,
		nonstopOnly,
		outboundTime,
		returnTime,
	} = searchSchema.parse(input);
	const originId = cityIds[from.toLowerCase()];
	const destinationId = cityIds[to.toLowerCase()];
	if (!originId || !destinationId) {
		const query = `${nonstopOnly ? "Nonstop flights" : "Flights"} to ${to} from ${from} on ${toIsoDate(depart)} through ${toIsoDate(returnDate)}${outboundTime ? `, departing ${outboundTime.start}:00-${outboundTime.end}:00` : ""}${returnTime ? `, returning ${returnTime.start}:00-${returnTime.end}:00` : ""}`;
		return `https://www.google.com/travel/flights?q=${encodeURIComponent(query)}`;
	}

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
	const city = (id: string) => [...numberField(1, 3), ...bytes(2, id)];
	const leg = (
		date: CalendarDate,
		origin: string,
		destination: string,
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
			...bytes(13, city(origin)),
			...bytes(14, city(destination)),
		]);
	const data = [
		...numberField(1, 28),
		...numberField(2, 2),
		...leg(depart, originId, destinationId, outboundTime),
		...leg(returnDate, destinationId, originId, returnTime),
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
