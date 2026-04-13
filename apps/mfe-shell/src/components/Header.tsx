import { NavLink } from 'react-router-dom'
import { useCartStore } from '../cart/useCartStore'

function navClassName({ isActive }: { isActive: boolean }): string {
  return isActive ? 'shell-nav-link is-active' : 'shell-nav-link'
}

export default function Header() {
  const { totalItems } = useCartStore()

  return (
    <header className="shell-header">
      <div className="shell-header-inner">
        <p className="shell-brand">E-Commerce PoC</p>

        <nav className="shell-nav" aria-label="Primary">
          <NavLink to="/catalog" className={navClassName}>
            Catalog
          </NavLink>
          <NavLink to="/cart" className={navClassName}>
            Cart
            <span className="cart-badge" aria-label={`${totalItems} items in cart`}>
              {totalItems}
            </span>
          </NavLink>
        </nav>
      </div>
    </header>
  )
}
