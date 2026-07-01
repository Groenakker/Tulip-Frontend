import React, { useEffect, useMemo, useRef, useState } from "react";
import { FaSave, FaInfoCircle, FaFilePdf, FaFileWord, FaFileExcel, FaSearch, FaEye, FaTimes, FaPlus } from "react-icons/fa";
import styles from "./VendorTemplatesTab.module.css";
import Select from "../../components/Select/Select";

// ============================================================
// Settings → Vendor Templates
// ------------------------------------------------------------
// Two jobs:
//   1. Assign exactly ONE print template to each vendor. When a
//      customer is chosen on a shipping log, only their assigned
//      template is offered (and printed).
//   2. For each template, choose which Sample-Submission field
//      (or a fixed value) fills every box on the form — so you
//      control the mapping instead of relying on our guesses.
// ============================================================

const API_BASE_URL = `${import.meta.env.VITE_BACKEND_URL}/api`;

const fetchJson = async (url, opts = {}) => {
  const res = await fetch(url, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
    ...opts,
  });
  const text = await res.text();
  let body;
  try { body = text ? JSON.parse(text) : null; } catch { body = { message: text }; }
  if (!res.ok) throw new Error(body?.message || `Request failed (${res.status})`);
  return body;
};

const STATIC_MODE = "__static__";

const outputIcon = (output) => {
  if (output === "docx") return <FaFileWord />;
  if (output === "xlsx") return <FaFileExcel />;
  return <FaFilePdf />;
};

// Searchable multi-vendor picker. Renders the currently
// assigned vendors as removable chips and a search box that
// opens a filtered dropdown of the remaining partners. Selecting
// one immediately calls `onAdd(partnerId)`; clicking a chip's X
// calls `onRemove(partnerId)`.
function VendorPicker({ partners, selectedIds, onAdd, onRemove, disabled, takenBy }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  // Close the panel when clicking anywhere outside.
  useEffect(() => {
    const onDocClick = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const byId = useMemo(() => {
    const m = new Map();
    for (const p of partners) m.set(p._id, p);
    return m;
  }, [partners]);

  const selectedSet = useMemo(() => new Set(selectedIds || []), [selectedIds]);

  const available = useMemo(() => {
    const q = query.trim().toLowerCase();
    return partners
      .filter((p) => !selectedSet.has(p._id))
      .filter((p) => {
        if (!q) return true;
        return (
          (p.name || "").toLowerCase().includes(q) ||
          (p.partnerNumber || "").toLowerCase().includes(q) ||
          (p.category || "").toLowerCase().includes(q)
        );
      })
      .slice(0, 50);
  }, [partners, selectedSet, query]);

  return (
    <div className={styles.picker} ref={rootRef}>
      <div className={styles.chipRow}>
        {selectedIds.length === 0 && (
          <span className={styles.chipEmpty}>No vendors assigned</span>
        )}
        {selectedIds.map((id) => {
          const p = byId.get(id);
          return (
            <span key={id} className={styles.chip}>
              {p?.name || id}
              {!disabled && (
                <button
                  type="button"
                  className={styles.chipX}
                  aria-label={`Remove ${p?.name || "vendor"}`}
                  onClick={() => onRemove(id)}
                >
                  <FaTimes />
                </button>
              )}
            </span>
          );
        })}
      </div>

      <div className={styles.searchBoxLine}>
        <FaSearch />
        <input
          className={styles.searchInput}
          placeholder="Search vendors to add…"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          disabled={disabled}
        />
      </div>

      {open && !disabled && (
        <div className={styles.dropdown}>
          {available.length === 0 ? (
            <div className={styles.dropdownEmpty}>
              {query ? "No matching vendors" : "All vendors already added"}
            </div>
          ) : (
            available.map((p) => {
              const taken = takenBy?.[p._id];
              return (
                <button
                  type="button"
                  key={p._id}
                  className={styles.dropdownItem}
                  onClick={() => { onAdd(p._id); setQuery(""); }}
                >
                  <span className={styles.dropdownName}>
                    <FaPlus className={styles.plusIcon} />
                    {p.name}
                  </span>
                  <span className={styles.dropdownMeta}>
                    {p.category && <span className={styles.dropdownCat}>{p.category}</span>}
                    {taken && (
                      <span className={styles.dropdownTaken} title={`Currently on ${taken}`}>
                        on “{taken}”
                      </span>
                    )}
                  </span>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

// Normalize one saved entry { source, static } → editor row.
// When the user has NOT saved an override for a slot, fall back
// to the slot's built-in auto-mapping (defaultSource, then
// defaultStatic). This is what makes the dropdown show the
// auto-mapped field selected so the operator can see what's
// wired in and only change rows they care about.
const entryToRow = (entry, slot) => {
  if (entry?.static) return { mode: STATIC_MODE, source: "", static: entry.static };
  if (entry?.source) return { mode: "source", source: entry.source, static: "" };
  if (slot?.defaultSource) return { mode: "source", source: slot.defaultSource, static: "" };
  if (slot?.defaultStatic) return { mode: STATIC_MODE, source: "", static: slot.defaultStatic };
  return { mode: "", source: "", static: "" };
};

// True when an editor row is currently sitting on the slot's
// built-in auto-mapping (so we can surface an "Auto" badge and
// skip persisting it as a redundant explicit override).
const rowMatchesAuto = (row, slot) => {
  if (!row || !slot) return false;
  if (row.mode === "source") return !!slot.defaultSource && row.source === slot.defaultSource;
  if (row.mode === STATIC_MODE) {
    return !!slot.defaultStatic && (row.static || "") === slot.defaultStatic;
  }
  return false;
};

export default function VendorTemplatesTab() {
  const [templates, setTemplates] = useState([]);
  const [sources, setSources] = useState([]);
  const [partners, setPartners] = useState([]);
  const [assignments, setAssignments] = useState({}); // partnerId -> templateKey
  const [fieldMaps, setFieldMaps] = useState({}); // templateKey -> { slot: {source, static} }

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [vendorOnly, setVendorOnly] = useState(true);
  const [savingTemplate, setSavingTemplate] = useState(null);

  const [selectedKey, setSelectedKey] = useState("");
  const [draft, setDraft] = useState({}); // slot -> {mode, source, static}
  const [savingMap, setSavingMap] = useState(false);
  const [mapMsg, setMapMsg] = useState("");
  const [previewing, setPreviewing] = useState(false);

  // ---- initial load ----
  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const [catalog, config] = await Promise.all([
          fetchJson(`${API_BASE_URL}/shipping-template-config/catalog`),
          fetchJson(`${API_BASE_URL}/shipping-template-config`),
        ]);
        if (!alive) return;
        const tpls = Array.isArray(catalog?.templates) ? catalog.templates : [];
        setTemplates(tpls);
        setSources(Array.isArray(catalog?.sources) ? catalog.sources : []);
        setPartners(Array.isArray(config?.partners) ? config.partners : []);
        setAssignments(config?.assignments || {});
        const maps = {};
        for (const c of config?.configs || []) maps[c.templateKey] = c.fieldMap || {};
        setFieldMaps(maps);
        if (tpls.length) setSelectedKey((k) => k || tpls[0].key);
      } catch (err) {
        if (alive) setError(err.message || "Failed to load");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  // ---- group the source dropdown options ----
  const sourceGroups = useMemo(() => {
    const groups = {};
    for (const s of sources) {
      (groups[s.group] = groups[s.group] || []).push(s);
    }
    return Object.entries(groups);
  }, [sources]);

  const selectedTemplate = useMemo(
    () => templates.find((t) => t.key === selectedKey) || null,
    [templates, selectedKey]
  );

  // Rebuild the editor draft whenever the selected template (or
  // its saved map) changes. Unsaved slots are seeded with their
  // built-in auto-mapping so the dropdown reflects what would
  // actually render.
  useEffect(() => {
    if (!selectedTemplate) { setDraft({}); return; }
    const saved = fieldMaps[selectedTemplate.key] || {};
    const next = {};
    for (const slot of selectedTemplate.slots || []) {
      next[slot.slot] = entryToRow(saved[slot.slot], slot);
    }
    setDraft(next);
    setMapMsg("");
  }, [selectedTemplate, fieldMaps]);

  // ---- assignment (template-first) ----
  // Persist the full vendor set for one template; the backend
  // moves any added vendor off whatever other template they were
  // on (one template per vendor stays enforced).
  const saveTemplateVendors = async (templateKey, nextIds) => {
    setSavingTemplate(templateKey);
    setError("");
    const prevAssignments = assignments;
    // Optimistic: rebuild assignments so other rows update too.
    setAssignments((prev) => {
      const next = { ...prev };
      for (const [pid, tk] of Object.entries(next)) {
        if (tk === templateKey && !nextIds.includes(pid)) delete next[pid];
      }
      for (const pid of nextIds) next[pid] = templateKey;
      return next;
    });
    try {
      const res = await fetchJson(
        `${API_BASE_URL}/shipping-template-config/${templateKey}/vendors`,
        { method: "PUT", body: JSON.stringify({ partnerIds: nextIds }) }
      );
      setAssignments(res?.assignments || {});
    } catch (err) {
      setAssignments(prevAssignments);
      setError(err.message || "Failed to update vendors");
    } finally {
      setSavingTemplate(null);
    }
  };

  // partnerId -> templateLabel for any partner currently on a
  // template OTHER than `excludeKey`. Used by the picker to warn
  // the user when adding a vendor will steal them away.
  const takenByMap = useMemo(() => {
    const labelByKey = Object.fromEntries(templates.map((t) => [t.key, t.label]));
    const out = {};
    for (const [pid, tk] of Object.entries(assignments)) {
      if (labelByKey[tk]) out[pid] = labelByKey[tk];
    }
    return out;
  }, [assignments, templates]);

  // Helpers for the picker's add/remove on a specific template.
  const addVendor = (templateKey, partnerId) => {
    const current = Object.entries(assignments)
      .filter(([, tk]) => tk === templateKey)
      .map(([pid]) => pid);
    if (current.includes(partnerId)) return;
    saveTemplateVendors(templateKey, [...current, partnerId]);
  };
  const removeVendor = (templateKey, partnerId) => {
    const current = Object.entries(assignments)
      .filter(([, tk]) => tk === templateKey)
      .map(([pid]) => pid);
    saveTemplateVendors(templateKey, current.filter((id) => id !== partnerId));
  };

  // ---- field-map editing ----
  const setRow = (slot, patch) =>
    setDraft((prev) => ({ ...prev, [slot]: { ...prev[slot], ...patch } }));

  // `slot` is the slot CATALOG object (not just the key) so we
  // can reset back to its auto-mapping when the user picks the
  // "Default" option from the dropdown.
  const onModeChange = (slot, value) => {
    const slotKey = slot.slot;
    if (value === STATIC_MODE) {
      setRow(slotKey, { mode: STATIC_MODE, source: "", static: slot.defaultStatic || "" });
    } else if (value === "") {
      setRow(slotKey, entryToRow(undefined, slot));
    } else {
      setRow(slotKey, { mode: "source", source: value, static: "" });
    }
  };

  const saveFieldMap = async () => {
    if (!selectedTemplate) return;
    setSavingMap(true);
    setMapMsg("");
    setError("");
    const slotById = Object.fromEntries(
      (selectedTemplate.slots || []).map((s) => [s.slot, s])
    );
    const fieldMap = {};
    for (const [slotKey, row] of Object.entries(draft)) {
      const slot = slotById[slotKey];
      // Auto-mapped rows are NOT persisted — leaving them out
      // lets the slot's built-in default keep working even if
      // we revise it in code later.
      if (rowMatchesAuto(row, slot)) continue;
      if (row.mode === "source" && row.source) fieldMap[slotKey] = { source: row.source, static: "" };
      else if (row.mode === STATIC_MODE && row.static) fieldMap[slotKey] = { source: "", static: row.static };
    }
    try {
      const res = await fetchJson(
        `${API_BASE_URL}/shipping-template-config/${selectedTemplate.key}`,
        { method: "PUT", body: JSON.stringify({ fieldMap }) }
      );
      setFieldMaps((prev) => ({ ...prev, [selectedTemplate.key]: res?.fieldMap || {} }));
      setMapMsg("Saved");
      setTimeout(() => setMapMsg(""), 2500);
    } catch (err) {
      setError(err.message || "Failed to save field map");
    } finally {
      setSavingMap(false);
    }
  };

  // Wipe every saved override for the current template so each
  // slot returns to its built-in auto-mapping. Useful when the
  // slot defaults have been revised in code (e.g. the BV TRF
  // Applicant block now sources from Settings → Company instead
  // of the customer) and old overrides are still being honored.
  const resetFieldMap = async () => {
    if (!selectedTemplate) return;
    if (
      typeof window !== "undefined" &&
      !window.confirm(
        `Reset every field on "${selectedTemplate.label}" back to its auto-mapped source? Your saved overrides for this template will be cleared.`
      )
    ) {
      return;
    }
    setSavingMap(true);
    setMapMsg("");
    setError("");
    try {
      const res = await fetchJson(
        `${API_BASE_URL}/shipping-template-config/${selectedTemplate.key}`,
        { method: "PUT", body: JSON.stringify({ fieldMap: {} }) }
      );
      setFieldMaps((prev) => ({ ...prev, [selectedTemplate.key]: res?.fieldMap || {} }));
      // Reseed the editor draft from the (now empty) saved map
      // so every row immediately shows its default again.
      const next = {};
      for (const slot of selectedTemplate.slots || []) {
        next[slot.slot] = entryToRow(undefined, slot);
      }
      setDraft(next);
      setMapMsg("Reset to auto");
      setTimeout(() => setMapMsg(""), 2500);
    } catch (err) {
      setError(err.message || "Failed to reset field map");
    } finally {
      setSavingMap(false);
    }
  };

  // ---- blank preview (no data) ----
  // Renders the selected template with empty fields so you can
  // see the form layout while mapping. PDFs open in a new tab;
  // Word/Excel can't preview inline so they download instead.
  const previewTemplate = async () => {
    if (!selectedTemplate) return;
    setPreviewing(true);
    setError("");
    try {
      const res = await fetch(
        `${API_BASE_URL}/shipping-template-config/${selectedTemplate.key}/preview`,
        { credentials: "include" }
      );
      if (!res.ok) {
        const text = await res.text();
        let msg = `Preview failed (${res.status})`;
        try { msg = JSON.parse(text)?.message || msg; } catch { /* keep default */ }
        throw new Error(msg);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      if (blob.type === "application/pdf") {
        window.open(url, "_blank", "noopener,noreferrer");
      } else {
        const a = document.createElement("a");
        a.href = url;
        a.download = res.headers.get("X-Filled-Filename") || `${selectedTemplate.key}-blank`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (err) {
      setError(err.message || "Failed to preview template");
    } finally {
      setPreviewing(false);
    }
  };

  // ---- the partner pool the pickers can choose from ----
  // Defaults to vendor-category partners; toggle reveals every
  // partner (e.g. customers a tenant has misfiled as customers).
  const pickerPartners = useMemo(() => {
    if (!vendorOnly) return partners;
    return partners.filter((p) => /vendor/i.test(p.category || ""));
  }, [partners, vendorOnly]);

  // For each template key → the partnerIds currently assigned.
  const assignedByTemplate = useMemo(() => {
    const out = {};
    for (const t of templates) out[t.key] = [];
    for (const [pid, tk] of Object.entries(assignments)) {
      if (out[tk]) out[tk].push(pid);
    }
    return out;
  }, [assignments, templates]);

  // Slots grouped by their `group` for the editor.
  const slotGroups = useMemo(() => {
    if (!selectedTemplate) return [];
    const groups = {};
    for (const s of selectedTemplate.slots || []) {
      (groups[s.group] = groups[s.group] || []).push(s);
    }
    return Object.entries(groups);
  }, [selectedTemplate]);

  if (loading) return <div className={styles.loading}>Loading vendor templates…</div>;

  return (
    <div className={styles.wrap}>
      <div className={styles.intro}>
        <h2>Vendor Templates</h2>
        <p>
          For each print template, pick the vendors it should be used for, and control
          which sample field fills every box on the form. When you pick one of those
          vendors as the customer on a shipping log, only this template is offered —
          and printed with the mapping you set here.
        </p>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {/* ---------- Section 1: vendors per template ---------- */}
      <section className={styles.card}>
        <div className={styles.cardHead}>
          <h3>1. Assign vendors to templates</h3>
          <div className={styles.cardTools}>
            <label className={styles.checkLabel}>
              <input
                type="checkbox"
                checked={vendorOnly}
                onChange={(e) => setVendorOnly(e.target.checked)}
              />
              Vendors only
            </label>
          </div>
        </div>

        {templates.length === 0 ? (
          <p className={styles.muted}>No templates available.</p>
        ) : (
          <div className={styles.tplList}>
            {templates.map((t) => {
              const ids = assignedByTemplate[t.key] || [];
              // Other-template assignments are surfaced as hints
              // in the dropdown so the user knows adding will
              // move a vendor off its current template.
              const takenForThisRow = Object.fromEntries(
                Object.entries(takenByMap).filter(([, label]) => label !== t.label)
              );
              return (
                <div key={t.key} className={styles.tplRow}>
                  <div className={styles.tplCol}>
                    <div className={styles.tplLabel}>
                      <span className={styles.outBadge}>
                        {outputIcon(t.output)}
                        {String(t.output || "pdf").toUpperCase()}
                      </span>
                      <span className={styles.tplName}>{t.label}</span>
                    </div>
                    {t.vendor && <div className={styles.subtle}>{t.vendor}</div>}
                  </div>
                  <div className={styles.tplPickerCol}>
                    <VendorPicker
                      partners={pickerPartners}
                      selectedIds={ids}
                      onAdd={(pid) => addVendor(t.key, pid)}
                      onRemove={(pid) => removeVendor(t.key, pid)}
                      disabled={savingTemplate === t.key}
                      takenBy={takenForThisRow}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <p className={styles.helperText}>
          A vendor only ever belongs to <strong>one</strong> template. Adding a vendor here
          automatically removes them from any other template they were on.
        </p>
      </section>

      {/* ---------- Section 2: field mapping ---------- */}
      <section className={styles.card}>
        <div className={styles.cardHead}>
          <h3>2. Field mapping</h3>
          <div className={styles.cardTools}>
            <Select
              className={styles.select}
              value={selectedKey}
              onChange={(e) => setSelectedKey(e.target.value)}
            >
              {templates.map((t) => (
                <option key={t.key} value={t.key}>{t.label}</option>
              ))}
            </Select>
            <button
              type="button"
              className={styles.previewBtn}
              onClick={previewTemplate}
              disabled={!selectedTemplate || previewing}
              title="Open the blank template (no sample data) so you can see the form layout"
            >
              <FaEye />
              {previewing ? "Opening…" : "Preview blank"}
            </button>
          </div>
        </div>

        {selectedTemplate && (
          <>
            <div className={styles.tplMeta}>
              <span className={styles.outBadge}>
                {outputIcon(selectedTemplate.output)}
                {String(selectedTemplate.output || "pdf").toUpperCase()}
              </span>
              <span className={styles.subtle}>{selectedTemplate.vendor}</span>
            </div>

            <div className={styles.hint}>
              <FaInfoCircle />
              <span>
                Every field is <strong>auto-mapped</strong> by default — only change the rows
                you want different. Pick another sample field to override, choose
                <strong> Fixed value…</strong> to type a constant, or pick <strong>Use auto-map</strong> to
                revert.
              </span>
            </div>

            {slotGroups.map(([group, slots]) => (
              <div key={group} className={styles.slotGroup}>
                <h4 className={styles.groupTitle}>{group}</h4>
                {slots.map((slot) => {
                  const row = draft[slot.slot] || { mode: "", source: "", static: "" };
                  const selectValue = row.mode === STATIC_MODE ? STATIC_MODE : row.source || "";
                  const isAuto = rowMatchesAuto(row, slot);
                  return (
                    <div key={slot.slot} className={styles.slotRow}>
                      <div className={styles.slotLabel}>
                        <span>
                          {slot.label}
                          {isAuto && <span className={styles.autoBadge}>Auto</span>}
                        </span>
                        {!isAuto && slot.defaultLabel && (
                          <span className={styles.defaultHint}>Auto-map: {slot.defaultLabel}</span>
                        )}
                      </div>
                      <div className={styles.slotControl}>
                        <Select
                          className={styles.select}
                          value={selectValue}
                          onChange={(e) => onModeChange(slot, e.target.value)}
                        >
                          <option value="">Use auto-map</option>
                          <option value={STATIC_MODE}>Fixed value…</option>
                          {sourceGroups.map(([g, items]) => (
                            <optgroup key={g} label={g}>
                              {items.map((s) => (
                                <option key={s.key} value={s.key}>{s.label}</option>
                              ))}
                            </optgroup>
                          ))}
                        </Select>
                        {row.mode === STATIC_MODE && (
                          <input
                            className={styles.staticInput}
                            placeholder="Fixed text"
                            value={row.static}
                            onChange={(e) => setRow(slot.slot, { static: e.target.value })}
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}

            <div className={styles.saveBar}>
              {mapMsg && <span className={styles.savedMsg}>{mapMsg}</span>}
              <button
                type="button"
                className={styles.resetBtn}
                onClick={resetFieldMap}
                disabled={savingMap}
                title="Discard all saved overrides for this template and use the built-in auto-mapping for every field."
              >
                Reset to auto-defaults
              </button>
              <button className={styles.saveBtn} onClick={saveFieldMap} disabled={savingMap}>
                <FaSave />
                {savingMap ? "Saving…" : "Save field mapping"}
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
