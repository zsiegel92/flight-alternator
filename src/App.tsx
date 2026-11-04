import { type ChangeEvent, useState } from "react";
import { z } from "zod";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import {
	calculate,
	type Fraction,
	formatFraction,
	fraction,
	toNumber,
	type Weekend,
} from "./calculations";
import {
	airportSchema,
	type Departure,
	departureSchema,
	googleFlightsUrl,
	nextSaturday,
	saturdaySchema,
	shortDate,
	tripDates,
} from "./flights";

const positiveInteger = z
	.string()
	.regex(/^[1-9]\d*$/, "Enter a positive whole number")
	.transform(Number)
	.pipe(z.number().safe());
const wholeNumber = z
	.string()
	.regex(/^\d+$/, "Enter a whole number")
	.transform(Number)
	.pipe(z.number().safe());
const money = z
	.string()
	.regex(/^\d+(?:\.\d{0,2})?$/, "Enter a valid amount")
	.transform(Number)
	.pipe(z.number().finite());
const personSchema = z.object({
	name: z.string().trim().min(1).max(40),
	symbol: z.string().trim().min(1).max(20),
	every: positiveInteger,
	city: z.string().trim().min(1).max(60),
	airport: airportSchema,
	departure: departureSchema,
});
const formSchema = z
	.object({
		people: z.tuple([personSchema, personSchema]),
		firstSaturday: saturdaySchema,
		numerator: wholeNumber,
		denominator: positiveInteger,
		cost: money,
	})
	.refine((value) => value.numerator <= value.denominator, {
		path: ["numerator"],
		message: "The share cannot exceed the denominator",
	});

type PersonDraft = {
	name: string;
	symbol: string;
	every: string;
	city: string;
	airport: string;
	departure: Departure;
};
type Draft = {
	people: [PersonDraft, PersonDraft];
	firstSaturday: string;
	numerator: string;
	denominator: string;
	cost: string;
};
type Person = z.infer<typeof personSchema>;

const initialDraft: Draft = {
	people: [
		{
			name: "Zach",
			symbol: "ℤ",
			every: "3",
			city: "Orlando",
			airport: "MCO",
			departure: "friday",
		},
		{
			name: "Estrella",
			symbol: "⭐️",
			every: "5",
			city: "Philadelphia",
			airport: "PHL",
			departure: "saturday",
		},
	],
	firstSaturday: nextSaturday(),
	numerator: "1",
	denominator: "1",
	cost: "250",
};

function eventText(event: ChangeEvent<HTMLInputElement>): string | null {
	const result = z.string().safeParse(event.currentTarget.value);
	return result.success ? result.data : null;
}

function percent(value: number): string {
	return `${Math.round(value * 100)}%`;
}

function flights(value: number): string {
	return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function currency(value: number): string {
	return value.toLocaleString(undefined, {
		style: "currency",
		currency: "USD",
		maximumFractionDigits: 0,
	});
}

function PersonFields({
	person,
	index,
	onChange,
}: {
	person: PersonDraft;
	index: 0 | 1;
	onChange: (index: 0 | 1, field: keyof PersonDraft, value: string) => void;
}) {
	return (
		<div className="min-w-0 space-y-3 rounded-xl border p-3">
			<div className="grid grid-cols-[minmax(0,1fr)_4rem] gap-2">
				<div className="min-w-0 space-y-2">
					<Label htmlFor={`name-${index}`}>Name</Label>
					<Input
						id={`name-${index}`}
						value={person.name}
						maxLength={40}
						onChange={(event) => {
							const value = eventText(event);
							if (value !== null) onChange(index, "name", value);
						}}
					/>
				</div>
				<div className="min-w-0 space-y-2">
					<Label htmlFor={`symbol-${index}`}>Symbol</Label>
					<Input
						id={`symbol-${index}`}
						value={person.symbol}
						maxLength={20}
						className="text-center text-xl"
						onChange={(event) => {
							const value = eventText(event);
							if (value !== null) onChange(index, "symbol", value);
						}}
					/>
				</div>
			</div>
			<div className="space-y-2">
				<Label htmlFor={`every-${index}`}>Every ... weeks</Label>
				<Input
					id={`every-${index}`}
					value={person.every}
					type="number"
					min="1"
					step="1"
					inputMode="numeric"
					onChange={(event) => {
						const value = eventText(event);
						if (value !== null) onChange(index, "every", value);
					}}
				/>
			</div>
			<div className="grid grid-cols-[minmax(0,1fr)_4.5rem] gap-2">
				<div className="min-w-0 space-y-2">
					<Label htmlFor={`city-${index}`}>Starting city</Label>
					<Input
						id={`city-${index}`}
						value={person.city}
						maxLength={60}
						onChange={(event) => {
							const value = eventText(event);
							if (value !== null) onChange(index, "city", value);
						}}
					/>
				</div>
				<div className="min-w-0 space-y-2">
					<Label htmlFor={`airport-${index}`}>Airport</Label>
					<Input
						id={`airport-${index}`}
						value={person.airport}
						maxLength={3}
						autoCapitalize="characters"
						className="uppercase"
						onChange={(event) => {
							const value = eventText(event);
							if (value !== null) onChange(index, "airport", value);
						}}
					/>
				</div>
			</div>
			<div className="space-y-2">
				<Label>Leaves for the visit</Label>
				<div className="flex flex-wrap gap-1">
					<Button
						type="button"
						size="xs"
						variant={person.departure === "friday" ? "default" : "outline"}
						aria-pressed={person.departure === "friday"}
						onClick={() => onChange(index, "departure", "friday")}
					>
						Friday night
					</Button>
					<Button
						type="button"
						size="xs"
						variant={person.departure === "saturday" ? "default" : "outline"}
						aria-pressed={person.departure === "saturday"}
						onClick={() => onChange(index, "departure", "saturday")}
					>
						Saturday morning
					</Button>
				</div>
				<p className="text-xs text-muted-foreground">Returns Sunday evening.</p>
			</div>
		</div>
	);
}

function Timeline({
	weekends,
	cycle,
	people,
	firstSaturday,
}: {
	weekends: Weekend[];
	cycle: bigint;
	people: [Person, Person];
	firstSaturday: string;
}) {
	const names = [people[0].name, people[1].name];
	const symbols = [people[0].symbol, people[1].symbol];
	return (
		<Card>
			<CardHeader>
				<CardTitle>52-week timeline</CardTitle>
				<CardDescription>
					Week 0 starts on {shortDate(firstSaturday)}. Links set the route and
					dates; choose morning or evening time filters in Google Flights.
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
					<Badge variant="secondary">
						0 · {shortDate(firstSaturday)} start
					</Badge>
					<span>Highlighted border = first flight-schedule cycle</span>
					<span>·</span>
					<span>✦ = both planned to fly</span>
				</div>
				<div className="grid grid-cols-4 gap-2 sm:grid-cols-7 lg:grid-cols-13">
					{weekends.map((day) => {
						const coincidence = day.due.length === 2;
						const inFirstCycle = BigInt(day.week) <= cycle;
						const person = day.flyer === null ? null : people[day.flyer];
						const destination =
							day.flyer === null ? null : people[day.flyer === 0 ? 1 : 0];
						const dates = person
							? tripDates(day.week, firstSaturday, person.departure)
							: null;
						const saturday = tripDates(
							day.week,
							firstSaturday,
							"saturday",
						).depart;
						const title = coincidence
							? `Week ${day.week}: both planned to fly; ${names[day.flyer ?? 0]} flies`
							: day.flyer === null
								? `Week ${day.week}: no flight`
								: `Week ${day.week}: ${names[day.flyer]} flies`;
						return (
							<div
								key={day.week}
								title={title}
								aria-label={title}
								className={`relative min-h-28 rounded-lg border p-2 text-center ${inFirstCycle ? "border-sky-300" : "border-border"} ${coincidence ? "bg-amber-50" : day.flyer === 0 ? "bg-sky-50" : day.flyer === 1 ? "bg-violet-50" : "bg-muted/30"}`}
							>
								<div className="text-[11px] text-muted-foreground">
									{day.week}
								</div>
								{coincidence ? (
									<>
										<div className="text-sm leading-5">
											{symbols[0]} ✦ {symbols[1]}
										</div>
										<div className="text-[11px] font-medium">
											{symbols[day.flyer ?? 0]} flies
										</div>
									</>
								) : (
									<div className="pt-1 text-xl">
										{day.flyer === null ? "·" : symbols[day.flyer]}
									</div>
								)}
								<div className="mt-1 text-[10px] text-muted-foreground">
									{dates
										? `${shortDate(dates.depart)}–${shortDate(dates.returnDate)}`
										: shortDate(saturday)}
								</div>
								{person && destination && dates && (
									<a
										className="text-[11px] font-medium text-primary underline underline-offset-2 hover:text-primary/70"
										href={googleFlightsUrl({
											from: person.airport,
											to: destination.airport,
											depart: dates.depart,
											returnDate: dates.returnDate,
										})}
										target="_blank"
										rel="noopener noreferrer"
										aria-label={`Find ${person.name}'s round-trip flights from ${person.city} to ${destination.city}, ${dates.depart} to ${dates.returnDate}`}
									>
										Find flights ↗
									</a>
								)}
							</div>
						);
					})}
				</div>
				<div className="text-sm text-muted-foreground">
					{cycle <= 52n ? (
						<>
							The flight schedules first line up again at week{" "}
							<strong className="text-foreground">{String(cycle)}</strong>. The
							plans repeat; shared weekends keep following the chosen split.
						</>
					) : (
						<>
							The flight schedules first line up again at week{" "}
							<strong className="text-foreground">
								{cycle.toLocaleString()}
							</strong>
							.{" "}
							<span className="ml-1 inline-block rounded-md border border-dashed bg-muted px-2 py-1">
								… week {cycle.toLocaleString()} · first shared-flight weekend
							</span>
						</>
					)}
				</div>
			</CardContent>
		</Card>
	);
}

function Rate({
	label,
	value,
	color,
}: {
	label: string;
	value: Fraction;
	color: string;
}) {
	return (
		<div className="flex items-center justify-between gap-3 py-2 text-sm">
			<span className="flex items-center gap-2">
				<span className={`size-2 rounded-full ${color}`} />
				{label}
			</span>
			<span className="text-right">
				<strong>{formatFraction(value)}</strong> weekends{" "}
				<span className="text-muted-foreground">
					({percent(toNumber(value))})
				</span>
			</span>
		</div>
	);
}

function App() {
	const [draft, setDraft] = useState<Draft>(initialDraft);
	const parsed = formSchema.safeParse(draft);
	const valid = parsed.success ? parsed.data : null;
	const share = valid
		? fraction(BigInt(valid.numerator), BigInt(valid.denominator))
		: null;
	const result =
		valid && share
			? calculate([valid.people[0].every, valid.people[1].every], share)
			: null;
	const names: [string, string] = valid
		? [valid.people[0].name, valid.people[1].name]
		: [draft.people[0].name, draft.people[1].name];
	const symbols: [string, string] = valid
		? [valid.people[0].symbol, valid.people[1].symbol]
		: [draft.people[0].symbol, draft.people[1].symbol];
	const firstShare = share ? toNumber(share) : 0.5;
	const secondShare = 1 - firstShare;

	function updatePerson(index: 0 | 1, field: keyof PersonDraft, value: string) {
		setDraft((current) => {
			const people: [PersonDraft, PersonDraft] = [
				{ ...current.people[0] },
				{ ...current.people[1] },
			];
			people[index] = { ...people[index], [field]: value };
			return { ...current, people };
		});
	}

	return (
		<main className="mx-auto max-w-7xl space-y-6 px-4 py-10 sm:px-6">
			<header className="space-y-2">
				<h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
					Make the weekends count.
				</h1>
			</header>

			<div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
				<div className="space-y-6">
					<Card>
						<CardHeader>
							<CardTitle>People & plans</CardTitle>
							<CardDescription>
								Each person flies every set number of weeks. The other person's
								city is the destination. Use three-letter airport codes for
								flight links.
							</CardDescription>
						</CardHeader>
						<CardContent className="grid gap-3 sm:grid-cols-2">
							<PersonFields
								person={draft.people[0]}
								index={0}
								onChange={updatePerson}
							/>
							<PersonFields
								person={draft.people[1]}
								index={1}
								onChange={updatePerson}
							/>
							<div className="space-y-3 border-t pt-4 sm:col-span-2">
								<h2 className="text-sm font-medium">Coinciding strategy</h2>
								<div className="flex items-center justify-between text-sm font-medium">
									<span>
										{symbols[0]} {names[0]} · {percent(firstShare)}
									</span>
									<span>
										{symbols[1]} {names[1]} · {percent(secondShare)}
									</span>
								</div>
								<Slider
									aria-label={`Coinciding flights: left for ${names[0]}, right for ${names[1]}`}
									min={0}
									max={100}
									step={1}
									value={[Math.round(secondShare * 100)]}
									onValueChange={(raw) => {
										const value = z
											.number()
											.int()
											.min(0)
											.max(100)
											.safeParse(Array.isArray(raw) ? raw[0] : raw);
										if (value.success)
											setDraft((current) => ({
												...current,
												numerator: String(100 - value.data),
												denominator: "100",
											}));
									}}
								/>
								<div className="flex flex-wrap items-end gap-3">
									<div className="space-y-2">
										<Label htmlFor="numerator">{names[0]}’s share</Label>
										<div className="flex items-center gap-2">
											<Input
												id="numerator"
												className="w-20"
												type="number"
												min="0"
												step="1"
												value={draft.numerator}
												onChange={(event) => {
													const value = eventText(event);
													if (value !== null)
														setDraft((current) => ({
															...current,
															numerator: value,
														}));
												}}
											/>
											<span>/</span>
											<Input
												aria-label="Share denominator"
												className="w-20"
												type="number"
												min="1"
												step="1"
												value={draft.denominator}
												onChange={(event) => {
													const value = eventText(event);
													if (value !== null)
														setDraft((current) => ({
															...current,
															denominator: value,
														}));
												}}
											/>
										</div>
									</div>
									<Button
										variant="outline"
										type="button"
										onClick={() =>
											setDraft((current) => ({
												...current,
												numerator: "1",
												denominator: "2",
											}))
										}
									>
										Reset to ½
									</Button>
								</div>
								<p className="text-xs text-muted-foreground">
									When plans coincide, one person flies. Slide toward the person
									who should take more of those flights.
								</p>
							</div>
						</CardContent>
					</Card>

					<div className="grid gap-3 sm:grid-cols-2">
						<Card className="min-w-0">
							<CardHeader>
								<CardTitle>Start Date</CardTitle>
							</CardHeader>
							<CardContent className="space-y-3">
								<div className="space-y-2">
									<Label htmlFor="first-saturday">Week 0 Saturday</Label>
									<Input
										id="first-saturday"
										className="max-w-52"
										type="date"
										value={draft.firstSaturday}
										onChange={(event) => {
											const value = eventText(event);
											if (value !== null)
												setDraft((current) => ({
													...current,
													firstSaturday: value,
												}));
										}}
									/>
								</div>
								<p className="break-words text-sm">
									{draft.people[0].city} (
									{draft.people[0].airport.toUpperCase()}) ↔{" "}
									{draft.people[1].city} (
									{draft.people[1].airport.toUpperCase()})
								</p>
							</CardContent>
						</Card>

						<Card className="min-w-0">
							<CardHeader>
								<CardTitle>Flight cost</CardTitle>
								<CardDescription>
									Average price for one person’s round-trip flight.
								</CardDescription>
							</CardHeader>
							<CardContent className="space-y-2">
								<Label htmlFor="cost">Cost per flight</Label>
								<div className="relative max-w-52">
									<span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
										$
									</span>
									<Input
										id="cost"
										className="pl-7"
										type="number"
										min="0"
										step="0.01"
										value={draft.cost}
										onChange={(event) => {
											const value = eventText(event);
											if (value !== null)
												setDraft((current) => ({ ...current, cost: value }));
										}}
									/>
								</div>
							</CardContent>
						</Card>
					</div>
				</div>

				<div className="space-y-6">
					{!result || !valid || !share ? (
						<Card>
							<CardHeader>
								<CardTitle>Check the inputs</CardTitle>
								<CardDescription>
									Use a Saturday for week 0, a city and three-letter airport
									code for each person, positive whole numbers for weeks and the
									denominator, a share between 0 and 1, and a nonnegative cost.
								</CardDescription>
							</CardHeader>
						</Card>
					) : (
						<>
							<div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
								<Card size="sm">
									<CardHeader>
										<CardDescription>Weekends together</CardDescription>
										<CardTitle className="text-2xl">
											{result.year.together}{" "}
											<span className="text-base font-normal text-muted-foreground">
												/ 52
											</span>
										</CardTitle>
									</CardHeader>
									<CardContent className="text-sm text-muted-foreground">
										{percent(result.year.together / 52)} of this year
									</CardContent>
								</Card>
								<Card size="sm">
									<CardHeader>
										<CardDescription>Total flights</CardDescription>
										<CardTitle className="text-2xl">
											{result.year.together}
										</CardTitle>
									</CardHeader>
									<CardContent className="text-sm text-muted-foreground">
										{result.year.flights[0]} + {result.year.flights[1]} this
										year
									</CardContent>
								</Card>
								<Card size="sm" className="lg:col-span-2 xl:col-span-1">
									<CardHeader>
										<CardDescription>Total flight cost</CardDescription>
										<CardTitle className="text-2xl">
											{currency(result.year.together * valid.cost)}
										</CardTitle>
									</CardHeader>
									<CardContent className="text-sm text-muted-foreground">
										{currency(valid.cost)} × {result.year.together} flights
									</CardContent>
								</Card>
							</div>

							<Card>
								<CardHeader>
									<CardTitle>What that means</CardTitle>
									<CardDescription>
										Actual assignments in the next 52 weekends, then the
										repeating long-run average.
									</CardDescription>
								</CardHeader>
								<CardContent className="space-y-4">
									<div>
										<div className="mb-2 font-medium">Next 52 weekends</div>
										<div className="grid gap-2 sm:grid-cols-2">
											<div className="rounded-lg bg-sky-50 p-3">
												<span>
													{symbols[0]} {names[0]}
												</span>
												<div className="text-xl font-semibold">
													{result.year.flights[0]} flights
												</div>
											</div>
											<div className="rounded-lg bg-violet-50 p-3">
												<span>
													{symbols[1]} {names[1]}
												</span>
												<div className="text-xl font-semibold">
													{result.year.flights[1]} flights
												</div>
											</div>
										</div>
										<p className="mt-2 text-sm text-muted-foreground">
											Together {result.year.together}/52 weekends (
											{percent(result.year.together / 52)}).{" "}
											{result.year.coincidences} coinciding{" "}
											{result.year.coincidences === 1 ? "weekend" : "weekends"}.
										</p>
									</div>
									<Separator />
									<div>
										<div className="mb-1 font-medium">
											Repeating long-run average
										</div>
										<Rate
											label={`${symbols[0]} ${names[0]} flies`}
											value={result.longRun.flights[0]}
											color="bg-sky-500"
										/>
										<Rate
											label={`${symbols[1]} ${names[1]} flies`}
											value={result.longRun.flights[1]}
											color="bg-violet-500"
										/>
										<Rate
											label="Weekends together"
											value={result.longRun.together}
											color="bg-amber-500"
										/>
										<p className="mt-2 text-sm text-muted-foreground">
											Equivalent to{" "}
											{flights(toNumber(result.longRun.together) * 52)} weekends
											and flights per 52 weeks, costing about{" "}
											{currency(
												toNumber(result.longRun.together) * 52 * valid.cost,
											)}
											. These are averages, so fractional flights are possible
											here.
										</p>
									</div>
								</CardContent>
							</Card>
						</>
					)}
				</div>
			</div>
			{result && valid && (
				<Timeline
					weekends={result.weekends}
					cycle={result.cycle}
					people={valid.people}
					firstSaturday={valid.firstSaturday}
				/>
			)}
		</main>
	);
}

export default App;
