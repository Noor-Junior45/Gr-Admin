export type OrderStatus =
  | 'pending'
  | 'packing'
  | 'packed'
  | 'shipped'
  | 'delivered'
  | 'cancelled';

export interface OrderItem {
  id: string;
  order_id: string;
  product_id?: string | null;
  product_name: string;
  product_image?: string | null;
  brand?: string | null;
  unit?: string | null;
  quantity: number;
  price_at_purchase: number;
}

export interface Order {
  id: string;
  user_id?: string | null;
  status: OrderStatus;
  recipient_name: string;
  recipient_phone: string;
  recipient_email?: string | null;
  address_line1: string;
  address_line2?: string | null;
  city: string;
  state: string;
  pincode: string;
  address_label?: string | null;
  delivery_notes?: string | null;
  subtotal: number;
  discount_amount?: number | null;
  fees?: number | null;
  total_amount: number;
  coupon_code?: string | null;
  payment_method?: string | null;
  payment_status?: string | null;
  placed_at: string;
  packed_at?: string | null;
  shipped_at?: string | null;
  delivered_at?: string | null;
  updated_at?: string | null;
  // Joined or calculated
  order_items?: OrderItem[];
  item_count?: number;
}

export interface AdminUser {
  user_id: string;
  role: string;
  created_at: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  isAdmin: boolean;
  isLoading: boolean;
  email: string | null;
  userId: string | null;
  error: string | null;
}
