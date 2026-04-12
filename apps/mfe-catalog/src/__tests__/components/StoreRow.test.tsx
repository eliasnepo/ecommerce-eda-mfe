import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import StoreRow from '../../components/StoreRow/StoreRow'

describe('StoreRow', () => {
  it('renders all 4 mock stores', () => {
    render(<StoreRow />)

    expect(screen.getByText('Deux par Deux')).toBeInTheDocument()
    expect(screen.getByText('Paisley & Gray')).toBeInTheDocument()
    expect(screen.getByText('Ally Fashion')).toBeInTheDocument()
    expect(screen.getByText('Nike')).toBeInTheDocument()
  })

  it('shows Visit shop link in each store card', () => {
    render(<StoreRow />)

    expect(screen.getAllByRole('link', { name: 'Visit shop' })).toHaveLength(4)
  })

  it('has focusable scroll button with accessible label', () => {
    render(<StoreRow />)

    const button = screen.getByRole('button', { name: 'Scroll stores right' })
    button.focus()

    expect(button).toHaveFocus()
  })
})
