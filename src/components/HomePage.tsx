import { useState, useEffect } from 'react';
import { supabase, Product, OrderItem } from '../lib/supabase';
import {
  loadCustomer, saveCustomer,
  addRecentOrder,
  validateWhatsAppNumber, formatWhatsAppNumber, isDesktop,
} from '../lib/utils';
import { Plus, Minus, ShoppingCart, CheckCircle, Clock, PackageX } from 'lucide-react';
import { showToast } from './ui/Toast';
import { LoadingSpinner, ProductCardSkeleton } from './ui/LoadingSpinner';

const HomePage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [formData, setFormData] = useState(() => ({ ...loadCustomer(), transactionId: '' }));

  const [formErrors, setFormErrors] = useState({
    name: '',
    whatsapp: '',
    transactionId: ''
  });

  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderSubmitted, setOrderSubmitted] = useState(false);
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [settings, setSettings] = useState({
    shop_name: null as string | null,
    upi_id: '',
    tagline: null as string | null,
    enable_quick_pay: true,
    orders_enabled: true
  });
  const [uniqueOrderId, setUniqueOrderId] = useState<string>('');
  const [showConfirmationPopup, setShowConfirmationPopup] = useState(false);
  const [productsLoading, setProductsLoading] = useState(true);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [submittedOrderId, setSubmittedOrderId] = useState<string>('');

  useEffect(() => {
    fetchProducts();
    fetchSettings();
    generateUniqueOrderId();
    autoCleanupOldOrders();
  }, []);

  useEffect(() => {
    saveCustomer({ name: formData.name, whatsapp: formData.whatsapp });
  }, [formData.name, formData.whatsapp]);

  useEffect(() => {
    const hasUnsavedData = cart.length > 0 || (formData.name ?? '').trim() !== '' || (formData.whatsapp ?? '').trim() !== '' || (formData.transactionId ?? '').trim() !== '';
    if (!showOrderForm || !hasUnsavedData || orderSubmitted) return;

    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [showOrderForm, cart, formData.name, formData.whatsapp, formData.transactionId, orderSubmitted]);

  const autoCleanupOldOrders = async () => {
    const lastCleanup = localStorage.getItem('last_cleanup');
    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;

    if (!lastCleanup || (now - parseInt(lastCleanup)) > oneDayMs) {
      try {
        const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/cleanup-old-orders`;
        await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          }
        });
        localStorage.setItem('last_cleanup', now.toString());
      } catch (error) {
        console.error('Auto-cleanup failed:', error);
      }
    }
  };

  const generateUniqueOrderId = () => {
    const today = new Date();
    const dateStr = today.getDate().toString().padStart(2, '0') + (today.getMonth() + 1).toString().padStart(2, '0');
    const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
    setUniqueOrderId(`NU${dateStr}${randomPart}`);
  };

  const fetchProducts = async () => {
    setProductsLoading(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('available', true)
        .order('id');

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      showToast('Error loading products', 'error');
    } finally {
      setProductsLoading(false);
    }
  };

  const fetchSettings = async () => {
    setSettingsLoading(true);
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('shop_name, upi_id, tagline, enable_quick_pay, orders_enabled')
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setSettings({
          shop_name: data.shop_name,
          upi_id: data.upi_id || '',
          tagline: data.tagline,
          enable_quick_pay: data.enable_quick_pay !== false,
          orders_enabled: data.orders_enabled !== false
        });
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setSettingsLoading(false);
    }
  };

  const addToCart = (product: Product) => {
    const currentQuantity = getItemQuantity(product.id);
    if (currentQuantity >= product.stock) {
      showToast(`Only ${product.stock} items available for ${product.name}`, 'error');
      return;
    }

    setCart(prev => {
      const existingItem = prev.find(item => item.product_id === product.id);
      if (existingItem) {
        return prev.map(item =>
          item.product_id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, {
        product_id: product.id,
        product_name: product.name,
        quantity: 1,
        price: product.price
      }];
    });
  };

  const removeFromCart = (productId: number) => {
    setCart(prev => {
      const existingItem = prev.find(item => item.product_id === productId);
      if (existingItem && existingItem.quantity > 1) {
        return prev.map(item =>
          item.product_id === productId
            ? { ...item, quantity: item.quantity - 1 }
            : item
        );
      }
      return prev.filter(item => item.product_id !== productId);
    });
  };

  const getCartTotal = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const getItemQuantity = (productId: number) => {
    const item = cart.find(item => item.product_id === productId);
    return item ? item.quantity : 0;
  };

  const handleWhatsAppChange = (value: string) => {
    const sanitized = value.replace(/[^\d\s\-+]/g, '');
    setFormData({...formData, whatsapp: sanitized});
    if (formErrors.whatsapp) {
      setFormErrors({...formErrors, whatsapp: ''});
    }
  };

  const clearFieldError = (field: keyof typeof formErrors) => {
    if (formErrors[field]) {
      setFormErrors({...formErrors, [field]: ''});
    }
  };

  const validateForm = () => {
    const errors = {
      name: '',
      whatsapp: '',
      transactionId: ''
    };

    let isValid = true;

    if (!formData.name.trim()) {
      errors.name = 'Name is required';
      isValid = false;
    } else if (formData.name.trim().length < 2) {
      errors.name = 'Name must be at least 2 characters long';
      isValid = false;
    }

    if (!formData.whatsapp.trim()) {
      errors.whatsapp = 'WhatsApp number is required';
      isValid = false;
    } else if (!validateWhatsAppNumber(formData.whatsapp)) {
      errors.whatsapp = 'Please enter a valid 10-digit mobile number';
      isValid = false;
    }

    if (!formData.transactionId.trim()) {
      errors.transactionId = 'UTR/Reference number is required';
      isValid = false;
    } else if (formData.transactionId.length < 6) {
      errors.transactionId = 'UTR/Reference number seems too short';
      isValid = false;
    } else if (!/^[A-Z0-9]+$/i.test(formData.transactionId)) {
      errors.transactionId = 'UTR/Reference number should contain only letters and numbers';
      isValid = false;
    }

    setFormErrors(errors);
    return isValid;
  };

  const handleSubmitOrder = async () => {
    if (!validateForm()) {
      showToast('Please fix the errors below', 'error');
      return;
    }

    if (cart.length === 0) {
      showToast('Please add items to your cart', 'error');
      return;
    }

    if (!paymentConfirmed) {
      showToast('Please confirm payment completion and information accuracy', 'error');
      return;
    }

    setShowConfirmationPopup(true);
  };

  const confirmAndSubmitOrder = async () => {
    setIsSubmitting(true);
    setShowConfirmationPopup(false);

    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-order`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          whatsapp: formatWhatsAppNumber(formData.whatsapp),
          items: cart,
          total: getCartTotal(),
          transaction_id: formData.transactionId,
          unique_order_id: uniqueOrderId
        })
      });

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to place order');
      }

      addRecentOrder({
        unique_order_id: uniqueOrderId,
        name: formData.name,
        created_at: new Date().toISOString(),
      });
      setSubmittedOrderId(uniqueOrderId);

      setOrderSubmitted(true);
      showToast(`Order #${uniqueOrderId} submitted successfully!`, 'success');

      setFormData(prev => ({ ...prev, transactionId: '' }));
      setCart([]);
      setFormErrors({ name: '', whatsapp: '', transactionId: '' });
      setPaymentConfirmed(false);
      generateUniqueOrderId();
      await fetchProducts();
    } catch (error) {
      console.error('Error submitting order:', error);
      showToast(error instanceof Error ? error.message : 'Error submitting order. Please try again.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast('Copied to clipboard', 'success');
  };

  if (orderSubmitted) {
    return (
      <div className="min-h-screen bg-slate-950 text-white">
        <div className="max-w-md mx-auto px-4 py-8">
          <div className="bg-slate-800 rounded-lg p-6 text-center">
            <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-4">Order Placed!</h2>
            <p className="text-slate-300 mb-2">
              Thanks! I'll message you on WhatsApp soon with pickup details.
            </p>
            <p className="text-sm text-slate-400 mb-6">
              Your Order ID: <span className="font-mono text-yellow-400 font-bold">{submittedOrderId}</span>
            </p>
            <div className="bg-slate-700 rounded-lg p-4 mb-6">
              <p className="text-sm text-yellow-400 mb-2">Trust Note</p>
              <p className="text-sm text-slate-300">
                All payments are verified manually before pickup. No cash accepted.
                For issues, message me on WhatsApp.
              </p>
            </div>
            <button
              onClick={() => {
                setCart([]);
                setFormErrors({ name: '', whatsapp: '', transactionId: '' });
                setPaymentConfirmed(false);
                setOrderSubmitted(false);
                setShowOrderForm(false);
              }}
              className="w-full bg-amber-600 text-white px-6 py-3 rounded-lg hover:bg-amber-700 transition-colors font-medium"
            >
              Place Another Order
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {!showOrderForm && (
        <div className="min-h-screen flex flex-col justify-center items-center px-4">
          <div className="text-center mb-8">
            {settingsLoading ? (
              <div className="flex flex-col items-center gap-3 mb-2">
                <div className="animate-pulse bg-slate-700 rounded h-12 w-56"></div>
                <div className="animate-pulse bg-slate-700 rounded h-8 w-64"></div>
              </div>
            ) : (
              <>
                <h1 className="text-4xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent py-2">
                  {settings.shop_name}
                </h1>
                <p className="text-xl md:text-2xl text-slate-300 mb-2">
                  {settings.tagline}
                </p>
              </>
            )}
            <p className="text-lg text-slate-400 mb-8">
              Pay online via UPI • Pickup after confirmation
            </p>
          </div>

          {settingsLoading ? (
            <div className="animate-pulse bg-slate-700 rounded-lg h-14 w-48"></div>
          ) : settings.orders_enabled ? (
            <button
              onClick={() => setShowOrderForm(true)}
              className="bg-gradient-to-r from-amber-600 to-orange-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:from-amber-700 hover:to-orange-700 transition-all transform hover:scale-105 shadow-lg"
            >
              Start Ordering
            </button>
          ) : (
            <div className="bg-slate-800 border border-slate-600 rounded-xl px-8 py-6 text-center max-w-sm shadow-lg">
              <div className="w-14 h-14 bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="w-7 h-7 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Ordering Unavailable</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Ordering is currently unavailable. Please check back later.
              </p>
            </div>
          )}
        </div>
      )}

      {showOrderForm && (
        <div className="max-w-md mx-auto px-4 py-8">
          <div className="mb-6">
            <button
              onClick={() => {
                setCart([]);
                setFormErrors({ name: '', whatsapp: '', transactionId: '' });
                setPaymentConfirmed(false);
                setShowOrderForm(false);
              }}
              className="text-amber-400 hover:text-amber-300 transition-colors mb-4"
            >
              ← Back to Home
            </button>
            <h2 className="text-2xl font-bold mb-6">Place Your Order</h2>
          </div>

          {!settings.orders_enabled ? (
            <div className="bg-slate-800 border border-slate-600 rounded-xl p-6 text-center">
              <div className="w-12 h-12 bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-3">
                <Clock className="w-6 h-6 text-slate-400" />
              </div>
              <h3 className="font-semibold text-white mb-1">Ordering Unavailable</h3>
              <p className="text-slate-400 text-sm">
                Ordering is currently unavailable. Please check back later.
              </p>
            </div>
          ) : (<>
          <div className="bg-slate-800 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold mb-4">Your Details</h3>

            <div className="space-y-4">
              <div>
                <label htmlFor="customer-name" className="block text-sm font-medium text-slate-300 mb-2">
                  Name *
                </label>
                <input
                  id="customer-name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => {
                    setFormData({...formData, name: e.target.value});
                    clearFieldError('name');
                  }}
                  aria-invalid={!!formErrors.name}
                  aria-describedby={formErrors.name ? 'name-error' : undefined}
                  className={`w-full p-3 bg-slate-700 text-white rounded-lg border focus:outline-none transition-colors ${
                    formErrors.name
                      ? 'border-red-500 focus:border-red-400'
                      : 'border-slate-600 focus:border-amber-500'
                  }`}
                  placeholder="Enter your name"
                />
                {formErrors.name && (
                  <p id="name-error" className="text-red-400 text-sm mt-1 flex items-center gap-1">
                    <span className="text-red-500">⚠</span>
                    {formErrors.name}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="customer-whatsapp" className="block text-sm font-medium text-slate-300 mb-2">
                  WhatsApp Number *
                </label>
                <input
                  id="customer-whatsapp"
                  type="tel"
                  maxLength={10}
                  value={formData.whatsapp}
                  onChange={(e) => handleWhatsAppChange(e.target.value)}
                  aria-invalid={!!formErrors.whatsapp}
                  aria-describedby={formErrors.whatsapp ? 'whatsapp-error' : 'whatsapp-help'}
                  className={`w-full p-3 bg-slate-700 text-white rounded-lg border focus:outline-none transition-colors ${
                    formErrors.whatsapp
                      ? 'border-red-500 focus:border-red-400'
                      : 'border-slate-600 focus:border-amber-500'
                  }`}
                  placeholder="Enter WhatsApp number (e.g., 9876543210)"
                />
                <p id="whatsapp-help" className="text-xs text-slate-400 mt-1">Enter 10-digit mobile number</p>
                {formErrors.whatsapp && (
                  <p id="whatsapp-error" className="text-red-400 text-sm mt-1 flex items-center gap-1">
                    <span className="text-red-500">⚠</span>
                    {formErrors.whatsapp}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="bg-slate-800 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold mb-4">Available Items</h3>

            {productsLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, index) => (
                  <ProductCardSkeleton key={index} />
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <PackageX className="w-10 h-10 mx-auto mb-3 text-slate-500" />
                <p className="text-sm">No items available right now — check back soon.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {products.map(product => (
                  <div key={product.id} className="flex items-center justify-between bg-slate-700 p-4 rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-semibold">{product.name}</h4>
                      <p className="text-amber-400 font-bold">₹{product.price}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => removeFromCart(product.id)}
                        aria-label={`Remove one ${product.name} from cart`}
                        className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center hover:bg-red-700 transition-colors"
                        disabled={getItemQuantity(product.id) === 0}
                      >
                        <Minus className="w-4 h-4" />
                      </button>

                      <span className="w-8 text-center font-bold" aria-live="polite">
                        {getItemQuantity(product.id)}
                      </span>

                      <button
                        onClick={() => addToCart(product)}
                        aria-label={`Add one ${product.name} to cart`}
                        className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center hover:bg-green-700 transition-colors"
                        disabled={getItemQuantity(product.id) >= product.stock}
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {cart.length > 0 && (
            <div className="bg-slate-800 rounded-lg p-6 mb-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <ShoppingCart className="w-5 h-5" />
                Cart Summary
              </h3>

              <div className="space-y-2 mb-4">
                {cart.map(item => (
                  <div key={item.product_id} className="flex justify-between text-sm">
                    <span>{item.product_name} × {item.quantity}</span>
                    <span>₹{item.price * item.quantity}</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-slate-600 pt-2">
                <div className="flex justify-between font-bold text-lg">
                  <span>Total:</span>
                  <span className="text-amber-400">₹{getCartTotal()}</span>
                </div>
              </div>
            </div>
          )}

          {cart.length > 0 && (
            <div className="bg-slate-800 rounded-lg p-6 mb-6">
              <h3 className="text-lg font-semibold mb-4">Payment Details</h3>

              {settings.enable_quick_pay && (
                <div className="bg-slate-700 rounded-lg p-4 mb-4 text-center">
                  <p className="text-sm text-slate-300 mb-3">Quick Pay via UPI:</p>
                  <a
                    href={`upi://pay?pa=${settings.upi_id}&pn=TMP%20at%20NU&am=${getCartTotal()}&tn=${uniqueOrderId}`}
                    className="inline-block w-full bg-gradient-to-r from-emerald-600 to-cyan-600 text-white py-3 px-4 rounded-lg font-semibold hover:from-emerald-700 hover:to-cyan-700 transition-all"
                  >
                    💳 Pay ₹{getCartTotal()} via UPI
                  </a>
                  <p className="text-xs text-slate-400 mt-2">
                    This will open your UPI app with pre-filled payment details
                  </p>
                  {isDesktop() && (
                    <p className="text-xs text-amber-300 mt-2">
                      On desktop? Open this page on your phone to pay via UPI, or scan the QR code below.
                    </p>
                  )}
                </div>
              )}

              <div className="bg-slate-700 rounded-lg p-4 mb-4">
                <p className="text-sm text-slate-300 mb-2">Order ID (Use as payment note):</p>
                <div className="flex items-center justify-between bg-slate-600 rounded-lg p-3">
                  <p className="font-mono text-yellow-400 text-lg font-bold">{uniqueOrderId}</p>
                  <button
                    onClick={() => copyToClipboard(uniqueOrderId)}
                    aria-label="Copy order ID to clipboard"
                    className="px-3 py-1 bg-amber-600 text-white text-xs rounded hover:bg-amber-700 transition-colors"
                  >
                    Copy
                  </button>
                </div>
                <p className="text-xs text-yellow-300 mt-2">
                  ⚠️ Important: Use this Order ID as the payment note/remark when making the UPI payment
                </p>
              </div>

              <div className="bg-slate-700 rounded-lg p-4 mb-4">
                <p className="text-sm text-slate-300 mb-2">Pay to UPI ID:</p>
                <div className="flex items-center justify-between bg-slate-600 rounded-lg p-3">
                  <p className="font-mono text-amber-400 text-lg font-bold">{settings.upi_id}</p>
                  <button
                    onClick={() => copyToClipboard(settings.upi_id)}
                    aria-label="Copy UPI ID to clipboard"
                    className="px-3 py-1 bg-amber-600 text-white text-xs rounded hover:bg-amber-700 transition-colors"
                  >
                    Copy
                  </button>
                </div>
              </div>

              <div className="bg-slate-700 rounded-lg p-4 mb-4 text-center">
                <p className="text-sm text-slate-300 mb-2">Scan QR Code:</p>
                <div className="w-32 h-32 bg-white rounded-lg mx-auto flex items-center justify-center">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(`upi://pay?pa=${settings.upi_id}&pn=TMP%20at%20NU&am=${getCartTotal()}&tn=${uniqueOrderId}`)}`}
                    alt="UPI QR Code"
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="utr-number" className="block text-sm font-medium text-slate-300 mb-2">
                  UTR/Reference Number *
                </label>
                <input
                  id="utr-number"
                  type="text"
                  value={formData.transactionId}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^A-Z0-9]/gi, '').toUpperCase();
                    setFormData({...formData, transactionId: value});
                    clearFieldError('transactionId');
                  }}
                  aria-invalid={!!formErrors.transactionId}
                  aria-describedby={formErrors.transactionId ? 'utr-error' : 'utr-help'}
                  className={`w-full p-3 bg-slate-700 text-white rounded-lg border focus:outline-none transition-colors font-mono tracking-wide ${
                    formErrors.transactionId
                      ? 'border-red-500 focus:border-red-400'
                      : 'border-slate-600 focus:border-amber-500'
                  }`}
                  placeholder="Paste your UTR/Reference number here"
                />
                <p id="utr-help" className="text-xs text-slate-400 mt-1">
                  Copy from your payment app and paste here directly
                </p>
                {formErrors.transactionId && (
                  <p id="utr-error" className="text-red-400 text-sm mt-1 flex items-center gap-1">
                    <span className="text-red-500">⚠</span>
                    {formErrors.transactionId}
                  </p>
                )}
              </div>

              <div className="mt-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={paymentConfirmed}
                    onChange={(e) => setPaymentConfirmed(e.target.checked)}
                    className="w-4 h-4 text-amber-600 bg-slate-700 border-slate-600 rounded focus:ring-amber-500"
                  />
                  <span className="text-sm text-slate-300">
                    I confirm I've completed the payment and all the information I have provided is correct
                  </span>
                </label>
              </div>
            </div>
          )}

          {cart.length > 0 && (
            <button
              onClick={handleSubmitOrder}
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-amber-600 to-orange-600 text-white py-3 rounded-lg font-semibold hover:from-amber-700 hover:to-orange-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <LoadingSpinner size="sm" />
                  Submitting...
                </>
              ) : (
                'Submit Order'
              )}
            </button>
          )}

          {showConfirmationPopup && (
            <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
              <div className="bg-slate-800 p-6 rounded-lg w-full max-w-md">
                <h2 className="text-xl font-bold text-white mb-4">Confirm Order Details</h2>

                <div className="bg-slate-700 rounded-lg p-4 mb-4">
                  <h3 className="font-semibold text-white mb-3">Order Summary:</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-300">Name:</span>
                      <span className="text-white">{formData.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-300">WhatsApp:</span>
                      <span className="text-white">{formData.whatsapp}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-300">Total:</span>
                      <span className="text-emerald-400 font-bold">₹{getCartTotal()}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-700 rounded-lg p-4 mb-4">
                  <p className="text-sm text-slate-300 mb-2">Your Order ID:</p>
                  <div className="flex items-center justify-between bg-slate-600 rounded-lg p-3">
                    <p className="font-mono text-yellow-400 text-lg font-bold">{uniqueOrderId}</p>
                    <button
                      onClick={() => copyToClipboard(uniqueOrderId)}
                      aria-label="Copy order ID to clipboard"
                      className="px-3 py-1 bg-amber-600 text-white text-xs rounded hover:bg-amber-700 transition-colors"
                    >
                      Copy
                    </button>
                  </div>
                  <p className="text-xs text-yellow-300 mt-2">
                    ⚠️ Save this Order ID to track your order
                  </p>
                </div>

                <div className="bg-amber-900 border border-amber-600 rounded-lg p-3 mb-4">
                  <p className="text-amber-200 text-sm">
                    📱 <strong>Important:</strong> Please verify your WhatsApp number is correct.
                    This is how you'll be contacted about your order.
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={confirmAndSubmitOrder}
                    disabled={isSubmitting}
                    className="flex-1 bg-emerald-600 text-white py-3 rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <LoadingSpinner size="sm" />
                        Submitting...
                      </>
                    ) : (
                      'Confirm & Submit'
                    )}
                  </button>
                  <button
                    onClick={() => setShowConfirmationPopup(false)}
                    disabled={isSubmitting}
                    className="flex-1 bg-slate-600 text-white py-3 rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-50 font-medium"
                  >
                    Go Back
                  </button>
                </div>
              </div>
            </div>
          )}
          </>)}
        </div>
      )}
    </div>
  );
};

export default HomePage;
