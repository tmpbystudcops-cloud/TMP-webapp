import { useState, useEffect } from 'react';
import HomePage from './components/HomePage';
import TrackOrderPage from './components/TrackOrderPage';
import { Toaster } from './components/ui/Toast';
import { supabase } from './lib/supabase';

type Page = 'home' | 'track';

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [shopName, setShopName] = useState<string | null>(null);

  useEffect(() => {
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
          Smoking is injurious to health and is STRICTLY PROHIBITED in campus!{' '}
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
            </div>
          </div>
        </div>
      </nav>

      <main id="main-content">
        {currentPage === 'home' && <HomePage />}
        {currentPage === 'track' && <TrackOrderPage />}
      </main>
    </div>
  );
}

export default App;
