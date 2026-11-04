import assert from 'node:assert/strict'
import test from 'node:test'
import { googleFlightsUrl, nextSaturday, saturdaySchema, tripDates } from '../src/flights.ts'

test('flight weekends use the chosen departure day and Sunday return', () => {
  assert.equal(nextSaturday(new Date(2026, 10, 3)), '2026-11-07')
  assert.deepEqual(tripDates(3, '2026-11-07', 'friday'), { depart: '2026-11-27', returnDate: '2026-11-29' })
  assert.deepEqual(tripDates(3, '2026-11-07', 'saturday'), { depart: '2026-11-28', returnDate: '2026-11-29' })
  assert.equal(saturdaySchema.safeParse('2026-11-07').success, true)
  assert.equal(saturdaySchema.safeParse('2026-11-06').success, false)
})

test('round-trip link encodes the assigned travel direction and dates', () => {
  const url = new URL(googleFlightsUrl({ from: 'phl', to: 'mco', depart: '2026-12-18', returnDate: '2026-12-20' }))
  assert.equal(url.origin, 'https://www.google.com')
  const tfs = url.searchParams.get('tfs') ?? ''
  const padded = tfs.replace(/-/g, '+').replace(/_/g, '/')
  const data = atob(padded)
  assert.ok(data.indexOf('2026-12-18') < data.indexOf('PHL'))
  assert.ok(data.indexOf('PHL') < data.indexOf('MCO'))
  assert.ok(data.indexOf('MCO') < data.indexOf('2026-12-20'))
  assert.ok(data.lastIndexOf('MCO') < data.lastIndexOf('PHL'))
  assert.throws(() => googleFlightsUrl({ from: 'Philadelphia', to: 'MCO', depart: '2026-12-18', returnDate: '2026-12-20' }))
})
