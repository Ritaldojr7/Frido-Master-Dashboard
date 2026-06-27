import './IframeDashboard.css';

export default function ExecPerformanceDashboard() {
    return (
        <div className="iframe-dashboard animate-fade-in">
            <header className="iframe-dashboard__header">
                <h1 className="iframe-dashboard__title">Executive Performance Dashboard</h1>
                <p className="iframe-dashboard__subtitle">
                    Inside Sales executive-level analytics — revenue drivers, productivity, pricing, correlation and seasonality insights.
                </p>
            </header>
            <div className="iframe-dashboard__frame-wrap">
                <iframe
                    className="iframe-dashboard__frame"
                    src="/exec-dashboard/index.html"
                    title="Executive Performance Dashboard"
                    allow="clipboard-write"
                />
            </div>
        </div>
    );
}
