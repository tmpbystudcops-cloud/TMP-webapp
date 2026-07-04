import { useState, useEffect, useRef } from 'react';
import AdminPage from './components/AdminPage';
import { Toaster, showToast } from './components/ui/Toast';
import { supabase } from './lib/supabase';
import { useFocusTrap } from './lib/useFocusTrap';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [checking, setChecking] = useState(true);

  const loginRef = useRef<HTMLDivElement>(null);
  useFocusTrap(loginRef, !isAuthenticated && !checking);

  useEffect(() => {
    if (localStorage.getItem('admin_authenticated') === 'true') {
      setIsAuthenticated(true);
    }
    setChecking(false);
  }, []);

  const handleLogin = async () => {
    try {
      const { data } = await supabase
        .from('settings')
        .select('admin_password')
        .limit(1)
        .maybeSingle();

      if (data?.admin_password && password.trim() === data.admin_password) {
        localStorage.setItem('admin_authenticated', 'true');
        localStorage.setItem('admin_password', data.admin_password);
        setIsAuthenticated(true);
        setPassword('');
        return;
      }
    } catch (error) {
      console.error('Login error:', error);
    }

    showToast('Incorrect password', 'error');
    setPassword('');
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('admin_authenticated');
    localStorage.removeItem('admin_password');
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full border-2 border-slate-600 border-t-amber-500 w-8 h-8" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <Toaster />
        <div ref={loginRef} className="bg-slate-800 rounded-xl p-8 w-full max-w-sm shadow-2xl" role="main">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-white mb-1">Admin Dashboard</h1>
            <p className="text-slate-400 text-sm">Enter your password to continue</p>
          </div>
          <label htmlFor="admin-password" className="sr-only">Admin password</label>
          <input
            id="admin-password"
            type="password"
            placeholder="Admin password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            className="w-full p-3 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-amber-500 focus:outline-none mb-4"
            autoFocus
          />
          <button
            onClick={handleLogin}
            className="w-full bg-amber-600 text-white py-3 rounded-lg hover:bg-amber-700 transition-colors font-semibold"
          >
            Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <Toaster />
      <nav className="bg-slate-900 border-b border-slate-700 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14">
            <span className="text-lg font-bold text-amber-400">Admin Dashboard</span>
            <button
              onClick={handleLogout}
              className="text-red-400 hover:text-red-300 transition-colors text-sm font-medium"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>
      <AdminPage />
    </div>
  );
}

export default App;
