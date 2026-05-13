import { useEffect, useMemo, useRef, useState } from 'react';
import styles from './TariffCodePicker.module.css';

/**
 * Searchable autocomplete for U.S. Schedule B / HS tariff codes.
 *
 * Calls the backend (`/api/tariff-codes/search` and `/recent`) — the
 * dataset lives in Mongo, populated by `scripts/loadScheduleB.js`. The
 * user can type a description ("plastic tubing") or a numeric prefix
 * ("9018"); results are debounced and limited to 20 to keep the
 * dropdown manageable.
 *
 * Props:
 *   value             selected 10-digit code (controlled)
 *   description       selected description snapshot (controlled)
 *   onChange({ code, description, descriptionLong, chapter, quantityUnit1 })
 *   placeholder       optional input placeholder
 *   disabled          optional
 *
 * The parent is expected to persist both `code` and `description` —
 * keeping the description on the parent record means the picker never
 * has to re-hydrate it from the server on every page load and the
 * description on commercial invoices is stable even if Census revises
 * the official text next year.
 */
const DEBOUNCE_MS = 250;

const TariffCodePicker = ({
    value = '',
    description = '',
    onChange,
    placeholder = 'Search by description or code (e.g. "tubing" or "9018")',
    disabled = false,
}) => {
    const [query, setQuery] = useState('');
    const [open, setOpen] = useState(false);
    const [results, setResults] = useState([]);
    const [recent, setRecent] = useState([]);
    const [loading, setLoading] = useState(false);
    const [highlight, setHighlight] = useState(-1);
    const [serverError, setServerError] = useState('');

    const wrapperRef = useRef(null);
    const debounceRef = useRef(null);
    const abortRef = useRef(null);
    const apiBase = import.meta.env.VITE_BACKEND_URL || '';

    // Close the dropdown on outside click. Mounted once.
    useEffect(() => {
        const onDocClick = (e) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
                setOpen(false);
                setHighlight(-1);
            }
        };
        document.addEventListener('mousedown', onDocClick);
        return () => document.removeEventListener('mousedown', onDocClick);
    }, []);

    // Lazy-load "recently used" the first time the dropdown opens.
    useEffect(() => {
        if (!open || recent.length > 0) return;
        let cancelled = false;
        (async () => {
            try {
                const res = await fetch(`${apiBase}/api/tariff-codes/recent?limit=8`);
                if (!res.ok) return;
                const data = await res.json();
                if (!cancelled) setRecent(Array.isArray(data.results) ? data.results : []);
            } catch {
                /* non-fatal — recent is just a convenience list */
            }
        })();
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    // Debounced search on `query` change.
    useEffect(() => {
        if (!open) return;
        if (debounceRef.current) clearTimeout(debounceRef.current);

        debounceRef.current = setTimeout(async () => {
            if (abortRef.current) abortRef.current.abort();
            const ctrl = new AbortController();
            abortRef.current = ctrl;

            setLoading(true);
            setServerError('');
            try {
                const url = `${apiBase}/api/tariff-codes/search?q=${encodeURIComponent(query)}&limit=20`;
                const res = await fetch(url, { signal: ctrl.signal });
                if (!res.ok) {
                    setServerError(`Search failed (${res.status})`);
                    setResults([]);
                    return;
                }
                const data = await res.json();
                setResults(Array.isArray(data.results) ? data.results : []);
                setHighlight(data.results?.length ? 0 : -1);
            } catch (err) {
                if (err.name !== 'AbortError') {
                    setServerError('Search failed');
                    setResults([]);
                }
            } finally {
                setLoading(false);
            }
        }, DEBOUNCE_MS);

        return () => debounceRef.current && clearTimeout(debounceRef.current);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [query, open]);

    const formattedCode = useMemo(() => {
        // Display "9018.90.8000" rather than the dense "9018908000" used
        // for storage and Shippo. Easier for humans to read on the form.
        if (!value || value.length !== 10) return value;
        return `${value.slice(0, 4)}.${value.slice(4, 6)}.${value.slice(6, 10)}`;
    }, [value]);

    const pick = (item) => {
        if (!item) return;
        onChange?.({
            code: item.code,
            description: item.description,
            descriptionLong: item.descriptionLong,
            chapter: item.chapter,
            quantityUnit1: item.quantityUnit1,
        });
        setOpen(false);
        setQuery('');
        setHighlight(-1);
    };

    const clear = () => {
        onChange?.({ code: '', description: '', descriptionLong: '', chapter: '', quantityUnit1: '' });
        setQuery('');
    };

    const onKeyDown = (e) => {
        const list = query ? results : recent;
        if (!list.length) return;
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setHighlight((h) => Math.min(list.length - 1, h + 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setHighlight((h) => Math.max(0, h - 1));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            pick(list[highlight] || list[0]);
        } else if (e.key === 'Escape') {
            setOpen(false);
        }
    };

    const showList = open && (query ? results.length > 0 : recent.length > 0 || loading);

    return (
        <div className={styles.wrapper} ref={wrapperRef}>
            {value ? (
                <div className={styles.selected}>
                    <div className={styles.selectedMain}>
                        <span className={styles.selectedCode}>{formattedCode}</span>
                        <span className={styles.selectedDesc} title={description}>
                            {description || '(no description on file)'}
                        </span>
                    </div>
                    {!disabled && (
                        <button
                            type='button'
                            className={styles.clearBtn}
                            onClick={clear}
                            aria-label='Clear tariff code'
                            title='Clear'
                        >
                            ×
                        </button>
                    )}
                </div>
            ) : (
                <input
                    type='text'
                    className={styles.input}
                    placeholder={placeholder}
                    value={query}
                    onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
                    onFocus={() => setOpen(true)}
                    onKeyDown={onKeyDown}
                    disabled={disabled}
                />
            )}

            {showList && (
                <div className={styles.dropdown}>
                    {!query && recent.length > 0 && (
                        <div className={styles.section}>
                            <div className={styles.sectionTitle}>Recently used in your company</div>
                            {recent.map((r, i) => (
                                <button
                                    type='button'
                                    key={`r-${r.code}`}
                                    className={`${styles.option} ${highlight === i ? styles.optionHighlight : ''}`}
                                    onMouseEnter={() => setHighlight(i)}
                                    onClick={() => pick(r)}
                                >
                                    <span className={styles.optCode}>{r.code}</span>
                                    <span className={styles.optDesc}>{r.description}</span>
                                    <span className={styles.optMeta}>×{r.usageCount}</span>
                                </button>
                            ))}
                        </div>
                    )}

                    {query && (
                        <div className={styles.section}>
                            {loading && <div className={styles.helper}>Searching…</div>}
                            {!loading && serverError && (
                                <div className={styles.errorBox}>{serverError}</div>
                            )}
                            {!loading && !serverError && results.length === 0 && (
                                <div className={styles.helper}>
                                    No matches. Try a broader keyword or a 2–10 digit code prefix.
                                </div>
                            )}
                            {results.map((r, i) => (
                                <button
                                    type='button'
                                    key={r.code}
                                    className={`${styles.option} ${highlight === i ? styles.optionHighlight : ''}`}
                                    onMouseEnter={() => setHighlight(i)}
                                    onClick={() => pick(r)}
                                >
                                    <span className={styles.optCode}>{r.code}</span>
                                    <span className={styles.optDesc} title={r.descriptionLong || r.description}>
                                        {r.description}
                                    </span>
                                    {r.chapter && <span className={styles.optMeta}>Ch {r.chapter}</span>}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default TariffCodePicker;
