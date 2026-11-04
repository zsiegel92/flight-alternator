import { z } from "zod";

export const departureSchema = z.enum(["friday", "saturday"]);
export const returnDaySchema = z.enum(["sunday", "monday"]);
export const citySchema = z.string().trim().min(1).max(60);
export const timeWindowSchema = z
	.object({
		start: z.number().int().min(0).max(22),
		end: z.number().int().min(1).max(23),
	})
	.refine((window) => window.start < window.end, "End must be after start");
export const saturdaySchema = z.iso
	.date()
	.refine(
		(value) => new Date(`${value}T12:00:00Z`).getUTCDay() === 6,
		"Choose a Saturday",
	);

export type Departure = z.infer<typeof departureSchema>;
export type ReturnDay = z.infer<typeof returnDaySchema>;
export type TimeWindow = z.infer<typeof timeWindowSchema>;

export function nextSaturday(today = new Date()): string {
	const daysUntilSaturday = (6 - today.getDay() + 7) % 7;
	const date = new Date(
		today.getFullYear(),
		today.getMonth(),
		today.getDate() + daysUntilSaturday,
	);
	return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function addDays(isoDate: string, days: number): string {
	const date = new Date(`${isoDate}T12:00:00Z`);
	date.setUTCDate(date.getUTCDate() + days);
	return date.toISOString().slice(0, 10);
}

export function tripDates(
	week: number,
	firstSaturday: string,
	departure: Departure,
	returnDay: ReturnDay,
) {
	const saturday = addDays(firstSaturday, week * 7);
	return {
		depart: addDays(saturday, departure === "friday" ? -1 : 0),
		returnDate: addDays(saturday, returnDay === "sunday" ? 1 : 2),
	};
}

export function shortDate(isoDate: string): string {
	return new Intl.DateTimeFormat("en-US", {
		month: "short",
		day: "numeric",
		timeZone: "UTC",
	}).format(new Date(`${isoDate}T12:00:00Z`));
}

const searchSchema = z
	.object({
		from: citySchema,
		to: citySchema,
		depart: z.iso.date(),
		returnDate: z.iso.date(),
		nonstopOnly: z.boolean().default(false),
		outboundTime: timeWindowSchema.optional(),
		returnTime: timeWindowSchema.optional(),
	})
	.refine((trip) => trip.depart < trip.returnDate);

// City IDs from the city-wide Google Flights link provided for this route.
const cityIds: Record<string, string> = {
	orlando: "/m/0dclg",
	philadelphia: "/m/0ply0",
};

export function googleFlightsUrl(input: {
	from: string;
	to: string;
	depart: string;
	returnDate: string;
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
		const query = `${nonstopOnly ? "Nonstop flights" : "Flights"} to ${to} from ${from} on ${depart} through ${returnDate}${outboundTime ? `, departing ${outboundTime.start}:00-${outboundTime.end}:00` : ""}${returnTime ? `, returning ${returnTime.start}:00-${returnTime.end}:00` : ""}`;
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
		date: string,
		origin: string,
		destination: string,
		time?: TimeWindow,
	) =>
		bytes(3, [
			...bytes(2, date),
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
