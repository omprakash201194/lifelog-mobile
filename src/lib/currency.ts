// Copied from web app frontend/src/lib/currency.ts — zero changes required

export interface CurrencyOption {
  code:   string
  label:  string
  symbol: string
  locale: string
}

export const CURRENCIES: CurrencyOption[] = [
  { code: 'GBP', label: 'British Pound',   symbol: '£', locale: 'en-GB' },
  { code: 'USD', label: 'US Dollar',        symbol: '$', locale: 'en-US' },
  { code: 'EUR', label: 'Euro',             symbol: '€', locale: 'de-DE' },
  { code: 'INR', label: 'Indian Rupee',     symbol: '₹', locale: 'en-IN' },
  { code: 'JPY', label: 'Japanese Yen',     symbol: '¥', locale: 'ja-JP' },
  { code: 'AUD', label: 'Australian Dollar',symbol: 'A$',locale: 'en-AU' },
  { code: 'CAD', label: 'Canadian Dollar',  symbol: 'C$',locale: 'en-CA' },
  { code: 'CHF', label: 'Swiss Franc',      symbol: '₣', locale: 'de-CH' },
  { code: 'SGD', label: 'Singapore Dollar', symbol: 'S$',locale: 'en-SG' },
]

export function getCurrencySymbol(code: string): string {
  return CURRENCIES.find(c => c.code === code)?.symbol ?? code
}

export async function fetchExchangeRates(base: string): Promise<Record<string, number>> {
  const res = await fetch(`https://api.frankfurter.app/latest?from=${base}`)
  if (!res.ok) throw new Error('Failed to fetch exchange rates')
  const data = await res.json() as { rates: Record<string, number> }
  return data.rates
}

export function formatCurrency(amount: number, code: string, compact = false): string {
  const opt = CURRENCIES.find(c => c.code === code)
  const sym = opt?.symbol ?? code
  const locale = opt?.locale ?? 'en-GB'
  if (compact) {
    if (Math.abs(amount) >= 1_000_000) return `${sym}${(amount / 1_000_000).toFixed(1)}m`
    if (Math.abs(amount) >= 1_000)     return `${sym}${(amount / 1_000).toFixed(0)}k`
  }
  return new Intl.NumberFormat(locale, { style: 'currency', currency: code, minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount)
}
