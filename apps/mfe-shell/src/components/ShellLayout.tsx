import { Outlet } from 'react-router-dom'
import Header from './Header'

export default function ShellLayout() {
  return (
    <div className="shell-page">
      <Header />
      <main className="shell-main">
        <Outlet />
      </main>
    </div>
  )
}
