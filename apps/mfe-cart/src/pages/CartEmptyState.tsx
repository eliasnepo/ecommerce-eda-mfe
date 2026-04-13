import { Link } from 'react-router-dom'

export default function CartEmptyState() {
  return (
    <section className="cart-empty-state" aria-live="polite">
      <div className="cart-empty-icon" aria-hidden="true">
        🛍️
      </div>
      <h2>Your cart is empty</h2>
      <p>Add products from the catalog to see them here.</p>
      <Link to="/catalog" className="cart-primary-link">
        Continue shopping
      </Link>
    </section>
  )
}
