import { Decimal } from 'decimal'

Decimal.config({
	precision: 20,
	rounding: Decimal.ROUND_HALF_UP,
	toExpNeg: -9e15,
	toExpPos: 9e15,
})

export function minus(x: Decimal.Value, y: Decimal.Value): number {
	return new Decimal(x).minus(y).toNumber()
}

export function sum(x: Decimal.Value, y: Decimal.Value): number {
	return new Decimal(x).plus(y).toNumber()
}

export function multiply(x: Decimal.Value, y: Decimal.Value): number {
	return new Decimal(x).mul(y).toNumber()
}

export function divide(x: Decimal.Value, y: Decimal.Value): number {
	return new Decimal(x).div(y).toNumber()
}

export function parseDecimal(x: Decimal.Value, decimal: number = 8): number {
	return new Decimal(x).toDecimalPlaces(decimal).toNumber()
}

export function toFixed(x: Decimal.Value, decimal: number = 8): string {
	return new Decimal(x).toFixed(decimal)
}

export function countDecimalPlaces(x: Decimal.Value): number {
	const decimal = new Decimal(x)
	if (decimal.isInteger()) return 0

	const str = decimal.toString()
	const decimalIndex = str.indexOf('.')
	return decimalIndex === -1 ? 0 : str.length - decimalIndex - 1
}

export function abs(x: Decimal.Value): number {
	return new Decimal(x).abs().toNumber()
}

export function max(...values: Decimal.Value[]): number {
	return Decimal.max(...values).toNumber()
}

export function min(...values: Decimal.Value[]): number {
	return Decimal.min(...values).toNumber()
}

export function isEqual(x: Decimal.Value, y: Decimal.Value): boolean {
	return new Decimal(x).equals(y)
}

export function isGreater(x: Decimal.Value, y: Decimal.Value): boolean {
	return new Decimal(x).greaterThan(y)
}

export function isLess(x: Decimal.Value, y: Decimal.Value): boolean {
	return new Decimal(x).lessThan(y)
}

export function round(x: Decimal.Value, decimal: number = 0): number {
	return new Decimal(x).toDecimalPlaces(decimal).toNumber()
}
