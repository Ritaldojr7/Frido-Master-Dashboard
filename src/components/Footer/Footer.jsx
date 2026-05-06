import React from 'react';
import './Footer.css';
import fridoLogo from '../../assets/footer_logo.png';

export default function Footer() {
    return (
        <footer className="footer">
            <div className="footer-line"></div>
            <div className="footer-top">
                <div className="footer-top-left">
                    <div className="footer-brand">
                        <img src={fridoLogo} alt="frido" className="footer-logo" />
                        <div className="footer-copyright">
                            &copy; 2026 ALL RIGHTS RESERVED.
                        </div>
                    </div>
                </div>
                <div className="footer-top-center">
                    <div className="footer-slogan">
                        Freedom To Do More
                    </div>
                </div>
                <div className="footer-top-right">
                    <div className="footer-socials">
                    <a href="https://www.instagram.com/myfrido/" target="_blank" rel="noopener noreferrer" className="social-link" aria-label="Instagram">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                            <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                            <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                        </svg>
                    </a>
                    <a href="https://www.facebook.com/myfrido/" target="_blank" rel="noopener noreferrer" className="social-link" aria-label="Facebook">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
                        </svg>
                    </a>
                    <a href="https://www.linkedin.com/company/myfrido" target="_blank" rel="noopener noreferrer" className="social-link" aria-label="LinkedIn">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path>
                            <rect x="2" y="9" width="4" height="12"></rect>
                            <circle cx="4" cy="4" r="2"></circle>
                        </svg>
                    </a>
                    <a href="https://x.com/frido_official" target="_blank" rel="noopener noreferrer" className="social-link" aria-label="X (Twitter)">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M4 4l11.733 16h4.267l-11.733 -16z"></path>
                            <path d="M4 20l6.768 -6.768m2.46 -2.46l6.772 -6.772"></path>
                        </svg>
                    </a>
                </div>
                </div>
            </div>
        </footer>
    );
}
