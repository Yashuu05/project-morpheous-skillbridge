import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar.jsx';
import {
    TrendingUp, ClipboardList, Code2, Loader2
} from 'lucide-react';

// ─── Inline ProgressBar ───────────────────────────────────────────────────────
const COLORS = {
    blue: { bar: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
    purple: { bar: '#a855f7', bg: 'rgba(168,85,247,0.12)' },
    amber: { bar: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
    green: { bar: '#237227', bg: 'rgba(35,114,39,0.12)' },
};

function ProgressBar({ label, value, color = 'blue' }) {
    const c = COLORS[color] || COLORS.blue;
    return (
        <div style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 13, color: 'rgba(240,255,223,0.75)' }}>{label}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: c.bar }}>{value}%</span>
            </div>
            <div style={{ height: 6, borderRadius: 99, background: c.bg, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${value}%`, background: c.bar, borderRadius: 99, transition: 'width 0.6s ease' }} />
            </div>
        </div>
    );
}

// ─── Static demo data ─────────────────────────────────────────────────────────
const PROGRESS = [
    { label: 'Technical Skills', value: 74, color: 'blue' },
    { label: 'Soft Skills', value: 60, color: 'purple' },
    { label: 'Career Readiness', value: 52, color: 'amber' },
    { label: 'Certifications', value: 33, color: 'green' },
];

const ASSESSMENTS = [
    { name: 'Data Structures & Algorithms', date: 'Feb 24, 2026', score: '88%', status: 'pass' },
    { name: 'Machine Learning Fundamentals', date: 'Feb 20, 2026', score: '74%', status: 'pass' },
    { name: 'System Design', date: 'Feb 15, 2026', score: '61%', status: 'fail' },
    { name: 'Behavioral Assessment', date: 'Feb 10, 2026', score: '–', status: 'pending' },
];

const STATUS_COLOR = { pass: '#4ade80', fail: '#f87171', pending: '#fbbf24' };

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function Dashboard() {
    const { user, loading, isAuthenticated } = useAuth();
    const [collapsed, setCollapsed] = useState(false);

    // Show spinner while Firebase auth resolves
    if (loading) {
        return (
            <div style={{ minHeight: '100vh', background: '#2B2A2A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Loader2 size={36} color="#237227" className="animate-spin" />
            </div>
        );
    }

    // Redirect unauthenticated users to login
    if (!isAuthenticated) return <Navigate to="/login" replace />;

    const sidebarWidth = collapsed ? 64 : 220;
    const initials = user?.username?.slice(0, 2).toUpperCase() ?? '??';
    const displayName = user?.fullName || user?.username || 'there';

    // Friendly greeting
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    const dateStr = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });

    // Skills from user profile or demo fallback
    const skills = user?.skills?.length > 0 ? user.skills : ['Python', 'React', 'SQL', 'Machine Learning', 'Node.js', 'Docker'];
    const interests = user?.interests?.length > 0 ? user.interests : ['AI Engineer', 'Data Scientist', 'Full-Stack Dev'];

    const s = {
        page: { minHeight: '100vh', background: '#2B2A2A', fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif", display: 'flex' },
        main: { marginLeft: sidebarWidth, flex: 1, padding: '32px 28px', transition: 'margin-left 0.25s ease', minHeight: '100vh' },
        card: { background: '#1F1F1F', border: '1px solid rgba(35,114,39,0.2)', borderRadius: 16, padding: 24 },
        grid3: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px,1fr))', gap: 16, marginBottom: 20 },
        grid2: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px,1fr))', gap: 16, marginBottom: 20 },
        label: { fontSize: 12, color: 'rgba(240,255,223,0.45)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 },
        val: { fontSize: 32, fontWeight: 800, color: '#F0FFDF', lineHeight: 1.1 },
        delta: { fontSize: 12, color: '#4ade80', marginTop: 4 },
        h4: { fontSize: 15, fontWeight: 700, color: '#F0FFDF', marginBottom: 16, marginTop: 0 },
    };

    return (
        <div style={s.page}>
            <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />

            <main style={s.main}>
                {/* Header */}
                <div style={{ marginBottom: 28 }}>
                    <p style={{ fontSize: 13, color: 'rgba(240,255,223,0.45)', marginBottom: 4 }}>{dateStr}</p>
                    <h1 style={{ fontSize: 26, fontWeight: 800, color: '#F0FFDF', margin: 0 }}>{greeting}, {displayName} 👋</h1>
                    <p style={{ fontSize: 14, color: 'rgba(240,255,223,0.5)', marginTop: 4 }}>Here's an overview of your career progress</p>
                </div>

                {/* Stats row */}
                <div style={s.grid3}>
                    {[
                        { label: 'Overall Readiness', val: '74%', delta: '↑ +6% this month' },
                        { label: 'Assessments Taken', val: '12', delta: '↑ +3 this week' },
                        { label: 'Skills Identified', val: skills.length, delta: `${skills.length} skills on profile` },
                    ].map(({ label, val, delta }) => (
                        <div key={label} style={s.card}>
                            <div style={s.label}>{label}</div>
                            <div style={s.val}>{val}</div>
                            <div style={s.delta}>{delta}</div>
                        </div>
                    ))}
                </div>

                {/* Profile summary + Interests */}
                <div style={s.grid2}>
                    {/* Profile */}
                    <div style={s.card}>
                        <h4 style={s.h4}>Profile Summary</h4>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                            <div style={{ width: 48, height: 48, background: '#237227', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, color: '#F0FFDF', flexShrink: 0 }}>{initials}</div>
                            <div>
                                <div style={{ fontWeight: 700, fontSize: 16, color: '#F0FFDF' }}>{user?.fullName || user?.username || 'Your Name'}</div>
                                <div style={{ fontSize: 13, color: 'rgba(240,255,223,0.55)', marginTop: 2 }}>{user?.degree || 'Aspiring Professional'}</div>
                                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                                    {user?.educationalLevel && <span style={{ fontSize: 11, padding: '2px 8px', background: 'rgba(35,114,39,0.2)', borderRadius: 99, color: '#4ade80', border: '1px solid rgba(35,114,39,0.3)' }}>{user.educationalLevel}</span>}
                                    {user?.skillLevel && <span style={{ fontSize: 11, padding: '2px 8px', background: 'rgba(168,85,247,0.15)', borderRadius: 99, color: '#c084fc', border: '1px solid rgba(168,85,247,0.25)' }}>{user.skillLevel}</span>}
                                    {user?.currentYear && <span style={{ fontSize: 11, padding: '2px 8px', background: 'rgba(59,130,246,0.12)', borderRadius: 99, color: '#60a5fa', border: '1px solid rgba(59,130,246,0.2)' }}>Year {user.currentYear}</span>}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Interests */}
                    <div style={s.card}>
                        <h4 style={s.h4}>Interests</h4>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            {interests.map((i) => (
                                <span key={i} style={{ fontSize: 12, padding: '5px 12px', background: 'rgba(35,114,39,0.15)', border: '1px solid rgba(35,114,39,0.3)', borderRadius: 99, color: '#86efac' }}>{i}</span>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Skills + Progress */}
                <div style={s.grid2}>
                    {/* Skills */}
                    <div style={s.card}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <h4 style={{ ...s.h4, marginBottom: 0 }}>Skills</h4>
                            <Code2 size={16} color="rgba(240,255,223,0.3)" />
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                            {skills.map((sk) => (
                                <span key={sk} style={{ fontSize: 12, padding: '4px 10px', background: 'rgba(240,255,223,0.06)', border: '1px solid rgba(240,255,223,0.12)', borderRadius: 8, color: 'rgba(240,255,223,0.75)' }}>{sk}</span>
                            ))}
                        </div>
                    </div>

                    {/* Progress */}
                    <div style={s.card}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <h4 style={{ ...s.h4, marginBottom: 0 }}>Progress Overview</h4>
                            <TrendingUp size={16} color="rgba(240,255,223,0.3)" />
                        </div>
                        {PROGRESS.map((p) => <ProgressBar key={p.label} {...p} />)}
                    </div>
                </div>

                {/* Recent Assessments */}
                <div style={s.card}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <h4 style={{ ...s.h4, marginBottom: 0 }}>Recent Assessments</h4>
                        <ClipboardList size={16} color="rgba(240,255,223,0.3)" />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {ASSESSMENTS.map((a) => (
                            <div key={a.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid rgba(240,255,223,0.06)' }}>
                                <div>
                                    <div style={{ fontSize: 14, fontWeight: 600, color: '#F0FFDF' }}>{a.name}</div>
                                    <div style={{ fontSize: 12, color: 'rgba(240,255,223,0.4)', marginTop: 2 }}>{a.date}</div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <span style={{ fontWeight: 700, fontSize: 14, color: STATUS_COLOR[a.status] }}>{a.score}</span>
                                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: STATUS_COLOR[a.status], display: 'inline-block' }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </main>
        </div>
    );
}