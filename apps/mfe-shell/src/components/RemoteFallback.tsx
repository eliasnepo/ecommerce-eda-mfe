interface RemoteFallbackProps {
  remoteName: string
}

export default function RemoteFallback({ remoteName }: RemoteFallbackProps) {
  return (
    <div
      className="rounded-card border border-border bg-surface p-5 text-sm text-text-secondary shadow-card"
      role="status"
      aria-live="polite"
    >
      Loading {remoteName}...
    </div>
  )
}
