import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ICONS } from '../../config/dashboardData';
import './LinkCard.css';

export default function LinkCard({
    title,
    url,
    route,
    isInternal,
    icon,
    tooltip,
    subOptions,
    variant = 'default',
    accentColor = 'blue',
    animationDelay = 0,
    isComingSoon = false,
}) {
    const isStaffApp = import.meta.env.VITE_APP_TYPE === 'STAFF';
    const navigate = useNavigate();
    const [expanded, setExpanded] = useState(false);
    const iconPath = ICONS[icon];
    const showTooltip = isStaffApp && Boolean(tooltip);

    const handleClick = (e) => {
        if (isComingSoon) {
            e.preventDefault();
            return;
        }
        if (subOptions && subOptions.length > 0) {
            e.preventDefault();
            setExpanded(!expanded);
            return;
        }
        if (isInternal && route) {
            e.preventDefault();
            navigate(route);
        }
    };

    const colorClass = variant === 'dark'
        ? 'link-card--dark'
        : `link-card--${variant || accentColor}`;

    const hasSubOptions = subOptions && subOptions.length > 0;
    const comingSoonClass = isComingSoon ? 'link-card--coming-soon' : '';

    return (
        <div 
            className="link-card-container" 
            style={{ animationDelay: `${animationDelay}ms` }}
            {...(showTooltip ? { 'data-tooltip': tooltip } : {})}
        >
            <a
                href={isInternal || hasSubOptions || isComingSoon ? route || '#' : (url || '#')}
                onClick={handleClick}
                target={!isInternal && !hasSubOptions && !isComingSoon && url && url !== '#' ? '_blank' : undefined}
                rel={!isInternal && !hasSubOptions && !isComingSoon ? 'noopener noreferrer' : undefined}
                className={`link-card ${colorClass} ${expanded ? 'link-card--expanded' : ''} ${comingSoonClass}`}
            >
                <div className="link-card__content">
                    {iconPath && (
                        <svg className="link-card__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d={iconPath} />
                        </svg>
                    )}
                    <span className="link-card__title">{title}</span>
                </div>
                <div className="link-card__right-section">
                    {isComingSoon && (
                        <div className="link-card__coming-soon-text">
                            Coming<br/>Soon
                        </div>
                    )}
                    <svg 
                        className={`link-card__arrow ${hasSubOptions ? 'link-card__arrow--chevron' : ''} ${expanded ? 'link-card__arrow--expanded' : ''}`} 
                        viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                    >
                        {hasSubOptions ? (
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        ) : (
                            <path d="M5 12h14M12 5l7 7-7 7" />
                        )}
                    </svg>
                </div>
            </a>
            
            {hasSubOptions && (
                <div className={`link-card__sub-options ${expanded ? 'link-card__sub-options--open' : ''}`}>
                    {subOptions.map((opt, idx) => (
                        <a 
                            key={idx}
                            href={opt.isInternal ? (opt.route || '#') : (opt.url || '#')}
                            onClick={(e) => {
                                if (opt.isInternal && opt.route) {
                                    e.preventDefault();
                                    navigate(opt.route);
                                }
                            }}
                            target={!opt.isInternal && opt.url && opt.url !== '#' ? '_blank' : undefined}
                            rel={!opt.isInternal ? 'noopener noreferrer' : undefined}
                            className="link-card__sub-link"
                        >
                            <span>{opt.title}</span>
                            {!opt.isInternal && (
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5 }}>
                                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                                    <polyline points="15 3 21 3 21 9"></polyline>
                                    <line x1="10" y1="14" x2="21" y2="3"></line>
                                </svg>
                            )}
                        </a>
                    ))}
                </div>
            )}
        </div>
    );
}
