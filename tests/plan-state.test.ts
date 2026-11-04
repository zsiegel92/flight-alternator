import assert from "node:assert/strict";
import test from "node:test";
import { initialPlan, type Plan, planParser } from "../src/plan-state.ts";

const plan: Plan = {
	...initialPlan,
	people: [
		{ ...initialPlan.people[0], name: "Zoë", symbol: "ℤ" },
		{ ...initialPlan.people[1], name: "Estrella ⭐️", city: "São Paulo" },
	],
	firstSaturday: { year: 2026, month: 11, day: 7 },
};

test("share links use URL-safe text and preserve Unicode and every field", () => {
	const encoded = planParser.serialize(plan);
	assert.match(encoded, /^[A-Za-z0-9_-]+$/);
	assert.equal(
		new URLSearchParams({ plan: encoded }).toString(),
		`plan=${encoded}`,
	);
	assert.deepEqual(planParser.parse(encoded), plan);
});

test("old JSON links still load, while malformed plans are rejected", () => {
	assert.deepEqual(planParser.parse(JSON.stringify(plan)), plan);
	assert.equal(planParser.parse("not-a-plan"), null);
	assert.equal(planParser.parse(JSON.stringify({ ...plan, people: [] })), null);
});
