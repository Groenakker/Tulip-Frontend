import styles from './RecordLifecycle.module.css';
import { FaLock, FaLockOpen, FaHistory } from 'react-icons/fa';

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

/**
 * Status banner for the close/reopen record workflow.
 * Shown at the top of the Shipping / Receiving detail pages.
 */
export default function RecordStatusBar({
    isSaved,
    recordStatus,
    closedAt,
    closedBy,
    reopenedAt,
    reopenedBy,
    reopenCount = 0,
    hasSignature,
    canReopen,
    closing,
    reopening,
    onCloseRecord,
    onReopenRecord,
    onShowHistory,
    closeRequirementHint = 'A saved signature is required before the record can be closed',
}) {
    if (!isSaved) return null;

    const isClosed = recordStatus === 'Closed';
    const closedByName = personName(closedBy);
    const reopenedByName = personName(reopenedBy);

    return (
        <div className={`${styles.statusBar} ${isClosed ? styles.statusBarClosed : ''}`}>
            <div className={styles.statusLeft}>
                <span className={`${styles.statusPill} ${isClosed ? styles.statusPillClosed : styles.statusPillOpen}`}>
                    {isClosed ? <FaLock /> : <FaLockOpen />}
                    {isClosed ? 'Closed' : 'Open'}
                </span>
                {isClosed ? (
                    <span className={styles.statusMeta}>
                        Record is read-only.
                        {closedAt && (
                            <> Closed{closedByName ? <> by <strong>{closedByName}</strong></> : null} on <strong>{formatDateTime(closedAt)}</strong>.</>
                        )}
                    </span>
                ) : reopenCount > 0 ? (
                    <span className={styles.statusMeta}>
                        Reopened{reopenedByName ? <> by <strong>{reopenedByName}</strong></> : null}
                        {reopenedAt ? <> on <strong>{formatDateTime(reopenedAt)}</strong></> : null}.
                        A new signature is required before this record can be closed again.
                    </span>
                ) : (
                    <span className={styles.statusMeta}>
                        Sign the record, then close it to lock it against further changes.
                    </span>
                )}
            </div>
            <div className={styles.statusRight}>
                {reopenCount > 0 && (
                    <button type="button" className={`${styles.lifecycleBtn} ${styles.historyBtn}`} onClick={onShowHistory}>
                        <FaHistory /> History ({reopenCount})
                    </button>
                )}
                {isClosed ? (
                    canReopen && (
                        <button
                            type="button"
                            className={`${styles.lifecycleBtn} ${styles.reopenBtn}`}
                            onClick={onReopenRecord}
                            disabled={reopening}
                        >
                            <FaLockOpen /> {reopening ? 'Reopening…' : 'Reopen Record'}
                        </button>
                    )
                ) : (
                    <button
                        type="button"
                        className={`${styles.lifecycleBtn} ${styles.closeBtn}`}
                        onClick={onCloseRecord}
                        disabled={closing || !hasSignature}
                        title={hasSignature ? 'Close this record and make it read-only' : closeRequirementHint}
                    >
                        <FaLock /> {closing ? 'Closing…' : 'Close Record'}
                    </button>
                )}
            </div>
        </div>
    );
}
