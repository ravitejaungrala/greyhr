import React, { useState, useEffect } from 'react';

const AttendanceInfo = ({ userId }) => {
    const [attendanceData, setAttendanceData] = useState([]);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [loading, setLoading] = useState(true);

    const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

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

    const avgWorkHrs = () => {
        let totalMins = 0;
        let days = 0;
        attendanceData.forEach(r => {
            if (r.total_work_hrs && r.total_work_hrs !== '-') {
                const parts = r.total_work_hrs.split(':');
                totalMins += (parseInt(parts[0]) * 60) + parseInt(parts[1]);
                days += 1;
            }
        });
        if (days === 0) return '--:--';
        const avg = Math.floor(totalMins / days);
        const hrs = Math.floor(avg / 60);
        const mins = avg % 60;
        return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
    };

    const getDaysInMonth = () => {
        const d = new Date();
        const year = d.getFullYear();
        const month = d.getMonth();
        const totalDays = new Date(year, month + 1, 0).getDate();
        const firstDay = new Date(year, month, 1).getDay();

        const days = [];
        // Padding for starting day
        for (let i = 0; i < firstDay; i++) days.push(null);

        for (let i = 1; i <= totalDays; i++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
            const record = attendanceData.find(r => r.date === dateStr);

            // Logic for status abbreviation and icon
            let statusChar = '';
            let dayTypeIcon = '';
            let bgColor = 'transparent';
            let statusText = '';
            let statusColor = 'var(--text-muted)';

            const dateObj = new Date(year, month, i);
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const dayOfWeek = dateObj.getDay();
            if (dayOfWeek === 0) {
                statusChar = 'O';
                statusText = 'Off Day';
                dayTypeIcon = '📺';
                bgColor = 'rgba(59, 130, 246, 0.1)';
                statusColor = '#3B82F6';
            } else if (dayOfWeek === 6) {
                statusChar = 'R';
                statusText = 'Rest Day';
                dayTypeIcon = '☕';
                bgColor = 'rgba(200, 76, 255, 0.05)';
                statusColor = 'var(--violet)';
            } else if (record) {
                statusChar = record.status_char;
                statusText = record.status;
                statusColor = record.color;

                bgColor = record.color === 'var(--secondary)' ? 'rgba(10, 102, 194, 0.1)' :
                    record.color === '#A855F7' ? 'rgba(168, 85, 247, 0.1)' :
                        record.color === '#EF4444' ? 'rgba(239, 68, 68, 0.1)' :
                            record.color === 'var(--violet)' ? 'rgba(200, 76, 255, 0.1)' : 'rgba(255,255,255,0.1)';
            } else if (dateObj < today) {
                statusChar = 'A';
                statusText = 'Absent';
                bgColor = 'rgba(239, 68, 68, 0.1)';
                statusColor = '#EF4444';
            }

            days.push({
                day: i,
                date: dateStr,
                statusChar,
                statusText,
                statusColor,
                dayTypeIcon,
                bgColor,
                record
            });
        }
        return days;
    };

    const selectedDayData = getDaysInMonth().find(d => d && d.date === selectedDate);

    // Legends Helper
    const LegendItem = ({ char, label, color, icon }) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
            <div style={{
                width: '24px', height: '24px', borderRadius: '4px',
                backgroundColor: color, color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 'bold', fontSize: '0.75rem'
            }}>{char || icon}</div>
            <span style={{ color: 'var(--text-muted)' }}>{label}</span>
        </div>
    );

    return (
        <div className="attendance-info-page" style={{ color: 'var(--text-light)' }}>
            {/* Header Metrics */}
            <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1.5rem' }}>
                <div className="card glass-panel" style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>AVG. WORK HRS</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{attendanceData.length > 0 ? avgWorkHrs() : '--:--'}</div>
                </div>
                <div className="card glass-panel" style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>AVG. ACTUAL WORK HRS</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{attendanceData.length > 0 ? avgWorkHrs() : '--:--'}</div>
                </div>
                <div className="card glass-panel" style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>PENALTY DAYS</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{getDaysInMonth().filter(d => d && d.day < new Date().getDate() && d.statusChar === 'A').length}</div>
                </div>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', color: 'var(--primary)', fontWeight: 'bold', cursor: 'pointer' }}>
                    +3 INSIGHTS
                </div>
            </div>

            {/* Exception Alert */}
            <div style={{ padding: '0.75rem 1.5rem', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '8px', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ color: '#EF4444' }}>⚠️</span>
                    <span style={{ fontSize: '0.9rem' }}>{getDaysInMonth().filter(d => d && d.day < new Date().getDate() && d.statusChar === 'A').length} exception day(s)</span>
                </div>
                <button className="btn" style={{ fontSize: '0.8rem', color: 'var(--primary)', padding: '0.25rem 0.5rem' }}>Regularize</button>
            </div>

            <div style={{ display: 'flex', gap: '1.5rem' }}>
                {/* CALENDAR SECTION */}
                <div className="card glass-panel" style={{ flex: 2, padding: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <button className="btn" style={{ minWidth: 'auto', padding: '0.25rem' }}>&lt; Prev</button>
                        <h2 style={{ fontSize: '1.25rem', margin: 0 }}>{new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}</h2>
                        <button className="btn" style={{ minWidth: 'auto', padding: '0.25rem' }}>Next &gt;</button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden' }}>
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                            <div key={day} style={{ padding: '0.75rem', textAlign: 'center', fontSize: '0.8rem', fontWeight: 'bold', background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--border-color)' }}>
                                {day}
                            </div>
                        ))}
                        {getDaysInMonth().map((d, i) => (
                            <div
                                key={i}
                                onClick={() => d && setSelectedDate(d.date)}
                                style={{
                                    padding: '0.5rem', height: '80px', borderRight: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)',
                                    cursor: d ? 'pointer' : 'default', transition: 'background 0.2s',
                                    background: d ? (selectedDate === d.date ? 'rgba(79, 70, 229, 0.1)' : d.bgColor) : 'transparent',
                                    position: 'relative'
                                }}
                            >
                                {d && (
                                    <>
                                        <div style={{ fontSize: '0.85rem', fontWeight: '500' }}>{String(d.day).padStart(2, '0')}</div>
                                        <div style={{
                                            position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                                            fontSize: '1.2rem', color: d.statusColor,
                                            fontWeight: 'bold'
                                        }}>
                                            {d.statusChar}
                                        </div>
                                        <div style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', fontSize: '0.9rem' }}>
                                            {d.dayTypeIcon}
                                        </div>
                                        {d.statusChar === 'P' && <div style={{ position: 'absolute', bottom: '0.25rem', right: '0.25rem', fontSize: '0.65rem', color: 'var(--text-muted)' }}>GEN</div>}
                                    </>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Legends Section */}
                    <div style={{ marginTop: '2rem' }}>
                        <h3 style={{ fontSize: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>Legends</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1rem' }}>
                            <LegendItem char="P" label="Present" color="var(--secondary)" />
                            <LegendItem char="HL" label="Half Leave" color="#A855F7" />
                            <LegendItem char="AD" label="Alert (Deduct)" color="var(--violet)" />
                            <LegendItem char="HA" label="Half Absent" color="#EF4444" />
                            <LegendItem char="A" label="Absent" color="#EF4444" />
                            <LegendItem char="O" label="Off Day" color="#3B82F6" />
                            <LegendItem char="R" label="Rest Day" color="var(--violet)" />
                            <LegendItem char="H" label="Holiday" color="var(--secondary)" />
                        </div>

                        <h3 style={{ fontSize: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', margin: '1.5rem 0 1rem' }}>Day Type</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1rem' }}>
                            <LegendItem icon="☕" label="Rest Day" />
                            <LegendItem icon="📺" label="Off Day" />
                            <LegendItem icon="⛱️" label="Holiday" />
                            <LegendItem icon="🌓" label="Half Day" />
                            <LegendItem icon="🏭" label="Shutdown" />
                        </div>
                    </div>
                </div>

                {/* DETAIL PANEL SECTION */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div className="card glass-panel" style={{ padding: '0' }}>
                        <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: '1rem' }}>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>{selectedDayData?.day ? String(selectedDayData.day).padStart(2, '0') : '--'}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{selectedDayData ? new Date(selectedDayData.date).toLocaleDateString(undefined, { weekday: 'short' }) : 'Day'}</div>
                            </div>
                            <div style={{ borderLeft: '1px solid var(--border-color)', paddingLeft: '1rem' }}>
                                <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>General(GEN)</div>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Shift : 09:00 to 18:00</div>
                            </div>
                            <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                                <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>General</div>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Attendance Scheme</div>
                            </div>
                        </div>

                        <div style={{ padding: '1.25rem', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', textAlign: 'center', borderBottom: '1px solid var(--border-color)' }}>
                            <div><div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>First In</div><div style={{ fontSize: '0.9rem' }}>{selectedDayData?.record?.first_in || '-'}</div></div>
                            <div><div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Last Out</div><div style={{ fontSize: '0.9rem' }}>{selectedDayData?.record?.last_out || '-'}</div></div>
                            <div><div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Late In</div><div style={{ fontSize: '0.9rem' }}>-</div></div>
                            <div><div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Early Out</div><div style={{ fontSize: '0.9rem' }}>-</div></div>
                        </div>

                        <div style={{ padding: '1.25rem', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', textAlign: 'center' }}>
                            <div><div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Work Hrs</div><div style={{ fontSize: '0.9rem' }}>{selectedDayData?.record?.total_work_hrs || '-'}</div></div>
                            <div><div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Break Hrs</div><div style={{ fontSize: '0.9rem' }}>-</div></div>
                            <div><div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Actual Work Hrs</div><div style={{ fontSize: '0.9rem' }}>{selectedDayData?.record?.actual_work_hrs || '-'}</div></div>
                        </div>
                    </div>

                    <div className="card glass-panel">
                        <h3 className="card-title" style={{ fontSize: '1rem' }}>Status Details</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '0.5rem' }}>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Status</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Remarks</div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
                            <div style={{ fontSize: '0.9rem' }}>{selectedDayData?.statusText || '-'}</div>
                            <div style={{ fontSize: '0.9rem', color: selectedDayData?.record?.deduction ? '#EF4444' : 'inherit' }}>
                                {selectedDayData?.record?.deduction ? `Penalty (₹${selectedDayData.record.deduction})` : '-'}
                            </div>
                        </div>
                    </div>

                    <div className="card glass-panel">
                        <h3 className="card-title" style={{ fontSize: '1rem' }}>Session Details</h3>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                            <thead style={{ background: 'rgba(255,255,255,0.03)', textAlign: 'left' }}>
                                <tr>
                                    <th style={{ padding: '0.75rem', borderBottom: '1px solid var(--border-color)' }}>Session</th>
                                    <th style={{ padding: '0.75rem', borderBottom: '1px solid var(--border-color)' }}>Session Timing</th>
                                    <th style={{ padding: '0.75rem', borderBottom: '1px solid var(--border-color)' }}>First In</th>
                                    <th style={{ padding: '0.75rem', borderBottom: '1px solid var(--border-color)' }}>Last Out</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td style={{ padding: '0.75rem', borderBottom: '1px solid var(--border-color)' }}>Day Session</td>
                                    <td style={{ padding: '0.75rem', borderBottom: '1px solid var(--border-color)' }}>09:00 - 18:00</td>
                                    <td style={{ padding: '0.75rem', borderBottom: '1px solid var(--border-color)' }}>{selectedDayData?.record?.first_in || '-'}</td>
                                    <td style={{ padding: '0.75rem', borderBottom: '1px solid var(--border-color)' }}>{selectedDayData?.record?.last_out || '-'}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AttendanceInfo;
