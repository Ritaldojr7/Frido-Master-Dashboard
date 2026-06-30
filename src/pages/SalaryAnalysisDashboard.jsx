import { useAuth } from '../context/AuthContext';
import './IframeDashboard.css';

export default function SalaryAnalysisDashboard() {
    const { user } = useAuth();
    const isAllowedUser = user && [
        'ritwik.m@myfrido.com',
        'juned.m@myfrido.com',
        'saiyed.a@myfrido.com'
    ].includes(user.email?.toLowerCase());

    return (
        <div className="iframe-dashboard animate-fade-in">
            <header className="iframe-dashboard__header">
                <div className="iframe-dashboard__header-left">
                    <h1 className="iframe-dashboard__title">Salary Analysis</h1>
                    <p className="iframe-dashboard__subtitle">
                        IST Console — detailed salary analysis and metrics.
                    </p>
                </div>
                {isAllowedUser && (
                    <div className="iframe-dashboard__header-right">
                        For Reference :{' '}
                        <a
                            href="https://docs.google.com/spreadsheets/u/0/d/e/2PACX-1vQgibkBcfTDb1kObv8Ja9E63vYZdOYfrFbGS3fjzuE_L7_LUVY_ZssVVngoQ8g7pwrZr1D3iyLsdN8h/pubhtml?gid=0&single=true&pli=1"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="iframe-dashboard__ref-link"
                        >
                            Salary Sheet
                        </a>
                    </div>
                )}
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
