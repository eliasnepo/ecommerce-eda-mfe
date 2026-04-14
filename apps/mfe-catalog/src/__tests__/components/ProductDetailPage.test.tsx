import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import ProductDetailPage from '../../components/ProductDetail/ProductDetailPage'

vi.mock('../../hooks/useProduct', () => ({
  useProduct: () => ({
    data: {
      product: {
        id: 'prod-1',
        name: 'Wireless Headphones',
        description: 'Great sound',
        price: 99.99,
        category: 'Electronics',
        imageUrl: null,
      },
    },
    isLoading: false,
    isError: false,
  }),
}))

describe('ProductDetailPage', () => {
  it('renders color, quantity controls and dual CTA', () => {
    render(
      <MemoryRouter initialEntries={['/catalog/product/prod-1']}>
        <Routes>
          <Route path="/catalog/product/:id" element={<ProductDetailPage />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: 'Wireless Headphones' })).toBeInTheDocument()
    expect(screen.getByText('$99.99')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /choose coral/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /increase quantity/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Buy Now' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add to Cart' })).toBeInTheDocument()
  })

  it('dispatches add-to-cart with selected quantity', async () => {
    const user = userEvent.setup()
    const cartListener = vi.fn()
    window.addEventListener('cart:add-item', cartListener as EventListener)

    render(
      <MemoryRouter initialEntries={['/catalog/product/prod-1']}>
        <Routes>
          <Route path="/catalog/product/:id" element={<ProductDetailPage />} />
        </Routes>
      </MemoryRouter>,
    )

    await user.click(screen.getByRole('button', { name: /increase quantity/i }))
    await user.click(screen.getByRole('button', { name: /increase quantity/i }))
    await user.click(screen.getByRole('button', { name: 'Add to Cart' }))

    expect(cartListener).toHaveBeenCalledTimes(1)
    const payload = (cartListener.mock.calls[0][0] as CustomEvent).detail
    expect(payload).toMatchObject({
      productId: 'prod-1',
      quantity: 3,
    })

    window.removeEventListener('cart:add-item', cartListener as EventListener)
  })
})
