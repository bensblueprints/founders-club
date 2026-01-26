// ========================================
// FOUNDERS VIETNAM - Interactive Scripts
// ========================================

document.addEventListener('DOMContentLoaded', () => {
    initSmoothScroll();
    initNavigation();
    initFormHandling();
    initReferralToggle();
    initRevenueValidation();
    initModalHandling();
    initEventTabs();
});

// ========================================
// SMOOTH SCROLLING
// ========================================
function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                const navHeight = document.querySelector('.nav').offsetHeight;
                const targetPosition = target.offsetTop - navHeight;
                
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });
}

// ========================================
// NAVIGATION
// ========================================
function initNavigation() {
    const nav = document.querySelector('.nav');
    const mobileToggle = document.querySelector('.mobile-menu-toggle');
    const navLinks = document.querySelector('.nav-links');
    
    // Scroll effect for nav
    window.addEventListener('scroll', () => {
        const currentScroll = window.pageYOffset;
        
        if (currentScroll > 100) {
            nav.style.background = 'rgba(10, 10, 10, 0.98)';
        } else {
            nav.style.background = 'linear-gradient(to bottom, rgba(10, 10, 10, 0.98), rgba(10, 10, 10, 0.9))';
        }
    });
    
    // Mobile menu toggle
    if (mobileToggle) {
        mobileToggle.addEventListener('click', () => {
            navLinks.classList.toggle('mobile-open');
            mobileToggle.classList.toggle('active');
        });
    }
}

// ========================================
// REFERRAL TOGGLE
// ========================================
function initReferralToggle() {
    const referralSelect = document.getElementById('referral');
    const referrerNameGroup = document.getElementById('referrerNameGroup');
    
    if (referralSelect && referrerNameGroup) {
        referralSelect.addEventListener('change', function() {
            if (this.value === 'member-referral') {
                referrerNameGroup.style.display = 'flex';
                referrerNameGroup.querySelector('input').setAttribute('required', 'required');
            } else {
                referrerNameGroup.style.display = 'none';
                referrerNameGroup.querySelector('input').removeAttribute('required');
            }
        });
    }
}

// ========================================
// REVENUE VALIDATION - DISQUALIFICATION
// ========================================
const DISQUALIFYING_REVENUES = ['pre-revenue', '0-5k', '5k-10k'];

function initRevenueValidation() {
    const revenueSelect = document.getElementById('revenue');
    
    if (revenueSelect) {
        revenueSelect.addEventListener('change', function() {
            // Just track the selection, validation happens on submit
            const isDisqualified = DISQUALIFYING_REVENUES.includes(this.value);
            
            if (isDisqualified && this.value) {
                // Add visual feedback
                this.style.borderColor = '#ef4444';
            } else if (this.value) {
                this.style.borderColor = '#4ade80';
            } else {
                this.style.borderColor = '';
            }
        });
    }
}

// ========================================
// MODAL HANDLING
// ========================================
function initModalHandling() {
    const modal = document.getElementById('disqualifyModal');
    const closeBtn = document.getElementById('closeModal');
    const foundersSchoolBtn = document.getElementById('foundersSchoolBtn');
    
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        });
    }
    
    if (foundersSchoolBtn) {
        foundersSchoolBtn.addEventListener('click', (e) => {
            e.preventDefault();
            // Redirect to Founder's School
            // Replace with actual URL
            alert("Redirecting to Founder's School...\n\nThis would redirect to your Founder's School community page.");
            modal.classList.remove('active');
            document.body.style.overflow = '';
        });
    }
    
    // Close on overlay click
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
                document.body.style.overflow = '';
            }
        });
    }
    
    // Close on escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal && modal.classList.contains('active')) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }
    });
}

function showDisqualificationModal() {
    const modal = document.getElementById('disqualifyModal');
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

// ========================================
// FORM HANDLING
// ========================================
function initFormHandling() {
    const form = document.getElementById('applicationForm');
    
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // Check revenue qualification FIRST
            const revenueValue = form.querySelector('#revenue').value;
            
            if (DISQUALIFYING_REVENUES.includes(revenueValue)) {
                showDisqualificationModal();
                return;
            }
            
            const submitBtn = form.querySelector('.submit-btn');
            const originalText = submitBtn.innerHTML;
            
            // Loading state
            submitBtn.innerHTML = `
                <span>Processing Application...</span>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" class="spin">
                    <circle cx="10" cy="10" r="8" stroke="currentColor" stroke-width="2" stroke-dasharray="40" stroke-dashoffset="10"/>
                </svg>
            `;
            submitBtn.disabled = true;
            
            // Collect form data
            const formData = new FormData(form);
            const data = Object.fromEntries(formData.entries());
            
            // Submit to database if configured
            if (window.SupabaseConfig?.isConfigured() && window.Database) {
                const result = await Database.submitApplication(data);
                if (result.error) {
                    alert('Error submitting application: ' + result.error);
                    submitBtn.innerHTML = originalText;
                    submitBtn.disabled = false;
                    return;
                }
            } else {
                // Simulate submission for localStorage mode
                await new Promise(resolve => setTimeout(resolve, 2500));
                // Store in localStorage as fallback
                const applications = JSON.parse(localStorage.getItem('founders_vietnam_applications') || '[]');
                applications.push({ ...data, id: Date.now(), status: 'pending', createdAt: new Date().toISOString() });
                localStorage.setItem('founders_vietnam_applications', JSON.stringify(applications));
            }
            
            // Success state
            submitBtn.innerHTML = `
                <span>Application Submitted!</span>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M4 10L8 14L16 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            `;
            submitBtn.style.background = '#4ade80';
            
            // Create and show success message
            const existingSuccess = form.querySelector('.form-success');
            if (existingSuccess) existingSuccess.remove();
            
            const successMessage = document.createElement('div');
            successMessage.className = 'form-success';
            successMessage.innerHTML = `
                <div style="text-align: center; padding: 3rem; background: rgba(201, 169, 98, 0.1); border: 1px solid rgba(201, 169, 98, 0.3); margin-top: 2rem;">
                    <h3 style="font-family: 'Cormorant Garamond', serif; font-size: 1.75rem; font-weight: 400; color: #c9a962; margin-bottom: 1rem;">
                        Application Received
                    </h3>
                    <p style="color: #888; font-size: 1rem; line-height: 1.6; margin-bottom: 1.5rem;">
                        Thank you for your interest in Founders Vietnam, <strong style="color: #f5f5f5;">${data.firstName}</strong>.
                    </p>
                    <p style="color: #666; font-size: 0.9rem;">
                        We personally review every application. Expect to hear from us within 48 hours.
                        <br>Check your email at <strong style="color: #c9a962;">${data.email}</strong> for updates.
                    </p>
                </div>
            `;
            
            form.appendChild(successMessage);
            
            // Scroll to success message
            successMessage.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            // Log submission data (replace with actual API call)
            console.log('=== APPLICATION SUBMITTED ===');
            console.log('Name:', data.firstName, data.lastName);
            console.log('Email:', data.email);
            console.log('Age:', data.age);
            console.log('Company:', data.company);
            console.log('Role:', data.role);
            console.log('Industry:', data.industry);
            console.log('Revenue:', data.revenue);
            console.log('Team Size:', data.teamSize);
            console.log('Biggest Challenge:', data.biggestChallenge);
            console.log('Unique Value:', data.uniqueValue);
            console.log('12 Month Goals:', data.goals12Month);
            console.log('Why Join:', data.whyJoin);
            console.log('Referral:', data.referral);
            console.log('Event:', data.event);
            console.log('Membership:', data.membership);
            console.log('=============================');
            
            // Reset form after delay
            setTimeout(() => {
                form.reset();
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
                submitBtn.style.background = '';
            }, 8000);
        });
        
        // Real-time validation styling
        const inputs = form.querySelectorAll('input, textarea, select');
        inputs.forEach(input => {
            input.addEventListener('blur', () => {
                if (input.value && input.checkValidity()) {
                    input.style.borderColor = 'rgba(74, 222, 128, 0.3)';
                } else if (input.value && !input.checkValidity()) {
                    input.style.borderColor = 'rgba(239, 68, 68, 0.5)';
                } else {
                    input.style.borderColor = '';
                }
            });
            
            input.addEventListener('focus', () => {
                input.style.borderColor = 'var(--color-accent)';
            });
        });
    }
}

// ========================================
// EVENT TABS
// ========================================
function initEventTabs() {
    const tabs = document.querySelectorAll('.event-tab');
    const upcomingContent = document.getElementById('upcomingEvents');
    const pastContent = document.getElementById('pastEvents');

    if (!tabs.length || !upcomingContent || !pastContent) return;

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Update active tab
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            // Show/hide content
            const tabType = tab.dataset.tab;
            if (tabType === 'upcoming') {
                upcomingContent.style.display = 'block';
                pastContent.style.display = 'none';
            } else {
                upcomingContent.style.display = 'none';
                pastContent.style.display = 'block';
            }
        });
    });
}

// ========================================
// CALENDAR EVENT GENERATION
// ========================================
const events = [
    { title: 'Founders Vietnam - February Gathering', date: '2026-02-10', time: '18:00' },
    { title: 'Founders Vietnam - March Gathering', date: '2026-03-11', time: '18:00' },
    { title: 'Founders Vietnam - April Gathering', date: '2026-04-14', time: '18:00' },
    { title: 'Founders Vietnam - May Gathering', date: '2026-05-13', time: '18:00' },
    { title: 'Founders Vietnam - June Gathering', date: '2026-06-09', time: '18:00' },
    { title: 'Founders Vietnam - July Gathering', date: '2026-07-08', time: '18:00' }
];

function generateICS(event) {
    const start = new Date(`${event.date}T${event.time}:00`);
    const end = new Date(start.getTime() + 4 * 60 * 60 * 1000);
    
    const formatDate = (date) => {
        return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };
    
    return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Founders Vietnam//Event//EN
BEGIN:VEVENT
UID:${Date.now()}@foundersvietnam.com
DTSTAMP:${formatDate(new Date())}
DTSTART:${formatDate(start)}
DTEND:${formatDate(end)}
SUMMARY:${event.title}
DESCRIPTION:Exclusive monthly gathering for Vietnam's most ambitious founders. Includes dinner and optional Poseidon cruise.
LOCATION:Ho Chi Minh City, Vietnam
END:VEVENT
END:VCALENDAR`;
}

window.downloadCalendarEvent = function(eventIndex) {
    const event = events[eventIndex];
    const ics = generateICS(event);
    const blob = new Blob([ics], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `founders-vietnam-${event.date}.ics`;
    a.click();
    URL.revokeObjectURL(url);
};

// ========================================
// MOBILE MENU STYLES INJECTION
// ========================================
const style = document.createElement('style');
style.textContent = `
    .nav-links.mobile-open {
        display: flex !important;
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        flex-direction: column;
        background: rgba(10, 10, 10, 0.98);
        padding: 2rem;
        gap: 1.5rem;
        border-top: 1px solid #2a2a2a;
    }
    .mobile-menu-toggle.active span:first-child {
        transform: rotate(45deg) translate(5px, 5px);
    }
    .mobile-menu-toggle.active span:last-child {
        transform: rotate(-45deg) translate(5px, -5px);
    }
`;
document.head.appendChild(style);

console.log('Founders Vietnam - Website Initialized');
console.log('Revenue threshold: $10,000/month minimum');
console.log('Disqualifying revenues:', DISQUALIFYING_REVENUES);
