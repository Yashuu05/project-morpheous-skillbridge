import React, { useState, useRef, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar.jsx';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { signOut } from 'firebase/auth';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import {
    TrendingUp, ClipboardList, Code2, Loader2,
    FileText, UploadCloud, CheckCircle2, AlertCircle,
    Briefcase, FolderOpen, X, RefreshCw, Camera, VideoOff, Github
} from 'lucide-react';
import CareerMatchTab from './CareerMatchTab.jsx';
import RoadmapTab from './RoadmapTab.jsx';

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
const TABS = ['Overview', 'Resume Info', 'GitHub Research', 'Assessment', 'Skill Gap', 'SWOT Analysis', 'Career Match', 'Roadmap'];

const STATUS_STYLE = {
    met: { bg: 'rgba(74,222,128,0.12)', border: 'rgba(74,222,128,0.3)', text: '#4ade80', label: '\u2713 Met' },
    minor: { bg: 'rgba(96,165,250,0.12)', border: 'rgba(96,165,250,0.3)', text: '#60a5fa', label: '\u25b2 Minor' },
    moderate: { bg: 'rgba(251,191,36,0.12)', border: 'rgba(251,191,36,0.3)', text: '#fbbf24', label: '\u26a0 Moderate' },
    critical: { bg: 'rgba(248,113,113,0.12)', border: 'rgba(248,113,113,0.3)', text: '#f87171', label: '\u2717 Critical' },
};

// ─── Skill Gap Tab ────────────────────────────────────────────────────────────
function SkillGapTab({ user }) {
    const [state, setState] = useState('idle');
    const [gapData, setGapData] = useState(null);
    const [errMsg, setErrMsg] = useState('');
    const [saved, setSaved] = useState(false);

    const uid = user?.uid;
    const domain = detectDomain(user?.interests);

    const runAnalysis = async () => {
        setState('loading'); setErrMsg('');
        // 1. Read user test_scores from Firestore
        let scores = {};
        try {
            const snap = await getDoc(doc(db, 'test_scores', uid));
            if (snap.exists()) scores = snap.data().scores || {};
        } catch (e) { console.warn('Firestore read', e); }

        // 2. Call backend
        try {
            const res = await fetch('/api/skill-gap/calculate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ domain, scores }),
            });
            const data = await res.json();
            if (!res.ok) { setErrMsg(data.error || 'Calculation failed.'); setState('error'); return; }
            setGapData(data);
            setState('done');
            // 3. Save to Firestore skill_gaps
            if (uid) {
                try {
                    await setDoc(doc(db, 'skill_gaps', uid), {
                        uid, domain, role: data.role,
                        skill_results: data.skill_results,
                        totals: data.totals,
                        calculatedAt: serverTimestamp(),
                    }, { merge: true });
                    setSaved(true);
                } catch (e) { console.warn('Firestore save', e); }
            }
        } catch (e) { setErrMsg(`Network error: ${e.message}`); setState('error'); }
    };

    if (state === 'idle' || state === 'error') return (
        <div style={{ maxWidth: 620, margin: '0 auto', padding: 24 }}>
            {errMsg && <div style={{ background: 'rgba(248,113,113,0.12)', border: '1px solid #f87171', borderRadius: 10, padding: '12px 16px', marginBottom: 16, color: '#f87171', fontSize: 14 }}>{errMsg}</div>}
            <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 32, textAlign: 'center' }}>
                <TrendingUp size={48} color='#6366f1' style={{ marginBottom: 16 }} />
                <h2 style={{ color: '#f0ffdf', fontSize: 22, marginBottom: 8 }}>Skill Gap Analysis</h2>
                <p style={{ color: 'rgba(240,255,223,0.55)', fontSize: 14, marginBottom: 8 }}>
                    Domain: <strong style={{ color: '#a5b4fc' }}>{domain}</strong>
                </p>
                <p style={{ color: 'rgba(240,255,223,0.4)', fontSize: 13, marginBottom: 28 }}>
                    Compares your assessment scores against industry benchmarks.<br />Take the Assessment tab first for accurate results.
                </p>
                <button onClick={runAnalysis} style={{ background: 'linear-gradient(135deg,#6366f1,#4f46e5)', color: '#fff', border: 'none', borderRadius: 10, padding: '12px 32px', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
                    Analyse My Skill Gap
                </button>
            </div>
        </div>
    );

    if (state === 'loading') return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 320, gap: 16 }}>
            <Loader2 size={40} color='#6366f1' style={{ animation: 'spin 1s linear infinite' }} />
            <p style={{ color: 'rgba(240,255,223,0.7)' }}>Calculating your skill gap…</p>
        </div>
    );

    // ── RESULTS ───────────────────────────────────────────────────────────────
    const { role, steps, totals, formula_legend } = gapData;
    const { readiness, total_gap, sum_weighted_gaps, sum_weights } = totals;
    const readPct = Math.round(readiness);
    const gradeColor = readPct >= 70 ? '#4ade80' : readPct >= 45 ? '#fbbf24' : '#f87171';
    const gradeLabel = readPct >= 70 ? 'Industry Ready' : readPct >= 45 ? 'Developing' : 'Skill Gap Found';

    const chartData = steps.map(s => ({
        skill: s.step.replace('Skill: ', ''),
        'Industry Benchmark': Math.round(s.required * 100),
        'Your Score': Math.round(s.user_score * 100),
    }));

    const SGTooltip = ({ active, payload, label }) => {
        if (!active || !payload?.length) return null;
        return (
            <div style={{ background: '#1F1F1F', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '10px 14px' }}>
                <p style={{ color: 'rgba(240,255,223,0.7)', fontSize: 12, marginBottom: 6 }}>{label}</p>
                {payload.map(p => <p key={p.name} style={{ color: p.fill, fontSize: 13, fontWeight: 700, margin: 0 }}>{p.name}: {p.value}%</p>)}
            </div>
        );
    };

    return (
        <div style={{ maxWidth: 820, margin: '0 auto', padding: '24px 16px' }}>

            {/* Readiness header */}
            <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
                <div style={{ flex: '0 0 180px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 24, textAlign: 'center' }}>
                    <div style={{ fontSize: 52, fontWeight: 800, color: gradeColor, lineHeight: 1 }}>{readPct}%</div>
                    <div style={{ color: gradeColor, fontWeight: 600, fontSize: 15, margin: '6px 0 4px' }}>{gradeLabel}</div>
                    <div style={{ color: 'rgba(240,255,223,0.4)', fontSize: 11 }}>Career Readiness</div>
                    {saved && <div style={{ color: '#4ade80', fontSize: 11, marginTop: 8 }}>✓ Saved to profile</div>}
                </div>
                <div style={{ flex: 1, minWidth: 260, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 24 }}>
                    <h4 style={{ color: '#f0ffdf', fontSize: 13, fontWeight: 700, marginBottom: 10 }}>📐 Formula Applied</h4>
                    {Object.values(formula_legend).map((v, i) => (
                        <div key={i} style={{ fontFamily: 'monospace', fontSize: 13, color: 'rgba(240,255,223,0.9)', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>{v}</div>
                    ))}
                    <div style={{ marginTop: 8, fontSize: 12, color: 'rgba(240,255,223,0.4)' }}>
                        Matched role: <strong style={{ color: '#a5b4fc', textTransform: 'capitalize' }}>{role}</strong>
                    </div>
                </div>
            </div>

            {/* Grouped Bar Chart */}
            <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 24, marginBottom: 20 }}>
                <h4 style={{ color: '#f0ffdf', fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Industry Benchmark vs. Your Score</h4>
                <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={chartData} margin={{ top: 4, right: 8, left: -10, bottom: 60 }} barCategoryGap="28%">
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(240,255,223,0.07)" vertical={false} />
                        <XAxis dataKey="skill" tick={{ fill: 'rgba(240,255,223,0.55)', fontSize: 10 }} angle={-40} textAnchor="end" interval={0} axisLine={{ stroke: 'rgba(240,255,223,0.1)' }} tickLine={false} />
                        <YAxis domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fill: 'rgba(240,255,223,0.45)', fontSize: 11 }} axisLine={false} tickLine={false} />
                        <Tooltip content={<SGTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                        <Bar dataKey="Industry Benchmark" fill="#6366f1" radius={[5, 5, 0, 0]} maxBarSize={30} />
                        <Bar dataKey="Your Score" fill="#4ade80" radius={[5, 5, 0, 0]} maxBarSize={30} />
                    </BarChart>
                </ResponsiveContainer>
                <div style={{ display: 'flex', gap: 20, justifyContent: 'center', marginTop: 4, fontSize: 12, color: 'rgba(240,255,223,0.6)' }}>
                    <span><span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: 3, background: '#6366f1', marginRight: 6, verticalAlign: 'middle' }} />Industry Benchmark</span>
                    <span><span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: 3, background: '#4ade80', marginRight: 6, verticalAlign: 'middle' }} />Your Score</span>
                </div>
            </div>

            {/* Step-by-step table */}
            <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 24, marginBottom: 20 }}>
                <h4 style={{ color: '#f0ffdf', fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Step-by-Step Calculation</h4>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                        <thead>
                            <tr>{['Skill', 'Benchmark (B)', 'Your Score (S)', 'gap = max(0, B−S)', 'Weighted Gap = gap×B', 'Status'].map(h => (
                                <th key={h} style={{ textAlign: 'left', padding: '8px 10px', color: 'rgba(240,255,223,0.45)', fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.08)', whiteSpace: 'nowrap' }}>{h}</th>
                            ))}</tr>
                        </thead>
                        <tbody>
                            {steps.map((s, i) => {
                                const st = STATUS_STYLE[s.status];
                                return (
                                    <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                        <td style={{ padding: '9px 10px', color: 'rgba(240,255,223,0.85)', fontWeight: 600, textTransform: 'capitalize' }}>{s.step.replace('Skill: ', '')}</td>
                                        <td style={{ padding: '9px 10px', color: '#a5b4fc', fontFamily: 'monospace' }}>{Math.round(s.required * 100)}%</td>
                                        <td style={{ padding: '9px 10px', color: '#60a5fa', fontFamily: 'monospace' }}>{Math.round(s.user_score * 100)}%</td>
                                        <td style={{ padding: '9px 10px', color: 'rgba(240,255,223,0.9)', fontFamily: 'monospace', fontSize: 13 }}>{s.formula}</td>
                                        <td style={{ padding: '9px 10px', color: s.gap > 0 ? '#f87171' : '#4ade80', fontFamily: 'monospace', fontWeight: 700 }}>{s.weighted_gap}</td>
                                        <td style={{ padding: '9px 10px' }}>
                                            <span style={{ background: st.bg, border: `1px solid ${st.border}`, color: st.text, padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 600 }}>{st.label}</span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                        <tfoot>
                            <tr style={{ background: 'rgba(255,255,255,0.03)', borderTop: '2px solid rgba(255,255,255,0.1)' }}>
                                <td colSpan={4} style={{ padding: '10px', color: 'rgba(240,255,223,0.7)', fontWeight: 700 }}>Σ Totals</td>
                                <td style={{ padding: '10px', color: '#fbbf24', fontFamily: 'monospace', fontWeight: 800 }}>{sum_weighted_gaps}</td>
                                <td style={{ padding: '10px', color: 'rgba(240,255,223,0.5)', fontSize: 13, fontFamily: 'monospace' }}>Σ weights = {sum_weights}</td>
                            </tr>
                            <tr style={{ background: 'rgba(99,102,241,0.08)' }}>
                                <td colSpan={6} style={{ padding: '10px', fontFamily: 'monospace', fontSize: 14, color: '#FFFFFF' }}>
                                    total_gap = {sum_weighted_gaps} / {sum_weights} = <strong style={{ color: '#fbbf24' }}>{total_gap}</strong>
                                    &nbsp;&nbsp;│&nbsp;&nbsp;
                                    readiness = (1 − {total_gap}) × 100 = <strong style={{ color: gradeColor }}>{readiness}%</strong>
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>

            {/* Re-run */}
            <button onClick={() => { setState('idle'); setGapData(null); setSaved(false); }}
                style={{ width: '100%', padding: '12px 0', borderRadius: 10, border: '1px solid rgba(99,102,241,0.3)', background: 'transparent', color: '#a5b4fc', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                ↺  Re-run Analysis
            </button>
        </div>
    );
}

// ─── Score Bar Chart (reads from Firestore test_scores) ──────────────────────
function ScoreBarChart({ uid, s }) {
    const [chartData, setChartData] = useState(null); // null=loading, []=no data
    const [domain, setDomain] = useState('');
    const [totalScore, setTotalScore] = useState(null);

    React.useEffect(() => {
        if (!uid) { setChartData([]); return; }
        getDoc(doc(db, 'test_scores', uid)).then(snap => {
            if (!snap.exists()) { setChartData([]); return; }
            const data = snap.data();
            setDomain(data.domain || '');
            setTotalScore(data.total_score ?? null);
            const rows = Object.entries(data.scores || {}).map(([skill, score]) => ({
                skill: skill.charAt(0).toUpperCase() + skill.slice(1),
                score: Math.round(score * 100),
            }));
            setChartData(rows);
        }).catch(() => setChartData([]));
    }, [uid]);

    const CustomTooltip = ({ active, payload, label }) => {
        if (!active || !payload?.length) return null;
        return (
            <div style={{ background: '#1F1F1F', border: '1px solid rgba(59,130,246,0.35)', borderRadius: 8, padding: '8px 14px' }}>
                <p style={{ color: 'rgba(240,255,223,0.7)', fontSize: 12, marginBottom: 3 }}>{label}</p>
                <p style={{ color: '#3b82f6', fontSize: 16, fontWeight: 700, margin: 0 }}>{payload[0].value}%</p>
            </div>
        );
    };

    return (
        <div style={s.card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                    <h4 style={{ ...s.h4, marginBottom: 4 }}>Assessment Score by Skill</h4>
                    {domain && <span style={{ fontSize: 12, color: 'rgba(240,255,223,0.4)', textTransform: 'capitalize' }}>Domain: {domain}</span>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {totalScore !== null && (
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#3b82f6', background: 'rgba(59,130,246,0.12)', padding: '4px 12px', borderRadius: 99, border: '1px solid rgba(59,130,246,0.25)' }}>
                            Avg {Math.round(totalScore * 100)}%
                        </span>
                    )}
                    <ClipboardList size={16} color="rgba(240,255,223,0.3)" />
                </div>
            </div>

            {chartData === null && (
                <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Loader2 size={24} color='#3b82f6' style={{ animation: 'spin 1s linear infinite' }} />
                </div>
            )}

            {chartData !== null && chartData.length === 0 && (
                <div style={{ height: 180, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                    <ClipboardList size={36} color='rgba(240,255,223,0.15)' />
                    <p style={{ color: 'rgba(240,255,223,0.4)', fontSize: 13, margin: 0 }}>No assessment data yet</p>
                    <p style={{ color: 'rgba(240,255,223,0.25)', fontSize: 12, margin: 0 }}>Go to the Assessment tab to take your first test</p>
                </div>
            )}

            {chartData !== null && chartData.length > 0 && (
                <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={chartData} margin={{ top: 8, right: 16, left: -10, bottom: 48 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(240,255,223,0.07)" vertical={false} />
                        <XAxis
                            dataKey="skill"
                            tick={{ fill: 'rgba(240,255,223,0.55)', fontSize: 11 }}
                            angle={-35}
                            textAnchor="end"
                            interval={0}
                            axisLine={{ stroke: 'rgba(240,255,223,0.1)' }}
                            tickLine={false}
                        />
                        <YAxis
                            domain={[0, 100]}
                            tickFormatter={v => `${v}%`}
                            tick={{ fill: 'rgba(240,255,223,0.45)', fontSize: 11 }}
                            axisLine={false}
                            tickLine={false}
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(59,130,246,0.06)' }} />
                        <Bar dataKey="score" fill="#3b82f6" radius={[6, 6, 0, 0]} maxBarSize={40} />
                    </BarChart>
                </ResponsiveContainer>
            )}
        </div>
    );
}

// ─── Domain detection helper ─────────────────────────────────────────────────
const DOMAIN_MAP = [
    ['web development', 'web development'], ['web developer', 'web development'],
    ['frontend', 'web development'], ['full stack', 'web development'],
    ['data science', 'data science'], ['data scientist', 'data science'],
    ['machine learning', 'data science'], ['ai engineer', 'ai engineer'],
    ['artificial intelligence', 'ai engineer'], ['software engineer', 'software engineering'],
    ['software engineering', 'software engineering'], ['data analyst', 'data analyst'],
    ['business analyst', 'data analyst'],
];
function detectDomain(interests = []) {
    for (const interest of (interests || [])) {
        const low = interest.toLowerCase();
        for (const [key, val] of DOMAIN_MAP) {
            if (low.includes(key) || key.includes(low)) return val;
        }
    }
    return 'web development';
}

// ─── Assessment Tab ───────────────────────────────────────────────────────────
function AssessmentTab({ user }) {
    const navigate = useNavigate();

    const [testState, setTestState] = useState('idle'); // idle|loading|testing|results
    const [questions, setQuestions] = useState([]);
    const [current, setCurrent] = useState(0);
    const [answers, setAnswers] = useState({});
    const [results, setResults] = useState(null);
    const [error, setError] = useState('');

    // ── AI Anti-cheating state ──
    const [cameraViolationCount, setCameraViolationCount] = useState(0);
    const [faceVisible, setFaceVisible] = useState(true);
    const [cameraBlocked, setCameraBlocked] = useState(false);
    const [monitorStatus, setMonitorStatus] = useState('Initializing AI...');
    const videoRef = useRef(null);
    const monitorIntervalRef = useRef(null);
    const violationTimerRef = useRef(null);

    // ── Anti-cheating ─────────────────────────────────────────────────────────
    const [switchCount, setSwitchCount] = useState(0);
    const [showWarning, setShowWarning] = useState(false);
    const [violationType, setViolationType] = useState('');
    const switchCountRef = useRef(0);

    useEffect(() => {
        if (testState !== 'testing') return;

        // 1. Tab switch monitoring (existing)
        const handleVisibility = () => {
            if (document.visibilityState === 'hidden') {
                switchCountRef.current += 1;
                setSwitchCount(switchCountRef.current);
                setViolationType('Tab switch detected');
                setShowWarning(true);
                if (switchCountRef.current + cameraViolationCount >= 3) {
                    signOut(auth).then(() => navigate('/login'));
                }
            }
        };
        document.addEventListener('visibilitychange', handleVisibility);

        // 2. AI Camera/Face monitoring
        let faceDetection;
        let camera;

        const initAI = async () => {
            if (!videoRef.current) return;
            try {
                // Initialize MediaPipe Face Detection
                faceDetection = new window.FaceDetection({
                    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_detection/${file}`
                });

                faceDetection.setOptions({
                    model: 'short',
                    minDetectionConfidence: 0.5
                });

                faceDetection.onResults((results) => {
                    const hasFace = results.detections && results.detections.length > 0;
                    setFaceVisible(hasFace);

                    // Logic for "camera blocked" is simplified: if we have zero detections and high black pixel count (not doing pixel analysis here for perf, sticking to presence)
                    // We treat "No Face" and "Camera Closed" under the same 5-second rule as requested.

                    if (!hasFace) {
                        setMonitorStatus('No face detected / Camera blocked');
                        if (!violationTimerRef.current) {
                            violationTimerRef.current = setTimeout(() => {
                                setCameraViolationCount(prev => {
                                    const next = prev + 1;
                                    if (next >= 3) {
                                        signOut(auth).then(() => navigate('/login'));
                                    } else {
                                        setMonitorStatus(`Violation recorded! (${next}/2)`);
                                        setViolationType('Camera/Face violation');
                                        setShowWarning(true);
                                    }
                                    return next;
                                });
                                violationTimerRef.current = null;
                            }, 5000);
                        }
                    } else {
                        setMonitorStatus('Monitoring active');
                        if (violationTimerRef.current) {
                            clearTimeout(violationTimerRef.current);
                            violationTimerRef.current = null;
                        }
                    }
                });

                camera = new window.Camera(videoRef.current, {
                    onFrame: async () => {
                        await faceDetection.send({ image: videoRef.current });
                    },
                    width: 320,
                    height: 240
                });

                await camera.start();
            } catch (err) {
                console.error("AI Init failed", err);
                setMonitorStatus('Camera failed');
            }
        };

        initAI();

        return () => {
            document.removeEventListener('visibilitychange', handleVisibility);
            if (camera) camera.stop();
            if (faceDetection) faceDetection.close();
            if (violationTimerRef.current) clearTimeout(violationTimerRef.current);
        };
    }, [testState, navigate]);

    const domain = detectDomain(user?.interests);
    const skills = (user?.skills || []).join(',');
    const uid = user?.uid;

    // ── Fetch questions from backend ──────────────────────────────────────────
    const startTest = async () => {
        setTestState('loading'); setError('');
        try {
            const url = `/api/mcq/user-test?domain=${encodeURIComponent(domain)}&skills=${encodeURIComponent(skills)}`;
            const res = await fetch(url);
            const data = await res.json();
            if (!res.ok) { setError(data.error || 'Failed to load questions.'); setTestState('idle'); return; }
            if (!data.length) { setError('No questions found for your profile.'); setTestState('idle'); return; }
            setQuestions(data); setCurrent(0); setAnswers({}); setResults(null);
            setTestState('testing');
        } catch (e) { setError(`Network error: ${e.message}`); setTestState('idle'); }
    };

    // ── Submit and calculate scores ───────────────────────────────────────────
    const submitTest = async () => {
        // per-skill score
        const bySkill = {};
        questions.forEach((q, i) => {
            const sk = q.skill;
            if (!bySkill[sk]) bySkill[sk] = { correct: 0, total: 0 };
            bySkill[sk].total++;
            if (answers[i] === q.answer) bySkill[sk].correct++;
        });
        const scores = {};
        for (const [sk, d] of Object.entries(bySkill))
            scores[sk] = parseFloat((d.correct / d.total).toFixed(2));
        const vals = Object.values(scores);
        const total_score = parseFloat((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2));

        // save to Firestore
        let savedOk = false;
        if (uid) {
            try {
                await setDoc(doc(db, 'test_scores', uid), {
                    uid, domain, scores, total_score, completedAt: serverTimestamp(),
                }, { merge: true });
                savedOk = true;
            } catch (e) { console.warn('Firestore save failed', e); }
        }
        setResults({ scores, total_score, savedOk });
        setTestState('results');
    };

    // ─── IDLE ─────────────────────────────────────────────────────────────────
    if (testState === 'idle') return (
        <div style={{ maxWidth: 620, margin: '0 auto', padding: 24 }}>
            {error && <div style={{ background: 'rgba(248,113,113,0.15)', border: '1px solid #f87171', borderRadius: 10, padding: '12px 16px', marginBottom: 16, color: '#f87171', fontSize: 14 }}>{error}</div>}
            <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 16, padding: 32, textAlign: 'center', border: '1px solid rgba(255,255,255,0.08)' }}>
                <ClipboardList size={48} color='#3b82f6' style={{ marginBottom: 16 }} />
                <h2 style={{ color: '#f0ffdf', fontSize: 22, marginBottom: 8 }}>Skill Assessment</h2>
                <p style={{ color: 'rgba(240,255,223,0.6)', marginBottom: 16, fontSize: 14 }}>
                    Domain: <strong style={{ color: '#60a5fa' }}>{domain}</strong>
                </p>
                {user?.skills?.length > 0 && (
                    <p style={{ color: 'rgba(240,255,223,0.5)', fontSize: 13, marginBottom: 24 }}>
                        Testing skills: {user.skills.slice(0, 6).join(' · ')}
                    </p>
                )}
                <p style={{ color: 'rgba(240,255,223,0.55)', fontSize: 13, marginBottom: 28 }}>
                    3 questions per skill · Multiple choice · Instant scoring
                </p>
                <button onClick={startTest} style={{ background: 'linear-gradient(135deg,#3b82f6,#6366f1)', color: '#fff', border: 'none', borderRadius: 10, padding: '12px 32px', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
                    Start Assessment
                </button>
            </div>
        </div>
    );

    // ─── LOADING ──────────────────────────────────────────────────────────────
    if (testState === 'loading') return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 320, gap: 16 }}>
            <Loader2 size={40} color='#3b82f6' style={{ animation: 'spin 1s linear infinite' }} />
            <p style={{ color: 'rgba(240,255,223,0.7)' }}>Loading your personalized questions…</p>
        </div>
    );

    // ─── TESTING ──────────────────────────────────────────────────────────────
    if (testState === 'testing') {
        const q = questions[current];
        const total = questions.length;
        const pct = Math.round(((current + 1) / total) * 100);
        const picked = answers[current];
        const isLast = current === total - 1;
        const answeredCount = Object.keys(answers).length;

        const optionStyle = (opt) => {
            const base = { display: 'block', width: '100%', textAlign: 'left', padding: '12px 16px', borderRadius: 10, marginBottom: 10, fontSize: 14, cursor: 'pointer', border: '1px solid', fontWeight: 500, transition: 'all 0.2s' };
            if (picked === opt) return { ...base, background: 'rgba(59,130,246,0.25)', borderColor: '#3b82f6', color: '#93c5fd' };
            return { ...base, background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.1)', color: 'rgba(240,255,223,0.8)' };
        };

        return (
            <div style={{ maxWidth: 680, margin: '0 auto', padding: '24px 16px', position: 'relative' }}>

                {/* AI Camera Preview Overlay */}
                <div style={{
                    position: 'fixed', bottom: 20, right: 20, width: 160, height: 120,
                    borderRadius: 12, overflow: 'hidden', border: `2px solid ${faceVisible ? '#4ade80' : '#f87171'}`,
                    boxShadow: '0 8px 32px rgba(0,0,0,0.4)', zIndex: 100, background: '#111'
                }}>
                    <video ref={videoRef} style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} playsInline muted />
                    <div style={{
                        position: 'absolute', bottom: 0, left: 0, right: 0, padding: '4px 8px',
                        background: 'rgba(0,0,0,0.6)', color: faceVisible ? '#4ade80' : '#f87171',
                        fontSize: 9, fontWeight: 700, textAlign: 'center'
                    }}>
                        {monitorStatus}
                    </div>
                    {cameraViolationCount > 0 && (
                        <div style={{ position: 'absolute', top: 5, left: 5, background: '#ef4444', color: '#fff', fontSize: 10, padding: '2px 6px', borderRadius: 4, fontWeight: 800 }}>
                            Warnings: {cameraViolationCount}/2
                        </div>
                    )}
                </div>

                {/* ── Anti-cheat warning overlay ── */}
                {showWarning && (
                    <div style={{
                        position: 'fixed', inset: 0, zIndex: 9999,
                        background: 'rgba(0,0,0,0.82)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        <div style={{
                            background: switchCount >= 3 ? '#1a0a0a' : switchCount >= 2 ? '#1a1000' : '#0a0f1a',
                            border: `2px solid ${switchCount >= 3 ? '#ef4444' : switchCount >= 2 ? '#f59e0b' : '#f59e0b'}`,
                            borderRadius: 16, padding: '36px 40px', maxWidth: 440, textAlign: 'center',
                            boxShadow: `0 0 40px ${switchCount >= 3 ? 'rgba(239,68,68,0.35)' : 'rgba(245,158,11,0.3)'}`,
                        }}>
                            {/* Icon */}
                            <div style={{ fontSize: 48, marginBottom: 12 }}>
                                {switchCount >= 3 ? '🚫' : '⚠️'}
                            </div>

                            {/* Title */}
                            <h2 style={{ color: switchCount + cameraViolationCount >= 3 ? '#ef4444' : '#fbbf24', fontSize: 20, fontWeight: 800, marginBottom: 10 }}>
                                {switchCount + cameraViolationCount >= 3 ? 'Test Terminated' : switchCount + cameraViolationCount >= 2 ? 'Final Warning!' : 'Warning!'}
                            </h2>

                            {/* Violation type info */}
                            <div style={{ color: 'rgba(240,255,223,0.5)', fontSize: 12, marginBottom: 12 }}>
                                Type detected: <strong style={{ color: '#c084fc' }}>{violationType}</strong>
                            </div>

                            {/* Violation counter */}
                            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 16 }}>
                                {[1, 2, 3].map(n => (
                                    <div key={n} style={{
                                        width: 32, height: 32, borderRadius: '50%', display: 'flex',
                                        alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14,
                                        background: n <= (switchCount + cameraViolationCount) ? (switchCount + cameraViolationCount >= 3 ? '#ef4444' : '#f59e0b') : 'rgba(255,255,255,0.08)',
                                        color: n <= (switchCount + cameraViolationCount) ? '#fff' : 'rgba(255,255,255,0.25)',
                                    }}>{n}</div>
                                ))}
                            </div>

                            {/* Message */}
                            <p style={{ color: 'rgba(240,255,223,0.75)', fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
                                {switchCount + cameraViolationCount >= 3
                                    ? 'You have reached the maximum number of violations (3). For security and integrity, you are now being logged out.'
                                    : `Violation detected (${switchCount + cameraViolationCount}/2 warnings). Multiple violations (tab switching or camera/face absence) will lead to an automatic logout.`
                                }
                            </p>

                            {/* Action */}
                            {switchCount < 3 ? (
                                <button onClick={() => setShowWarning(false)} style={{
                                    background: 'linear-gradient(135deg,#f59e0b,#d97706)', color: '#fff',
                                    border: 'none', borderRadius: 10, padding: '11px 28px',
                                    fontSize: 14, fontWeight: 700, cursor: 'pointer',
                                }}>
                                    I Understand — Continue Test
                                </button>
                            ) : (
                                <div style={{ color: '#ef4444', fontSize: 13, fontWeight: 600 }}>
                                    Logging you out…
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* violation badge in header */}
                {(switchCount > 0 || cameraViolationCount > 0) && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12, padding: '6px 12px', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 8, fontSize: 12 }}>
                        <span>⚠️</span>
                        <span style={{ color: '#fbbf24' }}>Total violations: <strong>{switchCount + cameraViolationCount}/2</strong> warnings used</span>
                    </div>
                )}

                {/* Progress bar */}
                <div style={{ marginBottom: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13, color: 'rgba(240,255,223,0.6)' }}>
                        <span>Question {current + 1} of {total}</span>
                        <span style={{ color: '#60a5fa' }}>{answeredCount}/{total} answered</span>
                    </div>
                    <div style={{ height: 6, borderRadius: 99, background: 'rgba(59,130,246,0.12)', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg,#3b82f6,#6366f1)', borderRadius: 99, transition: 'width 0.4s ease' }} />
                    </div>
                </div>

                {/* Skill badge */}
                <span style={{ fontSize: 11, background: 'rgba(99,102,241,0.18)', color: '#a5b4fc', padding: '3px 10px', borderRadius: 99, border: '1px solid rgba(99,102,241,0.3)', letterSpacing: '0.5px', textTransform: 'uppercase' }}>{q.skill}</span>

                {/* Question */}
                <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 24, margin: '16px 0 20px' }}>
                    <p style={{ color: '#f0ffdf', fontSize: 16, lineHeight: 1.6, fontWeight: 500 }}>
                        <span style={{ color: 'rgba(240,255,223,0.4)', marginRight: 8 }}>Q{current + 1}.</span>{q.question}
                    </p>
                </div>

                {/* Options */}
                {q.options.map((opt, i) => (
                    <button key={i} onClick={() => setAnswers(a => ({ ...a, [current]: opt }))} style={optionStyle(opt)}>
                        <span style={{ color: 'rgba(240,255,223,0.4)', marginRight: 10 }}>{String.fromCharCode(65 + i)}.</span>{opt}
                    </button>
                ))}

                {/* Navigation */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24, gap: 12 }}>
                    <button onClick={() => setCurrent(c => Math.max(0, c - 1))} disabled={current === 0}
                        style={{ flex: 1, padding: '11px 0', borderRadius: 10, border: '1px solid rgba(255,255,255,0.15)', background: 'transparent', color: current === 0 ? 'rgba(240,255,223,0.25)' : 'rgba(240,255,223,0.8)', cursor: current === 0 ? 'not-allowed' : 'pointer', fontSize: 14, fontWeight: 600 }}>
                        ← Previous
                    </button>
                    {!isLast ? (
                        <button onClick={() => setCurrent(c => Math.min(total - 1, c + 1))}
                            style={{ flex: 1, padding: '11px 0', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#3b82f6,#6366f1)', color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>
                            Next →
                        </button>
                    ) : (
                        <button onClick={submitTest}
                            style={{ flex: 1, padding: '11px 0', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#22c55e,#16a34a)', color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 700 }}>
                            ✓ Submit Test
                        </button>
                    )}
                </div>

                {/* Dot indicators */}
                <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 6, marginTop: 20 }}>
                    {questions.map((_, i) => (
                        <button key={i} onClick={() => setCurrent(i)} style={{
                            width: 10, height: 10, borderRadius: '50%', border: 'none', cursor: 'pointer',
                            background: i === current ? '#3b82f6' : answers[i] ? '#4ade80' : 'rgba(255,255,255,0.15)'
                        }} />
                    ))}
                </div>
            </div>
        );
    }

    // ─── RESULTS ──────────────────────────────────────────────────────────────
    if (testState === 'results' && results) {
        const { scores, total_score, savedOk } = results;
        const pct = Math.round(total_score * 100);
        const grade = pct >= 70 ? { label: 'Excellent', color: '#4ade80' } : pct >= 45 ? { label: 'Good', color: '#fbbf24' } : { label: 'Needs Work', color: '#f87171' };

        // rebuild per-question color coding
        const getAnswerColor = (qIdx) => {
            const ans = answers[qIdx];
            if (!ans) return 'rgba(255,255,255,0.12)'; // unanswered
            return ans === questions[qIdx].answer ? '#4ade80' : '#f87171';
        };

        return (
            <div style={{ maxWidth: 680, margin: '0 auto', padding: '24px 16px' }}>
                {/* Score card */}
                <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 28, textAlign: 'center', marginBottom: 24 }}>
                    <div style={{ fontSize: 56, fontWeight: 800, color: grade.color }}>{pct}%</div>
                    <div style={{ fontSize: 18, color: grade.color, fontWeight: 600, marginBottom: 6 }}>{grade.label}</div>
                    <div style={{ color: 'rgba(240,255,223,0.55)', fontSize: 13 }}>Total Score (average across all skills)</div>
                    {savedOk && <div style={{ marginTop: 12, fontSize: 12, color: '#4ade80' }}>✓ Score saved to your profile</div>}
                </div>

                {/* Per-skill breakdown */}
                <h3 style={{ color: '#f0ffdf', fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Breakdown by Skill</h3>
                {Object.entries(scores).map(([skill, score]) => {
                    const sp = Math.round(score * 100);
                    const sc = sp >= 70 ? '#4ade80' : sp >= 40 ? '#fbbf24' : '#f87171';
                    return (
                        <div key={skill} style={{ marginBottom: 14 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                                <span style={{ fontSize: 13, color: 'rgba(240,255,223,0.8)', textTransform: 'capitalize' }}>{skill}</span>
                                <span style={{ fontSize: 13, fontWeight: 700, color: sc }}>{sp}%</span>
                            </div>
                            <div style={{ height: 6, borderRadius: 99, background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${sp}%`, background: sc, borderRadius: 99, transition: 'width 0.6s ease' }} />
                            </div>
                        </div>
                    );
                })}

                {/* Answer review dots */}
                <h3 style={{ color: '#f0ffdf', fontSize: 15, fontWeight: 600, margin: '24px 0 12px' }}>Answer Review</h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
                    {questions.map((_, i) => (
                        <div key={i} title={`Q${i + 1}: ${answers[i] ? (answers[i] === questions[i].answer ? 'Correct' : 'Wrong') : 'Unanswered'}`}
                            style={{ width: 32, height: 32, borderRadius: 8, background: getAnswerColor(i), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#0f1a0f', cursor: 'default' }}>
                            {i + 1}
                        </div>
                    ))}
                </div>
                <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'rgba(240,255,223,0.5)', marginBottom: 28 }}>
                    <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: '#4ade80', marginRight: 4 }} />Correct</span>
                    <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: '#f87171', marginRight: 4 }} />Wrong</span>
                    <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: 'rgba(255,255,255,0.12)', marginRight: 4 }} />Unanswered</span>
                </div>

                {/* Retake */}
                <button onClick={() => { setTestState('idle'); setResults(null); setAnswers({}); setCurrent(0); }}
                    style={{ width: '100%', padding: '13px 0', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#3b82f6,#6366f1)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                    Retake Assessment
                </button>
            </div>
        );
    }
    return null;
}


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


function GitHubScraperTab({ uid }) {
    const [url, setUrl] = useState('');
    const [scraping, setScraping] = useState(false);
    const [repoData, setRepoData] = useState(null);
    const [error, setError] = useState('');

    const handleScrape = async () => {
        if (!url.trim()) { setError('Please enter a GitHub URL.'); return; }
        if (!url.includes('github.com/')) { setError('Invalid GitHub URL.'); return; }

        setError('');
        setScraping(true);

        try {
            const res = await fetch('/api/github/scrape', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: url.trim() }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || `Scraping failed (HTTP ${res.status})`);
                setScraping(false);
                return;
            }

            // Save to Firestore
            if (uid) {
                try {
                    await setDoc(doc(db, 'github_scrapes', uid), {
                        uid,
                        ...data,
                        scrapedAt: serverTimestamp(),
                    }, { merge: true });
                } catch (fsErr) {
                    console.warn('[GitHubTab] Firestore save failed:', fsErr);
                }
            }

            setRepoData(data);
        } catch (err) {
            setError(`Network error: ${err.message}.`);
        } finally {
            setScraping(false);
        }
    };

    const card = { background: '#1F1F1F', border: '1px solid rgba(35,114,39,0.2)', borderRadius: 16, padding: 24, marginBottom: 20 };
    const tag = (color) => ({ fontSize: 12, padding: '4px 10px', borderRadius: 99, border: `1px solid ${color}33`, background: `${color}15`, color });

    return (
        <div>
            {/* Input area */}
            <div style={card}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                    <Github size={18} color="#237227" />
                    <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#F0FFDF' }}>Analyze GitHub Repository</h4>
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                    <input
                        type="text"
                        placeholder="https://github.com/owner/repository"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        style={{
                            flex: 1,
                            background: 'rgba(255,255,255,0.03)',
                            border: '1px solid rgba(35,114,39,0.3)',
                            borderRadius: 10,
                            padding: '12px 16px',
                            color: '#F0FFDF',
                            fontSize: 14,
                            outline: 'none',
                        }}
                    />
                    <button
                        onClick={handleScrape}
                        disabled={scraping}
                        style={{
                            background: scraping ? 'rgba(35,114,39,0.2)' : 'linear-gradient(135deg,#237227,#166534)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 10,
                            padding: '0 24px',
                            fontSize: 14,
                            fontWeight: 600,
                            cursor: scraping ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            transition: 'all 0.2s',
                        }}
                    >
                        {scraping ? <Loader2 size={16} className="animate-spin" /> : 'Scrape'}
                    </button>
                </div>

                {error && (
                    <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 8, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <AlertCircle size={16} color="#f87171" />
                        <span style={{ color: '#f87171', fontSize: 13 }}>{error}</span>
                    </div>
                )}
            </div>

            {/* Scraped data */}
            {repoData && (
                <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderRadius: 10, background: 'rgba(35,114,39,0.12)', border: '1px solid rgba(35,114,39,0.3)', marginBottom: 20 }}>
                        <CheckCircle2 size={16} color="#4ade80" />
                        <span style={{ color: '#4ade80', fontSize: 13, fontWeight: 600 }}>
                            Repository analyzed & saved ✓
                        </span>
                        <span style={{ color: 'rgba(240,255,223,0.4)', fontSize: 12, marginLeft: 4 }}>
                            — {repoData.name} ({repoData.stars} stars)
                        </span>
                    </div>

                    <div style={card}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                            <TrendingUp size={16} color="#4ade80" />
                            <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#F0FFDF' }}>AI Insights</h4>
                        </div>
                        <p style={{ color: 'rgba(240,255,223,0.8)', fontSize: 14, lineHeight: 1.6, margin: 0 }}>
                            {repoData.geminiAnalysis}
                        </p>
                    </div>

                    <div style={card}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                            <Code2 size={16} color="#3b82f6" />
                            <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#F0FFDF' }}>Tech Stack & Topics</h4>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                            {repoData.techStack?.map((tech, i) => (
                                <span key={i} style={tag('#60a5fa')}>{tech}</span>
                            ))}
                        </div>
                        <p style={{ color: 'rgba(240,255,223,0.3)', fontSize: 12, marginTop: 14 }}>
                            Primary Language: <span style={{ color: 'rgba(240,255,223,0.5)' }}>{repoData.language}</span>
                            &nbsp;&nbsp;•&nbsp;&nbsp;
                            Last Commit: <span style={{ color: 'rgba(240,255,223,0.5)' }}>{new Date(repoData.lastCommit).toLocaleDateString()}</span>
                        </p>
                    </div>
                </>
            )}
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
            <Sidebar
                collapsed={collapsed}
                onToggle={() => setCollapsed(!collapsed)}
                activeTab={activeTab}
                onTabChange={setActiveTab}
            />

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
                            {tab === 'GitHub Research' && <Github size={13} style={{ marginRight: 6, verticalAlign: 'middle' }} />}
                            {tab}
                        </button>
                    ))}
                </div>

                {/* ── Overview tab ── */}
                {activeTab === 'Overview' && (
                    <>
                        {/* Stats row — Skills Identified only (Readiness + Assessments replaced by chart) */}
                        <div style={s.grid3}>
                            {[
                                { label: 'Skills Identified', val: skills.length, delta: `${skills.length} skills on profile` },
                                { label: 'Interests', val: interests.length, delta: interests.slice(0, 2).join(' · ') || '—' },
                                { label: 'Year of Study', val: user?.currentYear ? `Year ${user.currentYear}` : '—', delta: user?.educationalLevel || 'Student' },
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

                        {/* Assessment Score Chart */}
                        <ScoreBarChart uid={user?.uid} s={s} />

                    </>
                )}

                {/* ── Resume Info tab ── */}
                {activeTab === 'Resume Info' && (
                    <ResumeInfoTab uid={user?.uid} userName={user?.fullName || user?.username || ''} />
                )}

                {/* ── GitHub Research tab ── */}
                {activeTab === 'GitHub Research' && (
                    <GitHubScraperTab uid={user?.uid} />
                )}

                {/* ── Assessment tab ── */}
                {activeTab === 'Assessment' && (
                    <AssessmentTab user={user} />
                )}

                {/* ── Skill Gap tab ── */}
                {activeTab === 'Skill Gap' && (
                    <SkillGapTab user={user} />
                )}

                {/* ── SWOT Analysis tab ── */}
                {activeTab === 'SWOT Analysis' && (
                    <SWOTTab user={user} />
                )}

                {/* ── Career Match tab ── */}
                {activeTab === 'Career Match' && (
                    <CareerMatchTab user={user} />
                )}

                {/* ── Roadmap tab ── */}
                {activeTab === 'Roadmap' && (
                    <RoadmapTab user={user} />
                )}
            </main>
        </div>
    );
}

// ─── SWOT Analysis Tab ────────────────────────────────────────────────────────
const SWOT_CONFIG = {
    strengths: { label: 'Strengths', emoji: '💪', color: '#4ade80', bg: 'rgba(74,222,128,0.09)', border: 'rgba(74,222,128,0.28)' },
    weaknesses: { label: 'Weaknesses', emoji: '⚠️', color: '#f87171', bg: 'rgba(248,113,113,0.09)', border: 'rgba(248,113,113,0.28)' },
    opportunities: { label: 'Opportunities', emoji: '🚀', color: '#60a5fa', bg: 'rgba(96,165,250,0.09)', border: 'rgba(96,165,250,0.28)' },
    threats: { label: 'Threats', emoji: '🛡️', color: '#fbbf24', bg: 'rgba(251,191,36,0.09)', border: 'rgba(251,191,36,0.28)' },
};

function SWOTTab({ user }) {
    const [state, setState] = useState('idle');
    const [swot, setSwot] = useState(null);
    const [errMsg, setErrMsg] = useState('');

    const uid = user?.uid;
    const domain = detectDomain(user?.interests);
    const skills = user?.skills || [];

    const runSWOT = async () => {
        setState('loading'); setErrMsg('');

        // Read skill gap from Firestore skill_gaps
        let skill_results = {}, totals = {}, role = '';
        try {
            const snap = await getDoc(doc(db, 'skill_gaps', uid));
            if (snap.exists()) {
                const d = snap.data();
                skill_results = d.skill_results || {};
                totals = d.totals || {};
                role = d.role || '';
            }
        } catch (e) { console.warn('Firestore skill_gaps', e); }

        // ALSO read test_scores as supplementary context
        let test_scores = {};
        try {
            const tSnap = await getDoc(doc(db, 'test_scores', uid));
            if (tSnap.exists()) test_scores = tSnap.data().scores || {};
        } catch (e) { console.warn('Firestore test_scores', e); }

        // Build full user profile context
        const profile = {
            name: user?.fullName || user?.username || 'Student',
            domain,
            role,
            skills,
            interests: user?.interests || [],
            education: user?.educationLevel || user?.education || '',
            university: user?.university || user?.college || '',
            currentYear: user?.currentYear || user?.year || '',
        };

        try {
            const res = await fetch('/api/swot/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ profile, test_scores, skill_results, totals }),
            });
            const data = await res.json();
            if (!res.ok || data.error) {
                setErrMsg(data.error || 'SWOT generation failed.');
                setState('error'); return;
            }
            setSwot(data);
            if (uid) {
                try {
                    await setDoc(doc(db, 'swot_analyses', uid), {
                        ...data,
                        uid,
                        updatedAt: serverTimestamp()
                    });
                } catch (e) {
                    console.warn('Firestore swot_analyses save failed', e);
                }
            }
            setState('done');
        } catch (e) { setErrMsg(`Network error: ${e.message}`); setState('error'); }
    };

    if (state === 'idle' || state === 'error') return (
        <div style={{ maxWidth: 640, margin: '0 auto', padding: 24 }}>
            {errMsg && <div style={{ background: 'rgba(248,113,113,0.12)', border: '1px solid #f87171', borderRadius: 10, padding: '12px 16px', marginBottom: 16, color: '#f87171', fontSize: 14 }}>{errMsg}</div>}
            <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 32, textAlign: 'center' }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div>
                <h2 style={{ color: '#f0ffdf', fontSize: 22, marginBottom: 8 }}>SWOT Analysis</h2>
                <p style={{ color: 'rgba(240,255,223,0.5)', fontSize: 13, marginBottom: 8 }}>Powered by Gemini AI · Personalised career mentor</p>
                <p style={{ color: 'rgba(240,255,223,0.4)', fontSize: 13, marginBottom: 28, lineHeight: 1.6 }}>
                    Domain: <strong style={{ color: '#a5b4fc' }}>{domain}</strong><br />
                    For best results, complete the <strong>Assessment</strong> and <strong>Skill Gap</strong> tabs first.
                </p>
                <button onClick={runSWOT} style={{ background: 'linear-gradient(135deg,#a855f7,#7c3aed)', color: '#fff', border: 'none', borderRadius: 10, padding: '12px 32px', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
                    Generate My SWOT Analysis
                </button>
            </div>
        </div>
    );

    if (state === 'loading') return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 320, gap: 16 }}>
            <Loader2 size={40} color='#a855f7' style={{ animation: 'spin 1s linear infinite' }} />
            <p style={{ color: 'rgba(240,255,223,0.7)' }}>Gemini is analysing your profile…</p>
        </div>
    );

    return (
        <div style={{ maxWidth: 860, margin: '0 auto', padding: '24px 16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
                <div>
                    <h2 style={{ color: '#f0ffdf', fontSize: 20, fontWeight: 800, margin: 0 }}>Your SWOT Analysis</h2>
                    <p style={{ color: 'rgba(240,255,223,0.45)', fontSize: 13, marginTop: 4 }}>AI-generated · Domain: <span style={{ color: '#a5b4fc', textTransform: 'capitalize' }}>{domain}</span></p>
                </div>
                <button onClick={() => { setState('idle'); setSwot(null); }}
                    style={{ padding: '8px 18px', borderRadius: 8, border: '1px solid rgba(168,85,247,0.3)', background: 'transparent', color: '#c084fc', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                    ↺ Regenerate
                </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 16 }}>
                {Object.entries(SWOT_CONFIG).map(([key, cfg]) => {
                    const items = swot?.[key] || [];
                    return (
                        <div key={key} style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, borderRadius: 16, padding: 24 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                                <span style={{ fontSize: 24 }}>{cfg.emoji}</span>
                                <h3 style={{ color: cfg.color, fontSize: 16, fontWeight: 800, margin: 0 }}>{cfg.label}</h3>
                                <span style={{ marginLeft: 'auto', fontSize: 11, background: `${cfg.border}`, color: cfg.color, padding: '2px 8px', borderRadius: 99, fontWeight: 600 }}>{items.length}</span>
                            </div>
                            {items.length === 0 ? (
                                <p style={{ color: 'rgba(240,255,223,0.35)', fontSize: 13 }}>No items returned.</p>
                            ) : (
                                <ul style={{ paddingLeft: 0, margin: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 12 }}>
                                    {items.map((item, i) => (
                                        <li key={i} style={{ borderBottom: `1px solid ${cfg.border}`, paddingBottom: 10 }}>
                                            <div style={{ color: cfg.color, fontSize: 13, fontWeight: 700, marginBottom: 4 }}>▸ {item.title}</div>
                                            <div style={{ color: 'rgba(240,255,223,0.7)', fontSize: 12.5, lineHeight: 1.6 }}>{item.explanation}</div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

