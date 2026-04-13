import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import OrderSummaryCard from '../components/OrderSummaryCard'

describe('OrderSummaryCard', () => {
  it('renders subtotal and total with USD formatting', () => {
    render(
      <OrderSummaryCard
        subtotal={129.99}
        shipping={0}
        tax={0}
        total={129.99}
        onCheckout={vi.fn()}
        checkoutDisabled={false}
        checkoutLoading={false}
      />,
    )

    expect(screen.getAllByText('$129.99')).toHaveLength(2)
    expect(screen.getByText('Free')).toBeInTheDocument()
  })
})
