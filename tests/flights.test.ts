import assert from "node:assert/strict";
import test from "node:test";
import {
	googleFlightsUrl,
	nextSaturday,
	saturdaySchema,
	tripDates,
} from "../src/flights.ts";

test("flight weekends use the chosen departure and return days", () => {
	assert.equal(nextSaturday(new Date(2026, 10, 3)), "2026-11-07");
	assert.deepEqual(tripDates(3, "2026-11-07", "friday", "sunday"), {
		depart: "2026-11-27",
		returnDate: "2026-11-29",
	});
	assert.deepEqual(tripDates(3, "2026-11-07", "saturday", "sunday"), {
		depart: "2026-11-28",
		returnDate: "2026-11-29",
	});
	assert.deepEqual(tripDates(3, "2026-11-07", "friday", "monday"), {
		depart: "2026-11-27",
		returnDate: "2026-11-30",
	});
	assert.deepEqual(tripDates(3, "2026-11-07", "saturday", "monday"), {
		depart: "2026-11-28",
		returnDate: "2026-11-30",
	});
	assert.equal(saturdaySchema.safeParse("2026-11-07").success, true);
	assert.equal(saturdaySchema.safeParse("2026-11-06").success, false);
});

test("city-wide round-trip link matches the supplied Philadelphia–Orlando example", () => {
	const url = new URL(
		googleFlightsUrl({
			from: "Philadelphia",
			to: "Orlando",
			depart: "2026-11-27",
			returnDate: "2026-11-29",
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
			depart: "2026-11-27",
			returnDate: "2026-11-29",
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
			depart: "2026-11-27",
			returnDate: "2026-11-29",
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
			depart: "2026-11-27",
			returnDate: "2026-11-29",
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
			depart: "2026-11-27",
			returnDate: "2026-11-29",
			outboundTime: { start: 20, end: 18 },
		}),
	);
});

test("other city names remain usable without airport codes", () => {
	const url = new URL(
		googleFlightsUrl({
			from: "Boston",
			to: "Orlando",
			depart: "2026-11-27",
			returnDate: "2026-11-29",
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
			depart: "2026-11-27",
			returnDate: "2026-11-29",
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
			depart: "2026-11-27",
			returnDate: "2026-11-29",
		}),
	);
	assert.throws(() =>
		googleFlightsUrl({
			from: "Boston",
			to: "Orlando",
			depart: "2026-11-27",
			returnDate: "2026-11-29",
			nonstopOnly: "yes" as never,
		}),
	);
});
