-- Optional: loads the cards from your current Trello board. Run once, after schema.sql.
do $$
declare
  l_clients uuid; l_upcoming uuid; l_david uuid; l_jamie uuid; l_shannen uuid; l_caitlynn uuid; l_later uuid;
begin
  insert into public.lists (title, color, position, collapsed) values ('Later', 'slate', 0, true) returning id into l_later;
  insert into public.lists (title, color, position) values ('Client List', 'slate', 1) returning id into l_clients;
  insert into public.lists (title, color, position) values ('Upcoming Projects', 'green', 2) returning id into l_upcoming;
  insert into public.lists (title, color, position) values ('David Leach - Founder', 'yellow', 3) returning id into l_david;
  insert into public.lists (title, color, position) values ('Jamie - Editor', 'blue', 4) returning id into l_jamie;
  insert into public.lists (title, color, position) values ('Shannen - Account Manager', 'purple', 5) returning id into l_shannen;
  insert into public.lists (title, color, position) values ('Caitlynn - Content Manager', 'pink', 6) returning id into l_caitlynn;

  insert into public.cards (list_id, title, position, completed, due_date) values
    (l_clients, 'Altitude - Kissimmee', 1, false, null),
    (l_clients, 'Altitude - Bradenton', 2, false, null),
    (l_clients, 'Altitude - Spring Hill', 3, false, null),
    (l_clients, 'Altitude - Sanford', 4, false, null),
    (l_clients, 'Altitude - West Palm Beach', 5, false, null),
    (l_clients, 'Altitude - Odessa', 6, false, null),
    (l_clients, 'Big Play MS', 7, false, null),
    (l_clients, 'Powerhouse Appliances', 8, false, null),
    (l_clients, 'Galaxy Gaming', 9, false, null),
    (l_clients, 'Altitude - City view', 10, false, null),

    (l_upcoming, 'Create new campaign for Candeeland Burbank', 1, true, null),
    (l_upcoming, 'AI chat bot for all Grady park''s social media?', 2, false, null),
    (l_upcoming, 'Patch for Odessa to send to Heidi', 3, false, null),
    (l_upcoming, 'Text and email blast for Odessa', 4, true, null),
    (l_upcoming, 'Follow up with Orlando and Brandon (new clients)', 5, true, null),

    (l_david, 'finish jason report', 1, true, null),
    (l_david, 'fill out powerhouse spreadsheet', 2, true, null),
    (l_david, 'Split test landing pages with feedback from the guy Jason/Jared', 3, false, null),
    (l_david, 'Send test membership email to Jason and Grady for approval//add membership offer details once they approve', 4, false, null),
    (l_david, 'New powerhouse grill/memorial day ads running on VIBE', 5, true, null),

    (l_jamie, 'PH Website Videos', 1, true, null),
    (l_jamie, 'PBZ update', 2, true, null),
    (l_jamie, 'Altitude "graphic designer on break"', 3, false, null),

    (l_shannen, 'deploy new email funnel for bradenton', 1, true, '2026-03-02'),
    (l_shannen, 'send birthday email out to all parents with child birthdays in the next 3 months for bradenton', 2, true, '2026-03-02'),
    (l_shannen, 'double check and make sure all parks have the correct birthday funnel turned on', 3, true, '2026-03-02'),
    (l_shannen, 'add membership automation for ATP Columbia via Patch (post purchase email) (discuss with david)', 4, false, null),
    (l_shannen, 'Candeeland, fix mobile contact card', 5, true, null),
    (l_shannen, 'Fix all parks HL glitch in party form', 6, true, null),
    (l_shannen, 'Brandon Facebook card set up', 7, true, null),
    (l_shannen, 'Orlando Facebook card set up', 8, false, null),
    (l_shannen, 'Email Dustin re: onboarding', 9, true, '2026-06-08');
end $$;
