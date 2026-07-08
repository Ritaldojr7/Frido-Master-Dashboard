import './IframeDashboard.css';

export default function RetailFeedbackDashboard() {
    return (
        <div className="iframe-dashboard animate-fade-in">
            <header className="iframe-dashboard__header">
                <h1 className="iframe-dashboard__title">Retail Feedback Dashboard</h1>
                <p className="iframe-dashboard__subtitle">
                    Overall performance analysis of store customer experience, sentiment, and feedback trends.
                </p>
            </header>
            <div className="iframe-dashboard__frame-wrap">
                <iframe
                    className="iframe-dashboard__frame"
                    src="/retail-feedback/index.html"
                    title="Retail Feedback Dashboard"
                    allow="clipboard-write"
                />
            </div>
        </div>
    );
}
