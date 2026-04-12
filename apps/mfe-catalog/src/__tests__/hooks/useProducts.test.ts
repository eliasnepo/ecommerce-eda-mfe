import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { delay, graphql, HttpResponse } from 'msw'
import { createElement } from 'react'
import type { PropsWithChildren } from 'react'
import { describe, expect, it } from 'vitest'
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
})
