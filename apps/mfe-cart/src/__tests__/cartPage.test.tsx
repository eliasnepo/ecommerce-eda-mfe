import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import CartPage from '../pages/CartPage'

const placeOrderMock = vi.hoisted(() => vi.fn())

vi.mock('../services/checkoutClient', () => ({
  CheckoutError: class CheckoutError extends Error {},
  readCheckoutEnv: () => ({
    mode: 'mock',
    apiUrl: 'http://localhost:8080/api/orders',
    userId: '1',
  }),
  placeOrder: placeOrderMock,
}))

function renderPage() {
  return render(
    <MemoryRouter>
      <CartPage />
    </MemoryRouter>,
  )
}

describe('CartPage', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('shows empty state when no items exist', async () => {
    renderPage()

    expect(await screen.findByText('Your cart is empty')).toBeInTheDocument()
  })

  it('renders three-box checkout layout when cart has items', async () => {
    renderPage()
    await screen.findByText('Your cart is empty')

    act(() => {
      window.dispatchEvent(
        new CustomEvent('cart:state-changed', {
          detail: {
            items: [
              {
                productId: 'prod-1',
                productName: 'Mechanical Keyboard',
                price: 89.5,
                quantity: 2,
              },
            ],
            totalItems: 2,
            subtotal: 179,
            currency: 'USD',
            updatedAt: new Date().toISOString(),
          },
        }),
      )
    })

    expect(await screen.findByText('Mechanical Keyboard')).toBeInTheDocument()
    expect(screen.getAllByText('Review Item And Shipping').length).toBeGreaterThan(0)
    expect(screen.getByText('Delivery Information')).toBeInTheDocument()
    expect(screen.getByText('Order Summary')).toBeInTheDocument()
    expect(screen.getByText('Payment Details')).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Coupon code' })).toBeInTheDocument()
  })

  it('dispatches cart:remove-item when remove is clicked', async () => {
    const user = userEvent.setup()
    const removeListener = vi.fn()
    window.addEventListener('cart:remove-item', removeListener as EventListener)

    renderPage()
    await screen.findByText('Your cart is empty')

    act(() => {
      window.dispatchEvent(
        new CustomEvent('cart:state-changed', {
          detail: {
            items: [
              {
                productId: 'prod-1',
                productName: 'Mechanical Keyboard',
                price: 89.5,
                quantity: 2,
              },
            ],
            totalItems: 2,
            subtotal: 179,
            currency: 'USD',
            updatedAt: new Date().toISOString(),
          },
        }),
      )
    })

    await user.click(await screen.findByRole('button', { name: /remove/i }))

    expect(removeListener).toHaveBeenCalledTimes(1)

    window.removeEventListener('cart:remove-item', removeListener as EventListener)
  })

  it('switches payment method visibility', async () => {
    const user = userEvent.setup()

    renderPage()
    await screen.findByText('Your cart is empty')

    act(() => {
      window.dispatchEvent(
        new CustomEvent('cart:state-changed', {
          detail: {
            items: [
              {
                productId: 'prod-1',
                productName: 'Mechanical Keyboard',
                price: 89.5,
                quantity: 2,
              },
            ],
            totalItems: 2,
            subtotal: 179,
            currency: 'USD',
            updatedAt: new Date().toISOString(),
          },
        }),
      )
    })

    expect(screen.getByText('Card Holder Name*')).toBeInTheDocument()

    await user.click(screen.getByRole('radio', { name: 'Paypal' }))

    expect(screen.queryByText('Card Holder Name*')).not.toBeInTheDocument()

    await user.click(screen.getByRole('radio', { name: 'Credit or Debit card' }))

    expect(screen.getByText('Card Holder Name*')).toBeInTheDocument()
  })
})
