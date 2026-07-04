import { useState, useEffect, useRef } from 'react';
import { supabase, Product, Order } from '../lib/supabase';
import {
  getCachedProducts, setCachedProducts, invalidateProductsCache,
  getCachedSettings, setCachedSettings, invalidateSettingsCache,
} from '../lib/cache';
import { useFocusTrap } from '../lib/useFocusTrap';
import { Plus, Pencil, Trash2, Package, Users, DollarSign, Settings, Eye, EyeOff, ShoppingBag, PowerOff, CreditCard } from 'lucide-react';
import { showToast } from './ui/Toast';
import { LoadingSpinner, LoadingSkeleton, OrderCardSkeleton, TableRowSkeleton } from './ui/LoadingSpinner';

const ADMIN_ACTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-action`;
const ORDERS_PAGE_SIZE = 20;
const LOW_STOCK_THRESHOLD = 3;

interface TopSpender {
  whatsapp: string;
  name: string;
  total: number;
}

async function adminAction(action: string, password: string, payload: Record<string, unknown>): Promise<void> {
  const res = await fetch(ADMIN_ACTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ action, password, payload }),
  });
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error || 'Request failed');
}

const AdminPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'products' | 'orders' | 'settings'>('products');
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [sortBy, setSortBy] = useState<'latest' | 'mobile' | 'pending'>('latest');
  const [loading, setLoading] = useState(false);

  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productForm, setProductForm] = useState({
    name: '',
    price: '',
    stock: '',
    available: true
  });

  const [settings, setSettings] = useState({
    shop_name: '',
    upi_id: '',
    tagline: '',
    admin_password: '',
    enable_quick_pay: true,
    orders_enabled: true
  });
  const [togglingOrders, setTogglingOrders] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null);
  const [productsLoading, setProductsLoading] = useState(true);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [topSpender, setTopSpender] = useState<TopSpender | null>(null);
  const [ordersVisibleCount, setOrdersVisibleCount] = useState(ORDERS_PAGE_SIZE);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMoreOrders, setHasMoreOrders] = useState(true);

  const deleteModalRef = useRef<HTMLDivElement>(null);
  useFocusTrap(deleteModalRef, showDeleteConfirm !== null);

  useEffect(() => {
    fetchProducts();
    fetchOrders();
    fetchSettings();
    fetchTopSpender();

    const ordersChannel = supabase
      .channel('orders_channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders'
        },
        (payload) => {
          const newOrder = payload.new as Order;
          setOrders(prev => [newOrder, ...prev]);
          setStatsLoading(false);
          showToast(`New order received: #${newOrder.unique_order_id || newOrder.id}`, 'info');
          fetchTopSpender();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders'
        },
        (payload) => {
          const updated = payload.new as Order;
          setOrders(prev => prev.map(o => o.id === updated.id ? updated : o));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ordersChannel);
    };
  }, []);

  const fetchProducts = async () => {
    const cached = getCachedProducts();
    if (cached) {
      setProducts(cached);
      setProductsLoading(false);
      return;
    }
    setProductsLoading(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('id');

      if (error) throw error;
      const productsData = data || [];
      setProducts(productsData);
      setCachedProducts(productsData);
    } catch (error) {
      console.error('Error fetching products:', error);
      showToast('Error loading products', 'error');
    } finally {
      setProductsLoading(false);
    }
  };

  const fetchOrders = async () => {
    setOrdersLoading(true);
    setOrdersVisibleCount(ORDERS_PAGE_SIZE);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(ORDERS_PAGE_SIZE * 2);

      if (error) throw error;
      const ordersData = data || [];
      setOrders(ordersData);
      setHasMoreOrders(ordersData.length === ORDERS_PAGE_SIZE * 2);
    } catch (error) {
      console.error('Error fetching orders:', error);
      showToast('Error loading orders', 'error');
    } finally {
      setOrdersLoading(false);
      setStatsLoading(false);
    }
  };

  const loadMoreOrders = async () => {
    if (loadingMore || !hasMoreOrders) return;
    setLoadingMore(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })
        .range(orders.length, orders.length + ORDERS_PAGE_SIZE - 1);

      if (error) throw error;
      const moreOrders = data || [];
      setOrders(prev => [...prev, ...moreOrders]);
      setOrdersVisibleCount(prev => prev + ORDERS_PAGE_SIZE);
      setHasMoreOrders(moreOrders.length === ORDERS_PAGE_SIZE);
    } catch (error) {
      console.error('Error loading more orders:', error);
      showToast('Error loading more orders', 'error');
    } finally {
      setLoadingMore(false);
    }
  };

  const fetchTopSpender = async () => {
    try {
      const { data, error } = await supabase
        .from('top_spender')
        .select('whatsapp, name, total')
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      setTopSpender(data as TopSpender | null);
    } catch (error) {
      console.error('Error fetching top spender:', error);
      setTopSpender(null);
    }
  };

  const fetchSettings = async () => {
    const cached = getCachedSettings<typeof settings>();
    if (cached) {
      setSettings(cached);
      setSettingsLoading(false);
      return;
    }
    setSettingsLoading(true);
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('shop_name, upi_id, tagline, enable_quick_pay, admin_password, orders_enabled')
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        const settingsData = {
          shop_name: data.shop_name || '',
          upi_id: data.upi_id || '',
          tagline: data.tagline || '',
          admin_password: data.admin_password || localStorage.getItem('admin_password') || '',
          enable_quick_pay: data.enable_quick_pay !== false,
          orders_enabled: data.orders_enabled !== false
        };
        setSettings(settingsData);
        setCachedSettings(settingsData);

        if (data.admin_password) {
          localStorage.setItem('admin_password', data.admin_password);
        }
      } else {
        const fallback = {
          shop_name: '',
          upi_id: '',
          tagline: '',
          admin_password: localStorage.getItem('admin_password') || '',
          enable_quick_pay: true,
          orders_enabled: true
        };
        setSettings(fallback);
        setCachedSettings(fallback);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      showToast('Error loading settings', 'error');
    } finally {
      setSettingsLoading(false);
    }
  };

  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productForm.name || !productForm.price || !productForm.stock) {
      showToast('Please fill all required fields', 'error');
      return;
    }

    setLoading(true);
    try {
      const password = localStorage.getItem('admin_password') || '';
      const productData = {
        name: productForm.name,
        price: parseFloat(productForm.price),
        stock: parseInt(productForm.stock),
        available: productForm.available
      };

      if (editingProduct) {
        await adminAction('update_product', password, { id: editingProduct.id, ...productData });
        showToast('Product updated successfully', 'success');
      } else {
        await adminAction('insert_product', password, productData);
        showToast('Product added successfully', 'success');
      }

      setProductForm({ name: '', price: '', stock: '', available: true });
      setEditingProduct(null);
      setShowProductForm(false);
      invalidateProductsCache();
      fetchProducts();
    } catch (error) {
      console.error('Error saving product:', error);
      showToast('Error saving product', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProduct = (id: number) => {
    setShowDeleteConfirm(id);
  };

  const confirmDeleteProduct = async (id: number) => {
    setShowDeleteConfirm(null);

    try {
      const password = localStorage.getItem('admin_password') || '';
      await adminAction('delete_product', password, { id });
      showToast('Product deleted successfully', 'success');
      invalidateProductsCache();
      fetchProducts();
    } catch (error) {
      console.error('Error deleting product:', error);
      showToast('Error deleting product', 'error');
    }
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setProductForm({
      name: product.name,
      price: product.price.toString(),
      stock: product.stock.toString(),
      available: product.available
    });
    setShowProductForm(true);
  };

  const handleOrderStatusUpdate = async (orderId: number, newStatus: 'Pending' | 'Ready' | 'Picked Up') => {
    try {
      const password = localStorage.getItem('admin_password') || '';
      await adminAction('update_order_status', password, { id: orderId, status: newStatus });
      showToast('Order status updated successfully', 'success');
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
    } catch (error) {
      console.error('Error updating order status:', error);
      showToast('Error updating order status', 'error');
    }
  };

  const handleToggleOrders = async () => {
    setTogglingOrders(true);
    const newValue = !settings.orders_enabled;

    try {
      const password = localStorage.getItem('admin_password') || '';
      const { data: existingSettings, error: fetchError } = await supabase
        .from('settings')
        .select('id')
        .limit(1)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (existingSettings) {
        await adminAction('toggle_orders', password, { id: existingSettings.id, orders_enabled: newValue });
      } else {
        await adminAction('toggle_orders_insert', password, { orders_enabled: newValue });
      }

      setSettings(prev => {
        const updated = { ...prev, orders_enabled: newValue };
        invalidateSettingsCache();
        setCachedSettings(updated);
        return updated;
      });
      showToast(newValue ? 'Shop is now OPEN — orders accepted' : 'Shop is now CLOSED — orders paused', newValue ? 'success' : 'info');
    } catch (error) {
      console.error('Error toggling orders:', error);
      showToast('Failed to update shop status', 'error');
    } finally {
      setTogglingOrders(false);
    }
  };

  const handleSettingsUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const password = localStorage.getItem('admin_password') || '';
      const { data: existingSettings, error: fetchError } = await supabase
        .from('settings')
        .select('id')
        .limit(1)
        .maybeSingle();

      if (fetchError) throw fetchError;

      const settingsData = {
        shop_name: settings.shop_name,
        upi_id: settings.upi_id,
        tagline: settings.tagline,
        enable_quick_pay: settings.enable_quick_pay
      };

      if (!existingSettings) {
        await adminAction('insert_settings', password, settingsData);
      } else {
        await adminAction('update_settings', password, { id: existingSettings.id, ...settingsData });
      }

      invalidateSettingsCache();
      setCachedSettings({ ...settings, ...settingsData });
      showToast('Settings updated successfully', 'success');
    } catch (error) {
      console.error('Error updating settings:', error);
      showToast('Error updating settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newPassword || !confirmPassword) {
      showToast('Please fill all password fields', 'error');
      return;
    }

    if (newPassword !== confirmPassword) {
      showToast('New passwords do not match', 'error');
      return;
    }

    if (newPassword.length < 6) {
      showToast('Password must be at least 6 characters long', 'error');
      return;
    }

    try {
      const password = localStorage.getItem('admin_password') || '';
      const { data: existingSettings, error: fetchError } = await supabase
        .from('settings')
        .select('id')
        .limit(1)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (!existingSettings) {
        await adminAction('change_password_insert', password, {
          upi_id: settings.upi_id || '',
          tagline: settings.tagline || '',
          enable_quick_pay: settings.enable_quick_pay,
          admin_password: newPassword
        });
      } else {
        await adminAction('change_password', password, { id: existingSettings.id, new_password: newPassword });
      }

      localStorage.setItem('admin_password', newPassword);

      setSettings(prev => {
        const updated = { ...prev, admin_password: newPassword };
        invalidateSettingsCache();
        setCachedSettings(updated);
        return updated;
      });

      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordForm(false);

      showToast('Password changed successfully! Please remember your new password.', 'success');
    } catch (error) {
      console.error('Error changing password:', error);
      showToast('Error changing password', 'error');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending': return 'bg-yellow-500';
      case 'Ready': return 'bg-cyan-500';
      case 'Picked Up': return 'bg-emerald-500';
      default: return 'bg-slate-500';
    }
  };

  const getTotalRevenue = () => {
    return orders
      .filter(order => order.status === 'Picked Up')
      .reduce((total, order) => total + order.total, 0);
  };

  const getTodaysRevenue = () => {
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    return orders
      .filter(order => {
        const orderDate = new Date(order.created_at);
        return order.status === 'Picked Up' && orderDate >= todayStart;
      })
      .reduce((total, order) => total + order.total, 0);
  };

  const getPendingOrders = () => {
    return orders.filter(order => order.status === 'Pending').length;
  };

  const getSortedOrders = () => {
    const sortedOrders = [...orders];

    switch (sortBy) {
      case 'mobile':
        return sortedOrders.sort((a, b) => a.whatsapp.localeCompare(b.whatsapp));
      case 'pending':
        return sortedOrders.sort((a, b) => {
          if (a.status === 'Pending' && b.status !== 'Pending') return -1;
          if (a.status !== 'Pending' && b.status === 'Pending') return 1;
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
      case 'latest':
      default:
        return sortedOrders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
  };

  const visibleOrders = getSortedOrders().slice(0, ordersVisibleCount);

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-4 bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent py-1">
            Admin Dashboard
          </h1>

          {statsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
              {[...Array(5)].map((_, index) => (
                <div key={index} className="bg-slate-800 rounded-lg p-6 animate-pulse">
                  <div className="flex items-center gap-4">
                    <LoadingSkeleton className="w-8 h-8 rounded-full" />
                    <div className="flex-1">
                      <LoadingSkeleton className="w-3/4 mb-2" />
                      <LoadingSkeleton className="w-1/2 h-8" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
              <div className="bg-slate-800 rounded-lg p-6">
                <div className="flex items-center gap-4">
                  <Package className="w-8 h-8 text-cyan-500" aria-hidden="true" />
                  <div>
                    <p className="text-slate-400 text-sm">Total Products</p>
                    <p className="text-2xl font-bold">{products.length}</p>
                  </div>
                </div>
              </div>

              <div className="bg-slate-800 rounded-lg p-6">
                <div className="flex items-center gap-4">
                  <Users className="w-8 h-8 text-yellow-500" aria-hidden="true" />
                  <div>
                    <p className="text-slate-400 text-sm">Pending Orders</p>
                    <p className="text-2xl font-bold">{getPendingOrders()}</p>
                  </div>
                </div>
              </div>

              <div className="bg-slate-800 rounded-lg p-6">
                <div className="flex items-center gap-4">
                  <DollarSign className="w-8 h-8 text-amber-500" aria-hidden="true" />
                  <div>
                    <p className="text-slate-400 text-sm">Today's Revenue</p>
                    <p className="text-2xl font-bold text-amber-400">₹{getTodaysRevenue()}</p>
                  </div>
                </div>
              </div>

              <div className="bg-slate-800 rounded-lg p-6">
                <div className="flex items-center gap-4">
                  <DollarSign className="w-8 h-8 text-emerald-500" aria-hidden="true" />
                  <div>
                    <p className="text-slate-400 text-sm">Total Revenue</p>
                    <p className="text-2xl font-bold text-emerald-400">₹{getTotalRevenue()}</p>
                  </div>
                </div>
              </div>

              <div className="bg-slate-800 rounded-lg p-6">
                <div className="flex items-center gap-4">
                  <CreditCard className="w-8 h-8 text-blue-400" aria-hidden="true" />
                  <div>
                    <p className="text-slate-400 text-sm">Top Spender</p>
                    {topSpender ? (
                      <div>
                        <a
                          href={`https://wa.me/+91${topSpender.whatsapp.replace(/^\+?91/, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-lg font-bold text-blue-400 hover:text-blue-300 transition-colors cursor-pointer"
                        >
                          +91{topSpender.whatsapp.replace(/^\+?91/, '')}
                        </a>
                        <p className="text-sm text-blue-300">₹{topSpender.total}</p>
                      </div>
                    ) : (
                      <p className="text-2xl font-bold text-slate-500">N/A</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className={`rounded-xl p-5 mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-2 transition-colors duration-300 ${
            settings.orders_enabled
              ? 'bg-emerald-950 border-emerald-600'
              : 'bg-red-950 border-red-600'
          }`}>
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                settings.orders_enabled ? 'bg-emerald-600' : 'bg-red-600'
              }`}>
                {settings.orders_enabled
                  ? <ShoppingBag className="w-6 h-6 text-white" aria-hidden="true" />
                  : <PowerOff className="w-6 h-6 text-white" aria-hidden="true" />
                }
              </div>
              <div>
                <p className="font-semibold text-white text-lg">
                  Shop is currently{' '}
                  <span className={settings.orders_enabled ? 'text-emerald-400' : 'text-red-400'}>
                    {settings.orders_enabled ? 'OPEN' : 'CLOSED'}
                  </span>
                </p>
                <p className="text-sm text-slate-400">
                  {settings.orders_enabled
                    ? 'Customers can place orders right now'
                    : 'No new orders can be placed until you reopen'}
                </p>
              </div>
            </div>
            <button
              onClick={handleToggleOrders}
              disabled={togglingOrders || settingsLoading}
              aria-pressed={settings.orders_enabled}
              className={`relative inline-flex items-center gap-3 px-6 py-3 rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 ${
                settings.orders_enabled
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
            >
              {togglingOrders ? (
                <>
                  <LoadingSpinner size="sm" />
                  Updating...
                </>
              ) : (
                <>
                  <span className="relative w-12 h-6 flex-shrink-0" aria-hidden="true">
                    <span className={`block w-12 h-6 rounded-full transition-colors duration-300 ${
                      settings.orders_enabled ? 'bg-red-400' : 'bg-emerald-400'
                    }`} />
                    <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all duration-300 ${
                      settings.orders_enabled ? 'left-7' : 'left-1'
                    }`} />
                  </span>
                  {settings.orders_enabled ? 'Close Shop' : 'Open Shop'}
                </>
              )}
            </button>
          </div>
        </div>

        <div className="flex gap-4 mb-8" role="tablist" aria-label="Admin sections">
          <button
            onClick={() => setActiveTab('products')}
            role="tab"
            aria-selected={activeTab === 'products'}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              activeTab === 'products'
                ? 'bg-amber-600 text-white'
                : 'bg-slate-800 text-slate-300 hover:text-white'
            }`}
          >
            Products
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            role="tab"
            aria-selected={activeTab === 'orders'}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              activeTab === 'orders'
                ? 'bg-amber-600 text-white'
                : 'bg-slate-800 text-slate-300 hover:text-white'
            }`}
          >
            Orders
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            role="tab"
            aria-selected={activeTab === 'settings'}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              activeTab === 'settings'
                ? 'bg-amber-600 text-white'
                : 'bg-slate-800 text-slate-300 hover:text-white'
            }`}
          >
            Settings
          </button>
        </div>

        {activeTab === 'products' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Products</h2>
              <button
                onClick={() => {
                  setEditingProduct(null);
                  setProductForm({ name: '', price: '', stock: '', available: true });
                  setShowProductForm(true);
                }}
                className="bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700 transition-colors flex items-center gap-2"
              >
                <Plus className="w-4 h-4" aria-hidden="true" />
                Add Product
              </button>
            </div>

            {showProductForm && (
              <div className="bg-slate-800 rounded-lg p-6 mb-6">
                <h3 className="text-lg font-semibold mb-4">
                  {editingProduct ? 'Edit Product' : 'Add New Product'}
                </h3>
                <form onSubmit={handleProductSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="product-name" className="block text-sm font-medium text-slate-300 mb-2">
                        Product Name *
                      </label>
                      <input
                        id="product-name"
                        type="text"
                        value={productForm.name}
                        onChange={(e) => setProductForm({...productForm, name: e.target.value})}
                        className="w-full p-3 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-amber-500 focus:outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="product-price" className="block text-sm font-medium text-slate-300 mb-2">
                        Price (₹) *
                      </label>
                      <input
                        id="product-price"
                        type="number"
                        step="1"
                        value={productForm.price}
                        onChange={(e) => setProductForm({...productForm, price: e.target.value})}
                        className="w-full p-3 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-amber-500 focus:outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="product-stock" className="block text-sm font-medium text-slate-300 mb-2">
                        Stock Quantity *
                      </label>
                      <input
                        id="product-stock"
                        type="number"
                        value={productForm.stock}
                        onChange={(e) => setProductForm({...productForm, stock: e.target.value})}
                        className="w-full p-3 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-amber-500 focus:outline-none"
                        required
                      />
                    </div>
                    <div className="flex items-center">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={productForm.available}
                          onChange={(e) => setProductForm({...productForm, available: e.target.checked})}
                          className="w-4 h-4 text-amber-600 bg-slate-700 border-slate-600 rounded focus:ring-amber-500"
                        />
                        <span className="text-slate-300">Available for sale</span>
                      </label>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={loading}
                      className="bg-amber-600 text-white px-6 py-2 rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                      {loading ? (
                        <>
                          <LoadingSpinner size="sm" />
                          Saving...
                        </>
                      ) : (
                        editingProduct ? 'Update Product' : 'Add Product'
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowProductForm(false)}
                      className="bg-slate-600 text-white px-6 py-2 rounded-lg hover:bg-slate-700 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            <div className="bg-slate-800 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                {productsLoading ? (
                  <table className="w-full">
                    <thead className="bg-slate-700">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Product</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Price</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Stock</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Status</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700">
                      {[...Array(3)].map((_, index) => (
                        <TableRowSkeleton key={index} />
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <table className="w-full">
                    <thead className="bg-slate-700">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Product</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Price</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Stock</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Status</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700">
                      {products.map(product => (
                        <tr key={product.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="font-medium text-white">{product.name}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-amber-400 font-bold">
                            ₹{product.price}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`text-sm ${product.stock > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                              {product.stock}
                            </span>
                            {product.stock > 0 && product.stock <= LOW_STOCK_THRESHOLD && (
                              <span className="ml-2 inline-block px-2 py-0.5 rounded-full text-xs bg-amber-500 text-white">
                                Low
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-block px-2 py-1 rounded-full text-xs text-white ${
                              product.available ? 'bg-emerald-500' : 'bg-red-500'
                            }`}>
                              {product.available ? 'Available' : 'Unavailable'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleEditProduct(product)}
                                aria-label={`Edit ${product.name}`}
                                className="text-cyan-400 hover:text-cyan-300 transition-colors"
                              >
                                <Pencil className="w-4 h-4" aria-hidden="true" />
                              </button>
                              <button
                                onClick={() => handleDeleteProduct(product.id)}
                                aria-label={`Delete ${product.name}`}
                                className="text-red-400 hover:text-red-300 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" aria-hidden="true" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {showDeleteConfirm && (
              <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
                <div ref={deleteModalRef} className="bg-slate-800 p-6 rounded-lg w-full max-w-md" role="dialog" aria-modal="true" aria-labelledby="delete-confirm-title">
                  <h2 id="delete-confirm-title" className="text-xl font-bold text-white mb-4">Confirm Delete</h2>
                  <p className="text-slate-300 mb-6">
                    Are you sure you want to delete this product? This action cannot be undone.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => confirmDeleteProduct(showDeleteConfirm)}
                      className="flex-1 bg-red-600 text-white py-3 rounded-lg hover:bg-red-700 transition-colors font-medium"
                    >
                      Delete Product
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(null)}
                      className="flex-1 bg-slate-600 text-white py-3 rounded-lg hover:bg-slate-700 transition-colors font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'orders' && (
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
              <h2 className="text-2xl font-bold">Orders</h2>
              <div className="flex items-center gap-2">
                <label htmlFor="sort-orders" className="text-sm text-slate-300">Sort by:</label>
                <select
                  id="sort-orders"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'latest' | 'mobile' | 'pending')}
                  className="px-3 py-2 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-amber-500 focus:outline-none text-sm"
                >
                  <option value="latest">Latest First</option>
                  <option value="mobile">Mobile Number</option>
                  <option value="pending">Pending First</option>
                </select>
              </div>
              <button
                onClick={fetchOrders}
                disabled={ordersLoading}
                aria-label="Refresh orders"
                className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors disabled:opacity-50 text-sm font-medium flex items-center gap-2"
              >
                {ordersLoading ? (
                  <>
                    <LoadingSpinner size="sm" />
                    Refreshing...
                  </>
                ) : (
                  '↻ Refresh'
                )}
              </button>
            </div>
            {ordersLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, index) => (
                  <OrderCardSkeleton key={index} />
                ))}
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  {visibleOrders.map(order => (
                    <div key={order.id} className="bg-slate-800 rounded-lg p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-semibold">Order #{order.unique_order_id || order.id}</h3>
                          <p className="text-sm text-slate-500">{new Date(order.created_at).toLocaleString()}</p>
                        </div>
                        <span className="text-emerald-400 font-bold text-xl">₹{order.total}</span>
                      </div>

                      <div className="flex flex-col md:flex-row gap-6 mb-4">
                        <div className="flex-1 space-y-3">
                          <div>
                            <p className="text-xs text-slate-400 uppercase tracking-wide mb-0.5">Customer Name</p>
                            <p className="font-medium">{order.name}</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-400 uppercase tracking-wide mb-0.5">WhatsApp</p>
                            <a
                              href={`https://wa.me/+91${order.whatsapp.replace(/^\+?91/, '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-medium text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer"
                            >
                              +91{order.whatsapp.replace(/^\+?91/, '')}
                            </a>
                          </div>
                          <div>
                            <p className="text-xs text-slate-400 uppercase tracking-wide mb-0.5">Transaction ID</p>
                            <p className="font-mono text-sm">{order.transaction_id}</p>
                          </div>
                        </div>

                        <div className="flex flex-col gap-2 md:min-w-[110px]">
                          <button
                            onClick={() => handleOrderStatusUpdate(order.id, 'Pending')}
                            disabled={order.status === 'Pending'}
                            className={`px-4 py-2 text-sm font-medium rounded transition-colors ${
                              order.status === 'Pending'
                                ? 'bg-yellow-600 text-white cursor-default'
                                : 'bg-yellow-600/20 text-yellow-400 hover:bg-yellow-600/40'
                            }`}
                          >
                            Pending
                          </button>
                          <button
                            onClick={() => handleOrderStatusUpdate(order.id, 'Ready')}
                            disabled={order.status === 'Ready'}
                            className={`px-4 py-2 text-sm font-medium rounded transition-colors ${
                              order.status === 'Ready'
                                ? 'bg-cyan-600 text-white cursor-default'
                                : 'bg-cyan-600/20 text-cyan-400 hover:bg-cyan-600/40'
                            }`}
                          >
                            Ready
                          </button>
                          <button
                            onClick={() => handleOrderStatusUpdate(order.id, 'Picked Up')}
                            disabled={order.status === 'Picked Up'}
                            className={`px-4 py-2 text-sm font-medium rounded transition-colors ${
                              order.status === 'Picked Up'
                                ? 'bg-emerald-600 text-white cursor-default'
                                : 'bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/40'
                            }`}
                          >
                            Picked Up
                          </button>
                        </div>
                      </div>

                      <div>
                        <p className="text-sm text-slate-400 mb-2">Items:</p>
                        <div className="space-y-1">
                          {order.items.map((item, index) => (
                            <div key={index} className="flex justify-between text-sm bg-slate-700 p-2 rounded">
                              <span>{item.product_name} × {item.quantity}</span>
                              <span>₹{item.price * item.quantity}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {hasMoreOrders && (
                  <div className="mt-6 text-center">
                    <button
                      onClick={loadMoreOrders}
                      disabled={loadingMore}
                      className="px-6 py-3 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors disabled:opacity-50 font-medium flex items-center gap-2 mx-auto"
                    >
                      {loadingMore ? (
                        <>
                          <LoadingSpinner size="sm" />
                          Loading...
                        </>
                      ) : (
                        'Load More'
                      )}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {activeTab === 'settings' && (
          <div>
            <h2 className="text-2xl font-bold mb-6">Settings</h2>

            <div className="space-y-6">
              <div className="bg-slate-800 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Settings className="w-5 h-5" aria-hidden="true" />
                  App Settings
                </h3>
                <form onSubmit={handleSettingsUpdate} className="space-y-4">
                  <div>
                    <label htmlFor="shop-name" className="block text-sm font-medium text-slate-300 mb-2">
                      Shop Name
                    </label>
                    <input
                      id="shop-name"
                      type="text"
                      value={settings.shop_name}
                      onChange={(e) => setSettings({...settings, shop_name: e.target.value})}
                      className="w-full p-3 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-amber-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label htmlFor="upi-id" className="block text-sm font-medium text-slate-300 mb-2">
                      UPI ID
                    </label>
                    <input
                      id="upi-id"
                      type="text"
                      value={settings.upi_id}
                      onChange={(e) => setSettings({...settings, upi_id: e.target.value})}
                      className="w-full p-3 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-amber-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label htmlFor="tagline" className="block text-sm font-medium text-slate-300 mb-2">
                      Tagline
                    </label>
                    <input
                      id="tagline"
                      type="text"
                      value={settings.tagline}
                      onChange={(e) => setSettings({...settings, tagline: e.target.value})}
                      className="w-full p-3 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-amber-500 focus:outline-none"
                      placeholder="Enter custom tagline (leave empty for default)"
                    />
                  </div>

                  <div className="flex items-center">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.enable_quick_pay}
                        onChange={(e) => setSettings({...settings, enable_quick_pay: e.target.checked})}
                        className="w-4 h-4 text-amber-600 bg-slate-700 border-slate-600 rounded focus:ring-amber-500"
                      />
                      <span className="text-slate-300">Enable Quick Pay UPI Button</span>
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-amber-600 text-white px-6 py-2 rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {loading ? (
                      <>
                        <LoadingSpinner size="sm" />
                        Saving...
                      </>
                    ) : (
                      'Save Settings'
                    )}
                  </button>
                </form>
              </div>

              {settingsLoading ? (
                <div className="bg-slate-800 rounded-lg p-6 animate-pulse">
                  <div className="flex items-center justify-between mb-4">
                    <LoadingSkeleton className="w-1/3 h-6" />
                    <LoadingSkeleton className="w-24 h-8" />
                  </div>
                  <LoadingSkeleton className="w-full h-16" />
                </div>
              ) : (
                <div className="bg-slate-800 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <Settings className="w-5 h-5" aria-hidden="true" />
                      Admin Password
                    </h3>
                    <button
                      onClick={() => setShowPasswordForm(!showPasswordForm)}
                      className="bg-cyan-600 text-white px-4 py-2 rounded-lg hover:bg-cyan-700 transition-colors text-sm"
                    >
                      {showPasswordForm ? 'Cancel' : 'Change Password'}
                    </button>
                  </div>

                  {!showPasswordForm && (
                    <div className="bg-slate-700 rounded-lg p-4">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-300">Current Password:</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm">
                            {showCurrentPassword ? settings.admin_password : '••••••••'}
                          </span>
                          <button
                            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                            aria-label={showCurrentPassword ? 'Hide password' : 'Show password'}
                            className="text-slate-400 hover:text-white transition-colors"
                          >
                            {showCurrentPassword ? <EyeOff className="w-4 h-4" aria-hidden="true" /> : <Eye className="w-4 h-4" aria-hidden="true" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {showPasswordForm && (
                    <form onSubmit={handlePasswordChange} className="space-y-4">
                      <div>
                        <label htmlFor="new-password" className="block text-sm font-medium text-slate-300 mb-2">
                          New Password
                        </label>
                        <div className="relative">
                          <input
                            id="new-password"
                            type={showNewPassword ? "text" : "password"}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="w-full p-3 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-amber-500 focus:outline-none pr-10"
                            placeholder="Enter new password"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            aria-label={showNewPassword ? 'Hide new password' : 'Show new password'}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                          >
                            {showNewPassword ? <EyeOff className="w-4 h-4" aria-hidden="true" /> : <Eye className="w-4 h-4" aria-hidden="true" />}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label htmlFor="confirm-password" className="block text-sm font-medium text-slate-300 mb-2">
                          Confirm New Password
                        </label>
                        <div className="relative">
                          <input
                            id="confirm-password"
                            type={showConfirmPassword ? "text" : "password"}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full p-3 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-amber-500 focus:outline-none pr-10"
                            placeholder="Confirm new password"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                          >
                            {showConfirmPassword ? <EyeOff className="w-4 h-4" aria-hidden="true" /> : <Eye className="w-4 h-4" aria-hidden="true" />}
                          </button>
                        </div>
                      </div>

                      <div className="bg-amber-900 border border-amber-600 rounded-lg p-3">
                        <p className="text-amber-200 text-sm">
                          Warning: Make sure to remember your new password. You'll need it to access the admin panel.
                        </p>
                      </div>

                      <button
                        type="submit"
                        className="bg-emerald-600 text-white px-6 py-2 rounded-lg hover:bg-emerald-700 transition-colors"
                      >
                        Change Password
                      </button>
                    </form>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPage;
