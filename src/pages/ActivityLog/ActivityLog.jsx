import React, { useEffect, useMemo, useState } from 'react';
import {
    FaChevronDown,
    FaChevronRight,
    FaClipboardList,
    FaExclamationTriangle,
    FaFilter,
    FaPlusCircle,
    FaSearch,
    FaSyncAlt,
    FaTimes,
    FaTrashAlt,
    FaUndo,
    FaUserCircle,
} from 'react-icons/fa';
import Header from '../../components/Header';
import WhiteIsland from '../../components/Whiteisland';
import styles from './ActivityLog.module.css';

/**
 * ActivityLog
 *
 * Tenant-scoped audit log browser. Lists every meaningful change made in
 * the app with who/what/when/before/after details. Data is fully
 * server-rendered — all filtering happens through the backend so large
 * histories stay fast.
 */
export default function ActivityLog() {
    const apiBase = import.meta.env.VITE_BACKEND_URL;

    const [items, setItems] = useState([]);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [pageSize] = useState(25);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [expanded, setExpanded] = useState(() => new Set());

    // Filters
    const [q, setQ] = useState('');
    const [action, setAction] = useState('');
    const [module, setModule] = useState('');
    const [userId, setUserId] = useState('');
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');

    // Facets (dropdown options)
    const [facets, setFacets] = useState({
        modules: [],
        actions: [],
        users: [],
    });

    const buildQueryString = () => {
        const params = new URLSearchParams();
        params.set('page', String(page));
        params.set('limit', String(pageSize));
        if (q.trim()) params.set('q', q.trim());
        if (action) params.set('action', action);
        if (module) params.set('module', module);
        if (userId) params.set('user_id', userId);
        if (from) params.set('from', new Date(from).toISOString());
        if (to) {
            // Include the entire "to" day (23:59:59).
            const d = new Date(to);
            d.setHours(23, 59, 59, 999);
            params.set('to', d.toISOString());
        }
        return params.toString();
    };

    const fetchLogs = async () => {
        setLoading(true);
        setError('');
        try {
            const res = await fetch(
                `${apiBase}/api/audit-logs?${buildQueryString()}`
            );
            const data = await res.json();
            if (!res.ok) throw new Error(data?.message || 'Failed to load logs');
            setItems(data.items || []);
            setTotal(data.total || 0);
            setTotalPages(data.totalPages || 1);
        } catch (err) {
            setError(err.message || 'Failed to load activity log');
            setItems([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchFacets = async () => {
        try {
            const res = await fetch(`${apiBase}/api/audit-logs/facets`);
            if (!res.ok) return;
            const data = await res.json();
            setFacets(data || { modules: [], actions: [], users: [] });
        } catch {
            // best-effort only
        }
    };

    useEffect(() => {
        fetchFacets();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        fetchLogs();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, action, module, userId, from, to]);

    // Debounce the free-text search so we don't slam the API on every keystroke.
    useEffect(() => {
        const t = setTimeout(() => {
            setPage(1);
            fetchLogs();
        }, 400);
        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [q]);

    const resetFilters = () => {
        setQ('');
        setAction('');
        setModule('');
        setUserId('');
        setFrom('');
        setTo('');
        setPage(1);
    };

    const toggleRow = (id) => {
        setExpanded((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const actionIcon = (a) => {
        switch (a) {
            case 'create':
                return <FaPlusCircle />;
            case 'update':
                return <FaSyncAlt />;
            case 'delete':
                return <FaTrashAlt />;
            case 'login':
            case 'logout':
                return <FaUserCircle />;
            default:
                return <FaClipboardList />;
        }
    };

    const formatDate = (d) => {
        if (!d) return '—';
        try {
            return new Date(d).toLocaleString();
        } catch {
            return String(d);
        }
    };

    const relativeTime = (d) => {
        if (!d) return '';
        const ms = Date.now() - new Date(d).getTime();
        if (ms < 0) return '';
        const s = Math.floor(ms / 1000);
        if (s < 60) return `${s}s ago`;
        const m = Math.floor(s / 60);
        if (m < 60) return `${m}m ago`;
        const h = Math.floor(m / 60);
        if (h < 24) return `${h}h ago`;
        const days = Math.floor(h / 24);
        if (days < 30) return `${days}d ago`;
        const months = Math.floor(days / 30);
        if (months < 12) return `${months}mo ago`;
        return `${Math.floor(months / 12)}y ago`;
    };

    const hasActiveFilters = useMemo(
        () => Boolean(q || action || module || userId || from || to),
        [q, action, module, userId, from, to]
    );

    return (
        <>
            <Header title='Activity Log' />
            <WhiteIsland className='WhiteIsland'>
                <div className={styles.page}>
                    {/* --- Header / filter bar -------------------------------- */}
                    <div className={styles.filterBar}>
                        <div className={styles.searchWrap}>
                            <FaSearch className={styles.searchIcon} />
                            <input
                                type='search'
                                className={styles.searchInput}
                                placeholder='Search by record, user, email, description…'
                                value={q}
                                onChange={(e) => setQ(e.target.value)}
                            />
                        </div>

                        <select
                            className={styles.filterSelect}
                            value={action}
                            onChange={(e) => {
                                setPage(1);
                                setAction(e.target.value);
                            }}
                        >
                            <option value=''>All actions</option>
                            {facets.actions.map((a) => (
                                <option key={a} value={a}>
                                    {a.charAt(0).toUpperCase() + a.slice(1)}
                                </option>
                            ))}
                        </select>

                        <select
                            className={styles.filterSelect}
                            value={module}
                            onChange={(e) => {
                                setPage(1);
                                setModule(e.target.value);
                            }}
                        >
                            <option value=''>All modules</option>
                            {facets.modules.map((m) => (
                                <option key={m} value={m}>
                                    {m}
                                </option>
                            ))}
                        </select>

                        <select
                            className={styles.filterSelect}
                            value={userId}
                            onChange={(e) => {
                                setPage(1);
                                setUserId(e.target.value);
                            }}
                        >
                            <option value=''>All users</option>
                            {facets.users.map((u) => (
                                <option key={u.user_id} value={u.user_id}>
                                    {u.user_name}
                                    {u.user_email ? ` (${u.user_email})` : ''}
                                </option>
                            ))}
                        </select>

                        <input
                            type='date'
                            className={styles.filterSelect}
                            value={from}
                            onChange={(e) => {
                                setPage(1);
                                setFrom(e.target.value);
                            }}
                            title='From date'
                        />
                        <input
                            type='date'
                            className={styles.filterSelect}
                            value={to}
                            onChange={(e) => {
                                setPage(1);
                                setTo(e.target.value);
                            }}
                            title='To date'
                        />

                        {hasActiveFilters && (
                            <button
                                type='button'
                                className={styles.resetBtn}
                                onClick={resetFilters}
                                title='Clear all filters'
                            >
                                <FaUndo /> Reset
                            </button>
                        )}

                        <button
                            type='button'
                            className={styles.refreshBtn}
                            onClick={fetchLogs}
                            disabled={loading}
                        >
                            <FaSyncAlt className={loading ? styles.spin : ''} />
                            {loading ? 'Loading…' : 'Refresh'}
                        </button>
                    </div>

                    {/* --- Meta strip ----------------------------------------- */}
                    <div className={styles.metaStrip}>
                        <FaFilter />
                        <span>
                            {loading
                                ? 'Loading activity…'
                                : `${total.toLocaleString()} ${total === 1 ? 'entry' : 'entries'}`}
                        </span>
                        {hasActiveFilters && !loading && (
                            <span className={styles.filterPill}>
                                Filters active
                            </span>
                        )}
                    </div>

                    {/* --- Error state ---------------------------------------- */}
                    {error && (
                        <div className={styles.errorBox}>
                            <FaExclamationTriangle /> {error}
                        </div>
                    )}

                    {/* --- List ---------------------------------------------- */}
                    {!loading && items.length === 0 && !error && (
                        <div className={styles.emptyState}>
                            <FaClipboardList size={40} />
                            <p>No activity recorded yet.</p>
                            <p className={styles.emptyHint}>
                                Changes across the app will show up here with
                                full before/after details.
                            </p>
                        </div>
                    )}

                    <ul className={styles.logList}>
                        {items.map((it) => {
                            const isOpen = expanded.has(it._id);
                            return (
                                <li
                                    key={it._id}
                                    className={styles.logItem}
                                    data-action={it.action}
                                >
                                    <button
                                        type='button'
                                        className={styles.logHeader}
                                        onClick={() => toggleRow(it._id)}
                                    >
                                        <span
                                            className={styles.actionIcon}
                                            data-action={it.action}
                                        >
                                            {actionIcon(it.action)}
                                        </span>
                                        <div className={styles.logSummary}>
                                            <div className={styles.logLine1}>
                                                <span className={styles.actionLabel}>
                                                    {(it.action || '').toUpperCase()}
                                                </span>
                                                <span className={styles.moduleChip}>
                                                    {it.module || it.entity_type || 'General'}
                                                </span>
                                                {/* <span className={styles.entityLabel}>
                                                    {it.entity_label || it.entity_id || '—'}
                                                </span> */}
                                                {Array.isArray(it.changes) &&
                                                    it.changes.length > 0 && (
                                                        <span className={styles.changeCount}>
                                                            {it.changes.length} change
                                                            {it.changes.length === 1 ? '' : 's'}
                                                        </span>
                                                    )}
                                            </div>
                                            <div className={styles.logLine2}>
                                                <FaUserCircle />
                                                <span>
                                                    {it.user_name || 'Unknown'}
                                                    {it.user_email ? ` · ${it.user_email}` : ''}
                                                </span>
                                                <span className={styles.dot}>·</span>
                                                <span title={formatDate(it.createdAt)}>
                                                    {relativeTime(it.createdAt)}
                                                </span>
                                                <span className={styles.dot}>·</span>
                                                <span className={styles.timestamp}>
                                                    {formatDate(it.createdAt)}
                                                </span>
                                            </div>
                                        </div>
                                        <span className={styles.chevron}>
                                            {isOpen ? <FaChevronDown /> : <FaChevronRight />}
                                        </span>
                                    </button>

                                    {isOpen && (
                                        <div className={styles.logDetails}>
                                            {it.description && (
                                                <div className={styles.detailsDescription}>
                                                    {it.description}
                                                </div>
                                            )}

                                            {Array.isArray(it.changes) &&
                                                it.changes.length > 0 && (
                                                    <div className={styles.changesSection}>
                                                        <h4>Changes</h4>
                                                        <table className={styles.changesTable}>
                                                            <thead>
                                                                <tr>
                                                                    <th>Field</th>
                                                                    <th>Before</th>
                                                                    <th>After</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {it.changes.map((c, i) => (
                                                                    <tr key={i}>
                                                                        <td className={styles.fieldName}>
                                                                            {c.field}
                                                                        </td>
                                                                        <td className={styles.beforeCell}>
                                                                            <ValueView value={c.before} />
                                                                        </td>
                                                                        <td className={styles.afterCell}>
                                                                            <ValueView value={c.after} />
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                )}

                                            {/* If no structured changes, show the raw before/after snapshots
                                                so creates/deletes still have context. */}
                                            {(!it.changes || it.changes.length === 0) && (
                                                <div className={styles.snapshotGrid}>
                                                    <SnapshotCard title='Before' value={it.before} />
                                                    <SnapshotCard title='After' value={it.after} />
                                                </div>
                                            )}

                                            <div className={styles.metaGrid}>
                                                <div>
                                                    <span className={styles.metaLabel}>Method</span>
                                                    <span className={styles.metaValue}>
                                                        {it.method || '—'}
                                                    </span>
                                                </div>
                                                <div>
                                                    <span className={styles.metaLabel}>Path</span>
                                                    <span className={styles.metaValue}>
                                                        {it.path || '—'}
                                                    </span>
                                                </div>
                                                <div>
                                                    <span className={styles.metaLabel}>IP</span>
                                                    <span className={styles.metaValue}>
                                                        {it.ip || '—'}
                                                    </span>
                                                </div>
                                                <div>
                                                    <span className={styles.metaLabel}>Entity ID</span>
                                                    <span className={styles.metaValue}>
                                                        {it.entity_id || '—'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </li>
                            );
                        })}
                    </ul>

                    {/* --- Pagination ---------------------------------------- */}
                    {totalPages > 1 && (
                        <div className={styles.pagination}>
                            <button
                                type='button'
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                disabled={page <= 1 || loading}
                            >
                                ← Previous
                            </button>
                            <span className={styles.pageInfo}>
                                Page {page} of {totalPages}
                            </span>
                            <button
                                type='button'
                                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                disabled={page >= totalPages || loading}
                            >
                                Next →
                            </button>
                        </div>
                    )}
                </div>
            </WhiteIsland>
        </>
    );
}

// -----------------------------------------------------------------------------
// Helpers: render arbitrary JSON values in a readable way.
// -----------------------------------------------------------------------------

function ValueView({ value }) {
    if (value === null || value === undefined || value === '') {
        return <span className={styles.emptyValue}>—</span>;
    }
    if (typeof value === 'object') {
        const json = JSON.stringify(value, null, 2);
        // Inline short objects; collapse big ones.
        if (json.length <= 120) {
            return <code className={styles.inlineCode}>{json}</code>;
        }
        return <pre className={styles.jsonBlock}>{json}</pre>;
    }
    if (typeof value === 'boolean') {
        return <span className={styles.boolValue}>{String(value)}</span>;
    }
    return <span>{String(value)}</span>;
}

function SnapshotCard({ title, value }) {
    const [open, setOpen] = useState(false);
    if (value == null) {
        return (
            <div className={styles.snapshotCard}>
                <h5>{title}</h5>
                <div className={styles.emptyValue}>— (no data)</div>
            </div>
        );
    }
    const json = JSON.stringify(value, null, 2);
    const short = json.length <= 300;
    return (
        <div className={styles.snapshotCard}>
            <div className={styles.snapshotHeader}>
                <h5>{title}</h5>
                {!short && (
                    <button
                        type='button'
                        className={styles.snapshotToggle}
                        onClick={() => setOpen((v) => !v)}
                    >
                        {open ? (
                            <>
                                <FaTimes /> Collapse
                            </>
                        ) : (
                            'Expand'
                        )}
                    </button>
                )}
            </div>
            <pre className={`${styles.jsonBlock} ${!short && !open ? styles.jsonCollapsed : ''}`}>
                {json}
            </pre>
        </div>
    );
}
