import { useState, useEffect } from 'react';
import Modal from '../Modal';
import styles from './RecordLifecycle.module.css';

const formatDateTime = (value) => {
    if (!value) return '';
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? '' : d.toLocaleString();
};

const personName = (person) => {
    if (!person) return '';
    if (typeof person === 'object') return person.name || person.email || '';
    return '';
};

const displayValue = (field, value) => {
    if (value === undefined || value === null || value === '') return '—';
    if (field.format) return field.format(value);
    return String(value);
};

/**
 * Record History modal for the close/reopen workflow.
 *
 * Versions are immutable snapshots taken every time a closed record is
 * reopened. The modal shows the initial (originally signed) record, every
 * later snapshot, and the current state — with field-level changes
 * highlighted between consecutive versions.
 *
 * Props:
 *  - title:        modal heading (e.g. "Record History — GRK-SHP-123")
 *  - versionsUrl:  GET endpoint returning versions sorted oldest-first
 *  - currentRecord: object with the record's current values
 *  - currentLines: current line items array (omit for records without lines)
 *  - fields:       [{ key, label, format? }] fields to display/diff
 *  - signatureKey: record field holding the signature data URL, OR
 *  - signatureKeys: [{ key, label }] for records with multiple signatures
 *  - onClose:      close handler
 */
export default function RecordHistoryModal({
    title,
    versionsUrl,
    currentRecord,
    currentLines,
    fields,
    signatureKey,
    signatureKeys,
    onClose,
}) {
    // Records like Shipping/Receiving have child line items; Samples don't.
    const hasLines = Array.isArray(currentLines);
    const signatureDefs = Array.isArray(signatureKeys)
        ? signatureKeys
        : signatureKey
            ? [{ key: signatureKey, label: 'Signature on this version' }]
            : [];
    const [versions, setVersions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const load = async () => {
            try {
                const res = await fetch(versionsUrl, { credentials: 'include' });
                if (!res.ok) throw new Error('Failed to load record history');
                const data = await res.json();
                setVersions(Array.isArray(data) ? data : []);
            } catch (e) {
                console.error('Error loading record history:', e);
                setError(e.message || 'Failed to load record history');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [versionsUrl]);

    // Build the timeline: every stored snapshot followed by the current
    // record, so each entry can be diffed against the one before it.
    const entries = [
        ...versions.map((v) => ({
            key: `v${v.versionNumber}`,
            name: v.versionNumber === 1 ? `Version ${v.versionNumber} (initial record)` : `Version ${v.versionNumber}`,
            meta: `Snapshot taken when reopened by ${personName(v.createdBy) || 'unknown user'} on ${formatDateTime(v.createdAt)}`,
            data: v.snapshot || {},
            lines: Array.isArray(v.lines) ? v.lines : [],
            isCurrent: false,
        })),
        {
            key: 'current',
            name: 'Current record',
            meta: `${versions.length} change ${versions.length === 1 ? 'cycle' : 'cycles'} since the initial record`,
            data: currentRecord || {},
            lines: Array.isArray(currentLines) ? currentLines : [],
            isCurrent: true,
        },
    ];

    const diffAgainstPrevious = (entry, prev) => {
        if (!prev) return null;
        const changes = [];
        for (const field of fields) {
            const oldVal = displayValue(field, prev.data?.[field.key]);
            const newVal = displayValue(field, entry.data?.[field.key]);
            if (oldVal !== newVal) {
                changes.push({ label: field.label, oldVal, newVal });
            }
        }
        if (hasLines) {
            const prevCount = prev.lines?.length ?? 0;
            const curCount = entry.lines?.length ?? 0;
            if (prevCount !== curCount) {
                changes.push({ label: 'Line items', oldVal: `${prevCount} item(s)`, newVal: `${curCount} item(s)` });
            }
        }
        return changes;
    };

    return (
        <Modal onClose={onClose}>
            <div className={styles.historyModal}>
                <h3 className={styles.historyTitle}>{title || 'Record History'}</h3>
                <p className={styles.historySubtitle}>
                    A version snapshot is saved every time a closed record is reopened for editing.
                </p>

                {loading ? (
                    <div className={styles.historyLoading}>Loading history…</div>
                ) : error ? (
                    <div className={styles.historyEmpty}>{error}</div>
                ) : versions.length === 0 ? (
                    <div className={styles.historyEmpty}>
                        No previous versions. This record has never been reopened after closing.
                    </div>
                ) : (
                    entries.map((entry, idx) => {
                        const prev = idx > 0 ? entries[idx - 1] : null;
                        const changes = diffAgainstPrevious(entry, prev);
                        return (
                            <div
                                key={entry.key}
                                className={`${styles.versionCard} ${entry.isCurrent ? styles.versionCardCurrent : ''}`}
                            >
                                <div className={styles.versionHeader}>
                                    <span className={styles.versionName}>{entry.name}</span>
                                    <span className={styles.versionMeta}>{entry.meta}</span>
                                </div>

                                {changes && (
                                    changes.length > 0 ? (
                                        <ul className={styles.changeList}>
                                            {changes.map((c) => (
                                                <li key={c.label} className={styles.changeItem}>
                                                    <strong>{c.label}:</strong>{' '}
                                                    <span className={styles.changeOld}>{c.oldVal}</span>
                                                    <span className={styles.changeNew}>{c.newVal}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <div className={styles.noChanges}>No field changes compared to the previous version.</div>
                                    )
                                )}

                                <details className={styles.fullRecordDetails} open={idx === 0}>
                                    <summary>View full record</summary>
                                    <table className={styles.fieldTable}>
                                        <tbody>
                                            {fields.map((field) => (
                                                <tr key={field.key}>
                                                    <td>{field.label}</td>
                                                    <td>{displayValue(field, entry.data?.[field.key])}</td>
                                                </tr>
                                            ))}
                                            {hasLines && (
                                                <tr>
                                                    <td>Line items</td>
                                                    <td>{entry.lines?.length ?? 0} item(s)</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                    {signatureDefs.map(({ key, label }) => {
                                        const signature = entry.data?.[key];
                                        if (!signature) return null;
                                        return (
                                            <div key={key} className={styles.signatureThumbWrap}>
                                                <div className={styles.signatureThumbLabel}>{label}</div>
                                                <img src={signature} alt={label} className={styles.signatureThumb} />
                                            </div>
                                        );
                                    })}
                                </details>
                            </div>
                        );
                    })
                )}
            </div>
        </Modal>
    );
}
