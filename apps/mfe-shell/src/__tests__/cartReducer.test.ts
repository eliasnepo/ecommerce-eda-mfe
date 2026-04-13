import { describe, expect, it } from 'vitest'
import {
  cartReducer,
  createEmptyCartState,
  deriveCartTotals,
} from '../cart/cartReducer'

describe('cartReducer', () => {
  it('adds new item', () => {
    const state = cartReducer(createEmptyCartState(), {
      type: 'addItem',
      payload: {
        productId: 'prod-1',
        productName: 'Keyboard',
        price: 49.99,
        quantity: 1,
      },
    })

    expect(state.items).toHaveLength(1)
    expect(state.items[0]).toMatchObject({
      productId: 'prod-1',
      quantity: 1,
    })
  })

  it('merges quantity for existing item', () => {
    const initial = cartReducer(createEmptyCartState(), {
      type: 'addItem',
      payload: {
        productId: 'prod-1',
        productName: 'Keyboard',
        price: 49.99,
        quantity: 1,
      },
    })

    const state = cartReducer(initial, {
      type: 'addItem',
      payload: {
        productId: 'prod-1',
        productName: 'Keyboard',
        price: 49.99,
        quantity: 2,
      },
    })

    expect(state.items).toHaveLength(1)
    expect(state.items[0].quantity).toBe(3)
  })

  it('updates item quantity', () => {
    const initial = cartReducer(createEmptyCartState(), {
      type: 'addItem',
      payload: {
        productId: 'prod-1',
        productName: 'Keyboard',
        price: 49.99,
        quantity: 1,
      },
    })

    const state = cartReducer(initial, {
      type: 'updateItemQuantity',
      payload: { productId: 'prod-1', quantity: 4 },
    })

    expect(state.items[0].quantity).toBe(4)
  })

  it('removes item when quantity <= 0', () => {
    const initial = cartReducer(createEmptyCartState(), {
      type: 'addItem',
      payload: {
        productId: 'prod-1',
        productName: 'Keyboard',
        price: 49.99,
        quantity: 1,
      },
    })

    const state = cartReducer(initial, {
      type: 'updateItemQuantity',
      payload: { productId: 'prod-1', quantity: 0 },
    })

    expect(state.items).toEqual([])
  })

  it('clears cart', () => {
    const withItems = cartReducer(createEmptyCartState(), {
      type: 'addItem',
      payload: {
        productId: 'prod-1',
        productName: 'Keyboard',
        price: 49.99,
        quantity: 1,
      },
    })

    const state = cartReducer(withItems, { type: 'clearCart' })
    expect(state.items).toEqual([])
  })

  it('computes derived totals', () => {
    const totals = deriveCartTotals([
      { productId: 'a', productName: 'A', price: 10, quantity: 2 },
      { productId: 'b', productName: 'B', price: 5, quantity: 3 },
    ])

    expect(totals.totalItems).toBe(5)
    expect(totals.subtotal).toBe(35)
  })
})
