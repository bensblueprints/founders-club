(function () {
    'use strict';

    const SESSION_KEY = 'fvn_session';
    const USER_KEY = 'fvn_user';
    const ADMIN_ROLES = ['owner', 'admin', 'organiser'];

    function validSession(token) {
        if (!token || token.split('.').length !== 3) return false;
        try {
            let encoded = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
            while (encoded.length % 4) encoded += '=';
            const payload = JSON.parse(atob(encoded));
            return !payload.exp || payload.exp > Math.floor(Date.now() / 1000);
        } catch (_error) {
            return false;
        }
    }

    function readUser() {
        try {
            const token = localStorage.getItem(SESSION_KEY);
            if (!validSession(token)) {
                localStorage.removeItem(SESSION_KEY);
                localStorage.removeItem(USER_KEY);
                return null;
            }
            const raw = localStorage.getItem(USER_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch (_error) {
            return null;
        }
    }

    function text(value) {
        return String(value == null ? '' : value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function userName(user) {
        const fullName = user.fullName || user.full_name ||
            [user.firstName || user.first_name, user.lastName || user.last_name].filter(Boolean).join(' ');
        return fullName || user.email || 'Member';
    }

    function initials(user) {
        const first = user.firstName || user.first_name || '';
        const last = user.lastName || user.last_name || '';
        if (first || last) return ((first[0] || '') + (last[0] || '')).toUpperCase();
        return userName(user).split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase() || 'FV';
    }

    function userDetail(user) {
        return user.company || user.role || user.memberType || user.member_type || 'FoundersVN member';
    }

    function isAdmin(user) {
        const role = user.memberType || user.member_type;
        return user.is_admin === true || ADMIN_ROLES.includes(role);
    }

    function activeClass(route) {
        const path = window.location.pathname.replace(/\.html$/, '') || '/';
        if (route === '/' && path === '/') return ' is-active';
        if (route !== '/' && (path === route || path.startsWith(route + '/'))) return ' is-active';
        return '';
    }

    function link(route, label, extraClass) {
        return '<a class="site-nav__link ' + (extraClass || '') + activeClass(route) + '" href="' + route + '">' + label + '</a>';
    }

    function profile(user, mobile) {
        const avatarUrl = user.avatar || user.avatar_url || user.profilePhoto || user.profile_photo || '';
        const avatar = avatarUrl
            ? '<img src="' + text(avatarUrl) + '" alt="">'
            : text(initials(user));
        return '<a class="site-nav__profile nav-profile' + (mobile ? ' site-nav__mobile-profile' : '') + '" id="' + (mobile ? 'mobileNavProfile' : 'navProfile') + '" href="/profile">' +
            '<span class="site-nav__avatar profile-avatar"' + (mobile ? '' : ' id="navAvatar"') + '>' + avatar + '</span>' +
            '<span class="site-nav__identity"><span class="site-nav__name"' + (mobile ? '' : ' id="navUserName"') + '>' + text(userName(user)) + '</span>' +
            '<span class="site-nav__detail">' + text(userDetail(user)) + '</span></span></a>';
    }

    function render() {
        const user = readUser();
        const admin = user && isAdmin(user);
        const desktopSession = user
            ? '<a class="site-nav__login" id="navLogin" href="/login" hidden>Login</a>' +
              '<a class="site-nav__link" id="navMessages" href="/messages">Messages</a>' +
              (admin ? '<a class="site-nav__link' + activeClass('/admin') + '" data-site-admin href="/admin">Admin</a>' : '') +
              profile(user, false)
            : '<a class="site-nav__login" id="navLogin" href="/login">Login</a>' +
              '<a class="site-nav__profile nav-profile" id="navProfile" href="/profile" hidden><span class="site-nav__avatar profile-avatar" id="navAvatar">FV</span></a>';
        const mobileSession = user
            ? '<a class="site-nav__link" href="/messages">Messages</a>' +
              (admin ? '<a class="site-nav__link" href="/admin">Admin</a>' : '') + profile(user, true)
            : '';
        const mobileActions = user
            ? '<a class="site-nav__apply" href="/#apply">Apply for an event</a>'
            : '<a class="site-nav__login" href="/login">Login</a><a class="site-nav__apply" href="/#apply">Apply</a>';

        const html = '<header class="site-nav" id="nav">' +
            '<div class="site-nav__inner">' +
                '<a class="site-nav__brand" href="/" aria-label="FoundersVN home"><img class="site-nav__logo" src="/assets/brand/founders-vn-logo.svg" alt="FoundersVN"></a>' +
                '<nav class="site-nav__links nav-links" aria-label="Main navigation">' +
                    link('/', 'Home') + link('/events', 'Events') + link('/members', 'Members') +
                    link('/sponsor', 'Sponsor', 'site-nav__link--secondary') + link('/speak', 'Speak', 'site-nav__link--secondary') +
                '</nav>' +
                '<div class="site-nav__actions">' + desktopSession +
                    '<a class="site-nav__apply" href="/#apply">Apply</a>' +
                '</div>' +
                '<button class="site-nav__toggle" id="burger" type="button" aria-label="Open menu" aria-expanded="false" aria-controls="mmenu"><span class="site-nav__toggle-lines"></span></button>' +
            '</div>' +
            '<div class="site-nav__mobile" id="mmenu">' +
                link('/', 'Home') + link('/events', 'Events') + link('/members', 'Members') +
                link('/sponsor', 'Sponsor') + link('/speak', 'Speak') + mobileSession +
                '<div class="site-nav__mobile-actions">' + mobileActions + '</div>' +
            '</div>' +
        '</header>';

        const oldMobileMenu = document.getElementById('mmenu');
        if (oldMobileMenu) oldMobileMenu.remove();

        const existing = document.querySelector('header.nav, nav.nav, body > header');
        const needsOffset = !existing || (!existing.matches('.nav') && !existing.classList.contains('site-nav'));
        if (existing) existing.outerHTML = html;
        else document.body.insertAdjacentHTML('afterbegin', html);
        if (needsOffset) document.body.classList.add('site-nav-offset');

        const nav = document.getElementById('nav');
        const toggle = document.getElementById('burger');
        const menu = document.getElementById('mmenu');
        toggle.addEventListener('click', function () {
            const open = nav.classList.toggle('is-open');
            toggle.setAttribute('aria-expanded', String(open));
        });
        menu.addEventListener('click', function (event) {
            if (!event.target.closest('a')) return;
            nav.classList.remove('is-open');
            toggle.setAttribute('aria-expanded', 'false');
        });
    }

    render();
    window.SiteNav = { render: render };
    window.addEventListener('fvn:session-changed', render);
})();
