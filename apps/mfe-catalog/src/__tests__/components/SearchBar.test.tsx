import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import SearchBar from '../../components/SearchBar/SearchBar'

describe('SearchBar', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
  })

  it('renders search input with aria-label', () => {
    render(<SearchBar value="" onChange={vi.fn()} />)

    const input = screen.getByRole('searchbox', { name: 'Search products' })
    expect(input).toHaveAttribute('type', 'search')
  })

  it('does not call onChange immediately while typing', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(<SearchBar value="" onChange={onChange} />)

    await user.type(screen.getByRole('searchbox', { name: 'Search products' }), 'h')

    expect(onChange).not.toHaveBeenCalled()
  })

  it('calls onChange once after debounce period', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(<SearchBar value="" onChange={onChange} />)

    await user.type(screen.getByRole('searchbox', { name: 'Search products' }), 'shoes')
    vi.advanceTimersByTime(300)

    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith('shoes')
  })

  it('collapses burst typing into one onChange call', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(<SearchBar value="" onChange={onChange} />)

    await user.type(screen.getByRole('searchbox', { name: 'Search products' }), 'jacket')
    vi.advanceTimersByTime(300)

    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith('jacket')
  })
})
