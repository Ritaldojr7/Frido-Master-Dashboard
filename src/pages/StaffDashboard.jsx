import React, { useState, useEffect } from 'react';
import { staffExperienceStoreData, ICONS } from '../config/dashboardData';
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

const contactBoxData = [
    { name: 'Arsh', pocFor: 'Tech', email: 'arsh.a@myfrido.com', phone: '+917028154267' },
    { name: 'Juned', pocFor: 'MIS', email: 'juned.m@myfrido.com', phone: '+917498931102' },
    { name: 'Nishrit', pocFor: 'Overall', email: 'nishrit.p@myfrido.com', phone: '+917051780171' },
    { name: 'Saiyed Abdal', pocFor: 'Highest Escalations', email: 'saiyed.a@myfrido.com', phone: '+917987962503' },
];

export default function StaffDashboard() {
    const data = staffExperienceStoreData;

    return (
        <div className="subpage">
            <div className="subpage__header animate-fade-in-up">
                <h1 className="subpage__title">
                    <Typewriter text={data.title} speed={70} />
                </h1>
                <p className="subpage__subtitle">
                    Your one stop hub for all links and accessibility
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

            <div className="subpage__contacts animate-fade-in-up" style={{ animationDelay: '100ms' }}>
                <h2 className="subpage__contacts-title">Point of Contact</h2>
                <div className="subpage__contacts-table-wrapper">
                    <table className="subpage__contacts-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>POC For</th>
                                <th>Email</th>
                                <th>Mobile Number</th>
                            </tr>
                        </thead>
                        <tbody>
                            {contactBoxData.map((contact, idx) => (
                                <tr key={idx}>
                                    <td className="subpage__contact-name">{contact.name}</td>
                                    <td><span className="subpage__contact-badge">{contact.pocFor}</span></td>
                                    <td><a href={`mailto:${contact.email}`}>{contact.email}</a></td>
                                    <td><a href={`tel:${contact.phone}`}>{contact.phone}</a></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

        </div>
    );
}
