import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import {
    Zap, ArrowRight, ArrowLeft, CheckCircle2, Loader2,
    User, Code2, BookOpen, Github, Plus, X, Briefcase,
} from 'lucide-react';

// ─── Tag Input Component ──────────────────────────────────────────────────────
const TagInput = ({ id, placeholder, tags, onAdd, onRemove, color = '#237227' }) => {
    const [inputVal, setInputVal] = useState('');

    const handleKey = (e) => {
        if ((e.key === 'Enter' || e.key === ',') && inputVal.trim()) {
            e.preventDefault();
            const val = inputVal.trim().replace(/,$/, '');
            if (val && !tags.includes(val)) onAdd(val);
            setInputVal('');
        }
        if (e.key === 'Backspace' && !inputVal && tags.length) {
            onRemove(tags[tags.length - 1]);
        }
    };

    return (
        <div className="flex flex-wrap gap-2 p-3 rounded-lg bg-[#2B2A2A] border border-[#237227] border-opacity-30 hover:border-opacity-60 focus-within:ring-2 focus-within:ring-[#237227] transition-all min-h-[48px]">
            {tags.map((tag) => (
                <span key={tag} className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium text-[#F0FFDF]"
                    style={{ backgroundColor: color + '33', border: `1px solid ${color}55` }}>
                    {tag}
                    <button type="button" onClick={() => onRemove(tag)}
                        className="ml-0.5 hover:opacity-70 transition-opacity" aria-label={`Remove ${tag}`}>
                        <X size={11} />
                    </button>
                </span>
            ))}
            <input
                id={id}
                type="text"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                onKeyDown={handleKey}
                placeholder={tags.length === 0 ? placeholder : ''}
                className="flex-1 min-w-[120px] bg-transparent text-[#F0FFDF] text-sm outline-none placeholder-[#F0FFDF] placeholder-opacity-30"
            />
        </div>
    );
};

// ─── Step indicator ───────────────────────────────────────────────────────────
const StepBar = ({ step, total }) => (
    <div className="flex items-center gap-2 mb-8">
        {Array.from({ length: total }).map((_, i) => (
            <React.Fragment key={i}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${i < step ? 'bg-[#237227] text-[#F0FFDF]'
                    : i === step ? 'bg-[#237227] bg-opacity-30 text-[#237227] ring-2 ring-[#237227]'
                        : 'bg-[#3a3a3a] text-[#F0FFDF] opacity-40'
                    }`}>
                    {i < step ? <CheckCircle2 size={14} /> : i + 1}
                </div>
                {i < total - 1 && (
                    <div className={`flex-1 h-0.5 rounded-full transition-all duration-500 ${i < step ? 'bg-[#237227]' : 'bg-[#3a3a3a]'}`} />
                )}
            </React.Fragment>
        ))}
    </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────
const STEPS = ['Personal Details', 'Skills & Interests', 'Online Presence'];

const Profile = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [step, setStep] = useState(0);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState('');

    const [form, setForm] = useState({
        fullName: '',
        degree: '',
        educationalLevel: '',
        currentYear: '',
        skills: [],
        interests: [],
        languages: [],
        skillLevel: '',
        githubLink: '',
    });

    const setField = (key, val) => setForm((f) => ({ ...f, [key]: val }));
    const addTag = (key, val) => setForm((f) => ({ ...f, [key]: [...f[key], val] }));
    const removeTag = (key, val) => setForm((f) => ({ ...f, [key]: f[key].filter((t) => t !== val) }));

    // ─── Validation per step ──────────────────────────────────────────────────
    const validateStep = () => {
        setError('');
        if (step === 0) {
            if (!form.fullName.trim()) return setError('Full name is required.'), false;
            if (!form.degree.trim()) return setError('Degree is required.'), false;
            if (!form.educationalLevel) return setError('Please select your educational level.'), false;
            if (!form.currentYear) return setError('Please select your current year.'), false;
        }
        if (step === 1) {
            if (form.skills.length === 0) return setError('Add at least one skill.'), false;
            if (form.interests.length === 0) return setError('Add at least one interest.'), false;
            if (form.languages.length === 0) return setError('Add at least one language or framework.'), false;
            if (!form.skillLevel) return setError('Please select your skill level.'), false;
        }
        return true;
    };

    const next = () => { if (validateStep()) setStep((s) => s + 1); };
    const back = () => { setError(''); setStep((s) => s - 1); };

    // ─── Save to Firestore ────────────────────────────────────────────────────
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateStep()) return;

        if (!user?.uid) {
            setError('You must be logged in to save your profile. Please sign up first.');
            return;
        }

        setSaving(true);
        setError('');
        try {
            await updateDoc(doc(db, 'users', user.uid), {
                fullName: form.fullName.trim(),
                degree: form.degree.trim(),
                educationalLevel: form.educationalLevel,
                currentYear: Number(form.currentYear),
                skills: form.skills,
                interests: form.interests,
                languages: form.languages,
                skillLevel: form.skillLevel,
                githubLink: form.githubLink.trim() || null,
                profileCompletedAt: serverTimestamp(),
            });
            navigate('/dashboard');
        } catch (err) {
            console.error('[Profile] Save failed:', err);
            setError('Failed to save profile. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    // ─── Success screen ────────────────────────────────────────────────────────
    if (saved) {
        return (
            <div className="min-h-screen bg-[#2B2A2A] flex items-center justify-center px-4">
                <div className="text-center" style={{ animation: 'fadeUp 0.6s ease-out forwards' }}>
                    <div className="w-20 h-20 bg-[#237227] rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle2 size={40} className="text-[#F0FFDF]" />
                    </div>
                    <h2 className="text-3xl font-bold text-[#F0FFDF] mb-2">Profile Complete!</h2>
                    <p className="text-[#F0FFDF] opacity-60 mb-8 max-w-sm mx-auto text-sm">
                        Your profile has been saved. You're ready to start your SkillBridge journey.
                    </p>
                    <button onClick={() => navigate('/')}
                        className="bg-[#237227] text-[#F0FFDF] px-8 py-3 rounded-lg font-bold hover:bg-opacity-90 transition-all inline-flex items-center gap-2 group">
                        Go to Home <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                </div>
                <style>{`@keyframes fadeUp { from { opacity:0; transform:translateY(24px); } to { opacity:1; transform:translateY(0); } }`}</style>
            </div>
        );
    }

    // ─── Shared select classes ─────────────────────────────────────────────────
    const selectCls = "w-full px-4 py-3 rounded-lg bg-[#2B2A2A] border border-[#237227] border-opacity-30 hover:border-opacity-60 text-[#F0FFDF] text-sm focus:outline-none focus:ring-2 focus:ring-[#237227] transition-all appearance-none cursor-pointer";
    const inputCls = "w-full px-4 py-3 rounded-lg bg-[#2B2A2A] border border-[#237227] border-opacity-30 hover:border-opacity-60 text-[#F0FFDF] placeholder-[#F0FFDF] placeholder-opacity-30 text-sm focus:outline-none focus:ring-2 focus:ring-[#237227] transition-all";
    const labelCls = "block text-sm font-medium text-[#F0FFDF] opacity-80 mb-1.5";
    const hintCls = "text-xs text-[#F0FFDF] opacity-40 mt-1";

    return (
        <div className="min-h-screen bg-[#2B2A2A] text-[#F0FFDF] flex flex-col"
            style={{ fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif" }}>

            {/* Background blobs */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute w-96 h-96 bg-[#237227] rounded-full filter blur-3xl opacity-5"
                    style={{ animation: 'blob 8s ease-in-out infinite', top: '-5%', right: '-5%' }} />
                <div className="absolute w-80 h-80 bg-[#237227] rounded-full filter blur-3xl opacity-5"
                    style={{ animation: 'blob 10s ease-in-out infinite reverse', bottom: '-5%', left: '-5%' }} />
            </div>

            {/* Navbar */}
            <nav className="relative z-10 w-full px-6 py-4 flex items-center justify-between border-b border-[#237227] border-opacity-20 bg-[#2B2A2A] bg-opacity-90 backdrop-blur-md">
                <Link to="/" className="flex items-center space-x-2 group">
                    <div className="w-9 h-9 bg-[#237227] rounded-lg flex items-center justify-center group-hover:bg-opacity-80 transition-all">
                        <Zap className="text-[#F0FFDF]" size={20} />
                    </div>
                    <span className="text-lg font-bold text-[#F0FFDF]">SkillBridge</span>
                </Link>
                <span className="text-[#F0FFDF] opacity-50 text-sm">
                    Step {step + 1} of {STEPS.length} — <span className="text-[#237227] opacity-100">{STEPS[step]}</span>
                </span>
            </nav>

            {/* Content */}
            <div className="relative z-10 flex-1 flex items-start justify-center px-4 py-10">
                <div className="w-full max-w-xl" style={{ animation: 'fadeUp 0.5s ease-out forwards' }}>

                    {/* Page header */}
                    <div className="mb-6">
                        <h1 className="text-2xl font-bold text-[#F0FFDF]">Complete Your Profile</h1>
                        <p className="text-[#F0FFDF] opacity-50 text-sm mt-1">
                            Tell us about yourself so we can personalise your career roadmap.
                        </p>
                    </div>

                    {/* Step bar */}
                    <StepBar step={step} total={STEPS.length} />

                    {/* Error banner */}
                    {error && (
                        <div className="mb-5 px-4 py-3 rounded-lg bg-red-900 bg-opacity-30 border border-red-500 border-opacity-50 text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    {/* Card */}
                    <div className="bg-[#1F1F1F] border border-[#237227] border-opacity-20 rounded-2xl p-7 shadow-2xl">

                        {/* ── STEP 0: Personal Details ─────────────────────────────────── */}
                        {step === 0 && (
                            <div className="space-y-5">
                                <div className="flex items-center gap-2 mb-1 text-[#237227]">
                                    <User size={18} /><span className="font-semibold text-sm">Personal Details</span>
                                </div>

                                {/* Full Name */}
                                <div>
                                    <label htmlFor="fullName" className={labelCls}>Full Name</label>
                                    <input id="fullName" type="text" value={form.fullName}
                                        onChange={(e) => setField('fullName', e.target.value)}
                                        placeholder="e.g. Elon Musk" className={inputCls} />
                                </div>

                                {/* Degree */}
                                <div>
                                    <label htmlFor="degree" className={labelCls}>Degree</label>
                                    <input id="degree" type="text" value={form.degree}
                                        onChange={(e) => setField('degree', e.target.value)}
                                        placeholder="e.g. Computer Engineering" className={inputCls} />
                                </div>

                                {/* Educational Level + Current Year — side by side */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label htmlFor="educationalLevel" className={labelCls}>Educational Level</label>
                                        <select id="educationalLevel" value={form.educationalLevel}
                                            onChange={(e) => setField('educationalLevel', e.target.value)} className={selectCls}>
                                            <option value="" disabled>Select…</option>
                                            <option value="Diploma">Diploma</option>
                                            <option value="Bachelor">Bachelor</option>
                                            <option value="Masters">Masters</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label htmlFor="currentYear" className={labelCls}>Current Year</label>
                                        <select id="currentYear" value={form.currentYear}
                                            onChange={(e) => setField('currentYear', e.target.value)} className={selectCls}>
                                            <option value="" disabled>Select…</option>
                                            {[1, 2, 3, 4].map((y) => (
                                                <option key={y} value={y}>Year {y}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ── STEP 1: Skills & Interests ───────────────────────────────── */}
                        {step === 1 && (
                            <div className="space-y-5">
                                <div className="flex items-center gap-2 mb-1 text-[#237227]">
                                    <Code2 size={18} /><span className="font-semibold text-sm">Skills &amp; Interests</span>
                                </div>

                                {/* Skills */}
                                <div>
                                    <label htmlFor="skills-input" className={labelCls}>Skills</label>
                                    <TagInput id="skills-input" placeholder="Type a skill and press Enter…"
                                        tags={form.skills} onAdd={(v) => addTag('skills', v)} onRemove={(v) => removeTag('skills', v)} />
                                    <p className={hintCls}>e.g. Web Development · Data Analysis · Software Engineering</p>
                                </div>

                                {/* Interests */}
                                <div>
                                    <label htmlFor="interests-input" className={labelCls}>Interests / Career Goals</label>
                                    <TagInput id="interests-input" placeholder="Type an interest and press Enter…"
                                        tags={form.interests} onAdd={(v) => addTag('interests', v)} onRemove={(v) => removeTag('interests', v)}
                                        color="#1e6ec8" />
                                    <p className={hintCls}>e.g. AI Engineer · Data Scientist · Web Developer</p>
                                </div>

                                {/* Languages / Frameworks */}
                                <div>
                                    <label htmlFor="languages-input" className={labelCls}>Languages &amp; Frameworks</label>
                                    <TagInput id="languages-input" placeholder="Type a language and press Enter…"
                                        tags={form.languages} onAdd={(v) => addTag('languages', v)} onRemove={(v) => removeTag('languages', v)}
                                        color="#7c3aed" />
                                    <p className={hintCls}>e.g. Python · React · Java · C++</p>
                                </div>

                                {/* Skill Level */}
                                <div>
                                    <label className={labelCls}>Overall Skill Level</label>
                                    <div className="flex gap-3">
                                        {['Beginner', 'Intermediate', 'Advanced'].map((lvl) => (
                                            <button key={lvl} type="button"
                                                onClick={() => setField('skillLevel', lvl)}
                                                className={`flex-1 py-3 rounded-lg text-sm font-semibold border transition-all duration-200 ${form.skillLevel === lvl
                                                    ? 'bg-[#237227] border-[#237227] text-[#F0FFDF] shadow-lg'
                                                    : 'border-[#237227] border-opacity-30 text-[#F0FFDF] opacity-60 hover:opacity-100 hover:border-opacity-60'
                                                    }`}>
                                                {lvl}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ── STEP 2: Online Presence ──────────────────────────────────── */}
                        {step === 2 && (
                            <div className="space-y-5">
                                <div className="flex items-center gap-2 mb-1 text-[#237227]">
                                    <Github size={18} /><span className="font-semibold text-sm">Online Presence</span>
                                </div>

                                <div>
                                    <label htmlFor="githubLink" className={labelCls}>
                                        GitHub Profile <span className="text-[#F0FFDF] opacity-40 font-normal">(optional)</span>
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <Github size={16} className="text-[#237227] opacity-70" />
                                        </div>
                                        <input id="githubLink" type="url" value={form.githubLink}
                                            onChange={(e) => setField('githubLink', e.target.value)}
                                            placeholder="https://github.com/your-username"
                                            className={`${inputCls} pl-9`} />
                                    </div>
                                    <p className={hintCls}>Sharing your GitHub helps our AI analyse your actual code skills.</p>
                                </div>

                                {/* Summary review card */}
                                <div className="mt-4 bg-[#2B2A2A] rounded-xl p-5 border border-[#237227] border-opacity-20">
                                    <p className="text-xs font-semibold text-[#237227] uppercase tracking-wider mb-3">Profile Summary</p>
                                    <dl className="space-y-2 text-sm">
                                        {[
                                            ['Name', form.fullName],
                                            ['Degree', `${form.degree || '—'} · ${form.educationalLevel || '—'} · Year ${form.currentYear || '—'}`],
                                            ['Skills', form.skills.join(', ') || '—'],
                                            ['Interests', form.interests.join(', ') || '—'],
                                            ['Languages', form.languages.join(', ') || '—'],
                                            ['Skill Level', form.skillLevel || '—'],
                                        ].map(([k, v]) => (
                                            <div key={k} className="flex gap-2">
                                                <dt className="w-24 text-[#F0FFDF] opacity-40 shrink-0">{k}</dt>
                                                <dd className="text-[#F0FFDF] opacity-80 break-words">{v}</dd>
                                            </div>
                                        ))}
                                    </dl>
                                </div>
                            </div>
                        )}

                        {/* Navigation buttons */}
                        <div className="flex gap-3 mt-7">
                            {step > 0 && (
                                <button type="button" onClick={back}
                                    className="flex-1 py-3 rounded-lg font-bold border border-[#237227] border-opacity-40 text-[#237227] hover:border-opacity-80 transition-all flex items-center justify-center gap-2">
                                    <ArrowLeft size={17} /> Back
                                </button>
                            )}
                            {step < STEPS.length - 1 ? (
                                <button type="button" onClick={next}
                                    className="flex-1 bg-[#237227] text-[#F0FFDF] py-3 rounded-lg font-bold hover:bg-opacity-90 transition-all flex items-center justify-center gap-2 group shadow-lg">
                                    Next <ArrowRight size={17} className="group-hover:translate-x-1 transition-transform" />
                                </button>
                            ) : (
                                <button type="button" onClick={handleSubmit} disabled={saving}
                                    className="flex-1 bg-[#237227] text-[#F0FFDF] py-3 rounded-lg font-bold hover:bg-opacity-90 transition-all flex items-center justify-center gap-2 group shadow-lg disabled:opacity-70 disabled:cursor-not-allowed">
                                    {saving ? <><Loader2 size={17} className="animate-spin" /> Saving…</> : <>Save Profile <CheckCircle2 size={17} /></>}
                                </button>
                            )}
                        </div>
                    </div>

                    <p className="text-center text-xs text-[#F0FFDF] opacity-30 mt-4">
                        You can update your profile at any time from your dashboard.
                    </p>
                </div>
            </div>

            <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(24px); } to { opacity:1; transform:translateY(0); } }
        @keyframes blob {
          0%,100% { transform:translate(0,0) scale(1); }
          33%  { transform:translate(20px,-20px) scale(1.05); }
          66%  { transform:translate(-10px,15px) scale(0.97); }
        }
        select option { background-color: #1F1F1F; color: #F0FFDF; }
      `}</style>
        </div>
    );
};

export default Profile;
