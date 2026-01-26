const { chromium } = require('playwright');
const path = require('path');

(async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    
    // Load the local HTML file
    const filePath = path.join(__dirname, 'index.html');
    await page.goto(`file://${filePath}`);
    
    // Wait for page to fully load
    await page.waitForTimeout(1000);
    
    // Take full page screenshot
    await page.screenshot({ 
        path: 'screenshot-full.png', 
        fullPage: true 
    });
    
    // Screenshot just the events section
    const eventsSection = await page.$('#events');
    if (eventsSection) {
        await eventsSection.screenshot({ path: 'screenshot-events.png' });
    }
    
    // Screenshot the application form
    const applySection = await page.$('#apply');
    if (applySection) {
        await applySection.screenshot({ path: 'screenshot-apply.png' });
    }

    // Screenshot login page
    const loginPath = path.join(__dirname, 'login.html');
    await page.goto(`file://${loginPath}`);
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'screenshot-login.png' });

    // Screenshot members page (will show locked state)
    const membersPath = path.join(__dirname, 'members.html');
    await page.goto(`file://${membersPath}`);
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'screenshot-members-locked.png' });

    // Simulate login and screenshot members
    await page.evaluate(() => {
        localStorage.setItem('founders_vietnam_members', JSON.stringify([
            { id: 1, email: 'demo@foundersvietnam.com', password: 'demo123', firstName: 'Minh', lastName: 'Nguyen', company: 'VietTech', role: 'Founder', industry: 'saas', bio: 'Building SaaS', whatsapp: '+84909123456', zalo: '+84909123456', telegram: '@minh', linkedin: 'https://linkedin.com/in/minh' },
            { id: 2, email: 'sarah@test.com', password: 'pass', firstName: 'Sarah', lastName: 'Chen', company: 'GreenLeaf', role: 'Co-Founder', industry: 'ecommerce', bio: 'E-commerce for artisans', whatsapp: '+84912345678', telegram: '@sarah', linkedin: 'https://linkedin.com/in/sarah' }
        ]));
        localStorage.setItem('founders_vietnam_auth', JSON.stringify({ userId: 1 }));
    });
    await page.reload();
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'screenshot-members.png', fullPage: true });

    // Screenshot profile page
    const profilePath = path.join(__dirname, 'profile.html');
    await page.goto(`file://${profilePath}`);
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'screenshot-profile.png', fullPage: true });

    // Screenshot past events page
    const pastEventsPath = path.join(__dirname, 'past-events.html');
    await page.goto(`file://${pastEventsPath}`);
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'screenshot-past-events.png', fullPage: true });

    // Screenshot main page with Past Events tab
    await page.goto(`file://${filePath}`);
    await page.waitForTimeout(500);
    // Click on Past Events tab
    await page.click('[data-tab="past"]');
    await page.waitForTimeout(300);
    const eventsSection2 = await page.$('#events');
    if (eventsSection2) {
        await eventsSection2.screenshot({ path: 'screenshot-past-events-tab.png' });
    }
    
    console.log('Screenshots saved!');
    await browser.close();
})();
