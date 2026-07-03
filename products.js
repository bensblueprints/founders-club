// ========================================
// FOUNDERS VIETNAM - Products & Pricing
// ========================================

const Products = {
    // ===== MEMBERSHIPS =====
    memberships: {
        'founding-member': {
            id: 'founding-member',
            name: 'Founding Member',
            description: 'Join as a Founding Member and get exclusive access to all events, member directory, and networking opportunities.',
            price: 250,
            currency: 'USD',
            type: 'membership',
            memberType: 'founding',
            features: [
                'Access to all monthly events',
                'Member directory access',
                'Private community group',
                'Priority event registration',
                'Founding Member badge'
            ]
        },
        'platinum-founding': {
            id: 'platinum-founding',
            name: 'Platinum Founding Member',
            description: 'The highest tier membership with VIP access to exclusive events.',
            price: 500,
            currency: 'USD',
            type: 'membership',
            memberType: 'platinum_founding',
            features: [
                'Everything in Founding Member',
                'VIP seating at all events',
                'Direct introductions to speakers',
                'Platinum Founding Member badge',
                'Complimentary +1 to select events'
            ]
        }
    },

    // ===== EVENT TICKETS =====
    eventTickets: {
        'founding-dinner': {
            id: 'founding-dinner',
            name: 'Founders Dinner',
            description: "Meet & greet with hors d'oeuvres, rapid-fire intros, dinner & Founder Bingo at Four U Lounge, Da Nang (6-9 PM).",
            price: 150,
            currency: 'USD',
            type: 'event_ticket',
            eventType: 'dinner',
            features: [
                "Meet & greet with hors d'oeuvres",
                'Curated dinner experience',
                'Rapid-fire founder introductions',
                'Founder Bingo networking game',
                'Member directory access'
            ]
        },
        'guest-dinner': {
            id: 'guest-dinner',
            name: 'Founders Dinner - Guest Ticket',
            description: 'Bring a fellow founder as your guest.',
            price: 100,
            currency: 'USD',
            type: 'event_ticket',
            eventType: 'dinner',
            features: [
                '4-course dinner',
                'Wine pairing',
                'One-time access',
                'Networking opportunity'
            ]
        },
        'workshop-standard': {
            id: 'workshop-standard',
            name: 'Workshop Access',
            description: 'Full workshop access with materials and networking.',
            price: 50,
            currency: 'USD',
            type: 'event_ticket',
            eventType: 'workshop',
            features: [
                'Workshop materials',
                'Pitch feedback session',
                'VC panel access',
                'Networking lunch'
            ]
        }
    },

    // ===== UPSELLS =====
    upsells: {
        'plus-one-dinner': {
            id: 'plus-one-dinner',
            name: 'Plus One - Dinner',
            description: 'Bring a guest to the Founders Dinner.',
            price: 75,
            currency: 'USD',
            type: 'upsell',
            requiresProduct: 'founding-dinner',
            features: [
                'Same dining experience',
                'Networking access'
            ]
        },
        'vip-upgrade': {
            id: 'vip-upgrade',
            name: 'VIP Table Upgrade',
            description: 'Upgrade to VIP seating with speakers and special guests.',
            price: 100,
            currency: 'USD',
            type: 'upsell',
            applicableEvents: ['dinner'],
            features: [
                'VIP table placement',
                'Direct access to speakers',
                'Premium wine selection',
                'Priority service'
            ]
        },
        'annual-membership-upgrade': {
            id: 'annual-membership-upgrade',
            name: 'Annual Membership (Save 20%)',
            description: 'Upgrade to annual membership and save.',
            price: 2400, // 12 months at $250 = $3000, 20% off = $2400
            currency: 'USD',
            type: 'upsell',
            membershipDuration: 12,
            savings: 600,
            features: [
                '12 months membership',
                'Save $600 vs monthly',
                'Price lock guarantee',
                'Bonus: Free +1 to one event'
            ]
        }
    },

    // ===== HELPER METHODS =====

    getProduct(productId) {
        return this.memberships[productId] ||
               this.eventTickets[productId] ||
               this.upsells[productId] ||
               null;
    },

    getAllProducts() {
        return {
            ...this.memberships,
            ...this.eventTickets,
            ...this.upsells
        };
    },

    getProductsByType(type) {
        const all = this.getAllProducts();
        return Object.values(all).filter(p => p.type === type);
    },

    getMemberships() {
        return Object.values(this.memberships);
    },

    getEventTickets() {
        return Object.values(this.eventTickets);
    },

    getUpsells() {
        return Object.values(this.upsells);
    },

    getUpsellsForProduct(productId) {
        return Object.values(this.upsells).filter(u =>
            u.requiresProduct === productId ||
            (u.applicableEvents && this.eventTickets[productId]?.eventType &&
             u.applicableEvents.includes(this.eventTickets[productId].eventType))
        );
    },

    formatPrice(price, currency = 'USD') {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency
        }).format(price);
    }
};

// Make available globally
window.Products = Products;
