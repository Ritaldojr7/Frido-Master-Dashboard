import { useNavigate } from 'react-router-dom';
import { retentionCallingData, ICONS } from '../config/dashboardData';
import SectionGroup from '../components/SectionGroup/SectionGroup';
import './SubPage.css';

export default function RetentionCalling() {
    const navigate = useNavigate();
    const data = retentionCallingData;

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
                    Customer retention tools and platforms
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

            <footer className="subpage__footer">
                <a href="https://www.myfrido.com" target="_blank" rel="noopener noreferrer">
                    myfrido.com
                </a>
            </footer>
        </div>
    );
}
