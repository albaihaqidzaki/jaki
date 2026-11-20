export type UserRole = 'admin' | 'guru' | 'tenaga_kependidikan';

export type EmployeeAttendanceStatus = 'hadir' | 'terlambat' | 'izin' | 'sakit';
export type StudentAttendanceStatus = 'hadir' | 'sakit' | 'izin' | 'alpa';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  nip: string | null;
  role: UserRole;
  position: string | null;
  created_at: string;
  updated_at?: string;
  last_sign_in_at?: string | null;
}

export interface Jurusan {
  id: string;
  code: string;
  name: string;
  bidang_keahlian: string;
}

export interface SchoolClass {
  id: string;
  name: string;
  tingkat: 'X' | 'XI' | 'XII';
  jurusan_id: string | null;
  wali_kelas_id?: string | null;
  jurusan?: Jurusan | null;
}

export interface Student {
  id: string;
  nis: string;
  name: string;
  kelas: string;
  class_id?: string | null;
  classes?: Pick<SchoolClass, 'id' | 'name' | 'tingkat'> & {
    jurusan?: Pick<Jurusan, 'id' | 'code' | 'name' | 'bidang_keahlian'> | null;
  } | null;
  created_at: string;
  updated_at?: string;
}

export interface EmployeeAttendance {
  id: string;
  user_id: string;
  date: string;
  check_in: string | null;
  check_out: string | null;
  status: EmployeeAttendanceStatus;
  notes: string | null;
  created_at: string;
  profiles?: Pick<UserProfile, 'id' | 'full_name' | 'email' | 'nip' | 'role' | 'position'>;
}

export interface StudentAttendance {
  id: string;
  student_id: string;
  recorded_by: string | null;
  date: string;
  status: StudentAttendanceStatus;
  notes: string | null;
  created_at: string;
  students?: Student;
  recorder?: Pick<UserProfile, 'id' | 'full_name'> | null;
}

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Admin',
  guru: 'Guru',
  tenaga_kependidikan: 'Tenaga Kependidikan',
};

export const EMPLOYEE_STATUS_LABELS: Record<EmployeeAttendanceStatus, string> = {
  hadir: 'Hadir',
  terlambat: 'Terlambat',
  izin: 'Izin',
  sakit: 'Sakit',
};

export const STUDENT_STATUS_LABELS: Record<StudentAttendanceStatus, string> = {
  hadir: 'Hadir',
  sakit: 'Sakit',
  izin: 'Izin',
  alpa: 'Alpa',
};

export const JURUSAN_CODES = ['TKJ', 'DKV', 'AK', 'BC', 'MPLB', 'BD'] as const;

export const KELAS_OPTIONS: string[] = [
  'X TKJ 1', 'X TKJ 2', 'XI TKJ 1', 'XI TKJ 2', 'XII TKJ 1', 'XII TKJ 2',
  'X DKV 1', 'XI DKV 1', 'XII DKV 1',
  'X AK 1', 'XI AK 1', 'XII AK 1',
  'X BC 1', 'XI BC 1', 'XII BC 1',
  'X MPLB 1', 'XI MPLB 1', 'XII MPLB 1',
  'X BD 1', 'XI BD 1', 'XII BD 1',
];

export interface SupabaseRuntimeConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  configured: boolean;
  hasServiceRole: boolean;
  hasDbUrl?: boolean;
}
