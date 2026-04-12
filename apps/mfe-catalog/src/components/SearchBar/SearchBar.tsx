import { useEffect, useState } from 'react'

interface Props {
  value: string
  onChange: (query: string) => void
  debounceMs?: number
}

export default function SearchBar({
  value,
  onChange,
  debounceMs = 300,
}: Props) {
  const [localValue, setLocalValue] = useState(value)

  useEffect(() => {
    setLocalValue(value)
  }, [value])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (localValue !== value) {
        onChange(localValue)
      }
    }, debounceMs)

    return () => clearTimeout(timer)
  }, [localValue, value, onChange, debounceMs])

  return (
    <div className="mb-4">
      <input
        type="search"
        value={localValue}
        onChange={(event) => setLocalValue(event.target.value)}
        placeholder="Search products..."
        aria-label="Search products"
        className="w-full rounded-pill border border-border bg-card-bg px-4 py-2 text-sm text-primary-text placeholder:text-secondary-text focus:outline-none focus:ring-2 focus:ring-link"
      />
    </div>
  )
}
