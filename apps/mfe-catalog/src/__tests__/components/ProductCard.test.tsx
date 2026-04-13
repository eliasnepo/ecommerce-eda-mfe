import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { MouseEvent } from 'react'
import { Link, MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import ProductCard from '../../components/ProductGrid/ProductCard'
import type { Product } from '../../types/product'

const product: Product = {
  id: 'prod-1',
  name: 'Wireless Headphones',
  description: 'Great sound',
  price: 99.99,
  category: 'Electronics',
  imageUrl: null,
}

describe('ProductCard', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders product name and formatted price', () => {
    render(<ProductCard product={product} />)

    expect(screen.getByText('Wireless Headphones')).toBeInTheDocument()
    expect(screen.getByText('$99.99')).toBeInTheDocument()
  })

  it('dispatches cart:add-item event with expected detail', async () => {
    const user = userEvent.setup()
    const handler = vi.fn()

    window.addEventListener('cart:add-item', handler as EventListener)
    render(<ProductCard product={product} />)

    await user.click(screen.getByRole('button', { name: /add to cart/i }))

    expect(handler).toHaveBeenCalledTimes(1)
    const customEvent = handler.mock.calls[0][0] as CustomEvent
    expect(customEvent.detail).toEqual({
      productId: 'prod-1',
      productName: 'Wireless Headphones',
      price: 99.99,
      quantity: 1,
    })

    window.removeEventListener('cart:add-item', handler as EventListener)
  })

  it('toggles wishlist aria-pressed on click', async () => {
    const user = userEvent.setup()
    render(<ProductCard product={product} />)

    const wishlistButton = screen.getByTestId('wishlist-prod-1')
    expect(wishlistButton).toHaveAttribute('aria-pressed', 'false')

    await user.click(wishlistButton)

    expect(wishlistButton).toHaveAttribute('aria-pressed', 'true')
  })

  it('prevents link navigation when wishlist is clicked', async () => {
    const user = userEvent.setup()
    const linkClick = vi.fn((event: MouseEvent<HTMLAnchorElement>) => {
      return event.defaultPrevented
    })

    render(
      <MemoryRouter>
        <Link to="/product/prod-1" onClick={linkClick}>
          <ProductCard product={product} />
        </Link>
      </MemoryRouter>,
    )

    await user.click(screen.getByTestId('wishlist-prod-1'))

    expect(linkClick).toHaveBeenCalledTimes(1)
    const clickEvent = linkClick.mock.calls[0][0]
    expect(clickEvent.defaultPrevented).toBe(true)
  })
})
