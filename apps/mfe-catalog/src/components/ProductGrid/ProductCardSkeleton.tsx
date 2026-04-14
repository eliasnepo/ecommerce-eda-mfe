export default function ProductCardSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading product"
      className="animate-pulse overflow-hidden rounded-card bg-card-bg shadow-card"
    >
      <div className="aspect-square bg-surface-muted" />
      <div className="space-y-2 px-3 pb-4 pt-3">
        <div className="h-4 w-3/4 rounded bg-surface-muted" />
        <div className="h-4 w-1/2 rounded bg-surface-muted" />
        <div className="h-5 w-1/3 rounded bg-surface-muted" />
      </div>
    </div>
  )
}
