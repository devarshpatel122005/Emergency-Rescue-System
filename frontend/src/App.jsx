import { useEffect, useMemo, useState } from 'react';
import './i18n';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import VictimHome from './pages/VictimHome';
import Login from './pages/Login';
import Register from './pages/Register';
import RescuerRegister from './pages/RescuerRegister';
import CompleteProfile from './pages/CompleteProfile';
import Profile from './pages/Profile';
import AdminDashboard from './pages/AdminDashboard';
import RescuerPanel from './pages/RescuerPanel';
import RescuerAR from './pages/RescuerAR';
import Analytics from './pages/Analytics';
import RescuerVerification from './pages/RescuerVerification';
import { getStoredToken, getStoredUser, logout } from './services/authService';
import { connectSocket, disconnectSocket } from './services/socket';
import UserProfile from './components/UserProfile';
import InstallPrompt from './components/InstallPrompt';

function ProtectedRoute({ user, allowedRoles, children }) {
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}

function RequireProfileComplete({ user, children }) {
  if (user && !user.profileComplete) {
    return <Navigate to="/complete-profile" replace />;
  }
  return children;
}

function defaultRoute(user) {
  if (!user) {
    return '/';
  }

  if (!user.profileComplete) {
    return '/complete-profile';
  }

  if (user.role === 'admin') {
    return '/admin';
  }
  if (user.role === 'rescuer') {
    return '/rescuer';
  }

  return '/';
}

function App() {
  const [user, setUser] = useState(getStoredUser());

  useEffect(() => {
    const token = getStoredToken();
    connectSocket(token || undefined);

    return () => {
      disconnectSocket();
    };
  }, []);

  useEffect(() => {
    const token = getStoredToken();
    connectSocket(token || undefined);
  }, [user]);

  const onAuth = (nextUser) => {
    setUser(nextUser);
  };

  const signOut = () => {
    logout();
    setUser(null);
    disconnectSocket();
    connectSocket(undefined);
  };

  const initialPath = useMemo(() => defaultRoute(user), [user]);

  return (
    <BrowserRouter>
      {/* PWA Install Prompt — shown automatically when browser fires beforeinstallprompt */}
      <InstallPrompt />

      {user && user.role !== 'admin' ? (
        <div className="fixed right-4 top-4 z-[999]">
          <UserProfile user={user} onLogout={signOut} />
        </div>
      ) : null}

      <Routes>
        <Route path="/" element={<VictimHome user={user} />} />
        <Route path="/login" element={<Login onAuth={onAuth} />} />
        <Route path="/register" element={<Register onAuth={onAuth} />} />
        <Route path="/rescuer-register" element={<RescuerRegister />} />

        <Route
          path="/complete-profile"
          element={
            <ProtectedRoute user={user}>
              <CompleteProfile onAuth={onAuth} />
            </ProtectedRoute>
          }
        />

        <Route
          path="/profile"
          element={
            <ProtectedRoute user={user} allowedRoles={['victim', 'rescuer']}>
              <RequireProfileComplete user={user}>
                <Profile user={user} onAuth={onAuth} />
              </RequireProfileComplete>
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin"
          element={
            <ProtectedRoute user={user} allowedRoles={['admin']}>
              <RequireProfileComplete user={user}>
                <AdminDashboard user={user} onLogout={signOut} />
              </RequireProfileComplete>
            </ProtectedRoute>
          }
        />

        <Route
          path="/rescuer"
          element={
            <ProtectedRoute user={user} allowedRoles={['rescuer']}>
              <RequireProfileComplete user={user}>
                <RescuerPanel user={user} onLogout={signOut} />
              </RequireProfileComplete>
            </ProtectedRoute>
          }
        />

        <Route
          path="/rescuer/ar"
          element={
            <ProtectedRoute user={user} allowedRoles={['rescuer']}>
              <RequireProfileComplete user={user}>
                <RescuerAR user={user} onLogout={signOut} />
              </RequireProfileComplete>
            </ProtectedRoute>
          }
        />

        <Route
          path="/analytics"
          element={
            <ProtectedRoute user={user} allowedRoles={['admin']}>
              <RequireProfileComplete user={user}>
                <Analytics user={user} onLogout={signOut} />
              </RequireProfileComplete>
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/rescuer-verification"
          element={
            <ProtectedRoute user={user} allowedRoles={['admin']}>
              <RequireProfileComplete user={user}>
                <RescuerVerification onLogout={signOut} />
              </RequireProfileComplete>
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to={initialPath} replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
