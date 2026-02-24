import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import { DisabledAccountScreen } from "@/components/DisabledAccountScreen";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import AdminRegister from "@/pages/AdminRegister";
import Dashboard from "@/pages/Dashboard";
import NewTransaction from "@/pages/NewTransaction";
import TotalRecords from "@/pages/TotalRecords";
import GoldRecords from "@/pages/GoldRecords";
import SilverRecords from "@/pages/SilverRecords";
import Reminders from "@/pages/Reminders";
import AdminPanel from "@/pages/AdminPanel";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, isDisabled, isAdmin } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (isDisabled && !isAdmin) return <DisabledAccountScreen />;
  return <AppLayout>{children}</AppLayout>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading...</div>;
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function AdminRedirect({ children }: { children: React.ReactNode }) {
  const { isAdmin } = useAuth();
  if (isAdmin) return <Navigate to="/admin" replace />;
  return <>{children}</>;
}

const AppRoutes = () => (
  <Routes>
    <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
    <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
    <Route path="/admin-register" element={<PublicRoute><AdminRegister /></PublicRoute>} />
    <Route path="/" element={<ProtectedRoute><AdminRedirect><Dashboard /></AdminRedirect></ProtectedRoute>} />
    <Route path="/new-transaction" element={<ProtectedRoute><NewTransaction /></ProtectedRoute>} />
    <Route path="/records" element={<ProtectedRoute><TotalRecords /></ProtectedRoute>} />
    <Route path="/gold-records" element={<ProtectedRoute><GoldRecords /></ProtectedRoute>} />
    <Route path="/silver-records" element={<ProtectedRoute><SilverRecords /></ProtectedRoute>} />
    <Route path="/reminders" element={<ProtectedRoute><Reminders /></ProtectedRoute>} />
    <Route path="/admin" element={<ProtectedRoute><AdminPanel /></ProtectedRoute>} />
    <Route path="*" element={<NotFound />} />
  </Routes>
);

const App = () => (
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
);

export default App;
