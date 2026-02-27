import React, { useState, useRef } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar.jsx';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import {
    TrendingUp, ClipboardList, Code2, Loader2,
    FileText, UploadCloud, CheckCircle2, AlertCircle,
    Briefcase, FolderOpen, X, RefreshCw
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
const TABS = ['Overview', 'Resume Info'];


// ─── Resume Info Tab Component ─────────────────────────────────────────────────
function ResumeInfoTab({ uid, userName }) {
    const fileInputRef = useRef(null);
    const [dragging, setDragging] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [resumeData, setResumeData] = useState(null);
    const [error, setError] = useState('');
    const [fileName, setFileName] = useState('');

    const ALLOWED_EXT = '.pdf';
    const BLOCKED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'video/mp4', 'image/gif', 'image/webp'];

    const validateFile = (file) => {
        if (!file) return 'No file selected.';
        const ext = file.name.split('.').pop().toLowerCase();
        if (ext !== 'pdf' || BLOCKED_TYPES.includes(file.type)) {
            return `❌ "${file.name}" is not a PDF. Only PDF resumes are accepted. (Received: .${ext})`;
        }
        if (file.size > 10 * 1024 * 1024) return 'File too large. Maximum size is 10 MB.';
        return null;
    };

    const uploadFile = async (file) => {
        const validationError = validateFile(file);
        if (validationError) { setError(validationError); return; }

        setError('');
        setUploading(true);
        setFileName(file.name);

        const formData = new FormData();
        formData.append('resume', file);

        try {
            // 1️⃣ Call Flask backend to parse the PDF (proxied via Vite → no CORS)
            const res = await fetch('/api/resume/parse', {
                method: 'POST',
                body: formData,
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || `Upload failed (HTTP ${res.status})`);
                setUploading(false);
                return;
            }

            // 2️⃣ Save parsed data to Firestore `resumes` collection using Firebase client SDK
            if (uid) {
                try {
                    await setDoc(doc(db, 'resumes', uid), {
                        uid,
                        fullName: userName || '',
                        skills: data.skills || [],
                        experience: data.experience || [],
                        projects: data.projects || [],
                        metadata: data.metadata || {},
                        parsedAt: serverTimestamp(),
                    }, { merge: true });
                } catch (fsErr) {
                    console.warn('[ResumeTab] Firestore save failed:', fsErr);
                }
            }

            setResumeData(data);
        } catch (err) {
            setError(`Network error: ${err.message}. Make sure the backend is running on port 5000.`);
        } finally {
            setUploading(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) uploadFile(file);
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) uploadFile(file);
        e.target.value = '';  // reset so same file can be re-selected
    };

    const card = { background: '#1F1F1F', border: '1px solid rgba(35,114,39,0.2)', borderRadius: 16, padding: 24, marginBottom: 20 };
    const tag = (color) => ({ fontSize: 12, padding: '4px 10px', borderRadius: 99, border: `1px solid ${color}33`, background: `${color}15`, color });

    return (
        <div>
            {/* Upload zone */}
            <div style={card}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                    <UploadCloud size={18} color="#237227" />
                    <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#F0FFDF' }}>Upload Resume (PDF Only)</h4>
                </div>

                {/* Drag-and-drop zone */}
                <div
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={handleDrop}
                    style={{
                        border: `2px dashed ${dragging ? '#237227' : 'rgba(35,114,39,0.4)'}`,
                        borderRadius: 12,
                        padding: '40px 24px',
                        textAlign: 'center',
                        cursor: 'pointer',
                        background: dragging ? 'rgba(35,114,39,0.07)' : 'rgba(35,114,39,0.03)',
                        transition: 'all 0.2s',
                    }}
                >
                    {uploading ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                            <Loader2 size={32} color="#237227" style={{ animation: 'spin 1s linear infinite' }} />
                            <span style={{ color: '#4ade80', fontSize: 14 }}>Parsing "{fileName}"…</span>
                            <span style={{ color: 'rgba(240,255,223,0.4)', fontSize: 12 }}>This may take a few seconds</span>
                        </div>
                    ) : (
                        <>
                            <FileText size={36} color="rgba(35,114,39,0.6)" style={{ marginBottom: 10 }} />
                            <p style={{ color: '#F0FFDF', fontWeight: 600, margin: '0 0 4px' }}>
                                Drag & drop your PDF resume here
                            </p>
                            <p style={{ color: 'rgba(240,255,223,0.45)', fontSize: 13, margin: 0 }}>
                                or <span style={{ color: '#4ade80', textDecoration: 'underline' }}>click to browse</span>
                            </p>
                            <p style={{ color: 'rgba(240,255,223,0.25)', fontSize: 11, marginTop: 8 }}>
                                PDF only · Max 10 MB · .png / .jpg / .mp4 not accepted
                            </p>
                        </>
                    )}
                </div>

                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                />

                {/* Error message */}
                {error && (
                    <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 8, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                        <AlertCircle size={16} color="#f87171" style={{ flexShrink: 0, marginTop: 1 }} />
                        <span style={{ color: '#f87171', fontSize: 13 }}>{error}</span>
                        <button onClick={() => setError('')} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(240,255,223,0.4)', padding: 0 }}><X size={14} /></button>
                    </div>
                )}

                {/* Re-upload button if data already loaded */}
                {resumeData && !uploading && (
                    <button
                        onClick={() => { setResumeData(null); setError(''); fileInputRef.current?.click(); }}
                        style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: '1px solid rgba(35,114,39,0.3)', borderRadius: 8, padding: '7px 14px', color: '#4ade80', fontSize: 13, cursor: 'pointer' }}>
                        <RefreshCw size={13} /> Upload a different resume
                    </button>
                )}
            </div>

            {/* Extracted data display */}
            {resumeData && (
                <>
                    {/* Success banner */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderRadius: 10, background: 'rgba(35,114,39,0.12)', border: '1px solid rgba(35,114,39,0.3)', marginBottom: 20 }}>
                        <CheckCircle2 size={16} color="#4ade80" />
                        <span style={{ color: '#4ade80', fontSize: 13, fontWeight: 600 }}>
                            Resume parsed & saved to database ✓
                        </span>
                        <span style={{ color: 'rgba(240,255,223,0.4)', fontSize: 12, marginLeft: 4 }}>
                            — {resumeData.metadata?.file_name || 'resume.pdf'} ({resumeData.metadata?.page_count || '?'} pages)
                        </span>
                    </div>

                    {/* Skills */}
                    <div style={card}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                            <Code2 size={16} color="#237227" />
                            <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#F0FFDF' }}>
                                Skills Extracted <span style={{ fontWeight: 400, color: 'rgba(240,255,223,0.4)', fontSize: 13 }}>({resumeData.skills?.length || 0} found)</span>
                            </h4>
                        </div>
                        {resumeData.skills?.length > 0 ? (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                {resumeData.skills.map((sk, i) => (
                                    <span key={i} style={tag('#4ade80')}>{sk}</span>
                                ))}
                            </div>
                        ) : (
                            <p style={{ color: 'rgba(240,255,223,0.35)', fontSize: 13, margin: 0 }}>No skills section detected in this resume.</p>
                        )}
                    </div>

                    {/* Experience */}
                    <div style={card}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                            <Briefcase size={16} color="#a855f7" />
                            <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#F0FFDF' }}>
                                Experience <span style={{ fontWeight: 400, color: 'rgba(240,255,223,0.4)', fontSize: 13 }}>({resumeData.experience?.length || 0} entries)</span>
                            </h4>
                        </div>
                        {resumeData.experience?.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                {resumeData.experience.map((exp, i) => (
                                    <div key={i} style={{ padding: '14px 16px', background: 'rgba(168,85,247,0.07)', borderRadius: 10, border: '1px solid rgba(168,85,247,0.15)' }}>
                                        <div style={{ fontWeight: 700, fontSize: 14, color: '#F0FFDF' }}>{exp.title}</div>
                                        {exp.company && <div style={{ fontSize: 12, color: '#c084fc', marginTop: 2 }}>{exp.company}</div>}
                                        {exp.duration && <div style={{ fontSize: 11, color: 'rgba(240,255,223,0.35)', marginTop: 2 }}>{exp.duration}</div>}
                                        {exp.description && <div style={{ fontSize: 12, color: 'rgba(240,255,223,0.6)', marginTop: 8, lineHeight: 1.6 }}>{exp.description}</div>}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p style={{ color: 'rgba(240,255,223,0.35)', fontSize: 13, margin: 0 }}>No experience section detected in this resume.</p>
                        )}
                    </div>

                    {/* Projects */}
                    <div style={card}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                            <FolderOpen size={16} color="#f59e0b" />
                            <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#F0FFDF' }}>
                                Projects <span style={{ fontWeight: 400, color: 'rgba(240,255,223,0.4)', fontSize: 13 }}>({resumeData.projects?.length || 0} found)</span>
                            </h4>
                        </div>
                        {resumeData.projects?.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                {resumeData.projects.map((proj, i) => (
                                    <div key={i} style={{ padding: '14px 16px', background: 'rgba(245,158,11,0.07)', borderRadius: 10, border: '1px solid rgba(245,158,11,0.15)' }}>
                                        <div style={{ fontWeight: 700, fontSize: 14, color: '#F0FFDF' }}>{proj.name}</div>
                                        {proj.technologies?.length > 0 && (
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                                                {proj.technologies.map((t, ti) => (
                                                    <span key={ti} style={tag('#fbbf24')}>{t}</span>
                                                ))}
                                            </div>
                                        )}
                                        {proj.description && <div style={{ fontSize: 12, color: 'rgba(240,255,223,0.6)', marginTop: 8, lineHeight: 1.6 }}>{proj.description}</div>}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p style={{ color: 'rgba(240,255,223,0.35)', fontSize: 13, margin: 0 }}>No projects section detected in this resume.</p>
                        )}
                    </div>

                    {/* Raw JSON toggle */}
                    <details style={{ ...card, cursor: 'pointer' }}>
                        <summary style={{ fontSize: 13, color: 'rgba(240,255,223,0.5)', userSelect: 'none', listStyle: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <FileText size={13} /> View raw JSON output
                        </summary>
                        <pre style={{ marginTop: 14, fontSize: 11, color: '#86efac', overflowX: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all', lineHeight: 1.6 }}>
                            {JSON.stringify(resumeData, null, 2)}
                        </pre>
                    </details>
                </>
            )}

            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}


// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function Dashboard() {
    const { user, loading, isAuthenticated } = useAuth();
    const [collapsed, setCollapsed] = useState(false);
    const [activeTab, setActiveTab] = useState('Overview');

    if (loading) {
        return (
            <div style={{ minHeight: '100vh', background: '#2B2A2A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Loader2 size={36} color="#237227" className="animate-spin" />
            </div>
        );
    }

    if (!isAuthenticated) return <Navigate to="/login" replace />;

    const sidebarWidth = collapsed ? 64 : 220;
    const initials = user?.username?.slice(0, 2).toUpperCase() ?? '??';
    const displayName = user?.fullName || user?.username || 'there';
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    const dateStr = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
    const skills = user?.skills?.length > 0 ? user.skills : ['Python', 'React', 'SQL', 'Machine Learning', 'Node.js', 'Docker'];
    const interests = user?.interests?.length > 0 ? user.interests : ['AI Engineer', 'Data Scientist', 'Full-Stack Dev'];

    const s = {
        page: { minHeight: '100vh', background: '#2B2A2A', fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif", display: 'flex' },
        main: { marginLeft: sidebarWidth, flex: 1, padding: '32px 28px', transition: 'margin-left 0.25s ease', minHeight: '100vh' },
        card: { background: '#1F1F1F', border: '1px solid rgba(35,114,39,0.2)', borderRadius: 16, padding: 24, marginBottom: 20 },
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
                {/* Page header */}
                <div style={{ marginBottom: 24 }}>
                    <p style={{ fontSize: 13, color: 'rgba(240,255,223,0.45)', marginBottom: 4 }}>{dateStr}</p>
                    <h1 style={{ fontSize: 26, fontWeight: 800, color: '#F0FFDF', margin: 0 }}>{greeting}, {displayName} 👋</h1>
                    <p style={{ fontSize: 14, color: 'rgba(240,255,223,0.5)', marginTop: 4 }}>Here's an overview of your career progress</p>
                </div>

                {/* Tab bar */}
                <div style={{ display: 'flex', gap: 4, marginBottom: 28, borderBottom: '1px solid rgba(35,114,39,0.15)', paddingBottom: 0 }}>
                    {TABS.map((tab) => (
                        <button key={tab} onClick={() => setActiveTab(tab)} style={{
                            padding: '9px 20px', fontSize: 14, fontWeight: activeTab === tab ? 700 : 400,
                            color: activeTab === tab ? '#4ade80' : 'rgba(240,255,223,0.5)',
                            background: 'none', border: 'none', cursor: 'pointer',
                            borderBottom: activeTab === tab ? '2px solid #237227' : '2px solid transparent',
                            marginBottom: -1, transition: 'all 0.15s',
                        }}>
                            {tab === 'Resume Info' && <FileText size={13} style={{ marginRight: 6, verticalAlign: 'middle' }} />}
                            {tab}
                        </button>
                    ))}
                </div>

                {/* ── Overview tab ── */}
                {activeTab === 'Overview' && (
                    <>
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

                        {/* Profile + Interests */}
                        <div style={s.grid2}>
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
                    </>
                )}

                {/* ── Resume Info tab ── */}
                {activeTab === 'Resume Info' && (
                    <ResumeInfoTab uid={user?.uid} userName={user?.fullName || user?.username || ''} />
                )}
            </main>
        </div>
    );
}