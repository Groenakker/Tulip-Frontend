import { useNavigate } from 'react-router-dom';
import { FaExternalLinkAlt } from 'react-icons/fa';

/**
 * Small "open related record" link, shown next to fields/values that
 * reference another record (business partner, project, sample, ...).
 *
 * Rendered as a span — not a <button> — on purpose: detail pages wrap
 * their content in a disabled <fieldset> when a record is closed, which
 * disables every native form control. Navigation to related records must
 * keep working on closed (read-only) records.
 *
 * Usage:
 *   <OpenRecordLink to={`/Projects/ProjectDetails/${projectId}`} title="Open project" />
 *   <OpenRecordLink to={...}>{sampleCode}</OpenRecordLink>  // clickable text
 */
export default function OpenRecordLink({ to, title = 'Open record', children, style }) {
    const navigate = useNavigate();
    if (!to) return children ? <>{children}</> : null;

    const go = (e) => {
        e.preventDefault();
        e.stopPropagation();
        navigate(to);
    };

    return (
        <span
            role="link"
            tabIndex={0}
            title={title}
            onClick={go}
            onKeyDown={(e) => { if (e.key === 'Enter') go(e); }}
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                color: 'rgb(69, 112, 182)',
                cursor: 'pointer',
                fontWeight: 600,
                userSelect: 'none',
                ...style,
            }}
        >
            {children || <FaExternalLinkAlt size={11} />}
        </span>
    );
}

// True when the value looks like a Mongo ObjectId — some legacy fields
// store either a human-readable code or a Mongo id in the same place, and
// we only want to render navigation links for real ids.
export const isObjectId = (value) => /^[a-f0-9]{24}$/i.test(String(value || ''));
