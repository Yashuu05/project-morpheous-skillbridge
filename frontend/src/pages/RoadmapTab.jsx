import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { Loader2 } from 'lucide-react';

/* ─── helper: resource icon ─────────────────────────────────────────────────── */
const RESOURCE_ICONS = { book: '📚', course: '🎓', docs: '📄', youtube: '▶️', tool: '🛠️' };
const PHASE_COLORS = ['#a855f7', '#60a5fa', '#4ade80', '#fbbf24'];
const RANK_MEDALS = ['🥇', '🥈', '🥉'];
const RANK_COLORS = ['#ffd700', '#c0c0c0', '#cd7f32'];

/* ─── Floating Career Card ─────────────────────────────────────────────────── */
function FloatingCard({ match, idx, isSelected, onSelect, onGenerate, generating }) {
    const rankColor = RANK_COLORS[idx];
    const medal = RANK_MEDALS[idx];
    return (
        <div
            onClick={onSelect}
            style={{
                cursor: 'pointer',
                background: isSelected ? `${rankColor}15` : 'rgba(255,255,255,0.04)',
                border: `2px solid ${isSelected ? rankColor : rankColor + '44'}`,
                borderRadius: 18,
                padding: 22,
                flex: '1 1 260px',
                minWidth: 220,
                maxWidth: 310,
                position: 'relative',
                transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                animation: `float-card-${idx} 3s ease-in-out infinite`,
                boxShadow: isSelected ? `0 8px 32px ${rankColor}33` : `0 4px 16px ${rankColor}18`,
            }}
        >
            <style>{`
                @keyframes float-card-0 { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
                @keyframes float-card-1 { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
                @keyframes float-card-2 { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
            `}</style>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <span style={{ fontSize: 28 }}>{medal}</span>
                <div>
                    <div style={{ color: rankColor, fontSize: 15, fontWeight: 800, textTransform: 'capitalize' }}>{match.role}</div>
                    <div style={{ color: 'rgba(240,255,223,0.4)', fontSize: 11, textTransform: 'capitalize' }}>{match.domain}</div>
                </div>
                <div style={{ marginLeft: 'auto', textAlign: 'center' }}>
                    <div style={{ fontSize: 26, fontWeight: 900, color: rankColor, lineHeight: 1 }}>{match.match_pct}%</div>
                    <div style={{ fontSize: 10, color: 'rgba(240,255,223,0.35)' }}>match</div>
                </div>
            </div>

            {/* mini sub-scores */}
            {match.breakdown && (
                <div style={{ fontSize: 10, color: 'rgba(240,255,223,0.5)', display: 'flex', flexDirection: 'column', gap: 3, marginBottom: 12 }}>
                    {[
                        { label: 'Test', val: match.breakdown.test_alignment?.score, color: '#60a5fa' },
                        { label: 'Skills', val: match.breakdown.skill_overlap?.score, color: '#4ade80' },
                        { label: 'Interest', val: match.breakdown.interest_score?.score, color: '#fbbf24' },
                    ].map(({ label, val, color }) => (
                        <div key={label}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 1 }}>
                                <span>{label}</span>
                                <span style={{ color, fontWeight: 700 }}>{Math.round((val || 0) * 100)}%</span>
                            </div>
                            <div style={{ height: 3, borderRadius: 99, background: 'rgba(255,255,255,0.07)' }}>
                                <div style={{ height: '100%', width: `${Math.round((val || 0) * 100)}%`, background: color, borderRadius: 99 }} />
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <button
                onClick={e => { e.stopPropagation(); onGenerate(match); }}
                disabled={generating}
                style={{
                    width: '100%', padding: '8px 0', borderRadius: 8,
                    background: isSelected ? `linear-gradient(135deg,${rankColor},${rankColor}bb)` : 'rgba(255,255,255,0.06)',
                    color: isSelected ? '#0a0a0f' : rankColor,
                    border: `1px solid ${rankColor}55`,
                    fontSize: 12, fontWeight: 700, cursor: generating ? 'not-allowed' : 'pointer',
                    opacity: generating ? 0.7 : 1,
                }}>
                {generating ? '⏳ Generating…' : '🗺️ Generate Roadmap'}
            </button>
        </div>
    );
}

/* ─── Phase Section ────────────────────────────────────────────────────────── */
function PhaseSection({ phase, idx }) {
    const color = PHASE_COLORS[idx % PHASE_COLORS.length];
    const [open, setOpen] = useState(idx === 0);

    return (
        <div style={{ marginBottom: 16, border: `1px solid ${color}44`, borderRadius: 14, overflow: 'hidden' }}>
            {/* Header */}
            <div
                onClick={() => setOpen(o => !o)}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px', background: `${color}10`, cursor: 'pointer' }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: '#0a0a0f', fontSize: 14, flexShrink: 0 }}>
                    {phase.phase_number}
                </div>
                <div style={{ flex: 1 }}>
                    <div style={{ color, fontSize: 15, fontWeight: 800 }}>{phase.title}</div>
                    <div style={{ color: 'rgba(240,255,223,0.4)', fontSize: 11, marginTop: 2 }}>⏱ {phase.duration}</div>
                </div>
                <span style={{ color, fontSize: 18 }}>{open ? '▲' : '▼'}</span>
            </div>

            {open && (
                <div style={{ padding: '18px 20px', background: 'rgba(255,255,255,0.02)' }}>

                    {/* Goals */}
                    {phase.goals?.length > 0 && (
                        <div style={{ marginBottom: 14 }}>
                            <div style={{ color: color, fontWeight: 700, fontSize: 12, marginBottom: 6 }}>🎯 Goals</div>
                            <ul style={{ margin: 0, paddingLeft: 20 }}>
                                {phase.goals.map((g, i) => <li key={i} style={{ color: 'rgba(240,255,223,0.7)', fontSize: 13, marginBottom: 3 }}>{g}</li>)}
                            </ul>
                        </div>
                    )}

                    {/* Skills */}
                    {phase.skills_to_learn?.length > 0 && (
                        <div style={{ marginBottom: 14 }}>
                            <div style={{ color: color, fontWeight: 700, fontSize: 12, marginBottom: 6 }}>📖 Skills to Learn</div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                                {phase.skills_to_learn.map(s => (
                                    <span key={s} style={{ background: `${color}14`, border: `1px solid ${color}33`, color, borderRadius: 99, padding: '3px 10px', fontSize: 11 }}>{s}</span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Projects */}
                    {phase.projects?.length > 0 && (
                        <div style={{ marginBottom: 14 }}>
                            <div style={{ color: color, fontWeight: 700, fontSize: 12, marginBottom: 8 }}>🏗️ Projects</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {phase.projects.map((p, i) => (
                                    <div key={i} style={{ background: `${color}09`, border: `1px solid ${color}22`, borderRadius: 10, padding: '10px 14px' }}>
                                        <div style={{ color, fontWeight: 700, fontSize: 13 }}>{p.name}</div>
                                        <div style={{ color: 'rgba(240,255,223,0.6)', fontSize: 12, margin: '4px 0 6px' }}>{p.description}</div>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                            {(p.tech_stack || []).map(t => (
                                                <span key={t} style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(240,255,223,0.7)', borderRadius: 4, padding: '1px 6px', fontSize: 10 }}>{t}</span>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Resources */}
                    {phase.resources?.length > 0 && (
                        <div>
                            <div style={{ color: color, fontWeight: 700, fontSize: 12, marginBottom: 8 }}>🔗 Resources</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                {phase.resources.map((r, i) => (
                                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: '8px 12px' }}>
                                        <span style={{ fontSize: 16 }}>{RESOURCE_ICONS[r.type] || '🔗'}</span>
                                        <div>
                                            <div style={{ color: 'rgba(240,255,223,0.85)', fontSize: 12, fontWeight: 600 }}>{r.title}</div>
                                            <div style={{ color: 'rgba(240,255,223,0.4)', fontSize: 10 }}>{r.type} · {r.url_or_platform}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

/* ─── Main RoadmapTab ─────────────────────────────────────────────────────── */
export default function RoadmapTab({ user }) {
    const [careerMatches, setCareerMatches] = useState([]);
    const [loadingMatches, setLoadingMatches] = useState(true);
    const [generatingFor, setGeneratingFor] = useState(null);  // role being generated
    const [roadmaps, setRoadmaps] = useState({});     // { role: roadmapData }
    const [activeRole, setActiveRole] = useState(null);
    const [errMsg, setErrMsg] = useState('');
    const [saved, setSaved] = useState({});

    const uid = user?.uid;

    /* Load career matches + any saved roadmaps from Firestore */
    useEffect(() => {
        if (!uid) return;
        const load = async () => {
            try {
                // Career matches
                const cmSnap = await getDoc(doc(db, 'career_matches', uid));
                if (cmSnap.exists()) {
                    const data = cmSnap.data();
                    setCareerMatches(data.top_matches || []);
                    setActiveRole(data.top_matches?.[0]?.role || null);
                }
                // Saved roadmaps
                const rmSnap = await getDoc(doc(db, 'roadmaps', uid));
                if (rmSnap.exists()) {
                    setRoadmaps(rmSnap.data().roadmaps || {});
                    setSaved(prev => {
                        const s = { ...prev };
                        Object.keys(rmSnap.data().roadmaps || {}).forEach(k => { s[k] = true; });
                        return s;
                    });
                }
            } catch (e) { console.warn('Firestore load', e); }
            setLoadingMatches(false);
        };
        load();
    }, [uid]);


    const buildPayload = async (match) => {
        const profile = {
            name: user?.fullName || user?.username || 'Student',
            domain: match.domain || '',
            skills: user?.skills || [],
            interests: user?.interests || [],
            education: user?.educationLevel || '',
            university: user?.university || '',
            currentYear: user?.currentYear || '',
        };
        let test_scores = {}, skill_results = {}, totals = {}, swot = {};
        try {
            const tsSnap = await getDoc(doc(db, 'test_scores', uid));
            if (tsSnap.exists()) test_scores = tsSnap.data().scores || {};
        } catch (e) { }
        try {
            const sgSnap = await getDoc(doc(db, 'skill_gaps', uid));
            if (sgSnap.exists()) { skill_results = sgSnap.data().skill_results || {}; totals = sgSnap.data().totals || {}; }
        } catch (e) { }
        try {
            const swotSnap = await getDoc(doc(db, 'swot_analyses', uid));
            if (swotSnap.exists()) swot = swotSnap.data() || {};
        } catch (e) { }
        return { role: match.role, match_pct: match.match_pct, profile, test_scores, skill_results, totals, swot };
    };

    const generateRoadmap = async (match) => {
        setGeneratingFor(match.role);
        setErrMsg('');
        try {
            const payload = await buildPayload(match);
            const res = await fetch('/api/roadmap/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (res.status === 404) {
                setErrMsg('Error 404: Endpoint not found. Please STOP and RESTART your Flask server (python run.py) to pick up the new code.');
                setGeneratingFor(null);
                return;
            }

            let data;
            const text = await res.text();
            try {
                data = JSON.parse(text);
            } catch (e) {
                setErrMsg(`Server Error (${res.status}): Invalid response format. Check if backend is running.`);
                setGeneratingFor(null);
                return;
            }

            if (!res.ok || data.error) {
                setErrMsg(data.error || `Generation failed (Status ${res.status}).`);
                setGeneratingFor(null);
                return;
            }

            setRoadmaps(prev => ({ ...prev, [match.role]: data }));
            setActiveRole(match.role);

            // Save to Firestore
            if (uid) {
                try {
                    const updatedRoadmaps = { ...roadmaps, [match.role]: data };
                    await setDoc(doc(db, 'roadmaps', uid), {
                        uid, roadmaps: updatedRoadmaps, updatedAt: serverTimestamp(),
                    }, { merge: true });
                    setSaved(prev => ({ ...prev, [match.role]: true }));
                } catch (e) { console.warn('Firestore save', e); }
            }
        } catch (e) { setErrMsg(`Network error: ${e.message}`); }
        setGeneratingFor(null);
    };

    /* ── Loading career matches ── */
    if (loadingMatches) return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 320, flexDirection: 'column', gap: 16 }}>
            <Loader2 size={36} color='#a855f7' style={{ animation: 'spin 1s linear infinite' }} />
            <p style={{ color: 'rgba(240,255,223,0.6)' }}>Loading your career data…</p>
        </div>
    );

    /* ── No career matches yet ── */
    if (careerMatches.length === 0) return (
        <div style={{ maxWidth: 520, margin: '48px auto', textAlign: 'center', padding: 24 }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🗺️</div>
            <h2 style={{ color: '#f0ffdf', fontSize: 20, marginBottom: 8 }}>No Career Matches Yet</h2>
            <p style={{ color: 'rgba(240,255,223,0.5)', fontSize: 13, lineHeight: 1.6 }}>
                Please complete the <strong>Career Match</strong> tab first to generate career matches,<br />
                then come back here for your personalised roadmap.
            </p>
        </div>
    );

    const roadmapData = roadmaps[activeRole];

    return (
        <div style={{ maxWidth: 960, margin: '0 auto', padding: '24px 16px' }}>

            {/* Header */}
            <div style={{ marginBottom: 20 }}>
                <h2 style={{ color: '#f0ffdf', fontSize: 20, fontWeight: 800, margin: 0 }}>Career Roadmap</h2>
                <p style={{ color: 'rgba(240,255,223,0.45)', fontSize: 13, marginTop: 4 }}>AI-generated · Powered by Gemini · Personalised for your profile</p>
            </div>

            {/* Error */}
            {errMsg && (
                <div style={{ background: 'rgba(248,113,113,0.12)', border: '1px solid #f87171', borderRadius: 10, padding: '12px 16px', marginBottom: 16, color: '#f87171', fontSize: 14 }}>
                    {errMsg}
                </div>
            )}

            {/* Floating career cards row */}
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 28 }}>
                {careerMatches.map((match, idx) => (
                    <FloatingCard
                        key={match.role}
                        match={match}
                        idx={idx}
                        isSelected={activeRole === match.role}
                        onSelect={() => setActiveRole(match.role)}
                        onGenerate={generateRoadmap}
                        generating={generatingFor === match.role}
                    />
                ))}
            </div>

            {/* Roadmap content */}
            {generatingFor === activeRole ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 280, gap: 16 }}>
                    <Loader2 size={40} color='#a855f7' style={{ animation: 'spin 1s linear infinite' }} />
                    <p style={{ color: 'rgba(240,255,223,0.7)', fontSize: 14 }}>Gemini is crafting your personalised roadmap for <strong style={{ color: '#c084fc', textTransform: 'capitalize' }}>{activeRole}</strong>…</p>
                    <p style={{ color: 'rgba(240,255,223,0.35)', fontSize: 12 }}>This may take 15–30 seconds</p>
                </div>
            ) : !roadmapData ? (
                <div style={{ border: '1px dashed rgba(255,255,255,0.1)', borderRadius: 14, padding: 40, textAlign: 'center' }}>
                    <div style={{ fontSize: 36, marginBottom: 10 }}>✨</div>
                    <p style={{ color: 'rgba(240,255,223,0.5)', fontSize: 14 }}>
                        Click <strong>"Generate Roadmap"</strong> on any card above to get your AI-powered career roadmap.
                    </p>
                </div>
            ) : (
                <div>
                    {/* Roadmap header */}
                    <div style={{ background: 'rgba(168,85,247,0.09)', border: '1px solid rgba(168,85,247,0.25)', borderRadius: 14, padding: '18px 22px', marginBottom: 20 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
                            <div>
                                <div style={{ color: '#c084fc', fontSize: 18, fontWeight: 800, textTransform: 'capitalize', marginBottom: 4 }}>
                                    🗺️ {roadmapData.role} Roadmap
                                </div>
                                <div style={{ color: 'rgba(240,255,223,0.5)', fontSize: 12 }}>⏱ Total Duration: <strong style={{ color: '#f0ffdf' }}>{roadmapData.total_duration}</strong></div>
                            </div>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                                {saved[activeRole] && <span style={{ color: '#4ade80', fontSize: 12 }}>✓ Saved</span>}
                                <button
                                    onClick={() => generateRoadmap(careerMatches.find(m => m.role === activeRole))}
                                    style={{ padding: '6px 14px', borderRadius: 7, border: '1px solid rgba(168,85,247,0.3)', background: 'transparent', color: '#c084fc', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
                                    ↺ Regenerate
                                </button>
                            </div>
                        </div>
                        <p style={{ color: 'rgba(240,255,223,0.65)', fontSize: 13, lineHeight: 1.6, marginTop: 10, marginBottom: 0 }}>
                            {roadmapData.summary}
                        </p>
                    </div>

                    {/* Phases */}
                    {(roadmapData.phases || []).map((phase, i) => (
                        <PhaseSection key={i} phase={phase} idx={i} />
                    ))}

                    {/* Final milestones */}
                    {roadmapData.final_milestones?.length > 0 && (
                        <div style={{ background: 'rgba(74,222,128,0.07)', border: '1px solid rgba(74,222,128,0.2)', borderRadius: 14, padding: '16px 20px', marginBottom: 14 }}>
                            <div style={{ color: '#4ade80', fontWeight: 700, fontSize: 13, marginBottom: 10 }}>🏁 Final Milestones</div>
                            {roadmapData.final_milestones.map((m, i) => (
                                <div key={i} style={{ color: 'rgba(240,255,223,0.7)', fontSize: 13, padding: '4px 0', borderBottom: i < roadmapData.final_milestones.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                                    ✦ {m}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Job-ready checklist */}
                    {roadmapData.job_ready_checklist?.length > 0 && (
                        <div style={{ background: 'rgba(251,191,36,0.07)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: 14, padding: '16px 20px' }}>
                            <div style={{ color: '#fbbf24', fontWeight: 700, fontSize: 13, marginBottom: 10 }}>✅ Job-Ready Checklist</div>
                            {roadmapData.job_ready_checklist.map((item, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, color: 'rgba(240,255,223,0.7)', fontSize: 13, padding: '4px 0' }}>
                                    <span style={{ color: '#fbbf24', marginTop: 1 }}>☐</span> {item}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
