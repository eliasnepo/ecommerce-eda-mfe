import axios from 'axios'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  CheckoutError,
  placeOrder,
  type CheckoutEnv,
} from '../services/checkoutClient'

vi.mock('axios')

const mockedAxios = vi.mocked(axios, { deep: true })

describe('checkoutClient', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns synthetic order id in mock mode', async () => {
    const env: CheckoutEnv = {
      mode: 'mock',
      apiUrl: 'http://localhost:8080/api/orders',
      userId: '1',
    }

    const response = await placeOrder(
      {
        userId: '1',
        items: [],
      },
      env,
    )

    expect(response.orderId).toMatch(/^MOCK-/)
  })

  it('posts payload in gateway mode', async () => {
    mockedAxios.post.mockResolvedValue({
      data: {
        orderId: 'ORDER-123',
      },
    })

    const env: CheckoutEnv = {
      mode: 'gateway',
      apiUrl: 'http://localhost:8080/api/orders',
      userId: '1',
    }

    const response = await placeOrder(
      {
        userId: '1',
        items: [
          {
            productId: 'prod-1',
            productName: 'Keyboard',
            price: 50,
            quantity: 2,
          },
        ],
      },
      env,
    )

    expect(response.orderId).toBe('ORDER-123')
    expect(mockedAxios.post).toHaveBeenCalledWith(
      'http://localhost:8080/api/orders',
      {
        userId: '1',
        items: [
          {
            productId: 'prod-1',
            productName: 'Keyboard',
            price: 50,
            quantity: 2,
          },
        ],
      },
    )
  })

  it('throws typed error in gateway failure', async () => {
    mockedAxios.post.mockRejectedValue(new Error('network failure'))

    const env: CheckoutEnv = {
      mode: 'gateway',
      apiUrl: 'http://localhost:8080/api/orders',
      userId: '1',
    }

    await expect(
      placeOrder(
        {
          userId: '1',
          items: [],
        },
        env,
      ),
    ).rejects.toBeInstanceOf(CheckoutError)
  })
})
