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
        // Try Supabase first, fallback to localStorage
        const client = this.getClient();

        if (client) {
            try {
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

                if (!error) {
                    return { data, error: null };
                }
                // Fall through to localStorage if Supabase fails
                console.log('Supabase failed, using localStorage fallback');
            } catch (e) {
                console.log('Supabase error, using localStorage fallback');
            }
        }

        // localStorage fallback
        const application = {
            id: 'app-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
            status: 'pending',
            submittedAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            firstName: applicationData.firstName,
            lastName: applicationData.lastName,
            email: applicationData.email,
            age: applicationData.age,
            socialLink: applicationData.socialLink,
            company: applicationData.company,
            role: applicationData.role,
            industry: applicationData.industry,
            revenue: applicationData.revenue,
            teamSize: applicationData.teamSize,
            biggestChallenge: applicationData.biggestChallenge,
            uniqueValue: applicationData.uniqueValue,
            goals12Month: applicationData.goals12Month,
            whyJoin: applicationData.whyJoin,
            referral: applicationData.referral,
            referrerName: applicationData.referrerName,
            event: applicationData.event,
            membership: applicationData.membership,
            // Payment info
            paymentIntentId: applicationData.paymentIntentId || null,
            paymentStatus: applicationData.paymentStatus || 'pending',
            amountPaid: applicationData.amountPaid || 0
        };

        const apps = JSON.parse(localStorage.getItem('founders_vietnam_applications') || '[]');
        apps.unshift(application);
        localStorage.setItem('founders_vietnam_applications', JSON.stringify(apps));

        return { data: application, error: null };
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
    },

    // ========================================
    // TRANSACTIONS
    // ========================================

    async createTransaction(transactionData) {
        const client = this.getClient();

        const transaction = {
            id: transactionData.id || 'txn-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
            user_id: transactionData.userId || null,
            user_email: transactionData.email,
            user_name: transactionData.firstName + ' ' + transactionData.lastName,
            amount: transactionData.amount,
            currency: transactionData.currency || 'USD',
            status: transactionData.status || 'attempted', // attempted, processing, completed, failed, refunded
            payment_intent_id: transactionData.paymentIntentId || null,
            payment_method: transactionData.paymentMethod || 'card',
            product_id: transactionData.productId,
            product_name: transactionData.productName,
            event_id: transactionData.eventId,
            error_message: transactionData.errorMessage || null,
            metadata: transactionData.metadata || {},
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        if (client) {
            try {
                const { data, error } = await client
                    .from('transactions')
                    .insert({
                        id: transaction.id,
                        user_id: transaction.user_id,
                        user_email: transaction.user_email,
                        user_name: transaction.user_name,
                        amount: transaction.amount,
                        currency: transaction.currency,
                        status: transaction.status,
                        payment_intent_id: transaction.payment_intent_id,
                        payment_method: transaction.payment_method,
                        product_id: transaction.product_id,
                        product_name: transaction.product_name,
                        event_id: transaction.event_id,
                        error_message: transaction.error_message,
                        metadata: transaction.metadata
                    })
                    .select()
                    .single();

                if (!error) {
                    console.log('Transaction saved to database:', data);
                    return { data, error: null };
                }
                console.error('Supabase transaction error:', error);
            } catch (e) {
                console.error('Transaction save error:', e);
            }
        }

        // Return the transaction object even if DB save failed
        console.log('Transaction created (DB unavailable):', transaction);
        return { data: transaction, error: null };
    },

    async updateTransactionStatus(transactionId, status, errorMessage = null) {
        const client = this.getClient();

        const updateData = {
            status: status,
            updated_at: new Date().toISOString()
        };

        if (errorMessage) {
            updateData.error_message = errorMessage;
        }

        if (client) {
            try {
                const { data, error } = await client
                    .from('transactions')
                    .update(updateData)
                    .eq('id', transactionId)
                    .select()
                    .single();

                if (!error) {
                    console.log('Transaction status updated:', data);
                    return { data, error: null };
                }
                console.error('Update transaction error:', error);
            } catch (e) {
                console.error('Transaction update error:', e);
            }
        }

        return { data: { id: transactionId, ...updateData }, error: null };
    },

    async getTransactionsByUser(userId) {
        const client = this.getClient();
        if (!client) return [];

        const { data, error } = await client
            .from('transactions')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Get transactions error:', error);
            return [];
        }

        return data || [];
    },

    async getTransactionsByEmail(email) {
        const client = this.getClient();
        if (!client) return [];

        const { data, error } = await client
            .from('transactions')
            .select('*')
            .eq('user_email', email)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Get transactions error:', error);
            return [];
        }

        return data || [];
    },

    async getAllTransactions(limit = 100) {
        const client = this.getClient();
        if (!client) return [];

        const { data, error } = await client
            .from('transactions')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) {
            console.error('Get all transactions error:', error);
            return [];
        }

        return data || [];
    },

    // ========================================
    // BOOKINGS
    // ========================================

    async createBooking(bookingData) {
        const client = this.getClient();

        const booking = {
            id: bookingData.id || 'bkg-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
            user_id: bookingData.userId || null,
            user_email: bookingData.email,
            user_name: bookingData.firstName + ' ' + bookingData.lastName,
            event_id: bookingData.eventId,
            ticket_type: bookingData.ticketType || bookingData.ticketId,
            ticket_name: bookingData.ticketName,
            ticket_price: bookingData.ticketPrice,
            transaction_id: bookingData.transactionId || null,
            payment_status: bookingData.paymentStatus || 'pending',
            booking_status: bookingData.bookingStatus || 'confirmed',
            created_at: new Date().toISOString()
        };

        if (client) {
            try {
                const { data, error } = await client
                    .from('bookings')
                    .insert({
                        id: booking.id,
                        user_id: booking.user_id,
                        user_email: booking.user_email,
                        user_name: booking.user_name,
                        event_id: booking.event_id,
                        ticket_type: booking.ticket_type,
                        ticket_name: booking.ticket_name,
                        ticket_price: booking.ticket_price,
                        transaction_id: booking.transaction_id,
                        payment_status: booking.payment_status,
                        booking_status: booking.booking_status
                    })
                    .select()
                    .single();

                if (!error) {
                    console.log('Booking saved to database:', data);
                    return { data, error: null };
                }
                console.error('Supabase booking error:', error);
            } catch (e) {
                console.error('Booking save error:', e);
            }
        }

        // Return the booking object even if DB save failed
        console.log('Booking created (DB unavailable):', booking);
        return { data: booking, error: null };
    },

    async getBookingsByUser(userId) {
        const client = this.getClient();
        if (!client) return [];

        const { data, error } = await client
            .from('bookings')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Get bookings error:', error);
            return [];
        }

        return data || [];
    },

    async getBookingsByEmail(email) {
        const client = this.getClient();
        if (!client) return [];

        const { data, error } = await client
            .from('bookings')
            .select('*')
            .eq('user_email', email)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Get bookings error:', error);
            return [];
        }

        return data || [];
    },

    async getBookingsByEvent(eventId) {
        const client = this.getClient();
        if (!client) return [];

        const { data, error } = await client
            .from('bookings')
            .select('*')
            .eq('event_id', eventId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Get event bookings error:', error);
            return [];
        }

        return data || [];
    },

    async getAllBookings(limit = 100) {
        const client = this.getClient();
        if (!client) return [];

        const { data, error } = await client
            .from('bookings')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) {
            console.error('Get all bookings error:', error);
            return [];
        }

        return data || [];
    },

    async getBookingStats(eventId) {
        const client = this.getClient();
        if (!client) return { dinner: 0, cruise: 0, total: 0 };

        const { data, error } = await client
            .from('bookings')
            .select('ticket_type')
            .eq('event_id', eventId)
            .eq('booking_status', 'confirmed');

        if (error) {
            console.error('Get booking stats error:', error);
            return { dinner: 0, cruise: 0, total: 0 };
        }

        const dinnerCount = data?.filter(b => b.ticket_type === 'dinner').length || 0;
        const cruiseCount = data?.filter(b => b.ticket_type === 'cruise' || b.ticket_type === 'full').length || 0;

        return {
            dinner: dinnerCount,
            cruise: cruiseCount,
            total: data?.length || 0
        };
    }
};

// Make available globally
window.Database = Database;
