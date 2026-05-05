import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    FaBoxOpen,
    FaCheckCircle,
    FaExclamationTriangle,
    FaMapMarkerAlt,
    FaRoute,
    FaShippingFast,
    FaSyncAlt,
    FaTruck,
    FaWarehouse,
} from 'react-icons/fa';
import toast from '../../../components/Toaster/toast';
import styles from './TrackingPage.module.css';

/**
 * TrackingView
 *
 * Reusable in-app tracking block. Renders the full tracking experience
 * (status badge, progress stepper, route card, meta grid, event timeline)
 * for a given Shipping record. No page chrome (no Header / WhiteIsland) —
 * the parent decides how to frame it.
 *
 * Data sources (all server-side):
 *   - GET /api/shipping/:id            — shipping record details
 *   - GET /api/shippo/shipping/:id/track — live Shippo tracking refresh
 *
 * Props:
 *   - shippingId      : string (required)
 *   - initialShipping : object (optional) — if the parent already has the
 *                       shipping doc loaded, pass it to avoid a redundant
 *                       fetch on mount.
 *   - onShippingUpdated : (shipping) => void (optional) — notified whenever
 *                         this component re-fetches the shipping record.
 *   - autoRefresh     : boolean (default true) — auto-poll every 60s while
 *                       the package is in flight.
 */
export default function TrackingView({
    shippingId,
    initialShipping = null,
    onShippingUpdated,
    autoRefresh = true,
}) {
    const [shipping, setShipping] = useState(initialShipping);
    const [tracking, setTracking] = useState(null);
    const [loading, setLoading] = useState(!initialShipping);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState('');
    const [lastRefreshedAt, setLastRefreshedAt] = useState(null);
    const pollRef = useRef(null);

    const apiBase = import.meta.env.VITE_BACKEND_URL;

    // --- Data fetching ------------------------------------------------------

    const loadShipping = async () => {
        const res = await fetch(`${apiBase}/api/shipping/${shippingId}`);
        if (!res.ok) throw new Error('Failed to load shipping record');
        return res.json();
    };

    const loadTracking = async () => {
        const res = await fetch(`${apiBase}/api/shippo/shipping/${shippingId}/track`);
        const data = await res.json();
        if (!res.ok) {
            const err = new Error(data?.message || 'Failed to fetch tracking');
            err.data = data;
            throw err;
        }
        return data;
    };

    const refresh = async ({ silent = false } = {}) => {
        try {
            if (!silent) setRefreshing(true);
            const [ship, track] = await Promise.all([loadShipping(), loadTracking()]);
            setShipping(ship);
            if (onShippingUpdated) onShippingUpdated(ship);
            setTracking(track);
            setLastRefreshedAt(new Date());
            setError('');
        } catch (err) {
            setError(err.message || 'Failed to refresh tracking');
            if (!silent) toast.error(err.message || 'Failed to refresh tracking');
        } finally {
            if (!silent) setRefreshing(false);
        }
    };

    // Initial load.
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                setLoading(true);
                let ship = initialShipping;
                if (!ship) {
                    ship = await loadShipping();
                    if (cancelled) return;
                    setShipping(ship);
                    if (onShippingUpdated) onShippingUpdated(ship);
                }

                if (!ship.trackingNumber || !ship.carrier) {
                    setError('No tracking number yet. Purchase a label to enable tracking.');
                    return;
                }

                const track = await loadTracking();
                if (cancelled) return;
                setTracking(track);
                setLastRefreshedAt(new Date());
            } catch (err) {
                if (!cancelled) setError(err.message || 'Failed to load tracking');
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [shippingId]);

    // Keep internal state in sync if the parent swaps the shipping doc (e.g.
    // immediately after a label is purchased).
    useEffect(() => {
        if (initialShipping) setShipping(initialShipping);
    }, [initialShipping]);

    // Auto-poll while the package is in flight. Stops at DELIVERED / FAILURE
    // / RETURNED or when the component unmounts.
    useEffect(() => {
        if (!autoRefresh) return undefined;
        const status = tracking?.tracking_status?.status || shipping?.trackingStatus;
        const isTerminal = status === 'DELIVERED' || status === 'FAILURE' || status === 'RETURNED';
        if (!shipping?.trackingNumber || !shipping?.carrier || isTerminal) {
            if (pollRef.current) {
                clearInterval(pollRef.current);
                pollRef.current = null;
            }
            return undefined;
        }
        pollRef.current = setInterval(() => {
            refresh({ silent: true });
        }, 60_000);
        return () => {
            if (pollRef.current) clearInterval(pollRef.current);
            pollRef.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [shipping?.trackingNumber, shipping?.carrier, tracking?.tracking_status?.status, autoRefresh]);

    // --- Derived view model -------------------------------------------------

    const currentStatus =
        tracking?.tracking_status?.status || shipping?.trackingStatus || 'UNKNOWN';
    const currentStatusDetails =
        tracking?.tracking_status?.status_details || shipping?.trackingStatusDetails || '';

    // Shippo's well-known tracking states, in order.
    const PROGRESS_STATES = ['PRE_TRANSIT', 'TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED'];
    const progressIndex = useMemo(() => {
        const idx = PROGRESS_STATES.indexOf(currentStatus);
        if (idx >= 0) return idx;
        if (currentStatus === 'FAILURE' || currentStatus === 'RETURNED') return 1;
        return -1;
    }, [currentStatus]);

    const historyDesc = useMemo(() => {
        const list = tracking?.tracking_history || shipping?.trackingHistory || [];
        return [...list].sort(
            (a, b) => new Date(b.status_date || 0) - new Date(a.status_date || 0)
        );
    }, [tracking, shipping]);

    // --- UI helpers ---------------------------------------------------------

    const statusIcon = (status) => {
        switch (status) {
            case 'DELIVERED':
                return <FaCheckCircle />;
            case 'OUT_FOR_DELIVERY':
                return <FaTruck />;
            case 'TRANSIT':
                return <FaShippingFast />;
            case 'PRE_TRANSIT':
                return <FaWarehouse />;
            case 'FAILURE':
            case 'RETURNED':
                return <FaExclamationTriangle />;
            default:
                return <FaBoxOpen />;
        }
    };

    const formatAddress = (addr) => {
        if (!addr) return '—';
        const parts = [addr.city, addr.state, addr.zip, addr.country].filter(Boolean);
        return parts.join(', ') || '—';
    };

    const formatDate = (d) => {
        if (!d) return '';
        try {
            return new Date(d).toLocaleString();
        } catch {
            return String(d);
        }
    };

    // --- Render -------------------------------------------------------------

    if (loading) {
        return <div className={styles.emptyState}>Loading tracking…</div>;
    }

    // If we don't have a tracking number at all, show a friendly empty
    // state rather than a confusing partially-rendered block.
    if (!shipping?.trackingNumber || !shipping?.carrier) {
        return (
            <div className={styles.emptyState}>
                {error ||
                    'No tracking number yet. Purchase a label to enable tracking.'}
            </div>
        );
    }

    return (
        <div className={styles.page}>
            {/* Top bar: refresh only (no back button — we're inline). */}
            <div className={styles.topBar}>
                <div />
                <div className={styles.topBarRight}>
                    {lastRefreshedAt && (
                        <span className={styles.lastRefreshed}>
                            Last updated: {lastRefreshedAt.toLocaleTimeString()}
                        </span>
                    )}
                    <button
                        type='button'
                        className={styles.refreshBtn}
                        onClick={() => refresh()}
                        disabled={refreshing}
                    >
                        <FaSyncAlt className={refreshing ? styles.spin : ''} />
                        {refreshing ? 'Refreshing…' : 'Refresh'}
                    </button>
                </div>
            </div>

            {error && !tracking && (
                <div className={styles.errorBox}>
                    <FaExclamationTriangle /> {error}
                </div>
            )}

            {/* Summary header */}
            <div className={styles.summaryCard}>
                <div className={styles.summaryLeft}>
                    <div className={styles.codeRow}>
                        <span className={styles.shippingCode}>
                            {shipping.shippingCode || shipping._id}
                        </span>
                        {shipping.carrier && (
                            <span className={styles.carrierChip}>
                                {String(shipping.carrier).toUpperCase()}
                                {shipping.serviceLevelName
                                    ? ` · ${shipping.serviceLevelName}`
                                    : ''}
                            </span>
                        )}
                    </div>
                    <div className={styles.trackingNumberRow}>
                        <span className={styles.trackingLabel}>Tracking #</span>
                        <span className={styles.trackingNumber}>
                            {shipping.trackingNumber || '—'}
                        </span>
                    </div>
                </div>

                <div className={styles.statusBadge} data-status={currentStatus}>
                    <span className={styles.statusIcon}>{statusIcon(currentStatus)}</span>
                    <div className={styles.statusText}>
                        <div className={styles.statusLabel}>
                            {currentStatus.replace(/_/g, ' ')}
                        </div>
                        {currentStatusDetails && (
                            <div className={styles.statusDetails}>{currentStatusDetails}</div>
                        )}
                    </div>
                </div>
            </div>

            {/* Progress stepper */}
            {progressIndex >= 0 && (
                <div className={styles.progressWrap}>
                    <div className={styles.progressLine}>
                        <div
                            className={styles.progressLineFill}
                            style={{
                                width: `${(progressIndex / (PROGRESS_STATES.length - 1)) * 100}%`,
                            }}
                        />
                    </div>
                    <div className={styles.progressSteps}>
                        {PROGRESS_STATES.map((s, i) => {
                            const reached = i <= progressIndex;
                            const active = i === progressIndex;
                            return (
                                <div
                                    key={s}
                                    className={`${styles.progressStep} ${reached ? styles.reached : ''} ${active ? styles.active : ''}`}
                                >
                                    <div className={styles.progressDot}>{statusIcon(s)}</div>
                                    <div className={styles.progressStepLabel}>
                                        {s.replace(/_/g, ' ')}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Route card */}
            <div className={styles.routeCard}>
                <div className={styles.routeEnd}>
                    <div className={styles.routeIcon}>
                        <FaWarehouse />
                    </div>
                    <div>
                        <div className={styles.routeLabel}>From</div>
                        <div className={styles.routeCompany}>
                            {shipping.shipFrom?.company ||
                                shipping.shipFrom?.name ||
                                shipping.shipmentOrigin ||
                                '—'}
                        </div>
                        <div className={styles.routeAddress}>
                            {formatAddress(shipping.shipFrom)}
                        </div>
                    </div>
                </div>

                <div className={styles.routeMiddle}>
                    <FaRoute />
                    {tracking?.eta && (
                        <span className={styles.etaPill}>
                            ETA {formatDate(tracking.eta)}
                        </span>
                    )}
                </div>

                <div className={styles.routeEnd}>
                    <div className={styles.routeIcon}>
                        <FaMapMarkerAlt />
                    </div>
                    <div>
                        <div className={styles.routeLabel}>To</div>
                        <div className={styles.routeCompany}>
                            {shipping.customerSnapshot?.company ||
                                shipping.customerSnapshot?.name ||
                                shipping.shipmentDestination ||
                                '—'}
                        </div>
                        <div className={styles.routeAddress}>
                            {formatAddress(shipping.customerSnapshot)}
                        </div>
                    </div>
                </div>
            </div>

            {/* Meta grid */}
            <div className={styles.metaGrid}>
                <div className={styles.metaItem}>
                    <div className={styles.metaLabel}>Parcel</div>
                    <div className={styles.metaValue}>
                        {shipping.parcel
                            ? `${shipping.parcel.length} × ${shipping.parcel.width} × ${shipping.parcel.height} ${shipping.parcel.distance_unit || 'in'}, ${shipping.parcel.weight} ${shipping.parcel.mass_unit || 'lb'}`
                            : '—'}
                    </div>
                </div>
                <div className={styles.metaItem}>
                    <div className={styles.metaLabel}>Service</div>
                    <div className={styles.metaValue}>
                        {shipping.serviceLevelName || shipping.serviceLevel || '—'}
                    </div>
                </div>
                <div className={styles.metaItem}>
                    <div className={styles.metaLabel}>Cost</div>
                    <div className={styles.metaValue}>
                        {shipping.shippingCost
                            ? `${shipping.shippingCurrency || 'USD'} ${shipping.shippingCost}`
                            : '—'}
                    </div>
                </div>
                <div className={styles.metaItem}>
                    <div className={styles.metaLabel}>Shipped on</div>
                    <div className={styles.metaValue}>
                        {shipping.shipmentDate
                            ? new Date(shipping.shipmentDate).toLocaleDateString()
                            : '—'}
                    </div>
                </div>
                <div className={styles.metaItem}>
                    <div className={styles.metaLabel}>Status</div>
                    <div className={styles.metaValue}>{shipping.status || '—'}</div>
                </div>
            </div>

            {/* Event timeline */}
            <div className={styles.timelineSection}>
                <h3 className={styles.sectionTitle}>Tracking events</h3>
                {historyDesc.length === 0 ? (
                    <div className={styles.emptyState}>
                        No tracking events yet. Events appear here as the carrier scans your package.
                    </div>
                ) : (
                    <ul className={styles.timeline}>
                        {historyDesc.map((ev, i) => (
                            <li key={i} className={styles.timelineItem}>
                                <div
                                    className={styles.timelineDot}
                                    data-status={ev.status}
                                >
                                    {statusIcon(ev.status)}
                                </div>
                                <div className={styles.timelineContent}>
                                    <div className={styles.timelineHeader}>
                                        <span className={styles.timelineStatus}>
                                            {(ev.status || '').replace(/_/g, ' ')}
                                        </span>
                                        <span className={styles.timelineDate}>
                                            {formatDate(ev.status_date)}
                                        </span>
                                    </div>
                                    {ev.status_details && (
                                        <div className={styles.timelineDetails}>
                                            {ev.status_details}
                                        </div>
                                    )}
                                    {ev.location &&
                                        (ev.location.city ||
                                            ev.location.state ||
                                            ev.location.country) && (
                                            <div className={styles.timelineLocation}>
                                                <FaMapMarkerAlt />{' '}
                                                {[
                                                    ev.location.city,
                                                    ev.location.state,
                                                    ev.location.zip,
                                                    ev.location.country,
                                                ]
                                                    .filter(Boolean)
                                                    .join(', ')}
                                            </div>
                                        )}
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}
