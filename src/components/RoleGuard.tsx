import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { UserRole } from '../types';

interface RoleGuardProps {
  allowedRoles: UserRole[];
  children: React.ReactNode;
}

export function RoleGuard({ allowedRoles, children }: RoleGuardProps) {
  const { profile, loading } = useAuth();

  if (loading) return null;

  const currentRole: UserRole = profile?.role || 'tenaga_kependidikan';
  if (!allowedRoles.includes(currentRole)) {
    return <Navigate to="/app/dashboard" replace />;
  }

  return <>{children}</>;
}
