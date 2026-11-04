import assert from "node:assert/strict";
import test from "node:test";
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
			from: "Philadelphia",
			to: "Orlando",
			depart: date(27),
			returnDate: date(29),
		}),
	);
	assert.equal(url.origin, "https://www.google.com");
	assert.equal(
		url.searchParams.get("tfs"),
		"CBwQAhooEgoyMDI2LTExLTI3agwIAxIIL20vMHBseTByDAgDEggvbS8wZGNsZxooEgoyMDI2LTExLTI5agwIAxIIL20vMGRjbGdyDAgDEggvbS8wcGx5MEABSAFwAYIBCwj___________8BmAEB",
	);
	assert.equal(url.searchParams.get("tfu"), "EgYIABAAGAA");

	const reverse = new URL(
		googleFlightsUrl({
			from: "Orlando",
			to: "Philadelphia",
			depart: date(27),
			returnDate: date(29),
		}),
	);
	const raw = atob(
		(reverse.searchParams.get("tfs") ?? "")
			.replace(/-/g, "+")
			.replace(/_/g, "/"),
	);
	assert.ok(raw.indexOf("/m/0dclg") < raw.indexOf("/m/0ply0"));
	assert.ok(raw.lastIndexOf("/m/0ply0") < raw.lastIndexOf("/m/0dclg"));
});

test("nonstop round-trip link matches the supplied Orlando–Philadelphia example", () => {
	const url = new URL(
		googleFlightsUrl({
			from: "Orlando",
			to: "Philadelphia",
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
			from: "Orlando",
			to: "Philadelphia",
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
			from: "Orlando",
			to: "Philadelphia",
			depart: date(27),
			returnDate: date(29),
			outboundTime: { start: 20, end: 18 },
		}),
	);
});

test("other city names remain usable without airport codes", () => {
	const url = new URL(
		googleFlightsUrl({
			from: "Boston",
			to: "Orlando",
			depart: date(27),
			returnDate: date(29),
		}),
	);
	assert.equal(
		url.searchParams.get("q"),
		"Flights to Orlando from Boston on 2026-11-27 through 2026-11-29",
	);
	const nonstop = new URL(
		googleFlightsUrl({
			from: "Boston",
			to: "Orlando",
			depart: date(27),
			returnDate: date(29),
			nonstopOnly: true,
		}),
	);
	assert.equal(
		nonstop.searchParams.get("q"),
		"Nonstop flights to Orlando from Boston on 2026-11-27 through 2026-11-29",
	);
	assert.throws(() =>
		googleFlightsUrl({
			from: "",
			to: "Orlando",
			depart: date(27),
			returnDate: date(29),
		}),
	);
	assert.throws(() =>
		googleFlightsUrl({
			from: "Boston",
			to: "Orlando",
			depart: date(27),
			returnDate: date(29),
			nonstopOnly: "yes" as never,
		}),
	);
});
