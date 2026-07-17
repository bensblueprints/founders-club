-- Event venue details should be controlled by event CRUD, not hardcoded in emails/pages.

ALTER TABLE events ADD COLUMN IF NOT EXISTS venue_name VARCHAR(255);
ALTER TABLE events ADD COLUMN IF NOT EXISTS venue_address TEXT;

UPDATE events
SET
    location = CASE
        WHEN slug = 'danang-jul-2026' AND LOWER(COALESCE(location, '')) LIKE '%steakhouse%'
            THEN 'Da Nang'
        ELSE location
    END,
    venue_name = COALESCE(NULLIF(venue_name, ''), 'FOR YOU STEAKHOUSE'),
    venue_address = COALESCE(NULLIF(venue_address, ''), 'Lô 1C - 01 Võ Nguyên Giáp, An Hải, Đà Nẵng 550000, Việt Nam')
WHERE slug = 'danang-jul-2026';
