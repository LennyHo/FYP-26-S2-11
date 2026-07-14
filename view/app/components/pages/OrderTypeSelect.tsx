"use client"

import { useEffect, useRef, useState } from "react"

const OPTIONS = [
  { value: "delivery", label: "Delivery" },
  { value: "pickup", label: "Pickup" },
]

export default function OrderTypeSelect({
  value,
  onChange,
}: {
  value: string
  onChange?: (nextValue: string) => void
}) {
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const current = OPTIONS.find((option) => option.value === value) || OPTIONS[0]

  useEffect(() => {
    if (!open) return

    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [open])

  function choose(option: { value: string; label: string }) {
    setOpen(false)
    if (option.value !== value) onChange?.(option.value)
  }

  return (
    <div className="checkout-mode-select-wrap" ref={wrapperRef}>
      <button
        type="button"
        className="checkout-mode-select-btn"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {current.label}
        <svg
          className={`checkout-mode-select-chevron ${open ? "is-open" : ""}`}
          width="10"
          height="6"
          viewBox="0 0 10 6"
          fill="none"
          aria-hidden="true"
        >
          <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className="checkout-mode-select-menu" role="listbox">
          {OPTIONS.map((option) => (
            <button
              type="button"
              key={option.value}
              role="option"
              aria-selected={option.value === value}
              className={`checkout-mode-select-option ${option.value === value ? "active" : ""}`}
              onClick={() => choose(option)}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
