import { useState, useEffect, useRef } from 'react';
import HomePage from './components/HomePage';
import TrackOrderPage from './components/TrackOrderPage';
import AdminPage from './components/AdminPage';
import { Toaster, showToast } from './components/ui/Toast';
import { supabase } from './lib/supabase';
import { useFocusTrap } from './lib/useFocusTrap';

type Page = 'home' | 'admin' | 'track';

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [shopName, setShopName] = useState<string | null>(null);

  const loginModalRef = useRef<HTMLDivElement>(null);
  useFocusTrap(loginModalRef, showAdminLogin);

  useEffect(() => {
    if (localStorage.getItem('admin_authenticated') === 'true') {
      setIsAdminAuthenticated(true);
    }
    fetchShopName();
  }, []);

  const fetchShopName = async () => {
    try {
      const { data } = await supabase
        .from('settings')
        .select('shop_name')
        .limit(1)
        .maybeSingle();
      if (data?.shop_name) setShopName(data.shop_name);
    } catch (error) {
      console.error('Error fetching shop name:', error);
    }
  };

  const handleAdminLogin = async () => {
    try {
      const { data } = await supabase
        .from('settings')
        .select('admin_password')
        .limit(1)
        .maybeSingle();

      if (data?.admin_password && adminPassword.trim() === data.admin_password) {
        setIsAdminAuthenticated(true);
        localStorage.setItem('admin_authenticated', 'true');
        localStorage.setItem('admin_password', data.admin_password);
        setCurrentPage('admin');
        setShowAdminLogin(false);
        setAdminPassword('');
        return;
      }
    } catch (error) {
      console.error('Error fetching password from database:', error);
    }

    showToast('Incorrect admin password', 'error');
    setAdminPassword('');
  };

  const handleAdminLogout = () => {
    setIsAdminAuthenticated(false);
    localStorage.removeItem('admin_authenticated');
    localStorage.removeItem('admin_password');
    setCurrentPage('home');
    setAdminPassword('');
  };

  const navigateToAdmin = () => {
    if (isAdminAuthenticated) {
      setCurrentPage('admin');
    } else {
      setShowAdminLogin(true);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950">
      <Toaster />

      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[60] focus:bg-amber-600 focus:text-white focus:px-4 focus:py-2 focus:rounded-lg"
      >
        Skip to main content
      </a>

      <div className="bg-red-700 text-white py-2 px-4 text-sm font-medium relative z-50">
        <div className="max-w-7xl mx-auto text-center">
          ⚠️ Smoking is injurious to health and is STRICTLY PROHIBITED in campus!{' '}
          <a
            href="https://ntcp.mohfw.gov.in/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-yellow-200 hover:text-yellow-100 underline font-semibold transition-colors"
          >
            Quit smoking?
          </a>
        </div>
      </div>

      <nav className="bg-slate-900 border-b border-slate-700 sticky top-0 z-40" aria-label="Main navigation">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <button
              onClick={() => setCurrentPage('home')}
              className="text-2xl font-bold text-amber-400 hover:text-amber-300 transition-colors"
            >
              {shopName || 'Shop'}
            </button>

            <div className="flex items-center gap-4">
              <button
                onClick={() => setCurrentPage('home')}
                className="text-slate-300 hover:text-white transition-colors text-sm"
              >
                Home
              </button>

              <button
                onClick={() => setCurrentPage('track')}
                className="text-slate-300 hover:text-white transition-colors text-sm"
              >
                Track Order
              </button>

              <button
                onClick={navigateToAdmin}
                className="text-slate-300 hover:text-white transition-colors text-sm"
              >
                Admin
              </button>

              {isAdminAuthenticated && currentPage === 'admin' && (
                <button
                  onClick={handleAdminLogout}
                  className="text-red-500 hover:text-red-400 transition-colors text-sm"
                >
                  Logout
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {showAdminLogin && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div ref={loginModalRef} className="bg-slate-800 p-6 rounded-lg w-full max-w-md" role="dialog" aria-modal="true" aria-labelledby="admin-login-title">
            <h2 id="admin-login-title" className="text-xl font-bold text-white mb-4">Admin Login</h2>
            <label htmlFor="admin-password-input" className="sr-only">Admin password</label>
            <input
              id="admin-password-input"
              type="password"
              placeholder="Enter admin password"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              className="w-full p-3 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-amber-500 focus:outline-none"
              onKeyDown={(e) => e.key === 'Enter' && handleAdminLogin()}
            />
            <div className="flex gap-2 mt-4">
              <button
                onClick={handleAdminLogin}
                className="flex-1 bg-amber-600 text-white py-2 rounded-lg hover:bg-amber-700 transition-colors"
              >
                Login
              </button>
              <button
                onClick={() => setShowAdminLogin(false)}
                className="flex-1 bg-slate-600 text-white py-2 rounded-lg hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <main id="main-content">
        {currentPage === 'home' && <HomePage />}
        {currentPage === 'track' && <TrackOrderPage />}
        {currentPage === 'admin' && isAdminAuthenticated && <AdminPage />}
      </main>
    </div>
  );
}

export default App;
