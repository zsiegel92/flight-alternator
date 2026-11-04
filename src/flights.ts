import { z } from 'zod'

export const departureSchema = z.enum(['friday', 'saturday'])
export const airportSchema = z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/, 'Use a three-letter airport code')
export const saturdaySchema = z.iso.date().refine((value) => new Date(`${value}T12:00:00Z`).getUTCDay() === 6, 'Choose a Saturday')

export type Departure = z.infer<typeof departureSchema>

export function nextSaturday(today = new Date()): string {
  const daysUntilSaturday = (6 - today.getDay() + 7) % 7
  const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() + daysUntilSaturday)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function addDays(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T12:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

export function tripDates(week: number, firstSaturday: string, departure: Departure) {
  const saturday = addDays(firstSaturday, week * 7)
  return {
    depart: addDays(saturday, departure === 'friday' ? -1 : 0),
    returnDate: addDays(saturday, 1),
  }
}

export function shortDate(isoDate: string): string {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
    .format(new Date(`${isoDate}T12:00:00Z`))
}

const searchSchema = z.object({
  from: airportSchema,
  to: airportSchema,
  depart: z.iso.date(),
  returnDate: z.iso.date(),
}).refine((trip) => trip.depart < trip.returnDate)

// The tfs encoding follows the round-trip example in scratch/gflights.md.
export function googleFlightsUrl(input: { from: string; to: string; depart: string; returnDate: string }): string {
  const { from, to, depart, returnDate } = searchSchema.parse(input)
  const encoder = new TextEncoder()
  const varint = (number: number): number[] => {
    const output: number[] = []
    do {
      output.push((number & 127) | (number > 127 ? 128 : 0))
      number = Math.floor(number / 128)
    } while (number)
    return output
  }
  const numberField = (field: number, value: number) => [...varint(field * 8), ...varint(value)]
  const bytes = (field: number, value: string | number[]) => {
    const data = typeof value === 'string' ? [...encoder.encode(value)] : value
    return [...varint(field * 8 + 2), ...varint(data.length), ...data]
  }
  const airport = (code: string) => bytes(2, code)
  const leg = (date: string, origin: string, destination: string) => bytes(3, [
    ...bytes(2, date),
    ...bytes(13, airport(origin)),
    ...bytes(14, airport(destination)),
  ])
  const data = [
    ...numberField(1, 28), ...numberField(2, 2),
    ...leg(depart, from, to), ...leg(returnDate, to, from),
    ...numberField(8, 1), ...numberField(9, 1),
    ...numberField(14, 1), ...numberField(19, 1),
  ]
  const tfs = btoa(String.fromCharCode(...data))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  return `https://www.google.com/travel/flights/search?tfs=${tfs}`
}
