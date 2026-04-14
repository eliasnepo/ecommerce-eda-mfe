import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import CartPage from '../pages/CartPage'

const placeOrderMock = vi.hoisted(() => vi.fn())
const MockCheckoutError = vi.hoisted(
  () =>
    class CheckoutError extends Error {
      constructor(message: string) {
        super(message)
        this.name = 'CheckoutError'
      }
    },
)

vi.mock('../services/checkoutClient', () => ({
  CheckoutError: MockCheckoutError,
  readCheckoutEnv: () => ({
    mode: 'mock',
    apiUrl: 'http://localhost:8080/api/orders',
    userId: '1',
  }),
  placeOrder: placeOrderMock,
}))

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<CartPage />} />
        <Route path="/confirmation/:orderId" element={<div>Confirmation route</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

function dispatchPopulatedCartState() {
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
}

describe('Checkout flow', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('navigates to confirmation on successful place order', async () => {
    const user = userEvent.setup()
    const clearListener = vi.fn()
    window.addEventListener('cart:clear', clearListener as EventListener)

    placeOrderMock.mockResolvedValue({ orderId: 'ORDER-123' })
    renderPage()

    await screen.findByText('Your cart is empty')
    dispatchPopulatedCartState()

    await user.click(await screen.findByRole('button', { name: /place order/i }))

    await waitFor(() => {
      expect(screen.getByText('Confirmation route')).toBeInTheDocument()
    })
    expect(clearListener).toHaveBeenCalledTimes(1)

    window.removeEventListener('cart:clear', clearListener as EventListener)
  })

  it('shows recoverable error on checkout failure', async () => {
    const user = userEvent.setup()
    placeOrderMock.mockRejectedValue(new MockCheckoutError('Unable to place order now'))

    renderPage()

    await screen.findByText('Your cart is empty')
    dispatchPopulatedCartState()

    await user.click(await screen.findByRole('button', { name: /place order/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Unable to place order now',
    )
  })
})
