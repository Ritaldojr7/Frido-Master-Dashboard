import { useContext, useState, useId, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { iconPathList } from '../../config/dashboardData';
import { AuthContext } from '../../context/AuthContext';
import './LinkCard.css';

function downloadImageAsJpeg(src, filename) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            try {
                const canvas = document.createElement('canvas');
                canvas.width = img.naturalWidth;
                canvas.height = img.naturalHeight;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error('Canvas not supported'));
                    return;
                }
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0);
                canvas.toBlob(
                    (blob) => {
                        if (!blob) {
                            reject(new Error('JPEG encode failed'));
                            return;
                        }
                        const u = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = u;
                        a.download = filename;
                        a.click();
                        URL.revokeObjectURL(u);
                        resolve();
                    },
                    'image/jpeg',
                    0.92
                );
            } catch (err) {
                reject(err);
            }
        };
        img.onerror = () => reject(new Error('Image load failed'));
        img.src = src;
    });
}

async function copyTextToClipboard(text) {
    try {
        if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(text);
            return true;
        }
    } catch {
        /* fall through to legacy */
    }
    try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        ta.style.top = '0';
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        const ok = document.execCommand('copy');
        document.body.removeChild(ta);
        return ok;
    } catch {
        return false;
    }
}

export default function LinkCard({
    title,
    url,
    route,
    isInternal,
    icon,
    tooltip,
    subOptions,
    variant = 'default',
    accentColor = 'blue',
    animationDelay = 0,
    isComingSoon = false,
    copyModalText,
    imageModalSrc,
    imageModalDownloadName = 'frido-isd-qr.jpg',
}) {
    const navigate = useNavigate();
    const auth = useContext(AuthContext);
    const user = auth?.user;
    const [expanded, setExpanded] = useState(false);
    const [copyModalOpen, setCopyModalOpen] = useState(false);
    const [imageModalOpen, setImageModalOpen] = useState(false);
    const [imageDownloading, setImageDownloading] = useState(false);
    const [copied, setCopied] = useState(false);
    const copyModalTitleId = useId();
    const imageModalTitleId = useId();
    const iconPaths = iconPathList(icon);
    const isAdminUser = user?.role === 'admin';
    const showTooltip = Boolean(tooltip) && !isAdminUser;
    const hasCopyModal = Boolean(copyModalText);
    const hasImageModal = Boolean(imageModalSrc);

    const handleClick = (e) => {
        if (isComingSoon) {
            e.preventDefault();
            return;
        }
        if (hasCopyModal) {
            e.preventDefault();
            setCopied(false);
            setCopyModalOpen(true);
            return;
        }
        if (hasImageModal) {
            e.preventDefault();
            setImageModalOpen(true);
            return;
        }
        if (subOptions && subOptions.length > 0) {
            e.preventDefault();
            setExpanded(!expanded);
            return;
        }
        if (isInternal && route) {
            e.preventDefault();
            navigate(route);
        }
    };

    const closeCopyModal = () => {
        setCopyModalOpen(false);
        setCopied(false);
    };

    const closeImageModal = () => {
        setImageModalOpen(false);
        setImageDownloading(false);
    };

    const handleImageDownload = async (e) => {
        e.stopPropagation();
        if (!imageModalSrc || imageDownloading) return;
        setImageDownloading(true);
        try {
            await downloadImageAsJpeg(imageModalSrc, imageModalDownloadName || 'image.jpg');
        } catch {
            /* quiet fail; user can right-click the image */
        } finally {
            setImageDownloading(false);
        }
    };

    const handleCopyAll = async (e) => {
        e.stopPropagation();
        if (!copyModalText) return;
        const ok = await copyTextToClipboard(copyModalText);
        setCopied(ok);
    };

    useEffect(() => {
        if (!copyModalOpen && !imageModalOpen) return undefined;
        const onKeyDown = (e) => {
            if (e.key === 'Escape') {
                setCopyModalOpen(false);
                setCopied(false);
                setImageModalOpen(false);
                setImageDownloading(false);
            }
        };
        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, [copyModalOpen, imageModalOpen]);

    const colorClass = variant === 'dark'
        ? 'link-card--dark'
        : `link-card--${variant || accentColor}`;

    const hasSubOptions = subOptions && subOptions.length > 0;
    const comingSoonClass = isComingSoon ? 'link-card--coming-soon' : '';

    const href =
        hasCopyModal || hasImageModal || isComingSoon || hasSubOptions
            ? '#'
            : isInternal
              ? route || '#'
              : url || '#';

    const copyModalPortal =
        hasCopyModal && copyModalOpen
            ? createPortal(
                  <div
                      className="link-card__modal-overlay"
                      role="presentation"
                      onClick={closeCopyModal}
                  >
                      <div
                          className="link-card__modal"
                          role="dialog"
                          aria-modal="true"
                          aria-labelledby={copyModalTitleId}
                          onClick={(e) => e.stopPropagation()}
                      >
                          <h3 id={copyModalTitleId} className="link-card__modal-title">
                              {title}
                          </h3>
                          <p className="link-card__modal-hint">Select and copy, or use the button below.</p>
                          <textarea
                              className="link-card__modal-textarea"
                              readOnly
                              value={copyModalText}
                              rows={10}
                          />
                          <div className="link-card__modal-actions">
                              <button
                                  type="button"
                                  className="link-card__modal-btn link-card__modal-btn--primary"
                                  onClick={handleCopyAll}
                              >
                                  {copied ? 'Copied' : 'Copy all'}
                              </button>
                              <button type="button" className="link-card__modal-btn" onClick={closeCopyModal}>
                                  Close
                              </button>
                          </div>
                      </div>
                  </div>,
                  document.body
              )
            : null;

    const imageModalPortal =
        hasImageModal && imageModalOpen
            ? createPortal(
                  <div
                      className="link-card__modal-overlay"
                      role="presentation"
                      onClick={closeImageModal}
                  >
                      <div
                          className="link-card__modal link-card__modal--image"
                          role="dialog"
                          aria-modal="true"
                          aria-labelledby={imageModalTitleId}
                          onClick={(e) => e.stopPropagation()}
                      >
                          <h3 id={imageModalTitleId} className="link-card__modal-title">
                              {title}
                          </h3>
                          <p className="link-card__modal-hint">Scan from the image, or download as JPG.</p>
                          <div className="link-card__modal-image-wrap">
                              <img
                                  className="link-card__modal-image"
                                  src={imageModalSrc}
                                  alt=""
                              />
                          </div>
                          <div className="link-card__modal-actions">
                              <button
                                  type="button"
                                  className="link-card__modal-btn link-card__modal-btn--primary"
                                  onClick={handleImageDownload}
                                  disabled={imageDownloading}
                              >
                                  {imageDownloading ? 'Downloading…' : 'Download JPG'}
                              </button>
                              <button type="button" className="link-card__modal-btn" onClick={closeImageModal}>
                                  Close
                              </button>
                          </div>
                      </div>
                  </div>,
                  document.body
              )
            : null;

    return (
        <>
            <div
                className="link-card-container"
                style={{ animationDelay: `${animationDelay}ms` }}
                {...(showTooltip ? { 'data-tooltip': tooltip } : {})}
            >
            <a
                href={href}
                onClick={handleClick}
                target={
                    !hasCopyModal &&
                    !hasImageModal &&
                    !isInternal &&
                    !hasSubOptions &&
                    !isComingSoon &&
                    url &&
                    url !== '#'
                        ? '_blank'
                        : undefined
                }
                rel={!isInternal && !hasSubOptions && !isComingSoon && !hasCopyModal && !hasImageModal ? 'noopener noreferrer' : undefined}
                className={`link-card ${colorClass} ${expanded ? 'link-card--expanded' : ''} ${comingSoonClass}`}
            >
                <div className="link-card__content">
                    {iconPaths.length > 0 && (
                        <svg className="link-card__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            {iconPaths.map((d, i) => (
                                <path key={i} d={d} />
                            ))}
                        </svg>
                    )}
                    <span className="link-card__title">{title}</span>
                </div>
                <div className="link-card__right-section">
                    {isComingSoon && (
                        <div className="link-card__coming-soon-text">
                            Coming<br/>Soon
                        </div>
                    )}
                    <svg 
                        className={`link-card__arrow ${hasSubOptions ? 'link-card__arrow--chevron' : ''} ${expanded ? 'link-card__arrow--expanded' : ''}`} 
                        viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                    >
                        {hasSubOptions ? (
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        ) : (
                            <path d="M5 12h14M12 5l7 7-7 7" />
                        )}
                    </svg>
                </div>
            </a>
            
            {hasSubOptions && (
                <div className={`link-card__sub-options ${expanded ? 'link-card__sub-options--open' : ''}`}>
                    {subOptions.map((opt, idx) => (
                        <a 
                            key={idx}
                            href={opt.isInternal ? (opt.route || '#') : (opt.url || '#')}
                            onClick={(e) => {
                                if (opt.isInternal && opt.route) {
                                    e.preventDefault();
                                    navigate(opt.route);
                                }
                            }}
                            target={!opt.isInternal && opt.url && opt.url !== '#' ? '_blank' : undefined}
                            rel={!opt.isInternal ? 'noopener noreferrer' : undefined}
                            className="link-card__sub-link"
                        >
                            <span>{opt.title}</span>
                            {!opt.isInternal && (
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5 }}>
                                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                                    <polyline points="15 3 21 3 21 9"></polyline>
                                    <line x1="10" y1="14" x2="21" y2="3"></line>
                                </svg>
                            )}
                        </a>
                    ))}
                </div>
            )}
            </div>
            {copyModalPortal}
            {imageModalPortal}
        </>
    );
}
