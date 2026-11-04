import {
	addDays,
	format,
	getDay,
	isBefore,
	isExists,
	isSameMonth,
	isSaturday,
	parseISO,
} from "date-fns";
import { z } from "zod";

export const departureSchema = z.enum(["friday", "saturday"]);
export const returnDaySchema = z.enum(["sunday", "monday"]);
export type Departure = z.infer<typeof departureSchema>;
export type ReturnDay = z.infer<typeof returnDaySchema>;

export type CalendarDate = Readonly<{
	year: number;
	month: number;
	day: number;
}>;

const fromDate = (date: Date): CalendarDate => ({
	year: date.getFullYear(),
	month: date.getMonth() + 1,
	day: date.getDate(),
});

function toDate(date: CalendarDate): Date {
	const value = new Date(0);
	// setFullYear preserves years 1–99; noon avoids midnight DST changes.
	value.setFullYear(date.year, date.month - 1, date.day);
	value.setHours(12, 0, 0, 0);
	return value;
}

export const calendarDateSchema = z
	.object({
		year: z.number().int().min(1).max(9999),
		month: z.number().int().min(1).max(12),
		day: z.number().int().min(1).max(31),
	})
	.refine(
		(date) => isExists(date.year, date.month - 1, date.day),
		"Invalid calendar date",
	);

export const saturdaySchema = calendarDateSchema.refine(
	(date) => isSaturday(toDate(date)),
	"Choose a Saturday",
);

export function parseDateInput(value: unknown): CalendarDate | null {
	const result = z.iso.date().safeParse(value);
	return result.success ? fromDate(parseISO(result.data)) : null;
}

export const toIsoDate = (date: CalendarDate): string =>
	format(toDate(date), "yyyy-MM-dd");
export const compactDate = (date: CalendarDate): string =>
	format(toDate(date), "M/d");
export const shortDate = (date: CalendarDate): string =>
	format(toDate(date), "MMM d");

export function compactDateRange(
	start: CalendarDate,
	end: CalendarDate,
): string {
	const last = isSameMonth(toDate(start), toDate(end))
		? format(toDate(end), "d")
		: compactDate(end);
	return `${compactDate(start)}–${last}`;
}

export const isCalendarDateBefore = (
	start: CalendarDate,
	end: CalendarDate,
): boolean => isBefore(toDate(start), toDate(end));

export function nextSaturday(today = new Date()): CalendarDate {
	return fromDate(addDays(today, (6 - getDay(today) + 7) % 7));
}

export function tripDates(
	week: number,
	firstSaturday: CalendarDate,
	departure: Departure,
	returnDay: ReturnDay,
) {
	const saturday = addDays(toDate(firstSaturday), week * 7);
	return {
		depart: fromDate(addDays(saturday, departure === "friday" ? -1 : 0)),
		returnDate: fromDate(addDays(saturday, returnDay === "sunday" ? 1 : 2)),
	};
}
