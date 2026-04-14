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
      className="inline-flex min-h-12 w-full items-center justify-center rounded-pill bg-brand-primary px-5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
      onClick={onClick}
      disabled={disabled || isLoading}
    >
      {isLoading ? 'Placing order...' : 'Place Order'}
    </button>
  )
}
