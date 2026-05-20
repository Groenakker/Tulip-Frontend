import React from "react";
import "./SortableTh.css";

/**
 * Clickable table header that drives the per-column sort.
 * Pair with `useTableControls()` and spread `getSortProps(key)` here.
 *
 *   <SortableTh sortProps={ctrl.getSortProps("name")}>Name</SortableTh>
 */
export default function SortableTh({
  children,
  sortProps,
  className = "",
  align = "left",
  ...rest
}) {
  const { active, direction, onClick, ariaSort } = sortProps || {};

  // Triangle that visually communicates the current state. We always render
  // a placeholder to prevent layout shift when the column becomes active.
  const indicator = !active ? (
    <span className="sortableThIndicator sortableThIndicatorIdle" aria-hidden="true">
      ⇅
    </span>
  ) : direction === "asc" ? (
    <span className="sortableThIndicator sortableThIndicatorActive" aria-hidden="true">
      ▲
    </span>
  ) : (
    <span className="sortableThIndicator sortableThIndicatorActive" aria-hidden="true">
      ▼
    </span>
  );

  return (
    <th
      {...rest}
      className={`sortableTh ${active ? "sortableThActive" : ""} ${className}`.trim()}
      aria-sort={ariaSort || "none"}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.();
        }
      }}
    >
      <span
        className="sortableThInner"
        style={{ justifyContent: align === "right" ? "flex-end" : "flex-start" }}
      >
        <span className="sortableThLabel">{children}</span>
        {indicator}
      </span>
    </th>
  );
}
