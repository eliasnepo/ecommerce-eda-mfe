import { act, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Header from '../components/Header'

vi.mock('../cart/useCartStore', () => ({
  useCartStore: () => ({
    items: [
      {
        productId: 'prod-1',
        productName: 'Wireless Headphones',
        price: 199.99,
        quantity: 2,
      },
    ],
    totalItems: 2,
    subtotal: 399.98,
    currency: 'USD',
    updatedAt: '2026-04-13T00:00:00.000Z',
  }),
}))

vi.mock('../search/useSearchStore', () => ({
  useSearchStore: () => ({
    query: '',
    updatedAt: '2026-04-13T00:00:00.000Z',
  }),
  setSearchQuery: vi.fn(),
}))

function renderHeader() {
  return render(
    <MemoryRouter>
      <Header />
    </MemoryRouter>,
  )
}

describe('CartPreviewPopover', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
  })

  it('opens on focus and closes on Escape', () => {
    renderHeader()

    const cartButton = screen.getByRole('button', { name: /cart/i })
    fireEvent.focus(cartButton)
    act(() => {
      vi.advanceTimersByTime(80)
    })

    const dialog = screen.getByRole('dialog', { name: 'Cart preview' })
    expect(dialog).not.toHaveClass('hidden')
    expect(screen.getByText('Wireless Headphones')).toBeInTheDocument()

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(dialog).toHaveClass('hidden')
  })
})
