import React, { useState, useEffect } from 'react';
import { dashboardCategories } from '../config/dashboardData';
import SectionGroup from '../components/SectionGroup/SectionGroup';
import './Dashboard.css';

const Typewriter = ({ text, speed = 80, pause = 3000 }) => {
    const [displayedText, setDisplayedText] = useState('');
    const [index, setIndex] = useState(0);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        let timeout;

        if (!isDeleting && index < text.length) {
            // Typing characters
            timeout = setTimeout(() => {
                setDisplayedText((prev) => prev + text[index]);
                setIndex((prev) => prev + 1);
            }, speed);
        } else if (isDeleting && index > 0) {
            // Deleting characters
            timeout = setTimeout(() => {
                setDisplayedText((prev) => prev.slice(0, -1));
                setIndex((prev) => prev - 1);
            }, speed / 2);
        } else if (index === text.length && !isDeleting) {
            // Pause before starting to delete
            timeout = setTimeout(() => setIsDeleting(true), pause);
        } else if (index === 0 && isDeleting) {
            // Reset to typing
            setIsDeleting(false);
        }

        return () => clearTimeout(timeout);
    }, [index, text, speed, isDeleting, pause]);

    return (
        <span className="typewriter">
            {displayedText}
            <span className="typewriter-cursor">|</span>
        </span>
    );
};

export default function Dashboard({ 
    categories = dashboardCategories, 
    title = "Frido Master Dashboard",
    subtitle = "Your central hub for all operational tools, dashboards, and resources"
}) {
    return (
        <div className="dashboard">
            {/* Hero */}
            <div className="dashboard__hero animate-fade-in-up">
                <div className="dashboard__hero-content">
                    <h1 className="dashboard__title">
                        <Typewriter text={title} speed={70} />
                    </h1>
                    <p className="dashboard__subtitle">
                        {subtitle}
                    </p>
                </div>


                {/* Quick Stats */}
                <div className="dashboard__stats">
                    <div className="dashboard__stat">
                        <span className="dashboard__stat-number">{categories.length}</span>
                        <span className="dashboard__stat-label">CATEGORIES</span>
                    </div>
                    <div className="dashboard__stat">
                        <span className="dashboard__stat-number">
                            {categories.reduce((acc, cat) => acc + cat.links.length, 0)}
                        </span>
                        <span className="dashboard__stat-label">TOOLS & LINKS</span>
                    </div>
                    <div className="dashboard__stat dashboard__stat--live">
                        <span className="dashboard__stat-dot"></span>
                        <span className="dashboard__stat-label">ALL SYSTEMS LIVE</span>
                    </div>
                </div>
            </div>

            {/* Sections */}
            <div className="dashboard__sections">
                {categories.map((category, idx) => (
                    <SectionGroup
                        key={category.id}
                        title={category.title}
                        icon={category.icon}
                        accentColor={category.accentColor}
                        description={category.description}
                        links={category.links}
                        animationBase={idx * 80}
                    />
                ))}
            </div>

        </div>
    );
}
