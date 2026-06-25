import { useEffect, useRef, useState } from 'react';
import { ROLE_OPTIONS, formatRolesSummary, normalizeRoleSelection } from '../../config/roleOptions';
import './RoleMultiSelect.css';

export default function RoleMultiSelect({ value, onChange, disabled = false, id }) {
    const [open, setOpen] = useState(false);
    const rootRef = useRef(null);
    const selected = Array.isArray(value) ? value : value ? [value] : [];

    useEffect(() => {
        if (!open) return undefined;
        const onPointerDown = (e) => {
            if (rootRef.current && !rootRef.current.contains(e.target)) {
                setOpen(false);
            }
        };
        const onKeyDown = (e) => {
            if (e.key === 'Escape') setOpen(false);
        };
        document.addEventListener('mousedown', onPointerDown);
        document.addEventListener('keydown', onKeyDown);
        return () => {
            document.removeEventListener('mousedown', onPointerDown);
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [open]);

    const handleToggle = (role, checked) => {
        const next = normalizeRoleSelection(selected, role, checked);
        if (next.length === 0) return;
        onChange(next);
    };

    return (
        <div className="role-multi-select" ref={rootRef}>
            <button
                type="button"
                id={id}
                className={`role-multi-select__trigger${open ? ' role-multi-select__trigger--open' : ''}`}
                onClick={() => !disabled && setOpen((o) => !o)}
                disabled={disabled}
                aria-haspopup="listbox"
                aria-expanded={open}
            >
                <span className="role-multi-select__label">{formatRolesSummary(selected)}</span>
                <svg className="role-multi-select__chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="M6 9l6 6 6-6" />
                </svg>
            </button>
            {open ? (
                <div className="role-multi-select__menu" role="listbox" aria-multiselectable="true">
                    {ROLE_OPTIONS.map((opt) => {
                        const checked = selected.includes(opt.value);
                        return (
                            <label key={opt.value} className="role-multi-select__option">
                                <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={(e) => handleToggle(opt.value, e.target.checked)}
                                />
                                <span>{opt.label}</span>
                            </label>
                        );
                    })}
                </div>
            ) : null}
        </div>
    );
}
