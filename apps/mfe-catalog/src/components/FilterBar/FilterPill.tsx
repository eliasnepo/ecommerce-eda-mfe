import type { ReactNode } from 'react'

interface Props {
  label: string
  active?: boolean
  onClick: () => void
  children?: ReactNode
}

export default function FilterPill({
  label,
  active = false,
  onClick,
  children,
}: Props) {
  return (
    <div className="relative">
      <button
        onClick={onClick}
        className={[
          'flex items-center gap-1 rounded-pill border px-3.5 py-1.5 text-sm',
          active
            ? 'border-link bg-link text-white'
            : 'border-border bg-card-bg text-primary-text',
        ].join(' ')}
      >
        {label}
        <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" aria-hidden>
          <path
            d="M4 6l4 4 4-4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </button>
      {children}
    </div>
  )
}
