import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { graphql, HttpResponse } from 'msw'
import { createElement } from 'react'
import type { PropsWithChildren } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { useProduct } from '../../hooks/useProduct'
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

describe('useProduct', () => {
  it('returns product data for id=prod-1', async () => {
    const queryClient = createTestQueryClient()

    const { result } = renderHook(() => useProduct('prod-1'), {
      wrapper: createWrapper(queryClient),
    })

    await waitFor(() => {
      expect(result.current.data?.product?.id).toBe('prod-1')
    })
  })

  it('returns null for unknown product id', async () => {
    const queryClient = createTestQueryClient()

    const { result } = renderHook(() => useProduct('prod-404'), {
      wrapper: createWrapper(queryClient),
    })

    await waitFor(() => {
      expect(result.current.data?.product).toBeNull()
    })
  })

  it('does not fire query when id is empty string', async () => {
    const requestSpy = vi.fn()

    server.use(
      graphql.query('Product', () => {
        requestSpy()
        return HttpResponse.json({ data: { product: null } })
      }),
    )

    const queryClient = createTestQueryClient()

    const { result } = renderHook(() => useProduct(''), {
      wrapper: createWrapper(queryClient),
    })

    await waitFor(() => {
      expect(result.current.fetchStatus).toBe('idle')
    })

    expect(requestSpy).not.toHaveBeenCalled()
    expect(result.current.data).toBeUndefined()
  })
})
