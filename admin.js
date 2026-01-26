// ========================================
// FOUNDERS VIETNAM - Admin Dashboard
// ========================================

const Admin = {
    currentMemberId: null,
    currentApplicationId: null,
    members: [],
    transactions: [],
    applications: [],
    applicationFilter: 'pending',

    // Admin role types
    ADMIN_ROLES: ['owner', 'admin', 'organiser'],
    MEMBER_ROLES: ['platinum_founding', 'founding', 'member'],

    // ========================================
    // INITIALIZATION
    // ========================================

    async init() {
        // Check if user is admin
        const user = Auth.getCurrentUser();
        if (!user || !this.ADMIN_ROLES.includes(user.memberType)) {
            window.location.href = 'index.html';
            return;
        }

        // Update nav
        document.getElementById('navAvatar').textContent = user.firstName[0] + user.lastName[0];
        document.getElementById('navProfile').href = 'profile.html';

        // Check for masquerade
        this.checkMasquerade();

        // Load data
        await this.loadMembers();
        this.loadApplications();
        this.loadStats();
        this.loadTransactions();

        // Setup tabs
        this.setupTabs();
        this.setupApplicationFilters();

        // Setup search and filters
        this.setupFilters();

        // Setup photo upload
        this.setupPhotoUpload();
    },

    // Member photo being edited
    currentMemberPhoto: null,

    setupPhotoUpload() {
        const photoInput = document.getElementById('memberPhotoInput');
        if (photoInput) {
            photoInput.addEventListener('change', async (e) => {
                const file = e.target.files[0];
                if (!file) return;

                if (!file.type.startsWith('image/')) {
                    alert('Please select an image file');
                    return;
                }

                if (file.size > 5 * 1024 * 1024) {
                    alert('Image must be less than 5MB');
                    return;
                }

                try {
                    const resizedImage = await this.resizeImage(file, 400, 400);
                    this.currentMemberPhoto = resizedImage;
                    this.displayMemberPhoto(resizedImage);
                } catch (error) {
                    console.error('Error processing image:', error);
                    alert('Failed to process image. Please try again.');
                }
            });
        }
    },

    displayMemberPhoto(photoUrl) {
        const avatarImage = document.getElementById('adminAvatarImage');
        const avatarInitials = document.getElementById('adminAvatarInitials');
        const removeBtn = document.getElementById('removeAdminPhoto');

        if (photoUrl) {
            avatarImage.src = photoUrl;
            avatarImage.style.display = 'block';
            avatarInitials.style.display = 'none';
            if (removeBtn) removeBtn.style.display = 'inline-block';
        } else {
            avatarImage.src = '';
            avatarImage.style.display = 'none';
            avatarInitials.style.display = 'flex';
            if (removeBtn) removeBtn.style.display = 'none';
        }
    },

    removePhoto() {
        this.currentMemberPhoto = null;
        this.displayMemberPhoto(null);
        document.getElementById('memberPhotoInput').value = '';
    },

    resizeImage(file, maxWidth, maxHeight) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;

                    let sourceX = 0;
                    let sourceY = 0;
                    let sourceWidth = width;
                    let sourceHeight = height;

                    if (width > height) {
                        sourceX = (width - height) / 2;
                        sourceWidth = height;
                    } else if (height > width) {
                        sourceY = (height - width) / 2;
                        sourceHeight = width;
                    }

                    canvas.width = maxWidth;
                    canvas.height = maxHeight;

                    const ctx = canvas.getContext('2d');
                    ctx.imageSmoothingEnabled = true;
                    ctx.imageSmoothingQuality = 'high';

                    ctx.drawImage(
                        img,
                        sourceX, sourceY, sourceWidth, sourceHeight,
                        0, 0, maxWidth, maxHeight
                    );

                    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
                    resolve(dataUrl);
                };
                img.onerror = reject;
                img.src = e.target.result;
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    },

    setupTabs() {
        const tabs = document.querySelectorAll('.admin-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');

                // Hide all panels
                document.querySelectorAll('.admin-panel').forEach(p => p.style.display = 'none');

                // Show selected panel
                const panelId = tab.dataset.tab + 'Panel';
                document.getElementById(panelId).style.display = 'block';
            });
        });
    },

    setupFilters() {
        document.getElementById('memberSearchAdmin').addEventListener('input', () => this.filterMembers());
        document.getElementById('roleFilter').addEventListener('change', () => this.filterMembers());
        document.getElementById('statusFilter').addEventListener('change', () => this.filterMembers());
    },

    // ========================================
    // DATA LOADING
    // ========================================

    async loadMembers() {
        this.members = Auth.getMembers();
        this.renderMembers(this.members);
    },

    loadStats() {
        const total = this.members.length;
        const platinum = this.members.filter(m => m.memberType === 'platinum_founding').length;
        const pendingApps = Applications.getCounts().pending;

        document.getElementById('totalMembers').textContent = total;
        document.getElementById('platinumMembers').textContent = platinum;
        document.getElementById('totalEvents').textContent = '6';
        document.getElementById('totalRevenue').textContent = '$12,500'; // Placeholder

        // Update applications tab badge
        const appTab = document.querySelector('[data-tab="applications"]');
        if (appTab && pendingApps > 0) {
            appTab.innerHTML = `Applications <span class="tab-badge">${pendingApps}</span>`;
        }
    },

    // ========================================
    // APPLICATIONS
    // ========================================

    loadApplications() {
        this.applications = Applications.getApplications();
        this.renderApplications();
    },

    setupApplicationFilters() {
        const filterBtns = document.querySelectorAll('.app-filter-btn');
        filterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                filterBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.applicationFilter = btn.dataset.filter;
                this.renderApplications();
            });
        });
    },

    renderApplications() {
        const container = document.getElementById('applicationsList');
        const counts = Applications.getCounts();

        // Update filter counts
        document.querySelectorAll('.app-filter-btn').forEach(btn => {
            const filter = btn.dataset.filter;
            const count = filter === 'all' ? counts.total : counts[filter];
            btn.querySelector('.count')?.remove();
            btn.innerHTML += ` <span class="count">(${count})</span>`;
        });

        // Filter applications
        let filtered = this.applications;
        if (this.applicationFilter !== 'all') {
            filtered = filtered.filter(a => a.status === this.applicationFilter);
        }

        // Sort by date (newest first)
        filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        if (filtered.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                    </svg>
                    <p>No ${this.applicationFilter === 'all' ? '' : this.applicationFilter} applications</p>
                </div>
            `;
            return;
        }

        container.innerHTML = filtered.map(app => `
            <div class="application-card ${app.status}">
                <div class="app-header">
                    <div class="app-info">
                        <h3>${app.firstName} ${app.lastName}</h3>
                        <p class="app-company">${app.company} · ${app.role}</p>
                        <p class="app-email">${app.email}</p>
                    </div>
                    <div class="app-meta">
                        <span class="app-status ${app.status}">${app.status}</span>
                        <span class="app-date">${new Date(app.createdAt).toLocaleDateString()}</span>
                    </div>
                </div>
                <div class="app-details">
                    <div class="app-detail">
                        <span class="detail-label">Revenue</span>
                        <span class="detail-value">${this.formatRevenue(app.revenue)}</span>
                    </div>
                    <div class="app-detail">
                        <span class="detail-label">Industry</span>
                        <span class="detail-value">${this.formatIndustry(app.industry)}</span>
                    </div>
                    <div class="app-detail">
                        <span class="detail-label">Team Size</span>
                        <span class="detail-value">${app.teamSize || 'N/A'}</span>
                    </div>
                    <div class="app-detail">
                        <span class="detail-label">Event Interest</span>
                        <span class="detail-value">${app.event || 'N/A'}</span>
                    </div>
                    <div class="app-detail">
                        <span class="detail-label">Membership</span>
                        <span class="detail-value membership-${app.membership}">${app.membership === 'full' ? 'Dinner + Cruise ($498)' : 'Dinner ($149)'}</span>
                    </div>
                </div>
                <div class="app-actions">
                    <button class="btn-view" onclick="Admin.viewApplication('${app.id}')">View Details</button>
                    ${app.status === 'pending' ? `
                        <button class="btn-accept" onclick="Admin.acceptApplication('${app.id}')">Accept</button>
                        <button class="btn-reject" onclick="Admin.rejectApplication('${app.id}')">Reject</button>
                    ` : ''}
                </div>
            </div>
        `).join('');
    },

    formatRevenue(revenue) {
        const labels = {
            'pre-revenue': 'Pre-Revenue',
            '0-5k': '$0 - $5K',
            '5k-10k': '$5K - $10K',
            '10k-25k': '$10K - $25K',
            '25k-50k': '$25K - $50K',
            '50k-100k': '$50K - $100K',
            '100k-500k': '$100K - $500K',
            '500k+': '$500K+'
        };
        return labels[revenue] || revenue || 'N/A';
    },

    formatIndustry(industry) {
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
        return labels[industry] || industry || 'N/A';
    },

    viewApplication(id) {
        const app = Applications.getApplicationById(id);
        if (!app) return;

        this.currentApplicationId = id;

        // Populate modal
        document.getElementById('appDetailName').textContent = `${app.firstName} ${app.lastName}`;
        document.getElementById('appDetailEmail').textContent = app.email;
        document.getElementById('appDetailCompany').textContent = `${app.company} · ${app.role}`;
        document.getElementById('appDetailIndustry').textContent = this.formatIndustry(app.industry);
        document.getElementById('appDetailRevenue').textContent = this.formatRevenue(app.revenue);
        document.getElementById('appDetailTeam').textContent = app.teamSize || 'N/A';
        document.getElementById('appDetailSocial').innerHTML = app.socialLink ?
            `<a href="${app.socialLink}" target="_blank">${app.socialLink}</a>` : 'N/A';
        document.getElementById('appDetailEvent').textContent = app.event || 'N/A';
        document.getElementById('appDetailMembership').textContent = app.membership === 'full' ?
            'Full Experience (Dinner + Cruise) - $498' : 'Monthly Gathering (Dinner) - $149';
        document.getElementById('appDetailChallenge').textContent = app.biggestChallenge || 'N/A';
        document.getElementById('appDetailValue').textContent = app.uniqueValue || 'N/A';
        document.getElementById('appDetailGoals').textContent = app.goals12Month || 'N/A';
        document.getElementById('appDetailWhy').textContent = app.whyJoin || 'N/A';
        document.getElementById('appDetailReferral').textContent = app.referral || 'N/A';
        if (app.referrerName) {
            document.getElementById('appDetailReferral').textContent += ` (${app.referrerName})`;
        }
        document.getElementById('appDetailDate').textContent = new Date(app.createdAt).toLocaleString();
        document.getElementById('appDetailStatus').textContent = app.status;
        document.getElementById('appDetailStatus').className = `status-badge ${app.status}`;

        // Show/hide action buttons based on status
        const actionsDiv = document.getElementById('appDetailActions');
        if (app.status === 'pending') {
            actionsDiv.style.display = 'flex';
        } else {
            actionsDiv.style.display = 'none';
        }

        this.showModal('applicationModal');
    },

    async acceptApplication(id) {
        const app = Applications.getApplicationById(id);
        if (!app) return;

        if (!confirm(`Accept application from ${app.firstName} ${app.lastName}?\n\nThis will create a member account and send them a welcome email.`)) {
            return;
        }

        const currentUser = Auth.getCurrentUser();
        const result = Applications.acceptApplication(id, currentUser.email);

        if (result.error) {
            alert('Error: ' + result.error);
            return;
        }

        // Send welcome email
        try {
            const response = await fetch('/.netlify/functions/send-welcome-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: result.member.email,
                    firstName: result.member.firstName,
                    lastName: result.member.lastName,
                    tempPassword: result.tempPassword,
                    type: 'welcome'
                })
            });

            if (response.ok) {
                alert(`Application accepted!\n\nWelcome email sent to ${result.member.email}\nTemporary password: ${result.tempPassword}`);
            } else {
                alert(`Application accepted!\n\nCould not send welcome email. Please send manually.\nTemporary password: ${result.tempPassword}`);
            }
        } catch (error) {
            alert(`Application accepted!\n\nCould not send welcome email. Please send manually.\nTemporary password: ${result.tempPassword}`);
        }

        this.closeModal('applicationModal');
        this.loadApplications();
        this.loadMembers();
        this.loadStats();
    },

    rejectApplication(id) {
        const app = Applications.getApplicationById(id);
        if (!app) return;

        const reason = prompt(`Reject application from ${app.firstName} ${app.lastName}?\n\nOptionally enter a reason (or leave blank):`);

        if (reason === null) return; // User cancelled

        const currentUser = Auth.getCurrentUser();
        const result = Applications.rejectApplication(id, currentUser.email, reason);

        if (result.error) {
            alert('Error: ' + result.error);
            return;
        }

        alert('Application rejected.');
        this.closeModal('applicationModal');
        this.loadApplications();
        this.loadStats();
    },

    loadTransactions() {
        // Sample transactions data
        this.transactions = [
            { id: 1, date: '2026-01-20', memberId: 2, description: 'Platinum Founding Membership', amount: 500, status: 'completed' },
            { id: 2, date: '2026-01-18', memberId: 3, description: 'Boat Event Ticket', amount: 150, status: 'completed' },
            { id: 3, date: '2026-01-15', memberId: 4, description: 'Founding Membership', amount: 250, status: 'completed' },
        ];
        this.renderTransactions();
    },

    // ========================================
    // RENDERING
    // ========================================

    renderMembers(members) {
        const tbody = document.getElementById('membersTableBody');

        if (members.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; color: rgba(255,255,255,0.5); padding: 40px;">
                        No members found
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = members.map(member => `
            <tr>
                <td>
                    <div class="member-cell">
                        <div class="member-avatar-small">${member.firstName[0]}${member.lastName[0]}</div>
                        <div class="member-name-cell">
                            <span class="member-name-text">${member.firstName} ${member.lastName}</span>
                            <span class="member-role-text">${member.role}</span>
                        </div>
                    </div>
                </td>
                <td>${member.email}</td>
                <td>${member.company}</td>
                <td><span class="role-badge ${member.memberType || 'member'}">${this.formatRole(member.memberType)}</span></td>
                <td><span class="status-badge ${member.status || 'active'}">${member.status || 'Active'}</span></td>
                <td>${member.joinedAt ? new Date(member.joinedAt).toLocaleDateString() : 'N/A'}</td>
                <td>
                    <div class="table-actions">
                        <button class="action-icon-btn" onclick="Admin.showActionsModal(${member.id})" title="Actions">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="12" cy="12" r="1"/>
                                <circle cx="12" cy="5" r="1"/>
                                <circle cx="12" cy="19" r="1"/>
                            </svg>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    },

    renderTransactions() {
        const tbody = document.getElementById('transactionsTableBody');

        tbody.innerHTML = this.transactions.map(tx => {
            const member = this.members.find(m => m.id === tx.memberId);
            return `
                <tr>
                    <td>${new Date(tx.date).toLocaleDateString()}</td>
                    <td>${member ? `${member.firstName} ${member.lastName}` : 'Unknown'}</td>
                    <td>${tx.description}</td>
                    <td>$${tx.amount.toFixed(2)}</td>
                    <td><span class="status-badge ${tx.status}">${tx.status}</span></td>
                    <td>
                        <div class="table-actions">
                            ${tx.status === 'completed' ? `
                                <button class="action-icon-btn refund" onclick="Admin.showRefundModal(${tx.id})" title="Refund">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <polyline points="23 4 23 10 17 10"/>
                                        <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                                    </svg>
                                </button>
                            ` : ''}
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    },

    formatRole(role) {
        const labels = {
            'owner': 'Owner',
            'admin': 'Admin',
            'organiser': 'Organiser',
            'platinum_founding': 'Platinum Founding',
            'founding': 'Founding Member',
            'member': 'Member'
        };
        return labels[role] || 'Member';
    },

    // ========================================
    // FILTERING
    // ========================================

    filterMembers() {
        const search = document.getElementById('memberSearchAdmin').value.toLowerCase();
        const roleFilter = document.getElementById('roleFilter').value;
        const statusFilter = document.getElementById('statusFilter').value;

        let filtered = this.members;

        if (search) {
            filtered = filtered.filter(m =>
                m.firstName.toLowerCase().includes(search) ||
                m.lastName.toLowerCase().includes(search) ||
                m.email.toLowerCase().includes(search) ||
                m.company.toLowerCase().includes(search)
            );
        }

        if (roleFilter !== 'all') {
            filtered = filtered.filter(m => m.memberType === roleFilter);
        }

        if (statusFilter !== 'all') {
            filtered = filtered.filter(m => (m.status || 'active') === statusFilter);
        }

        this.renderMembers(filtered);
    },

    // ========================================
    // MODALS
    // ========================================

    showModal(modalId) {
        document.getElementById(modalId).classList.add('active');
    },

    closeModal(modalId) {
        document.getElementById(modalId).classList.remove('active');
    },

    showAddMemberModal() {
        document.getElementById('memberModalTitle').textContent = 'Add Member';
        document.getElementById('memberForm').reset();
        document.getElementById('memberId').value = '';
        document.getElementById('memberPassword').placeholder = 'Enter password';
        document.getElementById('memberPassword').required = true;
        document.getElementById('requirePasswordReset').checked = true;

        // Reset photo
        this.currentMemberPhoto = null;
        this.displayMemberPhoto(null);
        document.getElementById('adminAvatarInitials').textContent = '--';
        document.getElementById('memberPhotoInput').value = '';

        this.showModal('memberModal');
    },

    showActionsModal(memberId) {
        this.currentMemberId = memberId;
        document.getElementById('actionMemberId').value = memberId;
        this.showModal('actionsModal');
    },

    showRefundModal(transactionId) {
        const tx = this.transactions.find(t => t.id === transactionId);
        if (!tx) return;

        document.getElementById('refundTransactionId').value = transactionId;
        document.getElementById('refundAmount').value = tx.amount;
        document.getElementById('refundReason').value = '';
        this.showModal('refundModal');
    },

    // ========================================
    // MEMBER ACTIONS
    // ========================================

    async saveMember(event) {
        event.preventDefault();

        const memberId = document.getElementById('memberId').value;
        const isNew = !memberId;

        const memberData = {
            firstName: document.getElementById('memberFirstName').value,
            lastName: document.getElementById('memberLastName').value,
            email: document.getElementById('memberEmail').value,
            company: document.getElementById('memberCompany').value,
            role: document.getElementById('memberRole').value,
            industry: document.getElementById('memberIndustry').value,
            memberType: document.getElementById('memberType').value,
            status: document.getElementById('memberStatus').value,
            requirePasswordReset: document.getElementById('requirePasswordReset').checked,
            profilePhoto: this.currentMemberPhoto
        };

        const password = document.getElementById('memberPassword').value;
        if (password) {
            memberData.password = password;
        }

        if (isNew) {
            // Add new member
            memberData.id = Date.now();
            memberData.joinedAt = new Date().toISOString();
            memberData.bio = '';
            memberData.website = '';
            memberData.whatsapp = '';
            memberData.zalo = '';
            memberData.telegram = '';
            memberData.linkedin = '';
            memberData.twitter = '';
            memberData.wechat = '';
            memberData.facebook = '';
            memberData.instagram = '';

            // Add to localStorage
            const members = JSON.parse(localStorage.getItem('founders_vietnam_members') || '[]');
            members.push(memberData);
            localStorage.setItem('founders_vietnam_members', JSON.stringify(members));

            alert('Member added successfully!');
        } else {
            // Update existing member
            const members = JSON.parse(localStorage.getItem('founders_vietnam_members') || '[]');
            const index = members.findIndex(m => m.id == memberId);
            if (index !== -1) {
                members[index] = { ...members[index], ...memberData };
                localStorage.setItem('founders_vietnam_members', JSON.stringify(members));
            }
            alert('Member updated successfully!');
        }

        this.closeModal('memberModal');
        await this.loadMembers();
        this.loadStats();
    },

    editMember() {
        const member = this.members.find(m => m.id == this.currentMemberId);
        if (!member) return;

        document.getElementById('memberModalTitle').textContent = 'Edit Member';
        document.getElementById('memberId').value = member.id;
        document.getElementById('memberFirstName').value = member.firstName;
        document.getElementById('memberLastName').value = member.lastName;
        document.getElementById('memberEmail').value = member.email;
        document.getElementById('memberCompany').value = member.company;
        document.getElementById('memberRole').value = member.role;
        document.getElementById('memberIndustry').value = member.industry || 'other';
        document.getElementById('memberType').value = member.memberType || 'member';
        document.getElementById('memberStatus').value = member.status || 'active';
        document.getElementById('memberPassword').placeholder = 'Leave blank to keep current';
        document.getElementById('memberPassword').required = false;
        document.getElementById('requirePasswordReset').checked = member.requirePasswordReset || false;

        // Load profile photo
        this.currentMemberPhoto = member.profilePhoto || null;
        this.displayMemberPhoto(member.profilePhoto);
        document.getElementById('adminAvatarInitials').textContent = member.firstName[0] + member.lastName[0];
        document.getElementById('memberPhotoInput').value = '';

        this.closeModal('actionsModal');
        this.showModal('memberModal');
    },

    suspendMember() {
        const member = this.members.find(m => m.id == this.currentMemberId);
        if (!member) return;

        if (confirm(`Are you sure you want to suspend ${member.firstName} ${member.lastName}?`)) {
            const members = JSON.parse(localStorage.getItem('founders_vietnam_members') || '[]');
            const index = members.findIndex(m => m.id == this.currentMemberId);
            if (index !== -1) {
                members[index].status = 'suspended';
                localStorage.setItem('founders_vietnam_members', JSON.stringify(members));
            }

            this.closeModal('actionsModal');
            this.loadMembers();
            alert('Member suspended.');
        }
    },

    revokeMember() {
        const member = this.members.find(m => m.id == this.currentMemberId);
        if (!member) return;

        if (confirm(`Are you sure you want to revoke membership for ${member.firstName} ${member.lastName}? This action cannot be undone easily.`)) {
            const members = JSON.parse(localStorage.getItem('founders_vietnam_members') || '[]');
            const index = members.findIndex(m => m.id == this.currentMemberId);
            if (index !== -1) {
                members[index].status = 'revoked';
                localStorage.setItem('founders_vietnam_members', JSON.stringify(members));
            }

            this.closeModal('actionsModal');
            this.loadMembers();
            alert('Membership revoked.');
        }
    },

    resetPassword() {
        const member = this.members.find(m => m.id == this.currentMemberId);
        if (!member) return;

        const newPassword = 'TempPass123!';

        if (confirm(`Reset password for ${member.firstName} ${member.lastName}? New temporary password will be: ${newPassword}`)) {
            const members = JSON.parse(localStorage.getItem('founders_vietnam_members') || '[]');
            const index = members.findIndex(m => m.id == this.currentMemberId);
            if (index !== -1) {
                members[index].password = newPassword;
                members[index].requirePasswordReset = true;
                localStorage.setItem('founders_vietnam_members', JSON.stringify(members));
            }

            this.closeModal('actionsModal');
            alert(`Password reset. Temporary password: ${newPassword}`);
        }
    },

    async sendWelcomeEmail() {
        const member = this.members.find(m => m.id == this.currentMemberId);
        if (!member) return;

        if (confirm(`Send welcome email to ${member.email}?`)) {
            try {
                const response = await fetch('/.netlify/functions/send-welcome-email', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email: member.email,
                        firstName: member.firstName,
                        lastName: member.lastName,
                        tempPassword: member.password,
                        type: 'welcome'
                    })
                });

                // Check for HTTP errors
                if (!response.ok) {
                    const errorText = await response.text();
                    console.error('HTTP Error:', response.status, errorText);
                    alert(`Failed to send email (HTTP ${response.status}): ${errorText}`);
                    return;
                }

                const result = await response.json();

                this.closeModal('actionsModal');

                if (result.success) {
                    alert(`Welcome email sent to ${member.email}${result.mock ? ' (logged - email service not configured)' : ''}`);
                } else {
                    alert('Failed to send email: ' + (result.error || 'Unknown error') + (result.details ? '\n\nDetails: ' + result.details : ''));
                }
            } catch (error) {
                console.error('Email error:', error);
                alert('Error sending email: ' + error.message);
            }
        }
    },

    // ========================================
    // MASQUERADE
    // ========================================

    masqueradeAs() {
        const member = this.members.find(m => m.id == this.currentMemberId);
        if (!member) return;

        // Store original admin user
        const currentUser = Auth.getCurrentUser();
        localStorage.setItem('founders_vietnam_original_admin', JSON.stringify({
            userId: currentUser.id,
            timestamp: new Date().toISOString()
        }));

        // Set masquerade user
        localStorage.setItem('founders_vietnam_auth', JSON.stringify({
            userId: member.id,
            loggedInAt: new Date().toISOString(),
            isMasquerade: true
        }));

        this.closeModal('actionsModal');
        window.location.href = 'members.html';
    },

    checkMasquerade() {
        const auth = JSON.parse(localStorage.getItem('founders_vietnam_auth') || '{}');
        const originalAdmin = localStorage.getItem('founders_vietnam_original_admin');

        if (auth.isMasquerade && originalAdmin) {
            const member = this.members.find(m => m.id == auth.userId);
            if (member) {
                document.getElementById('masqueradeBanner').style.display = 'flex';
                document.getElementById('masqueradeName').textContent = `${member.firstName} ${member.lastName}`;
            }
        }
    },

    endMasquerade() {
        const originalAdmin = JSON.parse(localStorage.getItem('founders_vietnam_original_admin') || '{}');

        if (originalAdmin.userId) {
            localStorage.setItem('founders_vietnam_auth', JSON.stringify({
                userId: originalAdmin.userId,
                loggedInAt: new Date().toISOString()
            }));
            localStorage.removeItem('founders_vietnam_original_admin');
        }

        window.location.href = 'admin.html';
    },

    // ========================================
    // REFUNDS
    // ========================================

    processRefund(event) {
        event.preventDefault();

        const transactionId = document.getElementById('refundTransactionId').value;
        const amount = document.getElementById('refundAmount').value;
        const reason = document.getElementById('refundReason').value;

        // In a real app, this would process the refund through a payment gateway
        const txIndex = this.transactions.findIndex(t => t.id == transactionId);
        if (txIndex !== -1) {
            this.transactions[txIndex].status = 'refunded';
        }

        this.closeModal('refundModal');
        this.renderTransactions();
        alert(`Refund of $${amount} processed successfully.\nReason: ${reason}`);
    }
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    Admin.init();
});

// Global masquerade check for other pages
function checkMasqueradeOnOtherPages() {
    const auth = JSON.parse(localStorage.getItem('founders_vietnam_auth') || '{}');
    const originalAdmin = localStorage.getItem('founders_vietnam_original_admin');

    if (auth.isMasquerade && originalAdmin) {
        // Inject masquerade banner
        const banner = document.createElement('div');
        banner.className = 'masquerade-banner';
        banner.style.cssText = 'position:fixed;top:0;left:0;right:0;background:linear-gradient(90deg,#c9a227,#e5c464);color:#1a1a1a;padding:10px 20px;display:flex;justify-content:center;align-items:center;gap:20px;z-index:1001;font-family:Outfit,sans-serif;';

        const user = Auth.getCurrentUser();
        banner.innerHTML = `
            <span>Viewing as: <strong>${user ? user.firstName + ' ' + user.lastName : 'Unknown'}</strong></span>
            <button onclick="endMasqueradeGlobal()" style="background:#1a1a1a;color:#fff;border:none;padding:6px 16px;border-radius:4px;cursor:pointer;font-family:Outfit,sans-serif;font-weight:500;">End Session</button>
        `;
        document.body.insertBefore(banner, document.body.firstChild);

        // Adjust nav position
        const nav = document.querySelector('.nav');
        if (nav) nav.style.top = '44px';
    }
}

function endMasqueradeGlobal() {
    const originalAdmin = JSON.parse(localStorage.getItem('founders_vietnam_original_admin') || '{}');

    if (originalAdmin.userId) {
        localStorage.setItem('founders_vietnam_auth', JSON.stringify({
            userId: originalAdmin.userId,
            loggedInAt: new Date().toISOString()
        }));
        localStorage.removeItem('founders_vietnam_original_admin');
    }

    window.location.href = 'admin.html';
}

// Check masquerade on non-admin pages
if (!window.location.pathname.includes('admin.html')) {
    document.addEventListener('DOMContentLoaded', checkMasqueradeOnOtherPages);
}
