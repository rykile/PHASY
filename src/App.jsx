import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider } from '@/lib/AuthContext';
import { CustomAuthProvider, useCustomAuth } from '@/lib/CustomAuthContext';
import ScrollToTop from './components/ScrollToTop';
import ProtectedRoute from '@/components/ProtectedRoute';
import { MemberProvider } from '@/lib/MemberContext';
import AppShell from '@/components/AppShell';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import Home from '@/pages/Home';
import Board from '@/pages/Board';
import ThreadDetail from '@/pages/ThreadDetail';
import NewThread from '@/pages/NewThread';
import Profile from '@/pages/Profile';
import MyPage from '@/pages/MyPage';
import Settings from '@/pages/Settings';
import Search from '@/pages/Search';
import News from '@/pages/News';
import NewsDetail from '@/pages/NewsDetail';
import Notifications from '@/pages/Notifications';
import AdminLayout from '@/components/AdminLayout';
import AdminDashboard from '@/pages/admin/AdminDashboard';
import AdminReports from '@/pages/admin/AdminReports';
import AdminUsers from '@/pages/admin/AdminUsers';
import AdminOfficial from '@/pages/admin/AdminOfficial';
import AdminPasswordResets from '@/pages/admin/AdminPasswordResets';
import AdminNgWords from '@/pages/admin/AdminNgWords';
import AdminMaintenance from '@/pages/admin/AdminMaintenance';
import AdminAuditLog from '@/pages/admin/AdminAuditLog';
import AdminAnnouncements from '@/pages/admin/AdminAnnouncements';

const AuthenticatedApp = () => {
  const { loading } = useCustomAuth();
  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
        <Route element={<AppShell />}>
          <Route path="/" element={<Home />} />
          <Route path="/board" element={<Board />} />
          <Route path="/thread/new" element={<NewThread />} />
          <Route path="/thread/:id" element={<ThreadDetail />} />
          <Route path="/news" element={<News />} />
          <Route path="/news/:id" element={<NewsDetail />} />
          <Route path="/u/:username" element={<Profile />} />
          <Route path="/mypage" element={<MyPage />} />
          <Route path="/mypage/settings" element={<Settings />} />
          <Route path="/search" element={<Search />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="reports" element={<AdminReports />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="official" element={<AdminOfficial />} />
            <Route path="password-resets" element={<AdminPasswordResets />} />
            <Route path="ngwords" element={<AdminNgWords />} />
            <Route path="maintenance" element={<AdminMaintenance />} />
            <Route path="audit" element={<AdminAuditLog />} />
            <Route path="announcements" element={<AdminAnnouncements />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <CustomAuthProvider>
        <MemberProvider>
          <QueryClientProvider client={queryClientInstance}>
            <Router>
              <ScrollToTop />
              <AuthenticatedApp />
            </Router>
            <Toaster />
          </QueryClientProvider>
        </MemberProvider>
      </CustomAuthProvider>
    </AuthProvider>
  )
}

export default App
