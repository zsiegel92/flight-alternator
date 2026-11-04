import assert from "node:assert/strict";
import test from "node:test";
import { flightLocationFor } from "../src/cities.ts";
import {
	type CalendarDate,
	calendarDateSchema,
	compactDateRange,
	nextSaturday,
	parseDateInput,
	saturdaySchema,
	toIsoDate,
	tripDates,
} from "../src/date-utils.ts";
import { googleFlightsUrl } from "../src/flights.ts";

const date = (day: number): CalendarDate => ({ year: 2026, month: 11, day });
const city = (id: string) => ({ id, kind: "city" as const });

test("flight weekends use the chosen departure and return days", () => {
	assert.deepEqual(nextSaturday(new Date(2026, 10, 3)), date(7));
	assert.deepEqual(tripDates(3, date(7), "friday", "sunday"), {
		depart: date(27),
		returnDate: date(29),
	});
	assert.deepEqual(tripDates(3, date(7), "saturday", "sunday"), {
		depart: date(28),
		returnDate: date(29),
	});
	assert.deepEqual(tripDates(3, date(7), "friday", "monday"), {
		depart: date(27),
		returnDate: date(30),
	});
	assert.deepEqual(tripDates(3, date(7), "saturday", "monday"), {
		depart: date(28),
		returnDate: date(30),
	});
	assert.equal(saturdaySchema.safeParse(date(7)).success, true);
	assert.equal(saturdaySchema.safeParse(date(6)).success, false);
});

test("date input is parsed once into a validated calendar date", () => {
	assert.deepEqual(parseDateInput("2026-11-07"), date(7));
	assert.equal(toIsoDate(date(7)), "2026-11-07");
	assert.equal(parseDateInput("2026-02-30"), null);
	assert.deepEqual(parseDateInput("2028-02-29"), {
		year: 2028,
		month: 2,
		day: 29,
	});
	assert.equal(
		calendarDateSchema.safeParse({ year: 2026, month: 2, day: 30 }).success,
		false,
	);
	assert.equal(
		compactDateRange(
			{ year: 2026, month: 5, day: 22 },
			{ year: 2026, month: 5, day: 23 },
		),
		"5/22–23",
	);
	assert.equal(
		compactDateRange(
			{ year: 2026, month: 5, day: 31 },
			{ year: 2026, month: 6, day: 1 },
		),
		"5/31–6/1",
	);
	assert.deepEqual(
		tripDates(1, { year: 2026, month: 12, day: 26 }, "friday", "monday"),
		{
			depart: { year: 2027, month: 1, day: 1 },
			returnDate: { year: 2027, month: 1, day: 4 },
		},
	);
});

test("city-wide round-trip link matches the supplied Philadelphia–Orlando example", () => {
	const url = new URL(
		googleFlightsUrl({
			origin: city("/m/0dclg"),
			destination: city("/m/0ply0"),
			depart: date(27),
			returnDate: date(29),
		}),
	);
	assert.equal(url.origin, "https://www.google.com");
	assert.equal(
		url.searchParams.get("tfs"),
		"CBwQAhooEgoyMDI2LTExLTI3agwIAxIIL20vMGRjbGdyDAgDEggvbS8wcGx5MBooEgoyMDI2LTExLTI5agwIAxIIL20vMHBseTByDAgDEggvbS8wZGNsZ0ABSAFwAYIBCwj___________8BmAEB",
	);
	assert.equal(url.searchParams.get("tfu"), "EgYIABAAGAA");

	const reverse = new URL(
		googleFlightsUrl({
			origin: city("/m/0ply0"),
			destination: city("/m/0dclg"),
			depart: date(27),
			returnDate: date(29),
		}),
	);
	const raw = atob(
		(reverse.searchParams.get("tfs") ?? "")
			.replace(/-/g, "+")
			.replace(/_/g, "/"),
	);
	assert.ok(raw.indexOf("/m/0ply0") < raw.indexOf("/m/0dclg"));
	assert.ok(raw.lastIndexOf("/m/0dclg") < raw.lastIndexOf("/m/0ply0"));
});

test("nonstop round-trip link matches the supplied Philadelphia–Orlando example", () => {
	const url = new URL(
		googleFlightsUrl({
			origin: city("/m/0dclg"),
			destination: city("/m/0ply0"),
			depart: date(27),
			returnDate: date(29),
			nonstopOnly: true,
		}),
	);
	assert.equal(
		url.searchParams.get("tfs"),
		"CBwQAhoqEgoyMDI2LTExLTI3KABqDAgDEggvbS8wZGNsZ3IMCAMSCC9tLzBwbHkwGioSCjIwMjYtMTEtMjkoAGoMCAMSCC9tLzBwbHkwcgwIAxIIL20vMGRjbGdAAUgBcAGCAQsI____________AZgBAQ",
	);
	assert.equal(url.searchParams.get("tfu"), "EgYIABAAGAA");
});

test("round-trip time filters match the supplied Google Flights example", () => {
	const url = new URL(
		googleFlightsUrl({
			origin: city("/m/0dclg"),
			destination: city("/m/0ply0"),
			depart: date(27),
			returnDate: date(29),
			nonstopOnly: true,
			outboundTime: { start: 18, end: 20 },
			returnTime: { start: 17, end: 22 },
		}),
	);
	assert.equal(
		url.searchParams.get("tfs"),
		"CBwQAhoyEgoyMDI2LTExLTI3KABAEkgUUABYF2oMCAMSCC9tLzBkY2xncgwIAxIIL20vMHBseTAaMhIKMjAyNi0xMS0yOSgAQBFIFlAAWBdqDAgDEggvbS8wcGx5MHIMCAMSCC9tLzBkY2xnQAFIAXABggELCP___________wGYAQE",
	);
	assert.throws(() =>
		googleFlightsUrl({
			origin: city("/m/0dclg"),
			destination: city("/m/0ply0"),
			depart: date(27),
			returnDate: date(29),
			outboundTime: { start: 20, end: 18 },
		}),
	);
});

test("Seattle–New York round trip matches the supplied city-wide link", () => {
	const url = new URL(
		googleFlightsUrl({
			origin: flightLocationFor("Seattle") ?? city(""),
			destination: flightLocationFor("New York") ?? city(""),
			depart: date(7),
			returnDate: date(8),
		}),
	);
	assert.equal(
		url.searchParams.get("tfs"),
		"CBwQAhopEgoyMDI2LTExLTA3agwIAxIIL20vMGQ5anJyDQgDEgkvbS8wMl8yODYaKRIKMjAyNi0xMS0wOGoNCAMSCS9tLzAyXzI4NnIMCAMSCC9tLzBkOWpyQAFIAXABggELCP___________wGYAQE",
	);
	assert.equal(url.searchParams.get("q"), null);
	assert.throws(() =>
		googleFlightsUrl({
			origin: city(""),
			destination: city("/m/0ply0"),
			depart: date(27),
			returnDate: date(29),
		}),
	);
	assert.throws(() =>
		googleFlightsUrl({
			origin: city("/m/0d9jr"),
			destination: city("/m/0ply0"),
			depart: date(27),
			returnDate: date(29),
			nonstopOnly: "yes" as never,
		}),
	);
});
