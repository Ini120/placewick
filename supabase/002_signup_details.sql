-- Placewick: store institution details collected at sign-up.
-- Run once in Supabase SQL Editor, after 001_initial_schema.sql.
-- When someone signs up as an institution, the sign-up form sends the school's details,
-- and this creates the institution record (status "pending") ready for admin verification.

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
    chosen text := coalesce(new.raw_user_meta_data ->> 'role', 'student');
    r public.user_role;
    inst_type text := new.raw_user_meta_data ->> 'institution_type';
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
    elsif r = 'institution' and coalesce(new.raw_user_meta_data ->> 'institution_name', '') <> '' then
        if inst_type is null or inst_type not in ('university', 'polytechnic', 'college_of_education', 'monotechnic') then
            inst_type := 'university';
        end if;
        insert into public.institutions (owner_id, name, type, state, contact_role, official_email)
        values (
            new.id,
            left(new.raw_user_meta_data ->> 'institution_name', 200),
            inst_type,
            left(new.raw_user_meta_data ->> 'institution_state', 100),
            left(new.raw_user_meta_data ->> 'contact_role', 100),
            new.email
        );
    end if;
    return new;
end;
$$;
