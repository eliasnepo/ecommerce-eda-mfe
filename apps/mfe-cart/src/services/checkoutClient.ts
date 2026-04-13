import axios, { AxiosError } from 'axios'
import type {
  CheckoutOrderInput,
  CheckoutOrderResponse,
} from '../types/cart'

export interface CheckoutEnv {
  mode: 'mock' | 'gateway'
  apiUrl: string
  userId: string
}

export class CheckoutError extends Error {
  constructor(
    message: string,
    public readonly code: 'ORDER_SUBMISSION_FAILED',
    public readonly status?: number,
  ) {
    super(message)
    this.name = 'CheckoutError'
  }
}

export function readCheckoutEnv(): CheckoutEnv {
  const mode =
    typeof __ORDER_API_MODE__ === 'string' && __ORDER_API_MODE__ === 'gateway'
      ? 'gateway'
      : 'mock'
  const apiUrl =
    typeof __ORDER_API_URL__ === 'string' && __ORDER_API_URL__.length > 0
      ? __ORDER_API_URL__
      : 'http://localhost:8080/api/orders'
  const userId =
    typeof __ORDER_USER_ID__ === 'string' && __ORDER_USER_ID__.length > 0
      ? __ORDER_USER_ID__
      : '1'

  return { mode, apiUrl, userId }
}

export async function placeOrder(
  input: CheckoutOrderInput,
  env: CheckoutEnv = readCheckoutEnv(),
): Promise<CheckoutOrderResponse> {
  if (env.mode === 'mock') {
    await new Promise((resolve) => setTimeout(resolve, 500))

    return {
      orderId: `MOCK-${Date.now()}`,
    }
  }

  try {
    const response = await axios.post(env.apiUrl, {
      userId: input.userId,
      items: input.items,
    })

    const orderId = response.data?.orderId
    if (typeof orderId !== 'string' || orderId.length === 0) {
      throw new CheckoutError(
        'Invalid checkout response from API.',
        'ORDER_SUBMISSION_FAILED',
      )
    }

    return { orderId }
  } catch (error) {
    if (error instanceof CheckoutError) {
      throw error
    }

    const axiosError = error as AxiosError
    throw new CheckoutError(
      'Unable to place order at the moment. Please try again.',
      'ORDER_SUBMISSION_FAILED',
      axiosError.response?.status,
    )
  }
}
