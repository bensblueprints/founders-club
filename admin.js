// ========================================
// FOUNDERS VIETNAM - Admin Dashboard
// ========================================

const Admin = {
    currentMemberId: null,
    members: [],
    transactions: [],

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

        // Check for masquerade
        this.checkMasquerade();

        // Load data
        await this.loadMembers();
        this.loadStats();
        this.loadTransactions();

        // Setup tabs
        this.setupTabs();

        // Setup search and filters
        this.setupFilters();
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

        document.getElementById('totalMembers').textContent = total;
        document.getElementById('platinumMembers').textContent = platinum;
        document.getElementById('totalEvents').textContent = '3'; // Placeholder
        document.getElementById('totalRevenue').textContent = '$12,500'; // Placeholder
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
            requirePasswordReset: document.getElementById('requirePasswordReset').checked
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
