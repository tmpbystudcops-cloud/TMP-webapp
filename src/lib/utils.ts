const CUSTOMER_KEY = 'tmp_customer';
const RECENT_ORDERS_KEY = 'tmp_recent_orders';
const MAX_RECENT_ORDERS = 5;

export interface CustomerDetails {
  name: string;
  whatsapp: string;
}

export interface RecentOrder {
  unique_order_id: string;
  name: string;
  created_at: string;
}

export const loadCustomer = (): CustomerDetails => {
  try {
    const stored = localStorage.getItem(CUSTOMER_KEY);
    if (!stored) return { name: '', whatsapp: '' };
    const parsed = JSON.parse(stored);
    return {
      name: typeof parsed?.name === 'string' ? parsed.name : '',
      whatsapp: typeof parsed?.whatsapp === 'string' ? parsed.whatsapp : '',
    };
  } catch {
    return { name: '', whatsapp: '' };
  }
};

export const saveCustomer = (customer: CustomerDetails): void => {
  try {
    localStorage.setItem(CUSTOMER_KEY, JSON.stringify(customer));
  } catch {
    // ignore quota errors
  }
};

export const loadRecentOrders = (): RecentOrder[] => {
  try {
    const stored = localStorage.getItem(RECENT_ORDERS_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const addRecentOrder = (order: RecentOrder): void => {
  try {
    const existing = loadRecentOrders().filter(o => o.unique_order_id !== order.unique_order_id);
    const updated = [order, ...existing].slice(0, MAX_RECENT_ORDERS);
    localStorage.setItem(RECENT_ORDERS_KEY, JSON.stringify(updated));
  } catch {
    // ignore quota errors
  }
};

export const validateWhatsAppNumber = (number: string): boolean => {
  const cleanNumber = number.replace(/\D/g, '');
  const indianMobileRegex = /^[6-9]\d{9}$/;
  return indianMobileRegex.test(cleanNumber) || /^\d{10,15}$/.test(cleanNumber);
};

export const formatWhatsAppNumber = (number: string): string => {
  const cleanNumber = number.replace(/\D/g, '');
  return cleanNumber.length === 10 ? `91${cleanNumber}` : cleanNumber;
};

export const isDesktop = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  return !/Android|iPhone|iPad|iPod|Mobile|Windows Phone/i.test(navigator.userAgent);
};
