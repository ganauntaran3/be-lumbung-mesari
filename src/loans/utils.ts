/**
 * Rounds up an amount to the nearest 500 or 1,000 IDR
 *
 * Logic:
 * - If remainder = 0 or 500: No rounding needed
 * - If remainder < 500: Round UP to next 500
 * - If remainder > 500: Round UP to next 1,000
 *
 * @param amount - The amount to round
 * @returns The rounded amount
 *
 * @example
 * roundUpToNearest500Or1000(20500) // 20500 (already at 500)
 * roundUpToNearest500Or1000(25000) // 25000 (already at 1000)
 * roundUpToNearest500Or1000(15425) // 15500 (< 500, round to 500)
 * roundUpToNearest500Or1000(22345) // 22500 (< 500, round to 500)
 * roundUpToNearest500Or1000(15675) // 16000 (> 500, round to 1000)
 * roundUpToNearest500Or1000(15888) // 16000 (> 500, round to 1000)
 */
export function roundUpToNearest500Or1000(amount: number): number {
  const remainder = amount % 1000

  if (remainder === 0 || remainder === 500) {
    return amount // Already at 1000 or 500, no rounding needed
  } else if (remainder < 500) {
    return amount + (500 - remainder) // Round UP to next 500
  } else {
    // remainder > 500
    return amount + (1000 - remainder) // Round UP to next 1000
  }
}
