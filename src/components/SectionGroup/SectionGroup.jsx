import { useRef, useEffect, useState } from 'react';
import { ICONS } from '../../config/dashboardData';
import LinkCard from '../LinkCard/LinkCard';
import './SectionGroup.css';

export default function SectionGroup({ title, icon, accentColor = 'blue', links = [], description, animationBase = 0, sectionId }) {
    const sectionRef = useRef(null);
    const [isVisible, setIsVisible] = useState(false);
    const iconPath = ICONS[icon];

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                    observer.unobserve(entry.target);
                }
            },
            { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
        );

        if (sectionRef.current) {
            observer.observe(sectionRef.current);
        }

        return () => observer.disconnect();
    }, []);

    return (
        <section
            ref={sectionRef}
            id={sectionId}
            className={`section-group section-group--${accentColor} ${isVisible ? 'section-group--visible' : ''}`}
        >
            <div className="section-group__header">
                <div className={`section-group__icon-badge section-group__icon-badge--${accentColor}`}>
                    {iconPath && (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d={iconPath} />
                        </svg>
                    )}
                </div>
                <div className="section-group__info">
                    <h2 className="section-group__title">{title}</h2>
                    {description && <p className="section-group__desc">{description}</p>}
                </div>
                <div className="section-group__count">{links.length} items</div>
            </div>

            <div className="section-group__grid">
                {links.map((link, idx) => (
                    <LinkCard
                        key={link.title}
                        {...link}
                        accentColor={accentColor}
                        animationDelay={animationBase + idx * 60}
                    />
                ))}
            </div>
        </section>
    );
}
