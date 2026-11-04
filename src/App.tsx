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
import { Checkbox } from "@/components/ui/checkbox";
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
	type CalendarDate,
	compactDate,
	compactDateRange,
	type Departure,
	departureSchema,
	nextSaturday,
	parseDateInput,
	type ReturnDay,
	returnDaySchema,
	saturdaySchema,
	shortDate,
	toIsoDate,
	tripDates,
} from "./date-utils";
import {
	citySchema,
	googleFlightsUrl,
	type TimeWindow,
	timeWindowSchema,
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
	city: citySchema,
	departure: departureSchema,
	returnDay: returnDaySchema,
	times: z.object({
		friday: timeWindowSchema,
		saturday: timeWindowSchema,
		sunday: timeWindowSchema,
		monday: timeWindowSchema,
	}),
});
const formSchema = z
	.object({
		people: z.tuple([personSchema, personSchema]),
		firstSaturday: saturdaySchema,
		nonstopOnly: z.boolean(),
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
	departure: Departure;
	returnDay: ReturnDay;
	times: FlightTimes;
};
type FlightTimes = Record<Departure | ReturnDay, TimeWindow>;
type Draft = {
	people: [PersonDraft, PersonDraft];
	firstSaturday: CalendarDate | null;
	nonstopOnly: boolean;
	numerator: string;
	denominator: string;
	cost: string;
};
type Person = z.infer<typeof personSchema>;

function defaultTimes(): FlightTimes {
	return {
		friday: { start: 18, end: 23 },
		saturday: { start: 6, end: 11 },
		sunday: { start: 18, end: 23 },
		monday: { start: 4, end: 6 },
	};
}

const initialDraft: Draft = {
	people: [
		{
			name: "Zach",
			symbol: "ℤ",
			every: "3",
			city: "Orlando",
			departure: "friday",
			returnDay: "sunday",
			times: defaultTimes(),
		},
		{
			name: "Estrella",
			symbol: "⭐️",
			every: "5",
			city: "Philadelphia",
			departure: "saturday",
			returnDay: "sunday",
			times: defaultTimes(),
		},
	],
	firstSaturday: nextSaturday(),
	nonstopOnly: true,
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

const sliderWindowSchema = z
	.tuple([z.number().int(), z.number().int()])
	.transform(([start, end]) => ({ start, end }))
	.pipe(timeWindowSchema);

function hourLabel(hour: number): string {
	return `${hour % 12 || 12}:00 ${hour < 12 ? "am" : "pm"}`;
}

function compactWindow(window: TimeWindow): string {
	const start = window.start % 12 || 12;
	const end = window.end % 12 || 12;
	const startPeriod = window.start < 12 ? "am" : "pm";
	const endPeriod = window.end < 12 ? "am" : "pm";
	return startPeriod === endPeriod
		? `${start}–${end} ${endPeriod}`
		: `${start} ${startPeriod}–${end} ${endPeriod}`;
}

function FlightLeg({
	from,
	to,
	day,
	date,
	window,
}: {
	from: string;
	to: string;
	day: Departure | ReturnDay;
	date: CalendarDate;
	window: TimeWindow;
}) {
	const shortDay = `${day[0].toUpperCase()}${day.slice(1, 3)}`;
	return (
		<div className="min-w-0 border-t border-foreground/10 pt-1 first:border-0 first:pt-0">
			<div className="break-words text-[10px] font-medium leading-3">
				{from} → {to}
			</div>
			<div className="text-[9px] leading-3 text-muted-foreground">
				{shortDay} {compactDate(date)} · {compactWindow(window)}
			</div>
		</div>
	);
}

function TimeWindowFields({
	id,
	title,
	value,
	onChange,
}: {
	id: string;
	title: string;
	value: TimeWindow;
	onChange: (window: TimeWindow) => void;
}) {
	return (
		<div className="space-y-3">
			<div className="flex items-baseline justify-between gap-2 text-sm">
				<p className="font-medium" id={`${id}-label`}>
					{title}
				</p>
				<span className="tabular-nums">
					{hourLabel(value.start)}–{hourLabel(value.end)}
				</span>
			</div>
			<Slider
				aria-labelledby={`${id}-label`}
				className="py-2"
				min={0}
				max={23}
				step={1}
				minStepsBetweenValues={1}
				thumbCollisionBehavior="none"
				thumbLabels={[`${title} from`, `${title} to`]}
				formatThumbValue={hourLabel}
				value={[value.start, value.end]}
				onValueChange={(raw) => {
					const window = sliderWindowSchema.safeParse(raw);
					if (window.success) onChange(window.data);
				}}
			/>
		</div>
	);
}

function PersonFields({
	person,
	index,
	onChange,
	onTimeChange,
}: {
	person: PersonDraft;
	index: 0 | 1;
	onChange: (
		index: 0 | 1,
		field: Exclude<keyof PersonDraft, "times">,
		value: string,
	) => void;
	onTimeChange: (
		index: 0 | 1,
		day: keyof FlightTimes,
		window: TimeWindow,
	) => void;
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
			<div className="space-y-2">
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
			<div className="grid grid-cols-2 gap-2">
				<div className="space-y-2">
					<p className="text-sm font-medium">Depart</p>
					<div className="flex flex-wrap gap-1">
						{(["friday", "saturday"] as const).map((day) => (
							<Button
								key={day}
								type="button"
								size="xs"
								variant={person.departure === day ? "default" : "outline"}
								aria-pressed={person.departure === day}
								onClick={() => onChange(index, "departure", day)}
							>
								{day === "friday" ? "Friday" : "Saturday"}
							</Button>
						))}
					</div>
				</div>
				<div className="space-y-2">
					<p className="text-sm font-medium">Return</p>
					<div className="flex flex-wrap gap-1">
						{(["sunday", "monday"] as const).map((day) => (
							<Button
								key={day}
								type="button"
								size="xs"
								variant={person.returnDay === day ? "default" : "outline"}
								aria-pressed={person.returnDay === day}
								onClick={() => onChange(index, "returnDay", day)}
							>
								{day === "sunday" ? "Sunday" : "Monday"}
							</Button>
						))}
					</div>
				</div>
			</div>
			<TimeWindowFields
				id={`depart-${index}`}
				title="Depart between"
				value={person.times[person.departure]}
				onChange={(window) => onTimeChange(index, person.departure, window)}
			/>
			<TimeWindowFields
				id={`return-${index}`}
				title="Return between"
				value={person.times[person.returnDay]}
				onChange={(window) => onTimeChange(index, person.returnDay, window)}
			/>
			<p className="text-xs text-muted-foreground">
				Local departure times at each airport.
			</p>
		</div>
	);
}

function Timeline({
	weekends,
	cycle,
	people,
	firstSaturday,
	nonstopOnly,
}: {
	weekends: Weekend[];
	cycle: bigint;
	people: [Person, Person];
	firstSaturday: CalendarDate;
	nonstopOnly: boolean;
}) {
	const names = [people[0].name, people[1].name];
	const symbols = [people[0].symbol, people[1].symbol];
	return (
		<Card>
			<CardHeader>
				<CardTitle>52-week timeline</CardTitle>
				<CardDescription>
					Week 0 starts on {shortDate(firstSaturday)}. Select a flight cell to
					open its round-trip search.
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
							? tripDates(
									day.week,
									firstSaturday,
									person.departure,
									person.returnDay,
								)
							: null;
						const weekendDates = tripDates(
							day.week,
							firstSaturday,
							"saturday",
							"sunday",
						);
						const title = coincidence
							? `Week ${day.week}: both planned to fly; ${names[day.flyer ?? 0]} flies`
							: day.flyer === null
								? `Week ${day.week}: no flight`
								: `Week ${day.week}: ${names[day.flyer]} flies`;
						const border = inFirstCycle ? "border-sky-300" : "border-border";
						if (!person || !destination || !dates) {
							return (
								<div
									key={day.week}
									title={title}
									className={`min-h-28 min-w-0 rounded-lg border ${border} bg-muted/30 p-1.5 text-center`}
								>
									<div className="flex items-center justify-between gap-1 text-[9px] text-muted-foreground">
										<span>#{day.week}</span>
										<span className="tabular-nums">
											{compactDateRange(
												weekendDates.depart,
												weekendDates.returnDate,
											)}
										</span>
									</div>
									<div className="flex min-h-20 items-center justify-center text-xl text-muted-foreground">
										·
									</div>
								</div>
							);
						}
						const outboundTime = person.times[person.departure];
						const returnTime = person.times[person.returnDay];
						return (
							<a
								key={day.week}
								title={title}
								className={`group block min-h-28 min-w-0 rounded-lg border ${border} ${coincidence ? "bg-amber-50" : day.flyer === 0 ? "bg-sky-50" : "bg-violet-50"} p-1.5 text-center text-foreground transition hover:border-primary hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
								href={googleFlightsUrl({
									from: person.city,
									to: destination.city,
									depart: dates.depart,
									returnDate: dates.returnDate,
									nonstopOnly,
									outboundTime,
									returnTime,
								})}
								target="_blank"
								rel="noopener noreferrer"
								aria-label={`${title}. ${person.city} to ${destination.city}, ${toIsoDate(dates.depart)}, ${hourLabel(outboundTime.start)} to ${hourLabel(outboundTime.end)}. ${destination.city} to ${person.city}, ${toIsoDate(dates.returnDate)}, ${hourLabel(returnTime.start)} to ${hourLabel(returnTime.end)}.${nonstopOnly ? " Nonstop only." : ""} Open Google Flights.`}
							>
								<div className="flex items-center justify-between gap-1 text-[9px] text-muted-foreground">
									<span>#{day.week}</span>
									<span
										aria-hidden="true"
										className="text-sm leading-3 text-primary"
									>
										↗
									</span>
								</div>
								{coincidence ? (
									<>
										<div className="text-sm leading-4">
											{symbols[0]} ✦ {symbols[1]}
										</div>
										<div className="text-[9px] font-medium leading-3">
											{symbols[day.flyer ?? 0]} flies
										</div>
									</>
								) : (
									<div className="text-lg leading-5">{person.symbol}</div>
								)}
								<div className="mt-1 space-y-1 text-left">
									<FlightLeg
										from={person.city}
										to={destination.city}
										day={person.departure}
										date={dates.depart}
										window={outboundTime}
									/>
									<FlightLeg
										from={destination.city}
										to={person.city}
										day={person.returnDay}
										date={dates.returnDate}
										window={returnTime}
									/>
									{nonstopOnly && (
										<Badge
											variant="outline"
											className="h-4 rounded-sm border-emerald-300 bg-emerald-50 px-1 text-[9px] leading-none text-emerald-800"
										>
											● Nonstop
										</Badge>
									)}
								</div>
							</a>
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

	function updatePerson(
		index: 0 | 1,
		field: Exclude<keyof PersonDraft, "times">,
		value: string,
	) {
		setDraft((current) => {
			const people: [PersonDraft, PersonDraft] = [
				{ ...current.people[0] },
				{ ...current.people[1] },
			];
			people[index] = { ...people[index], [field]: value };
			return { ...current, people };
		});
	}

	function updateTime(
		index: 0 | 1,
		day: keyof FlightTimes,
		window: TimeWindow,
	) {
		setDraft((current) => {
			const people: [PersonDraft, PersonDraft] = [
				{ ...current.people[0] },
				{ ...current.people[1] },
			];
			const times = { ...people[index].times };
			times[day] = window;
			people[index] = { ...people[index], times };
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
								city is the destination.
							</CardDescription>
						</CardHeader>
						<CardContent className="grid gap-3 sm:grid-cols-2">
							<PersonFields
								person={draft.people[0]}
								index={0}
								onChange={updatePerson}
								onTimeChange={updateTime}
							/>
							<PersonFields
								person={draft.people[1]}
								index={1}
								onChange={updatePerson}
								onTimeChange={updateTime}
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
									max={4}
									step={1}
									value={[Math.round(secondShare * 4)]}
									onValueChange={(raw) => {
										const value = z
											.number()
											.int()
											.min(0)
											.max(4)
											.safeParse(Array.isArray(raw) ? raw[0] : raw);
										if (value.success)
											setDraft((current) => ({
												...current,
												numerator: String(4 - value.data),
												denominator: "4",
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
										value={
											draft.firstSaturday ? toIsoDate(draft.firstSaturday) : ""
										}
										onChange={(event) => {
											const date = parseDateInput(event.currentTarget.value);
											setDraft((current) => ({
												...current,
												firstSaturday: date,
											}));
										}}
									/>
								</div>
								<div className="flex items-center gap-2">
									<Checkbox
										id="nonstop-only"
										checked={draft.nonstopOnly}
										onCheckedChange={(checked) => {
											const result = z.boolean().safeParse(checked);
											if (result.success)
												setDraft((current) => ({
													...current,
													nonstopOnly: result.data,
												}));
										}}
									/>
									<Label htmlFor="nonstop-only">Nonstop only</Label>
								</div>
								<p className="break-words text-sm">
									{draft.people[0].city} ↔ {draft.people[1].city}
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
									Use a Saturday for week 0, a city for each person, positive
									whole numbers for weeks and the denominator, a share between 0
									and 1, and a nonnegative cost.
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
					nonstopOnly={valid.nonstopOnly}
				/>
			)}
		</main>
	);
}

export default App;
