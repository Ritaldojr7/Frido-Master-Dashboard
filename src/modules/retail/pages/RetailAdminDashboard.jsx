import React from 'react';
import { retailAdminData } from '../config/retailData';
import SectionGroup from '../../../components/SectionGroup/SectionGroup';
import Typewriter from '../../../components/Typewriter/Typewriter';
import '../../../pages/SubPage.css';

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
