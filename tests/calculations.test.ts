import assert from 'node:assert/strict'
import test from 'node:test'
import { calculate, formatFraction, fraction } from '../src/calculations.ts'

test('one person takes every coinciding flight', () => {
  const result = calculate([3, 5], fraction(1n, 1n))
  assert.equal(result.cycle, 15n)
  assert.deepEqual(result.year.flights, [17, 7])
  assert.equal(result.year.together, 24)
  assert.equal(formatFraction(result.longRun.flights[0]), '1/3')
  assert.equal(formatFraction(result.longRun.flights[1]), '2/15')
  assert.equal(formatFraction(result.longRun.together), '7/15')
})

test('fractional shares alternate over repeated coincidences', () => {
  const result = calculate([3, 5], fraction(1n, 2n))
  assert.deepEqual(result.weekends.filter((day) => day.due.length === 2).map((day) => day.flyer), [1, 0, 1])
  assert.deepEqual(result.year.flights, [15, 9])
  assert.equal(formatFraction(result.longRun.flights[0]), '3/10')
  assert.equal(formatFraction(result.longRun.flights[1]), '1/6')
})

test('a cycle beyond the year still has a valid long-run rate', () => {
  const result = calculate([53, 59], fraction(1n, 2n))
  assert.equal(result.cycle, 3127n)
  assert.equal(result.year.together, 0)
  assert.ok(result.longRun.together.numerator > 0n)
})
