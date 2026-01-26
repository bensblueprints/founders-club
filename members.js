// ========================================
// FOUNDERS VIETNAM - Member Directory
// ========================================

document.addEventListener('DOMContentLoaded', () => {
    initDirectory();
});

function initDirectory() {
    const loginRequired = document.getElementById('loginRequired');
    const directoryMain = document.getElementById('directoryMain');
    const navLogin = document.getElementById('navLogin');
    const navProfile = document.getElementById('navProfile');
    const navAvatar = document.getElementById('navAvatar');

    // Check authentication
    if (!Auth.isLoggedIn()) {
        loginRequired.style.display = 'flex';
        directoryMain.style.display = 'none';
        return;
    }

    // Show directory
    loginRequired.style.display = 'none';
    directoryMain.style.display = 'block';

    // Update nav
    const user = Auth.getCurrentUser();
    if (user) {
        navLogin.style.display = 'none';
        navProfile.style.display = 'flex';
        navAvatar.textContent = user.firstName[0] + user.lastName[0];
        navProfile.href = 'profile.html';
    }

    // Load members
    loadMembers();

    // Setup search
    const searchInput = document.getElementById('memberSearch');
    searchInput.addEventListener('input', debounce(filterMembers, 300));

    // Setup filters
    const filterTags = document.querySelectorAll('.filter-tag');
    filterTags.forEach(tag => {
        tag.addEventListener('click', () => {
            filterTags.forEach(t => t.classList.remove('active'));
            tag.classList.add('active');
            filterMembers();
        });
    });

    // Modal close
    document.getElementById('closeMemberModal').addEventListener('click', closeModal);
    document.getElementById('memberModal').addEventListener('click', (e) => {
        if (e.target.id === 'memberModal') closeModal();
    });
}

function loadMembers() {
    const members = Auth.getMembers();
    const currentUser = Auth.getCurrentUser();
    
    renderMembers(members.filter(m => m.id !== currentUser?.id));
}

function renderMembers(members) {
    const grid = document.getElementById('memberGrid');
    const emptyState = document.getElementById('emptyState');

    if (members.length === 0) {
        grid.innerHTML = '';
        emptyState.style.display = 'block';
        return;
    }

    emptyState.style.display = 'none';
    
    grid.innerHTML = members.map(member => `
        <div class="member-card" data-industry="${member.industry}" data-id="${member.id}">
            <div class="member-card-header">
                <div class="member-avatar">${member.firstName[0]}${member.lastName[0]}</div>
                <div class="member-info">
                    <h3 class="member-name">${member.firstName} ${member.lastName}</h3>
                    <p class="member-role">${member.role}</p>
                </div>
            </div>
            <p class="member-company">${member.company}</p>
            <span class="member-industry">${getIndustryLabel(member.industry)}</span>
            ${member.bio ? `<p class="member-bio">${truncate(member.bio, 100)}</p>` : ''}
            <div class="member-quick-links">
                ${member.whatsapp ? `<a href="https://wa.me/${formatPhone(member.whatsapp)}" target="_blank" class="quick-link whatsapp" title="WhatsApp"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg></a>` : ''}
                ${member.telegram ? `<a href="https://t.me/${member.telegram.replace('@', '')}" target="_blank" class="quick-link telegram" title="Telegram"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg></a>` : ''}
                ${member.zalo ? `<a href="#" class="quick-link zalo" title="Zalo: ${member.zalo}"><span style="font-size:10px;font-weight:bold;">Zalo</span></a>` : ''}
                ${member.linkedin ? `<a href="${member.linkedin}" target="_blank" class="quick-link linkedin" title="LinkedIn"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg></a>` : ''}
            </div>
            <button class="view-profile-btn" onclick="openMemberModal(${member.id})">View Full Profile</button>
        </div>
    `).join('');
}

function filterMembers() {
    const searchTerm = document.getElementById('memberSearch').value.toLowerCase();
    const activeFilter = document.querySelector('.filter-tag.active').dataset.filter;
    const members = Auth.getMembers();
    const currentUser = Auth.getCurrentUser();

    let filtered = members.filter(m => m.id !== currentUser?.id);

    // Apply industry filter
    if (activeFilter !== 'all') {
        filtered = filtered.filter(m => m.industry === activeFilter);
    }

    // Apply search
    if (searchTerm) {
        filtered = filtered.filter(m => 
            m.firstName.toLowerCase().includes(searchTerm) ||
            m.lastName.toLowerCase().includes(searchTerm) ||
            m.company.toLowerCase().includes(searchTerm) ||
            getIndustryLabel(m.industry).toLowerCase().includes(searchTerm) ||
            (m.bio && m.bio.toLowerCase().includes(searchTerm))
        );
    }

    renderMembers(filtered);
}

function openMemberModal(memberId) {
    const member = Auth.getMemberById(memberId);
    if (!member) return;

    const modal = document.getElementById('memberModal');
    
    document.getElementById('modalAvatar').textContent = member.firstName[0] + member.lastName[0];
    document.getElementById('modalName').textContent = `${member.firstName} ${member.lastName}`;
    document.getElementById('modalRole').textContent = member.role;
    document.getElementById('modalCompany').textContent = member.company;
    document.getElementById('modalIndustry').textContent = getIndustryLabel(member.industry);
    document.getElementById('modalBio').innerHTML = member.bio ? `<p>${member.bio}</p>` : '<p class="no-bio">No bio provided</p>';

    // Build social links
    const socialLinks = [];
    
    if (member.website) {
        socialLinks.push(`<a href="${member.website}" target="_blank" class="social-link website"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg><span>Website</span></a>`);
    }
    if (member.whatsapp) {
        socialLinks.push(`<a href="https://wa.me/${formatPhone(member.whatsapp)}" target="_blank" class="social-link whatsapp"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg><span>${member.whatsapp}</span></a>`);
    }
    if (member.zalo) {
        socialLinks.push(`<a href="#" class="social-link zalo"><span style="background:#0068ff;color:white;padding:2px 6px;border-radius:4px;font-size:11px;font-weight:bold;">Zalo</span><span>${member.zalo}</span></a>`);
    }
    if (member.telegram) {
        socialLinks.push(`<a href="https://t.me/${member.telegram.replace('@', '')}" target="_blank" class="social-link telegram"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg><span>${member.telegram}</span></a>`);
    }
    if (member.linkedin) {
        socialLinks.push(`<a href="${member.linkedin}" target="_blank" class="social-link linkedin"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg><span>LinkedIn</span></a>`);
    }
    if (member.twitter) {
        socialLinks.push(`<a href="https://x.com/${member.twitter.replace('@', '')}" target="_blank" class="social-link twitter"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg><span>${member.twitter}</span></a>`);
    }
    if (member.wechat) {
        socialLinks.push(`<a href="#" class="social-link wechat"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 0 0 .167-.054l1.903-1.114a.864.864 0 0 1 .717-.098 10.16 10.16 0 0 0 2.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348z"/></svg><span>${member.wechat}</span></a>`);
    }
    if (member.facebook) {
        socialLinks.push(`<a href="${member.facebook}" target="_blank" class="social-link facebook"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg><span>Facebook</span></a>`);
    }
    if (member.instagram) {
        socialLinks.push(`<a href="https://instagram.com/${member.instagram.replace('@', '')}" target="_blank" class="social-link instagram"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678c-3.405 0-6.162 2.76-6.162 6.162 0 3.405 2.76 6.162 6.162 6.162 3.405 0 6.162-2.76 6.162-6.162 0-3.405-2.757-6.162-6.162-6.162zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405c0 .795-.646 1.44-1.44 1.44-.795 0-1.44-.646-1.44-1.44 0-.794.646-1.439 1.44-1.439.793-.001 1.44.645 1.44 1.439z"/></svg><span>${member.instagram}</span></a>`);
    }

    document.getElementById('modalSocialLinks').innerHTML = socialLinks.length > 0 
        ? socialLinks.join('') 
        : '<p class="no-links">No contact links provided</p>';

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    document.getElementById('memberModal').classList.remove('active');
    document.body.style.overflow = '';
}

// Utility functions
function getIndustryLabel(industry) {
    const labels = {
        'saas': 'SaaS / Software',
        'ecommerce': 'E-Commerce',
        'fintech': 'Fintech',
        'healthtech': 'Healthtech',
        'edtech': 'Edtech',
        'agency': 'Agency / Services',
        'manufacturing': 'Manufacturing',
        'real-estate': 'Real Estate',
        'crypto': 'Crypto / Web3',
        'ai': 'AI / ML',
        'consumer': 'Consumer Products',
        'other': 'Other'
    };
    return labels[industry] || industry;
}

function truncate(str, len) {
    if (str.length <= len) return str;
    return str.substring(0, len) + '...';
}

function formatPhone(phone) {
    return phone.replace(/[\s\-\(\)]/g, '').replace('+', '');
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Close modal on escape
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
});
