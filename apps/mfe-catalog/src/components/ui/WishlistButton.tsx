import { useState } from 'react'

interface Props {
  productId: string
}

export default function WishlistButton({ productId }: Props) {
  const [saved, setSaved] = useState(false)

  return (
    <button
      onClick={(event) => {
        event.preventDefault()
        setSaved((value) => !value)
      }}
      aria-label={saved ? 'Remove from wishlist' : 'Add to wishlist'}
      aria-pressed={saved}
      data-testid={`wishlist-${productId}`}
      className="absolute right-2.5 top-2.5 flex h-[30px] w-[30px] items-center justify-center rounded-full bg-white/75"
    >
      <svg
        className={`h-4 w-4 ${saved ? 'text-red-500' : 'text-wishlist-icon'}`}
        viewBox="0 0 24 24"
        fill={saved ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth={1.5}
        aria-hidden
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
        />
      </svg>
    </button>
  )
}
