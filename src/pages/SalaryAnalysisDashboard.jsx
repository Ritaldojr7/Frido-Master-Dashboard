import './IframeDashboard.css';

export default function SalaryAnalysisDashboard() {
    return (
        <div className="iframe-dashboard animate-fade-in">
            <header className="iframe-dashboard__header">
                <h1 className="iframe-dashboard__title">Salary Analysis</h1>
                <p className="iframe-dashboard__subtitle">
                    IST Console — detailed salary analysis and metrics.
                </p>
            </header>
            <div className="iframe-dashboard__frame-wrap">
                <iframe
                    className="iframe-dashboard__frame"
                    src="/salary-analysis/index.html"
                    title="Salary Analysis"
                    allow="clipboard-write"
                />
            </div>
        </div>
    );
}
