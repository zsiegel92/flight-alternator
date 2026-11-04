# Flight Weekend Planner

A frontend-only React calculator for two people planning visits. There is no server, account, storage, or API request.

Enter each person's starting city. Their destination is the other person's city. Choose a Saturday for week 0, whether each person leaves Friday or Saturday, and hourly departure windows for the outbound and Sunday return flights. Flight weekends link to Google Flights with the assigned person's round-trip route and dates. Orlando and Philadelphia use city-wide searches that include nearby airports and apply the selected time and nonstop filters. Other cities use a city-name search query that requests those preferences, but Google Flights may not enforce them as filters.

## Run

```sh
pnpm install
pnpm dev
```

Use `pnpm build` to type-check and build, and `pnpm test` for the calculation tests.

## How the numbers work

Each person's flights are due on multiples of their chosen week interval, starting after week 0. On a coinciding weekend, one person flies. The fraction in the strategy control is the first person's share of those weekends; the second person receives the remainder. Actual assignments are spread across successive coincidences using cumulative rounding, so the 52-week timeline contains whole flights.

The long-run rates are exact fractions. The two flight schedules line up every least common multiple of their intervals; a fractional assignment can take several such cycles to repeat:

- First person: `1 / first interval - (1 - first share) / cycle`
- Second person: `1 / second interval - first share / cycle`
- Together: `1 / first interval + 1 / second interval - 1 / cycle`

The 52-week totals count the actual displayed weekends. Long-run annual figures multiply the exact rate by 52, so they can contain fractional flights. Cost uses one average round-trip fare per assigned flight.

## Files

- `src/App.tsx`: inputs, dashboard, and timeline
- `src/calculations.ts`: scheduling and exact fraction math
- `src/flights.ts`: calendar dates and Google Flights links
- `src/components/ui/`: shadcn components
- `tests/calculations.test.ts`: scheduling checks
- `tests/flights.test.ts`: date and route checks
