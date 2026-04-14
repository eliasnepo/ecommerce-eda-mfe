import { Route, Routes } from 'react-router-dom'
import CartConfirmationPage from './pages/CartConfirmationPage'
import CartPage from './pages/CartPage'
import './index.css'

export default function App() {
  return (
    <Routes>
      <Route index element={<CartPage />} />
      <Route path="confirmation/:orderId" element={<CartConfirmationPage />} />
      <Route path="*" element={<CartPage />} />
    </Routes>
  )
}
