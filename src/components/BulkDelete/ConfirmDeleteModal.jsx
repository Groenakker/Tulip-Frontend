import React from "react";
import { FaExclamationTriangle } from "react-icons/fa";
import Modal from "../Modal";
import styles from "./BulkDelete.module.css";

/**
 * Reusable confirmation modal for bulk-delete actions.
 *
 * Props:
 *   open               — controls visibility
 *   count              — number of records being deleted
 *   entityLabel        — singular noun, e.g. "project"
 *   previewItems       — up to ~5 selected items to show in a small preview
 *   renderPreviewItem  — (item) => ReactNode for each preview entry. Defaults
 *                        to "<strong>{code/number}</strong> — {name}".
 *   onCancel           — close modal (no-op while deleting)
 *   onConfirm          — perform the delete
 *   deleting           — true while the API request is in flight
 *   description        — optional extra paragraph; sensible default provided
 */
const defaultRender = (item) => {
  const id =
    item?.partnerNumber ||
    item?.projectID ||
    item?.code ||
    item?.warehouseCode ||
    item?.instanceCode ||
    item?.sampleCode ||
    item?.receivingNumber ||
    item?.shippingNumber ||
    item?.title ||
    item?.name ||
    item?._id;
  const label = item?.name || item?.description || item?.title || "";
  return (
    <>
      <strong>{String(id)}</strong>
      {label && id !== label ? <span> — {label}</span> : null}
    </>
  );
};

export default function ConfirmDeleteModal({
  open,
  count = 0,
  entityLabel = "record",
  previewItems = [],
  renderPreviewItem = defaultRender,
  onCancel,
  onConfirm,
  deleting = false,
  description,
}) {
  if (!open) return null;
  const preview = previewItems.slice(0, 5);
  const noun = `${entityLabel}${count === 1 ? "" : "s"}`;

  return (
    <Modal onClose={deleting ? () => {} : onCancel}>
      <div className={styles.confirmModal}>
        <div className={styles.confirmHeader}>
          <span className={styles.confirmIcon}>
            <FaExclamationTriangle />
          </span>
          <h3>
            Delete {count} {noun}?
          </h3>
        </div>
        <p className={styles.confirmBody}>
          {description ||
            `This action is permanent and cannot be undone. The selected ${noun} will be removed from the system.`}
        </p>

        {preview.length > 0 && (
          <div className={styles.previewBox}>
            <div className={styles.previewLabel}>You're about to delete:</div>
            <ul className={styles.previewList}>
              {preview.map((item, idx) => (
                <li key={item?._id || idx}>{renderPreviewItem(item)}</li>
              ))}
              {count > preview.length && (
                <li className={styles.previewMore}>
                  …and {count - preview.length} more
                </li>
              )}
            </ul>
          </div>
        )}

        <div className={styles.confirmActions}>
          <button
            type="button"
            className={styles.cancelBtn}
            onClick={onCancel}
            disabled={deleting}
          >
            Cancel
          </button>
          <button
            type="button"
            className={styles.confirmDeleteBtn}
            onClick={onConfirm}
            disabled={deleting}
          >
            {deleting ? "Deleting..." : `Delete ${count}`}
          </button>
        </div>
      </div>
    </Modal>
  );
}
