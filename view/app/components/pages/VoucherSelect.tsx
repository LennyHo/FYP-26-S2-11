"use client"

import { useEffect, useMemo, useRef, useState } from "react"

type VoucherOption = {
  value: string
  label: string
  title?: string
  code?: string
}

export default function VoucherSelect({
  value,
  options,
  onChange,
  disabled,
  placeholder = "No voucher",
}: {
  value: string
  options: VoucherOption[]
  onChange?: (nextValue: string) => void
  disabled?: boolean
  placeholder?: string
}) {
  const allOptions = useMemo(() => [{ value: "", label: placeholder }, ...options], [options, placeholder])
  const current = allOptions.find((option) => option.value === value) || allOptions[0]

  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState(current.label)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) setQuery(current.label)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, current.label])

  useEffect(() => {
    if (!open) return

    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setOpen(false)
        setQuery(current.label)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, current.label])

  const filtered = useMemo(() => {
    const cleanQuery = query.trim().toLowerCase()
    if (!cleanQuery) return allOptions
    return allOptions.filter((option) => option.label.toLowerCase().includes(cleanQuery))
  }, [query, allOptions])

  function choose(option: VoucherOption) {
    setOpen(false)
    setQuery(option.label)
    if (option.value !== value) onChange?.(option.value)
  }

  function openMenu() {
    if (disabled) return
    setOpen(true)
    setQuery("")
    requestAnimationFrame(() => inputRef.current?.select())
  }

  function closeMenu() {
    setOpen(false)
    setQuery(current.label)
  }

  return (
    <div className="checkout-voucher-select-wrap" ref={wrapperRef}>
      <div className={`checkout-voucher-select-btn ${disabled ? "is-disabled" : ""}`}>
        <input
          ref={inputRef}
          value={open ? query : current.label}
          disabled={disabled}
          onFocus={openMenu}
          onChange={(event) => {
            if (!open) setOpen(true)
            setQuery(event.target.value)
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault()
              if (filtered.length > 0) choose(filtered[0])
            }
            if (event.key === "Escape") closeMenu()
          }}
          placeholder={placeholder}
          autoComplete="off"
        />
        <svg
          className={`checkout-voucher-select-chevron ${open ? "is-open" : ""}`}
          width="10"
          height="6"
          viewBox="0 0 10 6"
          fill="none"
          aria-hidden="true"
          onClick={() => (open ? closeMenu() : openMenu())}
        >
          <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      {open && (
        <div className="checkout-voucher-select-menu" role="listbox">
          {filtered.length === 0 ? (
            <p className="checkout-voucher-select-empty">No matching voucher</p>
          ) : (
            filtered.map((option) => (
              <button
                type="button"
                key={option.value || "none"}
                role="option"
                aria-selected={option.value === value}
                className={`checkout-voucher-select-option ${option.value === value ? "active" : ""}`}
                onClick={() => choose(option)}
              >
                {option.code ? (
                  <span className="checkout-voucher-select-option-row">
                    <span className="checkout-voucher-select-option-title">{option.title}</span>
                    <span className="checkout-voucher-select-option-code">{option.code}</span>
                  </span>
                ) : (
                  option.label
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
