import React, { useState, useEffect } from 'react';
import { 
    Monitor, Coffee, TreePalm, Factory, 
    AlertTriangle, ChevronLeft, ChevronRight,
    Calendar, Clock, BarChart3, Sun, History
} from 'lucide-react';
import { API_URL } from '../config';

const AttendanceInfo = ({ userId }) => {
    const [attendanceData, setAttendanceData] = useState([]);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
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
                dayTypeIcon = <Monitor size={12} />;
                bgColor = '#EBF5FF';
                statusColor = '#ff4500';
            } else if (dayOfWeek === 6) {
                statusChar = 'R';
                statusText = 'Rest Day';
                dayTypeIcon = <Coffee size={12} />;
                bgColor = '#F5EBFF';
                statusColor = 'var(--violet)';
            } else if (record) {
                statusChar = record.status_char;
                statusText = record.status;
                statusColor = record.color;

                bgColor = record.color === 'var(--secondary)' ? '#E6F0FF' :
                    record.color === '#A855F7' ? '#F3E8FF' :
                        record.color === '#EF4444' ? '#FEE2E2' :
                            record.color === 'var(--violet)' ? '#F5EBFF' : '#ffffff';
            } else if (dateObj < today) {
                statusChar = 'A';
                statusText = 'Absent';
                bgColor = '#FEE2E2';
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
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                <div className="card shadow-sm" style={{ flex: 1, textAlign: 'center', background: '#ffffff', border: '1px solid var(--border-color)', padding: '0.75rem' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>AVG. WORK HRS</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>{attendanceData.length > 0 ? avgWorkHrs() : '--:--'}</div>
                </div>
                <div className="card shadow-sm" style={{ flex: 1, textAlign: 'center', background: '#ffffff', border: '1px solid var(--border-color)', padding: '0.75rem' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>AVG. ACTUAL WORK HRS</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>{attendanceData.length > 0 ? avgWorkHrs() : '--:--'}</div>
                </div>
                <div className="card shadow-sm" style={{ flex: 1, textAlign: 'center', background: '#ffffff', border: '1px solid var(--border-color)', padding: '0.75rem' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>PENALTY DAYS</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>{getDaysInMonth().filter(d => d && d.day < new Date().getDate() && d.statusChar === 'A').length}</div>
                </div>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', color: 'var(--primary)', fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer' }}>
                    +3 INSIGHTS
                </div>
            </div>

            {/* Exception Alert */}
            <div style={{ padding: '0.5rem 1rem', background: '#FEF2F2', border: '1px solid #FEE2E2', borderRadius: '8px', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <AlertTriangle size={14} color="#EF4444" />
                    <span style={{ fontSize: '0.85rem' }}>{getDaysInMonth().filter(d => d && d.day < new Date().getDate() && d.statusChar === 'A').length} exception day(s)</span>
                </div>
                <button className="btn" style={{ fontSize: '0.75rem', color: 'var(--primary)', padding: '0.2rem 0.5rem' }}>Regularize</button>
            </div>

            <div style={{ display: 'flex', gap: '1.5rem' }}>
                {/* CALENDAR SECTION */}
                <div className="card shadow-sm" style={{ flex: 2, padding: '1rem', background: '#ffffff', border: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <button className="btn" style={{ minWidth: 'auto', padding: '0.2rem', display: 'flex', alignItems: 'center' }}><ChevronLeft size={16} /> Prev</button>
                        <h2 style={{ fontSize: '1.1rem', margin: 0 }}>{new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}</h2>
                        <button className="btn" style={{ minWidth: 'auto', padding: '0.2rem', display: 'flex', alignItems: 'center' }}>Next <ChevronRight size={16} /></button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden' }}>
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                            <div key={day} style={{ padding: '0.5rem', textAlign: 'center', fontSize: '0.75rem', fontWeight: 'bold', background: '#f8fafc', borderBottom: '1px solid var(--border-color)' }}>
                                {day}
                            </div>
                        ))}
                        {getDaysInMonth().map((d, i) => (
                            <div
                                key={i}
                                onClick={() => d && setSelectedDate(d.date)}
                                style={{
                                    padding: '0.25rem', height: '65px', borderRight: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)',
                                    cursor: d ? 'pointer' : 'default', transition: 'background 0.2s',
                                    background: d ? (selectedDate === d.date ? '#EEF2FF' : d.bgColor) : 'transparent',
                                    position: 'relative'
                                }}
                            >
                                {d && (
                                    <>
                                        <div style={{ fontSize: '0.8rem', fontWeight: '500' }}>{String(d.day).padStart(2, '0')}</div>
                                        <div style={{
                                            position: 'absolute', top: '55%', left: '50%', transform: 'translate(-50%, -50%)',
                                            fontSize: d.statusChar.length > 1 ? '0.8rem' : '1.1rem', 
                                            color: d.statusColor,
                                            fontWeight: 'bold',
                                            letterSpacing: '-0.5px'
                                        }}>
                                            {d.statusChar}
                                        </div>
                                        <div style={{ position: 'absolute', top: '0.25rem', right: '0.25rem', fontSize: '0.8rem' }}>
                                            {d.dayTypeIcon}
                                        </div>
                                        {d.statusChar === 'P' && <div style={{ position: 'absolute', bottom: '0.2rem', right: '0.2rem', fontSize: '0.6rem', color: 'var(--text-muted)' }}>GEN</div>}
                                    </>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Legends Section */}
                    <div style={{ marginTop: '1rem' }}>
                        <h3 style={{ fontSize: '0.9rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.25rem', marginBottom: '0.75rem' }}>Legends</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
                            <LegendItem char="P" label="Present" color="var(--secondary)" />
                            <LegendItem char="CL" label="Casual Leave" color="#A855F7" />
                            <LegendItem char="SL" label="Sick Leave" color="#A855F7" />
                            <LegendItem char="PL" label="Paid Leave (LOP)" color="#ff7a00" />
                            <LegendItem char="CO" label="Comp-Off" color="#A855F7" />
                            <LegendItem char="A" label="Absent" color="#EF4444" />
                            <LegendItem char="O" label="Off Day" color="#ff4500" />
                            <LegendItem char="R" label="Rest Day" color="var(--violet)" />
                            <LegendItem char="H" label="Holiday" color="var(--secondary)" />
                        </div>

                        <h3 style={{ fontSize: '0.9rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.25rem', margin: '1rem 0 0.75rem' }}>Day Type</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.5rem' }}>
                            <LegendItem icon={<Coffee size={12} />} label="Rest Day" />
                            <LegendItem icon={<Monitor size={12} />} label="Off Day" />
                            <LegendItem icon={<TreePalm size={12} />} label="Holiday" />
                            <LegendItem icon={<Sun size={12} />} label="Half Day" />
                            <LegendItem icon={<Factory size={12} />} label="Shutdown" />
                        </div>
                    </div>
                </div>

                {/* DETAIL PANEL SECTION */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div className="card shadow-sm" style={{ padding: '0', background: '#ffffff', border: '1px solid var(--border-color)' }}>
                        <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: '0.75rem' }}>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>{selectedDayData?.day ? String(selectedDayData.day).padStart(2, '0') : '--'}</div>
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{selectedDayData ? new Date(selectedDayData.date).toLocaleDateString(undefined, { weekday: 'short' }) : 'Day'}</div>
                            </div>
                            <div style={{ borderLeft: '1px solid var(--border-color)', paddingLeft: '0.75rem' }}>
                                <div style={{ fontWeight: 'bold', fontSize: '1rem' }}>General(GEN)</div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Shift : 09:00 to 18:00</div>
                            </div>
                            <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                                <div style={{ fontWeight: 'bold', fontSize: '1rem' }}>General</div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Attendance Scheme</div>
                            </div>
                        </div>

                        <div style={{ padding: '0.75rem', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', textAlign: 'center', borderBottom: '1px solid var(--border-color)' }}>
                            <div><div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>First In</div><div style={{ fontSize: '0.85rem' }}>{selectedDayData?.record?.first_in || '-'}</div></div>
                            <div><div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Last Out</div><div style={{ fontSize: '0.85rem' }}>{selectedDayData?.record?.last_out || '-'}</div></div>
                            <div><div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Late In</div><div style={{ fontSize: '0.85rem' }}>-</div></div>
                            <div><div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Early Out</div><div style={{ fontSize: '0.85rem' }}>-</div></div>
                        </div>

                        <div style={{ padding: '0.75rem', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', textAlign: 'center' }}>
                            <div><div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Total Work Hrs</div><div style={{ fontSize: '0.85rem' }}>{selectedDayData?.record?.total_work_hrs || '-'}</div></div>
                            <div><div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Break Hrs</div><div style={{ fontSize: '0.85rem' }}>-</div></div>
                            <div><div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Actual Work Hrs</div><div style={{ fontSize: '0.85rem' }}>{selectedDayData?.record?.actual_work_hrs || '-'}</div></div>
                        </div>
                    </div>

                    <div className="card shadow-sm" style={{ background: '#ffffff', border: '1px solid var(--border-color)', padding: '0.75rem' }}>
                        <h3 className="card-title" style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>Status Details</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.25rem', marginBottom: '0.25rem' }}>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Status</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Remarks</div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
                            <div style={{ fontSize: '0.85rem' }}>{selectedDayData?.statusText || '-'}</div>
                            <div style={{ fontSize: '0.85rem', color: selectedDayData?.record?.deduction ? '#EF4444' : 'inherit' }}>
                                {selectedDayData?.record?.deduction ? `Penalty (₹${selectedDayData.record.deduction})` : '-'}
                            </div>
                        </div>
                    </div>

                    <div className="card shadow-sm" style={{ background: '#ffffff', border: '1px solid var(--border-color)', padding: '0.75rem' }}>
                        <h3 className="card-title" style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>Session Details</h3>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                            <thead style={{ background: '#f8fafc', textAlign: 'left' }}>
                                <tr>
                                    <th style={{ padding: '0.5rem', borderBottom: '1px solid var(--border-color)' }}>Session</th>
                                    <th style={{ padding: '0.5rem', borderBottom: '1px solid var(--border-color)' }}>Timing</th>
                                    <th style={{ padding: '0.5rem', borderBottom: '1px solid var(--border-color)' }}>In</th>
                                    <th style={{ padding: '0.5rem', borderBottom: '1px solid var(--border-color)' }}>Out</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td style={{ padding: '0.5rem', borderBottom: '1px solid var(--border-color)' }}>Day Session</td>
                                    <td style={{ padding: '0.5rem', borderBottom: '1px solid var(--border-color)' }}>09-18</td>
                                    <td style={{ padding: '0.5rem', borderBottom: '1px solid var(--border-color)' }}>{selectedDayData?.record?.first_in || '-'}</td>
                                    <td style={{ padding: '0.5rem', borderBottom: '1px solid var(--border-color)' }}>{selectedDayData?.record?.last_out || '-'}</td>
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
