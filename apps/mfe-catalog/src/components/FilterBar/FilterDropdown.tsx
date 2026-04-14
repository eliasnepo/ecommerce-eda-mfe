interface Option {
  label: string
  value: string
}

interface Props {
  options: Option[]
  selected: string | null
  onSelect: (value: string | null) => void
}

export default function FilterDropdown({ options, selected, onSelect }: Props) {
  return (
    <ul
      role="listbox"
      className="absolute left-0 top-full z-20 mt-2 min-w-[180px] rounded-card border border-border bg-card-bg py-1 shadow-card"
    >
      <li>
        <button
          role="option"
          aria-selected={selected === null}
          onClick={() => onSelect(null)}
          className="w-full px-3 py-2 text-left text-sm text-secondary-text hover:bg-surface-muted"
        >
          All
        </button>
      </li>
      {options.map((option) => (
        <li key={option.value}>
          <button
            role="option"
            aria-selected={selected === option.value}
            onClick={() => onSelect(option.value)}
            className={[
              'w-full px-3 py-2 text-left text-sm hover:bg-surface-muted',
              selected === option.value
                ? 'font-semibold text-brand-primary'
                : 'text-primary-text',
            ].join(' ')}
          >
            {option.label}
          </button>
        </li>
      ))}
    </ul>
  )
}
