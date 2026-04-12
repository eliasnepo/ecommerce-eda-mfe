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
      className="absolute left-0 top-full z-10 mt-1 min-w-[160px] rounded-card border border-border bg-card-bg py-1 shadow-md"
    >
      <li>
        <button
          role="option"
          aria-selected={selected === null}
          onClick={() => onSelect(null)}
          className="w-full px-3 py-2 text-left text-sm text-secondary-text hover:bg-gray-50"
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
              'w-full px-3 py-2 text-left text-sm hover:bg-gray-50',
              selected === option.value
                ? 'font-semibold text-link'
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
