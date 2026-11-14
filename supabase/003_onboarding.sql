-- Placewick: fields collected during onboarding.
-- Run once in Supabase SQL Editor, after 001 and 002.

-- Companies: official email used for verification
alter table public.companies add column official_email text;
grant update (official_email) on public.companies to authenticated;

-- Students: answers from the onboarding steps
alter table public.students
    add column age_range          text,
    add column institution_name_other text,
    add column degree             text,
    add column class_of_degree    text,
    add column graduation_year    text,
    add column opportunity_types  text[] not null default '{}',
    add column interests          text[] not null default '{}',
    add column work_mode_pref     text,
    add column relocation         text,
    add column onboarded_at       timestamptz;

grant update (age_range, institution_name_other, degree, class_of_degree, graduation_year,
              opportunity_types, interests, work_mode_pref, relocation, onboarded_at)
    on public.students to authenticated;
