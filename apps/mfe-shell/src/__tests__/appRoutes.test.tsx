import { render, screen } from '@testing-library/react'
import { lazy, type ComponentType } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import AppRoutes from '../routing/AppRoutes'

function renderRoutes(
  initialEntry: string,
  overrides?: {
    catalogRemote?: ComponentType
    cartRemote?: ComponentType
  },
) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <AppRoutes {...overrides} />
    </MemoryRouter>,
  )
}

describe('AppRoutes', () => {
  it('redirects / to /catalog', async () => {
    function CatalogMock() {
      return <div>Catalog Remote</div>
    }

    renderRoutes('/', { catalogRemote: CatalogMock })

    expect(await screen.findByText('Catalog Remote')).toBeInTheDocument()
  })

  it('renders fallback while remote is unresolved', async () => {
    const PendingCatalog = lazy(() => new Promise<{ default: ComponentType }>(() => {}))

    renderRoutes('/catalog', { catalogRemote: PendingCatalog })

    expect(await screen.findByText('Loading Catalog...')).toBeInTheDocument()
  })
})
