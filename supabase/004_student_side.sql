-- Placewick: student side (saved opportunities, profile links, seeing postings you applied to).
-- Run once in Supabase SQL Editor, after 001, 002 and 003.

-- 1. Saved opportunities
create table public.saved_opportunities (
    student_id     uuid not null references public.students (id) on delete cascade,
    opportunity_id uuid not null references public.opportunities (id) on delete cascade,
    created_at     timestamptz not null default now(),
    primary key (student_id, opportunity_id)
);
alter table public.saved_opportunities enable row level security;

create policy saved_read on public.saved_opportunities for select to authenticated
    using (student_id = auth.uid());
create policy saved_insert on public.saved_opportunities for insert to authenticated
    with check (student_id = auth.uid() and public.my_role() = 'student');
create policy saved_delete on public.saved_opportunities for delete to authenticated
    using (student_id = auth.uid());

grant select, delete on public.saved_opportunities to authenticated;
grant insert (student_id, opportunity_id) on public.saved_opportunities to authenticated;

-- 2. Profile links
alter table public.students add column linkedin text, add column portfolio text;
grant update (linkedin, portfolio) on public.students to authenticated;

-- 3. A student can still see an opportunity (and its company) after applying,
--    even if the posting has since been closed.
create function public.student_applied(oid uuid) returns boolean
language sql stable security definer set search_path = public as $$
    select exists (select 1 from public.applications a where a.opportunity_id = oid and a.student_id = auth.uid());
$$;

create function public.student_applied_to_company(cid uuid) returns boolean
language sql stable security definer set search_path = public as $$
    select exists (
        select 1 from public.applications a
        join public.opportunities o on o.id = a.opportunity_id
        where o.company_id = cid and a.student_id = auth.uid()
    );
$$;

grant execute on function public.student_applied(uuid), public.student_applied_to_company(uuid) to authenticated;

create policy opportunities_read_applied on public.opportunities for select to authenticated
    using (public.student_applied(id));
create policy companies_read_applied on public.companies for select to authenticated
    using (public.student_applied_to_company(id));
