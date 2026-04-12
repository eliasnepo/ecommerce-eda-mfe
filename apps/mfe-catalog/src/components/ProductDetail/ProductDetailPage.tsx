import { Link, useParams } from 'react-router-dom'
import { useProduct } from '../../hooks/useProduct'

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data, isLoading, isError } = useProduct(id ?? '')

  if (isLoading) {
    return (
      <div className="min-h-screen bg-page-bg p-6">
        <div className="mx-auto max-w-3xl animate-pulse space-y-4">
          <div className="aspect-square max-w-md rounded-card bg-gray-200" />
          <div className="h-6 w-2/3 rounded bg-gray-200" />
          <div className="h-4 w-full rounded bg-gray-200" />
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

  const handleAddToCart = () => {
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
    <div className="min-h-screen bg-page-bg px-4 py-6">
      <div className="mx-auto w-full max-w-[1120px]">
        <Link
          to=".."
          relative="path"
          className="mb-4 inline-flex items-center gap-1 text-sm text-link"
        >
          Back to catalog
        </Link>

        <div className="mx-auto max-w-3xl">
          <div className="overflow-hidden rounded-card bg-card-bg p-6">
            <div className="flex flex-col gap-6 md:flex-row">
              {product.imageUrl ? (
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className="h-64 w-full rounded-card object-cover md:w-64"
                />
              ) : (
                <div className="h-64 w-full rounded-card bg-gray-100 md:w-64" />
              )}

              <div className="flex-1">
                <p className="mb-1 text-xs uppercase tracking-wide text-secondary-text">
                  {product.category ?? 'Uncategorized'}
                </p>
                <h1 className="mb-3 text-2xl font-bold text-primary-text">
                  {product.name}
                </h1>
                <p className="mb-4 text-sm text-secondary-text">
                  {product.description ?? 'No description provided.'}
                </p>
                <p className="mb-6 text-3xl font-bold text-primary-text">
                  {product.price.toFixed(2)}{' '}
                  <sup className="text-lg font-normal">AED</sup>
                </p>
                <button
                  onClick={handleAddToCart}
                  className="rounded-pill bg-link px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  Add to Cart
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
