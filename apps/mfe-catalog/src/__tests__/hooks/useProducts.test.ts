import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { delay, graphql, HttpResponse } from 'msw'
import { createElement } from 'react'
import type { PropsWithChildren } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { useProducts } from '../../hooks/useProducts'
import { server } from '../../test/mswServer'

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: Infinity,
      },
    },
  })
}

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: PropsWithChildren) {
    return createElement(
      QueryClientProvider,
      { client: queryClient },
      children,
    )
  }
}

describe('useProducts', () => {
  it('returns product data from GraphQL response', async () => {
    const queryClient = createTestQueryClient()

    const { result } = renderHook(() => useProducts({}, 0), {
      wrapper: createWrapper(queryClient),
    })

    await waitFor(() => {
      expect(result.current.data?.products.content).toHaveLength(1)
    })
  })

  it('isLoading is true before response resolves', async () => {
    server.use(
      graphql.query('Products', async () => {
        await delay(120)
        return HttpResponse.json({
          data: {
            products: {
              content: [
                {
                  id: 'prod-1',
                  name: 'Wireless Headphones',
                  description: 'Great sound',
                  price: 99.99,
                  category: 'Electronics',
                  imageUrl: null,
                },
              ],
              totalElements: 1,
              totalPages: 1,
              currentPage: 0,
            },
          },
        })
      }),
    )

    const queryClient = createTestQueryClient()
    const { result } = renderHook(() => useProducts({}, 0), {
      wrapper: createWrapper(queryClient),
    })

    expect(result.current.isLoading).toBe(true)

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })
  })

  it('creates separate cache entries when filter changes', async () => {
    const queryClient = createTestQueryClient()

    const { result, rerender } = renderHook(
      ({ query }) => useProducts({ query }, 0),
      {
        wrapper: createWrapper(queryClient),
        initialProps: { query: 'headphones' },
      },
    )

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    rerender({ query: 'jackets' })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    const queryKeys = queryClient
      .getQueryCache()
      .getAll()
      .map((query) => query.queryKey)

    expect(queryKeys).toEqual(
      expect.arrayContaining([
        [
          'products',
          expect.objectContaining({
            filter: expect.objectContaining({ query: 'headphones' }),
          }),
        ],
        [
          'products',
          expect.objectContaining({
            filter: expect.objectContaining({ query: 'jackets' }),
          }),
        ],
      ]),
    )
  })

  it('sends mapped sortBy value and partitions cache by sort mode', async () => {
    const requestSpy = vi.fn()

    server.use(
      graphql.query('Products', ({ variables }) => {
        requestSpy(variables)

        return HttpResponse.json({
          data: {
            products: {
              content: [
                {
                  id: 'prod-1',
                  name: 'Wireless Headphones',
                  description: 'Great sound',
                  price: 99.99,
                  category: 'Electronics',
                  imageUrl: null,
                },
              ],
              totalElements: 1,
              totalPages: 1,
              currentPage: 0,
            },
          },
        })
      }),
    )

    const queryClient = createTestQueryClient()

    const { result, rerender } = renderHook(
      ({ sortBy }: { sortBy: 'price_asc' | 'price_desc' }) =>
        useProducts({ sortBy }, 0),
      {
        wrapper: createWrapper(queryClient),
        initialProps: { sortBy: 'price_asc' },
      },
    )

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    rerender({ sortBy: 'price_desc' })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(
      requestSpy.mock.calls.some(
        ([variables]) =>
          (variables as { filter?: { sortBy?: string } })?.filter?.sortBy ===
          'PRICE_ASC',
      ),
    ).toBe(true)
    expect(
      requestSpy.mock.calls.some(
        ([variables]) =>
          (variables as { filter?: { sortBy?: string } })?.filter?.sortBy ===
          'PRICE_DESC',
      ),
    ).toBe(true)

    const queryKeys = queryClient
      .getQueryCache()
      .getAll()
      .map((query) => query.queryKey)

    expect(queryKeys).toEqual(
      expect.arrayContaining([
        [
          'products',
          expect.objectContaining({
            filter: expect.objectContaining({ sortBy: 'PRICE_ASC' }),
          }),
        ],
        [
          'products',
          expect.objectContaining({
            filter: expect.objectContaining({ sortBy: 'PRICE_DESC' }),
          }),
        ],
      ]),
    )
  })
})
