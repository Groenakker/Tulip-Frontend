import { useMemo, useState, useCallback } from "react";

// Internal fields we never want to search through (noise / privacy / huge
// strings like base64 images) so deep search stays meaningful and fast.
const IGNORED_KEYS = new Set([
  "_id",
  "__v",
  "id",
  "image",
  "profilePicture",
  "password",
  "passwordHash",
  "company_id",
  "companyId",
  "createdBy",
  "updatedBy",
  "token",
  "rawToken",
]);

const isPlainObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

// Recursively walk the record and collect every searchable scalar value
// (strings, numbers, booleans, dates) into a single lowercase haystack.
// This is what powers "search anything in the record, even if it's not a
// visible column" — for example searching a contact name should match the
// business partner that has that contact in its `contacts` array.
const collectSearchableText = (value, bag, depth = 0) => {
  if (value === null || value === undefined) return;
  if (depth > 6) return; // safety against deeply nested / cyclic data

  if (typeof value === "string") {
    if (value) bag.push(value.toLowerCase());
    return;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    bag.push(String(value).toLowerCase());
    return;
  }
  if (value instanceof Date) {
    bag.push(value.toISOString().toLowerCase());
    bag.push(value.toLocaleDateString().toLowerCase());
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectSearchableText(item, bag, depth + 1);
    return;
  }
  if (isPlainObject(value)) {
    for (const [k, v] of Object.entries(value)) {
      if (IGNORED_KEYS.has(k)) continue;
      collectSearchableText(v, bag, depth + 1);
    }
  }
};

const recordMatchesQuery = (record, query) => {
  if (!query) return true;
  const bag = [];
  collectSearchableText(record, bag);
  const haystack = bag.join(" \u0001 "); // unlikely separator
  return haystack.includes(query);
};

// Resolve a key path (e.g. "user.name" or "address.city") on a record.
const resolvePath = (record, path) => {
  if (!record || !path) return undefined;
  if (typeof path === "function") {
    try {
      return path(record);
    } catch {
      return undefined;
    }
  }
  if (!path.includes(".")) return record[path];
  return path.split(".").reduce((acc, part) => {
    if (acc === null || acc === undefined) return acc;
    return acc[part];
  }, record);
};

// Choose a comparison strategy based on what kind of values we're sorting.
// Numbers compare numerically, dates by timestamp, everything else as
// case-insensitive strings using localeCompare so accents/case behave well.
const compareValues = (a, b) => {
  const aMissing = a === null || a === undefined || a === "";
  const bMissing = b === null || b === undefined || b === "";
  if (aMissing && bMissing) return 0;
  if (aMissing) return 1; // empty values sort to the bottom regardless of direction
  if (bMissing) return -1;

  if (typeof a === "number" && typeof b === "number") return a - b;

  const aDate = a instanceof Date ? a : null;
  const bDate = b instanceof Date ? b : null;
  if (aDate && bDate) return aDate.getTime() - bDate.getTime();

  const aStr = String(a);
  const bStr = String(b);

  // If both look like ISO dates / parsable dates, compare as dates.
  const aTime = Date.parse(aStr);
  const bTime = Date.parse(bStr);
  if (!Number.isNaN(aTime) && !Number.isNaN(bTime) && /\d{4}/.test(aStr) && /\d{4}/.test(bStr)) {
    // only treat as dates if both contain a 4-digit year, to avoid Date.parse
    // accidentally accepting things like "GRK-25035-01"
    return aTime - bTime;
  }

  // Numeric strings (e.g. "42" vs "1000") compare numerically.
  const aNum = Number(aStr);
  const bNum = Number(bStr);
  if (!Number.isNaN(aNum) && !Number.isNaN(bNum) && aStr !== "" && bStr !== "") {
    return aNum - bNum;
  }

  return aStr.localeCompare(bStr, undefined, { numeric: true, sensitivity: "base" });
};

/**
 * useTableControls
 * ---------------------------------------------------------------
 * A small reusable hook that powers search-everything + per-column
 * sorting for any list page.
 *
 * @param {Array} items      Raw list of records.
 * @param {string} query     Current search input (case-insensitive).
 * @param {object} [opts]
 * @param {string} [opts.defaultSortKey]  Initial sort key (path or fn).
 * @param {"asc"|"desc"} [opts.defaultSortDirection]
 *
 * Returns:
 *   - processed:  The filtered + sorted array, ready to paginate.
 *   - sortKey, sortDirection
 *   - toggleSort(key): cycle none -> asc -> desc -> none
 *   - getSortProps(key): { active, direction, onClick, ariaSort }
 */
export function useTableControls(items, query, opts = {}) {
  const { defaultSortKey = null, defaultSortDirection = "asc" } = opts;
  const [sortKey, setSortKey] = useState(defaultSortKey);
  const [sortDirection, setSortDirection] = useState(defaultSortDirection);

  const normalizedQuery = useMemo(
    () => (typeof query === "string" ? query.trim().toLowerCase() : ""),
    [query]
  );

  const processed = useMemo(() => {
    const list = Array.isArray(items) ? items : [];

    const filtered = normalizedQuery
      ? list.filter((record) => recordMatchesQuery(record, normalizedQuery))
      : list;

    if (!sortKey) return filtered;

    const dir = sortDirection === "desc" ? -1 : 1;
    // Don't mutate the caller's array.
    return [...filtered].sort((a, b) => {
      const av = resolvePath(a, sortKey);
      const bv = resolvePath(b, sortKey);
      return compareValues(av, bv) * dir;
    });
  }, [items, normalizedQuery, sortKey, sortDirection]);

  const toggleSort = useCallback((key) => {
    setSortKey((prevKey) => {
      if (prevKey !== key) {
        setSortDirection("asc");
        return key;
      }
      // Same column: cycle asc -> desc -> off.
      setSortDirection((prevDir) => {
        if (prevDir === "asc") return "desc";
        return "asc";
      });
      // If we were already desc, turn sorting off entirely.
      // (We can't read prevDir directly here, so we handle the off-state below.)
      return key;
    });
  }, []);

  // Triple-state cycle (asc -> desc -> off). We do it as a separate handler
  // so toggleSort above stays simple and predictable.
  const cycleSort = useCallback(
    (key) => {
      if (sortKey !== key) {
        setSortKey(key);
        setSortDirection("asc");
        return;
      }
      if (sortDirection === "asc") {
        setSortDirection("desc");
        return;
      }
      // Was desc: clear sort.
      setSortKey(null);
      setSortDirection("asc");
    },
    [sortKey, sortDirection]
  );

  const getSortProps = useCallback(
    (key) => {
      const active = sortKey === key;
      const direction = active ? sortDirection : null;
      return {
        active,
        direction,
        onClick: () => cycleSort(key),
        ariaSort: !active ? "none" : direction === "asc" ? "ascending" : "descending",
      };
    },
    [sortKey, sortDirection, cycleSort]
  );

  return {
    processed,
    sortKey,
    sortDirection,
    setSortKey,
    setSortDirection,
    toggleSort: cycleSort,
    getSortProps,
  };
}

export default useTableControls;
