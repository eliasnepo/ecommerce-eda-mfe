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
      className="relative overflow-hidden rounded-card bg-card-bg pb-3"
    >
      <div className="relative aspect-square bg-gray-100">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="h-full w-full bg-gray-100" />
        )}
        <WishlistButton productId={product.id} />
      </div>

      <div className="px-2.5 pt-2.5">
        <p className="mb-1 line-clamp-2 text-[13px] font-medium text-primary-text">
          {product.name}
        </p>
        <StarRating rating={4} reviewCount="-" />
        <p className="mt-1 text-[15px] font-bold text-primary-text">
          {formatPrice(product.price)}
        </p>
        <button
          onClick={handleAddToCart}
          className="mt-2 w-full rounded-pill border border-border py-1 text-xs text-primary-text hover:bg-gray-50"
        >
          Add to cart
        </button>
      </div>
    </article>
  )
}
