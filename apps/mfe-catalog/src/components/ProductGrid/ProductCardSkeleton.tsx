export default function ProductCardSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading product"
      className="animate-pulse overflow-hidden rounded-card bg-card-bg pb-3"
    >
      <div className="aspect-square bg-gray-200" />
      <div className="px-2.5 pt-2.5">
        <div className="mb-1 h-3 w-3/4 rounded bg-gray-200" />
        <div className="mb-1 h-3 w-1/2 rounded bg-gray-200" />
        <div className="h-4 w-1/3 rounded bg-gray-200" />
      </div>
    </div>
  )
}
