import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useProduct } from '../../hooks/useProduct'
import { formatPrice } from '../../utils/formatPrice'

const COLOR_SWATCHES = [
  { name: 'Coral', hex: '#EA6A60' },
  { name: 'Charcoal', hex: '#2E2E2E' },
  { name: 'Sage', hex: '#CAD6C8' },
  { name: 'Silver', hex: '#E5E7EB' },
  { name: 'Blue', hex: '#34587A' },
]

export default function ProductDetailPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const { data, isLoading, isError } = useProduct(id ?? '')
  const [selectedColor, setSelectedColor] = useState(COLOR_SWATCHES[0].name)
  const [quantity, setQuantity] = useState(1)
  const [activeMediaIndex, setActiveMediaIndex] = useState(0)

  if (isLoading) {
    return (
      <div className="min-h-screen bg-page-bg p-6">
        <div className="mx-auto max-w-[1320px] animate-pulse space-y-4">
          <div className="h-5 w-48 rounded bg-surface-muted" />
          <div className="grid gap-6 lg:grid-cols-[1.15fr_1fr]">
            <div className="aspect-square rounded-card bg-surface-muted" />
            <div className="space-y-4">
              <div className="h-10 w-3/4 rounded bg-surface-muted" />
              <div className="h-5 w-full rounded bg-surface-muted" />
              <div className="h-5 w-4/5 rounded bg-surface-muted" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (isError || !data?.product) {
    return (
      <div className="min-h-screen bg-page-bg p-6 text-center">
        <p className="text-secondary-text">Product not found.</p>
        <Link to=".." relative="path" className="mt-4 inline-block text-link underline">
          Back to catalog
        </Link>
      </div>
    )
  }

  const product = data.product
  const media = product.imageUrl
    ? [product.imageUrl, product.imageUrl, product.imageUrl, product.imageUrl]
    : [null, null, null, null]
  const activeMedia = media[activeMediaIndex] ?? null
  const monthlyInstallment = product.price / 6

  const handleAddToCart = () => {
    window.dispatchEvent(
      new CustomEvent('cart:add-item', {
        detail: {
          productId: product.id,
          productName: product.name,
          price: product.price,
          quantity,
        },
        bubbles: true,
      }),
    )
  }

  const handleBuyNow = () => {
    handleAddToCart()
    navigate('/cart')
  }

  return (
    <div className="min-h-screen bg-page-bg px-4 py-6">
      <div className="mx-auto w-full max-w-[1320px]">
        <nav
          aria-label="Breadcrumb"
          className="mb-5 flex flex-wrap items-center gap-2 text-sm text-secondary-text"
        >
          <Link to="/catalog" className="text-secondary-text no-underline hover:text-primary-text">
            Home
          </Link>
          <span>/</span>
          <Link to=".." relative="path" className="text-secondary-text no-underline hover:text-primary-text">
            Catalog
          </Link>
          <span>/</span>
          <span className="font-medium text-primary-text">{product.name}</span>
        </nav>

        <div className="grid gap-8 lg:grid-cols-[1.15fr_1fr]">
          <section>
            <div className="aspect-square overflow-hidden rounded-card bg-surface-muted">
              {activeMedia ? (
                <img
                  src={activeMedia}
                  alt={product.name}
                  className="h-full w-full object-contain"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-secondary-text">
                  Image preview
                </div>
              )}
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              {media.map((item, index) => (
                <button
                  key={`${product.id}-${index}`}
                  type="button"
                  onClick={() => setActiveMediaIndex(index)}
                  className={[
                    'h-24 w-24 overflow-hidden rounded-[10px] border bg-surface-muted',
                    activeMediaIndex === index ? 'border-brand-primary' : 'border-transparent',
                  ].join(' ')}
                >
                  {item ? (
                    <img
                      src={item}
                      alt={`${product.name} thumbnail ${index + 1}`}
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <span className="text-xs font-semibold text-secondary-text" aria-hidden>
                      Image
                    </span>
                  )}
                </button>
              ))}
            </div>
          </section>

          <section>
            <h1 className="m-0 text-4xl font-bold leading-tight text-primary-text md:text-5xl">
              {product.name}
            </h1>
            <p className="mt-3 text-base text-secondary-text md:text-lg">
              {product.description ?? 'Premium sound profile with rich bass and immersive clarity.'}
            </p>

            <div className="mt-3 flex items-center gap-1.5">
              {Array.from({ length: 5 }).map((_, index) => (
                <svg
                  key={index}
                  viewBox="0 0 20 20"
                  className="h-4 w-4 text-rating"
                  fill="currentColor"
                  aria-hidden
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
              <span className="ml-1 text-sm text-secondary-text">(121)</span>
            </div>

            <div className="mt-5 space-y-1">
              <p className="m-0 text-4xl font-bold text-primary-text md:text-5xl">
                {formatPrice(product.price)}
              </p>
              <p className="m-0 text-xl font-semibold text-primary-text md:text-2xl">
                or {formatPrice(monthlyInstallment)}/month
              </p>
              <p className="m-0 text-sm text-secondary-text">
                Suggested payments with 6 months special financing
              </p>
            </div>

            <div className="mt-6">
              <p className="m-0 text-sm font-semibold text-primary-text">Choose a Color</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {COLOR_SWATCHES.map((swatch) => (
                  <button
                    key={swatch.name}
                    type="button"
                    onClick={() => setSelectedColor(swatch.name)}
                    aria-label={`Choose ${swatch.name}`}
                    className={[
                      'h-9 w-9 rounded-full border-2 border-white',
                      selectedColor === swatch.name ? 'ring-2 ring-brand-primary ring-offset-2' : '',
                    ].join(' ')}
                    style={{ backgroundColor: swatch.hex }}
                  />
                ))}
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <div className="inline-flex min-h-[58px] items-center rounded-pill bg-surface-muted px-2">
                <button
                  type="button"
                  onClick={() => setQuantity((value) => Math.max(1, value - 1))}
                  className="h-11 w-11 rounded-pill text-2xl text-primary-text"
                  aria-label="Decrease quantity"
                >
                  -
                </button>
                <span className="min-w-10 text-center text-xl font-semibold text-primary-text">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity((value) => value + 1)}
                  className="h-11 w-11 rounded-pill text-2xl text-primary-text"
                  aria-label="Increase quantity"
                >
                  +
                </button>
              </div>

              <div>
                <p className="m-0 text-sm font-semibold text-orange-500">Only 12 Items Left!</p>
                <p className="m-0 text-sm text-secondary-text">Don't miss it</p>
              </div>
            </div>

            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={handleBuyNow}
                className="inline-flex min-h-[52px] items-center justify-center rounded-pill bg-accent-primary px-6 text-sm font-semibold text-white"
              >
                Buy Now
              </button>
              <button
                type="button"
                onClick={handleAddToCart}
                className="inline-flex min-h-[52px] items-center justify-center rounded-pill border-2 border-brand-primary px-6 text-sm font-semibold text-brand-primary"
              >
                Add to Cart
              </button>
            </div>

            <div className="mt-7 grid gap-3">
              <article className="rounded-card border border-border bg-card-bg p-4">
                <p className="m-0 text-sm font-semibold text-primary-text">Free Delivery</p>
                <p className="m-0 mt-1 text-sm text-secondary-text">
                  Enter your postal code for delivery availability.
                </p>
              </article>
              <article className="rounded-card border border-border bg-card-bg p-4">
                <p className="m-0 text-sm font-semibold text-primary-text">Return Delivery</p>
                <p className="m-0 mt-1 text-sm text-secondary-text">
                  Free 30 days delivery returns. Details.
                </p>
              </article>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
