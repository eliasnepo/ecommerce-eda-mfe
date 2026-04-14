import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import FilterBar from '../../components/FilterBar/FilterBar'
import { filterStore, resetFilters } from '../../store/filterStore'

describe('FilterBar', () => {
  beforeEach(() => {
    resetFilters()
  })

  it('renders Category and Sort by pills', () => {
    render(<FilterBar />)

    expect(screen.getByRole('button', { name: /categories/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sort by: relevance/i })).toBeInTheDocument()
  })

  it('opens listbox when category pill is clicked', async () => {
    const user = userEvent.setup()
    render(<FilterBar />)

    await user.click(screen.getByRole('button', { name: /categories/i }))

    expect(screen.getByRole('listbox')).toBeInTheDocument()
  })

  it('selects Electronics and closes dropdown', async () => {
    const user = userEvent.setup()
    render(<FilterBar />)

    await user.click(screen.getByRole('button', { name: /categories/i }))
    await user.click(screen.getByRole('option', { name: 'Electronics' }))

    expect(filterStore.state.category).toBe('Electronics')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('applies active styling when a category is selected', async () => {
    const user = userEvent.setup()
    render(<FilterBar />)

    await user.click(screen.getByRole('button', { name: /categories/i }))
    await user.click(screen.getByRole('option', { name: 'Electronics' }))

    const selectedPill = screen.getByRole('button', { name: /electronics/i })
    expect(selectedPill).toHaveClass('bg-brand-primary')
    expect(selectedPill).toHaveClass('text-white')
  })
})
