import { useState, useEffect } from 'react';
import { supabase, Order } from '../lib/supabase';
import { loadRecentOrders } from '../lib/utils';
import { Search, Package, Clock, CheckCircle, History } from 'lucide-react';
import { showToast } from './ui/Toast';
import { LoadingSpinner } from './ui/LoadingSpinner';

const TrackOrderPage: React.FC = () => {
  const [orderId, setOrderId] = useState('');
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [recentOrders, setRecentOrders] = useState(() => loadRecentOrders());

  useEffect(() => {
    setRecentOrders(loadRecentOrders());
  }, []);

  const searchOrder = async (idToSearch?: string) => {
    const query = (idToSearch ?? orderId).trim();
    if (!query) {
      showToast('Please enter an order ID', 'error');
      return;
    }

    const trimmedOrderId = query.toUpperCase();
    setOrderId(trimmedOrderId);
    setLoading(true);
    setSearched(true);

    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('unique_order_id', trimmedOrderId)
        .maybeSingle();

      if (error) throw error;

      setOrder(data);
      if (!data) {
        showToast('Order not found. Please check your order ID.', 'error');
      }
    } catch (error) {
      console.error('Error searching order:', error);
      showToast('Error searching for order. Please try again.', 'error');
      setOrder(null);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Pending': return <Clock className="w-6 h-6 text-yellow-500" />;
      case 'Ready': return <Package className="w-6 h-6 text-cyan-500" />;
      case 'Picked Up': return <CheckCircle className="w-6 h-6 text-emerald-500" />;
      default: return null;
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

  const getStatusMessage = (status: string) => {
    switch (status) {
      case 'Pending': return 'Your order is being prepared.';
      case 'Ready': return 'Your order is ready for pickup!';
      case 'Picked Up': return 'Order completed. Thank you!';
      default: return 'Unknown status';
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent py-1">
          Track Your Order
        </h1>
        <p className="text-slate-300 mb-8">Enter your order ID to check status</p>

        <div className="bg-slate-800 rounded-lg p-6 mb-6">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <label htmlFor="track-order-id" className="sr-only">Order ID</label>
              <input
                id="track-order-id"
                type="text"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && searchOrder()}
                className="w-full p-4 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-amber-500 focus:outline-none"
                placeholder="Enter Order ID"
                disabled={loading}
              />
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" aria-hidden="true" />
            </div>
            <button
              onClick={() => searchOrder()}
              disabled={loading}
              className="px-6 py-4 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50 font-medium flex items-center gap-2"
            >
              {loading ? (
                <>
                  <LoadingSpinner size="sm" />
                  Searching...
                </>
              ) : (
                'Track'
              )}
            </button>
          </div>
        </div>

        {recentOrders.length > 0 && !searched && (
          <div className="bg-slate-800 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <History className="w-5 h-5 text-amber-400" />
              Recent Orders
            </h3>
            <div className="space-y-2">
              {recentOrders.map((recent) => (
                <button
                  key={recent.unique_order_id}
                  onClick={() => {
                    setOrderId(recent.unique_order_id);
                    searchOrder(recent.unique_order_id);
                  }}
                  className="w-full flex items-center justify-between bg-slate-700 hover:bg-slate-600 rounded-lg p-3 transition-colors text-left"
                >
                  <div>
                    <p className="font-mono text-yellow-400 font-bold">{recent.unique_order_id}</p>
                    <p className="text-xs text-slate-400">{recent.name}</p>
                  </div>
                  <span className="text-xs text-slate-400">
                    {new Date(recent.created_at).toLocaleDateString()}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {searched && !loading && order && (
          <div className="space-y-6">
            <div className="bg-slate-800 rounded-lg p-6">
              <div className="flex items-center gap-4 mb-4">
                {getStatusIcon(order.status)}
                <div>
                  <h2 className="text-xl font-bold">Order #{order.unique_order_id || order.id}</h2>
                  <div className={`inline-block px-3 py-1 rounded-full text-sm text-white mt-2 ${getStatusColor(order.status)}`}>
                    {order.status}
                  </div>
                </div>
              </div>

              <p className="text-slate-300 bg-slate-700 rounded-lg p-4">{getStatusMessage(order.status)}</p>
            </div>

            <div className="bg-slate-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Order Details</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <p className="text-sm text-slate-400">Name</p>
                  <p className="font-medium">{order.name}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Total</p>
                  <p className="font-medium text-emerald-400">₹{order.total}</p>
                </div>
              </div>

              <div>
                <p className="text-sm text-slate-400 mb-3">Items</p>
                <div className="space-y-2">
                  {order.items.map((item, index) => (
                    <div key={index} className="flex justify-between items-center bg-slate-700 p-3 rounded-lg">
                      <div>
                        <p className="font-medium">{item.product_name}</p>
                        <p className="text-sm text-slate-400">Qty: {item.quantity}</p>
                      </div>
                      <p className="font-medium">₹{item.price * item.quantity}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {searched && !loading && !order && (
          <div className="bg-slate-800 rounded-lg p-8 text-center">
            <h3 className="text-xl font-semibold mb-2">Order Not Found</h3>
            <p className="text-slate-300">Check your order ID and try again.</p>
          </div>
        )}

        {!searched && (
          <div className="bg-slate-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">How to Track Your Order</h3>
            <div className="space-y-3 text-slate-300 mb-6">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-amber-600 rounded-full flex items-center justify-center text-sm font-bold mt-0.5 flex-shrink-0">1</div>
                <p>Enter your order ID in the search box above</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-amber-600 rounded-full flex items-center justify-center text-sm font-bold mt-0.5 flex-shrink-0">2</div>
                <p>Your order ID was provided when you placed the order</p>
              </div>
            </div>

            <div className="bg-slate-700 rounded-lg p-4">
              <p className="text-sm text-yellow-300 mb-3 font-semibold">📱 Order Status Meanings:</p>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <span className="text-slate-300"><strong>Pending:</strong> Your order is being prepared</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-cyan-500 rounded-full"></div>
                  <span className="text-slate-300"><strong>Ready:</strong> Your order is ready for pickup</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                  <span className="text-slate-300"><strong>Picked Up:</strong> Order completed</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TrackOrderPage;
