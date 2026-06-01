import React, { useEffect, useState } from "react";
import { FaPlus, FaTrash, FaSave } from "react-icons/fa";
import styles from "./pm.module.css";
import { pm } from "./pmApi";
import toast from "../Toaster/toast";

// Tag palette editor for a project. Tags are simple name + colour
// pairs that tasks pull from. We keep a working copy in state and
// PUT the whole list on save - matches the backend setProjectTags
// endpoint which is an all-or-nothing replace.
const PRESET_COLORS = [
  "#4570B6", "#2563eb", "#16a34a", "#f59e0b", "#dc2626",
  "#a855f7", "#0ea5e9", "#ec4899", "#6b7280", "#0891b2",
];

export default function TagsManager({ project, canEdit, onChanged }) {
  const [tags, setTags] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setTags((project?.tags || []).map((t) => ({ ...t })));
  }, [project]);

  const add = () => setTags([...tags, { name: "new-tag", color: PRESET_COLORS[tags.length % PRESET_COLORS.length] }]);
  const remove = (i) => setTags(tags.filter((_, idx) => idx !== i));
  const patch = (i, field, value) => setTags(tags.map((t, idx) => (idx === i ? { ...t, [field]: value } : t)));

  const save = async () => {
    const cleaned = tags
      .map((t) => ({ name: String(t.name || "").trim(), color: t.color || "#4570B6" }))
      .filter((t) => t.name);
    setSaving(true);
    try {
      await pm.setTags(project._id, cleaned);
      toast.success("Tags saved");
      onChanged?.();
    } catch (err) {
      toast.error(err.message || "Failed to save tags");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className={styles.toolbarSingle}>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <strong style={{ fontSize: 14 }}>Tag palette</strong>
          <span className={styles.kpiHint}>
            Pick tags from here on any task on this project.
          </span>
        </div>
        {canEdit && (
          <div style={{ display: "flex", gap: 8 }}>
            <button className={styles.ghostBtn} onClick={add}><FaPlus /> Add tag</button>
            <button className={styles.primaryBtn} onClick={save} disabled={saving}>
              <FaSave /> {saving ? "Saving..." : "Save tags"}
            </button>
          </div>
        )}
      </div>

      {tags.length === 0 ? (
        <div className={styles.emptyState}>
          No tags yet. Add a few common labels like &quot;Bug&quot;, &quot;Research&quot;,
          &quot;Client review&quot; so tasks can be grouped at a glance.
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
          {tags.map((t, i) => (
            <div
              key={i}
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: 10,
                padding: 10,
                background: "white",
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span
                  className={styles.tagBadge}
                  style={{
                    background: `${t.color}14`,
                    color: t.color,
                    borderColor: `${t.color}40`,
                    flex: 1,
                  }}
                >
                  #{t.name || "..."}
                </span>
                {canEdit && (
                  <button className={styles.dangerBtn} onClick={() => remove(i)} title="Remove">
                    <FaTrash />
                  </button>
                )}
              </div>
              {canEdit && (
                <>
                  <input
                    className={styles.input}
                    value={t.name}
                    onChange={(e) => patch(i, "name", e.target.value)}
                  />
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {PRESET_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => patch(i, "color", c)}
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: "50%",
                          background: c,
                          border: t.color === c ? "2px solid #111827" : "2px solid white",
                          boxShadow: "0 0 0 1px #e5e7eb",
                          cursor: "pointer",
                        }}
                        title={c}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
