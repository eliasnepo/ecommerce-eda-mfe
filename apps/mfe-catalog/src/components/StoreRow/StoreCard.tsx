import type { Store } from '../../types/product'
import StarRating from '../ui/StarRating'

interface Props {
  store: Store
}

export default function StoreCard({ store }: Props) {
  return (
    <div className="flex min-w-[220px] items-center gap-3 rounded-card bg-card-bg p-3">
      <div className="h-12 w-12 flex-shrink-0 rounded-full bg-gray-100" />
      <div>
        <p className="text-[15px] font-semibold text-primary-text">{store.name}</p>
        <StarRating rating={store.rating} reviewCount={store.reviewCount} />
        <a href="#" className="text-[13px] text-primary-text underline">
          Visit shop
        </a>
      </div>
    </div>
  )
}
