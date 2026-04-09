import React, { useMemo, useState } from 'react';
import { feedbackData } from '../config/feedbackDatabase';
import './FeedbackDepartment.css';

const PRODUCT_RATINGS = {
    'Frido Ultimate Wedge Plus Cushion': 9.3,
    'Frido Ultimate Pro Seating Combo': 9.1,
    'Frido Ultimate Coccyx Seat Cushion': 9.0,
    "Frido Men's Comfort Dual Strap Sandals": 8.8,
    'Frido Tailbone Pain Relief Seat Cushion': 8.8,
    'Frido 3D Eye Mask': 8.5,
    'Frido Ultimate Mattress Topper': 8.5,
    'Frido Aerodry Mat': 8.5,
    'Frido Kinesiology Tape': 8.2,
    'Frido Cloud Comfort Shoes - Lace Ups': 8.2,
    'Frido Lumbo Sacral Belt': 8.2,
    'Frido Sleep Eye Mask': 8.2,
    "Frido Men's Cloud Comfort Sandal": 8.1,
    'Frido Maternity Pillow': 8.1,
    'Frido Orthotics Knee Support Wrap': 8.0,
    'Frido ErgoLuxe Executive Chair': 8.0,
    'Frido Portable Standing Desk': 8.0,
    'Frido Active Knee Cap Support': 8.0,
    'Frido Active Socks- Ankle Length': 8.0,
    'Frido Orthotics Wrist Support Brace': 7.9,
    "Frido Women's Cloud Comfort Sandal": 7.8,
    'Frido Cloud Comfort Shoes - Slip Ons': 7.8,
    "Frido Women's Ethnic Comfort Flat Sandal": 7.8,
    'Frido Barefoot Sock Shoe Classic': 7.8,
    'Frido Barefoot Sock Shoe Pro': 7.6,
    "Frido Women's Cloud Comfort Sandal - Toeless": 7.2,
    'Frido Puneri Chappal - Women': 6.9,
    "Frido Women's Arch Comfort Sandals": 6.9,
    'Frido Orthotics Posture Corrector': 6.3,
    'Frido Puneri Chappal - Men': 6.0,
    'Frido Unisex Orthotics V-Strap Sandals': 5.8,
    'Frido School Shoes': 5.6
};

const Typewriter = ({ text, speed = 80, pause = 3000 }) => {
    const [displayedText, setDisplayedText] = useState('');
    const [index, setIndex] = useState(0);
    const [isDeleting, setIsDeleting] = useState(false);

    React.useEffect(() => {
        let timeout;

        if (!isDeleting && index < text.length) {
            timeout = setTimeout(() => {
                setDisplayedText((prev) => prev + text[index]);
                setIndex((prev) => prev + 1);
            }, speed);
        } else if (isDeleting && index > 0) {
            timeout = setTimeout(() => {
                setDisplayedText((prev) => prev.slice(0, -1));
                setIndex((prev) => prev - 1);
            }, speed / 2);
        } else if (index === text.length && !isDeleting) {
            timeout = setTimeout(() => setIsDeleting(true), pause);
        } else if (index === 0 && isDeleting) {
            setIsDeleting(false);
        }

        return () => clearTimeout(timeout);
    }, [index, text, speed, isDeleting, pause]);

    return (
        <span className="typewriter">
            {displayedText}
            <span className="typewriter-cursor">|</span>
        </span>
    );
};

export default function FeedbackDepartment() {
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedDatesByProduct, setSelectedDatesByProduct] = useState({});
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [selectedDataType, setSelectedDataType] = useState('All');
    const [selectedLeaderboardCategory, setSelectedLeaderboardCategory] = useState('All');
    const itemsPerPage = 10;

    const parseDateValue = (value) => {
        if (!value || typeof value !== 'string') return null;
        const cleaned = value.trim();
        if (!cleaned || cleaned.toLowerCase() === 'na') return null;

        const parts = cleaned.split('/');
        if (parts.length !== 3) return null;

        const day = Number(parts[0]);
        const month = Number(parts[1]) - 1;
        let year = Number(parts[2]);

        if (!Number.isFinite(day) || !Number.isFinite(month) || !Number.isFinite(year)) return null;
        if (year < 100) year += 2000;

        const date = new Date(year, month, day);
        if (Number.isNaN(date.getTime())) return null;
        return date;
    };

    const getReleaseEntries = (item) => {
        if (Array.isArray(item.releaseHistory) && item.releaseHistory.length > 0) {
            return item.releaseHistory.filter((entry) => entry?.date && entry?.reportLink);
        }
        if (item.releaseDate && item.reportLink) {
            return [{ date: item.releaseDate, reportLink: item.reportLink }];
        }
        return [];
    };

    // Remove unpublished / NA rows
    const publishedData = useMemo(
        () =>
            feedbackData.filter((item) => {
                const isNADataType = !item.dataType || item.dataType.toLowerCase().trim() === 'na';
                const releaseEntries = getReleaseEntries(item);
                const isNAReleaseDate = releaseEntries.length === 0;
                const isNAReport = releaseEntries.length === 0;
                return !(isNADataType || isNAReleaseDate || isNAReport);
            }),
        []
    );

    const categoryOptions = useMemo(
        () => ['All', ...new Set(publishedData.map((item) => item.category))],
        [publishedData]
    );

    const leaderboardCategoryOptions = useMemo(
        () => ['All', ...new Set(publishedData.map((item) => item.category))],
        [publishedData]
    );

    const dataTypeOptions = useMemo(
        () => ['All', ...new Set(publishedData.map((item) => item.dataType))],
        [publishedData]
    );

    const leaderboardData = useMemo(() => {
        const ratedProducts = publishedData
            .map((item) => ({
                id: item.id,
                category: item.category,
                productName: item.productName,
                rating: PRODUCT_RATINGS[item.productName]
            }))
            .filter((item) => typeof item.rating === 'number');

        const categoryFiltered =
            selectedLeaderboardCategory === 'All'
                ? ratedProducts
                : ratedProducts.filter((item) => item.category === selectedLeaderboardCategory);

        return categoryFiltered.sort((a, b) => b.rating - a.rating);
    }, [publishedData, selectedLeaderboardCategory]);

    const baseFilteredData = publishedData.filter((item) => {
        const categoryMatches = selectedCategory === 'All' || item.category === selectedCategory;
        const dataTypeMatches = selectedDataType === 'All' || item.dataType === selectedDataType;
        return categoryMatches && dataTypeMatches;
    });

    // Per-row date mapping logic
    const filteredData = baseFilteredData.map((item) => {
        const entries = getReleaseEntries(item).slice().sort((a, b) => (parseDateValue(b.date) ?? 0) - (parseDateValue(a.date) ?? 0));
        const defaultDate = entries[0]?.date ?? item.releaseDate;
        const selectedDate = selectedDatesByProduct[item.id] ?? defaultDate;
        const selectedEntry = entries.find((entry) => entry.date === selectedDate) ?? entries[0];

        return {
            ...item,
            releaseEntries: entries,
            displayReleaseDate: selectedEntry?.date ?? item.releaseDate,
            displayReportLink: selectedEntry?.reportLink ?? item.reportLink,
            displayLoomLink: selectedEntry?.loomLink ?? item.loomLink
        };
    });

    // Pagination logic
    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredData.slice(indexOfFirstItem, indexOfLastItem);

    const handlePageChange = (pageNumber) => {
        setCurrentPage(pageNumber);
    };

    const handleProductDateFilter = (productId, date) => {
        setSelectedDatesByProduct((prev) => ({
            ...prev,
            [productId]: date
        }));
    };

    const handleCategoryFilter = (value) => {
        setSelectedCategory(value);
        setCurrentPage(1);
    };

    const handleDataTypeFilter = (value) => {
        setSelectedDataType(value);
        setCurrentPage(1);
    };

    const handleLeaderboardCategoryFilter = (value) => {
        setSelectedLeaderboardCategory(value);
    };

    return (
        <div className="feedback-page animate-fade-in">
            <aside className="feedback-page__sidebar glass">
                <div className="feedback-page__sidebar-content">
                    <h3 className="leaderboard-title">Leaderboard</h3>
                    <div className="sidebar-filter-group">
                        <label htmlFor="leaderboard-category-filter" className="sidebar-filter-label">
                            Category Name
                        </label>
                        <select
                            id="leaderboard-category-filter"
                            className="filter-select"
                            value={selectedLeaderboardCategory}
                            onChange={(e) => handleLeaderboardCategoryFilter(e.target.value)}
                        >
                            {leaderboardCategoryOptions.map((option) => (
                                <option key={option} value={option}>
                                    {option}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="leaderboard-list">
                        {leaderboardData.map((product, index) => (
                            <div key={product.id} className="leaderboard-item">
                                <div className="leaderboard-rank">#{index + 1}</div>
                                <div className="leaderboard-info">
                                    <div className="leaderboard-product">{product.productName}</div>
                                    <div className="leaderboard-category">{product.category}</div>
                                </div>
                                <div className="leaderboard-score">{product.rating.toFixed(1)}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </aside>
            <main className="feedback-page__main glass">
                <div className="feedback-page__main-content">
                    <header className="feedback-page__header">
                        <h2 className="feedback-page__title">
                            <Typewriter text="Feedback Database" speed={70} />
                        </h2>
                        <div className="feedback-page__header-accent"></div>
                    </header>
                    <div className="main-filters">
                        <div className="sidebar-filter-group">
                            <label htmlFor="category-filter" className="sidebar-filter-label">
                                Category Name
                            </label>
                            <select
                                id="category-filter"
                                className="filter-select"
                                value={selectedCategory}
                                onChange={(e) => handleCategoryFilter(e.target.value)}
                            >
                                {categoryOptions.map((option) => (
                                    <option key={option} value={option}>
                                        {option}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="sidebar-filter-group">
                            <label htmlFor="datatype-filter" className="sidebar-filter-label">
                                Data Type
                            </label>
                            <select
                                id="datatype-filter"
                                className="filter-select"
                                value={selectedDataType}
                                onChange={(e) => handleDataTypeFilter(e.target.value)}
                            >
                                {dataTypeOptions.map((option) => (
                                    <option key={option} value={option}>
                                        {option}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="feedback-database">
                        <table className="feedback-table">
                            <thead>
                                <tr>
                                    <th>Category Name</th>
                                    <th>Product</th>
                                    <th>View Report</th>
                                    <th>View Loom Video</th>
                                    <th>Data Type</th>
                                    <th>Last Released Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {currentItems.map((item) => (
                                    <tr key={item.id} className="feedback-table__row animate-slide-right">
                                        <td className="col-category">{item.category}</td>
                                        <td className="col-product">
                                            <div className="product-info">
                                                <span className="product-name">{item.productName}</span>
                                                <img src={item.productImage} alt={item.productName} className="product-thumbnail" />
                                            </div>
                                        </td>
                                        <td className="col-report">
                                            {item.displayReportLink ? (
                                                <div className="action-group-container">
                                                    <a
                                                        href={item.displayReportLink}
                                                        className="action-btn action-btn--report"
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                    >
                                                        View Report
                                                    </a>
                                                    <div className="iteration-label">{item.iterations}</div>
                                                </div>
                                            ) : (
                                                <span className="text-muted">Not Published</span>
                                            )}
                                        </td>
                                        <td className="col-loom">
                                            {item.displayLoomLink ? (
                                                <a
                                                    href={item.displayLoomLink}
                                                    className="action-btn action-btn--loom"
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                >
                                                    View Loom Video
                                                </a>
                                            ) : (
                                                <span className="text-muted">—</span>
                                            )}
                                        </td>
                                        <td className="col-type">
                                            <span className={`status-badge status-badge--${item.dataType.toLowerCase().includes('returned') ? 'amber' : 'emerald'}`}>
                                                {item.dataType}
                                            </span>
                                        </td>
                                        <td className="col-release">
                                            {(item.releaseEntries?.length ?? 0) > 1 ? (
                                                <select
                                                    className="filter-select filter-select--row"
                                                    value={item.displayReleaseDate || item.releaseDate}
                                                    onChange={(e) => handleProductDateFilter(item.id, e.target.value)}
                                                >
                                                    {item.releaseEntries?.map((entry) => (
                                                        <option key={`${item.id}-${entry.date}`} value={entry.date}>
                                                            {entry.date}
                                                        </option>
                                                    ))}
                                                </select>
                                            ) : (
                                                <span>{item.displayReleaseDate || item.releaseDate}</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {/* Pagination Footer */}
                        <div className="pagination">
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                                <button
                                    key={page}
                                    className={`pagination__btn ${currentPage === page ? 'pagination__btn--active' : ''}`}
                                    onClick={() => handlePageChange(page)}
                                >
                                    {page}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
