-- ============================================================================
-- SMK PRIMA UNGGUL - DATABASE RELASIONAL SUPABASE (PostgreSQL + RLS + Trigger)
-- Relasi Utama:
--   auth.users (1) ─── (1) public.profiles
--   public.jurusan (1) ─── (N) public.classes
--   public.profiles (1) ─── (N) public.classes (wali_kelas_id)
--   public.classes (1) ─── (N) public.students
--   public.profiles (1) ─── (N) public.employee_attendance
--   public.students (1) ─── (N) public.student_attendance
--   public.profiles (1) ─── (N) public.student_attendance (recorded_by)
-- ============================================================================

-- 1. Tabel Profiles (Berelasi langsung 1:1 ke Supabase auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text not null,
  nip text,
  role text not null check (role in ('admin', 'guru', 'tenaga_kependidikan')) default 'tenaga_kependidikan',
  position text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Tabel Master Jurusan / Program Keahlian SMK Prima Unggul
create table if not exists public.jurusan (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  bidang_keahlian text not null,
  created_at timestamptz not null default now()
);

-- 3. Tabel Master Kelas (Berelasi ke Jurusan & Wali Kelas di Profiles)
create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  tingkat text not null check (tingkat in ('X', 'XI', 'XII')),
  jurusan_id uuid references public.jurusan(id) on delete restrict,
  wali_kelas_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

-- 4. Tabel Data Siswa (Berelasi ke public.classes)
create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  nis text not null unique,
  name text not null,
  kelas text not null,
  class_id uuid references public.classes(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Jika tabel students sudah dibuat sebelum relasi class_id ditambahkan
alter table public.students
  add column if not exists class_id uuid references public.classes(id) on delete set null;

-- 5. Tabel Absensi Karyawan (Berelasi ke public.profiles)
create table if not exists public.employee_attendance (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  date date not null default current_date,
  check_in timestamptz,
  check_out timestamptz,
  status text not null check (status in ('hadir', 'terlambat', 'izin', 'sakit')),
  notes text,
  created_at timestamptz not null default now(),
  unique (user_id, date)
);

-- 6. Tabel Absensi Siswa (Berelasi ke public.students & pencatat public.profiles)
create table if not exists public.student_attendance (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  recorded_by uuid references public.profiles(id) on delete set null,
  date date not null default current_date,
  status text not null check (status in ('hadir', 'sakit', 'izin', 'alpa')),
  notes text,
  created_at timestamptz not null default now(),
  unique (student_id, date)
);

-- Indexes untuk performa query & join relasi
create index if not exists idx_classes_jurusan on public.classes(jurusan_id);
create index if not exists idx_students_kelas on public.students(kelas);
create index if not exists idx_students_class_id on public.students(class_id);
create index if not exists idx_employee_attendance_date on public.employee_attendance(date desc);
create index if not exists idx_employee_attendance_user on public.employee_attendance(user_id, date desc);
create index if not exists idx_student_attendance_date on public.student_attendance(date desc);
create index if not exists idx_student_attendance_student on public.student_attendance(student_id, date desc);
create index if not exists idx_student_attendance_recorder on public.student_attendance(recorded_by);

-- 7. Seed Master Jurusan & Kelas SMK Prima Unggul (Idempotent)
insert into public.jurusan (code, name, bidang_keahlian)
values
  ('TKJ', 'Teknik Komputer dan Jaringan', 'Teknologi Informasi & Desain Kreatif'),
  ('DKV', 'Desain Komunikasi Visual', 'Teknologi Informasi & Desain Kreatif'),
  ('BC', 'Broadcasting dan Perfilman', 'Broadcasting & Produksi Media'),
  ('AK', 'Akuntansi', 'Bisnis, Keuangan & Manajemen Perkantoran'),
  ('MPLB', 'Manajemen Perkantoran dan Layanan Bisnis', 'Bisnis, Keuangan & Manajemen Perkantoran'),
  ('BD', 'Bisnis Digital', 'Bisnis, Keuangan & Manajemen Perkantoran')
on conflict (code) do update set
  name = excluded.name,
  bidang_keahlian = excluded.bidang_keahlian;

insert into public.classes (name, tingkat, jurusan_id)
select v.name, v.tingkat, j.id
from (
  values
    ('X TKJ 1', 'X', 'TKJ'), ('X TKJ 2', 'X', 'TKJ'),
    ('XI TKJ 1', 'XI', 'TKJ'), ('XI TKJ 2', 'XI', 'TKJ'),
    ('XII TKJ 1', 'XII', 'TKJ'), ('XII TKJ 2', 'XII', 'TKJ'),
    ('X DKV 1', 'X', 'DKV'), ('XI DKV 1', 'XI', 'DKV'), ('XII DKV 1', 'XII', 'DKV'),
    ('X BC 1', 'X', 'BC'), ('XI BC 1', 'XI', 'BC'), ('XII BC 1', 'XII', 'BC'),
    ('X AK 1', 'X', 'AK'), ('XI AK 1', 'XI', 'AK'), ('XII AK 1', 'XII', 'AK'),
    ('X MPLB 1', 'X', 'MPLB'), ('XI MPLB 1', 'XI', 'MPLB'), ('XII MPLB 1', 'XII', 'MPLB'),
    ('X BD 1', 'X', 'BD'), ('XI BD 1', 'XI', 'BD'), ('XII BD 1', 'XII', 'BD')
) as v(name, tingkat, jurusan_code)
join public.jurusan j on j.code = v.jurusan_code
on conflict (name) do nothing;

-- 8. Trigger Otomatis Relasi Siswa <-> Kelas <-> Jurusan
create or replace function public.sync_student_class_relation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  matched_class_id uuid;
  inferred_tingkat text;
  inferred_jurusan_id uuid;
begin
  if new.class_id is not null then
    select name into new.kelas from public.classes where id = new.class_id;
    return new;
  end if;

  if new.kelas is not null and trim(new.kelas) <> '' then
    select id into matched_class_id
    from public.classes
    where lower(name) = lower(trim(new.kelas))
    limit 1;

    if matched_class_id is null then
      inferred_tingkat := case
        when upper(trim(new.kelas)) like 'XII %' then 'XII'
        when upper(trim(new.kelas)) like 'XI %' then 'XI'
        else 'X'
      end;

      select id into inferred_jurusan_id
      from public.jurusan
      where upper(trim(new.kelas)) like '%' || code || '%'
      limit 1;

      insert into public.classes (name, tingkat, jurusan_id)
      values (trim(new.kelas), inferred_tingkat, inferred_jurusan_id)
      on conflict (name) do update set name = excluded.name
      returning id into matched_class_id;
    end if;

    new.class_id := matched_class_id;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_sync_student_class_relation on public.students;
create trigger trg_sync_student_class_relation
  before insert or update of kelas, class_id on public.students
  for each row execute function public.sync_student_class_relation();

-- 9. Trigger Otomatis: User Pertama di Supabase Auth Menjadi ADMIN
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  user_count integer;
  assigned_role text;
  requested_role text;
begin
  select count(*) into user_count from public.profiles;

  if user_count = 0 then
    assigned_role := 'admin';
  else
    requested_role := coalesce(new.raw_user_meta_data->>'role', 'tenaga_kependidikan');
    if requested_role in ('admin', 'guru', 'tenaga_kependidikan') then
      assigned_role := requested_role;
    else
      assigned_role := 'tenaga_kependidikan';
    end if;
  end if;

  insert into public.profiles (id, email, full_name, nip, role, position)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(nullif(new.raw_user_meta_data->>'full_name', ''), split_part(coalesce(new.email, 'Pengguna'), '@', 1)),
    nullif(new.raw_user_meta_data->>'nip', ''),
    assigned_role,
    nullif(new.raw_user_meta_data->>'position', '')
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = excluded.full_name,
    nip = coalesce(excluded.nip, public.profiles.nip),
    position = coalesce(excluded.position, public.profiles.position),
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 10. Relational Views untuk Query Join Langsung (Menghormati RLS pengguna via security_invoker)
create or replace view public.v_students_detail
with (security_invoker = true) as
select
  s.id,
  s.nis,
  s.name,
  s.kelas,
  s.class_id,
  c.tingkat,
  j.code as jurusan_code,
  j.name as jurusan_name,
  j.bidang_keahlian,
  s.created_at
from public.students s
left join public.classes c on c.id = s.class_id
left join public.jurusan j on j.id = c.jurusan_id;

create or replace view public.v_student_attendance_detail
with (security_invoker = true) as
select
  sa.id,
  sa.date,
  sa.status,
  sa.notes,
  sa.created_at,
  s.id as student_id,
  s.nis,
  s.name as student_name,
  s.kelas,
  j.code as jurusan_code,
  p.id as recorded_by_id,
  p.full_name as recorded_by_name
from public.student_attendance sa
join public.students s on s.id = sa.student_id
left join public.classes c on c.id = s.class_id
left join public.jurusan j on j.id = c.jurusan_id
left join public.profiles p on p.id = sa.recorded_by;

create or replace view public.v_employee_attendance_detail
with (security_invoker = true) as
select
  ea.id,
  ea.date,
  ea.check_in,
  ea.check_out,
  ea.status,
  ea.notes,
  ea.created_at,
  p.id as user_id,
  p.full_name,
  p.email,
  p.nip,
  p.role,
  p.position
from public.employee_attendance ea
join public.profiles p on p.id = ea.user_id;

-- 11. Helper Functions untuk RLS
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.is_teacher_or_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'guru')
  );
$$;

-- 12. Aktifkan Row Level Security (RLS)
alter table public.profiles enable row level security;
alter table public.jurusan enable row level security;
alter table public.classes enable row level security;
alter table public.students enable row level security;
alter table public.employee_attendance enable row level security;
alter table public.student_attendance enable row level security;

-- Policies: profiles
drop policy if exists "Authenticated users can view profiles" on public.profiles;
create policy "Authenticated users can view profiles"
  on public.profiles for select
  to authenticated
  using (true);

drop policy if exists "Users can update own non-admin profile or admin can update any" on public.profiles;
create policy "Users can update own non-admin profile or admin can update any"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id or public.is_admin())
  with check (auth.uid() = id or public.is_admin());

drop policy if exists "Admins can insert or delete profiles" on public.profiles;
drop policy if exists "Admins can insert profiles" on public.profiles;
create policy "Admins can insert profiles"
  on public.profiles for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "Admins can delete profiles" on public.profiles;
create policy "Admins can delete profiles"
  on public.profiles for delete
  to authenticated
  using (public.is_admin());

-- Policies: jurusan & classes
drop policy if exists "Authenticated users can view jurusan" on public.jurusan;
create policy "Authenticated users can view jurusan"
  on public.jurusan for select
  to authenticated
  using (true);

drop policy if exists "Admins can manage jurusan" on public.jurusan;
create policy "Admins can manage jurusan"
  on public.jurusan for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Authenticated users can view classes" on public.classes;
create policy "Authenticated users can view classes"
  on public.classes for select
  to authenticated
  using (true);

drop policy if exists "Admins can manage classes" on public.classes;
create policy "Admins can manage classes"
  on public.classes for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Policies: students
drop policy if exists "Authenticated users can view students" on public.students;
create policy "Authenticated users can view students"
  on public.students for select
  to authenticated
  using (true);

drop policy if exists "Admins can manage students" on public.students;
create policy "Admins can manage students"
  on public.students for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Policies: employee_attendance
drop policy if exists "Users can view own employee attendance and admins view all" on public.employee_attendance;
create policy "Users can view own employee attendance and admins view all"
  on public.employee_attendance for select
  to authenticated
  using (auth.uid() = user_id or public.is_admin());

drop policy if exists "Users can insert own employee attendance" on public.employee_attendance;
create policy "Users can insert own employee attendance"
  on public.employee_attendance for insert
  to authenticated
  with check (auth.uid() = user_id or public.is_admin());

drop policy if exists "Users can update own employee attendance" on public.employee_attendance;
create policy "Users can update own employee attendance"
  on public.employee_attendance for update
  to authenticated
  using (auth.uid() = user_id or public.is_admin())
  with check (auth.uid() = user_id or public.is_admin());

drop policy if exists "Admins can delete employee attendance" on public.employee_attendance;
create policy "Admins can delete employee attendance"
  on public.employee_attendance for delete
  to authenticated
  using (public.is_admin());

-- Policies: student_attendance
drop policy if exists "Teachers and admins can view student attendance" on public.student_attendance;
create policy "Teachers and admins can view student attendance"
  on public.student_attendance for select
  to authenticated
  using (public.is_teacher_or_admin());

drop policy if exists "Teachers and admins can insert student attendance" on public.student_attendance;
create policy "Teachers and admins can insert student attendance"
  on public.student_attendance for insert
  to authenticated
  with check (public.is_teacher_or_admin());

drop policy if exists "Teachers and admins can update student attendance" on public.student_attendance;
create policy "Teachers and admins can update student attendance"
  on public.student_attendance for update
  to authenticated
  using (public.is_teacher_or_admin())
  with check (public.is_teacher_or_admin());

drop policy if exists "Admins can delete student attendance" on public.student_attendance;
create policy "Admins can delete student attendance"
  on public.student_attendance for delete
  to authenticated
  using (public.is_admin());
