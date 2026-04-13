import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import QuantityStepper from '../components/QuantityStepper'

describe('QuantityStepper', () => {
  it('dispatches cart:update-item with quantity +1 on increment', async () => {
    const user = userEvent.setup()
    const listener = vi.fn()
    window.addEventListener('cart:update-item', listener as EventListener)

    render(<QuantityStepper productId="prod-1" quantity={2} />)

    await user.click(screen.getByRole('button', { name: /increase quantity/i }))

    expect(listener).toHaveBeenCalledTimes(1)
    const event = listener.mock.calls[0][0] as CustomEvent
    expect(event.detail).toEqual({ productId: 'prod-1', quantity: 3 })

    window.removeEventListener('cart:update-item', listener as EventListener)
  })

  it('dispatches remove behavior when decrementing from 1', async () => {
    const user = userEvent.setup()
    const listener = vi.fn()
    window.addEventListener('cart:remove-item', listener as EventListener)

    render(<QuantityStepper productId="prod-1" quantity={1} />)

    await user.click(screen.getByRole('button', { name: /decrease quantity/i }))

    expect(listener).toHaveBeenCalledTimes(1)
    const event = listener.mock.calls[0][0] as CustomEvent
    expect(event.detail).toEqual({ productId: 'prod-1' })

    window.removeEventListener('cart:remove-item', listener as EventListener)
  })
})
