// ========================================
// FOUNDERS VIETNAM - Events Data
// ========================================

// Upcoming Events (for booking)
const UPCOMING_EVENTS = [
    // ===== JULY 2026 =====
    {
        id: 'jul-2026',
        slug: 'july-gathering',
        name: 'July Gathering',
        type: 'gathering',
        date: '2026-07-25',
        displayDate: 'July 25, 2026',
        day: 'Saturday',
        time: '6:00 PM - 9:00 PM',
        location: '4U Lounge, Esco Beach, Da Nang',
        address: 'Esco Beach, Da Nang, Vietnam',
        description: "Join us for an exclusive evening at 4U Lounge on Esco Beach. Doors open at 6 PM with a meet & greet over hors d'oeuvres and welcome drinks, followed by a 30-minute open mingle, rapid-fire 1-minute founder intros, and an intimate dinner with Founder Bingo played across the tables.",
        capacity: 60,
        dinnerCapacity: 60,
        spotsRemaining: 60,
        dinnerSpotsRemaining: 60,
        isPlatinumEvent: false,
        tickets: [
            {
                id: 'dinner-jul',
                name: 'Founders Dinner',
                price: 150,
                currency: 'USD',
                description: "Meet & greet with hors d'oeuvres, rapid-fire intros, dinner & Founder Bingo (6:00 PM - 9:00 PM)",
                capacity: 60,
                perks: ["Meet & greet with hors d'oeuvres and welcome drinks", "Curated dinner experience", "Rapid-fire founder introductions", "Founder Bingo networking game", "Member directory access"]
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
        description: 'Our inaugural gathering brought together Vietnam\'s most ambitious founders for an evening of connections, dinner, and connection.',
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
    DATA_VERSION: '7.0',

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
