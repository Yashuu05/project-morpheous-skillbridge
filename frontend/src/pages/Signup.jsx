import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Zap, Eye, EyeOff, ArrowRight, ArrowLeft, User, Lock, CheckCircle2, Loader2 } from 'lucide-react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';

const Signup = () => {
    const navigate = useNavigate();

    const [formData, setFormData] = useState({ username: '', password: '', confirmPassword: '' });
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [errors, setErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [firebaseError, setFirebaseError] = useState('');

    // ─── Password strength ─────────────────────────────────────────────────────
    const getPasswordStrength = (pwd) => {
        if (!pwd) return { level: 0, label: '', color: '' };
        let score = 0;
        if (pwd.length >= 8) score++;
        if (/[A-Z]/.test(pwd)) score++;
        if (/[0-9]/.test(pwd)) score++;
        if (/[^A-Za-z0-9]/.test(pwd)) score++;
        const map = [
            { level: 0, label: '', color: '' },
            { level: 1, label: 'Weak', color: '#ef4444' },
            { level: 2, label: 'Fair', color: '#f97316' },
            { level: 3, label: 'Good', color: '#eab308' },
            { level: 4, label: 'Strong', color: '#237227' },
        ];
        return map[score] || map[0];
    };

    const strength = getPasswordStrength(formData.password);

    // ─── Validation ────────────────────────────────────────────────────────────
    const validate = () => {
        const errs = {};
        if (!formData.username.trim()) {
            errs.username = 'Username is required';
        } else if (formData.username.trim().length < 3) {
            errs.username = 'Username must be at least 3 characters';
        } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username.trim())) {
            errs.username = 'Only letters, numbers, and underscores allowed';
        }
        if (!formData.password) {
            errs.password = 'Password is required';
        } else if (formData.password.length < 8) {
            errs.password = 'Password must be at least 8 characters';
        }
        if (!formData.confirmPassword) {
            errs.confirmPassword = 'Please confirm your password';
        } else if (formData.password !== formData.confirmPassword) {
            errs.confirmPassword = 'Passwords do not match';
        }
        return errs;
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
        if (firebaseError) setFirebaseError('');
    };

    // ─── Submit — Firebase Auth + Firestore ────────────────────────────────────
    const handleSubmit = async (e) => {
        e.preventDefault();
        setFirebaseError('');

        const errs = validate();
        if (Object.keys(errs).length > 0) {
            setErrors(errs);
            return;
        }

        setSubmitting(true);
        const username = formData.username.trim().toLowerCase();

        try {
            // 1️⃣  Firebase Auth — password is hashed by Firebase, never stored in plain text
            //     We generate a synthetic email since Firebase Auth requires one.
            const internalEmail = `${username}@skillbridge.app`;
            const credential = await createUserWithEmailAndPassword(auth, internalEmail, formData.password);
            const uid = credential.user.uid;

            // 2️⃣  Firestore — save user profile (NO password stored here)
            await setDoc(doc(db, 'users', uid), {
                uid,
                username: formData.username.trim(),    // preserve original casing
                usernameLower: username,               // for case-insensitive lookups
                createdAt: serverTimestamp(),
            });

            // Redirect to profile completion page
            navigate('/profile');
        } catch (err) {
            // Map Firebase error codes to human-readable messages
            const msgMap = {
                'auth/email-already-in-use': 'This username is already taken. Please choose another.',
                'auth/weak-password': 'Password is too weak. Please use at least 8 characters.',
                'auth/network-request-failed': 'Network error. Please check your connection and try again.',
                'auth/too-many-requests': 'Too many attempts. Please wait a moment and try again.',
            };
            setFirebaseError(msgMap[err.code] || `Signup failed: ${err.message}`);
        } finally {
            setSubmitting(false);
        }
    };

    // ─── Progress calculation ──────────────────────────────────────────────────
    const fields = [formData.username, formData.password, formData.confirmPassword];
    const filledFields = fields.filter(f => f.trim().length > 0).length;
    const progress = Math.round((filledFields / fields.length) * 100);

    // ─── Signup form ───────────────────────────────────────────────────────────
    return (
        <div
            className="min-h-screen bg-[#2B2A2A] text-[#F0FFDF] flex flex-col"
            style={{ fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif" }}
        >
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
                <Link to="/" className="flex items-center gap-2 text-[#F0FFDF] opacity-70 hover:opacity-100 hover:text-[#237227] transition-all text-sm font-medium">
                    <ArrowLeft size={16} /> Back to Home
                </Link>
            </nav>

            {/* Main content */}
            <div className="relative z-10 flex-1 flex items-center justify-center px-4 py-12">
                <div className="w-full max-w-md" style={{ animation: 'fadeUp 0.5s ease-out forwards' }}>

                    {/* Card */}
                    <div className="bg-[#1F1F1F] border border-[#237227] border-opacity-30 rounded-2xl p-8 shadow-2xl">

                        {/* Header */}
                        <div className="text-center mb-8">
                            <div className="w-14 h-14 bg-[#237227] bg-opacity-20 rounded-xl flex items-center justify-center mx-auto mb-4">
                                <User size={28} className="text-[#237227]" />
                            </div>
                            <h1 className="text-2xl font-bold text-[#F0FFDF] mb-1">Create Your Account</h1>
                            <p className="text-[#F0FFDF] opacity-60 text-sm">Start your career journey with SkillBridge</p>
                        </div>

                        {/* Firebase-level error banner */}
                        {firebaseError && (
                            <div className="mb-4 px-4 py-3 rounded-lg bg-red-900 bg-opacity-30 border border-red-500 border-opacity-50 text-red-400 text-sm" style={{ animation: 'shake 0.4s ease-in-out' }}>
                                {firebaseError}
                            </div>
                        )}

                        {/* Progress Bar */}
                        <div className="mb-6">
                            <div className="flex justify-between items-end mb-1.5">
                                <span className="text-[10px] uppercase tracking-wider font-bold text-[#237227] opacity-80">Signup Progress</span>
                                <span className="text-xs font-bold text-[#F0FFDF]">{progress}%</span>
                            </div>
                            <div className="h-1.5 w-full bg-[#2B2A2A] rounded-full overflow-hidden border border-[#237227] border-opacity-10">
                                <div
                                    className="h-full bg-[#237227] transition-all duration-500 ease-out shadow-[0_0_10px_rgba(35,114,39,0.3)]"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleSubmit} className="space-y-5" noValidate>

                            {/* Username */}
                            <div>
                                <label htmlFor="username" className="block text-sm font-medium text-[#F0FFDF] opacity-80 mb-1.5">
                                    Username
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <User size={16} className="text-[#237227] opacity-70" />
                                    </div>
                                    <input
                                        id="username"
                                        name="username"
                                        type="text"
                                        autoComplete="username"
                                        autoFocus
                                        value={formData.username}
                                        onChange={handleChange}
                                        placeholder="e.g. john_doe"
                                        disabled={submitting}
                                        className={`w-full pl-9 pr-4 py-3 rounded-lg bg-[#2B2A2A] border text-[#F0FFDF] placeholder-[#F0FFDF] placeholder-opacity-30 text-sm focus:outline-none focus:ring-2 focus:ring-[#237227] transition-all disabled:opacity-50 ${errors.username
                                            ? 'border-red-500 border-opacity-80'
                                            : 'border-[#237227] border-opacity-30 hover:border-opacity-60'
                                            }`}
                                    />
                                </div>
                                {errors.username && <p className="mt-1.5 text-xs text-red-400">{errors.username}</p>}
                            </div>

                            {/* Password */}
                            <div>
                                <label htmlFor="password" className="block text-sm font-medium text-[#F0FFDF] opacity-80 mb-1.5">
                                    Password
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Lock size={16} className="text-[#237227] opacity-70" />
                                    </div>
                                    <input
                                        id="password"
                                        name="password"
                                        type={showPassword ? 'text' : 'password'}
                                        autoComplete="new-password"
                                        value={formData.password}
                                        onChange={handleChange}
                                        placeholder="Min 8 characters"
                                        disabled={submitting}
                                        className={`w-full pl-9 pr-10 py-3 rounded-lg bg-[#2B2A2A] border text-[#F0FFDF] placeholder-[#F0FFDF] placeholder-opacity-30 text-sm focus:outline-none focus:ring-2 focus:ring-[#237227] transition-all disabled:opacity-50 ${errors.password
                                            ? 'border-red-500 border-opacity-80'
                                            : 'border-[#237227] border-opacity-30 hover:border-opacity-60'
                                            }`}
                                    />
                                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#F0FFDF] opacity-40 hover:opacity-80 transition-opacity"
                                        tabIndex={-1} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                                {errors.password && <p className="mt-1.5 text-xs text-red-400">{errors.password}</p>}
                                {formData.password && (
                                    <div className="mt-2">
                                        <div className="flex gap-1">
                                            {[1, 2, 3, 4].map((i) => (
                                                <div key={i} className="h-1 flex-1 rounded-full transition-all duration-300"
                                                    style={{ backgroundColor: i <= strength.level ? strength.color : '#3a3a3a' }} />
                                            ))}
                                        </div>
                                        {strength.label && (
                                            <p className="text-xs mt-1 transition-colors" style={{ color: strength.color }}>
                                                {strength.label} password
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Confirm Password */}
                            <div>
                                <label htmlFor="confirmPassword" className="block text-sm font-medium text-[#F0FFDF] opacity-80 mb-1.5">
                                    Confirm Password
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Lock size={16} className="text-[#237227] opacity-70" />
                                    </div>
                                    <input
                                        id="confirmPassword"
                                        name="confirmPassword"
                                        type={showConfirmPassword ? 'text' : 'password'}
                                        autoComplete="new-password"
                                        value={formData.confirmPassword}
                                        onChange={handleChange}
                                        placeholder="Re-enter your password"
                                        disabled={submitting}
                                        className={`w-full pl-9 pr-10 py-3 rounded-lg bg-[#2B2A2A] border text-[#F0FFDF] placeholder-[#F0FFDF] placeholder-opacity-30 text-sm focus:outline-none focus:ring-2 focus:ring-[#237227] transition-all disabled:opacity-50 ${errors.confirmPassword
                                            ? 'border-red-500 border-opacity-80'
                                            : formData.confirmPassword && formData.password === formData.confirmPassword
                                                ? 'border-[#237227] border-opacity-80'
                                                : 'border-[#237227] border-opacity-30 hover:border-opacity-60'
                                            }`}
                                    />
                                    <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#F0FFDF] opacity-40 hover:opacity-80 transition-opacity"
                                        tabIndex={-1} aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}>
                                        {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                                {errors.confirmPassword && <p className="mt-1.5 text-xs text-red-400">{errors.confirmPassword}</p>}
                                {formData.confirmPassword && formData.password === formData.confirmPassword && !errors.confirmPassword && (
                                    <p className="mt-1.5 text-xs text-[#237227] flex items-center gap-1">
                                        <CheckCircle2 size={12} /> Passwords match
                                    </p>
                                )}
                            </div>

                            {/* Submit */}
                            <button
                                id="signup-submit-btn"
                                type="submit"
                                disabled={submitting}
                                className="w-full bg-[#237227] text-[#F0FFDF] py-3 rounded-lg font-bold hover:bg-opacity-90 active:scale-[0.98] transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center gap-2 group mt-2 disabled:opacity-70 disabled:cursor-not-allowed disabled:active:scale-100"
                            >
                                {submitting ? (
                                    <>
                                        <Loader2 size={18} className="animate-spin" />
                                        Creating Account…
                                    </>
                                ) : (
                                    <>
                                        Create Account
                                        <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                    </>
                                )}
                            </button>
                        </form>

                        {/* Footer note */}
                        <p className="text-center text-xs text-[#F0FFDF] opacity-40 mt-6">
                            Already have an account?{' '}
                            <span className="text-[#237227] opacity-100 cursor-not-allowed" title="Login coming soon">Login</span>{' '}
                            <span>(coming soon)</span>
                        </p>
                    </div>
                </div>
            </div>

            <style>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33%  { transform: translate(20px, -20px) scale(1.05); }
          66%  { transform: translate(-10px, 15px) scale(0.97); }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
      `}</style>
        </div>
    );
};

export default Signup;
