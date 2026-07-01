import React, { useEffect, useMemo, useRef, useState } from "react";
import "./TabbedTable.css";

// Tabbed list / detail panel used across the app for the
// "related records" section of a detail page.
//
// `data` is an object keyed by tab label. Each entry can be
// either of two shapes:
//   1. A standard table tab:
//        { columns: [{label, key}], rows: [{...}] }
//      A table tab may also provide `onRowClick(row)` — rows that carry
//      a `_recordId` field then become clickable (used to open the
//      related record's detail page).
//   2. A custom-content tab (e.g. embedded component):
//        { content: <ReactNode /> }
//
// When `content` is present it is rendered in place of the
// generated table, so consumers can embed editors or other
// components alongside ordinary tabular data without breaking
// the tab navigation pattern users already know.
//
// `defaultTab` is the preferred initial tab. It's selected
// whenever it exists in `tabs` AND the user hasn't manually
// picked a different one yet. This matters for pages where
// tabs appear asynchronously (e.g. ProjectDetails adds the
// "Project Management" tab only once the project has finished
// loading) — without a defaultTab the user would land on
// whatever happened to be the first synchronously-available
// tab (Shipments) and have to click over manually every time.
export default function TabbedTable({
  data,
  showAddButtonForTabs = [],
  onAddClick,
  defaultTab = "",
}) {
  const tabs = useMemo(() => Object.keys(data || {}), [data]);
  const [activeTab, setActiveTab] = useState(() =>
    defaultTab && tabs.includes(defaultTab) ? defaultTab : (tabs[0] || "")
  );
  // True once the user clicks any tab manually. Until that
  // happens we keep re-evaluating which tab should be active so
  // a late-arriving `defaultTab` can claim focus.
  const userSelectedRef = useRef(false);

  // Keep the active tab valid as the tab list evolves. Three
  // cases, in order:
  //   1. No tabs at all → clear.
  //   2. User has manually selected — only reset if their pick
  //      disappeared (e.g. a permission flip removed it).
  //   3. Otherwise, prefer `defaultTab` when available, falling
  //      back to the first tab.
  useEffect(() => {
    if (!tabs.length) {
      if (activeTab !== "") setActiveTab("");
      return;
    }
    if (userSelectedRef.current) {
      if (!tabs.includes(activeTab)) setActiveTab(tabs[0]);
      return;
    }
    if (defaultTab && tabs.includes(defaultTab)) {
      if (activeTab !== defaultTab) setActiveTab(defaultTab);
      return;
    }
    if (!tabs.includes(activeTab)) setActiveTab(tabs[0]);
  }, [tabs, activeTab, defaultTab]);

  const handleTabClick = (tab) => {
    userSelectedRef.current = true;
    setActiveTab(tab);
  };

  const activeEntry = data[activeTab] || {};
  const isCustomContent = activeEntry.content !== undefined;
  const columns = activeEntry.columns || [];
  const rows = activeEntry.rows || [];
  const onRowClick = typeof activeEntry.onRowClick === "function" ? activeEntry.onRowClick : null;

  const showAddButton = !isCustomContent && showAddButtonForTabs.includes(activeTab);

  return (
    <div className="tabbedTableIsland">
      <div className="tabsWrapper">
        <div className="tabs">
          {tabs.map((tab) => (
            <button
              key={tab}
              className={`tabButton ${activeTab === tab ? "active" : ""}`}
              onClick={() => handleTabClick(tab)}
            >
              {tab}
            </button>
          ))}
        </div>
        {showAddButton && (
          <button className="addButton" onClick={() => onAddClick?.(activeTab)}>
            + Add
          </button>
        )}
      </div>

      <div className="tabContent">
        {!tabs.length ? (
          <div className="noData">No data available</div>
        ) : isCustomContent ? (
          activeEntry.content
        ) : (
          <>
            <div
              className="row rowHeader"
              style={{ gridTemplateColumns: `repeat(${columns.length}, 1fr)` }}
            >
              {columns.map((col) => (
                <div className="cell" key={col.key}>
                  {col.label}
                </div>
              ))}
            </div>

            {rows.length > 0 ? (
              rows.map((entry, index) => {
                const clickable = Boolean(onRowClick && entry._recordId);
                return (
                  <div
                    className={`row ${clickable ? "rowClickable" : ""}`}
                    key={index}
                    style={{ gridTemplateColumns: `repeat(${columns.length}, 1fr)` }}
                    onClick={clickable ? () => onRowClick(entry) : undefined}
                    title={clickable ? "Open record" : undefined}
                  >
                    {columns.map((col) => (
                      <div className="cell" key={col.key}>
                        {entry[col.key]}
                      </div>
                    ))}
                  </div>
                );
              })
            ) : (
              <div className="noData">No data available</div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
