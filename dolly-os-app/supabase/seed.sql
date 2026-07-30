-- August plan seed. Run after schema.sql.

-- The big three north stars (Oct lil flea date is a placeholder — first of Oct)
insert into north_stars (title, translation, target_date, sort_order) values
  ('October lil flea', 'lose weight', '2026-10-01', 0),
  ('Content queen', 'lose weight', null, 1),
  ('Fame + travel', 'make content', null, 2);

insert into goals (title, week_number, sort_order, category) values
  -- Week 1 — LAND
  ('Book metabolic consult (Dr. Bhograj, AiHealth RMV Extn)', 1, 0, 'health'),
  ('Book adult ADHD assessment (Dr. Roshan Jain online / Beautiful Mind)', 1, 1, 'health'),
  ('Bangalore move executed (leave Bhopal 3rd-6th)', 1, 2, 'admin'),
  ('HSR venue locked + Rs.499 Razorpay link live', 1, 3, 'event'),
  ('LinkedIn post #4 up (event announce)', 1, 4, 'content'),
  ('Gym: first session back', 1, 5, 'health'),
  -- Week 2 — IGNITE
  ('Attend both doctor appointments', 2, 0, 'health'),
  ('Yap Day: all 5 filmed in one sitting', 2, 1, 'content'),
  ('Reddit post (r/bangalore) for event', 2, 2, 'event'),
  ('Seats check: 10+ of 25', 2, 3, 'event'),
  ('Wake <=8am at least 4 days (phone out by 11pm)', 2, 4, 'health'),
  -- Week 3 — BUILD
  ('Edit Day: 3-or-dead on Dharamshala backlog', 3, 0, 'content'),
  ('Personal DMs: Lean In, D2CX women, Komal, exhibition contacts', 3, 1, 'event'),
  ('Seats check: 18+ of 25', 3, 2, 'event'),
  ('Cherie Blair mentee application submitted', 3, 3, 'admin'),
  -- Week 4 — HOST
  ('Attendee WhatsApp group live', 4, 0, 'event'),
  ('HOST THE ROOM', 4, 1, 'event'),
  ('Capture everything (photos, quotes, one reel day-of)', 4, 2, 'content'),
  ('Announce September event date to the room', 4, 3, 'event');
