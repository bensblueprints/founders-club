-- ========================================
-- FOUNDERS VIETNAM - Supabase Database Schema
-- Run this in your Supabase SQL Editor
-- ========================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========================================
-- MEMBERS TABLE (User profiles)
-- ========================================
CREATE TABLE IF NOT EXISTS members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    age INTEGER,
    company VARCHAR(255),
    role VARCHAR(100),
    industry VARCHAR(50),
    bio TEXT,
    website VARCHAR(500),
    whatsapp VARCHAR(50),
    zalo VARCHAR(50),
    telegram VARCHAR(50),
    linkedin VARCHAR(500),
    twitter VARCHAR(100),
    wechat VARCHAR(100),
    facebook VARCHAR(500),
    instagram VARCHAR(100),
    social_link VARCHAR(500),
    is_approved BOOLEAN DEFAULT FALSE,
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- APPLICATIONS TABLE (Membership applications)
-- ========================================
CREATE TABLE IF NOT EXISTS applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    age INTEGER,
    social_link VARCHAR(500),
    company VARCHAR(255),
    role VARCHAR(100),
    industry VARCHAR(50),
    revenue VARCHAR(50),
    team_size VARCHAR(50),
    biggest_challenge TEXT,
    unique_value TEXT,
    goals_12_month TEXT,
    why_join TEXT,
    referral VARCHAR(50),
    referrer_name VARCHAR(255),
    event_interest VARCHAR(50),
    membership_type VARCHAR(50),
    status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected, disqualified
    reviewed_at TIMESTAMP WITH TIME ZONE,
    reviewed_by UUID REFERENCES members(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- EVENTS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug VARCHAR(50) UNIQUE NOT NULL, -- e.g., 'jan-2026'
    name VARCHAR(255) NOT NULL,
    event_date DATE NOT NULL,
    event_time TIME DEFAULT '18:00',
    day_of_week VARCHAR(20),
    location VARCHAR(255) DEFAULT 'Ho Chi Minh City',
    description TEXT,
    dinner_price DECIMAL(10,2) DEFAULT 150.00,
    cruise_price DECIMAL(10,2) DEFAULT 297.00,
    max_attendees INTEGER DEFAULT 100,
    max_cruise_spots INTEGER DEFAULT 30,
    status VARCHAR(20) DEFAULT 'upcoming', -- upcoming, open, closed, completed
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- EVENT ATTENDANCE TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS event_attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    member_id UUID REFERENCES members(id) ON DELETE CASCADE,
    ticket_type VARCHAR(20) NOT NULL, -- 'dinner' or 'full' (dinner + cruise)
    payment_status VARCHAR(20) DEFAULT 'pending', -- pending, paid, refunded
    checked_in BOOLEAN DEFAULT FALSE,
    checked_in_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(event_id, member_id)
);

-- ========================================
-- EVENT PHOTOS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS event_photos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    photo_url VARCHAR(1000) NOT NULL,
    caption TEXT,
    display_order INTEGER DEFAULT 0,
    uploaded_by UUID REFERENCES members(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- SESSIONS TABLE (for auth)
-- ========================================
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    member_id UUID REFERENCES members(id) ON DELETE CASCADE,
    token VARCHAR(500) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- INSERT SAMPLE EVENTS
-- ========================================
INSERT INTO events (slug, name, event_date, day_of_week, status, description) VALUES
    ('jan-2026', 'January Gathering', '2026-01-24', 'Saturday', 'completed', 'Our inaugural gathering brought together Vietnam''s most ambitious founders.'),
    ('feb-2026', 'February Gathering', '2026-02-10', 'Tuesday', 'open', 'Monthly gathering for founders.'),
    ('mar-2026', 'March Gathering', '2026-03-11', 'Wednesday', 'upcoming', 'Monthly gathering for founders.'),
    ('apr-2026', 'April Gathering', '2026-04-14', 'Tuesday', 'upcoming', 'Monthly gathering for founders.'),
    ('may-2026', 'May Gathering', '2026-05-13', 'Wednesday', 'upcoming', 'Monthly gathering for founders.'),
    ('jun-2026', 'June Gathering', '2026-06-09', 'Tuesday', 'upcoming', 'Monthly gathering for founders.'),
    ('jul-2026', 'July Gathering', '2026-07-08', 'Wednesday', 'upcoming', 'Monthly gathering for founders.')
ON CONFLICT (slug) DO NOTHING;

-- ========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ========================================

-- Enable RLS on all tables
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_photos ENABLE ROW LEVEL SECURITY;

-- Members: Users can read approved members, update their own profile
CREATE POLICY "Approved members are viewable by authenticated users" ON members
    FOR SELECT USING (is_approved = true);

CREATE POLICY "Users can update their own profile" ON members
    FOR UPDATE USING (auth.uid()::text = id::text);

-- Applications: Anyone can insert, only admins can view/update
CREATE POLICY "Anyone can submit an application" ON applications
    FOR INSERT WITH CHECK (true);

-- Events: Everyone can view events
CREATE POLICY "Events are viewable by everyone" ON events
    FOR SELECT USING (true);

-- Event Attendance: Members can see attendance for events they attended
CREATE POLICY "View attendance for attended events" ON event_attendance
    FOR SELECT USING (
        member_id::text = auth.uid()::text 
        OR 
        event_id IN (SELECT event_id FROM event_attendance WHERE member_id::text = auth.uid()::text)
    );

-- Event Photos: Everyone can view photos
CREATE POLICY "Photos are viewable by everyone" ON event_photos
    FOR SELECT USING (true);

-- ========================================
-- INDEXES FOR PERFORMANCE
-- ========================================
CREATE INDEX IF NOT EXISTS idx_members_email ON members(email);
CREATE INDEX IF NOT EXISTS idx_members_approved ON members(is_approved);
CREATE INDEX IF NOT EXISTS idx_applications_email ON applications(email);
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
CREATE INDEX IF NOT EXISTS idx_events_date ON events(event_date);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_attendance_event ON event_attendance(event_id);
CREATE INDEX IF NOT EXISTS idx_attendance_member ON event_attendance(member_id);

-- ========================================
-- FUNCTIONS
-- ========================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for members table
CREATE TRIGGER update_members_updated_at
    BEFORE UPDATE ON members
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
