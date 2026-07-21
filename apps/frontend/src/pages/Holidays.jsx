import React, { useState, useEffect } from 'react';
import { Calendar } from 'lucide-react';
import { API_URL } from '../config';

const Holidays = () => {
    const [holidays, setHolidays] = useState([]);
    const [loading, setLoading] = useState(true);
    const apiUrl = API_URL;

    useEffect(() => {
        fetch(`${apiUrl}/employee/holidays`)
            .then(res => res.ok ? res.json() : { holidays: [] })
            .then(data => {
                setHolidays(Array.isArray(data?.holidays) ? data.holidays : []);
                setLoading(false);
            })
            .catch(err => {
                console.error("Error fetching holidays:", err);
                setHolidays([]);
                setLoading(false);
            });
    }, []);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sorted = [...holidays].sort((a, b) => new Date(a.date) - new Date(b.date));
    const upcoming = sorted.filter(h => new Date(h.date) >= today);
    const past = sorted.filter(h => new Date(h.date) < today);

    const formatDate = (d) => new Date(d).toLocaleDateString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    const daysAway = (d) => {
        const diff = Math.ceil((new Date(d) - today) / 86400000);
        if (diff === 0) return 'Today';
        if (diff === 1) return 'Tomorrow';
        return `In ${diff} days`;
    };

    const Row = ({ h, isPast }) => (
        <div className="ds-drow" style={{ padding: '14px 0', opacity: isPast ? 0.55 : 1 }}>
            <div className="name" style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ fontWeight: 700, fontSize: 13.5 }}>{h.name}</span>
                <span style={{ fontSize: 11.5, color: 'var(--ink-faint)' }}>{h.type || 'Holiday'}</span>
            </div>
            <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>{formatDate(h.date)}</div>
                {!isPast && (
                    <div style={{ fontSize: 11.5, color: 'var(--accent)', fontWeight: 600, marginTop: 2 }}>
                        {daysAway(h.date)}
                    </div>
                )}
            </div>
        </div>
    );

    if (loading) {
        return (
            <div className="ds">
                <div className="ds-wrap-narrow">
                    <div className="ds-loading">
                        <div className="ds-spinner" />
                        Loading holidays…
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="ds">
            <div className="ds-wrap-narrow">

                <div className="ds-page-head">
                    <div className="ds-brand">
                        <div className="ds-icon"><Calendar size={17} /></div>
                        <h1>Holiday Calendar</h1>
                    </div>
                    <div className="ds-head-right">
                        <span className="ds-pill accent">{upcoming.length} upcoming</span>
                    </div>
                </div>

                <div className="ds-panel roomy stacked">
                    <div className="ds-panel-title serif-lg">Upcoming holidays</div>
                    {upcoming.length === 0
                        ? <div className="ds-empty">No holidays scheduled.</div>
                        : upcoming.map((h, i) => <Row key={i} h={h} />)}
                </div>

                {past.length > 0 && (
                    <div className="ds-panel roomy">
                        <div className="ds-panel-title serif-lg">Earlier this year</div>
                        {past.map((h, i) => <Row key={i} h={h} isPast />)}
                    </div>
                )}

            </div>
        </div>
    );
};

export default Holidays;
