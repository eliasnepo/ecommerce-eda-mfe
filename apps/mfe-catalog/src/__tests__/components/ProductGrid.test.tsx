import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import ProductGrid from '../../components/ProductGrid/ProductGrid'
import type { Product } from '../../types/product'
import { renderWithProviders } from '../../test/utils'

const products: Product[] = [
  {
    id: 'prod-1',
    name: 'Wireless Headphones',
    description: 'Great sound',
    price: 99.99,
    category: 'Electronics',
    imageUrl: null,
  },
  {
    id: 'prod-2',
    name: 'Running Shoes',
    description: 'Lightweight pair',
    price: 120,
    category: 'Sports',
    imageUrl: null,
  },
]

describe('ProductGrid', () => {
  it('shows 10 skeleton cards when loading', () => {
    renderWithProviders(
      <ProductGrid
        products={[]}
        totalPages={1}
        currentPage={0}
        isLoading
        onPageChange={vi.fn()}
      />,
    )

    expect(screen.getAllByLabelText('Loading product')).toHaveLength(10)
  })

  it('renders product cards when products are provided', () => {
    renderWithProviders(
      <ProductGrid
        products={products}
        totalPages={1}
        currentPage={0}
        isLoading={false}
        onPageChange={vi.fn()}
      />,
    )

    expect(screen.getByText('Wireless Headphones')).toBeInTheDocument()
    expect(screen.getByText('Running Shoes')).toBeInTheDocument()
  })

  it('does not render pagination controls when there is one page', () => {
    renderWithProviders(
      <ProductGrid
        products={products}
        totalPages={1}
        currentPage={0}
        isLoading={false}
        onPageChange={vi.fn()}
      />,
    )

    expect(screen.queryByRole('button', { name: /previous/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /next/i })).not.toBeInTheDocument()
  })

  it('disables Previous when current page is 0', () => {
    renderWithProviders(
      <ProductGrid
        products={products}
        totalPages={2}
        currentPage={0}
        isLoading={false}
        onPageChange={vi.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: /previous/i })).toBeDisabled()
  })

  it('calls onPageChange(1) when Next is clicked on page 0', async () => {
    const user = userEvent.setup()
    const onPageChange = vi.fn()

    renderWithProviders(
      <ProductGrid
        products={products}
        totalPages={2}
        currentPage={0}
        isLoading={false}
        onPageChange={onPageChange}
      />,
    )

    await user.click(screen.getByRole('button', { name: /next/i }))

    expect(onPageChange).toHaveBeenCalledWith(1)
  })
})
