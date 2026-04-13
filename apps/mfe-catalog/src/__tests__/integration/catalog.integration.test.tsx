import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import App from '../../App'
import { resetFilters } from '../../store/filterStore'

interface GraphqlPayload {
  operationName?: string
  variables?: {
    filter?: {
      query?: string
      category?: string
      sortBy?: string
    }
  }
}

describe('Catalog + Gateway integration', () => {
  beforeAll(async () => {
    const response = await fetch('http://localhost:8080/actuator/health')
    if (!response.ok) {
      throw new Error('API Gateway is not reachable at http://localhost:8080')
    }
  })

  it('loads products and re-queries on search/category/sort filter changes', async () => {
    resetFilters()

    const requests: GraphqlPayload[] = []
    const originalFetch = globalThis.fetch.bind(globalThis)
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url =
          typeof input === 'string'
            ? input
            : input instanceof URL
              ? input.toString()
              : input.url

        if (url.includes('/graphql') && typeof init?.body === 'string') {
          try {
            requests.push(JSON.parse(init.body) as GraphqlPayload)
          } catch {
            // ignore non-JSON bodies
          }
        }

        return originalFetch(input as RequestInfo, init)
      })

    const user = userEvent.setup()
    try {
      render(
        <MemoryRouter>
          <App />
        </MemoryRouter>,
      )

      expect(
        screen.getByRole('searchbox', { name: 'Search products' }),
      ).toBeInTheDocument()
      expect(screen.getByRole('heading', { name: 'Result' })).toBeInTheDocument()

      await waitFor(() => {
        expect(requests.some((payload) => payload.operationName === 'Products')).toBe(
          true,
        )
      })

      await waitFor(() => {
        expect(screen.getAllByRole('article').length).toBeGreaterThan(0)
      })

      const searchInput = screen.getByRole('searchbox', { name: 'Search products' })

      const requestsBeforeSearch = requests.length
      await user.clear(searchInput)
      await user.type(searchInput, 'shoe')

      await waitFor(() => {
        const freshRequests = requests.slice(requestsBeforeSearch)
        expect(
          freshRequests.some(
            (payload) =>
              payload.operationName === 'Products' &&
              payload.variables?.filter?.query === 'shoe',
          ),
        ).toBe(true)
      })

      const requestsBeforeCategory = requests.length
      await user.click(screen.getByRole('button', { name: /category/i }))
      await user.click(screen.getByRole('option', { name: 'Electronics' }))

      await waitFor(() => {
        const freshRequests = requests.slice(requestsBeforeCategory)
        expect(
          freshRequests.some(
            (payload) =>
              payload.operationName === 'Products' &&
              payload.variables?.filter?.category === 'Electronics',
          ),
        ).toBe(true)
      })

      const requestsBeforeSort = requests.length
      await user.click(screen.getByRole('button', { name: /sort/i }))
      await user.click(screen.getByRole('option', { name: 'Price: High to Low' }))

      await waitFor(() => {
        const freshRequests = requests.slice(requestsBeforeSort)
        expect(
          freshRequests.some(
            (payload) =>
              payload.operationName === 'Products' &&
              payload.variables?.filter?.sortBy === 'PRICE_DESC',
          ),
        ).toBe(true)
      })
    } finally {
      fetchSpy.mockRestore()
    }
  })

  it('dispatches cart events on card/detail and navigates to product detail', async () => {
    resetFilters()

    const cartListener = vi.fn()
    const user = userEvent.setup()

    window.addEventListener('cart:add-item', cartListener as EventListener)

    try {
      render(
        <MemoryRouter>
          <App />
        </MemoryRouter>,
      )

      await waitFor(() => {
        expect(screen.getAllByRole('article').length).toBeGreaterThan(0)
      })

      const firstCard = screen.getAllByRole('article')[0]
      const firstProductName = firstCard.getAttribute('aria-label')

      expect(firstProductName).toBeTruthy()

      const cardLink = firstCard.closest('a')
      expect(cardLink).toBeTruthy()

      const cardProductId = cardLink?.getAttribute('href')?.split('/').pop()
      expect(cardProductId).toBeTruthy()

      await user.click(within(firstCard).getByRole('button', { name: /add to cart/i }))

      expect(cartListener).toHaveBeenCalledTimes(1)
      expect((cartListener.mock.calls[0][0] as CustomEvent).detail).toMatchObject({
        productId: cardProductId,
        quantity: 1,
      })

      await user.click(cardLink as HTMLAnchorElement)

      await waitFor(() => {
        expect(
          screen.getByRole('heading', { name: firstProductName ?? '' }),
        ).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: 'Add to Cart' }))

      expect(cartListener).toHaveBeenCalledTimes(2)
      expect((cartListener.mock.calls[1][0] as CustomEvent).detail).toMatchObject({
        productId: cardProductId,
        quantity: 1,
      })
    } finally {
      window.removeEventListener('cart:add-item', cartListener as EventListener)
    }
  })
})
