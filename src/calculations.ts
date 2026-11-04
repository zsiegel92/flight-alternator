export type Fraction = { numerator: bigint; denominator: bigint };
export type Flyer = 0 | 1;
export type Weekend = { week: number; due: Flyer[]; flyer: Flyer | null };

function gcd(a: bigint, b: bigint): bigint {
	while (b !== 0n) [a, b] = [b, a % b];
	return a;
}

export function fraction(numerator: bigint, denominator: bigint): Fraction {
	const divisor = gcd(numerator, denominator);
	return { numerator: numerator / divisor, denominator: denominator / divisor };
}

export function lcm(a: number, b: number): bigint {
	const left = BigInt(a);
	const right = BigInt(b);
	return (left / gcd(left, right)) * right;
}

export function subtract(a: Fraction, b: Fraction): Fraction {
	return fraction(
		a.numerator * b.denominator - b.numerator * a.denominator,
		a.denominator * b.denominator,
	);
}

export function toNumber(value: Fraction): number {
	return Number(value.numerator) / Number(value.denominator);
}

export function formatFraction(value: Fraction): string {
	return value.denominator === 1n
		? String(value.numerator)
		: `${value.numerator}/${value.denominator}`;
}

export function calculate(periods: [number, number], share: Fraction) {
	const cycle = lcm(periods[0], periods[1]);
	const overlapRate = fraction(1n, cycle);
	const firstRate = subtract(
		fraction(1n, BigInt(periods[0])),
		fraction(
			overlapRate.numerator * (share.denominator - share.numerator),
			overlapRate.denominator * share.denominator,
		),
	);
	const secondRate = subtract(
		fraction(1n, BigInt(periods[1])),
		fraction(
			overlapRate.numerator * share.numerator,
			overlapRate.denominator * share.denominator,
		),
	);
	const a = BigInt(periods[0]);
	const b = BigInt(periods[1]);
	const togetherRate = fraction((a + b) * cycle - a * b, a * b * cycle);

	let coincidenceNumber = 0;
	const weekends: Weekend[] = Array.from({ length: 52 }, (_, index) => {
		const week = index + 1;
		const due: Flyer[] = [];
		if (week % periods[0] === 0) due.push(0);
		if (week % periods[1] === 0) due.push(1);

		let flyer: Flyer | null = due[0] ?? null;
		if (due.length === 2) {
			coincidenceNumber += 1;
			// Spread a fractional share evenly across successive coincidences.
			const before =
				(BigInt(coincidenceNumber - 1) * share.numerator) / share.denominator;
			const after =
				(BigInt(coincidenceNumber) * share.numerator) / share.denominator;
			flyer = after > before ? 0 : 1;
		}
		return { week, due, flyer };
	});

	return {
		cycle,
		weekends,
		longRun: { flights: [firstRate, secondRate], together: togetherRate },
		year: {
			flights: [
				weekends.filter((day) => day.flyer === 0).length,
				weekends.filter((day) => day.flyer === 1).length,
			],
			together: weekends.filter((day) => day.flyer !== null).length,
			coincidences: coincidenceNumber,
		},
	};
}
