import { Outlet } from 'react-router-dom';
import { useCustomAuth } from '@/lib/CustomAuthContext';

const DefaultFallback = () => (
  <div className="fixed inset-0 flex items-center justify-center">
    <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
  </div>
);

export default function ProtectedRoute({ fallback = <DefaultFallback />, unauthenticatedElement }) {
  const { loading, isAuthenticated } = useCustomAuth();
  if (loading) return fallback;
  if (!isAuthenticated) return unauthenticatedElement;
  return <Outlet />;
}
