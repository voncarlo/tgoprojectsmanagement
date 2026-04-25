import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import AppLayout from "./layout/AppLayout";
import { AuthProvider } from "./auth/AuthContext";
import { DataProvider } from "./store/DataContext";
import { ThemeProvider } from "./hooks/use-theme";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Tasks from "./pages/Tasks";
import Projects from "./pages/Projects";
import Reports from "./pages/Reports";
import Teams from "./pages/Teams";
import Settings from "./pages/Settings";
import Users from "./pages/Users";
import NotFound from "./pages/NotFound";
import Calendar from "./pages/Calendar";
import Workload from "./pages/Workload";
import Documents from "./pages/Documents";
import Notifications from "./pages/Notifications";
import ActivityLogs from "./pages/ActivityLogs";
import Approvals from "./pages/Approvals";
import Automations from "./pages/Automations";
import Admin from "./pages/Admin";
import RecycleBin from "./pages/RecycleBin";
import Chat from "./pages/Chat";
import Notes from "./pages/Notes";
import Dispatch from "./pages/departments/Dispatch";
import Recruitment from "./pages/departments/Recruitment";
import Sales from "./pages/departments/Sales";
import Payroll from "./pages/departments/Payroll";
import Bookkeeping from "./pages/departments/Bookkeeping";
import Clients from "./pages/departments/Clients";
import { useAuth } from "./auth/AuthContext";

const queryClient = new QueryClient();

const ProtectedApp = () => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <AppLayout /> : <Navigate to="/login" replace />;
};

const LoginRoute = () => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />;
};

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <DataProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <Routes>
                  <Route path="/" element={<Navigate to="/login" replace />} />
                  <Route path="/login" element={<LoginRoute />} />
                  <Route element={<ProtectedApp />}>
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/tasks" element={<Tasks />} />
                    <Route path="/projects" element={<Projects />} />
                    <Route path="/calendar" element={<Calendar />} />
                    <Route path="/workload" element={<Workload />} />
                    <Route path="/reports" element={<Reports />} />
                    <Route path="/documents" element={<Documents />} />
                    <Route path="/notifications" element={<Notifications />} />
                    <Route path="/chat" element={<Chat />} />
                    <Route path="/notes" element={<Notes />} />
                    <Route path="/activity" element={<ActivityLogs />} />
                    <Route path="/approvals" element={<Approvals />} />
                    <Route path="/automations" element={<Automations />} />
                    <Route path="/dispatch" element={<Dispatch />} />
                    <Route path="/recruitment" element={<Recruitment />} />
                    <Route path="/sales" element={<Sales />} />
                    <Route path="/payroll" element={<Payroll />} />
                    <Route path="/bookkeeping" element={<Bookkeeping />} />
                    <Route path="/clients" element={<Clients />} />
                    <Route path="/teams" element={<Teams />} />
                    <Route path="/users" element={<Users />} />
                    <Route path="/recycle-bin" element={<RecycleBin />} />
                    <Route path="/admin" element={<Admin />} />
                    <Route path="/settings" element={<Settings />} />
                  </Route>
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </BrowserRouter>
            </TooltipProvider>
          </DataProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
