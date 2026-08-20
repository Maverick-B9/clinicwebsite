import React, { useEffect } from 'react';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'sonner';

import { useAuthStore } from '../store/auth.store';
import { initAuthListener } from '../lib/auth';

import { AppShell } from './components/layout/AppShell';

import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { PatientsPage } from './pages/PatientsPage';
import { NewPatientPage } from './pages/NewPatientPage';
import { PatientProfilePage } from './pages/PatientProfilePage';
import { NewVisitPage } from './pages/NewVisitPage';
import { VisitDetailPage } from './pages/VisitDetailPage';
import { AppointmentsPage } from './pages/AppointmentsPage';
import { BillingPage } from './pages/BillingPage';
import { MedicinesPage } from './pages/MedicinesPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';

const queryClient = new QueryClient();

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuthStore();
  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: '#F6F4F0' }}>
        <span style={{ fontSize: 13, color: '#9E9688', fontFamily: 'Inter, sans-serif' }}>Loading…</span>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />
  },
  {
    path: '/',
    element: <AuthGuard><AppShell /></AuthGuard>,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'patients', element: <PatientsPage /> },
      { path: 'patients/new', element: <NewPatientPage /> },
      { path: 'patients/:patientId', element: <PatientProfilePage /> },
      { path: 'patients/:patientId/visits/new', element: <NewVisitPage /> },
      { path: 'patients/:patientId/visits/:visitId', element: <VisitDetailPage /> },
      { path: 'appointments', element: <AppointmentsPage /> },
      { path: 'billing', element: <BillingPage /> },
      { path: 'medicines', element: <MedicinesPage /> },
      { path: 'reports', element: <ReportsPage /> },
      { path: 'settings', element: <SettingsPage /> },
    ]
  }
]);

export default function App() {
  useEffect(() => {
    const unsubscribe = initAuthListener();
    return () => unsubscribe();
  }, []);

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
        <Toaster position="top-right" />
      </QueryClientProvider>
    </ThemeProvider>
  );
}
