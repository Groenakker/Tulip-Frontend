import React, { useMemo, useState } from "react";
import {
  FaTimes,
  FaPlus,
  FaTrash,
  FaArrowUp,
  FaArrowDown,
  FaHeading,
  FaFont,
  FaParagraph,
  FaHashtag,
  FaCalendar,
  FaCaretDown,
  FaDotCircle,
  FaCheckSquare,
  FaListUl,
  FaToggleOn,
  FaPenNib,
  FaMinus,
  FaEye,
  FaPencilAlt,
  FaCopy,
  FaSave,
} from "react-icons/fa";
import styles from "./FormBuilder.module.css";

// ----------------------------------------------------------------
// Form Builder
//
// Standalone fullscreen modal that lets an admin re-create a
// customer's form (TRF / PCF / etc.) as a structured template
// composed of sections and typed fields.
//
// The component is presentation-only for now — it manages its
// schema in local state and hands the final object back via
// `onSave(template)`. Persistence (POST /api/form-templates) will
// be wired in once the backend route lands; for now Save logs the
// template and closes the modal so the UI is fully testable.
//
// Props:
//   open               - controls visibility
//   onClose()          - called when user closes / cancels
//   onSave(template)   - called with the final template object
//   bPartnerName       - optional, shown in the header for context
//   initialTemplate    - optional, edit an existing template
// ----------------------------------------------------------------

const CATEGORIES = [
  "Test Request Form",
  "TIDS",
  "PCF",
  "MSDS",
  "COA",
  "Specification",
  "Other",
];

// Field-type catalog. Each entry knows how to render its preview
// inside the canvas and which property editors to show.
const FIELD_TYPES = [
  { type: "heading", label: "Heading", icon: <FaHeading />, group: "layout" },
  { type: "divider", label: "Divider", icon: <FaMinus />, group: "layout" },
  { type: "text", label: "Text", icon: <FaFont />, group: "input" },
  { type: "textarea", label: "Long Text", icon: <FaParagraph />, group: "input" },
  { type: "number", label: "Number", icon: <FaHashtag />, group: "input" },
  { type: "date", label: "Date", icon: <FaCalendar />, group: "input" },
  { type: "select", label: "Dropdown", icon: <FaCaretDown />, group: "choice" },
  { type: "radio", label: "Radio", icon: <FaDotCircle />, group: "choice" },
  { type: "checkbox", label: "Checkbox", icon: <FaCheckSquare />, group: "choice" },
  { type: "checkboxGroup", label: "Checkbox Group", icon: <FaListUl />, group: "choice" },
  { type: "yesno", label: "Yes / No", icon: <FaToggleOn />, group: "choice" },
  { type: "signature", label: "Signature", icon: <FaPenNib />, group: "advanced" },
];

const TYPES_WITH_OPTIONS = new Set(["select", "radio", "checkboxGroup"]);
const TYPES_WITHOUT_LABEL_INPUT = new Set(["divider"]);
const LAYOUT_TYPES = new Set(["heading", "divider"]);

// Crockford-ish base36 id generator. Globally unique enough for
// in-memory schema editing; the backend will assign Mongo _ids on
// publish.
const makeId = () =>
  `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

// Convert a human label into a stable camelCase key. Mirrors the
// approach used by the BP document scanner so that keys generated
// here line up with what Sample.customFields[].key already
// contains for adopted scanner candidates.
const normalizeKey = (label) => {
  if (!label) return "";
  const cleaned = label
    .toString()
    .replace(/[^a-zA-Z0-9 _-]+/g, " ")
    .trim()
    .toLowerCase();
  if (!cleaned) return "";
  const parts = cleaned.split(/[\s_-]+/).filter(Boolean);
  return parts
    .map((p, i) => (i === 0 ? p : p[0].toUpperCase() + p.slice(1)))
    .join("");
};

const defaultFieldFor = (type) => {
  const base = {
    id: makeId(),
    type,
    label: "",
    key: "",
    helpText: "",
    placeholder: "",
    required: false,
    width: "full", // full | half | third
  };

  switch (type) {
    case "heading":
      return { ...base, label: "Section heading" };
    case "divider":
      return { ...base, label: "Divider" };
    case "text":
      return { ...base, label: "Text field" };
    case "textarea":
      return { ...base, label: "Long text" };
    case "number":
      return { ...base, label: "Number" };
    case "date":
      return { ...base, label: "Date" };
    case "select":
      return { ...base, label: "Dropdown", options: ["Option 1", "Option 2"] };
    case "radio":
      return { ...base, label: "Choose one", options: ["Option 1", "Option 2"] };
    case "checkbox":
      return { ...base, label: "Acknowledge" };
    case "checkboxGroup":
      return {
        ...base,
        label: "Choose any",
        options: ["Option 1", "Option 2", "Option 3"],
      };
    case "yesno":
      return { ...base, label: "Yes or No" };
    case "signature":
      return { ...base, label: "Signature" };
    default:
      return { ...base, label: "Field" };
  }
};

const newSection = (title = "Untitled section") => ({
  id: makeId(),
  title,
  columns: 1,
  fields: [],
});

const buildInitialTemplate = (initial) => {
  if (initial) {
    return {
      name: initial.name || "",
      category: initial.category || "Test Request Form",
      sections:
        Array.isArray(initial.sections) && initial.sections.length > 0
          ? initial.sections
          : [newSection("General")],
    };
  }
  return {
    name: "",
    category: "Test Request Form",
    sections: [newSection("General")],
  };
};

export default function FormBuilder({
  open,
  onClose,
  onSave,
  bPartnerName,
  initialTemplate,
}) {
  const [template, setTemplate] = useState(() =>
    buildInitialTemplate(initialTemplate)
  );
  const [activeSectionId, setActiveSectionId] = useState(
    () => template.sections[0]?.id || null
  );
  const [selectedFieldId, setSelectedFieldId] = useState(null);
  const [previewMode, setPreviewMode] = useState(false);

  // Drag-and-drop state.
  //   dragState  : the field currently being dragged (sectionId + fieldId)
  //   dropTarget : where the drop will land if released right now.
  //                For field targets we capture which edge zone the
  //                pointer is over (top/bottom/left/right). Left/right
  //                doubles as the "side-by-side" trigger that
  //                auto-bumps the destination section to >=2 columns.
  const [dragState, setDragState] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);

  // ---------------- helpers --------------------------------------
  const updateTemplate = (mutator) => setTemplate((prev) => mutator(prev));

  const updateSection = (sectionId, mutator) =>
    updateTemplate((tpl) => ({
      ...tpl,
      sections: tpl.sections.map((s) =>
        s.id === sectionId ? mutator(s) : s
      ),
    }));

  const updateField = (sectionId, fieldId, mutator) =>
    updateSection(sectionId, (s) => ({
      ...s,
      fields: s.fields.map((f) => (f.id === fieldId ? mutator(f) : f)),
    }));

  const findField = (fieldId) => {
    for (const s of template.sections) {
      const f = s.fields.find((x) => x.id === fieldId);
      if (f) return { section: s, field: f };
    }
    return null;
  };

  // ---------------- mutations ------------------------------------
  const addField = (type) => {
    const field = defaultFieldFor(type);
    field.key = normalizeKey(field.label);

    let targetSectionId = activeSectionId;
    if (!targetSectionId && template.sections.length > 0) {
      targetSectionId = template.sections[template.sections.length - 1].id;
    }
    if (!targetSectionId) {
      // No sections exist yet — auto-create one.
      const s = newSection("General");
      s.fields.push(field);
      updateTemplate((tpl) => ({ ...tpl, sections: [s] }));
      setActiveSectionId(s.id);
      setSelectedFieldId(field.id);
      return;
    }

    updateSection(targetSectionId, (s) => ({
      ...s,
      fields: [...s.fields, field],
    }));
    setActiveSectionId(targetSectionId);
    setSelectedFieldId(field.id);
  };

  const moveField = (sectionId, fieldId, dir) => {
    updateSection(sectionId, (s) => {
      const idx = s.fields.findIndex((f) => f.id === fieldId);
      if (idx < 0) return s;
      const next = [...s.fields];
      const swap = dir === "up" ? idx - 1 : idx + 1;
      if (swap < 0 || swap >= next.length) return s;
      [next[idx], next[swap]] = [next[swap], next[idx]];
      return { ...s, fields: next };
    });
  };

  const duplicateField = (sectionId, fieldId) => {
    updateSection(sectionId, (s) => {
      const idx = s.fields.findIndex((f) => f.id === fieldId);
      if (idx < 0) return s;
      const copy = {
        ...s.fields[idx],
        id: makeId(),
        label: `${s.fields[idx].label} (copy)`,
        key: `${s.fields[idx].key || normalizeKey(s.fields[idx].label)}Copy`,
      };
      const next = [...s.fields];
      next.splice(idx + 1, 0, copy);
      return { ...s, fields: next };
    });
  };

  const deleteField = (sectionId, fieldId) => {
    updateSection(sectionId, (s) => ({
      ...s,
      fields: s.fields.filter((f) => f.id !== fieldId),
    }));
    setSelectedFieldId((cur) => (cur === fieldId ? null : cur));
  };

  const addSection = () => {
    const s = newSection(`Section ${template.sections.length + 1}`);
    updateTemplate((tpl) => ({ ...tpl, sections: [...tpl.sections, s] }));
    setActiveSectionId(s.id);
    setSelectedFieldId(null);
  };

  const deleteSection = (sectionId) => {
    if (template.sections.length === 1) {
      // Always keep at least one section so the canvas isn't empty.
      updateTemplate((tpl) => ({
        ...tpl,
        sections: [{ ...tpl.sections[0], fields: [], title: "General" }],
      }));
      setSelectedFieldId(null);
      return;
    }
    updateTemplate((tpl) => ({
      ...tpl,
      sections: tpl.sections.filter((s) => s.id !== sectionId),
    }));
    setActiveSectionId((cur) =>
      cur === sectionId
        ? template.sections.find((s) => s.id !== sectionId)?.id || null
        : cur
    );
    setSelectedFieldId(null);
  };

  const moveSection = (sectionId, dir) => {
    updateTemplate((tpl) => {
      const idx = tpl.sections.findIndex((s) => s.id === sectionId);
      if (idx < 0) return tpl;
      const swap = dir === "up" ? idx - 1 : idx + 1;
      if (swap < 0 || swap >= tpl.sections.length) return tpl;
      const next = [...tpl.sections];
      [next[idx], next[swap]] = [next[swap], next[idx]];
      return { ...tpl, sections: next };
    });
  };

  // ---------------- drag and drop --------------------------------
  // Computes which zone of the target field the pointer is over.
  // 25% on each side -> "left" / "right" (side-by-side drop).
  // Remaining centre -> "top" / "bottom" depending on vertical half.
  const computeZone = (clientX, clientY, rect) => {
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const w = rect.width;
    const h = rect.height;
    if (x < w * 0.25) return "left";
    if (x > w * 0.75) return "right";
    return y < h / 2 ? "top" : "bottom";
  };

  const handleFieldDragStart = (sectionId, fieldId) => (e) => {
    setDragState({ sectionId, fieldId });
    setSelectedFieldId(fieldId);
    e.dataTransfer.effectAllowed = "move";
    // Some browsers (Firefox) refuse to start a drag without data.
    try {
      e.dataTransfer.setData("text/plain", fieldId);
    } catch {
      /* ignore */
    }
  };

  const handleFieldDragOver = (sectionId, fieldId) => (e) => {
    if (!dragState) return;
    e.preventDefault();
    e.stopPropagation();
    if (dragState.fieldId === fieldId) {
      // Don't paint a drop indicator on the source itself.
      if (dropTarget) setDropTarget(null);
      return;
    }
    e.dataTransfer.dropEffect = "move";
    const rect = e.currentTarget.getBoundingClientRect();
    const zone = computeZone(e.clientX, e.clientY, rect);
    if (
      !dropTarget ||
      dropTarget.fieldId !== fieldId ||
      dropTarget.zone !== zone ||
      dropTarget.sectionId !== sectionId
    ) {
      setDropTarget({ sectionId, fieldId, zone });
    }
  };

  const handleFieldDrop = (sectionId, fieldId) => (e) => {
    if (!dragState) return;
    e.preventDefault();
    e.stopPropagation();
    if (dragState.fieldId === fieldId) {
      setDragState(null);
      setDropTarget(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const zone = computeZone(e.clientX, e.clientY, rect);
    performDrop({ sectionId, fieldId, zone });
    setDragState(null);
    setDropTarget(null);
  };

  const handleSectionAppendDragOver = (sectionId) => (e) => {
    if (!dragState) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (
      !dropTarget ||
      dropTarget.zone !== "append" ||
      dropTarget.sectionId !== sectionId
    ) {
      setDropTarget({ sectionId, zone: "append" });
    }
  };

  const handleSectionAppendDrop = (sectionId) => (e) => {
    if (!dragState) return;
    e.preventDefault();
    performDrop({ sectionId, zone: "append" });
    setDragState(null);
    setDropTarget(null);
  };

  const handleDragEnd = () => {
    setDragState(null);
    setDropTarget(null);
  };

  const performDrop = (target) => {
    setTemplate((tpl) => {
      // Deep copy of sections + their fields arrays so we can splice
      // safely without mutating React state directly.
      const sections = tpl.sections.map((s) => ({
        ...s,
        fields: [...s.fields],
      }));

      const srcSection = sections.find((s) => s.id === dragState.sectionId);
      if (!srcSection) return tpl;
      const removeIdx = srcSection.fields.findIndex(
        (f) => f.id === dragState.fieldId
      );
      if (removeIdx < 0) return tpl;
      const [dragged] = srcSection.fields.splice(removeIdx, 1);

      const destSection = sections.find((s) => s.id === target.sectionId);
      if (!destSection) return tpl;

      if (target.zone === "append") {
        destSection.fields.push(dragged);
        return { ...tpl, sections };
      }

      const targetIdx = destSection.fields.findIndex(
        (f) => f.id === target.fieldId
      );
      if (targetIdx < 0) {
        destSection.fields.push(dragged);
        return { ...tpl, sections };
      }

      if (target.zone === "top") {
        destSection.fields.splice(targetIdx, 0, dragged);
      } else if (target.zone === "bottom") {
        destSection.fields.splice(targetIdx + 1, 0, dragged);
      } else if (target.zone === "left" || target.zone === "right") {
        // Side-by-side drop. Auto-bump section to >=2 columns and
        // set both fields to half-width so the grid actually
        // arranges them next to each other.
        destSection.columns = Math.max(destSection.columns || 1, 2);
        destSection.fields[targetIdx] = {
          ...destSection.fields[targetIdx],
          width: "half",
        };
        const insertAt = target.zone === "left" ? targetIdx : targetIdx + 1;
        destSection.fields.splice(insertAt, 0, { ...dragged, width: "half" });
      }

      return { ...tpl, sections };
    });
  };

  // ---------------- save -----------------------------------------
  const handleSave = () => {
    if (!template.name.trim()) {
      // Lightweight inline validation — toast/parent handles the
      // real persistence error path.
      alert("Please enter a form name before saving.");
      return;
    }
    // Hand off the schema to the parent. Backend persistence will
    // hook in here once /api/form-templates lands.
    onSave?.(template);
  };

  const selected = useMemo(() => {
    if (!selectedFieldId) return null;
    return findField(selectedFieldId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFieldId, template]);

  if (!open) return null;

  // ---------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------
  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        {/* Top bar */}
        <div className={styles.topBar}>
          <div className={styles.topLeft}>
            <div className={styles.topTitle}>Form Builder</div>
            <div className={styles.topInputs}>
              <input
                className={styles.nameInput}
                placeholder="Form name (e.g. Bureau Veritas Medical TRF V8)"
                value={template.name}
                onChange={(e) =>
                  updateTemplate((tpl) => ({ ...tpl, name: e.target.value }))
                }
              />
              <select
                className={styles.categorySelect}
                value={template.category}
                onChange={(e) =>
                  updateTemplate((tpl) => ({ ...tpl, category: e.target.value }))
                }
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className={styles.topRight}>
            {bPartnerName && (
              <span className={styles.propsType}>BP: {bPartnerName}</span>
            )}
            <button
              type="button"
              className={styles.btn}
              onClick={() => setPreviewMode((p) => !p)}
              title={previewMode ? "Back to editor" : "Preview the form"}
            >
              {previewMode ? <FaPencilAlt /> : <FaEye />}
              {previewMode ? "Edit" : "Preview"}
            </button>
            <button
              type="button"
              className={`${styles.btn} ${styles.btnPrimary}`}
              onClick={handleSave}
              title="Save form template"
            >
              <FaSave />
              Save
            </button>
            <button
              type="button"
              className={styles.btnGhost}
              onClick={onClose}
              aria-label="Close form builder"
            >
              <FaTimes />
            </button>
          </div>
        </div>

        {/* Body */}
        {previewMode ? (
          <PreviewPane template={template} />
        ) : (
          <div className={styles.body}>
            <Palette onAdd={addField} />

            <div className={styles.canvas}>
              <div className={styles.canvasInner}>
                <div className={styles.canvasHeader}>
                  <div className={styles.canvasFormName}>
                    {template.name || "Untitled form"}
                  </div>
                  <div className={styles.canvasFormMeta}>
                    {template.category}
                    {bPartnerName ? ` · ${bPartnerName}` : ""}
                  </div>
                </div>

                {template.sections.map((section, sIdx) => (
                  <SectionEditor
                    key={section.id}
                    section={section}
                    isActive={section.id === activeSectionId}
                    isFirst={sIdx === 0}
                    isLast={sIdx === template.sections.length - 1}
                    selectedFieldId={selectedFieldId}
                    dragState={dragState}
                    dropTarget={dropTarget}
                    onActivate={() => setActiveSectionId(section.id)}
                    onChangeTitle={(title) =>
                      updateSection(section.id, (s) => ({ ...s, title }))
                    }
                    onChangeColumns={(columns) =>
                      updateSection(section.id, (s) => ({ ...s, columns }))
                    }
                    onSelectField={(fid) => {
                      setActiveSectionId(section.id);
                      setSelectedFieldId(fid);
                    }}
                    onMoveField={(fid, dir) => moveField(section.id, fid, dir)}
                    onDuplicateField={(fid) => duplicateField(section.id, fid)}
                    onDeleteField={(fid) => deleteField(section.id, fid)}
                    onMoveSection={(dir) => moveSection(section.id, dir)}
                    onDeleteSection={() => deleteSection(section.id)}
                    onFieldDragStart={handleFieldDragStart}
                    onFieldDragOver={handleFieldDragOver}
                    onFieldDrop={handleFieldDrop}
                    onDragEnd={handleDragEnd}
                    onSectionAppendDragOver={handleSectionAppendDragOver(
                      section.id
                    )}
                    onSectionAppendDrop={handleSectionAppendDrop(section.id)}
                  />
                ))}

                <button
                  type="button"
                  className={styles.addSectionBtn}
                  onClick={addSection}
                >
                  <FaPlus /> Add section
                </button>
              </div>
            </div>

            <PropertiesPanel
              selected={selected}
              onChange={(patch) => {
                if (!selected) return;
                updateField(selected.section.id, selected.field.id, (f) => ({
                  ...f,
                  ...patch,
                }));
              }}
              onAutoKeyFromLabel={() => {
                if (!selected) return;
                updateField(selected.section.id, selected.field.id, (f) => ({
                  ...f,
                  key: normalizeKey(f.label),
                }));
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ================================================================
// Palette
// ================================================================
function Palette({ onAdd }) {
  const groups = useMemo(() => {
    const order = ["layout", "input", "choice", "advanced"];
    const labels = {
      layout: "Layout",
      input: "Input",
      choice: "Choice",
      advanced: "Advanced",
    };
    return order.map((g) => ({
      key: g,
      label: labels[g],
      items: FIELD_TYPES.filter((f) => f.group === g),
    }));
  }, []);

  return (
    <div className={styles.palette}>
      <div className={styles.paletteHint}>
        Click any field to add it to the active section.
      </div>
      {groups.map((g) => (
        <div key={g.key}>
          <div className={styles.paletteSectionTitle}>{g.label}</div>
          <div className={styles.paletteGrid}>
            {g.items.map((it) => (
              <button
                key={it.type}
                type="button"
                className={styles.paletteItem}
                onClick={() => onAdd(it.type)}
                title={`Add ${it.label}`}
              >
                <span className={styles.paletteIcon}>{it.icon}</span>
                <span>{it.label}</span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ================================================================
// Section editor
// ================================================================
function SectionEditor({
  section,
  isActive,
  isFirst,
  isLast,
  selectedFieldId,
  dragState,
  dropTarget,
  onActivate,
  onChangeTitle,
  onChangeColumns,
  onSelectField,
  onMoveField,
  onDuplicateField,
  onDeleteField,
  onMoveSection,
  onDeleteSection,
  onFieldDragStart,
  onFieldDragOver,
  onFieldDrop,
  onDragEnd,
  onSectionAppendDragOver,
  onSectionAppendDrop,
}) {
  const gridClass =
    section.columns === 3
      ? styles.fieldsGrid3
      : section.columns === 2
      ? styles.fieldsGrid2
      : styles.fieldsGrid1;

  const emptyDropActive =
    dragState && dropTarget?.zone === "append" && dropTarget?.sectionId === section.id;

  return (
    <div
      className={styles.section}
      onMouseDown={onActivate}
      style={isActive ? { borderColor: "rgb(69, 112, 182)" } : undefined}
    >
      <div className={styles.sectionHead}>
        <input
          className={styles.sectionTitle}
          value={section.title}
          onChange={(e) => onChangeTitle(e.target.value)}
          placeholder="Section title"
        />
        <select
          className={styles.sectionColumns}
          value={section.columns}
          onChange={(e) => onChangeColumns(Number(e.target.value))}
          title="Number of columns in this section"
        >
          <option value={1}>1 column</option>
          <option value={2}>2 columns</option>
          <option value={3}>3 columns</option>
        </select>
        <button
          type="button"
          className={styles.iconBtn}
          onClick={() => onMoveSection("up")}
          disabled={isFirst}
          title="Move section up"
        >
          <FaArrowUp />
        </button>
        <button
          type="button"
          className={styles.iconBtn}
          onClick={() => onMoveSection("down")}
          disabled={isLast}
          title="Move section down"
        >
          <FaArrowDown />
        </button>
        <button
          type="button"
          className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
          onClick={onDeleteSection}
          title="Delete section"
        >
          <FaTrash />
        </button>
      </div>

      {section.fields.length === 0 ? (
        <div
          className={`${styles.emptySection} ${
            emptyDropActive ? styles.emptyDropActive : ""
          }`}
          onDragOver={onSectionAppendDragOver}
          onDrop={onSectionAppendDrop}
        >
          {dragState
            ? "Drop the field here"
            : "Click a field type on the left to add it here."}
        </div>
      ) : (
        <div className={`${styles.fieldsGrid} ${gridClass}`}>
          {section.fields.map((field, fIdx) => {
            const isDragging =
              dragState?.fieldId === field.id;
            const dropZone =
              dropTarget?.fieldId === field.id &&
              dropTarget?.sectionId === section.id
                ? dropTarget.zone
                : null;
            return (
              <FieldCard
                key={field.id}
                field={field}
                isSelected={field.id === selectedFieldId}
                isFirst={fIdx === 0}
                isLast={fIdx === section.fields.length - 1}
                isDragging={isDragging}
                dropZone={dropZone}
                onSelect={() => onSelectField(field.id)}
                onMove={(dir) => onMoveField(field.id, dir)}
                onDuplicate={() => onDuplicateField(field.id)}
                onDelete={() => onDeleteField(field.id)}
                onDragStart={onFieldDragStart(section.id, field.id)}
                onDragOver={onFieldDragOver(section.id, field.id)}
                onDrop={onFieldDrop(section.id, field.id)}
                onDragEnd={onDragEnd}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

// ================================================================
// Field card (canvas preview tile)
// ================================================================
function FieldCard({
  field,
  isSelected,
  isFirst,
  isLast,
  isDragging,
  dropZone, // null | "top" | "bottom" | "left" | "right"
  onSelect,
  onMove,
  onDuplicate,
  onDelete,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}) {
  const isFullWidth =
    field.width === "full" || LAYOUT_TYPES.has(field.type);

  // Drop indicator class. CSS draws a coloured line on the
  // matching edge so the user can see exactly where the dragged
  // field will land before they release.
  const dropClass =
    dropZone === "top"
      ? styles.dropTop
      : dropZone === "bottom"
      ? styles.dropBottom
      : dropZone === "left"
      ? styles.dropLeft
      : dropZone === "right"
      ? styles.dropRight
      : "";

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      className={[
        styles.field,
        isSelected ? styles.fieldSelected : "",
        isFullWidth ? styles.fieldFullWidth : "",
        isDragging ? styles.fieldDragging : "",
        dropClass,
      ]
        .filter(Boolean)
        .join(" ")}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
    >
      <div className={styles.fieldHead}>
        <div className={styles.fieldLabel}>
          {!TYPES_WITHOUT_LABEL_INPUT.has(field.type) && (
            <>
              {field.label || <em style={{ color: "#9ca3af" }}>Untitled</em>}
              {field.required && <span className={styles.required}>*</span>}
            </>
          )}
          {TYPES_WITHOUT_LABEL_INPUT.has(field.type) && (
            <span style={{ color: "#9ca3af", fontWeight: 500 }}>
              {field.type === "divider" ? "Divider" : field.label}
            </span>
          )}
        </div>
        <div className={styles.fieldActions}>
          <button
            type="button"
            className={styles.iconBtn}
            onClick={(e) => {
              e.stopPropagation();
              onMove("up");
            }}
            disabled={isFirst}
            title="Move up"
          >
            <FaArrowUp />
          </button>
          <button
            type="button"
            className={styles.iconBtn}
            onClick={(e) => {
              e.stopPropagation();
              onMove("down");
            }}
            disabled={isLast}
            title="Move down"
          >
            <FaArrowDown />
          </button>
          <button
            type="button"
            className={styles.iconBtn}
            onClick={(e) => {
              e.stopPropagation();
              onDuplicate();
            }}
            title="Duplicate"
          >
            <FaCopy />
          </button>
          <button
            type="button"
            className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            title="Delete"
          >
            <FaTrash />
          </button>
        </div>
      </div>

      <FieldPreview field={field} />
    </div>
  );
}

function FieldPreview({ field }) {
  switch (field.type) {
    case "heading":
      return <div className={styles.headingPreview}>{field.label || "Heading"}</div>;
    case "divider":
      return <div className={styles.dividerPreview} />;
    case "text":
    case "number":
    case "date":
      return (
        <input
          className={styles.fieldInput}
          placeholder={field.placeholder || `Enter ${field.label || "value"}`}
          readOnly
        />
      );
    case "textarea":
      return (
        <textarea
          className={styles.fieldInput}
          rows={3}
          placeholder={field.placeholder || "Long answer"}
          readOnly
        />
      );
    case "select":
      return (
        <select className={styles.fieldInput} disabled>
          <option>{field.placeholder || "Select an option"}</option>
        </select>
      );
    case "radio":
      return (
        <div>
          {(field.options || []).slice(0, 4).map((o, i) => (
            <div key={i} className={styles.fieldOption}>
              <input type="radio" disabled /> {o}
            </div>
          ))}
        </div>
      );
    case "checkbox":
      // Canvas head already renders the label above; here we only
      // show the checkbox itself + a faint type hint so the label
      // doesn't appear twice (was previously rendered both in the
      // header and inline next to the checkbox).
      return (
        <div className={styles.fieldOption}>
          <input type="checkbox" disabled />
          <span style={{ color: "#9ca3af", fontStyle: "italic", fontSize: 11 }}>
            single checkbox
          </span>
        </div>
      );
    case "checkboxGroup":
      return (
        <div>
          {(field.options || []).slice(0, 4).map((o, i) => (
            <div key={i} className={styles.fieldOption}>
              <input type="checkbox" disabled /> {o}
            </div>
          ))}
        </div>
      );
    case "yesno":
      return (
        <div style={{ display: "flex", gap: 14 }}>
          <span className={styles.fieldOption}>
            <input type="radio" disabled /> Yes
          </span>
          <span className={styles.fieldOption}>
            <input type="radio" disabled /> No
          </span>
        </div>
      );
    case "signature":
      return <div className={styles.signaturePreview}>Signature</div>;
    default:
      return null;
  }
}

// ================================================================
// Properties panel
// ================================================================
function PropertiesPanel({ selected, onChange, onAutoKeyFromLabel }) {
  if (!selected) {
    return (
      <div className={styles.props}>
        <div className={styles.propsTitle}>Properties</div>
        <div className={styles.propsEmpty}>
          Select a field on the canvas to edit its properties.
        </div>
      </div>
    );
  }

  const { field } = selected;
  const showOptions = TYPES_WITH_OPTIONS.has(field.type);
  const showLayoutAndRequired = !LAYOUT_TYPES.has(field.type);

  return (
    <div className={styles.props}>
      <div className={styles.propsTitle}>
        Properties
        <span className={styles.propsType}>{field.type}</span>
      </div>

      {!TYPES_WITHOUT_LABEL_INPUT.has(field.type) && (
        <div className={styles.propGroup}>
          <label className={styles.propLabel}>Label</label>
          <input
            className={styles.propInput}
            value={field.label}
            onChange={(e) => onChange({ label: e.target.value })}
          />
        </div>
      )}

      {showLayoutAndRequired && (
        <>
          <div className={styles.propGroup}>
            <label className={styles.propLabel}>
              Field key (saved as)
              <button
                type="button"
                onClick={onAutoKeyFromLabel}
                className={styles.btnGhost}
                style={{ float: "right", padding: "2px 6px", fontSize: 10 }}
                title="Generate key from label"
              >
                Auto
              </button>
            </label>
            <input
              className={styles.propInput}
              value={field.key || ""}
              onChange={(e) =>
                onChange({ key: e.target.value.replace(/\s+/g, "") })
              }
              placeholder="autoGeneratedFromLabel"
            />
            <div className={styles.propsHint}>
              Stored as `customFields[].key` on the Sample. Use camelCase.
            </div>
          </div>

          <div className={styles.propGroup}>
            <label className={styles.propLabel}>Help text</label>
            <textarea
              className={`${styles.propInput} ${styles.propTextarea}`}
              value={field.helpText || ""}
              onChange={(e) => onChange({ helpText: e.target.value })}
              placeholder="Optional hint shown under the field"
            />
          </div>

          {!["checkbox", "yesno", "signature"].includes(field.type) && (
            <div className={styles.propGroup}>
              <label className={styles.propLabel}>Placeholder</label>
              <input
                className={styles.propInput}
                value={field.placeholder || ""}
                onChange={(e) => onChange({ placeholder: e.target.value })}
              />
            </div>
          )}

          <div className={styles.propGroup}>
            <label className={styles.propLabel}>Width</label>
            <select
              className={styles.propInput}
              value={field.width || "full"}
              onChange={(e) => onChange({ width: e.target.value })}
            >
              <option value="full">Full</option>
              <option value="half">Half</option>
              <option value="third">Third</option>
            </select>
            <div className={styles.propsHint}>
              Width is honoured when the section uses 2 or 3 columns.
            </div>
          </div>

          <label className={styles.propCheckbox}>
            <input
              type="checkbox"
              checked={!!field.required}
              onChange={(e) => onChange({ required: e.target.checked })}
            />
            Required
          </label>
        </>
      )}

      {showOptions && (
        <div className={styles.propGroup}>
          <label className={styles.propLabel}>Options (one per line)</label>
          <textarea
            className={`${styles.propInput} ${styles.propTextarea}`}
            value={(field.options || []).join("\n")}
            onChange={(e) =>
              onChange({
                options: e.target.value
                  .split("\n")
                  .map((s) => s.trim())
                  .filter(Boolean),
              })
            }
            placeholder={"Option 1\nOption 2\nOption 3"}
          />
        </div>
      )}
    </div>
  );
}

// ================================================================
// Preview pane (read-only render of the saved schema)
// ================================================================
function PreviewPane({ template }) {
  return (
    <div className={styles.previewWrapper}>
      <div className={styles.previewSheet}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>
            {template.name || "Untitled form"}
          </h2>
          <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
            {template.category}
          </div>
        </div>

        {template.sections.map((section) => (
          <div key={section.id} className={styles.previewSection}>
            <h3>{section.title}</h3>
            <div
              style={{
                display: "grid",
                gap: 12,
                gridTemplateColumns: `repeat(${section.columns || 1}, 1fr)`,
              }}
            >
              {section.fields.map((f) => (
                <PreviewField key={f.id} field={f} columns={section.columns} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PreviewField({ field, columns }) {
  const span =
    LAYOUT_TYPES.has(field.type) || field.width === "full"
      ? `1 / -1`
      : field.width === "third" && columns >= 3
      ? "span 1"
      : field.width === "half" && columns >= 2
      ? "span 1"
      : `1 / -1`;

  const wrapStyle = { gridColumn: span };

  if (field.type === "heading") {
    return (
      <div style={wrapStyle}>
        <div className={styles.headingPreview}>{field.label}</div>
      </div>
    );
  }
  if (field.type === "divider") {
    return (
      <div style={wrapStyle}>
        <div className={styles.dividerPreview} />
      </div>
    );
  }
  // Single checkboxes are special: their `label` is the inline
  // text next to the box (just like a normal HTML checkbox), so
  // we skip the wrapper <label> to avoid showing the label twice.
  if (field.type === "checkbox") {
    return (
      <div className={styles.previewField} style={wrapStyle}>
        <label className={styles.fieldOption}>
          <input type="checkbox" />
          <span>
            {field.label}
            {field.required && <span className={styles.required}> *</span>}
          </span>
        </label>
        {field.helpText && (
          <div className={styles.previewHelpText}>{field.helpText}</div>
        )}
      </div>
    );
  }

  return (
    <div className={styles.previewField} style={wrapStyle}>
      <label>
        {field.label}
        {field.required && <span className={styles.required}> *</span>}
      </label>
      {renderPreviewInput(field)}
      {field.helpText && (
        <div className={styles.previewHelpText}>{field.helpText}</div>
      )}
    </div>
  );
}

function renderPreviewInput(field) {
  switch (field.type) {
    case "text":
      return <input type="text" placeholder={field.placeholder || ""} />;
    case "number":
      return <input type="number" placeholder={field.placeholder || ""} />;
    case "date":
      return <input type="date" />;
    case "textarea":
      return <textarea placeholder={field.placeholder || ""} />;
    case "select":
      return (
        <select>
          <option value="">{field.placeholder || "Select..."}</option>
          {(field.options || []).map((o, i) => (
            <option key={i} value={o}>
              {o}
            </option>
          ))}
        </select>
      );
    case "radio":
      return (
        <div>
          {(field.options || []).map((o, i) => (
            <label key={i} className={styles.fieldOption}>
              <input type="radio" name={field.id} /> {o}
            </label>
          ))}
        </div>
      );
    case "checkbox":
      // Note: never reached because PreviewField short-circuits
      // checkbox rendering above (we render the box + inline
      // label there to avoid duplicating the label). Kept here
      // for completeness if renderPreviewInput is reused.
      return (
        <label className={styles.fieldOption}>
          <input type="checkbox" />
        </label>
      );
    case "checkboxGroup":
      return (
        <div>
          {(field.options || []).map((o, i) => (
            <label key={i} className={styles.fieldOption}>
              <input type="checkbox" /> {o}
            </label>
          ))}
        </div>
      );
    case "yesno":
      return (
        <div style={{ display: "flex", gap: 14 }}>
          <label className={styles.fieldOption}>
            <input type="radio" name={field.id} value="yes" /> Yes
          </label>
          <label className={styles.fieldOption}>
            <input type="radio" name={field.id} value="no" /> No
          </label>
        </div>
      );
    case "signature":
      return (
        <div className={styles.signaturePreview}>Signature pad placeholder</div>
      );
    default:
      return null;
  }
}
