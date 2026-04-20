import type { Currency } from '../hooks/useExchangeRates'

interface Props {
  value: Currency
  onChange: (c: Currency) => void
}

const OPTIONS: { value: Currency; label: string }[] = [
  { value: 'GBP', label: 'GBP (£)' },
  { value: 'USD', label: 'USD ($)' },
  { value: 'INR', label: 'INR (₹)' },
]

export function CurrencySelector({ value, onChange }: Props) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as Currency)}
      className="text-sm rounded-md border border-border bg-background px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-accent cursor-pointer"
    >
      {OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  )
}
