import { useRef, useEffect, useState } from 'react';
import { iconPathList } from '../../config/dashboardData';
import LinkCard from '../LinkCard/LinkCard';
import './SectionGroup.css';

export default function SectionGroup({ title, icon, accentColor = 'blue', links = [], description, animationBase = 0, sectionId }) {
    const sectionRef = useRef(null);
    const [isVisible, setIsVisible] = useState(false);
    const iconPaths = iconPathList(icon);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                    observer.unobserve(entry.target);
                }
            },
            { threshold: 0, rootMargin: '0px 0px 8% 0px' }
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
            <div className="glass-panel glass-panel--section">
                <div className="section-group__header">
                    <div className={`section-group__icon-badge section-group__icon-badge--${accentColor}`}>
                        {iconPaths.length > 0 && (
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                {iconPaths.map((d, i) => (
                                    <path key={i} d={d} />
                                ))}
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
            </div>
        </section>
    );
}
