// ========================================
// FOUNDERS VIETNAM - Database Service (Supabase)
// ========================================

const Database = {
    // ========================================
    // INITIALIZATION
    // ========================================
    
    async init() {
        if (!window.SupabaseConfig?.isConfigured()) {
            console.warn('Supabase not configured. Using localStorage fallback.');
            return false;
        }
        return true;
    },

    getClient() {
        return window.SupabaseConfig?.client;
    },

    // ========================================
    // AUTHENTICATION
    // ========================================

    async signUp(email, password, profileData) {
        const client = this.getClient();
        if (!client) return { error: 'Database not configured' };

        try {
            // Create auth user
            const { data: authData, error: authError } = await client.auth.signUp({
                email,
                password
            });

            if (authError) throw authError;

            // Create member profile
            const { data: member, error: memberError } = await client
                .from('members')
                .insert({
                    id: authData.user.id,
                    email: email,
                    first_name: profileData.firstName,
                    last_name: profileData.lastName,
                    company: profileData.company,
                    role: profileData.role,
                    industry: profileData.industry,
                    is_approved: true, // Auto-approve for now
                    password_hash: 'managed_by_supabase_auth'
                })
                .select()
                .single();

            if (memberError) throw memberError;

            return { data: { user: authData.user, member }, error: null };
        } catch (error) {
            console.error('SignUp error:', error);
            return { data: null, error: error.message };
        }
    },

    async signIn(email, password) {
        const client = this.getClient();
        if (!client) return { error: 'Database not configured' };

        try {
            const { data, error } = await client.auth.signInWithPassword({
                email,
                password
            });

            if (error) throw error;

            return { data, error: null };
        } catch (error) {
            console.error('SignIn error:', error);
            return { data: null, error: error.message };
        }
    },

    async signOut() {
        const client = this.getClient();
        if (!client) return;

        await client.auth.signOut();
    },

    async getCurrentUser() {
        const client = this.getClient();
        if (!client) return null;

        const { data: { user } } = await client.auth.getUser();
        if (!user) return null;

        // Get member profile
        const { data: member } = await client
            .from('members')
            .select('*')
            .eq('id', user.id)
            .single();

        return member;
    },

    async isLoggedIn() {
        const client = this.getClient();
        if (!client) return false;

        const { data: { session } } = await client.auth.getSession();
        return !!session;
    },

    // ========================================
    // MEMBERS
    // ========================================

    async getMembers() {
        const client = this.getClient();
        if (!client) return [];

        const { data, error } = await client
            .from('members')
            .select('*')
            .eq('is_approved', true)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Get members error:', error);
            return [];
        }

        return data || [];
    },

    async getMemberById(id) {
        const client = this.getClient();
        if (!client) return null;

        const { data, error } = await client
            .from('members')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            console.error('Get member error:', error);
            return null;
        }

        return data;
    },

    async updateMemberProfile(id, profileData) {
        const client = this.getClient();
        if (!client) return { error: 'Database not configured' };

        const { data, error } = await client
            .from('members')
            .update({
                first_name: profileData.firstName,
                last_name: profileData.lastName,
                bio: profileData.bio,
                company: profileData.company,
                role: profileData.role,
                industry: profileData.industry,
                website: profileData.website,
                whatsapp: profileData.whatsapp,
                zalo: profileData.zalo,
                telegram: profileData.telegram,
                linkedin: profileData.linkedin,
                twitter: profileData.twitter,
                wechat: profileData.wechat,
                facebook: profileData.facebook,
                instagram: profileData.instagram
            })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Update profile error:', error);
            return { data: null, error: error.message };
        }

        return { data, error: null };
    },

    // ========================================
    // APPLICATIONS
    // ========================================

    async submitApplication(applicationData) {
        const client = this.getClient();
        if (!client) return { error: 'Database not configured' };

        const { data, error } = await client
            .from('applications')
            .insert({
                first_name: applicationData.firstName,
                last_name: applicationData.lastName,
                email: applicationData.email,
                age: applicationData.age,
                social_link: applicationData.socialLink,
                company: applicationData.company,
                role: applicationData.role,
                industry: applicationData.industry,
                revenue: applicationData.revenue,
                team_size: applicationData.teamSize,
                biggest_challenge: applicationData.biggestChallenge,
                unique_value: applicationData.uniqueValue,
                goals_12_month: applicationData.goals12Month,
                why_join: applicationData.whyJoin,
                referral: applicationData.referral,
                referrer_name: applicationData.referrerName,
                event_interest: applicationData.event,
                membership_type: applicationData.membership
            })
            .select()
            .single();

        if (error) {
            console.error('Submit application error:', error);
            return { data: null, error: error.message };
        }

        return { data, error: null };
    },

    async getApplications(status = null) {
        const client = this.getClient();
        if (!client) return [];

        let query = client.from('applications').select('*');
        
        if (status) {
            query = query.eq('status', status);
        }

        const { data, error } = await query.order('created_at', { ascending: false });

        if (error) {
            console.error('Get applications error:', error);
            return [];
        }

        return data || [];
    },

    // ========================================
    // EVENTS
    // ========================================

    async getEvents(status = null) {
        const client = this.getClient();
        if (!client) return [];

        let query = client.from('events').select('*');
        
        if (status) {
            query = query.eq('status', status);
        }

        const { data, error } = await query.order('event_date', { ascending: true });

        if (error) {
            console.error('Get events error:', error);
            return [];
        }

        return data || [];
    },

    async getEventBySlug(slug) {
        const client = this.getClient();
        if (!client) return null;

        const { data, error } = await client
            .from('events')
            .select('*')
            .eq('slug', slug)
            .single();

        if (error) {
            console.error('Get event error:', error);
            return null;
        }

        return data;
    },

    async getPastEvents() {
        const client = this.getClient();
        if (!client) return [];

        const { data, error } = await client
            .from('events')
            .select('*')
            .eq('status', 'completed')
            .order('event_date', { ascending: false });

        if (error) {
            console.error('Get past events error:', error);
            return [];
        }

        return data || [];
    },

    // ========================================
    // EVENT ATTENDANCE
    // ========================================

    async getEventAttendees(eventId) {
        const client = this.getClient();
        if (!client) return [];

        const { data, error } = await client
            .from('event_attendance')
            .select(`
                *,
                member:members(*)
            `)
            .eq('event_id', eventId);

        if (error) {
            console.error('Get attendees error:', error);
            return [];
        }

        return data?.map(a => a.member) || [];
    },

    async didUserAttendEvent(memberId, eventId) {
        const client = this.getClient();
        if (!client) return false;

        const { data, error } = await client
            .from('event_attendance')
            .select('id')
            .eq('event_id', eventId)
            .eq('member_id', memberId)
            .single();

        return !!data && !error;
    },

    async registerForEvent(memberId, eventId, ticketType) {
        const client = this.getClient();
        if (!client) return { error: 'Database not configured' };

        const { data, error } = await client
            .from('event_attendance')
            .insert({
                event_id: eventId,
                member_id: memberId,
                ticket_type: ticketType
            })
            .select()
            .single();

        if (error) {
            console.error('Register for event error:', error);
            return { data: null, error: error.message };
        }

        return { data, error: null };
    },

    // ========================================
    // EVENT PHOTOS
    // ========================================

    async getEventPhotos(eventId) {
        const client = this.getClient();
        if (!client) return [];

        const { data, error } = await client
            .from('event_photos')
            .select('*')
            .eq('event_id', eventId)
            .order('display_order', { ascending: true });

        if (error) {
            console.error('Get photos error:', error);
            return [];
        }

        return data || [];
    },

    async addEventPhoto(eventId, photoUrl, caption = '') {
        const client = this.getClient();
        if (!client) return { error: 'Database not configured' };

        const user = await this.getCurrentUser();
        
        const { data, error } = await client
            .from('event_photos')
            .insert({
                event_id: eventId,
                photo_url: photoUrl,
                caption: caption,
                uploaded_by: user?.id
            })
            .select()
            .single();

        if (error) {
            console.error('Add photo error:', error);
            return { data: null, error: error.message };
        }

        return { data, error: null };
    }
};

// Make available globally
window.Database = Database;
