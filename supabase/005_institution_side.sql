-- Placewick: institution side (supervisors, visits, seeing related companies and postings).
-- Run once in Supabase SQL Editor, after 001 to 004.

-- 1. An institution can read the companies and postings its students applied to or were placed with.
create function public.institution_sees_opportunity(oid uuid) returns boolean
language sql stable security definer set search_path = public as $$
    select exists (
        select 1 from public.applications a
        join public.students s on s.id = a.student_id
        join public.institutions i on i.id = s.institution_id
        where a.opportunity_id = oid and i.owner_id = auth.uid()
    );
$$;

create function public.institution_sees_company(cid uuid) returns boolean
language sql stable security definer set search_path = public as $$
    select exists (
        select 1 from public.opportunities o
        where o.company_id = cid and public.institution_sees_opportunity(o.id)
    ) or exists (
        select 1 from public.placements p
        join public.institutions i on i.id = p.institution_id
        where p.company_id = cid and i.owner_id = auth.uid()
    );
$$;

create policy opportunities_read_institution on public.opportunities for select to authenticated
    using (public.institution_sees_opportunity(id));
create policy companies_read_institution on public.companies for select to authenticated
    using (public.institution_sees_company(id));

-- 2. Academic supervisors
create table public.institution_supervisors (
    id             uuid primary key default gen_random_uuid(),
    institution_id uuid not null references public.institutions (id) on delete cascade,
    name           text not null,
    email          text,
    phone          text,
    department     text,
    location       text,
    created_at     timestamptz not null default now()
);
create index on public.institution_supervisors (institution_id);
alter table public.institution_supervisors enable row level security;

create policy supervisors_read on public.institution_supervisors for select to authenticated
    using (public.owns_institution(institution_id) or public.is_admin());
create policy supervisors_insert on public.institution_supervisors for insert to authenticated
    with check (public.owns_institution(institution_id));
create policy supervisors_update on public.institution_supervisors for update to authenticated
    using (public.owns_institution(institution_id)) with check (public.owns_institution(institution_id));
create policy supervisors_delete on public.institution_supervisors for delete to authenticated
    using (public.owns_institution(institution_id));

grant select, delete on public.institution_supervisors to authenticated;
grant insert (institution_id, name, email, phone, department, location) on public.institution_supervisors to authenticated;
grant update (name, email, phone, department, location) on public.institution_supervisors to authenticated;

-- 3. Assigning a supervisor to a placement (done through a function so only the institution can do it)
alter table public.placements add column academic_supervisor_id uuid
    references public.institution_supervisors (id) on delete set null;
create index on public.placements (academic_supervisor_id);

create function public.assign_supervisor(pid uuid, sid uuid) returns void
language plpgsql security definer set search_path = public as $$
declare inst uuid;
begin
    select institution_id into inst from public.placements where id = pid;
    if inst is null or not public.owns_institution(inst) then raise exception 'Not allowed'; end if;
    if sid is not null and not exists (
        select 1 from public.institution_supervisors where id = sid and institution_id = inst
    ) then raise exception 'Supervisor not found'; end if;
    update public.placements set academic_supervisor_id = sid where id = pid;
end;
$$;

-- 4. Supervisor visits
create table public.supervisor_visits (
    id             uuid primary key default gen_random_uuid(),
    placement_id   uuid not null references public.placements (id) on delete cascade,
    supervisor_id  uuid references public.institution_supervisors (id) on delete set null,
    institution_id uuid not null references public.institutions (id) on delete cascade,
    visit_date     date not null,
    notes          text,
    created_at     timestamptz not null default now()
);
create index on public.supervisor_visits (institution_id);
create index on public.supervisor_visits (placement_id);
alter table public.supervisor_visits enable row level security;

create policy visits_read on public.supervisor_visits for select to authenticated
    using (public.owns_institution(institution_id) or public.is_admin());
create policy visits_delete on public.supervisor_visits for delete to authenticated
    using (public.owns_institution(institution_id));
grant select, delete on public.supervisor_visits to authenticated;

create function public.log_supervisor_visit(pid uuid, vdate date, vnotes text default null) returns void
language plpgsql security definer set search_path = public as $$
declare inst uuid; sup uuid;
begin
    select institution_id, academic_supervisor_id into inst, sup from public.placements where id = pid;
    if inst is null or not public.owns_institution(inst) then raise exception 'Not allowed'; end if;
    insert into public.supervisor_visits (placement_id, supervisor_id, institution_id, visit_date, notes)
    values (pid, sup, inst, vdate, nullif(trim(vnotes), ''));
end;
$$;

revoke all on function public.assign_supervisor(uuid, uuid) from public;
revoke all on function public.log_supervisor_visit(uuid, date, text) from public;
grant execute on function public.assign_supervisor(uuid, uuid) to authenticated;
grant execute on function public.log_supervisor_visit(uuid, date, text) to authenticated;
