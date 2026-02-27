import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import {
    LayoutDashboard, ClipboardList, TrendingUp, BarChart2,
    Briefcase, Map, LogOut, ChevronLeft, ChevronRight, Zap
} from 'lucide-react';

const NAV_ITEMS = [
    {
        section: 'Main', items: [
            { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        ]
    },
    {
        section: 'Modules', items: [
            { to: '/assessment', icon: ClipboardList, label: 'Assessment' },
            { to: '/skill-gap', icon: TrendingUp, label: 'Skill Gap' },
            { to: '/swot', icon: BarChart2, label: 'SWOT Analysis' },
            { to: '/career-matching', icon: Briefcase, label: 'Career Matching' },
            { to: '/roadmap', icon: Map, label: 'Roadmap' },
        ]
    },
];

export default function Sidebar({ collapsed, onToggle }) {
    const navigate = useNavigate();
    const { user } = useAuth();

    const handleLogout = async () => {
        await signOut(auth);
        navigate('/login');
    };

    const initials = user?.username
        ? user.username.slice(0, 2).toUpperCase()
        : user?.email?.slice(0, 2).toUpperCase() ?? '??';

    return (
        <aside style={{
            width: collapsed ? '64px' : '220px',
            minHeight: '100vh',
            background: '#1a1a1a',
            borderRight: '1px solid rgba(35,114,39,0.2)',
            display: 'flex',
            flexDirection: 'column',
            transition: 'width 0.25s ease',
            position: 'fixed',
            left: 0, top: 0, bottom: 0,
            zIndex: 40,
            overflow: 'hidden',
        }}>
            {/* Brand */}
            <div style={{ padding: '20px 16px 16px', display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid rgba(35,114,39,0.15)' }}>
                <div style={{ width: 32, height: 32, background: '#237227', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Zap size={18} color="#F0FFDF" />
                </div>
                {!collapsed && <span style={{ fontWeight: 700, color: '#F0FFDF', fontSize: 16, whiteSpace: 'nowrap' }}>SkillBridge</span>}
            </div>

            {/* Nav */}
            <nav style={{ flex: 1, overflowY: 'auto', padding: '12px 8px' }}>
                {NAV_ITEMS.map((section) => (
                    <div key={section.section} style={{ marginBottom: 20 }}>
                        {!collapsed && <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(240,255,223,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0 8px', marginBottom: 6 }}>{section.section}</div>}
                        {section.items.map(({ to, icon: Icon, label }) => (
                            <NavLink key={to} to={to} style={({ isActive }) => ({
                                display: 'flex', alignItems: 'center', gap: 10,
                                padding: collapsed ? '10px 16px' : '9px 12px',
                                borderRadius: 8, marginBottom: 2, textDecoration: 'none',
                                background: isActive ? 'rgba(35,114,39,0.25)' : 'transparent',
                                color: isActive ? '#4ade80' : 'rgba(240,255,223,0.65)',
                                fontWeight: isActive ? 600 : 400, fontSize: 14,
                                transition: 'all 0.15s',
                                justifyContent: collapsed ? 'center' : 'flex-start',
                            })} title={collapsed ? label : undefined}>
                                <Icon size={17} style={{ flexShrink: 0 }} />
                                {!collapsed && <span style={{ whiteSpace: 'nowrap' }}>{label}</span>}
                            </NavLink>
                        ))}
                    </div>
                ))}
            </nav>

            {/* Footer: avatar + logout */}
            <div style={{ padding: '12px 8px', borderTop: '1px solid rgba(35,114,39,0.15)' }}>
                {/* User pill */}
                {!collapsed && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8, marginBottom: 6, background: 'rgba(35,114,39,0.1)' }}>
                        <div style={{ width: 28, height: 28, background: '#237227', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#F0FFDF', flexShrink: 0 }}>{initials}</div>
                        <span style={{ fontSize: 13, color: 'rgba(240,255,223,0.8)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.username || 'User'}</span>
                    </div>
                )}
                {/* Logout */}
                <button onClick={handleLogout} title={collapsed ? 'Logout' : undefined} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: collapsed ? '10px 16px' : '9px 12px',
                    borderRadius: 8, width: '100%', background: 'transparent', border: 'none',
                    color: 'rgba(240,255,223,0.55)', fontSize: 14, cursor: 'pointer',
                    justifyContent: collapsed ? 'center' : 'flex-start', transition: 'all 0.15s',
                }}
                    onMouseEnter={e => e.currentTarget.style.color = '#f87171'}
                    onMouseLeave={e => e.currentTarget.style.color = 'rgba(240,255,223,0.55)'}>
                    <LogOut size={17} style={{ flexShrink: 0 }} />
                    {!collapsed && <span>Logout</span>}
                </button>
                {/* Collapse toggle */}
                <button onClick={onToggle} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: collapsed ? '10px 16px' : '9px 12px',
                    borderRadius: 8, width: '100%', background: 'transparent', border: 'none',
                    color: 'rgba(240,255,223,0.35)', fontSize: 13, cursor: 'pointer', marginTop: 2,
                    justifyContent: collapsed ? 'center' : 'flex-start',
                }}>
                    {collapsed ? <ChevronRight size={16} /> : <><ChevronLeft size={16} /><span>Collapse</span></>}
                </button>
            </div>
        </aside>
    );
}