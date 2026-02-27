import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { Zap, Eye, EyeOff, ArrowRight, ArrowLeft, User, Lock, Loader2 } from 'lucide-react';

const Login = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({ username: '', password: '' });
    const [showPassword, setShowPassword] = useState(false);
    const [errors, setErrors] = useState({});
    const [firebaseError, setFirebaseError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((p) => ({ ...p, [name]: value }));
        if (errors[name]) setErrors((p) => ({ ...p, [name]: '' }));
        if (firebaseError) setFirebaseError('');
    };

    const validate = () => {
        const errs = {};
        if (!formData.username.trim()) errs.username = 'Username is required';
        if (!formData.password) errs.password = 'Password is required';
        return errs;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setFirebaseError('');
        const errs = validate();
        if (Object.keys(errs).length > 0) { setErrors(errs); return; }

        setSubmitting(true);
        const username = formData.username.trim().toLowerCase();
        const internalEmail = `${username}@skillbridge.app`;

        try {
            // 1️⃣ Sign in with Firebase Auth
            const credential = await signInWithEmailAndPassword(auth, internalEmail, formData.password);
            const uid = credential.user.uid;

            // 2️⃣ Check if the user's Firestore profile is complete
            const profileSnap = await getDoc(doc(db, 'users', uid));
            if (profileSnap.exists() && profileSnap.data().profileCompletedAt) {
                // Profile complete → go to dashboard
                navigate('/dashboard');
            } else {
                // Account exists but profile incomplete → finish profile first
                navigate('/profile');
            }
        } catch (err) {
            const msgMap = {
                'auth/user-not-found': 'No account found with that username. Please sign up first.',
                'auth/wrong-password': 'Incorrect password. Please try again.',
                'auth/invalid-credential': 'Invalid username or password. Please try again.',
                'auth/too-many-requests': 'Too many failed attempts. Please wait a moment and try again.',
                'auth/network-request-failed': 'Network error. Check your connection and try again.',
            };
            setFirebaseError(msgMap[err.code] || `Login failed: ${err.message}`);
        } finally {
            setSubmitting(false);
        }
    };

    const inputCls = (field) =>
        `w-full pl-9 pr-4 py-3 rounded-lg bg-[#2B2A2A] border text-[#F0FFDF] placeholder-[#F0FFDF] placeholder-opacity-30 text-sm focus:outline-none focus:ring-2 focus:ring-[#237227] transition-all disabled:opacity-50 ${errors[field] ? 'border-red-500 border-opacity-80' : 'border-[#237227] border-opacity-30 hover:border-opacity-60'
        }`;

    return (
        <div className="min-h-screen bg-[#2B2A2A] text-[#F0FFDF] flex flex-col"
            style={{ fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif" }}>

            {/* Background blobs */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute w-96 h-96 bg-[#237227] rounded-full filter blur-3xl opacity-5"
                    style={{ animation: 'blob 8s ease-in-out infinite', top: '-5%', left: '-5%' }} />
                <div className="absolute w-80 h-80 bg-[#237227] rounded-full filter blur-3xl opacity-5"
                    style={{ animation: 'blob 10s ease-in-out infinite reverse', bottom: '-5%', right: '-5%' }} />
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

            {/* Main */}
            <div className="relative z-10 flex-1 flex items-center justify-center px-4 py-12">
                <div className="w-full max-w-md" style={{ animation: 'fadeUp 0.5s ease-out forwards' }}>
                    <div className="bg-[#1F1F1F] border border-[#237227] border-opacity-30 rounded-2xl p-8 shadow-2xl">

                        {/* Header */}
                        <div className="text-center mb-8">
                            <div className="w-14 h-14 bg-[#237227] bg-opacity-20 rounded-xl flex items-center justify-center mx-auto mb-4">
                                <User size={28} className="text-[#237227]" />
                            </div>
                            <h1 className="text-2xl font-bold text-[#F0FFDF] mb-1">Welcome Back</h1>
                            <p className="text-[#F0FFDF] opacity-60 text-sm">Log in to continue your career journey</p>
                        </div>

                        {/* Error banner */}
                        {firebaseError && (
                            <div className="mb-5 px-4 py-3 rounded-lg bg-red-900 bg-opacity-30 border border-red-500 border-opacity-50 text-red-400 text-sm">
                                {firebaseError}
                                {firebaseError.includes('sign up') && (
                                    <Link to="/signup" className="ml-1 underline font-semibold text-[#237227]">Sign up here →</Link>
                                )}
                            </div>
                        )}

                        {/* Form */}
                        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                            {/* Username */}
                            <div>
                                <label htmlFor="username" className="block text-sm font-medium text-[#F0FFDF] opacity-80 mb-1.5">Username</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <User size={16} className="text-[#237227] opacity-70" />
                                    </div>
                                    <input id="username" name="username" type="text" autoComplete="username" autoFocus
                                        value={formData.username} onChange={handleChange} placeholder="Your username"
                                        disabled={submitting} className={inputCls('username')} />
                                </div>
                                {errors.username && <p className="mt-1.5 text-xs text-red-400">{errors.username}</p>}
                            </div>

                            {/* Password */}
                            <div>
                                <label htmlFor="password" className="block text-sm font-medium text-[#F0FFDF] opacity-80 mb-1.5">Password</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Lock size={16} className="text-[#237227] opacity-70" />
                                    </div>
                                    <input id="password" name="password" type={showPassword ? 'text' : 'password'}
                                        autoComplete="current-password" value={formData.password} onChange={handleChange}
                                        placeholder="Your password" disabled={submitting}
                                        className={`${inputCls('password')} pr-10`} />
                                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#F0FFDF] opacity-40 hover:opacity-80 transition-opacity"
                                        tabIndex={-1} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                                {errors.password && <p className="mt-1.5 text-xs text-red-400">{errors.password}</p>}
                            </div>

                            {/* Submit */}
                            <button type="submit" id="login-submit-btn" disabled={submitting}
                                className="w-full bg-[#237227] text-[#F0FFDF] py-3 rounded-lg font-bold hover:bg-opacity-90 active:scale-[0.98] transition-all duration-200 shadow-lg flex items-center justify-center gap-2 group mt-2 disabled:opacity-70 disabled:cursor-not-allowed">
                                {submitting ? (
                                    <><Loader2 size={18} className="animate-spin" /> Signing in…</>
                                ) : (
                                    <>Sign In <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" /></>
                                )}
                            </button>
                        </form>

                        {/* Footer */}
                        <p className="text-center text-xs text-[#F0FFDF] opacity-40 mt-6">
                            Don't have an account?{' '}
                            <Link to="/signup" className="text-[#237227] opacity-100 hover:underline font-medium">Sign Up</Link>
                        </p>
                    </div>
                </div>
            </div>

            <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(24px); } to { opacity:1; transform:translateY(0); } }
        @keyframes blob {
          0%,100% { transform:translate(0,0) scale(1); }
          33%  { transform:translate(20px,-20px) scale(1.05); }
          66%  { transform:translate(-10px,15px) scale(0.97); }
        }
      `}</style>
        </div>
    );
};

export default Login;
