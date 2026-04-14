import { useEffect, useRef, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useCartStore } from '../cart/useCartStore'
import CartPreviewPopover from './CartPreviewPopover'
import {
  CATALOG_SEARCH_QUERY_SET_EVENT,
  type CatalogSearchSetDetail,
} from '../search/searchTypes'
import { setSearchQuery, useSearchStore } from '../search/useSearchStore'

const SEARCH_DEBOUNCE_MS = 280
const POPOVER_OPEN_DELAY_MS = 80
const POPOVER_CLOSE_DELAY_MS = 120
const NAV_ITEMS = ['Categories', 'Deals', "What's New", 'Delivery']

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden>
      <path
        d="M11 4a7 7 0 105.293 11.586l3.56 3.56a1 1 0 001.414-1.414l-3.56-3.56A7 7 0 0011 4z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  )
}

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden>
      <path
        d="M12 12a4 4 0 100-8 4 4 0 000 8zm0 2c-4.418 0-8 2.239-8 5v1h16v-1c0-2.761-3.582-5-8-5z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function CartIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden>
      <path
        d="M3 4h2l2.5 10.5a1 1 0 00.98.78h8.9a1 1 0 00.97-.757L21 7H7"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="10" cy="19" r="1.5" fill="currentColor" />
      <circle cx="18" cy="19" r="1.5" fill="currentColor" />
    </svg>
  )
}

export default function Header() {
  const { totalItems, subtotal, items } = useCartStore()
  const { query } = useSearchStore()
  const [searchValue, setSearchValue] = useState(query)
  const [isPopoverOpen, setIsPopoverOpen] = useState(false)
  const cartRegionRef = useRef<HTMLDivElement | null>(null)
  const openTimerRef = useRef<number | null>(null)
  const closeTimerRef = useRef<number | null>(null)

  useEffect(() => {
    setSearchValue(query)
  }, [query])

  useEffect(() => {
    if (searchValue === query) {
      return
    }

    const timer = window.setTimeout(() => {
      setSearchQuery(searchValue)

      const detail: CatalogSearchSetDetail = {
        query: searchValue,
        source: 'shell_header',
        updatedAt: new Date().toISOString(),
      }

      window.dispatchEvent(
        new CustomEvent(CATALOG_SEARCH_QUERY_SET_EVENT, {
          detail,
          bubbles: true,
        }),
      )
    }, SEARCH_DEBOUNCE_MS)

    return () => {
      window.clearTimeout(timer)
    }
  }, [query, searchValue])

  const clearTimers = () => {
    if (openTimerRef.current) {
      window.clearTimeout(openTimerRef.current)
      openTimerRef.current = null
    }
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
  }

  const scheduleOpen = () => {
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }

    if (isPopoverOpen) {
      return
    }

    openTimerRef.current = window.setTimeout(() => {
      setIsPopoverOpen(true)
    }, POPOVER_OPEN_DELAY_MS)
  }

  const scheduleClose = () => {
    if (openTimerRef.current) {
      window.clearTimeout(openTimerRef.current)
      openTimerRef.current = null
    }

    closeTimerRef.current = window.setTimeout(() => {
      setIsPopoverOpen(false)
    }, POPOVER_CLOSE_DELAY_MS)
  }

  useEffect(() => {
    return () => {
      clearTimers()
    }
  }, [])

  useEffect(() => {
    if (!isPopoverOpen) {
      return
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsPopoverOpen(false)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [isPopoverOpen])

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-surface/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-shell items-center gap-3 px-4 py-3">
        <NavLink
          to="/catalog"
          className="inline-flex shrink-0 items-center gap-2 no-underline"
        >
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-accent-primary text-white">
            <CartIcon />
          </span>
          <span className="text-xl font-bold text-brand-primary">Shopcart</span>
        </NavLink>

        <div className="flex min-w-0 flex-1 items-center gap-3">
          <nav aria-label="Primary" className="hidden items-center gap-2 lg:flex">
            {NAV_ITEMS.map((item) => (
              <button
                key={item}
                type="button"
                className="rounded-pill bg-surface-muted px-4 py-2 text-sm font-medium text-text-primary transition hover:bg-border"
              >
                {item}
              </button>
            ))}
          </nav>

          <label className="flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-pill bg-surface-muted px-4 text-text-secondary lg:ml-auto lg:max-w-[420px]">
            <SearchIcon />
            <input
              type="search"
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              placeholder="Search Product"
              aria-label="Search products from shell"
              className="w-full min-w-0 border-none bg-transparent text-sm text-text-primary outline-none placeholder:text-text-secondary"
            />
          </label>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              className="inline-flex min-h-11 items-center gap-2 rounded-pill border border-border bg-surface px-4 text-sm font-medium text-text-primary"
            >
              <UserIcon />
              <span>Account</span>
            </button>

            <div
              ref={cartRegionRef}
              className="relative"
              onMouseEnter={scheduleOpen}
              onMouseLeave={scheduleClose}
              onFocusCapture={scheduleOpen}
              onBlurCapture={(event) => {
                const nextTarget = event.relatedTarget as Node | null
                if (cartRegionRef.current?.contains(nextTarget)) {
                  return
                }
                scheduleClose()
              }}
            >
              <button
                type="button"
                aria-haspopup="dialog"
                aria-expanded={isPopoverOpen}
                onClick={() => setIsPopoverOpen((value) => !value)}
                className="inline-flex min-h-11 items-center gap-2 rounded-pill border border-border bg-surface px-4 text-sm font-medium text-text-primary"
              >
                <CartIcon />
                <span>Cart</span>
                <span
                  className="inline-flex min-w-6 items-center justify-center rounded-pill bg-accent-primary px-1.5 text-xs font-semibold text-white"
                  aria-label={`${totalItems} items in cart`}
                >
                  {totalItems}
                </span>
              </button>

              <CartPreviewPopover
                isOpen={isPopoverOpen}
                items={items}
                totalItems={totalItems}
                subtotal={subtotal}
                onNavigate={() => setIsPopoverOpen(false)}
              />
            </div>
          </div>
        </div>
      </div>

    </header>
  )
}
