/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import AppLayout from './components/AppLayout';
import { RoleGuard } from './components/RoleGuard';
import DashboardPage from './pages/app/DashboardPage';
import EmployeeAttendancePage from './pages/app/EmployeeAttendancePage';
import StudentAttendancePage from './pages/app/StudentAttendancePage';
import EmployeeRecapPage from './pages/app/EmployeeRecapPage';
import StudentRecapPage from './pages/app/StudentRecapPage';
import StudentsDataPage from './pages/app/StudentsDataPage';
import UserManagementPage from './pages/app/UserManagementPage';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />

          <Route path="/app" element={<AppLayout />}>
            <Route index element={<Navigate to="/app/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="absensi-karyawan" element={<EmployeeAttendancePage />} />

            <Route
              path="absensi-siswa"
              element={
                <RoleGuard allowedRoles={['admin', 'guru']}>
                  <StudentAttendancePage />
                </RoleGuard>
              }
            />
            <Route
              path="absensi-siswa/:kelas"
              element={
                <RoleGuard allowedRoles={['admin', 'guru']}>
                  <StudentAttendancePage />
                </RoleGuard>
              }
            />

            <Route
              path="rekap/karyawan"
              element={
                <RoleGuard allowedRoles={['admin']}>
                  <EmployeeRecapPage />
                </RoleGuard>
              }
            />
            <Route
              path="rekap/siswa"
              element={
                <RoleGuard allowedRoles={['admin', 'guru']}>
                  <StudentRecapPage />
                </RoleGuard>
              }
            />
            <Route
              path="rekap/siswa/:kelas"
              element={
                <RoleGuard allowedRoles={['admin', 'guru']}>
                  <StudentRecapPage />
                </RoleGuard>
              }
            />

            <Route
              path="data-siswa"
              element={
                <RoleGuard allowedRoles={['admin']}>
                  <StudentsDataPage />
                </RoleGuard>
              }
            />
            <Route
              path="data-siswa/:kelas"
              element={
                <RoleGuard allowedRoles={['admin']}>
                  <StudentsDataPage />
                </RoleGuard>
              }
            />

            <Route
              path="user-management"
              element={
                <RoleGuard allowedRoles={['admin']}>
                  <UserManagementPage />
                </RoleGuard>
              }
            />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
