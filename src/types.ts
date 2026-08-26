export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'packing'
  | 'packed'
  | 'shipped'
  | 'delivered'
  | 'failed'
  | 'cancelled';

export type DeliveryStatus =
  | 'unassigned'
  | 'assigned'
  | 'picked_up'
  | 'out_for_delivery'
  | 'near_destination'
  | 'delivered'
  | 'failed'
  | 'returned';

export interface DeliveryPartner {
  id: string;
  name: string;
  phone: string;
  vehicle_type: 'bike' | 'scooter' | 'van' | 'tempo' | 'auto';
  vehicle_number: string;
  is_active: boolean;
  avatar_url?: string | null;
  rating: number;
  total_completed: number;
  current_active_orders?: number;
  created_at?: string | null;
}

export interface ProofOfDelivery {
  method: 'otp' | 'photo' | 'signature' | 'recipient_name' | 'contactless';
  recipient_name: string;
  otp_code?: string;
  photo_url?: string;
  signature_note?: string;
  notes?: string;
  collected_at: string;
}

export interface Delivery {
  id: string;
  order_id: string;
  delivery_partner_id?: string | null;
  delivery_partner?: DeliveryPartner | null;
  status: DeliveryStatus;
  assigned_at?: string | null;
  picked_up_at?: string | null;
  out_for_delivery_at?: string | null;
  near_destination_at?: string | null;
  delivered_at?: string | null;
  estimated_delivery_at?: string | null;
  proof_of_delivery?: ProofOfDelivery | null;
  failure_reason?: string | null;
  failure_action?: 'reschedule' | 'return_to_store' | 'refund' | null;
  delivery_notes?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface DeliveryTrackingEvent {
  id: string;
  order_id: string;
  delivery_id?: string | null;
  stage: string;
  title: string;
  description: string;
  customer_message: string;
  actor: 'system' | 'admin' | 'delivery_partner' | 'customer';
  location_name?: string | null;
  created_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id?: string | null;
  product_name: string;
  quantity: number;
  price_at_purchase: number;
  product_image?: string | null;
  brand?: string | null;
  unit?: string | null;
  created_at?: string | null;
}

export type RefundStatus = 'not_applicable' | 'pending' | 'completed';

export interface Order {
  id: string;
  user_id?: string | null;
  status: OrderStatus;
  total_amount: number;
  subtotal: number;
  pincode: string;
  delivery_notes?: string | null;
  landmark?: string | null;
  gate_instructions?: string | null;
  payment_status?: string | null;
  payment_method?: string | null;
  placed_at: string;
  confirmed_at?: string | null;
  updated_at?: string | null;
  packed_at?: string | null;
  shipped_at?: string | null;
  delivered_at?: string | null;
  cancelled_at?: string | null;
  cancel_reason?: string | null;
  cancellation_reason?: string | null;
  refund_status?: RefundStatus | null;
  refunded_at?: string | null;
  stock_restocked?: boolean | null;
  recipient_name: string;
  recipient_phone: string;
  address_line1: string;
  address_line2?: string | null;
  city: string;
  state: string;
  coupon_code?: string | null;
  admin_notes?: string | null;
  // Delivery attachment
  delivery?: Delivery | null;
  // Computed / joined fields
  order_items?: OrderItem[];
  item_count?: number;
  packing_duration_minutes?: number;
}

export interface Product {
  id: string;
  name: string;
  brand?: string | null;
  category?: string | null;
  subcategory?: string | null;
  price: number;
  mrp?: number | null;
  discount_percent?: number | null;
  description?: string | null;
  stock_quantity?: number | null;
  in_stock?: boolean | null;
  image_urls?: string[] | null;
  unit?: string | null;
  rating_avg?: number | null;
  rating_count?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface AdminUser {
  user_id: string;
  role?: string | null;
  created_at?: string | null;
}

export type AdminCheck =
  | { kind: 'admin' }
  | { kind: 'not_admin' }
  | { kind: 'error'; message: string };

export interface AuthState {
  user: any | null;
  email: string | null;
  isAdmin: boolean;
  adminCheck: AdminCheck | null;
  verificationError: string | null;
  loading: boolean;
}

export interface OrderFilters {
  status: 'all' | OrderStatus;
  paymentStatus: 'all' | 'paid' | 'pending' | 'cod' | 'failed';
  paymentMethod: 'all' | 'cod' | 'upi' | 'online' | 'card';
  dateRange: 'all' | 'today' | 'last7' | 'last30' | 'custom';
  customStartDate?: string;
  customEndDate?: string;
  searchQuery: string;
  sortBy: 'placed_at_desc' | 'placed_at_asc' | 'total_desc' | 'total_asc' | 'status';
  page: number;
  pageSize: number;
}

export interface OrderDashboardStats {
  totalOrders: number;
  todayOrders: number;
  pendingOrders: number;
  packingOrders: number;
  shippedOrders: number; // Out for delivery
  deliveredOrders: number;
  cancelledOrders: number;
  failedDeliveries: number;
  totalRevenue: number;
  todayRevenue: number;
  avgPackingDelayMinutes: number;
  avgDeliveryMinutes: number;
  runningLateOrders: number;
  statusBreakdown: {
    status: OrderStatus;
    count: number;
    percentage: number;
  }[];
  topProducts: {
    name: string;
    quantity: number;
    revenue: number;
  }[];
}

export type RealtimeConnectionState = 'connected' | 'connecting' | 'disconnected' | 'error';

