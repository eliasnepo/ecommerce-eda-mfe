import type { MouseEvent } from 'react'
import type { Product } from '../../types/product'
import { formatPrice } from '../../utils/formatPrice'
import StarRating from '../ui/StarRating'
import WishlistButton from '../ui/WishlistButton'

interface Props {
  product: Product
}

export default function ProductCard({ product }: Props) {
  const handleAddToCart = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    window.dispatchEvent(
      new CustomEvent('cart:add-item', {
        detail: {
          productId: product.id,
          productName: product.name,
          price: product.price,
          quantity: 1,
        },
        bubbles: true,
      }),
    )
  }

  return (
    <article
      aria-label={product.name}
      className="relative flex h-full flex-col overflow-hidden rounded-card bg-card-bg shadow-card"
    >
      <div className="relative aspect-square overflow-hidden rounded-card bg-surface-muted">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="block h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="h-full w-full bg-surface-muted" />
        )}
        <WishlistButton productId={product.id} />
      </div>

      <div className="flex flex-1 flex-col gap-2 px-3 pb-4 pt-3">
        <p
          title={product.name}
          className="m-0 line-clamp-2 text-base font-semibold text-primary-text"
        >
          {product.name}
        </p>
        <p className="m-0 text-sm text-secondary-text line-clamp-1">
          {product.description ?? product.category ?? 'High quality audio experience'}
        </p>
        <StarRating rating={4} reviewCount={121} />
        <p className="m-0 text-xl font-bold text-primary-text">
          {formatPrice(product.price)}
        </p>
        <button
          onClick={handleAddToCart}
          className="mt-auto w-full rounded-pill border border-brand-primary py-2 text-sm font-semibold text-brand-primary transition hover:bg-brand-primary hover:text-white"
        >
          Add to Cart
        </button>
      </div>
    </article>
  )
}
