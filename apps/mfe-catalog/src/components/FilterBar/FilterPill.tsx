import type { ReactNode } from 'react'

interface Props {
  label: string
  active?: boolean
  onClick: () => void
  children?: ReactNode
  className?: string
}

export default function FilterPill({
  label,
  active = false,
  onClick,
  children,
  className,
}: Props) {
  return (
    <div className={["relative", className].join(' ')}>
      <button
        onClick={onClick}
        className={[
          'flex min-h-10 items-center gap-1 rounded-pill border px-4 text-sm font-medium',
          active
            ? 'border-brand-primary bg-brand-primary text-white'
            : 'border-transparent bg-[#E7E7E7] text-primary-text',
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
