interface RemoteFallbackProps {
  remoteName: string
}

export default function RemoteFallback({ remoteName }: RemoteFallbackProps) {
  return (
    <div className="remote-fallback" role="status" aria-live="polite">
      Loading {remoteName}...
    </div>
  )
}
