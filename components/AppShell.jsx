'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { CalendarDays, LogOut, Menu, ShieldCheck, Ticket, UserRound, X } from 'lucide-react';
import Logo from './Logo';
import { useAuth } from './AuthProvider';
import { initials } from '@/lib/api';

const memberLinks = [
    ['Events', '/events'],
    ['Members', '/members'],
    ['Messages', '/messages'],
    ['My Ticket', '/ticket']
];

export default function AppShell({ children }) {
    const pathname = usePathname();
    const router = useRouter();
    const { user, logout } = useAuth();
    const [open, setOpen] = useState(false);
    const [aboutOpen, setAboutOpen] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);
    const [atTop, setAtTop] = useState(true);
    const profileMenuRef = useRef(null);
    useEffect(() => {
        setOpen(false);
        setAboutOpen(false);
        setProfileOpen(false);
    }, [pathname]);
    useEffect(() => {
        const update = () => setAtTop(window.scrollY < 28);
        update();
        window.addEventListener('scroll', update, { passive: true });
        return () => window.removeEventListener('scroll', update);
    }, [pathname]);
    useEffect(() => {
        if (!profileOpen) return undefined;
        const close = event => {
            if (event.key === 'Escape') setProfileOpen(false);
            if (event.type === 'pointerdown' && profileMenuRef.current && !profileMenuRef.current.contains(event.target)) setProfileOpen(false);
        };
        document.addEventListener('keydown', close);
        document.addEventListener('pointerdown', close);
        return () => {
            document.removeEventListener('keydown', close);
            document.removeEventListener('pointerdown', close);
        };
    }, [profileOpen]);

    async function signOut() {
        await logout();
        router.push('/');
    }
    const profilePhoto = user?.profilePhoto || user?.profile_photo || '';
    const isLanding = pathname === '/';
    const isLegacyMarketingPage = pathname === '/foundersvn-events' || pathname === '/team-behind';
    const isMemberArea = !!user && ['/events', '/members', '/messages', '/profile', '/ticket', '/admin', '/payment', '/meal', '/change-password'].some(path => pathname === path || pathname.startsWith(`${path}/`));
    const paymentPending = user?.account_status === 'payment_pending' || user?.accountStatus === 'payment_pending';
    const mustResetPassword = user?.must_reset_password === true || user?.mustResetPassword === true;
    const visibleMemberLinks = mustResetPassword ? [['Security', '/change-password']] : paymentPending ? [['Payment', '/payment'], ['Profile', '/profile']] : memberLinks;
    const hashPrefix = isLanding ? '' : '/';
    const applyHref = isLanding ? '#apply' : '/#apply';

    return (
        <div className={`app-shell ${isLegacyMarketingPage ? 'legacy-marketing-shell' : ''} ${isMemberArea ? 'member-legacy-shell' : ''}`}>
            <header className={`site-header ${isLanding ? 'landing-header' : ''} ${isLanding && atTop ? 'at-top' : ''} ${!user ? 'public-header landing-public-header' : 'member-header'}`}>
                <div className="nav-inner">
                    <Logo />
                    {!user ? <div className="landing-nav-cluster">
                        <nav className="desktop-nav landing-public-nav" aria-label="Landing navigation">
                            <Link href={`${hashPrefix}#how`}>How it works</Link>
                            <div className="landing-drop">
                                <button type="button" className="landing-drop-trigger" aria-expanded={aboutOpen} onClick={() => setAboutOpen(value => !value)}>About</button>
                                <div className={`landing-drop-menu ${aboutOpen ? 'open' : ''}`}>
                                    <Link href="/foundersvn-events">FoundersVN events</Link>
                                    <Link href="/team-behind">The team behind</Link>
                                </div>
                            </div>
                            <Link href={`${hashPrefix}#faq`}>FAQ</Link>
                            <Link href="/login">Members</Link>
                        </nav>
                        <div className="landing-lang" role="group" aria-label="Language">
                            <button type="button" aria-pressed="false">VI</button><span>/</span><button type="button" aria-pressed="true">EN</button>
                        </div>
                    </div> : <nav className="desktop-nav" aria-label="Main navigation">
                        {visibleMemberLinks.map(([label, href]) => <Link key={href} className={pathname.startsWith(href) ? 'active' : ''} href={href}>{label}</Link>)}
                        {user?.is_admin && <Link className={pathname.startsWith('/admin') ? 'active' : ''} href="/admin">Admin</Link>}
                    </nav>}
                    <div className="nav-actions">
                        {user ? <div className="profile-menu" ref={profileMenuRef}>
                            <button type="button" className="profile-menu-trigger" aria-haspopup="menu" aria-expanded={profileOpen} onClick={() => setProfileOpen(value => !value)}>
                                <span className="avatar">{profilePhoto ? <img src={profilePhoto} alt="" /> : initials(user)}</span>
                            </button>
                            {profileOpen && <div className="profile-menu-panel" role="menu">
                                <div className="profile-menu-head">
                                    <span className="avatar">{profilePhoto ? <img src={profilePhoto} alt="" /> : initials(user)}</span>
                                    <span><b>{user.firstName || user.first_name || 'Member'} {user.lastName || user.last_name || ''}</b><small>{user.company || user.role || user.email || 'Founders Vietnam'}</small></span>
                                </div>
                                {mustResetPassword ? <Link role="menuitem" href="/change-password"><UserRound size={16} /> Set password</Link> : <Link role="menuitem" href="/profile"><UserRound size={16} /> Profile</Link>}
                                {!mustResetPassword && (paymentPending ? <Link role="menuitem" href="/payment"><Ticket size={16} /> Complete payment</Link> : <Link role="menuitem" href="/ticket"><Ticket size={16} /> My Ticket</Link>)}
                                {user?.is_admin && <Link role="menuitem" href="/admin"><ShieldCheck size={16} /> Admin</Link>}
                                <button role="menuitem" type="button" onClick={signOut}><LogOut size={16} /> Sign out</button>
                            </div>}
                        </div> : null}
                        {!user && <Link className="button ghost small login-nav-button" href="/login">Login</Link>}
                        <Link className="button primary small" href={user ? (mustResetPassword ? '/change-password' : paymentPending ? '/payment' : '/events') : applyHref}>{user ? <CalendarDays size={17} /> : null} {user ? (mustResetPassword ? 'Set password' : paymentPending ? 'Pay now' : 'Register') : 'Apply'}{!user ? <span className="arr">→</span> : null}</Link>
                        <button className="menu-button" onClick={() => setOpen(!open)} aria-label="Toggle menu">{open ? <X /> : <Menu />}</button>
                    </div>
                </div>
                {open && <div className="mobile-nav">
                    {(!user ? [['How it works', `${hashPrefix}#how`], ['About', '/foundersvn-events'], ['FoundersVN events', '/foundersvn-events'], ['The team behind', '/team-behind'], ['FAQ', `${hashPrefix}#faq`], ['Members', '/login'], ['Login', '/login']] : visibleMemberLinks).map(([label, href]) => <Link key={href} href={href}>{label}</Link>)}
                    {user ? <>
                        <Link href="/profile"><UserRound size={18} /> Profile</Link>
                        {user.is_admin && <Link href="/admin"><ShieldCheck size={18} /> Admin</Link>}
                        <button onClick={signOut}>Sign out</button>
                    </> : null}
                </div>}
            </header>
            <main>{children}</main>
            {pathname !== '/' && <footer className="site-footer">
                <div><Logo /><p>Curated rooms for founders building meaningful companies in Vietnam.</p></div>
                <div className="footer-links"><Link href="/team-behind">About</Link><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><Link href="/refund">Refunds</Link></div>
                <small>© {new Date().getFullYear()} Founders Vietnam</small>
            </footer>}
        </div>
    );
}
