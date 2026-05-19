import { useState } from 'react';
import { apiFetchBlob } from '../../context/AuthContext';
import './NoticeAttachmentList.css';

/**
 * @param {{ attachments?: { id: string, file_name: string, download_url: string }[], className?: string }} props
 */
export default function NoticeAttachmentList({ attachments = [], className = '' }) {
    const [busyId, setBusyId] = useState('');

    if (!attachments?.length) return null;

    const handleDownload = async (att) => {
        setBusyId(att.id);
        try {
            const blob = await apiFetchBlob(att.download_url);
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = att.file_name || 'notice.pdf';
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
        } catch (err) {
            console.warn('Download failed:', err.message);
            alert(err.message || 'Could not download PDF');
        } finally {
            setBusyId('');
        }
    };

    return (
        <ul className={`notice-attachments ${className}`.trim()}>
            {attachments.map((att) => (
                <li key={att.id}>
                    <button
                        type="button"
                        className="notice-attachments__link"
                        disabled={busyId === att.id}
                        onClick={() => handleDownload(att)}
                    >
                        {busyId === att.id ? 'Downloading…' : `Download PDF: ${att.file_name}`}
                    </button>
                </li>
            ))}
        </ul>
    );
}
