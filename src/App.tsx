import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import { DisabledAccountScreen } from "@/components/DisabledAccountScreen";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import type { ModuleKey } from "@/lib/permissions";


// Route-level code splitting: each page ships in its own chunk so first paint
// is bounded by the login screen only, and heavy screens (records, admin,
// reminders) load on demand. This meaningfully reduces initial JS on slow
// mobile networks.
const Login = lazy(() => import("@/pages/Login"));
const Register = lazy(() => import("@/pages/Register"));
const AdminRegister = lazy(() => import("@/pages/AdminRegister"));
const ForgotPassword = lazy(() => import("@/pages/ForgotPassword"));
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const NewTransaction = lazy(() => import("@/pages/NewTransaction"));
const TotalRecords = lazy(() => import("@/pages/TotalRecords"));
const GoldRecords = lazy(() => import("@/pages/GoldRecords"));
const SilverRecords = lazy(() => import("@/pages/SilverRecords"));
const CombinationRecords = lazy(() => import("@/pages/CombinationRecords"));
const Reminders = lazy(() => import("@/pages/Reminders"));
const AdminPanel = lazy(() => import("@/pages/AdminPanel"));
const SettingsPage = lazy(() => import("@/pages/Settings"));
const CustomerProfile = lazy(() => import("@/pages/CustomerProfile"));
const NotFound = lazy(() => import("@/pages/NotFound"));


// Tuned defaults for production:
// - staleTime 60s: cuts redundant refetches while navigating between records pages.
// - gcTime 5m: keeps hot data around during typical shop-owner sessions.
// - retry: exponential backoff with 2 retries for transient network errors,
//   but skip retries on 4xx (client errors won't succeed on retry).
// - refetchOnWindowFocus off: shop owners tab out constantly; avoid thrash.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: (failureCount, error: unknown) => {
        const status = (error as { status?: number })?.status;
        if (status && status >= 400 && status < 500) return false;
        return failureCount < 2;
      },
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
    },
    mutations: {
      retry: (failureCount, error: unknown) => {
        const status = (error as { status?: number })?.status;
        if (status && status >= 400 && status < 500) return false;
        return failureCount < 1;
      },
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 4000),
    },
  },
});

const RouteFallback = () => (
  <div className="min-h-[40vh] flex items-center justify-center text-muted-foreground">Loading…</div>
);

function ProtectedRoute({ children, module }: { children: React.ReactNode; module?: ModuleKey }) {
  const { user, loading, isDisabled, isAdmin, can } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (isDisabled && !isAdmin) return <DisabledAccountScreen />;
  // Child (staff) logins can only open modules their parent granted.
  if (module && !can(module)) return <AppLayout><NoAccess /></AppLayout>;
  return <AppLayout>{children}</AppLayout>;
}

const NoAccess = () => (
  <div className="min-h-[40vh] flex flex-col items-center justify-center gap-2 text-center">
    <h1 className="text-xl font-semibold text-primary">Access Restricted</h1>
    <p className="text-muted-foreground text-sm">You do not have permission to view this page. Please contact your shop owner.</p>
  </div>
);


function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading...</div>;
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function AdminRedirect({ children }: { children: React.ReactNode }) {
  const { isAdmin } = useAuth();
  if (isAdmin) {
    return <Navigate to="/admin" replace />;
  }
  return <>{children}</>;
}

const AppRoutes = () => (
  <Suspense fallback={<RouteFallback />}>
    <Routes>
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
      <Route path="/admin-register" element={<PublicRoute><AdminRegister /></PublicRoute>} />
      <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
      <Route path="/" element={<ProtectedRoute><AdminRedirect><Dashboard /></AdminRedirect></ProtectedRoute>} />
      <Route path="/new-transaction" element={<ProtectedRoute><NewTransaction /></ProtectedRoute>} />
      <Route path="/records" element={<ProtectedRoute><TotalRecords /></ProtectedRoute>} />
      <Route path="/gold-records" element={<ProtectedRoute><GoldRecords /></ProtectedRoute>} />
      <Route path="/silver-records" element={<ProtectedRoute><SilverRecords /></ProtectedRoute>} />
      <Route path="/combination-records" element={<ProtectedRoute><CombinationRecords /></ProtectedRoute>} />
      <Route path="/reminders" element={<ProtectedRoute><Reminders /></ProtectedRoute>} />
      <Route path="/admin" element={<ProtectedRoute><AdminPanel /></ProtectedRoute>} />
      <Route path="/customer/:id" element={<ProtectedRoute><CustomerProfile /></ProtectedRoute>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  </Suspense>
);

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
