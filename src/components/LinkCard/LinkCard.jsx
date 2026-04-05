import { useNavigate } from 'react-router-dom';
import { ICONS } from '../../config/dashboardData';
import './LinkCard.css';

export default function LinkCard({
    title,
    url,
    route,
    isInternal,
    icon,
    variant = 'default',
    accentColor = 'blue',
    animationDelay = 0,
}) {
    const navigate = useNavigate();
    const iconPath = ICONS[icon];

    const handleClick = (e) => {
        if (isInternal && route) {
            e.preventDefault();
            navigate(route);
        }
    };

    const colorClass = variant === 'dark'
        ? 'link-card--dark'
        : `link-card--${variant || accentColor}`;

    return (
        <a
            href={isInternal ? route : (url || '#')}
            onClick={isInternal ? handleClick : undefined}
            target={!isInternal && url && url !== '#' ? '_blank' : undefined}
            rel={!isInternal ? 'noopener noreferrer' : undefined}
            className={`link-card ${colorClass}`}
            style={{ animationDelay: `${animationDelay}ms` }}
        >
            <div className="link-card__content">
                {iconPath && (
                    <svg className="link-card__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d={iconPath} />
                    </svg>
                )}
                <span className="link-card__title">{title}</span>
            </div>
            <svg className="link-card__arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
        </a>
    );
}
