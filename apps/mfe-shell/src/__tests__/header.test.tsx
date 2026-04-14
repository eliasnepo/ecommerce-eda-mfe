import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Header from '../components/Header'
import { CATALOG_SEARCH_QUERY_SET_EVENT } from '../search/searchTypes'

const setSearchQueryMock = vi.hoisted(() => vi.fn())

vi.mock('../cart/useCartStore', () => ({
  useCartStore: () => ({
    items: [
      {
        productId: 'prod-1',
        productName: 'Wireless Headphones',
        price: 199.99,
        quantity: 1,
      },
    ],
    totalItems: 1,
    subtotal: 199.99,
    currency: 'USD',
    updatedAt: '2026-04-13T00:00:00.000Z',
  }),
}))

vi.mock('../search/useSearchStore', () => ({
  useSearchStore: () => ({
    query: '',
    updatedAt: '2026-04-13T00:00:00.000Z',
  }),
  setSearchQuery: setSearchQueryMock,
}))

function renderHeader() {
  return render(
    <MemoryRouter>
      <Header />
    </MemoryRouter>,
  )
}

describe('Header', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('renders Shopcart header structure with search and cart badge', () => {
    renderHeader()

    expect(screen.getByText('Shopcart')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Categories' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Deals' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: "What's New" })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Delivery' })).toBeInTheDocument()
    expect(
      screen.getByRole('searchbox', { name: 'Search products from shell' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /account/i })).toBeInTheDocument()
    expect(screen.getByLabelText('1 items in cart')).toBeInTheDocument()
  })

  it('debounces shell search and dispatches catalog:search-query:set', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    const listener = vi.fn()
    window.addEventListener(
      CATALOG_SEARCH_QUERY_SET_EVENT,
      listener as EventListener,
    )

    renderHeader()

    const input = screen.getByRole('searchbox', {
      name: 'Search products from shell',
    })
    await user.type(input, 'headphone')

    expect(listener).not.toHaveBeenCalled()

    vi.advanceTimersByTime(280)

    expect(setSearchQueryMock).toHaveBeenCalledWith('headphone')
    expect(listener).toHaveBeenCalledTimes(1)
    expect((listener.mock.calls[0][0] as CustomEvent).detail.query).toBe('headphone')

    window.removeEventListener(
      CATALOG_SEARCH_QUERY_SET_EVENT,
      listener as EventListener,
    )
  })
})
