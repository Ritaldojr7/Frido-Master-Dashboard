import React, { useState, useEffect } from 'react';
import { retailAdminData, ICONS } from '../config/dashboardData';
import SectionGroup from '../components/SectionGroup/SectionGroup';
import './SubPage.css';

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

export default function RetailAdminDashboard() {
    const data = retailAdminData;

    return (
        <div className="subpage">
            <div className="subpage__header animate-fade-in-up">
                <h1 className="subpage__title">
                    <Typewriter text={data.title} speed={70} />
                </h1>
                <p className="subpage__subtitle">
                    Admin hub for store operations, team management, analytics, and escalations
                </p>
            </div>


            <div className="subpage__sections">
                {data.sections.map((section, idx) => (
                    <SectionGroup
                        key={section.id}
                        title={section.title}
                        icon={section.icon}
                        accentColor={section.accentColor}
                        links={section.links}
                        animationBase={idx * 80}
                    />
                ))}
            </div>

        </div>
    );
}
