import React, { useState } from 'react';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { Loader2 } from 'lucide-react';

const RANK_MEDAL = ['🥇', '🥈', '🥉'];
const RANK_COLORS = ['#ffd700', '#c0c0c0', '#cd7f32'];

function ScoreBar({ label, score, weighted, weight, color, formula }) {
    const pct = Math.round(score * 100);
    return (
        <div style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 12 }}>
                <span style={{ color: 'rgba(240,255,223,0.75)', fontWeight: 600 }}>{label}</span>
                <span style={{ color, fontWeight: 700 }}>{pct}%{' '}
                    <span style={{ color: 'rgba(240,255,223,0.38)', fontWeight: 400 }}>×{weight} → {Math.round(weighted * 100)}%</span>
                </span>
            </div>
            <div style={{ height: 7, borderRadius: 99, background: 'rgba(255,255,255,0.07)' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 99, transition: 'width 0.6s ease' }} />
            </div>
            <div style={{ fontFamily: 'monospace', fontSize: 12, color: 'rgba(240,255,223,0.85)', marginTop: 2 }}>{formula}</div>
        </div>
    );
}

export default function CareerMatchTab({ user }) {
    const [state, setState] = useState('idle');
    const [matchData, setMatchData] = useState(null);
    const [errMsg, setErrMsg] = useState('');
    const [saved, setSaved] = useState(false);
    const [expanded, setExpanded] = useState({});

    const uid = user?.uid;
    const skills = user?.skills || [];
    const interests = user?.interests || [];

    const runMatch = async () => {
        setState('loading'); setErrMsg('');
        let test_scores = {};
        try {
            const snap = await getDoc(doc(db, 'test_scores', uid));
            if (snap.exists()) test_scores = snap.data().scores || {};
        } catch (e) { console.warn('Firestore test_scores', e); }

        try {
            const res = await fetch('/api/career/match', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ skills, interests, test_scores }),
            });
            const data = await res.json();
            if (!res.ok || data.error) { setErrMsg(data.error || 'Matching failed.'); setState('error'); return; }
            setMatchData(data);
            setState('done');
            if (uid) {
                try {
                    await setDoc(doc(db, 'career_matches', uid), {
                        uid,
                        top_matches: data.top_matches.map(m => ({ role: m.role, domain: m.domain, match_pct: m.match_pct })),
                        all_scores: data.all_scores,
                        calculatedAt: serverTimestamp(),
                    }, { merge: true });
                    setSaved(true);
                } catch (e) { console.warn('Firestore save', e); }
            }
        } catch (e) { setErrMsg(`Network error: ${e.message}`); setState('error'); }
    };

    /* ── IDLE / ERROR ── */
    if (state === 'idle' || state === 'error') return (
        <div style={{ maxWidth: 640, margin: '0 auto', padding: 24 }}>
            {errMsg && <div style={{ background: 'rgba(248,113,113,0.12)', border: '1px solid #f87171', borderRadius: 10, padding: '12px 16px', marginBottom: 16, color: '#f87171', fontSize: 14 }}>{errMsg}</div>}
            <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 32, textAlign: 'center' }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>🎯</div>
                <h2 style={{ color: '#f0ffdf', fontSize: 22, marginBottom: 8 }}>Career Matching</h2>
                <p style={{ color: 'rgba(240,255,223,0.5)', fontSize: 13, marginBottom: 28, lineHeight: 1.6 }}>
                    Analyses your <strong>skills</strong>, <strong>interests</strong> &amp; <strong>assessment scores</strong><br />
                    to find your top 3 most suitable career roles.
                </p>
                <button onClick={runMatch}
                    style={{ background: 'linear-gradient(135deg,#f59e0b,#ef4444)', color: '#fff', border: 'none', borderRadius: 10, padding: '12px 36px', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
                    Find My Best Career Match
                </button>
            </div>
        </div>
    );

    /* ── LOADING ── */
    if (state === 'loading') return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 320, gap: 16 }}>
            <Loader2 size={40} color='#f59e0b' style={{ animation: 'spin 1s linear infinite' }} />
            <p style={{ color: 'rgba(240,255,223,0.7)' }}>Finding your best career matches…</p>
        </div>
    );

    /* ── RESULTS ── */
    const { top_matches, all_scores, formula_legend } = matchData;

    return (
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 16px' }}>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
                <div>
                    <h2 style={{ color: '#f0ffdf', fontSize: 20, fontWeight: 800, margin: 0 }}>Your Top Career Matches</h2>
                    <p style={{ color: 'rgba(240,255,223,0.45)', fontSize: 13, marginTop: 4 }}>
                        Skills · Interests · Assessment scores
                        {saved && <span style={{ color: '#4ade80', marginLeft: 12 }}>✓ Saved</span>}
                    </p>
                </div>
                <button onClick={() => { setState('idle'); setMatchData(null); setSaved(false); setExpanded({}); }}
                    style={{ padding: '8px 18px', borderRadius: 8, border: '1px solid rgba(245,158,11,0.35)', background: 'transparent', color: '#fbbf24', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                    ↺ Recalculate
                </button>
            </div>

            {/* Formula legend */}
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '14px 18px', marginBottom: 18 }}>
                <div style={{ color: '#f0ffdf', fontSize: 12, fontWeight: 700, marginBottom: 8 }}>📐 Formula Applied</div>
                {Object.values(formula_legend).map((v, i) => (
                    <div key={i} style={{ fontFamily: 'monospace', fontSize: 13, color: 'rgba(240,255,223,0.9)', padding: '3px 0' }}>{v}</div>
                ))}
            </div>

            {/* All roles overview */}
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '14px 18px', marginBottom: 22 }}>
                <div style={{ color: '#f0ffdf', fontSize: 12, fontWeight: 700, marginBottom: 10 }}>All Roles — Match Score</div>
                {all_scores.map((r, i) => (
                    <div key={i} style={{ marginBottom: 8 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
                            <span style={{ color: 'rgba(240,255,223,0.7)', textTransform: 'capitalize' }}>{r.role}</span>
                            <span style={{ color: '#fbbf24', fontWeight: 700 }}>{r.match_pct}%</span>
                        </div>
                        <div style={{ height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.06)' }}>
                            <div style={{ height: '100%', width: `${r.match_pct}%`, background: 'linear-gradient(90deg,#f59e0b,#ef4444)', borderRadius: 99 }} />
                        </div>
                    </div>
                ))}
            </div>

            {/* Top-3 role cards */}
            {top_matches.map((match, idx) => {
                const medal = RANK_MEDAL[idx];
                const rankColor = RANK_COLORS[idx];
                const bd = match.breakdown;
                const isOpen = expanded[idx];

                return (
                    <div key={idx} style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${rankColor}44`, borderRadius: 20, padding: 24, marginBottom: 20, boxShadow: `0 0 28px ${rankColor}14` }}>

                        {/* Card header */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 36 }}>{medal}</span>
                            <div style={{ flex: 1 }}>
                                <div style={{ color: rankColor, fontSize: 20, fontWeight: 800, textTransform: 'capitalize' }}>{match.role}</div>
                                <div style={{ color: 'rgba(240,255,223,0.4)', fontSize: 12, marginTop: 2, textTransform: 'capitalize' }}>Domain: {match.domain}</div>
                            </div>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: 42, fontWeight: 900, color: rankColor, lineHeight: 1 }}>{match.match_pct}%</div>
                                <div style={{ fontSize: 11, color: 'rgba(240,255,223,0.38)', marginTop: 2 }}>Career Match</div>
                            </div>
                        </div>

                        {/* Description */}
                        {match.description && (
                            <p style={{ color: 'rgba(240,255,223,0.6)', fontSize: 13, lineHeight: 1.6, marginBottom: 18, borderLeft: `3px solid ${rankColor}55`, paddingLeft: 12 }}>
                                {match.description.split(':contentReference')[0].trim()}
                            </p>
                        )}

                        {/* Sub-score bars */}
                        <div style={{ marginBottom: 14 }}>
                            <ScoreBar label="📊 Test Alignment" score={bd.test_alignment.score} weighted={bd.test_alignment.weighted} weight={bd.test_alignment.weight} color="#60a5fa" formula={bd.test_alignment.formula} />
                            <ScoreBar label="🎯 Skill Overlap" score={bd.skill_overlap.score} weighted={bd.skill_overlap.weighted} weight={bd.skill_overlap.weight} color="#4ade80" formula={bd.skill_overlap.formula} />
                            <ScoreBar label="💡 Interest Match" score={bd.interest_score.score} weighted={bd.interest_score.weighted} weight={bd.interest_score.weight} color="#fbbf24" formula={bd.interest_score.formula} />
                        </div>

                        {/* Final formula */}
                        <div style={{ fontFamily: 'monospace', fontSize: 13, color: '#FFFFFF', background: `${rankColor}15`, border: `1px solid ${rankColor}33`, borderRadius: 8, padding: '10px 14px', marginBottom: 16 }}>
                            {bd.final.formula}
                        </div>

                        {/* Matched / Missing skills */}
                        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 16 }}>
                            <div style={{ flex: 1, minWidth: 180 }}>
                                <div style={{ fontSize: 12, color: '#4ade80', fontWeight: 700, marginBottom: 6 }}>✓ Matched Skills ({match.matched_skills.length})</div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                                    {match.matched_skills.map(s => <span key={s} style={{ background: 'rgba(74,222,128,0.09)', border: '1px solid rgba(74,222,128,0.28)', color: '#4ade80', borderRadius: 99, padding: '2px 8px', fontSize: 11, textTransform: 'capitalize' }}>{s}</span>)}
                                    {match.matched_skills.length === 0 && <span style={{ color: 'rgba(240,255,223,0.3)', fontSize: 11 }}>None yet</span>}
                                </div>
                            </div>
                            <div style={{ flex: 1, minWidth: 180 }}>
                                <div style={{ fontSize: 12, color: '#f87171', fontWeight: 700, marginBottom: 6 }}>✗ Skills to Learn ({match.missing_skills.length})</div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                                    {match.missing_skills.slice(0, 7).map(s => <span key={s} style={{ background: 'rgba(248,113,113,0.09)', border: '1px solid rgba(248,113,113,0.22)', color: '#f87171', borderRadius: 99, padding: '2px 8px', fontSize: 11, textTransform: 'capitalize' }}>{s}</span>)}
                                </div>
                            </div>
                        </div>

                        {/* Salary band */}
                        {Object.keys(match.salary_india || {}).length > 0 && (
                            <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: '10px 14px', marginBottom: 14, fontSize: 12 }}>
                                <span style={{ color: 'rgba(240,255,223,0.45)', marginRight: 8 }}>💰 India Salary:</span>
                                {Object.entries(match.salary_india).map(([k, v]) => (
                                    <span key={k} style={{ color: '#fbbf24', marginRight: 16 }}>
                                        <span style={{ color: 'rgba(240,255,223,0.38)', textTransform: 'capitalize' }}>{k.replace(/_/g, ' ')}: </span>{v}
                                    </span>
                                ))}
                            </div>
                        )}

                        {/* Expand step-by-step */}
                        <button onClick={() => setExpanded(e => ({ ...e, [idx]: !e[idx] }))}
                            style={{ width: '100%', padding: '8px 0', borderRadius: 8, border: `1px solid ${rankColor}33`, background: 'transparent', color: `${rankColor}bb`, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                            {isOpen ? '▲ Hide' : '▼ Show'} Step-by-Step Test Alignment Calculation
                        </button>

                        {isOpen && (
                            <div style={{ overflowX: 'auto', marginTop: 14 }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                                    <thead>
                                        <tr>{['Skill', 'Your Score', 'Benchmark', 'Contribution = min(U,B)', 'Formula'].map(h => (
                                            <th key={h} style={{ textAlign: 'left', padding: '6px 8px', color: 'rgba(240,255,223,0.4)', fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.07)', whiteSpace: 'nowrap' }}>{h}</th>
                                        ))}</tr>
                                    </thead>
                                    <tbody>
                                        {match.test_steps.map((s, i) => (
                                            <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                                <td style={{ padding: '6px 8px', color: 'rgba(240,255,223,0.8)', fontWeight: 600, textTransform: 'capitalize' }}>{s.skill}</td>
                                                <td style={{ padding: '6px 8px', color: '#60a5fa', fontFamily: 'monospace' }}>{Math.round(s.user_score * 100)}%</td>
                                                <td style={{ padding: '6px 8px', color: '#a5b4fc', fontFamily: 'monospace' }}>{Math.round(s.benchmark * 100)}%</td>
                                                <td style={{ padding: '6px 8px', color: s.contribution > 0 ? '#4ade80' : 'rgba(240,255,223,0.2)', fontFamily: 'monospace', fontWeight: 700 }}>{Math.round(s.contribution * 100)}%</td>
                                                <td style={{ padding: '6px 8px', color: 'rgba(240,255,223,0.85)', fontFamily: 'monospace', fontSize: 12 }}>{s.formula}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr style={{ background: 'rgba(255,255,255,0.03)', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                                            <td colSpan={3} style={{ padding: '8px', color: 'rgba(240,255,223,0.6)', fontWeight: 700 }}>test_alignment</td>
                                            <td colSpan={2} style={{ padding: '8px', color: '#FFFFFF', fontFamily: 'monospace', fontSize: 13, fontWeight: 800 }}>{bd.test_alignment.formula}</td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
