import React, { useEffect, useMemo, useRef, useState } from "react";
import { FaChevronDown, FaSearch, FaCheck, FaTimes } from "react-icons/fa";
import styles from "./SearchableSelect.module.css";

// Generic combobox / "type to filter" dropdown. Designed as a
// drop-in replacement for native <select> wherever the option
// list is long enough that browsing it by hand is painful (BP
// pickers, project pickers, country pickers, etc).
//
// Props:
//   value              currently-selected option id (string)
//   onChange(value)    called with the new id, or "" when cleared
//   options            [{ value, label, sublabel? }]
//                      OR a raw object array with `getValue` +
//                      `getLabel` overrides via `options` map
//   placeholder        text shown when nothing is selected
//   disabled           greys out and disables the trigger
//   allowClear         if true a small × clears the selection
//   loading            shows "Loading..." in the menu
//   emptyText          shown when search yields no matches
//   filter(opt, q)     optional custom matcher; defaults to a
//                      case-insensitive `label` substring match
//                      also checking `sublabel` if provided
//   triggerClassName   extra class for the trigger so a host page
//                      can match its own form styles
//
// The trigger renders like an <input> visually so it slots into
// label-above-control forms (Shipping Log, Sample Submission,
// etc.) without extra styling work.
export default function SearchableSelect({
  value,
  onChange,
  options = [],
  placeholder = "Select…",
  disabled = false,
  allowClear = true,
  loading = false,
  emptyText = "No matches.",
  filter,
  triggerClassName = "",
  menuMaxHeight = 260,
  id,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);
  const wrapRef = useRef(null);
  const inputRef = useRef(null);

  const selected = useMemo(
    () => options.find((o) => String(o.value) === String(value)) || null,
    [options, value]
  );

  // Default filter: case-insensitive substring on label +
  // sublabel. Callers can pass a richer matcher if they need to
  // search inside an object (e.g. partner number + email).
  const filtered = useMemo(() => {
    if (!query.trim()) return options;
    if (typeof filter === "function") {
      return options.filter((o) => filter(o, query));
    }
    const q = query.toLowerCase();
    return options.filter((o) =>
      `${o.label || ""} ${o.sublabel || ""}`.toLowerCase().includes(q)
    );
  }, [options, query, filter]);

  // Close on outside click. We attach on mousedown so clicking
  // inside the menu (which also bubbles) doesn't close it.
  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  // Auto-focus the search box when the menu opens.
  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIndex(-1);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  const openMenu = () => { if (!disabled) setOpen(true); };

  const pick = (opt) => {
    onChange?.(opt.value);
    setOpen(false);
  };

  const clear = (e) => {
    e.stopPropagation();
    onChange?.("");
  };

  const onKeyDown = (e) => {
    if (e.key === "Escape") { setOpen(false); return; }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(filtered.length - 1, i + 1));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(0, i - 1));
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const opt = filtered[activeIndex >= 0 ? activeIndex : 0];
      if (opt) pick(opt);
    }
  };

  return (
    <div className={styles.wrap} ref={wrapRef}>
      <button
        type="button"
        id={id}
        disabled={disabled}
        className={`${styles.trigger} ${triggerClassName} ${open ? styles.open : ""} ${disabled ? styles.disabled : ""}`}
        onClick={() => (open ? setOpen(false) : openMenu())}
      >
        <span className={styles.triggerLabel}>
          {selected ? (
            <>
              <span className={styles.selectedLabel}>{selected.label}</span>
              {selected.sublabel && (
                <span className={styles.selectedSub}>· {selected.sublabel}</span>
              )}
            </>
          ) : (
            <span className={styles.placeholder}>{placeholder}</span>
          )}
        </span>
        <span className={styles.triggerIcons}>
          {allowClear && selected && !disabled && (
            <span
              role="button"
              tabIndex={-1}
              className={styles.clearBtn}
              onClick={clear}
              title="Clear selection"
            >
              <FaTimes />
            </span>
          )}
          <FaChevronDown className={`${styles.chevron} ${open ? styles.chevronOpen : ""}`} />
        </span>
      </button>

      {open && (
        <div className={styles.menu} style={{ maxHeight: menuMaxHeight }}>
          <div className={styles.searchRow}>
            <FaSearch className={styles.searchIcon} />
            <input
              ref={inputRef}
              className={styles.searchInput}
              placeholder="Type to search…"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setActiveIndex(0); }}
              onKeyDown={onKeyDown}
            />
          </div>
          <div className={styles.menuList} role="listbox">
            {loading ? (
              <div className={styles.menuEmpty}>Loading…</div>
            ) : filtered.length === 0 ? (
              <div className={styles.menuEmpty}>{emptyText}</div>
            ) : (
              filtered.map((opt, i) => {
                const isSel = String(opt.value) === String(value);
                const isActive = i === activeIndex;
                return (
                  <div
                    key={opt.value ?? i}
                    role="option"
                    aria-selected={isSel}
                    className={`${styles.menuItem} ${isSel ? styles.itemSelected : ""} ${isActive ? styles.itemActive : ""}`}
                    onMouseEnter={() => setActiveIndex(i)}
                    onMouseDown={(e) => { e.preventDefault(); pick(opt); }}
                  >
                    <div className={styles.menuItemBody}>
                      <div className={styles.menuItemLabel}>{opt.label}</div>
                      {opt.sublabel && (
                        <div className={styles.menuItemSub}>{opt.sublabel}</div>
                      )}
                    </div>
                    {isSel && <FaCheck className={styles.checkIcon} />}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
