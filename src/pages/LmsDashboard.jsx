import './IframeDashboard.css';

export default function LmsDashboard() {
    return (
        <div className="iframe-dashboard animate-fade-in">
            <header className="iframe-dashboard__header">
                <h1 className="iframe-dashboard__title">LMS Dashboard</h1>
                <p className="iframe-dashboard__subtitle">
                    Learning Management System analytics and progress tracking.
                </p>
            </header>
            <div className="iframe-dashboard__frame-wrap">
                <iframe
                    className="iframe-dashboard__frame"
                    src="https://fridoacademy-dashboard.netlify.app/"
                    title="LMS Dashboard"
                    allow="clipboard-write"
                />
            </div>
        </div>
    );
}
