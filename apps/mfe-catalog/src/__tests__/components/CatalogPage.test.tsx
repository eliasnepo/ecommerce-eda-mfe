import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import CatalogPage from '../../components/CatalogPage'
import { resetFilters } from '../../store/filterStore'

const requestSearchQueryStateMock = vi.hoisted(() => vi.fn())
const subscribeToSearchQueryMock = vi.hoisted(() => vi.fn(() => vi.fn()))

vi.mock('../../hooks/useProducts', () => ({
  useProducts: () => ({
    data: {
      products: {
        content: [],
        totalPages: 0,
      },
    },
    isFetching: false,
  }),
}))

vi.mock('../../integration/searchChannel', () => ({
  requestSearchQueryState: requestSearchQueryStateMock,
  subscribeToSearchQuery: subscribeToSearchQueryMock,
}))

describe('CatalogPage', () => {
  afterEach(() => {
    vi.clearAllMocks()
    resetFilters()
  })

  it('renders sections in order: banner -> filters -> products', () => {
    render(
      <MemoryRouter>
        <CatalogPage />
      </MemoryRouter>,
    )

    const banner = screen.getByRole('region', { name: 'Featured deal' })
    const filters = screen.getByRole('toolbar', { name: 'Product filters' })
    const products = screen.getByRole('heading', { name: 'Products for you!' })

    expect(banner.compareDocumentPosition(filters) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(filters.compareDocumentPosition(products) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('requests shell search state on mount', () => {
    render(
      <MemoryRouter>
        <CatalogPage />
      </MemoryRouter>,
    )

    expect(subscribeToSearchQueryMock).toHaveBeenCalledTimes(1)
    expect(requestSearchQueryStateMock).toHaveBeenCalledTimes(1)
  })
})
