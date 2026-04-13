import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  CART_ADD_ITEM_EVENT,
  CART_REQUEST_STATE_EVENT,
  CART_STATE_CHANGED_EVENT,
} from '../cart/cartTypes'
import { createCartEventBridge } from '../cart/cartEventBridge'

describe('cartEventBridge', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('handles cart:add-item and dispatches cart:state-changed', () => {
    const addItem = vi.fn()
    const stateChanged = vi.fn()

    window.addEventListener(CART_STATE_CHANGED_EVENT, stateChanged as EventListener)

    const cleanup = createCartEventBridge({
      addItem,
      updateItem: vi.fn(),
      removeItem: vi.fn(),
      clearCart: vi.fn(),
      getSnapshot: () => ({
        items: [
          {
            productId: 'prod-1',
            productName: 'Keyboard',
            price: 49.99,
            quantity: 1,
          },
        ],
        totalItems: 1,
        subtotal: 49.99,
        currency: 'USD',
        updatedAt: '2026-01-01T00:00:00.000Z',
      }),
    })

    window.dispatchEvent(
      new CustomEvent(CART_ADD_ITEM_EVENT, {
        detail: {
          productId: 'prod-1',
          productName: 'Keyboard',
          price: 49.99,
          quantity: 1,
        },
      }),
    )

    expect(addItem).toHaveBeenCalledTimes(1)
    expect(stateChanged).toHaveBeenCalled()

    const latestEvent = stateChanged.mock.calls[stateChanged.mock.calls.length - 1][0] as CustomEvent
    expect(latestEvent.detail.totalItems).toBe(1)

    cleanup()
    window.removeEventListener(
      CART_STATE_CHANGED_EVENT,
      stateChanged as EventListener,
    )
  })

  it('handles cart:request-state without mutation', () => {
    const addItem = vi.fn()
    const stateChanged = vi.fn()

    window.addEventListener(CART_STATE_CHANGED_EVENT, stateChanged as EventListener)

    const cleanup = createCartEventBridge({
      addItem,
      updateItem: vi.fn(),
      removeItem: vi.fn(),
      clearCart: vi.fn(),
      getSnapshot: () => ({
        items: [],
        totalItems: 0,
        subtotal: 0,
        currency: 'USD',
        updatedAt: '2026-01-01T00:00:00.000Z',
      }),
    })

    const initialDispatchCount = stateChanged.mock.calls.length

    window.dispatchEvent(new CustomEvent(CART_REQUEST_STATE_EVENT))

    expect(addItem).not.toHaveBeenCalled()
    expect(stateChanged.mock.calls.length).toBe(initialDispatchCount + 1)

    cleanup()
    window.removeEventListener(
      CART_STATE_CHANGED_EVENT,
      stateChanged as EventListener,
    )
  })

  it('invokes persistence through mutation handlers', () => {
    const persist = vi.fn()

    const cleanup = createCartEventBridge({
      addItem: () => {
        persist()
      },
      updateItem: vi.fn(),
      removeItem: vi.fn(),
      clearCart: vi.fn(),
      getSnapshot: () => ({
        items: [],
        totalItems: 0,
        subtotal: 0,
        currency: 'USD',
        updatedAt: '2026-01-01T00:00:00.000Z',
      }),
    })

    window.dispatchEvent(
      new CustomEvent(CART_ADD_ITEM_EVENT, {
        detail: {
          productId: 'prod-1',
          productName: 'Keyboard',
          price: 49.99,
          quantity: 1,
        },
      }),
    )

    expect(persist).toHaveBeenCalledTimes(1)

    cleanup()
  })
})
