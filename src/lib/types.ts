// ---- Domain types shared across the app ----

export type Category = "drinks" | "chips" | "hot" | "sweets" | "healthy" | "other";

export const CATEGORIES: { key: Category; label: string; icon: string }[] = [
  { key: "drinks", label: "Drinks", icon: "local_drink" },
  { key: "chips", label: "Chips", icon: "fastfood" },
  { key: "hot", label: "Hot", icon: "local_fire_department" },
  { key: "sweets", label: "Sweets", icon: "icecream" },
  { key: "healthy", label: "Healthy", icon: "eco" },
];

export interface Product {
  id: number;
  name: string;
  description: string | null;
  price: number;
  original_price: number | null;
  stock: number;
  available: boolean;
  category: Category;
  image_url: string | null;
  featured: boolean;
  created_at: string;
}

export type OrderStatus = "Pending" | "Ready" | "Picked Up";

export const ORDER_STATUSES: OrderStatus[] = ["Pending", "Ready", "Picked Up"];

export interface OrderItem {
  product_id: number;
  product_name: string;
  quantity: number;
  price: number;
}

export interface Order {
  id: number;
  name: string;
  whatsapp: string;
  items: OrderItem[];
  total: number;
  transaction_id: string;
  status: OrderStatus;
  unique_order_id: string;
  created_at: string;
}

export interface Settings {
  id: string;
  shop_name: string;
  upi_id: string;
  qr_code_url: string | null;
  tagline: string;
  enable_quick_pay: boolean;
  admin_password: string | null;
  orders_enabled: boolean;
  created_at: string;
  updated_at: string;
}

// Settings as exposed to the public (no admin_password)
export type PublicSettings = Omit<Settings, "admin_password">;

export interface TopSpender {
  whatsapp: string;
  name: string;
  total: number;
}

// A cart line item held in client state
export interface CartLine {
  product: Product;
  quantity: number;
}
