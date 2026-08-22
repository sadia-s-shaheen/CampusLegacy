-- Run this in Supabase Dashboard -> SQL Editor.
-- These policies let signed-in users access only their own profile data.

-- Run supabase/add-needed-team-member-status.sql once before this file.

grant select, insert, update on public.people to authenticated;
grant select on public.departments to authenticated;
grant select on public.skills to authenticated;
grant select, insert, delete on public.people_skills to authenticated;
grant select, insert, update, delete on public.projects to authenticated;
grant select, insert, update, delete on public.team_members to authenticated;
grant select on public.project_skills to authenticated;
grant select on public.tools to authenticated;
grant select on public.project_tools to authenticated;
grant select, insert, update, delete on public.project_lineages to authenticated;
grant select on public.project_ideas to authenticated;
grant select on public.connections to authenticated;
grant select, update on public.notifications to authenticated;
grant select, insert, delete on public.conversations to authenticated;
grant select, insert, update, delete on public.messages to authenticated;

alter table public.people enable row level security;
alter table public.departments enable row level security;
alter table public.skills enable row level security;
alter table public.people_skills enable row level security;
alter table public.projects enable row level security;
alter table public.connections enable row level security;
alter table public.project_skills enable row level security;
alter table public.tools enable row level security;
alter table public.project_tools enable row level security;
alter table public.project_lineages enable row level security;
alter table public.project_ideas enable row level security;
alter table public.notifications enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;

-- These helpers avoid recursive RLS evaluation when related project and team
-- rows are selected together through PostgREST nested relations.
create or replace function public.is_project_owner(project_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.projects
    where projects.id = project_uuid
      and projects.owner_id = auth.uid()
  );
$$;

create or replace function public.is_public_project(project_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.projects
    where projects.id = project_uuid
      and projects.visibility = 'public'
  );
$$;

create or replace function public.is_active_project_member(project_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.team_members
    where team_members.project_id = project_uuid
      and team_members.person_id = auth.uid()
      and team_members.status = 'active'
  );
$$;

grant execute on function public.is_project_owner(uuid) to authenticated;
grant execute on function public.is_public_project(uuid) to authenticated;
grant execute on function public.is_active_project_member(uuid) to authenticated;

drop policy if exists "Users can read their own profile" on public.people;
create policy "Users can read their own profile"
  on public.people for select
  to authenticated
  using (auth.uid() = id);

drop policy if exists "Authenticated users can discover people" on public.people;
create policy "Authenticated users can discover people"
  on public.people for select
  to authenticated
  using (true);

drop policy if exists "Users can create their own profile" on public.people;
create policy "Users can create their own profile"
  on public.people for insert
  to authenticated
  with check (auth.uid() = id);

drop policy if exists "Users can update their own profile" on public.people;
create policy "Users can update their own profile"
  on public.people for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "Authenticated users can read departments" on public.departments;
create policy "Authenticated users can read departments"
  on public.departments for select
  to authenticated
  using (true);

drop policy if exists "Authenticated users can read skills" on public.skills;
create policy "Authenticated users can read skills"
  on public.skills for select
  to authenticated
  using (true);

drop policy if exists "Users can read their own skills" on public.people_skills;
create policy "Users can read their own skills"
  on public.people_skills for select
  to authenticated
  using (auth.uid() = person_id);

drop policy if exists "Users can add their own skills" on public.people_skills;
create policy "Users can add their own skills"
  on public.people_skills for insert
  to authenticated
  with check (auth.uid() = person_id);

drop policy if exists "Users can remove their own skills" on public.people_skills;
create policy "Users can remove their own skills"
  on public.people_skills for delete
  to authenticated
  using (auth.uid() = person_id);

drop policy if exists "Users can read their own projects" on public.projects;
drop policy if exists "Users can view projects" on public.projects;
drop policy if exists "Users can view projects they are part of" on public.projects;
drop policy if exists "Authenticated users can read public projects" on public.projects;

create policy "Users can read their own projects"
  on public.projects for select
  to authenticated
  using (auth.uid() = owner_id);

create policy "Authenticated users can read public projects"
  on public.projects for select
  to authenticated
  using (visibility = 'public');

create policy "Active members can read their projects"
  on public.projects for select
  to authenticated
  using (public.is_active_project_member(id));

drop policy if exists "Authenticated users can read public project skills" on public.project_skills;
create policy "Authenticated users can read public project skills"
  on public.project_skills for select
  to authenticated
  using (public.is_public_project(project_skills.project_id));

drop policy if exists "Users can create their own projects" on public.projects;
create policy "Users can create their own projects"
  on public.projects for insert
  to authenticated
  with check (auth.uid() = owner_id);

drop policy if exists "Users can update their own projects" on public.projects;
create policy "Users can update their own projects"
  on public.projects for update
  to authenticated
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

drop policy if exists "Users can delete their own projects" on public.projects;
create policy "Users can delete their own projects"
  on public.projects for delete
  to authenticated
  using (auth.uid() = owner_id);

drop policy if exists "Users can read their team memberships" on public.team_members;
drop policy if exists "Users can view team members" on public.team_members;
drop policy if exists "Users can read public project team members" on public.team_members;
drop policy if exists "Project owners can read project requests" on public.team_members;

create policy "Users can read their team memberships"
  on public.team_members for select
  to authenticated
  using (auth.uid() = person_id);

create policy "Users can read public project team members"
  on public.team_members for select
  to authenticated
  using (status = 'active' and public.is_public_project(project_id));

create policy "Project owners can read project requests"
  on public.team_members for select
  to authenticated
  using (public.is_project_owner(project_id));

drop policy if exists "Users can add themselves to projects" on public.team_members;
create policy "Users can add themselves to projects"
  on public.team_members for insert
  to authenticated
  with check (auth.uid() = person_id);

drop policy if exists "Project owners can create open roles" on public.team_members;
create policy "Project owners can create open roles"
  on public.team_members for insert
  to authenticated
  with check (
    person_id is null
    and status = 'needed'
    and public.is_project_owner(team_members.project_id)
  );

drop policy if exists "Users can update their team memberships" on public.team_members;
create policy "Users can update their team memberships"
  on public.team_members for update
  to authenticated
  using (auth.uid() = person_id)
  with check (auth.uid() = person_id);

drop policy if exists "Project owners can review project requests" on public.team_members;
create policy "Project owners can review project requests"
  on public.team_members for update
  to authenticated
  using (public.is_project_owner(team_members.project_id))
  with check (person_id is not null and status in ('active', 'rejected'));

drop policy if exists "Project owners can update open roles" on public.team_members;
create policy "Project owners can update open roles"
  on public.team_members for update
  to authenticated
  using (
    person_id is null
    and status = 'needed'
    and public.is_project_owner(team_members.project_id)
  )
  with check (
    person_id is null
    and status = 'needed'
  );

drop policy if exists "Project owners can remove team members or roles" on public.team_members;
create policy "Project owners can remove team members or roles"
  on public.team_members for delete
  to authenticated
  using (public.is_project_owner(team_members.project_id));

drop policy if exists "Users can remove themselves from projects" on public.team_members;
create policy "Users can remove themselves from projects"
  on public.team_members for delete
  to authenticated
  using (auth.uid() = person_id);

drop policy if exists "Users can read their connections" on public.connections;
create policy "Users can read their connections"
  on public.connections for select
  to authenticated
  using (auth.uid() = follower_id or auth.uid() = following_id);

drop policy if exists "Authenticated users can read public project tools" on public.project_tools;
create policy "Authenticated users can read public project tools"
  on public.project_tools for select
  to authenticated
  using (public.is_public_project(project_tools.project_id) or public.is_project_owner(project_tools.project_id));

drop policy if exists "Project owners can manage project tools" on public.project_tools;
create policy "Project owners can manage project tools"
  on public.project_tools for all
  to authenticated
  using (public.is_project_owner(project_tools.project_id))
  with check (public.is_project_owner(project_tools.project_id));

drop policy if exists "Authenticated users can read tools" on public.tools;
create policy "Authenticated users can read tools"
  on public.tools for select
  to authenticated
  using (true);

drop policy if exists "Authenticated users can read project lineages" on public.project_lineages;
create policy "Authenticated users can read project lineages"
  on public.project_lineages for select
  to authenticated
  using (public.is_public_project(project_lineages.parent_project_id) or public.is_project_owner(project_lineages.parent_project_id));

drop policy if exists "Project owners can create project lineages" on public.project_lineages;
create policy "Project owners can create project lineages"
  on public.project_lineages for insert
  to authenticated
  with check (public.is_project_owner(project_lineages.parent_project_id));

drop policy if exists "Project owners can update project lineages" on public.project_lineages;
create policy "Project owners can update project lineages"
  on public.project_lineages for update
  to authenticated
  using (public.is_project_owner(project_lineages.parent_project_id));

drop policy if exists "Project owners can delete project lineages" on public.project_lineages;
create policy "Project owners can delete project lineages"
  on public.project_lineages for delete
  to authenticated
  using (public.is_project_owner(project_lineages.parent_project_id));

drop policy if exists "Users can read relevant project ideas" on public.project_ideas;
create policy "Users can read relevant project ideas"
  on public.project_ideas for select
  to authenticated
  using (public.is_public_project(project_ideas.source_project_id) or public.is_project_owner(project_ideas.source_project_id));

drop policy if exists "Users can read their notifications" on public.notifications;
create policy "Users can read their notifications"
  on public.notifications for select
  to authenticated
  using (auth.uid() = recipient_id);

drop policy if exists "Users can mark their notifications read" on public.notifications;
create policy "Users can mark their notifications read"
  on public.notifications for update
  to authenticated
  using (auth.uid() = recipient_id)
  with check (auth.uid() = recipient_id);

drop policy if exists "Users can read their conversations" on public.conversations;
create policy "Users can read their conversations"
  on public.conversations for select
  to authenticated
  using (auth.uid() = participant_1_id or auth.uid() = participant_2_id);

drop policy if exists "Users can create their conversations" on public.conversations;
create policy "Users can create their conversations"
  on public.conversations for insert
  to authenticated
  with check (auth.uid() = participant_1_id or auth.uid() = participant_2_id);

drop policy if exists "Users can delete their conversations" on public.conversations;
create policy "Users can delete their conversations"
  on public.conversations for delete
  to authenticated
  using (auth.uid() = participant_1_id or auth.uid() = participant_2_id);

drop policy if exists "Users can read conversation messages" on public.messages;
create policy "Users can read conversation messages"
  on public.messages for select
  to authenticated
  using (exists (
    select 1 from public.conversations
    where conversations.id = messages.conversation_id
      and (conversations.participant_1_id = auth.uid() or conversations.participant_2_id = auth.uid())
  ));

drop policy if exists "Users can send conversation messages" on public.messages;
create policy "Users can send conversation messages"
  on public.messages for insert
  to authenticated
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.conversations
      where conversations.id = messages.conversation_id
        and (conversations.participant_1_id = auth.uid() or conversations.participant_2_id = auth.uid())
    )
  );

drop policy if exists "Users can manage their sent messages" on public.messages;
create policy "Users can manage their sent messages"
  on public.messages for update
  to authenticated
  using (sender_id = auth.uid())
  with check (sender_id = auth.uid());

drop policy if exists "Users can delete their sent messages" on public.messages;
create policy "Users can delete their sent messages"
  on public.messages for delete
  to authenticated
  using (sender_id = auth.uid());
