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
} from '../../config/dashboardData';
import './SearchBar.css';

// Flatten all links for search
function getAllLinks() {
    const links = [];

    // Dashboard categories
    dashboardCategories.forEach(cat => {
        cat.links.forEach(link => {
            links.push({ ...link, category: cat.title });
        });
    });

    // Inside Sales India
    insideSalesIndiaData.sections.forEach(sec => {
        sec.links.forEach(link => {
            links.push({ ...link, category: `India → ${sec.title}` });
        });
    });

    // Inside Sales Middle East
    insideSalesMiddleEastData.sections.forEach(sec => {
        sec.links.forEach(link => {
            links.push({ ...link, category: `Middle East → ${sec.title}` });
        });
    });

    // Experience Store
    experienceStoreData.sections.forEach(sec => {
        sec.links.forEach(link => {
            links.push({ ...link, category: `Exp Store → ${sec.title}` });
        });
    });

    // Retention Calling
    retentionCallingData.sections.forEach(sec => {
        sec.links.forEach(link => {
            links.push({ ...link, category: `Retention → ${sec.title}` });
        });
    });

    // Online Reputation Management
    onlineReputationManagementData.sections.forEach(sec => {
        sec.links.forEach(link => {
            links.push({ ...link, category: `ORM → ${sec.title}` });
        });
    });

    // Feedback & Customer Experience
    feedbackCustomerExperienceData.sections.forEach(sec => {
        sec.links.forEach(link => {
            links.push({ ...link, category: `Feedback → ${sec.title}` });
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
    const allLinks = useRef(getAllLinks());

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
