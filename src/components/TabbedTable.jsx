import React, { useState } from "react";
import "./TabbedTable.css";

export default function TabbedTable({
  data,
  showAddButtonForTabs = [],
  onAddClick,
}) {
  const tabs = Object.keys(data);
  const [activeTab, setActiveTab] = useState(tabs[0]);

  const columns = data[activeTab]?.columns || [];
  const rows = data[activeTab]?.rows || [];

  const showAddButton = showAddButtonForTabs.includes(activeTab);

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
          rows.map((entry, index) => (
            <div 
              className="row" 
              key={index}
              style={{ gridTemplateColumns: `repeat(${columns.length}, 1fr)` }}
            >
              {columns.map((col) => (
                <div className="cell" key={col.key}>
                  {entry[col.key]}
                </div>
              ))}
            </div>
          ))
        ) : (
          <div className="noData">No data available</div>
        )}
      </div>
    </div>
  );
}
