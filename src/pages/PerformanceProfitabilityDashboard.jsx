import './IframeDashboard.css';

export default function PerformanceProfitabilityDashboard() {
    return (
        <div className="iframe-dashboard animate-fade-in">
            <header className="iframe-dashboard__header">
                <h1 className="iframe-dashboard__title">Performance &amp; Profitability Dashboard</h1>
                <p className="iframe-dashboard__subtitle">
                    IST Console — team-level profitability, salary justification, agent scorecards and attendance analysis.
                </p>
            </header>
            <div className="iframe-dashboard__frame-wrap">
                <iframe
                    className="iframe-dashboard__frame"
                    src="/ist-console/index.html"
                    title="Performance & Profitability Dashboard"
                    allow="clipboard-write"
                />
            </div>
        </div>
    );
}
