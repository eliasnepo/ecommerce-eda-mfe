interface Props {
  rating: number
  reviewCount?: string | number
}

export default function StarRating({ rating, reviewCount }: Props) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: 5 }).map((_, index) => {
        const filled = index + 1 <= Math.floor(rating)
        const half = !filled && index < rating

        return (
          <svg
            key={index}
            className={`h-4 w-4 ${
              filled || half ? 'text-star-filled' : 'text-star-empty'
            }`}
            viewBox="0 0 20 20"
            fill={filled || half ? 'currentColor' : 'none'}
            stroke="currentColor"
            strokeWidth={1}
            aria-hidden
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        )
      })}
      {reviewCount !== undefined && (
        <span className="text-xs text-secondary-text">({reviewCount})</span>
      )}
    </div>
  )
}
