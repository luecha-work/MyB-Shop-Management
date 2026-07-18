// ==========================================
// GP Commission Rates (ค่าธรรมเนียม GP ตามช่องทางขาย)
// Business rules:
//   Cash (หน้าร้าน) = 0%
//   Grab            = 21.6%
//   LINE MAN        = 32.1%
// ==========================================

/** GP commission rate as a decimal (0 = 0%, 0.216 = 21.6%) */
export const GP_RATE: Record<string, number> = {
  'Cash (เงินสด)': 0,
  'Grab': 0.216,
  'LINE MAN': 0.321,
}

/** GP commission rate as a display percentage string */
export const GP_RATE_PERCENT: Record<string, string> = {
  'Cash (เงินสด)': '0%',
  'Grab': '21.6%',
  'LINE MAN': '32.1%',
}

/** Convert a channel name to its GP rate (decimal). Returns 0 for unknown channels. */
export const gpRateForChannel = (channel: string | null | undefined): number => {
  if (!channel) return 0
  return GP_RATE[channel] ?? 0
}

/**
 * Normalize a GP rate value from the database.
 * DB may store gp_percent as whole number (21.6 → 21.6%) or decimal (0.216 → 21.6%).
 * Always returns a decimal in 0–1 range.
 * Values > 1 are treated as whole percentages and divided by 100.
 */
export const normalizeGpRate = (value: unknown): number => {
  const rate = Number(value)
  if (!Number.isFinite(rate) || rate < 0) return 0
  return rate > 1 ? rate / 100 : rate
}

/**
 * Calculate financial values for a single sale line item.
 * All return values are rounded to 2 decimal places.
 */
export const computeSaleLine = (
  unitPrice: number,
  unitCost: number,
  qty: number,
  gpRateDecimal: number,
): {
  totalSales: number
  gpAmount: number
  netRevenue: number
  totalCost: number
  netProfit: number
} => {
  const totalSales = unitPrice * qty
  const gpAmount = totalSales * gpRateDecimal
  const netRevenue = totalSales - gpAmount
  const totalCost = unitCost * qty
  const netProfit = netRevenue - totalCost

  return {
    totalSales: Math.round(totalSales * 100) / 100,
    gpAmount: Math.round(gpAmount * 100) / 100,
    netRevenue: Math.round(netRevenue * 100) / 100,
    totalCost: Math.round(totalCost * 100) / 100,
    netProfit: Math.round(netProfit * 100) / 100,
  }
}
