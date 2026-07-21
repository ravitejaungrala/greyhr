import React, { useState, useEffect } from 'react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';
import { subscribe, dismiss } from '../lib/toast';

const ICON = {
    success: CheckCircle2,
    error: AlertTriangle,
    info: Info,
};

const Toaster = () => {
    const [toasts, setToasts] = useState([]);

    useEffect(() => subscribe(setToasts), []);

    if (toasts.length === 0) return null;

    return (
        <div className="ds-toaster" role="region" aria-label="Notifications">
            {toasts.map((t) => {
                const Icon = ICON[t.tone] || Info;
                return (
                    <div
                        key={t.id}
                        className={`ds-toast ${t.tone}`}
                        role={t.tone === 'error' ? 'alert' : 'status'}
                        aria-live={t.tone === 'error' ? 'assertive' : 'polite'}
                    >
                        <span className="ds-toast-icon"><Icon size={16} /></span>
                        <div className="ds-toast-body">
                            {t.title && <div className="ds-toast-title">{t.title}</div>}
                            <div className="ds-toast-msg">{t.message}</div>
                        </div>
                        <button
                            className="ds-toast-close"
                            onClick={() => dismiss(t.id)}
                            aria-label="Dismiss notification"
                        >
                            <X size={13} />
                        </button>
                    </div>
                );
            })}
        </div>
    );
};

export default Toaster;
