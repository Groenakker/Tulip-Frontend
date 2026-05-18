import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/**
 * Hook that manages multi-select state for a paginated list.
 *
 * Inputs:
 *   visibleItems   — items currently rendered (e.g. paged + filtered slice)
 *   allItems       — full (filtered) dataset; selections outside this are
 *                    automatically dropped so the counter never lies after a
 *                    search filters out a previously-selected row.
 *   getId          — (item) => string id (defaults to item._id)
 *
 * Returns helpers and a `headerCheckboxProps` object you can spread directly
 * onto an <input type="checkbox" /> for a tri-state "select all on page".
 */
export function useBulkSelection({
  visibleItems = [],
  allItems = [],
  getId = (item) => item?._id,
} = {}) {
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const headerCheckboxRef = useRef(null);

  // Drop selections that no longer exist in the (filtered) dataset.
  useEffect(() => {
    setSelectedIds((prev) => {
      if (prev.size === 0) return prev;
      const visible = new Set(allItems.map((item) => getId(item)).filter(Boolean));
      let changed = false;
      const next = new Set();
      prev.forEach((id) => {
        if (visible.has(id)) {
          next.add(id);
        } else {
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [allItems, getId]);

  const pageInfo = useMemo(() => {
    const total = visibleItems.length;
    let selected = 0;
    for (const item of visibleItems) {
      if (selectedIds.has(getId(item))) selected += 1;
    }
    return {
      total,
      selected,
      allSelected: total > 0 && selected === total,
      someSelected: selected > 0 && selected < total,
    };
  }, [visibleItems, selectedIds, getId]);

  // Sync indeterminate state (DOM-only property; can't be set declaratively).
  useEffect(() => {
    if (headerCheckboxRef.current) {
      headerCheckboxRef.current.indeterminate = pageInfo.someSelected;
    }
  }, [pageInfo.someSelected]);

  const toggleItem = useCallback((id) => {
    if (!id) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const isSelected = useCallback((id) => selectedIds.has(id), [selectedIds]);

  const togglePage = useCallback(() => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (pageInfo.allSelected) {
        visibleItems.forEach((item) => next.delete(getId(item)));
      } else {
        visibleItems.forEach((item) => {
          const id = getId(item);
          if (id) next.add(id);
        });
      }
      return next;
    });
  }, [pageInfo.allSelected, visibleItems, getId]);

  const clear = useCallback(() => setSelectedIds(new Set()), []);

  const selectedIdArray = useMemo(() => Array.from(selectedIds), [selectedIds]);

  const selectedItems = useMemo(() => {
    if (selectedIds.size === 0) return [];
    const lookup = new Map(allItems.map((item) => [getId(item), item]));
    return selectedIdArray
      .map((id) => lookup.get(id))
      .filter(Boolean);
  }, [selectedIds, selectedIdArray, allItems, getId]);

  const headerCheckboxProps = {
    ref: headerCheckboxRef,
    type: "checkbox",
    checked: pageInfo.allSelected,
    onChange: togglePage,
    disabled: visibleItems.length === 0,
    "aria-label": "Select all on this page",
  };

  return {
    selectedIds,            // Set<string>
    selectedIdArray,        // string[]
    selectedItems,          // T[]
    count: selectedIds.size,
    isSelected,
    toggleItem,
    togglePage,
    clear,
    pageInfo,
    headerCheckboxProps,
  };
}

export default useBulkSelection;
