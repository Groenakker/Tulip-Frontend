import React, { useEffect, useMemo, useRef, useState } from "react";
import { FaChevronDown, FaSearch } from "react-icons/fa";
import styles from "./MultiSelect.module.css";

// Checkbox-based multi-select popover. Visually matches
// SearchableSelect so it slots into the existing forms without extra
// styling. Use it when a user can pick *many* of something from a list
// that you don't want to expand inline (e.g. assigning many instances
// to a test row without ballooning the table cell vertically).
//
// Props:
//   values           string[] currently selected option ids
//   onChange(values) called with the next selected ids array
//   options          [{ value, label, sublabel? }]
//   placeholder      text shown when nothing is selected
//   disabled         greys out and disables the trigger
//   emptyText        shown when search yields no matches
//   menuMaxHeight    max-height for the scrollable list (default 240)
//   id               id for the trigger (label association)
//   triggerClassName extra class for the trigger
//   summaryFormatter optional (values, options) => string. Defaults to
//                    showing "N selected" with the first picked label.
export default function MultiSelect({
  values = [],
  onChange,
  options = [],
  placeholder = "Select…",
  disabled = false,
  emptyText = "No matches.",
  menuMaxHeight = 240,
  id,
  triggerClassName = "",
  summaryFormatter,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapRef = useRef(null);
  const inputRef = useRef(null);

  const selectedSet = useMemo(
    () => new Set((values || []).map((v) => String(v))),
    [values]
  );

  const filtered = useMemo(() => {
    if (!query.trim()) return options;
    const q = query.toLowerCase();
    return options.filter((o) =>
      `${o.label || ""} ${o.sublabel || ""}`.toLowerCase().includes(q)
    );
  }, [options, query]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  const toggle = (val) => {
    const key = String(val);
    const next = new Set(selectedSet);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onChange?.(Array.from(next));
  };

  const selectAll = () => {
    onChange?.(filtered.map((o) => String(o.value)));
  };

  const clearAll = () => {
    onChange?.([]);
  };

  // Summary string shown in the closed trigger. Defaults to showing
  // the first selected label + "+N more" when more than one is picked.
  const summary = useMemo(() => {
    if (typeof summaryFormatter === "function") {
      return summaryFormatter(values || [], options);
    }
    if (!values || values.length === 0) return null;
    const selectedOpts = options.filter((o) => selectedSet.has(String(o.value)));
    if (selectedOpts.length === 0) return `${values.length} selected`;
    if (selectedOpts.length === 1) return selectedOpts[0].label;
    return `${selectedOpts[0].label} +${selectedOpts.length - 1} more`;
  }, [values, selectedSet, options, summaryFormatter]);

  return (
    <div className={styles.wrap} ref={wrapRef}>
      <button
        type="button"
        id={id}
        disabled={disabled}
        className={`${styles.trigger} ${triggerClassName} ${open ? styles.open : ""} ${disabled ? styles.disabled : ""}`}
        onClick={() => (open ? setOpen(false) : setOpen(true))}
      >
        <span className={styles.triggerLabel}>
          {values && values.length > 0 ? (
            <>
              <span className={styles.count}>{values.length}</span>
              {summary}
            </>
          ) : (
            <span className={styles.placeholder}>{placeholder}</span>
          )}
        </span>
        <span className={styles.triggerIcons}>
          <FaChevronDown className={`${styles.chevron} ${open ? styles.chevronOpen : ""}`} />
        </span>
      </button>

      {open && (
        <div className={styles.menu} style={{ maxHeight: menuMaxHeight + 80 }}>
          <div className={styles.searchRow}>
            <FaSearch className={styles.searchIcon} />
            <input
              ref={inputRef}
              className={styles.searchInput}
              placeholder="Type to search…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className={styles.toolbar}>
            <button
              type="button"
              className={styles.toolbarBtn}
              onClick={selectAll}
              disabled={filtered.length === 0}
            >
              Select all{query ? " filtered" : ""}
            </button>
            <button
              type="button"
              className={styles.toolbarBtn}
              onClick={clearAll}
              disabled={!values || values.length === 0}
            >
              Clear
            </button>
          </div>
          <div className={styles.menuList} style={{ maxHeight: menuMaxHeight }} role="listbox">
            {filtered.length === 0 ? (
              <div className={styles.menuEmpty}>{emptyText}</div>
            ) : (
              filtered.map((opt) => {
                const checked = selectedSet.has(String(opt.value));
                return (
                  <label
                    key={opt.value}
                    className={`${styles.menuItem} ${checked ? styles.checked : ""}`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(opt.value)}
                    />
                    <div className={styles.menuItemBody}>
                      <div className={styles.menuItemLabel}>{opt.label}</div>
                      {opt.sublabel && (
                        <div className={styles.menuItemSub}>{opt.sublabel}</div>
                      )}
                    </div>
                  </label>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
