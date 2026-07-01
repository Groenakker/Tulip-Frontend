import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FaSearch,
  FaPlus,
  FaEdit,
  FaTrash,
  FaChevronRight,
  FaChevronDown,
  FaEye,
  FaBoxes,
  FaTimes,
  FaFileImport,
  FaSave,
  FaFileExcel,
  FaClipboardList,
} from "react-icons/fa";
import Modal from "../../components/Modal";
import styles from "./BomTab.module.css";

// ============================================================
// Settings → Bill of Materials
// ------------------------------------------------------------
// Manage saleable parent items and the ordered list of
// components each one requires.
//
// The customer's existing "Bill of Materials.xlsx" workbook
// (multi-sheet: BOM Parent Item + Component Item) can be
// imported directly — see the "Import" button below.
// ============================================================

const API_BASE_URL = `${import.meta.env.VITE_BACKEND_URL}/api`;
const BOM_URL = `${API_BASE_URL}/boms`;

const PRICE_LIST_OPTIONS = [
  { id: 10, name: "Partner Price" },
  { id: 11, name: "MSRP" },
  { id: 12, name: "Standard Cost" },
];

const emptyComponent = () => ({
  componentCode: "",
  componentDescription: "",
  itemDescription: "",
  quantity: 1,
  uomName: "EA",
  price: 0,
  originalPrice: 0,
  priceList: "",
  issueMethod: "M",
  rowText: "",
  componentElementNumber: 0,
  visualOrder: 0,
  warehouse: "",
  componentType: "",
});

// A "section" component is a text-only narrative row that
// groups the components below it. It has no code / qty / price
// — just the rowText field — and mirrors how the source
// workbook uses componentType "-18" rows to divide a BOM into
// stages (e.g. "Coordination with client…", "Sample shipping").
const emptySectionRow = () => ({
  componentCode: "",
  componentDescription: "",
  itemDescription: "",
  quantity: 0,
  uomName: "",
  price: 0,
  originalPrice: 0,
  priceList: "",
  issueMethod: "",
  rowText: "",
  componentElementNumber: 0,
  visualOrder: 0,
  warehouse: "",
  componentType: "-18",
});

const isSectionRow = (c) =>
  !c?.componentCode &&
  !c?.componentDescription &&
  !!(c?.rowText || "").trim();

// Consider a row "empty" when it carries no identifying data.
// Matches the backend's `isEmptyComponent` so the UI stays
// consistent with what the server persists.
const isEmptyRow = (c) =>
  !c ||
  (!(c.componentCode || "").trim() &&
    !(c.componentDescription || "").trim() &&
    !(c.itemDescription || "").trim() &&
    !(c.rowText || "").trim() &&
    !Number(c.quantity) &&
    !Number(c.price) &&
    !Number(c.originalPrice));

const emptyBomForm = () => ({
  itemNo: "",
  itemDescription: "",
  productDescription: "",
  noOfUnits: 1,
  priceListId: 10,
  priceListName: "Partner Price",
  bomType: "Production",
  whseForFinishedProduct: "",
  objectType: 66,
  hideComponentsInPrinting: false,
  creationDate: "",
  dateOfUpdate: "",
  updatingUser: "",
  components: [],
});

const fetchJson = async (url, opts = {}) => {
  const res = await fetch(url, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
    ...opts,
  });
  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { message: text };
  }
  if (!res.ok) {
    const msg = body?.message || `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return body;
};

const formatDate = (val) => {
  if (!val) return "—";
  const d = new Date(val);
  if (Number.isNaN(d.valueOf())) return "—";
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const formatCurrency = (n) => {
  const num = Number(n);
  if (!Number.isFinite(num)) return "—";
  return `$${num.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

// A single component row inside the BOM detail view. Rows
// without a componentCode + componentDescription (i.e. text-
// only "Row Text" narrative rows) render as a section band
// spanning every column so the workbook's phase / stage
// grouping stays visible.
const COMPONENT_COLSPAN = 9;

function ComponentRow({ comp, index, sectionNumber }) {
  if (isSectionRow(comp)) {
    return (
      <tr className={styles.sectionRow}>
        <td colSpan={COMPONENT_COLSPAN} className={styles.sectionCell}>
          <span className={styles.sectionIndex}>
            {sectionNumber ? `§ ${sectionNumber}` : "§"}
          </span>
          <span className={styles.sectionText}>{comp.rowText}</span>
        </td>
      </tr>
    );
  }
  const showOrig =
    Number(comp.originalPrice) > 0 &&
    Number(comp.originalPrice) !== Number(comp.price);
  return (
    <tr>
      <td className={styles.numCell}>{index + 1}</td>
      <td>
        <span className={styles.compCode}>{comp.componentCode || "—"}</span>
      </td>
      <td className={styles.descCol}>
        <div className={styles.descPrimary}>
          {comp.componentDescription || comp.itemDescription || "—"}
        </div>
        {comp.itemDescription &&
          comp.itemDescription !== comp.componentDescription && (
            <div className={styles.descSecondary} title={comp.itemDescription}>
              {comp.itemDescription}
            </div>
          )}
        {comp.rowText && (
          <div className={styles.compNote}>{comp.rowText}</div>
        )}
      </td>
      <td className={styles.numCell}>{comp.quantity ?? "—"}</td>
      <td className={styles.centerCell}>{comp.uomName || "—"}</td>
      <td className={styles.numCell}>
        {formatCurrency(comp.price)}
        {showOrig && (
          <div className={styles.origPrice}>
            <span className={styles.origPriceLabel}>orig</span>{" "}
            {formatCurrency(comp.originalPrice)}
          </div>
        )}
      </td>
      <td className={styles.centerCell}>{comp.warehouse || "—"}</td>
      <td className={styles.centerCell}>{comp.issueMethod || "—"}</td>
      <td className={styles.centerCell}>
        {comp.priceList ? (
          <span className={styles.mutedPill}>{comp.priceList}</span>
        ) : (
          "—"
        )}
      </td>
    </tr>
  );
}

// Inline editor row for a component inside the create/edit
// form. Section rows (text only) render a single wide input
// so the user immediately sees they're editing a narrative
// header, not a real component.
function ComponentEditorRow({ comp, index, onChange, onRemove }) {
  const handle = (field) => (e) => {
    onChange(index, { ...comp, [field]: e.target.value });
  };
  if (isSectionRow(comp)) {
    return (
      <tr className={styles.editorSectionRow}>
        <td className={styles.editorIndex}>{index + 1}</td>
        <td colSpan={7}>
          <div className={styles.editorSectionField}>
            <span className={styles.editorSectionTag}>Section</span>
            <input
              type="text"
              value={comp.rowText}
              onChange={handle("rowText")}
              placeholder="Section heading (narrative row)"
              className={styles.editorSectionInput}
            />
          </div>
        </td>
        <td className={styles.editorActions}>
          <button
            type="button"
            className={styles.iconBtnDanger}
            onClick={() => onRemove(index)}
            title="Remove section"
          >
            <FaTimes />
          </button>
        </td>
      </tr>
    );
  }
  return (
    <tr>
      <td className={styles.editorIndex}>{index + 1}</td>
      <td>
        <input
          type="text"
          value={comp.componentCode}
          onChange={handle("componentCode")}
          placeholder="e.g. R0003"
        />
      </td>
      <td>
        <input
          type="text"
          value={comp.componentDescription}
          onChange={handle("componentDescription")}
          placeholder="Description"
        />
      </td>
      <td>
        <input
          type="number"
          value={comp.quantity}
          onChange={handle("quantity")}
          step="0.01"
          className={styles.numInput}
        />
      </td>
      <td>
        <input
          type="text"
          value={comp.uomName}
          onChange={handle("uomName")}
          placeholder="EA"
          className={styles.narrowInput}
        />
      </td>
      <td>
        <input
          type="number"
          value={comp.price}
          onChange={handle("price")}
          step="0.01"
          className={styles.numInput}
        />
      </td>
      <td>
        <input
          type="text"
          value={comp.warehouse}
          onChange={handle("warehouse")}
          placeholder="1"
          className={styles.narrowInput}
        />
      </td>
      <td>
        <input
          type="text"
          value={comp.issueMethod}
          onChange={handle("issueMethod")}
          placeholder="M"
          className={styles.narrowInput}
        />
      </td>
      <td className={styles.editorActions}>
        <button
          type="button"
          className={styles.iconBtnDanger}
          onClick={() => onRemove(index)}
          title="Remove component"
        >
          <FaTimes />
        </button>
      </td>
    </tr>
  );
}

export default function BomTab() {
  const [boms, setBoms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchValue, setSearchValue] = useState("");
  const [expandedIds, setExpandedIds] = useState(new Set());
  const [componentsCache, setComponentsCache] = useState({});
  const [rowLoadingIds, setRowLoadingIds] = useState(new Set());

  // Create / edit modal state
  const [showFormModal, setShowFormModal] = useState(false);
  const [formMode, setFormMode] = useState("create"); // create | edit
  const [formData, setFormData] = useState(emptyBomForm());
  const [formError, setFormError] = useState("");
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Full-detail view modal state
  const [detailBom, setDetailBom] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Import modal state
  const [showImportModal, setShowImportModal] = useState(false);
  const [importMode, setImportMode] = useState("upsert");
  const [importUploading, setImportUploading] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [importError, setImportError] = useState("");
  const [importFileName, setImportFileName] = useState("");
  const importInputRef = useRef(null);

  const loadBoms = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchJson(BOM_URL);
      setBoms(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Failed to load BOMs.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBoms();
  }, [loadBoms]);

  const filteredBoms = useMemo(() => {
    const q = searchValue.trim().toLowerCase();
    if (!q) return boms;
    return boms.filter(
      (b) =>
        (b.itemNo || "").toLowerCase().includes(q) ||
        (b.itemDescription || "").toLowerCase().includes(q) ||
        (b.productDescription || "").toLowerCase().includes(q) ||
        (b.priceListName || "").toLowerCase().includes(q) ||
        (b.bomType || "").toLowerCase().includes(q)
    );
  }, [boms, searchValue]);

  // Lazily fetch a BOM's components the first time it's
  // expanded so the initial list stays snappy on large tenants.
  const ensureRowLoaded = useCallback(async (id) => {
    if (componentsCache[id]) return;
    setRowLoadingIds((prev) => new Set(prev).add(id));
    try {
      const bom = await fetchJson(`${BOM_URL}/${id}`);
      setComponentsCache((prev) => ({ ...prev, [id]: bom }));
    } catch (err) {
      setComponentsCache((prev) => ({
        ...prev,
        [id]: { __error: err.message || "Failed to load components." },
      }));
    } finally {
      setRowLoadingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }, [componentsCache]);

  const toggleExpand = (id) => {
    const next = new Set(expandedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
      ensureRowLoaded(id);
    }
    setExpandedIds(next);
  };

  const invalidateRow = (id) => {
    setComponentsCache((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  // ---------- Form (create / edit) ----------

  const openCreate = () => {
    setFormMode("create");
    setFormData(emptyBomForm());
    setFormError("");
    setShowFormModal(true);
  };

  const openEdit = async (id) => {
    setFormError("");
    setShowFormModal(true);
    setFormMode("edit");
    // Pre-fill immediately from the list row for a snappy
    // open, then refresh with the full document (components)
    // in the background.
    const cached =
      componentsCache[id] ||
      boms.find((b) => b._id === id);
    if (cached) {
      setFormData({
        _id: id,
        itemNo: cached.itemNo || "",
        itemDescription: cached.itemDescription || "",
        productDescription: cached.productDescription || "",
        noOfUnits: cached.noOfUnits ?? 1,
        priceListId: cached.priceListId ?? 10,
        priceListName: cached.priceListName || "Partner Price",
        bomType: cached.bomType || "Production",
        whseForFinishedProduct: cached.whseForFinishedProduct || "",
        objectType: cached.objectType ?? 66,
        hideComponentsInPrinting: Boolean(cached.hideComponentsInPrinting),
        creationDate: cached.creationDate
          ? cached.creationDate.slice(0, 10)
          : "",
        dateOfUpdate: cached.dateOfUpdate
          ? cached.dateOfUpdate.slice(0, 10)
          : "",
        updatingUser: cached.updatingUser || "",
        components: Array.isArray(cached.components) ? cached.components : [],
      });
    }
    try {
      const bom = await fetchJson(`${BOM_URL}/${id}`);
      setFormData((prev) => ({
        ...prev,
        _id: bom._id,
        itemNo: bom.itemNo || "",
        itemDescription: bom.itemDescription || "",
        productDescription: bom.productDescription || "",
        noOfUnits: bom.noOfUnits ?? 1,
        priceListId: bom.priceListId ?? 10,
        priceListName: bom.priceListName || "Partner Price",
        bomType: bom.bomType || "Production",
        whseForFinishedProduct: bom.whseForFinishedProduct || "",
        objectType: bom.objectType ?? 66,
        hideComponentsInPrinting: Boolean(bom.hideComponentsInPrinting),
        creationDate: bom.creationDate ? bom.creationDate.slice(0, 10) : "",
        dateOfUpdate: bom.dateOfUpdate ? bom.dateOfUpdate.slice(0, 10) : "",
        updatingUser: bom.updatingUser || "",
        components: Array.isArray(bom.components) ? bom.components : [],
      }));
    } catch (err) {
      setFormError(err.message || "Failed to load BOM for editing.");
    }
  };

  const closeForm = () => {
    if (formSubmitting) return;
    setShowFormModal(false);
    setFormError("");
  };

  const setField = (field) => (e) => {
    let value =
      e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setFormData((prev) => {
      // Keep price-list id + name in sync via the dropdown so
      // saved records mirror the workbook's dual column.
      if (field === "priceListId") {
        const opt = PRICE_LIST_OPTIONS.find(
          (o) => String(o.id) === String(value)
        );
        return {
          ...prev,
          priceListId: value === "" ? "" : Number(value),
          priceListName: opt ? opt.name : prev.priceListName,
        };
      }
      return { ...prev, [field]: value };
    });
  };

  const addComponent = () => {
    setFormData((prev) => ({
      ...prev,
      components: [
        ...prev.components,
        {
          ...emptyComponent(),
          visualOrder: prev.components.length + 1,
          componentElementNumber: prev.components.length + 1,
        },
      ],
    }));
  };

  const addSection = () => {
    setFormData((prev) => ({
      ...prev,
      components: [
        ...prev.components,
        {
          ...emptySectionRow(),
          visualOrder: prev.components.length + 1,
          componentElementNumber: prev.components.length + 1,
        },
      ],
    }));
  };

  const updateComponent = (index, next) => {
    setFormData((prev) => {
      const list = [...prev.components];
      list[index] = next;
      return { ...prev, components: list };
    });
  };

  const removeComponent = (index) => {
    setFormData((prev) => {
      const list = [...prev.components];
      list.splice(index, 1);
      return { ...prev, components: list };
    });
  };

  const submitForm = async (e) => {
    e.preventDefault();
    if (!formData.itemNo.trim()) {
      setFormError("Item No. is required.");
      return;
    }
    setFormSubmitting(true);
    setFormError("");
    try {
      const payload = {
        ...formData,
        noOfUnits: Number(formData.noOfUnits) || 1,
        priceListId:
          formData.priceListId === "" ? null : Number(formData.priceListId),
        objectType:
          formData.objectType === "" ? null : Number(formData.objectType),
        components: formData.components.map((c, i) => ({
          ...c,
          quantity: Number(c.quantity) || 0,
          price: Number(c.price) || 0,
          originalPrice: Number(c.originalPrice) || 0,
          visualOrder: Number(c.visualOrder) || i + 1,
          componentElementNumber:
            Number(c.componentElementNumber) || i + 1,
        })),
      };

      let saved;
      if (formMode === "edit" && formData._id) {
        saved = await fetchJson(`${BOM_URL}/${formData._id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        invalidateRow(saved._id);
      } else {
        saved = await fetchJson(BOM_URL, {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }
      setShowFormModal(false);
      loadBoms();
    } catch (err) {
      setFormError(err.message || "Failed to save BOM.");
    } finally {
      setFormSubmitting(false);
    }
  };

  // ---------- Detail view ----------

  const openDetail = async (id) => {
    setDetailLoading(true);
    // Show whatever we already have so the modal opens
    // instantly, then patch in the full doc.
    const cached =
      componentsCache[id] || boms.find((b) => b._id === id) || null;
    setDetailBom(cached);
    try {
      const bom = await fetchJson(`${BOM_URL}/${id}`);
      setDetailBom(bom);
      setComponentsCache((prev) => ({ ...prev, [id]: bom }));
    } catch (err) {
      setDetailBom((prev) => ({
        ...(prev || {}),
        __error: err.message || "Failed to load BOM details.",
      }));
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => setDetailBom(null);

  // ---------- Delete ----------

  const handleDelete = async (id, itemNo) => {
    if (
      !window.confirm(
        `Delete BOM "${itemNo}"? This will remove the parent record and all of its components.`
      )
    ) {
      return;
    }
    try {
      await fetchJson(`${BOM_URL}/${id}`, { method: "DELETE" });
      invalidateRow(id);
      setBoms((prev) => prev.filter((b) => b._id !== id));
      setExpandedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    } catch (err) {
      alert(err.message || "Failed to delete BOM.");
    }
  };

  // ---------- Import ----------

  const openImportModal = () => {
    setImportResult(null);
    setImportError("");
    setImportFileName("");
    setShowImportModal(true);
  };

  const closeImportModal = () => {
    if (importUploading) return;
    setShowImportModal(false);
  };

  const pickImportFile = () => {
    if (importInputRef.current) {
      importInputRef.current.value = "";
      importInputRef.current.click();
    }
  };

  const handleImportFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setImportFileName(file.name);
    setImportUploading(true);
    setImportError("");
    setImportResult(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(
        `${BOM_URL}/import?mode=${encodeURIComponent(importMode)}`,
        {
          method: "POST",
          credentials: "include",
          body: fd,
        }
      );
      const text = await res.text();
      let data;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        data = null;
      }
      if (!res.ok) {
        throw new Error(data?.message || `Import failed (HTTP ${res.status}).`);
      }
      setImportResult(data);
      loadBoms();
    } catch (err) {
      setImportError(err.message || "Import failed.");
    } finally {
      setImportUploading(false);
    }
  };

  // ---------- Render ----------

  return (
    <div className={styles.container}>
      <div className={styles.toolbar}>
        <div className={styles.searchGroup}>
          <FaSearch className={styles.searchIcon} />
          <input
            type="search"
            className={styles.searchInput}
            placeholder="Search by item, description, price list…"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
          />
        </div>
        <div className={styles.toolbarActions}>
          <button
            type="button"
            className={styles.secondaryBtn}
            onClick={openImportModal}
          >
            <FaFileImport />
            <span>Import from Excel</span>
          </button>
          <button
            type="button"
            className={styles.primaryBtn}
            onClick={openCreate}
          >
            <FaPlus />
            <span>Create BOM</span>
          </button>
        </div>
      </div>

      <div className={styles.summaryStrip}>
        <div className={styles.summaryChip}>
          <FaClipboardList />
          <span>
            <strong>{boms.length}</strong> Bill{boms.length === 1 ? "" : "s"} of Materials
          </span>
        </div>
        <div className={styles.summaryChip}>
          <FaBoxes />
          <span>
            <strong>
              {boms.reduce((sum, b) => sum + (b.componentsCount ?? 0), 0)}
            </strong>{" "}
            components
          </span>
        </div>
        {boms.some((b) => (b.sectionsCount ?? 0) > 0) && (
          <div className={styles.summaryChip}>
            <span className={styles.sectionMarker}>§</span>
            <span>
              <strong>
                {boms.reduce((sum, b) => sum + (b.sectionsCount ?? 0), 0)}
              </strong>{" "}
              section{" "}
              row{boms.reduce((s, b) => s + (b.sectionsCount ?? 0), 0) === 1
                ? ""
                : "s"}
            </span>
          </div>
        )}
      </div>

      {error && <div className={styles.errorBanner}>{error}</div>}

      <div className={styles.tableWrap}>
        <table className={styles.bomTable}>
          <thead>
            <tr>
              <th className={styles.expandCell}></th>
              <th>Item No.</th>
              <th>Item Description</th>
              <th className={styles.numCol}>Units</th>
              <th>Price List</th>
              <th>BOM Type</th>
              <th className={styles.numCol}>Components</th>
              <th>Created</th>
              <th className={styles.actionsCell}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} className={styles.emptyCell}>
                  Loading Bill of Materials…
                </td>
              </tr>
            ) : filteredBoms.length === 0 ? (
              <tr>
                <td colSpan={9} className={styles.emptyCell}>
                  {searchValue
                    ? "No BOMs match your search."
                    : "No Bill of Materials yet. Import from Excel or create your first BOM."}
                </td>
              </tr>
            ) : (
              filteredBoms.map((bom) => {
                const expanded = expandedIds.has(bom._id);
                const cached = componentsCache[bom._id];
                const rowLoading = rowLoadingIds.has(bom._id);
                return (
                  <React.Fragment key={bom._id}>
                    <tr
                      className={`${styles.bomRow} ${
                        expanded ? styles.bomRowActive : ""
                      }`}
                    >
                      <td
                        className={styles.expandCell}
                        onClick={() => toggleExpand(bom._id)}
                      >
                        <button
                          type="button"
                          className={styles.expandBtn}
                          aria-label={expanded ? "Collapse" : "Expand"}
                        >
                          {expanded ? <FaChevronDown /> : <FaChevronRight />}
                        </button>
                      </td>
                      <td
                        className={styles.itemNoCell}
                        onClick={() => toggleExpand(bom._id)}
                      >
                        <span className={styles.itemNoChip}>{bom.itemNo}</span>
                      </td>
                      <td
                        className={styles.descCell}
                        onClick={() => toggleExpand(bom._id)}
                        title={bom.itemDescription}
                      >
                        {bom.itemDescription || "—"}
                      </td>
                      <td className={styles.numCell}>{bom.noOfUnits ?? 1}</td>
                      <td>
                        <span className={styles.pill}>
                          {bom.priceListName || "—"}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`${styles.pill} ${
                            (bom.bomType || "").toLowerCase() === "production"
                              ? styles.pillProduction
                              : ""
                          }`}
                        >
                          {bom.bomType || "—"}
                        </span>
                      </td>
                      <td className={styles.numCell}>
                        <span className={styles.compCount}>
                          <FaBoxes /> {bom.componentsCount ?? 0}
                          {bom.sectionsCount > 0 && (
                            <span
                              className={styles.sectionSuffix}
                              title={`${bom.sectionsCount} section header row${
                                bom.sectionsCount === 1 ? "" : "s"
                              }`}
                            >
                              +{bom.sectionsCount}§
                            </span>
                          )}
                        </span>
                      </td>
                      <td className={styles.dateCell}>
                        {formatDate(bom.creationDate)}
                      </td>
                      <td className={styles.actionsCell}>
                        <button
                          type="button"
                          className={styles.iconBtn}
                          onClick={() => openDetail(bom._id)}
                          title="View details"
                        >
                          <FaEye />
                        </button>
                        <button
                          type="button"
                          className={styles.iconBtn}
                          onClick={() => openEdit(bom._id)}
                          title="Edit"
                        >
                          <FaEdit />
                        </button>
                        <button
                          type="button"
                          className={styles.iconBtnDanger}
                          onClick={() => handleDelete(bom._id, bom.itemNo)}
                          title="Delete"
                        >
                          <FaTrash />
                        </button>
                      </td>
                    </tr>
                    {expanded && (
                      <tr className={styles.expandedRow}>
                        <td colSpan={9}>
                          <div className={styles.expandedPanel}>
                            {rowLoading && !cached ? (
                              <div className={styles.rowLoading}>
                                Loading components…
                              </div>
                            ) : cached?.__error ? (
                              <div className={styles.errorBanner}>
                                {cached.__error}
                              </div>
                            ) : (
                              <>
                                <div className={styles.expandedHeader}>
                                  <div>
                                    <div className={styles.expandedTitle}>
                                      {cached?.itemDescription ||
                                        bom.itemDescription ||
                                        bom.itemNo}
                                    </div>
                                    {cached?.productDescription &&
                                      cached.productDescription !==
                                        cached.itemDescription && (
                                        <div className={styles.expandedSub}>
                                          {cached.productDescription}
                                        </div>
                                      )}
                                  </div>
                                  <div className={styles.expandedMeta}>
                                    <span>
                                      <strong>Warehouse:</strong>{" "}
                                      {cached?.whseForFinishedProduct || "—"}
                                    </span>
                                    <span>
                                      <strong>Object Type:</strong>{" "}
                                      {cached?.objectType ?? "—"}
                                    </span>
                                    <span>
                                      <strong>Updated:</strong>{" "}
                                      {formatDate(cached?.dateOfUpdate)}
                                    </span>
                                    <span>
                                      <strong>By:</strong>{" "}
                                      {cached?.updatingUser || "—"}
                                    </span>
                                  </div>
                                </div>
                                {(() => {
                                  const visibleComponents = (
                                    cached?.components || []
                                  ).filter((c) => !isEmptyRow(c));
                                  if (visibleComponents.length === 0) {
                                    return (
                                      <div className={styles.emptyComponents}>
                                        No components added yet.
                                      </div>
                                    );
                                  }
                                  let realIdx = 0;
                                  let sectionCount = 0;
                                  return (
                                    <div className={styles.tableScroll}>
                                      <table className={styles.componentsTable}>
                                        <thead>
                                          <tr>
                                            <th className={styles.numCol}>#</th>
                                            <th>Code</th>
                                            <th>Description</th>
                                            <th className={styles.numCol}>Qty</th>
                                            <th className={styles.centerCol}>UoM</th>
                                            <th className={styles.numCol}>Price</th>
                                            <th className={styles.centerCol}>Whse</th>
                                            <th className={styles.centerCol}>Issue</th>
                                            <th className={styles.centerCol}>Price List</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {visibleComponents.map((comp, i) => {
                                            if (isSectionRow(comp)) {
                                              sectionCount++;
                                              return (
                                                <ComponentRow
                                                  key={comp._id || `s-${i}`}
                                                  comp={comp}
                                                  index={i}
                                                  sectionNumber={sectionCount}
                                                />
                                              );
                                            }
                                            realIdx++;
                                            return (
                                              <ComponentRow
                                                key={comp._id || `c-${i}`}
                                                comp={comp}
                                                index={realIdx - 1}
                                              />
                                            );
                                          })}
                                        </tbody>
                                      </table>
                                    </div>
                                  );
                                })()}
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* -------------------- Create / edit modal -------------------- */}
      {showFormModal && (
        <Modal onClose={closeForm}>
          <div className={styles.formModal}>
            <h3 className={styles.formModalTitle}>
              {formMode === "edit" ? "Edit Bill of Materials" : "Create Bill of Materials"}
            </h3>
            <form className={styles.formGrid} onSubmit={submitForm}>
              <label>
                Item No. <span className={styles.required}>*</span>
                <input
                  type="text"
                  value={formData.itemNo}
                  onChange={setField("itemNo")}
                  placeholder="e.g. GRK-1001"
                  required
                  disabled={formSubmitting}
                />
              </label>
              <label>
                No. of Units
                <input
                  type="number"
                  value={formData.noOfUnits}
                  onChange={setField("noOfUnits")}
                  min={1}
                  disabled={formSubmitting}
                />
              </label>
              <label className={styles.spanTwo}>
                Item Description
                <input
                  type="text"
                  value={formData.itemDescription}
                  onChange={setField("itemDescription")}
                  disabled={formSubmitting}
                />
              </label>
              <label className={styles.spanTwo}>
                Product Description
                <input
                  type="text"
                  value={formData.productDescription}
                  onChange={setField("productDescription")}
                  disabled={formSubmitting}
                  placeholder="Defaults to Item Description if left blank"
                />
              </label>
              <label>
                Price List
                <select
                  value={formData.priceListId}
                  onChange={setField("priceListId")}
                  disabled={formSubmitting}
                >
                  {PRICE_LIST_OPTIONS.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.id} · {o.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                BOM Type
                <select
                  value={formData.bomType}
                  onChange={setField("bomType")}
                  disabled={formSubmitting}
                >
                  <option value="Production">Production</option>
                  <option value="Template">Template</option>
                  <option value="Assembly">Assembly</option>
                </select>
              </label>
              <label>
                Warehouse
                <input
                  type="text"
                  value={formData.whseForFinishedProduct}
                  onChange={setField("whseForFinishedProduct")}
                  disabled={formSubmitting}
                />
              </label>
              <label>
                Object Type
                <input
                  type="number"
                  value={formData.objectType}
                  onChange={setField("objectType")}
                  disabled={formSubmitting}
                />
              </label>
              <label>
                Creation Date
                <input
                  type="date"
                  value={formData.creationDate}
                  onChange={setField("creationDate")}
                  disabled={formSubmitting}
                />
              </label>
              <label>
                Date of Update
                <input
                  type="date"
                  value={formData.dateOfUpdate}
                  onChange={setField("dateOfUpdate")}
                  disabled={formSubmitting}
                />
              </label>
              <label className={styles.spanTwo}>
                Updating User
                <input
                  type="text"
                  value={formData.updatingUser}
                  onChange={setField("updatingUser")}
                  disabled={formSubmitting}
                  placeholder="Defaults to your account"
                />
              </label>
              <label className={`${styles.spanTwo} ${styles.checkboxLine}`}>
                <input
                  type="checkbox"
                  checked={Boolean(formData.hideComponentsInPrinting)}
                  onChange={setField("hideComponentsInPrinting")}
                  disabled={formSubmitting}
                />
                Hide components when printing
              </label>

              <div className={styles.componentsEditor}>
                <div className={styles.componentsEditorHeader}>
                  <div>
                    <h4>Components</h4>
                    <p className={styles.componentsEditorHint}>
                      Use "Add Section" to insert a narrative header row that
                      groups the components below it.
                    </p>
                  </div>
                  <div className={styles.componentsEditorActions}>
                    <button
                      type="button"
                      className={styles.smallSecondaryBtn}
                      onClick={addSection}
                      disabled={formSubmitting}
                    >
                      <FaPlus />
                      Add Section
                    </button>
                    <button
                      type="button"
                      className={styles.smallPrimaryBtn}
                      onClick={addComponent}
                      disabled={formSubmitting}
                    >
                      <FaPlus />
                      Add Component
                    </button>
                  </div>
                </div>
                {formData.components.length === 0 ? (
                  <div className={styles.emptyComponents}>
                    No components added yet. Click "Add Component" to create one.
                  </div>
                ) : (
                  <div className={styles.componentsEditorScroll}>
                    <table className={styles.componentsEditorTable}>
                      <thead>
                        <tr>
                          <th className={styles.numCol}>#</th>
                          <th>Code</th>
                          <th>Description</th>
                          <th className={styles.numCol}>Qty</th>
                          <th className={styles.centerCol}>UoM</th>
                          <th className={styles.numCol}>Price</th>
                          <th className={styles.centerCol}>Whse</th>
                          <th className={styles.centerCol}>Issue</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {formData.components.map((c, i) => (
                          <ComponentEditorRow
                            key={c._id || i}
                            comp={c}
                            index={i}
                            onChange={updateComponent}
                            onRemove={removeComponent}
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {formError && (
                <div className={styles.formError}>{formError}</div>
              )}

              <div className={styles.formActions}>
                <button
                  type="button"
                  className={styles.secondaryBtn}
                  onClick={closeForm}
                  disabled={formSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={styles.primaryBtn}
                  disabled={formSubmitting}
                >
                  <FaSave />
                  {formSubmitting
                    ? "Saving…"
                    : formMode === "edit"
                    ? "Save Changes"
                    : "Create BOM"}
                </button>
              </div>
            </form>
          </div>
        </Modal>
      )}

      {/* -------------------- Detail view modal -------------------- */}
      {detailBom && (
        <Modal onClose={closeDetail}>
          <div className={styles.detailModal}>
            <div className={styles.detailHeader}>
              <div>
                <span className={styles.detailChip}>{detailBom.itemNo}</span>
                <h3 className={styles.detailTitle}>
                  {detailBom.itemDescription || "—"}
                </h3>
                {detailBom.productDescription &&
                  detailBom.productDescription !== detailBom.itemDescription && (
                    <p className={styles.detailSubtitle}>
                      {detailBom.productDescription}
                    </p>
                  )}
              </div>
              {detailLoading && (
                <span className={styles.detailLoading}>Refreshing…</span>
              )}
            </div>
            {detailBom.__error ? (
              <div className={styles.errorBanner}>{detailBom.__error}</div>
            ) : (
              <>
                <div className={styles.detailMetaGrid}>
                  <div>
                    <span className={styles.metaLabel}>Units</span>
                    <span className={styles.metaValue}>
                      {detailBom.noOfUnits ?? 1}
                    </span>
                  </div>
                  <div>
                    <span className={styles.metaLabel}>Price List</span>
                    <span className={styles.metaValue}>
                      {detailBom.priceListName || "—"}
                      {detailBom.priceListId != null && (
                        <em className={styles.metaHint}>
                          {" "}
                          ({detailBom.priceListId})
                        </em>
                      )}
                    </span>
                  </div>
                  <div>
                    <span className={styles.metaLabel}>BOM Type</span>
                    <span className={styles.metaValue}>
                      {detailBom.bomType || "—"}
                    </span>
                  </div>
                  <div>
                    <span className={styles.metaLabel}>Warehouse</span>
                    <span className={styles.metaValue}>
                      {detailBom.whseForFinishedProduct || "—"}
                    </span>
                  </div>
                  <div>
                    <span className={styles.metaLabel}>Object Type</span>
                    <span className={styles.metaValue}>
                      {detailBom.objectType ?? "—"}
                    </span>
                  </div>
                  <div>
                    <span className={styles.metaLabel}>Hide on Print</span>
                    <span className={styles.metaValue}>
                      {detailBom.hideComponentsInPrinting ? "Yes" : "No"}
                    </span>
                  </div>
                  <div>
                    <span className={styles.metaLabel}>Created</span>
                    <span className={styles.metaValue}>
                      {formatDate(detailBom.creationDate)}
                    </span>
                  </div>
                  <div>
                    <span className={styles.metaLabel}>Updated</span>
                    <span className={styles.metaValue}>
                      {formatDate(detailBom.dateOfUpdate)}
                    </span>
                  </div>
                  <div>
                    <span className={styles.metaLabel}>Updating User</span>
                    <span className={styles.metaValue}>
                      {detailBom.updatingUser || "—"}
                    </span>
                  </div>
                </div>

                {(() => {
                  const visibleComponents = (detailBom.components || []).filter(
                    (c) => !isEmptyRow(c)
                  );
                  const componentsOnly = visibleComponents.filter(
                    (c) => !isSectionRow(c)
                  );
                  return (
                    <>
                      <h4 className={styles.detailSubhead}>
                        Components ({componentsOnly.length})
                        {visibleComponents.length !== componentsOnly.length && (
                          <span className={styles.detailSubheadNote}>
                            {" "}
                            · {visibleComponents.length - componentsOnly.length}{" "}
                            section{visibleComponents.length -
                              componentsOnly.length ===
                            1
                              ? ""
                              : "s"}
                          </span>
                        )}
                      </h4>
                      {visibleComponents.length === 0 ? (
                        <div className={styles.emptyComponents}>
                          No components on this BOM yet.
                        </div>
                      ) : (
                        <div className={styles.detailTableScroll}>
                          <table className={styles.componentsTable}>
                            <thead>
                              <tr>
                                <th className={styles.numCol}>#</th>
                                <th>Code</th>
                                <th>Description</th>
                                <th className={styles.numCol}>Qty</th>
                                <th className={styles.centerCol}>UoM</th>
                                <th className={styles.numCol}>Price</th>
                                <th className={styles.centerCol}>Whse</th>
                                <th className={styles.centerCol}>Issue</th>
                                <th className={styles.centerCol}>Price List</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(() => {
                                let realIdx = 0;
                                let sectionCount = 0;
                                return visibleComponents.map((c, i) => {
                                  if (isSectionRow(c)) {
                                    sectionCount++;
                                    return (
                                      <ComponentRow
                                        key={c._id || `s-${i}`}
                                        comp={c}
                                        index={i}
                                        sectionNumber={sectionCount}
                                      />
                                    );
                                  }
                                  realIdx++;
                                  return (
                                    <ComponentRow
                                      key={c._id || `c-${i}`}
                                      comp={c}
                                      index={realIdx - 1}
                                    />
                                  );
                                });
                              })()}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </>
                  );
                })()}
              </>
            )}

            <div className={styles.detailActions}>
              <button
                type="button"
                className={styles.secondaryBtn}
                onClick={closeDetail}
              >
                Close
              </button>
              <button
                type="button"
                className={styles.primaryBtn}
                onClick={() => {
                  closeDetail();
                  openEdit(detailBom._id);
                }}
              >
                <FaEdit />
                Edit BOM
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* -------------------- Import modal -------------------- */}
      {showImportModal && (
        <Modal onClose={closeImportModal}>
          <div className={styles.importModal}>
            <h3 className={styles.formModalTitle}>Import Bill of Materials</h3>
            <p className={styles.importDescription}>
              Upload a Bill of Materials Excel workbook. The importer reads the
              <strong> "BOM Parent Item"</strong> sheet (or <strong>"BOM"</strong>)
              for parent metadata and the <strong>"Component Item"</strong> sheet
              for child rows, joined on the <em>Parent Item</em> column.
            </p>

            <div className={styles.importChecklist}>
              <div className={styles.importChecklistItem}>
                <FaFileExcel />
                <span>
                  <strong>Format:</strong> .xlsx, .xls or .csv (max 10 MB)
                </span>
              </div>
              <div className={styles.importChecklistItem}>
                <FaBoxes />
                <span>
                  <strong>Sheets:</strong> "BOM Parent Item" + "Component Item"
                  (or a single "BOM" sheet)
                </span>
              </div>
              <div className={styles.importChecklistItem}>
                <FaClipboardList />
                <span>
                  <strong>Key column:</strong> "Item No." (parents) / "Parent Item" (components)
                </span>
              </div>
            </div>

            <div className={styles.importModeRow}>
              <label className={styles.importModeOption}>
                <input
                  type="radio"
                  name="bomImportMode"
                  value="upsert"
                  checked={importMode === "upsert"}
                  onChange={() => setImportMode("upsert")}
                  disabled={importUploading}
                />
                <span>
                  <strong>Upsert</strong> — update existing BOMs with the same
                  Item No.
                </span>
              </label>
              <label className={styles.importModeOption}>
                <input
                  type="radio"
                  name="bomImportMode"
                  value="insert"
                  checked={importMode === "insert"}
                  onChange={() => setImportMode("insert")}
                  disabled={importUploading}
                />
                <span>
                  <strong>Insert only</strong> — skip rows that already exist
                </span>
              </label>
            </div>

            <input
              ref={importInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleImportFile}
              style={{ display: "none" }}
            />

            {!importResult && !importError && !importUploading && (
              <button
                type="button"
                className={styles.importDropZone}
                onClick={pickImportFile}
              >
                <FaFileImport className={styles.importDropIcon} />
                <div className={styles.importDropTitle}>
                  Click to choose a file
                </div>
                <div className={styles.importDropHint}>
                  We'll parse both parent + component sheets automatically.
                </div>
              </button>
            )}

            {importFileName && (
              <div className={styles.importFileChip}>
                <FaFileExcel />
                {importFileName}
              </div>
            )}

            {importUploading && (
              <div className={styles.importLoading}>
                <div className={styles.spinner} aria-hidden="true" />
                <span>Parsing workbook and saving BOMs…</span>
              </div>
            )}

            {importError && (
              <div className={styles.errorBanner}>{importError}</div>
            )}

            {importResult && (
              <>
                <div className={styles.importSummaryGrid}>
                  <div className={styles.importSummaryChip}>
                    <span className={styles.chipLabel}>Total</span>
                    <span className={styles.chipValue}>{importResult.total}</span>
                  </div>
                  <div
                    className={`${styles.importSummaryChip} ${styles.chipCreated}`}
                  >
                    <span className={styles.chipLabel}>Created</span>
                    <span className={styles.chipValue}>
                      {importResult.created}
                    </span>
                  </div>
                  <div
                    className={`${styles.importSummaryChip} ${styles.chipUpdated}`}
                  >
                    <span className={styles.chipLabel}>Updated</span>
                    <span className={styles.chipValue}>
                      {importResult.updated}
                    </span>
                  </div>
                  <div
                    className={`${styles.importSummaryChip} ${styles.chipSkipped}`}
                  >
                    <span className={styles.chipLabel}>Skipped</span>
                    <span className={styles.chipValue}>
                      {importResult.skipped}
                    </span>
                  </div>
                  <div
                    className={`${styles.importSummaryChip} ${styles.chipFailed}`}
                  >
                    <span className={styles.chipLabel}>Failed</span>
                    <span className={styles.chipValue}>
                      {importResult.failed}
                    </span>
                  </div>
                  {typeof importResult.componentsImported === "number" && (
                    <div className={styles.importSummaryChip}>
                      <span className={styles.chipLabel}>Components</span>
                      <span className={styles.chipValue}>
                        {importResult.componentsImported}
                      </span>
                    </div>
                  )}
                </div>

                {importResult.failed > 0 && (
                  <div className={styles.failuresSection}>
                    <h4>Rows that failed</h4>
                    <div className={styles.failuresList}>
                      {(importResult.results || [])
                        .filter((r) => r.action === "failed")
                        .slice(0, 50)
                        .map((r, idx) => (
                          <div key={idx} className={styles.failureRow}>
                            <span className={styles.failureLabel}>
                              Row {r.row}
                              {r.itemNo ? ` · ${r.itemNo}` : ""}
                            </span>
                            <span className={styles.failureMsg}>
                              {r.message}
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </>
            )}

            <div className={styles.formActions}>
              {!importResult && !importUploading && (
                <button
                  type="button"
                  className={styles.secondaryBtn}
                  onClick={closeImportModal}
                  disabled={importUploading}
                >
                  Cancel
                </button>
              )}
              {(importResult || importError) && !importUploading && (
                <>
                  <button
                    type="button"
                    className={styles.secondaryBtn}
                    onClick={() => {
                      setImportResult(null);
                      setImportError("");
                      setImportFileName("");
                    }}
                  >
                    Import Another
                  </button>
                  <button
                    type="button"
                    className={styles.primaryBtn}
                    onClick={closeImportModal}
                  >
                    Done
                  </button>
                </>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
