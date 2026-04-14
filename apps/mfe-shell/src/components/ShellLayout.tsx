import { Outlet } from 'react-router-dom'
import Header from './Header'

export default function ShellLayout() {
  return (
    <div className="min-h-screen bg-page-bg">
      <Header />
      <main className="mx-auto w-full max-w-shell px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
