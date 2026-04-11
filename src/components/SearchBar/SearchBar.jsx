import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    dashboardCategories,
    insideSalesIndiaData,
    insideSalesMiddleEastData,
    experienceStoreData,
    retentionCallingData,
    onlineReputationManagementData,
    feedbackCustomerExperienceData,
    businessAnalyticsCategories,
    staffExperienceStoreData,
    retailAdminData,
} from '../../config/dashboardData';
import './SearchBar.css';

const isStaffApp = import.meta.env.VITE_APP_TYPE === 'STAFF';

function addLinkWithVariants(links, link, category) {
    if (link.subOptions?.length) {
        link.subOptions.forEach((subOption) => {
            links.push({
                title: subOption.title,
                url: subOption.url,
                category
            });
        });
        return;
    }

    links.push({ ...link, category });
}

// Flatten all links for search in non-staff app
function getDefaultAppLinks() {
    const links = [];

    // Dashboard categories
    dashboardCategories.forEach((cat) => {
        cat.links.forEach((link) => {
            addLinkWithVariants(links, link, cat.title);
        });
    });

    // Inside Sales India
    insideSalesIndiaData.sections.forEach((sec) => {
        sec.links.forEach((link) => {
            addLinkWithVariants(links, link, `India → ${sec.title}`);
        });
    });

    // Inside Sales Middle East
    insideSalesMiddleEastData.sections.forEach((sec) => {
        sec.links.forEach((link) => {
            addLinkWithVariants(links, link, `Middle East → ${sec.title}`);
        });
    });

    // Experience Store
    experienceStoreData.sections.forEach((sec) => {
        sec.links.forEach((link) => {
            addLinkWithVariants(links, link, `Exp Store → ${sec.title}`);
        });
    });

    // Retention Calling
    retentionCallingData.sections.forEach((sec) => {
        sec.links.forEach((link) => {
            addLinkWithVariants(links, link, `Retention → ${sec.title}`);
        });
    });

    // Online Reputation Management
    onlineReputationManagementData.sections.forEach((sec) => {
        sec.links.forEach((link) => {
            addLinkWithVariants(links, link, `ORM → ${sec.title}`);
        });
    });

    // Feedback & Customer Experience
    feedbackCustomerExperienceData.sections.forEach((sec) => {
        sec.links.forEach((link) => {
            addLinkWithVariants(links, link, `Feedback → ${sec.title}`);
        });
    });

    return links;
}

// Flatten links for staff app tabs (button content only)
function getStaffAppLinks() {
    const links = [];

    // Retail - Staff: include section button contents only
    staffExperienceStoreData.sections.forEach((section) => {
        section.links.forEach((link) => {
            addLinkWithVariants(links, link, `Retail - Staff → ${section.title}`);
        });
    });

    // Retail - Admin: include section button contents only
    retailAdminData.sections.forEach((section) => {
        section.links.forEach((link) => {
            addLinkWithVariants(links, link, `Retail - Admin → ${section.title}`);
        });
    });

    // Business Analytics: include category button contents only
    businessAnalyticsCategories.forEach((categoryGroup) => {
        categoryGroup.links.forEach((link) => {
            addLinkWithVariants(links, link, `Business Analytics → ${categoryGroup.title}`);
        });
    });

    return links;
}

export default function SearchBar() {
    const [query, setQuery] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const [results, setResults] = useState([]);
    const inputRef = useRef(null);
    const wrapperRef = useRef(null);
    const navigate = useNavigate();
    const allLinks = useRef(isStaffApp ? getStaffAppLinks() : getDefaultAppLinks());

    // Keyboard shortcut Ctrl+K
    useEffect(() => {
        const handleKey = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                inputRef.current?.focus();
            }
            if (e.key === 'Escape') {
                setIsOpen(false);
                inputRef.current?.blur();
            }
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, []);

    // Close on click outside
    useEffect(() => {
        const handleClick = (e) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    const handleSearch = (value) => {
        setQuery(value);
        if (!value.trim()) {
            setResults([]);
            setIsOpen(false);
            return;
        }

        const q = value.toLowerCase();
        const filtered = allLinks.current.filter(link =>
            link.title.toLowerCase().includes(q) ||
            link.category.toLowerCase().includes(q)
        );
        setResults(filtered.slice(0, 8));
        setIsOpen(true);
    };

    const handleSelect = (link) => {
        if (link.isInternal && link.route) {
            navigate(link.route);
        } else if (link.url && link.url !== '#') {
            window.open(link.url, '_blank', 'noopener,noreferrer');
        }
        setQuery('');
        setIsOpen(false);
    };

    return (
        <div className="search-bar" ref={wrapperRef}>
            <div className="search-bar__input-wrapper">
                <svg className="search-bar__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8" />
                    <path d="M21 21l-4.35-4.35" />
                </svg>
                <input
                    ref={inputRef}
                    type="text"
                    className="search-bar__input"
                    placeholder="Search tools & links..."
                    value={query}
                    onChange={(e) => handleSearch(e.target.value)}
                    onFocus={() => query && setIsOpen(true)}
                />
                <kbd className="search-bar__shortcut">Ctrl+K</kbd>
            </div>

            {isOpen && results.length > 0 && (
                <div className="search-bar__dropdown glass-strong">
                    {results.map((link, idx) => (
                        <button
                            key={`${link.title}-${idx}`}
                            className="search-bar__result"
                            onClick={() => handleSelect(link)}
                        >
                            <span className="search-bar__result-title">{link.title}</span>
                            <span className="search-bar__result-category">{link.category}</span>
                        </button>
                    ))}
                </div>
            )}

            {isOpen && query && results.length === 0 && (
                <div className="search-bar__dropdown glass-strong">
                    <div className="search-bar__empty">No results found for "{query}"</div>
                </div>
            )}
        </div>
    );
}
