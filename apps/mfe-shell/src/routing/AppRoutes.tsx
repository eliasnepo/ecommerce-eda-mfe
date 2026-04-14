import { lazy, Suspense, type ComponentType } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import RemoteFallback from '../components/RemoteFallback'
import RouteErrorBoundary from '../components/RouteErrorBoundary'
import ShellLayout from '../components/ShellLayout'

const CatalogRemoteApp = lazy(() => import('catalogMfe/App'))
const CartRemoteApp = lazy(() => import('cartMfe/App'))

interface AppRoutesProps {
  catalogRemote?: ComponentType
  cartRemote?: ComponentType
}

interface RemoteRouteProps {
  remoteName: string
  RemoteComponent: ComponentType
}

function RemoteRoute({ remoteName, RemoteComponent }: RemoteRouteProps) {
  return (
    <RouteErrorBoundary remoteName={remoteName}>
      <Suspense fallback={<RemoteFallback remoteName={remoteName} />}>
        <RemoteComponent />
      </Suspense>
    </RouteErrorBoundary>
  )
}

export default function AppRoutes({
  catalogRemote = CatalogRemoteApp,
  cartRemote = CartRemoteApp,
}: AppRoutesProps) {
  return (
    <Routes>
      <Route element={<ShellLayout />}>
        <Route path="/" element={<Navigate to="/catalog" replace />} />
        <Route
          path="/catalog/*"
          element={<RemoteRoute remoteName="Catalog" RemoteComponent={catalogRemote} />}
        />
        <Route
          path="/cart/*"
          element={<RemoteRoute remoteName="Cart" RemoteComponent={cartRemote} />}
        />
        <Route
          path="*"
          element={
            <section className="rounded-card border border-border bg-surface p-6 shadow-card">
              <h1 className="m-0 text-2xl font-bold text-text-primary">Page not found</h1>
              <p className="mb-0 mt-2 text-sm text-text-secondary">
                Try navigating to Catalog or Cart.
              </p>
            </section>
          }
        />
      </Route>
    </Routes>
  )
}
