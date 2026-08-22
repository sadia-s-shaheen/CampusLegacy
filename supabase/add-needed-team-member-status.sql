-- Run this statement separately in Supabase SQL Editor.
-- It must commit before supabase/policies.sql is run.
alter type public.team_member_status add value if not exists 'needed';

-- Open role rows use NULL because no person is assigned yet.
alter table public.team_members alter column person_id drop not null;
