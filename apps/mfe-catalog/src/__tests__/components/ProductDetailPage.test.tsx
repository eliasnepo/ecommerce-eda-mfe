import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import ProductDetailPage from '../../components/ProductDetail/ProductDetailPage'

vi.mock('../../hooks/useProduct', () => ({
  useProduct: () => ({
    data: {
      product: {
        id: 'prod-1',
        name: 'Wireless Headphones',
        description: 'Great sound',
        price: 99.99,
        category: 'Electronics',
        imageUrl: null,
      },
    },
    isLoading: false,
    isError: false,
  }),
}))

describe('ProductDetailPage', () => {
  it('renders product price in USD format', () => {
    render(
      <MemoryRouter initialEntries={['/catalog/product/prod-1']}>
        <Routes>
          <Route path="/catalog/product/:id" element={<ProductDetailPage />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: 'Wireless Headphones' })).toBeInTheDocument()
    expect(screen.getByText('$99.99')).toBeInTheDocument()
  })
})
