import { useNavigate } from 'react-router-dom';
import { onlineReputationManagementData, ICONS } from '../config/dashboardData';
import SectionGroup from '../components/SectionGroup/SectionGroup';
import './SubPage.css';

export default function OnlineReputationManagement() {
    const navigate = useNavigate();
    const data = onlineReputationManagementData;

    return (
        <div className="subpage">
            <div className="subpage__header animate-fade-in-up">
                <button className="subpage__back" onClick={() => navigate(data.backRoute)}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d={ICONS.arrowLeft} />
                    </svg>
                    <span>Back to Dashboard</span>
                </button>
                <h1 className="subpage__title">{data.title}</h1>
                <p className="subpage__subtitle">
                    Reputation management tools, tracking sheets, and reporting resources
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
