import { useState, useEffect } from 'react';
import { isdNmData } from '../config/dashboardData';
import { canSeeIsdResource } from '../config/permissions';
import { useAuth } from '../context/AuthContext';
import SectionGroup from '../components/SectionGroup/SectionGroup';
import './SubPage.css';

const Typewriter = ({ text, speed = 80, pause = 3000 }) => {
    const [displayedText, setDisplayedText] = useState('');
    const [index, setIndex] = useState(0);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        let timeout;

        if (!isDeleting && index < text.length) {
            timeout = setTimeout(() => {
                setDisplayedText((prev) => prev + text[index]);
                setIndex((prev) => prev + 1);
            }, speed);
        } else if (isDeleting && index > 0) {
            timeout = setTimeout(() => {
                setDisplayedText((prev) => prev.slice(0, -1));
                setIndex((prev) => prev - 1);
            }, speed / 2);
        } else if (index === text.length && !isDeleting) {
            timeout = setTimeout(() => setIsDeleting(true), pause);
        } else if (index === 0 && isDeleting) {
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

export default function IsdNmDashboard() {
    const { user } = useAuth();
    const role = user?.role ?? 'staff';

    return (
        <div className="subpage">
            <div className="subpage__header animate-fade-in-up">
                <h1 className="subpage__title">
                    <Typewriter text={isdNmData.title} speed={70} />
                </h1>
                <p className="subpage__subtitle">
                Welcome to Inside Sales Department Non-Mobility. This centralised hub empowers sales agents with quick access to CRMs, Payments Details, HR policies, CS &amp; Logistics and learning resources etc. Here, agents can what they need to enable sales, without scrolling or wasting time.
                </p>
            </div>

            <div className="subpage__sections">
                {isdNmData.sections.map((section, idx) => {
                    const links = section.links
                        .filter((l) => canSeeIsdResource(role, l.isdAccess || 'executive'))
                        .map(({ isdAccess: _tier, ...link }) => link);
                    if (links.length === 0) return null;
                    return (
                        <SectionGroup
                            key={section.id}
                            title={section.title}
                            icon={section.icon}
                            accentColor={section.accentColor}
                            links={links}
                            animationBase={idx * 80}
                        />
                    );
                })}
            </div>
        </div>
    );
}
