interface CheckoutButtonProps {
  isLoading: boolean
  disabled?: boolean
  onClick: () => void
}

export default function CheckoutButton({
  isLoading,
  disabled,
  onClick,
}: CheckoutButtonProps) {
  return (
    <button
      type="button"
      className="checkout-button"
      onClick={onClick}
      disabled={disabled || isLoading}
    >
      {isLoading ? 'Placing order...' : 'Place order'}
    </button>
  )
}
