-- Private production payment verification event. It remains closed so it does
-- not appear in public registration flows. Only a server-verified signed quick
-- checkout token can select it.
INSERT INTO events
    (slug, name, event_date, event_time, day_of_week, location, venue_name,
     venue_address, status, description, dinner_price, max_attendees)
VALUES
    ('production-payment-test', '[TEST] Production payment verification', CURRENT_DATE,
     '18:00', TO_CHAR(CURRENT_DATE, 'FMDay'), 'Production test',
     'FoundersVN secure checkout test', 'No live event attendance', 'closed',
     'Private 5,000 VND transaction used to verify the production payment, account, ticket, and email flow.',
     0.19, 999)
ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    event_date = EXCLUDED.event_date,
    location = EXCLUDED.location,
    venue_name = EXCLUDED.venue_name,
    venue_address = EXCLUDED.venue_address,
    status = 'closed',
    description = EXCLUDED.description,
    dinner_price = EXCLUDED.dinner_price,
    max_attendees = EXCLUDED.max_attendees;
