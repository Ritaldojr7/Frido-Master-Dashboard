import './IframeDashboard.css';

export default function RetailAnalyticsDashboard() {
    return (
        <div className="blank-dashboard animate-fade-in">
            <header className="blank-dashboard__header">
                <h1 className="blank-dashboard__title">Retail Analytics</h1>
                <p className="blank-dashboard__subtitle">
                    Retail sales metrics, store analytics, and performance insights.
                </p>
            </header>
            <div className="blank-dashboard__empty glass">
                <span className="blank-dashboard__empty-icon">📊</span>
                <p>This section is being set up. Content will appear here soon.</p>
            </div>
        </div>
    );
}
