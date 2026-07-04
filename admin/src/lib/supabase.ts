import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface Product {
  id: number;
  name: string;
  price: number;
  stock: number;
  available: boolean;
  created_at: string;
}

export interface Order {
  id: number;
  name: string;
  whatsapp: string;
  items: Array<{
    product_id: number;
    product_name: string;
    quantity: number;
    price: number;
  }>;
  total: number;
  transaction_id: string;
  unique_order_id: string;
  status: 'Pending' | 'Ready' | 'Picked Up';
  created_at: string;
}

export interface OrderItem {
  product_id: number;
  product_name: string;
  quantity: number;
  price: number;
}
