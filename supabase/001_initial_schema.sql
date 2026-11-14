-- Placewick: initial database schema (Supabase / PostgreSQL)
-- Run once in Supabase: SQL Editor > New query > paste > Run.
-- Keep this file in your repo (supabase/001_initial_schema.sql). It is your design, and it runs on any PostgreSQL.

-- =====================================================================
-- 1. TYPES
-- =====================================================================
create type public.user_role           as enum ('student', 'company', 'institution', 'admin');
create type public.verification_status as enum ('pending', 'verified', 'rejected');
create type public.opportunity_type    as enum ('siwes', 'internship');
create type public.opportunity_status  as enum ('draft', 'open', 'closed');
create type public.application_status  as enum ('applied', 'reviewing', 'interview', 'accepted', 'rejected', 'withdrawn');
create type public.placement_status    as enum ('active', 'completed', 'cancelled');
create type public.logbook_status      as enum ('draft', 'submitted', 'approved', 'returned');

-- =====================================================================
-- 2. TABLES
-- =====================================================================

-- One row per login. Created automatically when someone signs up.
create table public.profiles (
    id          uuid primary key references auth.users (id) on delete cascade,
    role        public.user_role not null default 'student',
    full_name   text,
    email       text,
    phone       text,
    created_at  timestamptz not null default now()
);

create table public.institutions (
    id             uuid primary key default gen_random_uuid(),
    owner_id       uuid not null unique references public.profiles (id) on delete cascade,
    name           text not null,
    type           text not null check (type in ('university', 'polytechnic', 'college_of_education', 'monotechnic')),
    state          text,
    contact_role   text,
    official_email text,
    status         public.verification_status not null default 'pending',
    created_at     timestamptz not null default now()
);

create table public.companies (
    id           uuid primary key default gen_random_uuid(),
    owner_id     uuid not null unique references public.profiles (id) on delete cascade,
    name         text not null,
    industry     text,
    location     text,
    rc_number    text,
    website      text,
    description  text,
    status       public.verification_status not null default 'pending',
    created_at   timestamptz not null default now()
);

create table public.students (
    id             uuid primary key references public.profiles (id) on delete cascade,
    institution_id uuid references public.institutions (id) on delete set null,
    matric_no      text,
    department     text,
    course         text,
    level          text,
    skills         text[] not null default '{}',
    location_pref  text,
    bio            text,
    cv_path        text,
    created_at     timestamptz not null default now()
);

create table public.opportunities (
    id          uuid primary key default gen_random_uuid(),
    company_id  uuid not null references public.companies (id) on delete cascade,
    title       text not null,
    type        public.opportunity_type not null,
    location    text,
    work_mode   text check (work_mode in ('on-site', 'hybrid', 'remote')),
    duration    text,
    allowance   text,
    description text,
    skills      text[] not null default '{}',
    deadline    date,
    status      public.opportunity_status not null default 'draft',
    created_at  timestamptz not null default now()
);

create table public.applications (
    id             uuid primary key default gen_random_uuid(),
    opportunity_id uuid not null references public.opportunities (id) on delete cascade,
    student_id     uuid not null references public.students (id) on delete cascade,
    status         public.application_status not null default 'applied',
    cover_note     text,
    created_at     timestamptz not null default now(),
    unique (opportunity_id, student_id)
);

create table public.placements (
    id              uuid primary key default gen_random_uuid(),
    application_id  uuid not null unique references public.applications (id) on delete cascade,
    student_id      uuid not null references public.students (id) on delete cascade,
    company_id      uuid not null references public.companies (id) on delete cascade,
    institution_id  uuid references public.institutions (id) on delete set null,
    supervisor_name text,
    start_date      date,
    end_date        date,
    status          public.placement_status not null default 'active',
    created_at      timestamptz not null default now()
);

create table public.logbook_entries (
    id               uuid primary key default gen_random_uuid(),
    placement_id     uuid not null references public.placements (id) on delete cascade,
    week_number      int  not null check (week_number > 0),
    entry_date       date,
    content          text not null,
    status           public.logbook_status not null default 'draft',
    reviewer_comment text,
    created_at       timestamptz not null default now(),
    updated_at       timestamptz not null default now()
);

create index on public.students (institution_id);
create index on public.opportunities (company_id, status);
create index on public.applications (student_id);
create index on public.applications (opportunity_id);
create index on public.placements (student_id);
create index on public.placements (company_id);
create index on public.placements (institution_id);
create index on public.logbook_entries (placement_id);

-- =====================================================================
-- 3. HELPER FUNCTIONS (used by the access rules below)
-- They run with owner rights so the rules never loop on each other.
-- =====================================================================
create function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
    select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

create function public.my_role() returns public.user_role
language sql stable security definer set search_path = public as $$
    select role from public.profiles where id = auth.uid();
$$;

create function public.owns_company(cid uuid) returns boolean
language sql stable security definer set search_path = public as $$
    select exists (select 1 from public.companies where id = cid and owner_id = auth.uid());
$$;

create function public.company_is_verified(cid uuid) returns boolean
language sql stable security definer set search_path = public as $$
    select exists (select 1 from public.companies where id = cid and status = 'verified');
$$;

create function public.owns_institution(iid uuid) returns boolean
language sql stable security definer set search_path = public as $$
    select exists (select 1 from public.institutions where id = iid and owner_id = auth.uid());
$$;

create function public.owns_opportunity(oid uuid) returns boolean
language sql stable security definer set search_path = public as $$
    select exists (
        select 1 from public.opportunities o
        join public.companies c on c.id = o.company_id
        where o.id = oid and c.owner_id = auth.uid()
    );
$$;

create function public.opportunity_is_open(oid uuid) returns boolean
language sql stable security definer set search_path = public as $$
    select exists (
        select 1 from public.opportunities o
        join public.companies c on c.id = o.company_id
        where o.id = oid and o.status = 'open' and c.status = 'verified'
    );
$$;

-- A company may see a student who applied to one of its opportunities.
create function public.company_can_see_student(sid uuid) returns boolean
language sql stable security definer set search_path = public as $$
    select exists (
        select 1 from public.applications a
        join public.opportunities o on o.id = a.opportunity_id
        join public.companies c on c.id = o.company_id
        where a.student_id = sid and c.owner_id = auth.uid()
    );
$$;

-- An institution may see students who linked themselves to it.
create function public.institution_can_see_student(sid uuid) returns boolean
language sql stable security definer set search_path = public as $$
    select exists (
        select 1 from public.students s
        join public.institutions i on i.id = s.institution_id
        where s.id = sid and i.owner_id = auth.uid()
    );
$$;

create function public.can_access_placement(pid uuid) returns boolean
language sql stable security definer set search_path = public as $$
    select exists (
        select 1 from public.placements p
        left join public.companies c on c.id = p.company_id
        left join public.institutions i on i.id = p.institution_id
        where p.id = pid
          and (p.student_id = auth.uid() or c.owner_id = auth.uid() or i.owner_id = auth.uid())
    );
$$;

-- =====================================================================
-- 4. NEW USER => PROFILE (and student record) AUTOMATICALLY
-- The role comes from the sign-up form, but 'admin' can never be chosen here.
-- =====================================================================
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
    chosen text := coalesce(new.raw_user_meta_data ->> 'role', 'student');
    r public.user_role;
begin
    if chosen in ('student', 'company', 'institution') then
        r := chosen::public.user_role;
    else
        r := 'student';
    end if;

    insert into public.profiles (id, role, full_name, email, phone)
    values (
        new.id, r,
        coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
        new.email,
        new.raw_user_meta_data ->> 'phone'
    );

    if r = 'student' then
        insert into public.students (id) values (new.id);
    end if;
    return new;
end;
$$;

create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();

create function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
    new.updated_at := now();
    return new;
end;
$$;

create trigger logbook_touch before update on public.logbook_entries
    for each row execute function public.touch_updated_at();

-- =====================================================================
-- 5. ACTIONS THAT NEED EXTRA CARE (admin approvals, logbook review)
-- =====================================================================
create function public.admin_set_company_status(cid uuid, new_status public.verification_status)
returns void language plpgsql security definer set search_path = public as $$
begin
    if not public.is_admin() then raise exception 'Not allowed'; end if;
    update public.companies set status = new_status where id = cid;
end;
$$;

create function public.admin_set_institution_status(iid uuid, new_status public.verification_status)
returns void language plpgsql security definer set search_path = public as $$
begin
    if not public.is_admin() then raise exception 'Not allowed'; end if;
    update public.institutions set status = new_status where id = iid;
end;
$$;

-- Company or institution approves or returns a submitted logbook entry.
create function public.review_logbook_entry(entry_id uuid, approve boolean, comment text default null)
returns void language plpgsql security definer set search_path = public as $$
declare pid uuid;
begin
    select placement_id into pid from public.logbook_entries where id = entry_id;
    if pid is null or not public.can_access_placement(pid) then raise exception 'Not allowed'; end if;
    if exists (select 1 from public.placements where id = pid and student_id = auth.uid()) then
        raise exception 'Students cannot review their own logbook';
    end if;
    update public.logbook_entries
       set status = case when approve then 'approved'::public.logbook_status else 'returned'::public.logbook_status end,
           reviewer_comment = comment
     where id = entry_id and status = 'submitted';
end;
$$;

-- =====================================================================
-- 6. ACCESS RULES (Row Level Security)
-- Nothing is readable or writable unless a rule below allows it.
-- =====================================================================
alter table public.profiles        enable row level security;
alter table public.institutions    enable row level security;
alter table public.companies       enable row level security;
alter table public.students        enable row level security;
alter table public.opportunities   enable row level security;
alter table public.applications    enable row level security;
alter table public.placements      enable row level security;
alter table public.logbook_entries enable row level security;

-- profiles
create policy profiles_read on public.profiles for select to authenticated
    using (id = auth.uid() or public.is_admin()
           or public.company_can_see_student(id) or public.institution_can_see_student(id));
create policy profiles_update_own on public.profiles for update to authenticated
    using (id = auth.uid()) with check (id = auth.uid());

-- institutions
create policy institutions_read on public.institutions for select to authenticated
    using (status = 'verified' or owner_id = auth.uid() or public.is_admin());
create policy institutions_insert on public.institutions for insert to authenticated
    with check (owner_id = auth.uid() and public.my_role() = 'institution' and status = 'pending');
create policy institutions_update_own on public.institutions for update to authenticated
    using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- companies (verified ones are public so the opportunities page can show them)
create policy companies_read_public on public.companies for select to anon, authenticated
    using (status = 'verified');
create policy companies_read_own on public.companies for select to authenticated
    using (owner_id = auth.uid() or public.is_admin());
create policy companies_insert on public.companies for insert to authenticated
    with check (owner_id = auth.uid() and public.my_role() = 'company' and status = 'pending');
create policy companies_update_own on public.companies for update to authenticated
    using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- students
create policy students_read on public.students for select to authenticated
    using (id = auth.uid() or public.is_admin()
           or public.company_can_see_student(id) or public.institution_can_see_student(id));
create policy students_update_own on public.students for update to authenticated
    using (id = auth.uid())
    with check (id = auth.uid() and (
        institution_id is null
        or exists (select 1 from public.institutions i where i.id = institution_id and i.status = 'verified')
    ));

-- opportunities
create policy opportunities_read_public on public.opportunities for select to anon, authenticated
    using (status = 'open' and public.company_is_verified(company_id));
create policy opportunities_read_own on public.opportunities for select to authenticated
    using (public.owns_company(company_id) or public.is_admin());
create policy opportunities_insert on public.opportunities for insert to authenticated
    with check (public.owns_company(company_id)
                and (status = 'draft' or public.company_is_verified(company_id)));
create policy opportunities_update on public.opportunities for update to authenticated
    using (public.owns_company(company_id))
    with check (public.owns_company(company_id)
                and (status = 'draft' or public.company_is_verified(company_id)));
create policy opportunities_delete on public.opportunities for delete to authenticated
    using (public.owns_company(company_id));

-- applications
create policy applications_read on public.applications for select to authenticated
    using (student_id = auth.uid()
           or public.owns_opportunity(opportunity_id)
           or public.institution_can_see_student(student_id)
           or public.is_admin());
create policy applications_insert on public.applications for insert to authenticated
    with check (student_id = auth.uid() and public.my_role() = 'student'
                and status = 'applied' and public.opportunity_is_open(opportunity_id));
create policy applications_update_company on public.applications for update to authenticated
    using (public.owns_opportunity(opportunity_id))
    with check (public.owns_opportunity(opportunity_id) and status <> 'withdrawn');
create policy applications_withdraw on public.applications for update to authenticated
    using (student_id = auth.uid())
    with check (student_id = auth.uid() and status = 'withdrawn');

-- placements (created by the company once it has accepted an application)
create policy placements_read on public.placements for select to authenticated
    using (student_id = auth.uid() or public.owns_company(company_id)
           or (institution_id is not null and public.owns_institution(institution_id))
           or public.is_admin());
create policy placements_insert on public.placements for insert to authenticated
    with check (
        public.owns_company(company_id)
        and exists (
            select 1 from public.applications a
            join public.opportunities o on o.id = a.opportunity_id
            where a.id = placements.application_id
              and a.student_id = placements.student_id
              and o.company_id = placements.company_id
              and a.status = 'accepted'
        )
        and placements.institution_id is not distinct from
            (select s.institution_id from public.students s where s.id = placements.student_id)
    );
create policy placements_update on public.placements for update to authenticated
    using (public.owns_company(company_id)
           or (institution_id is not null and public.owns_institution(institution_id)))
    with check (public.owns_company(company_id)
           or (institution_id is not null and public.owns_institution(institution_id)));

-- logbook entries (students write; companies and institutions review through review_logbook_entry)
create policy logbook_read on public.logbook_entries for select to authenticated
    using (public.can_access_placement(placement_id) or public.is_admin());
create policy logbook_insert on public.logbook_entries for insert to authenticated
    with check (status in ('draft', 'submitted')
                and exists (select 1 from public.placements p
                            where p.id = placement_id and p.student_id = auth.uid() and p.status = 'active'));
create policy logbook_update_student on public.logbook_entries for update to authenticated
    using (status in ('draft', 'returned')
           and exists (select 1 from public.placements p where p.id = placement_id and p.student_id = auth.uid()))
    with check (status in ('draft', 'submitted')
           and exists (select 1 from public.placements p where p.id = placement_id and p.student_id = auth.uid()));

-- =====================================================================
-- 7. PERMISSIONS (new tables are not exposed automatically, so we grant exactly what is needed)
-- =====================================================================
grant usage on schema public to anon, authenticated;

grant select on public.companies, public.opportunities to anon;

grant select on public.profiles, public.institutions, public.companies, public.students,
                public.opportunities, public.applications, public.placements, public.logbook_entries
    to authenticated;

grant update (full_name, phone) on public.profiles to authenticated;

grant insert on public.institutions to authenticated;
grant update (name, type, state, contact_role, official_email) on public.institutions to authenticated;

grant insert on public.companies to authenticated;
grant update (name, industry, location, rc_number, website, description) on public.companies to authenticated;

grant update (institution_id, matric_no, department, course, level, skills, location_pref, bio, cv_path)
    on public.students to authenticated;

grant insert, delete on public.opportunities to authenticated;
grant update (title, type, location, work_mode, duration, allowance, description, skills, deadline, status)
    on public.opportunities to authenticated;

grant insert (opportunity_id, student_id, cover_note) on public.applications to authenticated;
grant update (status) on public.applications to authenticated;

grant insert (application_id, student_id, company_id, institution_id, supervisor_name, start_date, end_date)
    on public.placements to authenticated;
grant update (supervisor_name, start_date, end_date, status) on public.placements to authenticated;

grant insert (placement_id, week_number, entry_date, content, status) on public.logbook_entries to authenticated;
grant update (week_number, entry_date, content, status) on public.logbook_entries to authenticated;

-- functions
revoke all on function public.admin_set_company_status(uuid, public.verification_status) from public;
revoke all on function public.admin_set_institution_status(uuid, public.verification_status) from public;
revoke all on function public.review_logbook_entry(uuid, boolean, text) from public;
grant execute on function public.admin_set_company_status(uuid, public.verification_status) to authenticated;
grant execute on function public.admin_set_institution_status(uuid, public.verification_status) to authenticated;
grant execute on function public.review_logbook_entry(uuid, boolean, text) to authenticated;

grant execute on function public.is_admin(), public.my_role(), public.owns_company(uuid),
    public.company_is_verified(uuid), public.owns_institution(uuid), public.owns_opportunity(uuid),
    public.opportunity_is_open(uuid), public.company_can_see_student(uuid),
    public.institution_can_see_student(uuid), public.can_access_placement(uuid)
    to anon, authenticated;

-- =====================================================================
-- 8. MAKING YOURSELF ADMIN (run separately, once, after you have signed up on the site)
-- Replace the email with the one you signed up with, then run only this line:
--
--   update public.profiles set role = 'admin' where email = 'you@example.com';
-- =====================================================================
