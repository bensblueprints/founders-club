// ========================================
// FOUNDERS VIETNAM - Authentication System
// Supports both Supabase and localStorage fallback
// ========================================

// Sample members data for localStorage fallback
const SAMPLE_MEMBERS = [
    {
        id: 1,
        email: 'demo@foundersvietnam.com',
        password: 'demo123',
        firstName: 'Minh',
        lastName: 'Nguyen',
        company: 'VietTech Solutions',
        role: 'Founder & CEO',
        industry: 'saas',
        bio: 'Building enterprise SaaS for Southeast Asian businesses. Previously exited a logistics startup.',
        website: 'https://viettech.vn',
        whatsapp: '+84 909 123 456',
        zalo: '+84 909 123 456',
        telegram: '@minhtech',
        linkedin: 'https://linkedin.com/in/minhnguyen',
        twitter: '@minhbuilds',
        wechat: '',
        facebook: '',
        instagram: ''
    },
    {
        id: 2,
        email: 'sarah@example.com',
        password: 'password',
        firstName: 'Sarah',
        lastName: 'Chen',
        company: 'GreenLeaf Commerce',
        role: 'Co-Founder',
        industry: 'ecommerce',
        bio: 'Sustainable e-commerce platform connecting local artisans with global markets. $2M ARR.',
        website: 'https://greenleafcommerce.com',
        whatsapp: '+84 912 345 678',
        zalo: '',
        telegram: '@sarahchen',
        linkedin: 'https://linkedin.com/in/sarahchen',
        twitter: '',
        wechat: 'sarahchen88',
        facebook: '',
        instagram: '@sarahbuilds'
    },
    {
        id: 3,
        email: 'david@example.com',
        password: 'password',
        firstName: 'David',
        lastName: 'Park',
        company: 'FinanceFlow',
        role: 'CEO',
        industry: 'fintech',
        bio: 'Revolutionizing cross-border payments in ASEAN. Ex-Goldman Sachs. Series A funded.',
        website: 'https://financeflow.io',
        whatsapp: '+84 903 456 789',
        zalo: '+84 903 456 789',
        telegram: '@davidpark',
        linkedin: 'https://linkedin.com/in/davidpark',
        twitter: '@davidfintech',
        wechat: '',
        facebook: '',
        instagram: ''
    },
    {
        id: 4,
        email: 'linh@example.com',
        password: 'password',
        firstName: 'Linh',
        lastName: 'Tran',
        company: 'MediViet',
        role: 'Founder',
        industry: 'healthtech',
        bio: 'Telemedicine platform serving 500K+ patients across Vietnam. Doctor by training, entrepreneur by passion.',
        website: 'https://mediviet.vn',
        whatsapp: '',
        zalo: '+84 908 765 432',
        telegram: '',
        linkedin: 'https://linkedin.com/in/linhtran',
        twitter: '',
        wechat: '',
        facebook: 'https://facebook.com/linhtranmd',
        instagram: '@drlinh'
    },
    {
        id: 5,
        email: 'alex@example.com',
        password: 'password',
        firstName: 'Alex',
        lastName: 'Morrison',
        company: 'BrandForge Agency',
        role: 'Founder & Creative Director',
        industry: 'agency',
        bio: 'Full-service branding agency for tech startups. Worked with 50+ funded companies. Based in HCMC.',
        website: 'https://brandforge.co',
        whatsapp: '+84 901 234 567',
        zalo: '',
        telegram: '@alexbrandforge',
        linkedin: 'https://linkedin.com/in/alexmorrison',
        twitter: '@alexcreates',
        wechat: '',
        facebook: '',
        instagram: '@brandforge'
    },
    {
        id: 6,
        email: 'anna@example.com',
        password: 'password',
        firstName: 'Anna',
        lastName: 'Volkov',
        company: 'AIStudio',
        role: 'CTO & Co-Founder',
        industry: 'ai',
        bio: 'AI/ML consulting and product development. PhD in Computer Science. Building AI tools for SMBs.',
        website: 'https://aistudio.tech',
        whatsapp: '+84 907 654 321',
        zalo: '',
        telegram: '@annaai',
        linkedin: 'https://linkedin.com/in/annavolkov',
        twitter: '@annavolkovai',
        wechat: '',
        facebook: '',
        instagram: ''
    },
    {
        id: 7,
        email: 'james@example.com',
        password: 'password',
        firstName: 'James',
        lastName: 'Wilson',
        company: 'PropTech Vietnam',
        role: 'Founder',
        industry: 'real-estate',
        bio: 'Digital platform for real estate investment in Vietnam. Helping foreigners invest safely.',
        website: 'https://proptechvn.com',
        whatsapp: '+84 905 111 222',
        zalo: '+84 905 111 222',
        telegram: '@jameswilson',
        linkedin: 'https://linkedin.com/in/jameswilson',
        twitter: '',
        wechat: 'jamesvn',
        facebook: '',
        instagram: ''
    },
    {
        id: 8,
        email: 'thu@example.com',
        password: 'password',
        firstName: 'Thu',
        lastName: 'Le',
        company: 'EduSmart',
        role: 'CEO',
        industry: 'edtech',
        bio: 'Online learning platform for K-12 students. 100K+ active users. Expanding to Thailand.',
        website: 'https://edusmart.vn',
        whatsapp: '',
        zalo: '+84 906 333 444',
        telegram: '@thule',
        linkedin: 'https://linkedin.com/in/thule',
        twitter: '',
        wechat: '',
        facebook: 'https://facebook.com/thuedusmart',
        instagram: '@thu.builds'
    }
];

// Auth namespace - works with Supabase or localStorage
const Auth = {
    STORAGE_KEY: 'founders_vietnam_auth',
    MEMBERS_KEY: 'founders_vietnam_members',

    // Check if Supabase is available
    useSupabase() {
        return window.SupabaseConfig?.isConfigured() && window.Database;
    },

    // Initialize
    init() {
        // Always initialize localStorage with sample members as fallback
        // This ensures sync methods work even when Supabase is configured
        if (!localStorage.getItem(this.MEMBERS_KEY)) {
            localStorage.setItem(this.MEMBERS_KEY, JSON.stringify(SAMPLE_MEMBERS));
        }
    },

    // Get all members
    async getMembers() {
        if (this.useSupabase()) {
            return await Database.getMembers();
        }
        this.init();
        return JSON.parse(localStorage.getItem(this.MEMBERS_KEY) || '[]');
    },

    // Sync version for compatibility
    getMembersSync() {
        this.init();
        return JSON.parse(localStorage.getItem(this.MEMBERS_KEY) || '[]');
    },

    // Get member by ID
    async getMemberById(id) {
        if (this.useSupabase()) {
            return await Database.getMemberById(id);
        }
        const members = this.getMembersSync();
        return members.find(m => m.id === id || m.id === parseInt(id));
    },

    // Sync version
    getMemberByIdSync(id) {
        const members = this.getMembersSync();
        return members.find(m => m.id === id || m.id === parseInt(id));
    },

    // Check if logged in
    async isLoggedIn() {
        if (this.useSupabase()) {
            return await Database.isLoggedIn();
        }
        return localStorage.getItem(this.STORAGE_KEY) !== null;
    },

    // Sync version
    isLoggedInSync() {
        if (this.useSupabase()) {
            // For sync check, use session storage cache
            return localStorage.getItem(this.STORAGE_KEY) !== null;
        }
        return localStorage.getItem(this.STORAGE_KEY) !== null;
    },

    // Get current user
    async getCurrentUser() {
        if (this.useSupabase()) {
            return await Database.getCurrentUser();
        }
        if (!this.isLoggedInSync()) return null;
        const auth = JSON.parse(localStorage.getItem(this.STORAGE_KEY));
        const members = this.getMembersSync();
        return members.find(m => m.id === auth.userId);
    },

    // Sync version
    getCurrentUserSync() {
        if (!this.isLoggedInSync()) return null;
        const auth = JSON.parse(localStorage.getItem(this.STORAGE_KEY));
        const members = this.getMembersSync();
        return members.find(m => m.id === auth.userId);
    },

    // Login
    async login(email, password) {
        if (this.useSupabase()) {
            const result = await Database.signIn(email, password);
            if (!result.error) {
                // Cache for sync access
                localStorage.setItem(this.STORAGE_KEY, JSON.stringify({
                    userId: result.data.user.id,
                    loggedInAt: new Date().toISOString()
                }));
            }
            return !result.error;
        }

        // localStorage fallback
        const members = this.getMembersSync();
        const user = members.find(m => m.email === email && m.password === password);
        
        if (user) {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify({
                userId: user.id,
                loggedInAt: new Date().toISOString()
            }));
            return true;
        }
        return false;
    },

    // Register
    async register(data) {
        if (this.useSupabase()) {
            const result = await Database.signUp(data.email, data.password, data);
            if (!result.error) {
                localStorage.setItem(this.STORAGE_KEY, JSON.stringify({
                    userId: result.data.user.id,
                    loggedInAt: new Date().toISOString()
                }));
            }
            return !result.error;
        }

        // localStorage fallback
        const members = this.getMembersSync();
        
        if (members.find(m => m.email === data.email)) {
            return false;
        }

        const newUser = {
            id: Date.now(),
            email: data.email,
            password: data.password,
            firstName: data.firstName,
            lastName: data.lastName,
            company: data.company,
            role: data.role,
            industry: data.industry,
            bio: '',
            website: '',
            whatsapp: '',
            zalo: '',
            telegram: '',
            linkedin: '',
            twitter: '',
            wechat: '',
            facebook: '',
            instagram: ''
        };

        members.push(newUser);
        localStorage.setItem(this.MEMBERS_KEY, JSON.stringify(members));

        localStorage.setItem(this.STORAGE_KEY, JSON.stringify({
            userId: newUser.id,
            loggedInAt: new Date().toISOString()
        }));

        return true;
    },

    // Update profile
    async updateProfile(data) {
        if (this.useSupabase()) {
            const user = await this.getCurrentUser();
            if (!user) return false;
            const result = await Database.updateMemberProfile(user.id, data);
            return !result.error;
        }

        // localStorage fallback
        const user = this.getCurrentUserSync();
        if (!user) return false;

        const members = this.getMembersSync();
        const index = members.findIndex(m => m.id === user.id);
        
        if (index === -1) return false;

        members[index] = {
            ...members[index],
            firstName: data.firstName || members[index].firstName,
            lastName: data.lastName || members[index].lastName,
            bio: data.bio || '',
            company: data.company || members[index].company,
            role: data.role || members[index].role,
            industry: data.industry || members[index].industry,
            website: data.website || '',
            whatsapp: data.whatsapp || '',
            zalo: data.zalo || '',
            telegram: data.telegram || '',
            linkedin: data.linkedin || '',
            twitter: data.twitter || '',
            wechat: data.wechat || '',
            facebook: data.facebook || '',
            instagram: data.instagram || ''
        };

        localStorage.setItem(this.MEMBERS_KEY, JSON.stringify(members));
        return true;
    },

    // Logout
    async logout() {
        if (this.useSupabase()) {
            await Database.signOut();
        }
        localStorage.removeItem(this.STORAGE_KEY);
    },

    // For backwards compatibility
    getMembers() {
        return this.getMembersSync();
    },

    getMemberById(id) {
        return this.getMemberByIdSync(id);
    },

    isLoggedIn() {
        return this.isLoggedInSync();
    },

    getCurrentUser() {
        return this.getCurrentUserSync();
    }
};

// Initialize on load
Auth.init();
