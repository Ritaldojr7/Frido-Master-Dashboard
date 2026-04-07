import { dashboardCategories } from '../config/dashboardData';
import SectionGroup from '../components/SectionGroup/SectionGroup';
import './Dashboard.css';

export default function Dashboard() {
    return (
        <div className="dashboard">
            {/* Hero */}
            <div className="dashboard__hero animate-fade-in-up">
                <div className="dashboard__hero-content">
                    <p className="dashboard__greeting">SAIYED ABDAL</p>
                    <h1 className="dashboard__title">
                        Frido Master <span className="dashboard__title-accent">Dashboard</span>
                    </h1>
                    <p className="dashboard__subtitle">
                        Your central hub for all operational tools, dashboards, and resources
                    </p>
                </div>

                {/* Quick Stats */}
                <div className="dashboard__stats">
                    <div className="dashboard__stat">
                        <span className="dashboard__stat-number">{dashboardCategories.length}</span>
                        <span className="dashboard__stat-label">CATEGORIES</span>
                    </div>
                    <div className="dashboard__stat">
                        <span className="dashboard__stat-number">
                            {dashboardCategories.reduce((acc, cat) => acc + cat.links.length, 0)}
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
                {dashboardCategories.map((category, idx) => (
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
