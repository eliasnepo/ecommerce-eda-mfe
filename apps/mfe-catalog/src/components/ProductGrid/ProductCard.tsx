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
      className="relative flex h-full flex-col overflow-hidden rounded-card bg-card-bg pb-3"
    >
      <div className="relative h-48 overflow-hidden bg-gray-100">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="block h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="h-full w-full bg-gray-100" />
        )}
        <WishlistButton productId={product.id} />
      </div>

      <div className="flex flex-1 flex-col px-2.5 pt-2.5">
        <p
          title={product.name}
          className="mb-1 truncate text-[13px] font-medium text-primary-text"
        >
          {product.name}
        </p>
        <StarRating rating={4} reviewCount="-" />
        <p className="mt-1 text-[15px] font-bold text-primary-text">
          {formatPrice(product.price)}
        </p>
        <button
          onClick={handleAddToCart}
          className="mt-auto w-full rounded-pill border border-border py-1 text-xs text-primary-text hover:bg-gray-50"
        >
          Add to cart
        </button>
      </div>
    </article>
  )
}
