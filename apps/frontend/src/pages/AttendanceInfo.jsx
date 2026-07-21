import React, { useState, useEffect } from 'react';
import { AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';
import { API_URL } from '../config';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Maps a status abbreviation onto a design-system colour variant.
const VARIANT = {
    P: 'P', H: 'H', A: 'A', O: 'O', R: 'R',
    CL: 'L', SL: 'L', PL: 'L', CO: 'L', LOP: 'A'
};
const variantOf = (char) => VARIANT[char] || 'L';

const LABEL = {
    P: 'Present', A: 'Absent', O: 'Off day', R: 'Rest day', H: 'Holiday'
};

const AttendanceInfo = ({ userId }) => {
    const [attendanceData, setAttendanceData] = useState([]);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [cursor, setCursor] = useState(() => {
        const d = new Date();
        return { year: d.getFullYear(), month: d.getMonth() };
    });
    const [loading, setLoading] = useState(true);

    const apiUrl = API_URL;

    useEffect(() => {
        fetchAttendance();
    }, [userId]);

    const fetchAttendance = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${apiUrl}/employee/attendance/calendar?employee_id=${userId}`);
            const data = await res.json();
            setAttendanceData(data.history || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    /* ---------------- derived metrics (unchanged logic) ---------------- */

    const minutesOf = (hhmm) => {
        if (!hhmm || hhmm === '-') return null;
        const parts = String(hhmm).split(':');
        if (parts.length < 2) return null;
        return (parseInt(parts[0], 10) * 60) + parseInt(parts[1], 10);
    };

    const fmtMins = (mins) => {
        const hrs = Math.floor(mins / 60);
        return `${String(hrs).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
    };

    const avgWorkHrs = () => {
        let totalMins = 0, days = 0;
        attendanceData.forEach(r => {
            const m = minutesOf(r.total_work_hrs);
            if (m !== null) { totalMins += m; days += 1; }
        });
        return days === 0 ? '–:–' : fmtMins(Math.floor(totalMins / days));
    };

    const actualAvgWorkHrs = () => {
        let totalMins = 0, workingDays = 0;
        attendanceData.forEach(r => {
            const dayOfWeek = new Date(r.date).getDay();
            const m = minutesOf(r.total_work_hrs);
            if (dayOfWeek >= 1 && dayOfWeek <= 5 && m !== null) { totalMins += m; workingDays += 1; }
        });
        return workingDays === 0 ? '–:–' : fmtMins(Math.floor(totalMins / workingDays));
    };

    const totalWorkPerDay = () => {
        const today = new Date().toISOString().split('T')[0];
        const todayRecord = attendanceData.find(r => r.date === today);
        if (todayRecord && minutesOf(todayRecord.total_work_hrs) !== null) return todayRecord.total_work_hrs;
        return '–:–';
    };

    const totalWorkPerMonth = () => {
        let totalMins = 0;
        attendanceData.forEach(r => {
            const m = minutesOf(r.total_work_hrs);
            if (m !== null) totalMins += m;
        });
        return totalMins === 0 ? '–:–' : fmtMins(totalMins);
    };

    /* ---------------- calendar construction ---------------- */

    const getDaysInMonth = () => {
        const { year, month } = cursor;
        const totalDays = new Date(year, month + 1, 0).getDate();
        const firstDay = new Date(year, month, 1).getDay();

        const days = [];
        for (let i = 0; i < firstDay; i++) days.push(null);

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        for (let i = 1; i <= totalDays; i++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
            const record = attendanceData.find(r => r.date === dateStr);
            const dateObj = new Date(year, month, i);
            const dayOfWeek = dateObj.getDay();

            let statusChar = '';
            let statusText = '';

            if (dayOfWeek === 0) {
                statusChar = 'O';
                statusText = 'Off day';
            } else if (dayOfWeek === 6) {
                statusChar = 'R';
                statusText = 'Rest day';
            } else if (record) {
                statusChar = record.status_char;
                statusText = record.status || LABEL[record.status_char] || record.status_char;
            } else if (dateObj < today) {
                statusChar = 'A';
                statusText = 'Absent';
            }

            days.push({
                day: i,
                date: dateStr,
                statusChar,
                statusText,
                isToday: dateObj.getTime() === today.getTime(),
                record
            });
        }
        return days;
    };

    const days = getDaysInMonth();
    const selectedDayData = days.find(d => d && d.date === selectedDate);

    const exceptionCount = days.filter(
        d => d && d.statusChar === 'A' && new Date(d.date) < new Date(new Date().setHours(0, 0, 0, 0))
    ).length;

    const shiftMonth = (delta) => {
        setCursor(prev => {
            const d = new Date(prev.year, prev.month + delta, 1);
            return { year: d.getFullYear(), month: d.getMonth() };
        });
    };

    const monthLabel = new Date(cursor.year, cursor.month, 1)
        .toLocaleString('default', { month: 'long', year: 'numeric' });

    const selectedVariant = selectedDayData?.statusChar ? variantOf(selectedDayData.statusChar) : null;
    const variantColor = {
        P: 'var(--present)', A: 'var(--absent)', O: 'var(--off)',
        R: 'var(--rest)', H: 'var(--holiday)', L: 'var(--accent)'
    };
    const variantBg = {
        P: 'var(--present-bg)', A: 'var(--absent-bg)', O: 'var(--off-bg)',
        R: 'var(--rest-bg)', H: 'var(--holiday-bg)', L: 'var(--accent-soft)'
    };

    if (loading) {
        return (
            <div className="ds">
                <div className="ds-wrap-narrow">
                    <div className="ds-loading">
                        <div className="ds-spinner" />
                        Loading attendance…
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="ds">
            <div className="ds-wrap-narrow">

                {/* ---------- Header ---------- */}
                <div className="ds-page-head baseline">
                    <div>
                        <h1 className="ds-page-title">Attendance</h1>
                        <div className="ds-page-sub">{monthLabel} · Employee overview</div>
                    </div>
                </div>

                {/* ---------- Stat strip ---------- */}
                <div className="ds-stats">
                    <div className="ds-stat-card">
                        <div className="label">Avg. work hrs</div>
                        <div className="value">{attendanceData.length > 0 ? avgWorkHrs() : '–:–'}</div>
                    </div>
                    <div className="ds-stat-card">
                        <div className="label">Actual avg. hrs</div>
                        <div className="value">{attendanceData.length > 0 ? actualAvgWorkHrs() : '–:–'}</div>
                    </div>
                    <div className="ds-stat-card">
                        <div className="label">Today's work</div>
                        <div className="value">{totalWorkPerDay()}</div>
                    </div>
                    <div className="ds-stat-card">
                        <div className="label">Monthly total</div>
                        <div className="value">{attendanceData.length > 0 ? totalWorkPerMonth() : '–:–'}</div>
                    </div>
                    <div className="ds-stat-card flag">
                        <div className="label">Penalty days</div>
                        <div className="value">{exceptionCount}</div>
                    </div>
                </div>

                {/* ---------- Exception banner ---------- */}
                {exceptionCount > 0 && (
                    <div className="ds-banner">
                        <div className="left">
                            <AlertTriangle size={16} />
                            <span>{exceptionCount} exception day(s) need review</span>
                        </div>
                        <span className="ds-banner-action">Regularize →</span>
                    </div>
                )}

                <div className="ds-layout">

                    {/* ---------- Calendar ---------- */}
                    <div className="ds-panel flush">
                        <div className="ds-cal-head">
                            <button className="ds-nav-btn" onClick={() => shiftMonth(-1)}>
                                <ChevronLeft size={14} /> Prev
                            </button>
                            <h2>{monthLabel}</h2>
                            <button className="ds-nav-btn" onClick={() => shiftMonth(1)}>
                                Next <ChevronRight size={14} />
                            </button>
                        </div>

                        <div className="ds-weekdays">
                            {WEEKDAYS.map(d => <div key={d}>{d}</div>)}
                        </div>

                        <div className="ds-cal-grid">
                            {days.map((d, i) => {
                                if (!d) return <div key={i} className="ds-day empty" />;
                                const cls = [
                                    'ds-day',
                                    d.isToday ? 'today' : '',
                                    selectedDate === d.date ? 'selected' : ''
                                ].filter(Boolean).join(' ');
                                return (
                                    <div key={i} className={cls} onClick={() => setSelectedDate(d.date)}>
                                        <div className="num">{String(d.day).padStart(2, '0')}</div>
                                        {d.statusChar
                                            ? <span className={`tag ${variantOf(d.statusChar)}`}>{d.statusChar}</span>
                                            : <span className="dash">–</span>}
                                    </div>
                                );
                            })}
                        </div>

                        <div className="ds-legend">
                            <div className="item"><span className="ds-swatch" style={{ background: 'var(--present)' }} />Present</div>
                            <div className="item"><span className="ds-swatch" style={{ background: 'var(--absent)' }} />Absent</div>
                            <div className="item"><span className="ds-swatch" style={{ background: 'var(--off)' }} />Off day</div>
                            <div className="item"><span className="ds-swatch" style={{ background: 'var(--rest)' }} />Rest day</div>
                            <div className="item"><span className="ds-swatch" style={{ background: 'var(--holiday)' }} />Holiday</div>
                            <div className="item"><span className="ds-swatch" style={{ background: 'var(--accent)' }} />Leave (CL / SL / PL / CO)</div>
                        </div>
                    </div>

                    {/* ---------- Side panel ---------- */}
                    <div className="ds-side">

                        <div className="ds-panel">
                            <div className="ds-side-date">
                                <div className="d">
                                    {selectedDayData ? String(selectedDayData.day).padStart(2, '0') : '––'}
                                    <span>
                                        {selectedDayData
                                            ? new Date(selectedDayData.date).toLocaleDateString(undefined, { weekday: 'long' })
                                            : 'Day'}
                                    </span>
                                </div>
                                <div className="ds-side-badge">General</div>
                            </div>
                            <div className="ds-shift-line">General (GEN) · Shift <b>09:00 – 18:00</b></div>

                            <div className="ds-kv-grid">
                                <div className="ds-kv"><div className="k">First in</div><div className="v">{selectedDayData?.record?.first_in || '–'}</div></div>
                                <div className="ds-kv"><div className="k">Last out</div><div className="v">{selectedDayData?.record?.last_out || '–'}</div></div>
                                <div className="ds-kv"><div className="k">Late in</div><div className="v">–</div></div>
                                <div className="ds-kv"><div className="k">Early out</div><div className="v">–</div></div>
                                <div className="ds-kv"><div className="k">Total hrs</div><div className="v">{selectedDayData?.record?.total_work_hrs || '–'}</div></div>
                                <div className="ds-kv"><div className="k">Break hrs</div><div className="v">–</div></div>
                            </div>
                        </div>

                        <div className="ds-panel">
                            <h3>Status</h3>
                            <div className="ds-status-row">
                                <span>{selectedDayData?.statusText || '–'}</span>
                                {selectedDayData?.statusChar && (
                                    <span
                                        className="ds-pill"
                                        style={{ color: variantColor[selectedVariant], background: variantBg[selectedVariant] }}
                                    >
                                        {selectedDayData.statusChar}
                                    </span>
                                )}
                            </div>
                            {selectedDayData?.record?.deduction ? (
                                <div className="ds-status-row">
                                    <span>Remarks</span>
                                    <span style={{ color: 'var(--absent)', fontWeight: 600 }}>
                                        Penalty (₹{selectedDayData.record.deduction})
                                    </span>
                                </div>
                            ) : null}
                        </div>

                        <div className="ds-panel">
                            <h3>Session</h3>
                            <table className="ds-session-table">
                                <thead>
                                    <tr><th>Session</th><th>Timing</th><th>In</th><th>Out</th></tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td>Day session</td>
                                        <td>09–18</td>
                                        <td>{selectedDayData?.record?.first_in || '–'}</td>
                                        <td>{selectedDayData?.record?.last_out || '–'}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
};

export default AttendanceInfo;
