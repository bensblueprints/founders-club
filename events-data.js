// ========================================
// FOUNDERS VIETNAM - Events Data
// ========================================

const PAST_EVENTS = [
    {
        id: 'jan-2026',
        name: 'January Gathering',
        date: '2026-01-24',
        displayDate: 'January 24, 2026',
        day: 'Saturday',
        location: 'Ho Chi Minh City',
        description: 'Our inaugural gathering brought together Vietnam\'s most ambitious founders for an evening of connections, dinner, and the first Poseidon cruise.',
        attendeeIds: [1, 2, 3, 4, 5, 6, 7, 8], // Member IDs who attended
        cruiseAttendeeIds: [1, 2, 3, 4, 5, 6], // Members who also did the cruise
        photos: [], // Will be populated with photo URLs
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
    ATTENDANCE_KEY: 'founders_vietnam_attendance',

    // Initialize events data
    init() {
        if (!localStorage.getItem(this.EVENTS_KEY)) {
            localStorage.setItem(this.EVENTS_KEY, JSON.stringify(PAST_EVENTS));
        }
    },

    // Get all past events
    getPastEvents() {
        this.init();
        return JSON.parse(localStorage.getItem(this.EVENTS_KEY) || '[]');
    },

    // Get event by ID
    getEventById(eventId) {
        const events = this.getPastEvents();
        return events.find(e => e.id === eventId);
    },

    // Check if a user attended an event
    didUserAttendEvent(userId, eventId) {
        const event = this.getEventById(eventId);
        if (!event) return false;
        return event.attendeeIds.includes(userId);
    },

    // Get attendees for an event (returns member objects)
    getEventAttendees(eventId) {
        const event = this.getEventById(eventId);
        if (!event) return [];
        
        const members = Auth.getMembers();
        return members.filter(m => event.attendeeIds.includes(m.id));
    },

    // Check if user can view attendee profile
    canViewAttendeeProfile(viewerId, targetId, eventId) {
        // User must have attended the same event to view profiles
        const event = this.getEventById(eventId);
        if (!event) return false;
        
        return event.attendeeIds.includes(viewerId) && event.attendeeIds.includes(targetId);
    },

    // Add photos to an event (for admin use)
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

    // Get event photos
    getEventPhotos(eventId) {
        const event = this.getEventById(eventId);
        return event ? event.photos : [];
    },

    // Mark user as attended (for admin/registration use)
    markAttendance(userId, eventId) {
        const events = this.getPastEvents();
        const index = events.findIndex(e => e.id === eventId);
        
        if (index !== -1 && !events[index].attendeeIds.includes(userId)) {
            events[index].attendeeIds.push(userId);
            localStorage.setItem(this.EVENTS_KEY, JSON.stringify(events));
            return true;
        }
        return false;
    }
};

// Initialize on load
Events.init();
