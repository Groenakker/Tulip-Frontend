import React, { useEffect, useMemo, useState } from "react";
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
export default function TabbedTable({
  data,
  showAddButtonForTabs = [],
  onAddClick,
}) {
  const tabs = useMemo(() => Object.keys(data || {}), [data]);
  const [activeTab, setActiveTab] = useState(() => tabs[0] || "");

  // If the tab list changes (e.g. conditional tabs), ensure the active tab is still valid.
  useEffect(() => {
    if (!tabs.length) {
      if (activeTab !== "") setActiveTab("");
      return;
    }
    if (!tabs.includes(activeTab)) {
      setActiveTab(tabs[0]);
    }
  }, [tabs, activeTab]);

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
              onClick={() => setActiveTab(tab)}
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
