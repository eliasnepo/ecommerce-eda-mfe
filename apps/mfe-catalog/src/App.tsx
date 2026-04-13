import './index.css'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Route, Routes } from 'react-router-dom'
import CatalogPage from './components/CatalogPage'
import ProductDetailPage from './components/ProductDetail/ProductDetailPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Routes>
        <Route index element={<CatalogPage />} />
        <Route path="product/:id" element={<ProductDetailPage />} />
      </Routes>
    </QueryClientProvider>
  )
}
