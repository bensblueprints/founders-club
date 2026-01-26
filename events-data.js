// ========================================
// FOUNDERS VIETNAM - Events Data
// ========================================

// Upcoming Events (for booking)
const UPCOMING_EVENTS = [
    // ===== FEBRUARY 2026 =====
    {
        id: 'feb-2026',
        slug: 'february-gathering',
        name: 'February Gathering',
        type: 'gathering',
        date: '2026-02-10',
        displayDate: 'February 10, 2026',
        day: 'Tuesday',
        time: '6:00 PM - 10:00 PM',
        location: 'Four U Lounge, Da Nang',
        address: '118-120 Vo Nguyen Giap Street, Son Tra District, Da Nang, Vietnam',
        description: 'Join us for an exclusive evening at Four U Lounge. The Founders Dinner (6-8pm) brings together Vietnam\'s most ambitious entrepreneurs for curated networking. Continue the evening with the Poseidon Cruise (8:30-10pm) on the Da Nang River.',
        capacity: 50,
        dinnerCapacity: 50,
        cruiseCapacity: 30,
        spotsRemaining: 35,
        dinnerSpotsRemaining: 35,
        cruiseSpotsRemaining: 22,
        isPlatinumEvent: false,
        speakers: [
            {
                id: 'benjamin',
                name: 'Benjamin',
                topic: 'Conversion Rates & Optimization',
                description: 'Proven strategies to improve conversion rates and maximize revenue',
                badge: '8-Figure Earner',
                pullProfilePhoto: true
            },
            {
                id: 'prithamesh',
                name: 'Prithamesh',
                topic: 'Facebook Ads Mastery',
                description: 'Scaling with Facebook advertising in 2026',
                pullProfilePhoto: true
            },
            {
                id: 'saurabh',
                name: 'Saurabh',
                topic: 'Email Marketing',
                description: 'Building profitable email campaigns that convert',
                pullProfilePhoto: true
            }
        ],
        tickets: [
            {
                id: 'dinner-feb',
                name: 'Founders Dinner',
                price: 149,
                currency: 'USD',
                description: 'Dinner + networking at Four U Lounge (6:00 PM - 8:00 PM)',
                capacity: 50,
                perks: ['Curated dinner experience', 'Premium drinks included', 'Founder introductions', 'Networking session', 'Member directory access']
            },
            {
                id: 'dinner-cruise-feb',
                name: 'Founders Dinner + Poseidon Cruise',
                price: 498,
                currency: 'USD',
                description: 'Full experience: Dinner (6-8pm) + Cruise (8:30-10pm). Includes Platinum Founding Member status.',
                includesDinner: true,
                includesCruise: true,
                isPlatinum: true,
                capacity: 30,
                perks: ['Founders Dinner (6-8pm)', 'Poseidon Cruise (8:30-10pm)', 'Premium open bar on cruise', 'Platinum Founding Member status', 'Priority access to future events', 'Stunning Da Nang river views']
            }
        ],
        image: '/images/gathering-event.jpg',
        status: 'open'
    },
    // ===== MARCH 2026 =====
    {
        id: 'mar-2026',
        slug: 'march-gathering',
        name: 'March Gathering',
        type: 'gathering',
        date: '2026-03-11',
        displayDate: 'March 11, 2026',
        day: 'Wednesday',
        time: '6:00 PM - 10:00 PM',
        location: 'Four U Lounge, Da Nang',
        address: '118-120 Vo Nguyen Giap Street, Son Tra District, Da Nang, Vietnam',
        description: 'Join us for an exclusive evening at Four U Lounge. The Founders Dinner (6-8pm) brings together Vietnam\'s most ambitious entrepreneurs for curated networking. Continue the evening with the Poseidon Cruise (8:30-10pm) on the Da Nang River.',
        capacity: 50,
        cruiseCapacity: 30,
        spotsRemaining: 50,
        cruiseSpotsRemaining: 30,
        isPlatinumEvent: false,
        tickets: [
            {
                id: 'dinner-mar',
                name: 'Founders Dinner',
                price: 149,
                currency: 'USD',
                description: 'Dinner + networking at Four U Lounge (6:00 PM - 8:00 PM)',
                perks: ['Curated dinner experience', 'Premium drinks included', 'Founder introductions', 'Networking session', 'Member directory access']
            },
            {
                id: 'dinner-cruise-mar',
                name: 'Founders Dinner + Poseidon Cruise',
                price: 498,
                currency: 'USD',
                description: 'Full experience: Dinner (6-8pm) + Cruise (8:30-10pm). Includes Platinum Founding Member status.',
                includesDinner: true,
                includesCruise: true,
                isPlatinum: true,
                perks: ['Founders Dinner (6-8pm)', 'Poseidon Cruise (8:30-10pm)', 'Premium open bar on cruise', 'Platinum Founding Member status', 'Priority access to future events', 'Stunning Da Nang river views']
            }
        ],
        image: '/images/gathering-event.jpg',
        status: 'open'
    },
    // ===== APRIL 2026 =====
    {
        id: 'apr-2026',
        slug: 'april-gathering',
        name: 'April Gathering',
        type: 'gathering',
        date: '2026-04-14',
        displayDate: 'April 14, 2026',
        day: 'Tuesday',
        time: '6:00 PM - 10:00 PM',
        location: 'Four U Lounge, Da Nang',
        address: '118-120 Vo Nguyen Giap Street, Son Tra District, Da Nang, Vietnam',
        description: 'Join us for an exclusive evening at Four U Lounge. The Founders Dinner (6-8pm) brings together Vietnam\'s most ambitious entrepreneurs for curated networking. Continue the evening with the Poseidon Cruise (8:30-10pm) on the Da Nang River.',
        capacity: 50,
        cruiseCapacity: 30,
        spotsRemaining: 50,
        cruiseSpotsRemaining: 30,
        isPlatinumEvent: false,
        tickets: [
            {
                id: 'dinner-apr',
                name: 'Founders Dinner',
                price: 149,
                currency: 'USD',
                description: 'Dinner + networking at Four U Lounge (6:00 PM - 8:00 PM)',
                perks: ['Curated dinner experience', 'Premium drinks included', 'Founder introductions', 'Networking session', 'Member directory access']
            },
            {
                id: 'dinner-cruise-apr',
                name: 'Founders Dinner + Poseidon Cruise',
                price: 498,
                currency: 'USD',
                description: 'Full experience: Dinner (6-8pm) + Cruise (8:30-10pm). Includes Platinum Founding Member status.',
                includesDinner: true,
                includesCruise: true,
                isPlatinum: true,
                perks: ['Founders Dinner (6-8pm)', 'Poseidon Cruise (8:30-10pm)', 'Premium open bar on cruise', 'Platinum Founding Member status', 'Priority access to future events', 'Stunning Da Nang river views']
            }
        ],
        image: '/images/gathering-event.jpg',
        status: 'open'
    },
    // ===== MAY 2026 =====
    {
        id: 'may-2026',
        slug: 'may-gathering',
        name: 'May Gathering',
        type: 'gathering',
        date: '2026-05-13',
        displayDate: 'May 13, 2026',
        day: 'Wednesday',
        time: '6:00 PM - 10:00 PM',
        location: 'Four U Lounge, Da Nang',
        address: '118-120 Vo Nguyen Giap Street, Son Tra District, Da Nang, Vietnam',
        description: 'Join us for an exclusive evening at Four U Lounge. The Founders Dinner (6-8pm) brings together Vietnam\'s most ambitious entrepreneurs for curated networking. Continue the evening with the Poseidon Cruise (8:30-10pm) on the Da Nang River.',
        capacity: 50,
        cruiseCapacity: 30,
        spotsRemaining: 50,
        cruiseSpotsRemaining: 30,
        isPlatinumEvent: false,
        tickets: [
            {
                id: 'dinner-may',
                name: 'Founders Dinner',
                price: 149,
                currency: 'USD',
                description: 'Dinner + networking at Four U Lounge (6:00 PM - 8:00 PM)',
                perks: ['Curated dinner experience', 'Premium drinks included', 'Founder introductions', 'Networking session', 'Member directory access']
            },
            {
                id: 'dinner-cruise-may',
                name: 'Founders Dinner + Poseidon Cruise',
                price: 498,
                currency: 'USD',
                description: 'Full experience: Dinner (6-8pm) + Cruise (8:30-10pm). Includes Platinum Founding Member status.',
                includesDinner: true,
                includesCruise: true,
                isPlatinum: true,
                perks: ['Founders Dinner (6-8pm)', 'Poseidon Cruise (8:30-10pm)', 'Premium open bar on cruise', 'Platinum Founding Member status', 'Priority access to future events', 'Stunning Da Nang river views']
            }
        ],
        image: '/images/gathering-event.jpg',
        status: 'open'
    },
    // ===== JUNE 2026 =====
    {
        id: 'jun-2026',
        slug: 'june-gathering',
        name: 'June Gathering',
        type: 'gathering',
        date: '2026-06-09',
        displayDate: 'June 9, 2026',
        day: 'Tuesday',
        time: '6:00 PM - 10:00 PM',
        location: 'Four U Lounge, Da Nang',
        address: '118-120 Vo Nguyen Giap Street, Son Tra District, Da Nang, Vietnam',
        description: 'Join us for an exclusive evening at Four U Lounge. The Founders Dinner (6-8pm) brings together Vietnam\'s most ambitious entrepreneurs for curated networking. Continue the evening with the Poseidon Cruise (8:30-10pm) on the Da Nang River.',
        capacity: 50,
        cruiseCapacity: 30,
        spotsRemaining: 50,
        cruiseSpotsRemaining: 30,
        isPlatinumEvent: false,
        tickets: [
            {
                id: 'dinner-jun',
                name: 'Founders Dinner',
                price: 149,
                currency: 'USD',
                description: 'Dinner + networking at Four U Lounge (6:00 PM - 8:00 PM)',
                perks: ['Curated dinner experience', 'Premium drinks included', 'Founder introductions', 'Networking session', 'Member directory access']
            },
            {
                id: 'dinner-cruise-jun',
                name: 'Founders Dinner + Poseidon Cruise',
                price: 498,
                currency: 'USD',
                description: 'Full experience: Dinner (6-8pm) + Cruise (8:30-10pm). Includes Platinum Founding Member status.',
                includesDinner: true,
                includesCruise: true,
                isPlatinum: true,
                perks: ['Founders Dinner (6-8pm)', 'Poseidon Cruise (8:30-10pm)', 'Premium open bar on cruise', 'Platinum Founding Member status', 'Priority access to future events', 'Stunning Da Nang river views']
            }
        ],
        image: '/images/gathering-event.jpg',
        status: 'open'
    },
    // ===== JULY 2026 =====
    {
        id: 'jul-2026',
        slug: 'july-gathering',
        name: 'July Gathering',
        type: 'gathering',
        date: '2026-07-08',
        displayDate: 'July 8, 2026',
        day: 'Wednesday',
        time: '6:00 PM - 10:00 PM',
        location: 'Four U Lounge, Da Nang',
        address: '118-120 Vo Nguyen Giap Street, Son Tra District, Da Nang, Vietnam',
        description: 'Join us for an exclusive evening at Four U Lounge. The Founders Dinner (6-8pm) brings together Vietnam\'s most ambitious entrepreneurs for curated networking. Continue the evening with the Poseidon Cruise (8:30-10pm) on the Da Nang River.',
        capacity: 50,
        cruiseCapacity: 30,
        spotsRemaining: 50,
        cruiseSpotsRemaining: 30,
        isPlatinumEvent: false,
        tickets: [
            {
                id: 'dinner-jul',
                name: 'Founders Dinner',
                price: 149,
                currency: 'USD',
                description: 'Dinner + networking at Four U Lounge (6:00 PM - 8:00 PM)',
                perks: ['Curated dinner experience', 'Premium drinks included', 'Founder introductions', 'Networking session', 'Member directory access']
            },
            {
                id: 'dinner-cruise-jul',
                name: 'Founders Dinner + Poseidon Cruise',
                price: 498,
                currency: 'USD',
                description: 'Full experience: Dinner (6-8pm) + Cruise (8:30-10pm). Includes Platinum Founding Member status.',
                includesDinner: true,
                includesCruise: true,
                isPlatinum: true,
                perks: ['Founders Dinner (6-8pm)', 'Poseidon Cruise (8:30-10pm)', 'Premium open bar on cruise', 'Platinum Founding Member status', 'Priority access to future events', 'Stunning Da Nang river views']
            }
        ],
        image: '/images/gathering-event.jpg',
        status: 'open'
    }
];

// Past Events
const PAST_EVENTS = [
    {
        id: 'jan-2026',
        slug: 'january-gathering-2026',
        name: 'January Gathering',
        type: 'dinner',
        date: '2026-01-24',
        displayDate: 'January 24, 2026',
        day: 'Saturday',
        location: 'Ho Chi Minh City',
        description: 'Our inaugural gathering brought together Vietnam\'s most ambitious founders for an evening of connections, dinner, and the first Poseidon cruise.',
        attendeeIds: [100, 101, 1, 2, 3, 4, 5, 6, 7, 8], // Admin users + members
        cruiseAttendeeIds: [100, 101, 2, 3], // Admins always attend + Platinum members
        photos: [],
        stats: {
            totalAttendees: 45,
            industries: 6,
            cruiseSpots: 30
        }
    }
];

// Events namespace
const Events = {
    EVENTS_KEY: 'founders_vietnam_events',
    UPCOMING_KEY: 'founders_vietnam_upcoming',
    BOOKINGS_KEY: 'founders_vietnam_bookings',
    DATA_VERSION: '5.0',

    // Initialize events data
    init() {
        const storedVersion = localStorage.getItem('founders_vietnam_events_version');
        if (storedVersion !== this.DATA_VERSION) {
            localStorage.removeItem(this.EVENTS_KEY);
            localStorage.removeItem(this.UPCOMING_KEY);
            localStorage.setItem('founders_vietnam_events_version', this.DATA_VERSION);
        }

        if (!localStorage.getItem(this.EVENTS_KEY)) {
            localStorage.setItem(this.EVENTS_KEY, JSON.stringify(PAST_EVENTS));
        }
        if (!localStorage.getItem(this.UPCOMING_KEY)) {
            localStorage.setItem(this.UPCOMING_KEY, JSON.stringify(UPCOMING_EVENTS));
        }
    },

    // ===== UPCOMING EVENTS =====

    getUpcomingEvents() {
        this.init();
        return JSON.parse(localStorage.getItem(this.UPCOMING_KEY) || '[]');
    },

    getUpcomingEventById(eventId) {
        const events = this.getUpcomingEvents();
        return events.find(e => e.id === eventId);
    },

    getUpcomingEventBySlug(slug) {
        const events = this.getUpcomingEvents();
        return events.find(e => e.slug === slug);
    },

    // ===== PAST EVENTS =====

    getPastEvents() {
        this.init();
        return JSON.parse(localStorage.getItem(this.EVENTS_KEY) || '[]');
    },

    getEventById(eventId) {
        // Check both upcoming and past
        const upcoming = this.getUpcomingEventById(eventId);
        if (upcoming) return upcoming;

        const events = this.getPastEvents();
        return events.find(e => e.id === eventId);
    },

    // ===== ATTENDANCE =====

    didUserAttendEvent(userId, eventId) {
        const event = this.getEventById(eventId);
        if (!event || !event.attendeeIds) return false;
        return event.attendeeIds.includes(userId);
    },

    getEventAttendees(eventId) {
        const event = this.getEventById(eventId);
        if (!event || !event.attendeeIds) return [];

        const members = Auth.getMembers();
        return members.filter(m => event.attendeeIds.includes(m.id));
    },

    canViewAttendeeProfile(viewerId, targetId, eventId) {
        const event = this.getEventById(eventId);
        if (!event || !event.attendeeIds) return false;

        return event.attendeeIds.includes(viewerId) && event.attendeeIds.includes(targetId);
    },

    markAttendance(userId, eventId) {
        const events = this.getPastEvents();
        const index = events.findIndex(e => e.id === eventId);

        if (index !== -1 && !events[index].attendeeIds.includes(userId)) {
            events[index].attendeeIds.push(userId);
            localStorage.setItem(this.EVENTS_KEY, JSON.stringify(events));
            return true;
        }
        return false;
    },

    // ===== PHOTOS =====

    addEventPhotos(eventId, photoUrls) {
        const events = this.getPastEvents();
        const index = events.findIndex(e => e.id === eventId);

        if (index !== -1) {
            events[index].photos = [...events[index].photos, ...photoUrls];
            localStorage.setItem(this.EVENTS_KEY, JSON.stringify(events));
            return true;
        }
        return false;
    },

    getEventPhotos(eventId) {
        const event = this.getEventById(eventId);
        return event?.photos || [];
    },

    // ===== BOOKINGS =====

    getBookings() {
        return JSON.parse(localStorage.getItem(this.BOOKINGS_KEY) || '[]');
    },

    getUserBookings(userId) {
        const bookings = this.getBookings();
        return bookings.filter(b => b.userId === userId);
    },

    hasUserBookedEvent(userId, eventId) {
        const bookings = this.getBookings();
        return bookings.some(b => b.userId === userId && b.eventId === eventId && b.status === 'confirmed');
    },

    async createBooking(userId, eventId, ticketId, paymentIntentId) {
        const event = this.getUpcomingEventById(eventId);
        if (!event) return { error: 'Event not found' };

        const ticket = event.tickets.find(t => t.id === ticketId);
        if (!ticket) return { error: 'Ticket type not found' };

        const booking = {
            id: `booking-${Date.now()}`,
            userId,
            eventId,
            ticketId,
            ticketName: ticket.name,
            amount: ticket.price,
            currency: ticket.currency,
            paymentIntentId,
            status: 'confirmed',
            createdAt: new Date().toISOString()
        };

        // Save booking
        const bookings = this.getBookings();
        bookings.push(booking);
        localStorage.setItem(this.BOOKINGS_KEY, JSON.stringify(bookings));

        // Update spots remaining
        const events = this.getUpcomingEvents();
        const eventIndex = events.findIndex(e => e.id === eventId);
        if (eventIndex !== -1) {
            events[eventIndex].spotsRemaining = Math.max(0, events[eventIndex].spotsRemaining - 1);
            localStorage.setItem(this.UPCOMING_KEY, JSON.stringify(events));
        }

        // If platinum event, upgrade user to Platinum Founding Member
        if (event.isPlatinumEvent) {
            const members = JSON.parse(localStorage.getItem('founders_vietnam_members') || '[]');
            const memberIndex = members.findIndex(m => m.id === userId);
            if (memberIndex !== -1 && members[memberIndex].memberType !== 'owner' && members[memberIndex].memberType !== 'admin') {
                members[memberIndex].memberType = 'platinum_founding';
                localStorage.setItem('founders_vietnam_members', JSON.stringify(members));
            }
        }

        return { booking, error: null };
    }
};

// Payment namespace for Airwallex integration
const Payment = {
    // Create payment intent via Netlify function
    async createPaymentIntent(amount, currency, description, customerEmail, customerName, eventId, ticketType) {
        try {
            const response = await fetch('/.netlify/functions/create-payment', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    amount,
                    currency,
                    description,
                    customerEmail,
                    customerName,
                    eventId,
                    ticketType
                })
            });

            if (!response.ok) {
                const error = await response.json();
                return { error: error.error || 'Payment creation failed' };
            }

            return await response.json();
        } catch (error) {
            console.error('Payment error:', error);
            return { error: 'Network error. Please try again.' };
        }
    }
};

// Initialize on load
Events.init();
