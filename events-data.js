// ========================================
// FOUNDERS VIETNAM - Events Data
// ========================================

// Upcoming Events (for booking)
const UPCOMING_EVENTS = [
    {
        id: 'boat-feb-2026',
        slug: 'poseidon-cruise-february',
        name: 'Poseidon Cruise - February Edition',
        type: 'cruise',
        date: '2026-02-15',
        displayDate: 'February 15, 2026',
        day: 'Saturday',
        time: '6:00 PM - 11:00 PM',
        location: 'Saigon River, Ho Chi Minh City',
        description: 'An exclusive evening cruise aboard our private yacht. Network with Vietnam\'s top founders while enjoying premium dining, drinks, and stunning city views. Booking this event grants you Platinum Founding Member status.',
        capacity: 30,
        spotsRemaining: 12,
        isPlatinumEvent: true, // Booking this makes you Platinum Founding Member
        tickets: [
            {
                id: 'platinum-cruise',
                name: 'Platinum Cruise Ticket',
                price: 350,
                currency: 'USD',
                description: 'Full cruise experience with premium open bar, gourmet dinner, and Platinum Founding Member status',
                perks: ['Premium open bar', 'Gourmet 5-course dinner', 'Platinum Founding Member status', 'Priority access to all future events', 'Exclusive member directory access']
            }
        ],
        image: '/images/cruise-event.jpg',
        status: 'open' // open, soldout, closed
    },
    {
        id: 'dinner-feb-2026',
        slug: 'founders-dinner-february',
        name: 'Founders Dinner - February',
        type: 'dinner',
        date: '2026-02-28',
        displayDate: 'February 28, 2026',
        day: 'Friday',
        time: '7:00 PM - 10:00 PM',
        location: 'Private Dining Room, District 1',
        description: 'An intimate dinner gathering for founders to share experiences, challenges, and opportunities. Limited to 20 seats for quality conversations.',
        capacity: 20,
        spotsRemaining: 8,
        isPlatinumEvent: false,
        tickets: [
            {
                id: 'founding-dinner',
                name: 'Founding Member Dinner',
                price: 75,
                currency: 'USD',
                description: 'Full dinner experience with wine pairing',
                perks: ['4-course dinner', 'Wine pairing', 'Networking session']
            },
            {
                id: 'guest-dinner',
                name: 'Guest Ticket',
                price: 100,
                currency: 'USD',
                description: 'Bring a fellow founder as your guest',
                perks: ['4-course dinner', 'Wine pairing', 'One-time access']
            }
        ],
        image: '/images/dinner-event.jpg',
        status: 'open'
    },
    {
        id: 'workshop-mar-2026',
        slug: 'fundraising-masterclass',
        name: 'Fundraising Masterclass',
        type: 'workshop',
        date: '2026-03-10',
        displayDate: 'March 10, 2026',
        day: 'Monday',
        time: '2:00 PM - 6:00 PM',
        location: 'Co-working Space, District 3',
        description: 'Learn from founders who have raised Series A+ funding. Includes pitch practice sessions and VC panel Q&A.',
        capacity: 40,
        spotsRemaining: 25,
        isPlatinumEvent: false,
        tickets: [
            {
                id: 'workshop-standard',
                name: 'Workshop Access',
                price: 50,
                currency: 'USD',
                description: 'Full workshop access',
                perks: ['Workshop materials', 'Pitch feedback session', 'VC panel access', 'Networking lunch']
            }
        ],
        image: '/images/workshop-event.jpg',
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
    DATA_VERSION: '2.0',

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
