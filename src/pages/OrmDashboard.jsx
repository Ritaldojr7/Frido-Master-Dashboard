import './IframeDashboard.css';

export default function OrmDashboard() {
    return (
        <div className="iframe-dashboard animate-fade-in">
            <header className="iframe-dashboard__header">
                <h1 className="iframe-dashboard__title">Online Reputation Management</h1>
                <p className="iframe-dashboard__subtitle">
                    Reputation management tools, tracking sheets, and reporting resources.
                </p>
            </header>
            <div className="iframe-dashboard__frame-wrap">
                <iframe
                    className="iframe-dashboard__frame"
                    src="/orm-dashboard/index.html?v=3"
                    title="ORM Dashboard"
                    allow="clipboard-write"
                />
            </div>
        </div>
    );
}
