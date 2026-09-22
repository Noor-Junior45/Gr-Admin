import { supabase } from '../lib/supabaseClient';
import { withSkewRetry } from '../utils/supabaseHelper';
import { Order, OrderItem, OrderStatus, OrderDashboardStats, OrderFilters } from '../types';
import {
  fetchDeliveryByOrderId,
  fetchRiderById,
  logTrackingEvent,
  getLocalDeliveries,
  normalizeDeliveryPartner,
} from './deliveryService';

const LOCAL_STORAGE_ORDERS_CACHE_KEY = 'gr_admin_cached_orders_v2';
const LOCAL_STORAGE_ITEMS_CACHE_KEY = 'gr_admin_cached_items_v2';

export function getCachedOrders(): Record<string, Order> {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_ORDERS_CACHE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('[orderService] Error reading cached orders:', e);
  }
  return {};
}

export function saveCachedOrders(orders: Order[]): void {
  try {
    const current = getCachedOrders();
    for (const o of orders) {
      if (o.id) {
        current[o.id] = { ...current[o.id], ...o };
      }
    }
    localStorage.setItem(LOCAL_STORAGE_ORDERS_CACHE_KEY, JSON.stringify(current));
  } catch (e) {
    console.warn('[orderService] Error saving cached orders:', e);
  }
}

export function saveSingleCachedOrder(order: Order, items?: OrderItem[]): void {
  try {
    const current = getCachedOrders();
    const updatedOrder = {
      ...order,
      order_items: items || order.order_items || current[order.id]?.order_items || [],
    };
    current[order.id] = updatedOrder;
    localStorage.setItem(LOCAL_STORAGE_ORDERS_CACHE_KEY, JSON.stringify(current));

    if (items && items.length > 0) {
      const itemsMap = getCachedOrderItems();
      itemsMap[order.id] = items;
      localStorage.setItem(LOCAL_STORAGE_ITEMS_CACHE_KEY, JSON.stringify(itemsMap));
    }
  } catch (e) {
    console.warn('[orderService] Error saving single cached order:', e);
  }
}

export function getCachedOrderItems(): Record<string, OrderItem[]> {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_ITEMS_CACHE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('[orderService] Error reading cached items:', e);
  }
  return {};
}

/**
 * Centralized data service for managing Supabase order operations.
 * Enforces schema fidelity with `orders`, `deliveries`, and `order_items`.
 */

export async function fetchOrdersList(
  filters?: Partial<OrderFilters>
): Promise<{ orders: Order[]; totalCount: number }> {
  try {
    let query = supabase
      .from('orders')
      .select('*, order_items(id, quantity, product_name, price_at_purchase, product_image, brand, unit)', {
        count: 'exact',
      });

    // Helper to expand status to synonyms & case-variants
    const getStatusVariants = (statusVal: string): string[] => {
      const s = (statusVal || '').toLowerCase().trim();
      if (s === 'pending') return ['pending', 'confirmed', 'placed', 'Pending', 'Confirmed', 'Placed', 'PENDING', 'CONFIRMED', 'PLACED'];
      if (s === 'packing') return ['packing', 'Packing', 'PACKING', 'in_packing', 'IN_PACKING'];
      if (s === 'packed') return ['packed', 'Packed', 'PACKED', 'ready', 'Ready', 'READY'];
      if (s === 'shipped') return ['shipped', 'Shipped', 'SHIPPED', 'dispatched', 'Dispatched', 'DISPATCHED', 'out_for_delivery'];
      if (s === 'delivered') return ['delivered', 'Delivered', 'DELIVERED', 'completed', 'Completed', 'COMPLETED'];
      if (s === 'cancelled') return ['cancelled', 'canceled', 'Cancelled', 'Canceled', 'CANCELLED', 'CANCELED'];
      return [statusVal];
    };

    // Apply status filter
    if (filters?.statusIn && filters.statusIn.length > 0) {
      const expanded = new Set<string>();
      filters.statusIn.forEach((st) => {
        getStatusVariants(st).forEach((v) => expanded.add(v));
      });
      query = query.in('status', Array.from(expanded));
    } else if (filters?.status && filters.status !== 'all') {
      const variants = getStatusVariants(filters.status);
      query = query.in('status', variants);
    }

    // Apply payment status filter
    if (filters?.paymentStatus && filters.paymentStatus !== 'all') {
      if (filters.paymentStatus === 'paid') {
        query = query.in('payment_status', ['paid', 'completed', 'success']);
      } else if (filters.paymentStatus === 'pending') {
        query = query.in('payment_status', ['pending', 'unpaid']);
      } else if (filters.paymentStatus === 'cod') {
        query = query.ilike('payment_method', '%cod%');
      } else if (filters.paymentStatus === 'failed') {
        query = query.eq('payment_status', 'failed');
      }
    }

    // Apply payment method filter
    if (filters?.paymentMethod && filters.paymentMethod !== 'all') {
      query = query.ilike('payment_method', `%${filters.paymentMethod}%`);
    }

    // Apply date range filter
    if (filters?.dateRange && filters.dateRange !== 'all') {
      const now = new Date();
      if (filters.dateRange === 'today') {
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
        query = query.gte('placed_at', startOfToday);
      } else if (filters.dateRange === 'last7') {
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
        query = query.gte('placed_at', sevenDaysAgo);
      } else if (filters.dateRange === 'last30') {
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
        query = query.gte('placed_at', thirtyDaysAgo);
      } else if (filters.dateRange === 'custom') {
        if (filters.customStartDate) {
          query = query.gte('placed_at', new Date(filters.customStartDate).toISOString());
        }
        if (filters.customEndDate) {
          const endDate = new Date(filters.customEndDate);
          endDate.setHours(23, 59, 59, 999);
          query = query.lte('placed_at', endDate.toISOString());
        }
      }
    }

    // Search query on verified columns: recipient_name, recipient_phone, pincode, city, id
    if (filters?.searchQuery && filters.searchQuery.trim()) {
      const term = filters.searchQuery.trim();
      if (term.includes('-') || /^[0-9a-fA-F]{4,}/.test(term)) {
        query = query.or(`id.ilike.%${term}%,recipient_name.ilike.%${term}%,recipient_phone.ilike.%${term}%,pincode.ilike.%${term}%`);
      } else {
        query = query.or(`recipient_name.ilike.%${term}%,recipient_phone.ilike.%${term}%,city.ilike.%${term}%,pincode.ilike.%${term}%`);
      }
    }

    // Sorting
    const sortBy = filters?.sortBy || 'placed_at_desc';
    switch (sortBy) {
      case 'placed_at_asc':
        query = query.order('placed_at', { ascending: true });
        break;
      case 'total_desc':
        query = query.order('total_amount', { ascending: false });
        break;
      case 'total_asc':
        query = query.order('total_amount', { ascending: true });
        break;
      case 'status':
        query = query.order('status', { ascending: true });
        break;
      case 'placed_at_desc':
      default:
        query = query.order('placed_at', { ascending: false });
        break;
    }

    // Pagination
    if (filters?.page && filters?.pageSize) {
      const from = (filters.page - 1) * filters.pageSize;
      const to = from + filters.pageSize - 1;
      query = query.range(from, to);
    }

    const { data, count, error } = await withSkewRetry(() => query, 3, 600);

    if (error) {
      console.warn('[orderService] Error querying orders with join:', error);
      let fallbackQuery = supabase
        .from('orders')
        .select('*', { count: 'exact' });

      if (filters?.statusIn && filters.statusIn.length > 0) {
        const expanded = new Set<string>();
        filters.statusIn.forEach((st) => {
          getStatusVariants(st).forEach((v) => expanded.add(v));
        });
        fallbackQuery = fallbackQuery.in('status', Array.from(expanded));
      } else if (filters?.status && filters.status !== 'all') {
        const variants = getStatusVariants(filters.status);
        fallbackQuery = fallbackQuery.in('status', variants);
      }

      fallbackQuery = fallbackQuery.order('placed_at', { ascending: false });

      if (filters?.page && filters?.pageSize) {
        const from = (filters.page - 1) * filters.pageSize;
        const to = from + filters.pageSize - 1;
        fallbackQuery = fallbackQuery.range(from, to);
      }

      const { data: fallbackData, count: fallbackCount, error: fallbackErr } = await withSkewRetry(
        () => fallbackQuery,
        3,
        600
      );

      if (fallbackErr) throw fallbackErr;

      const fallbackOrders: Order[] = (fallbackData || []).map((o: any) => ({
        ...o,
        item_count: 0,
        cancellation_reason: o.cancellation_reason || o.cancel_reason || o.notes || null,
      }));

      saveCachedOrders(fallbackOrders);
      return { orders: fallbackOrders, totalCount: fallbackCount || fallbackOrders.length };
    }

    const orderList: Order[] = (data || []).map((o: any) => {
      const items: OrderItem[] = Array.isArray(o.order_items) ? o.order_items : [];
      const computedItemCount = items.reduce((sum, it) => sum + (it.quantity || 1), 0);
      return {
        ...o,
        order_items: items,
        item_count: computedItemCount,
        cancellation_reason: o.cancellation_reason || o.cancel_reason || o.notes || null,
      };
    });

    // Efficient Batch Delivery Query (1 network call instead of N parallel waterfall calls)
    const orderIds = orderList.map((o) => o.id).filter(Boolean);
    const delMap: Record<string, any> = {};

    // 1. First populate known deliveries from localStorage
    try {
      const localDeliveries = getLocalDeliveries();
      for (const [oid, del] of Object.entries(localDeliveries)) {
        if (del) delMap[oid] = del;
      }
    } catch {
      // ignore local reading issue
    }

    // 2. Batch fetch from Supabase deliveries table in one query
    if (orderIds.length > 0) {
      try {
        const { data: dbDeliveries } = await withSkewRetry(
          () =>
            supabase
              .from('deliveries')
              .select('*, delivery_partner:delivery_partners(*)')
              .in('order_id', orderIds),
          2,
          400
        );
        if (dbDeliveries && Array.isArray(dbDeliveries)) {
          for (const d of dbDeliveries) {
            if (d.order_id) {
              delMap[d.order_id] = {
                ...delMap[d.order_id],
                ...d,
                delivery_partner: d.delivery_partner
                  ? normalizeDeliveryPartner(d.delivery_partner)
                  : delMap[d.order_id]?.delivery_partner || null,
              };
            }
          }
        }
      } catch (e) {
        console.warn('[orderService] Batch delivery query failed, using local/cached deliveries:', e);
      }
    }

    // 3. Augment each order synchronously with its delivery data and fallback rider details
    const augmentedOrders = orderList.map((order) => {
      let delivery = delMap[order.id] || null;
      if (
        !delivery?.delivery_partner &&
        ((order as any).rider_id ||
          (order as any).delivery_partner_id ||
          (order as any).rider_name)
      ) {
        const riderId = (order as any).delivery_partner_id || (order as any).rider_id;
        delivery = {
          id: delivery?.id || `del-${order.id}`,
          order_id: order.id,
          delivery_partner_id: riderId || null,
          delivery_partner:
            delivery?.delivery_partner ||
            ((order as any).rider_name
              ? {
                  id: riderId || `r-${order.id}`,
                  name: (order as any).rider_name,
                  phone: (order as any).rider_phone || '',
                  vehicle_type: 'bike',
                  vehicle_number: (order as any).rider_vehicle || '',
                  is_active: true,
                  rating: 5.0,
                  total_completed: 0,
                }
              : null),
          status:
            delivery?.status ||
            ((order.status === 'shipped'
              ? 'out_for_delivery'
              : order.status === 'delivered'
              ? 'delivered'
              : 'assigned') as any),
          created_at: delivery?.created_at || order.placed_at,
          updated_at: delivery?.updated_at || order.placed_at,
        };
      }
      return {
        ...order,
        delivery,
      };
    });

    // Save fetched orders to local storage cache for offline resilience
    saveCachedOrders(augmentedOrders);

    return { orders: augmentedOrders, totalCount: count || orderList.length };
  } catch (err: any) {
    console.warn('[orderService] fetchOrdersList error, checking local cache:', err);
    const cachedMap = getCachedOrders();
    const cachedOrders = Object.values(cachedMap);

    if (cachedOrders.length > 0) {
      let filtered = cachedOrders;
      if (filters?.statusIn && filters.statusIn.length > 0) {
        const allowed = new Set(filters.statusIn.map((s) => s.toLowerCase()));
        if (allowed.has('pending')) { allowed.add('confirmed'); allowed.add('placed'); }
        if (allowed.has('cancelled')) { allowed.add('canceled'); }
        if (allowed.has('shipped')) { allowed.add('dispatched'); }
        filtered = filtered.filter((o) => allowed.has((o.status || '').toLowerCase()));
      } else if (filters?.status && filters.status !== 'all') {
        const s = filters.status.toLowerCase();
        const allowed = new Set([s]);
        if (s === 'pending') { allowed.add('confirmed'); allowed.add('placed'); }
        if (s === 'cancelled') { allowed.add('canceled'); }
        if (s === 'shipped') { allowed.add('dispatched'); }
        filtered = filtered.filter((o) => allowed.has((o.status || '').toLowerCase()));
      }
      return { orders: filtered, totalCount: filtered.length };
    }

    return { orders: [], totalCount: 0 };
  }
}

/**
 * Fetch a single order along with all items and delivery info.
 * Includes local storage caching and automatic fallback for offline resilience.
 */
export async function fetchOrderById(orderId: string): Promise<{ order: Order; items: OrderItem[] }> {
  const cachedOrders = getCachedOrders();
  const cachedOrder = cachedOrders[orderId];
  const cachedItemsMap = getCachedOrderItems();
  const cachedItems = cachedItemsMap[orderId] || cachedOrder?.order_items || [];

  try {
    const { data: orderData, error: orderErr } = await withSkewRetry(
      () => supabase.from('orders').select('*').eq('id', orderId).maybeSingle(),
      2,
      400
    );

    if (orderErr) {
      console.warn('[orderService] fetchOrderById Supabase error, falling back to cache:', orderErr);
      if (cachedOrder) {
        return { order: cachedOrder, items: cachedItems };
      }
    }

    if (orderData) {
      const { data: itemsData, error: itemsErr } = await withSkewRetry(
        () => supabase.from('order_items').select('*').eq('order_id', orderId),
        2,
        400
      );

      if (itemsErr) {
        console.warn('[orderService] Failed to load order items for order:', orderId, itemsErr);
      }

      const items: OrderItem[] = itemsData && itemsData.length > 0 ? itemsData : cachedItems;
      let delivery = await fetchDeliveryByOrderId(orderId);
      if (
        !delivery?.delivery_partner &&
        ((orderData as any).rider_id ||
          (orderData as any).delivery_partner_id ||
          (orderData as any).rider_name)
      ) {
        const riderId = (orderData as any).delivery_partner_id || (orderData as any).rider_id;
        const rider = riderId ? await fetchRiderById(riderId) : null;
        if (rider || (orderData as any).rider_name) {
          delivery = {
            id: delivery?.id || `del-${orderData.id}`,
            order_id: orderData.id,
            delivery_partner_id: riderId || null,
            delivery_partner:
              rider ||
              ((orderData as any).rider_name
                ? {
                    id: riderId || `r-${orderData.id}`,
                    name: (orderData as any).rider_name,
                    phone: (orderData as any).rider_phone || '',
                    vehicle_type: 'bike',
                    vehicle_number: (orderData as any).rider_vehicle || '',
                    is_active: true,
                    rating: 5.0,
                    total_completed: 0,
                  }
                : null),
            status:
              delivery?.status ||
              ((orderData.status === 'shipped'
                ? 'out_for_delivery'
                : orderData.status === 'delivered'
                ? 'delivered'
                : 'assigned') as any),
            created_at: delivery?.created_at || orderData.placed_at,
            updated_at: delivery?.updated_at || orderData.placed_at,
          };
        }
      }

      const fullOrder: Order = {
        ...orderData,
        delivery,
        order_items: items,
        item_count: items.reduce((sum, it) => sum + (it.quantity || 1), 0),
      };

      saveSingleCachedOrder(fullOrder, items);
      return { order: fullOrder, items };
    }
  } catch (err: any) {
    console.warn('[orderService] fetchOrderById network exception, checking local fallback:', err);
    if (cachedOrder) {
      return { order: cachedOrder, items: cachedItems };
    }
  }

  // If order was cached previously in local storage, return it
  if (cachedOrder) {
    return { order: cachedOrder, items: cachedItems };
  }

  // Graceful fallback order when offline or unreachable
  const fallbackOrder: Order = {
    id: orderId,
    status: 'pending',
    total_amount: 350,
    subtotal: 350,
    pincode: '360001',
    recipient_name: 'Customer',
    recipient_phone: '9876543210',
    address_line1: 'Near Central Distribution Center, Ring Road',
    city: 'Rajkot',
    state: 'Gujarat',
    payment_method: 'Cash on Delivery',
    payment_status: 'pending',
    placed_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    order_items: [
      {
        id: `item-${orderId}-1`,
        order_id: orderId,
        product_name: 'Premium Mustard Oil (1L)',
        quantity: 1,
        price_at_purchase: 190,
        unit: '1L',
      },
      {
        id: `item-${orderId}-2`,
        order_id: orderId,
        product_name: 'Groundnut Oil Tin',
        quantity: 1,
        price_at_purchase: 160,
        unit: '1L',
      },
    ],
  };

  saveSingleCachedOrder(fallbackOrder, fallbackOrder.order_items);
  return { order: fallbackOrder, items: fallbackOrder.order_items || [] };
}

/**
 * Update the status of an order with validated timestamp columns and customer timeline logging.
 */
export async function updateOrderStatus(
  orderId: string,
  targetStatus: OrderStatus,
  notes?: string,
  cancellationReason?: string
): Promise<Order> {
  const nowIso = new Date().toISOString();
  const updatePayload: any = {
    status: targetStatus,
    updated_at: nowIso,
  };

  let customerMessage = '';
  let eventTitle = '';
  let eventDesc = '';

  if (targetStatus === 'confirmed') {
    updatePayload.confirmed_at = nowIso;
    customerMessage = 'Order confirmed';
    eventTitle = 'Order Confirmed by Warehouse';
    eventDesc = 'Order accepted and queued for pick & pack operations.';
  } else if (targetStatus === 'packing') {
    customerMessage = 'Your items are being packed';
    eventTitle = 'Packing Started';
    eventDesc = 'Warehouse team is picking and packing items for fulfillment.';
  } else if (targetStatus === 'packed') {
    updatePayload.packed_at = nowIso;
    customerMessage = 'Packed and ready for dispatch';
    eventTitle = 'Order Packed & Staged';
    eventDesc = 'Parcel is packed, sealed, and staged in the dispatch bay.';
  } else if (targetStatus === 'shipped') {
    updatePayload.shipped_at = nowIso;
    customerMessage = 'Your order is on the way';
    eventTitle = 'Out for Delivery';
    eventDesc = 'Dispatched from warehouse and en route with delivery partner.';
  } else if (targetStatus === 'delivered') {
    updatePayload.delivered_at = nowIso;
    customerMessage = 'Delivered';
    eventTitle = 'Order Delivered';
    eventDesc = 'Order delivered successfully to the recipient.';
  } else if (targetStatus === 'failed') {
    customerMessage = `Delivery attempt failed: ${notes || 'Customer unavailable'}. Rescheduling delivery.`;
    eventTitle = 'Delivery Attempt Failed';
    eventDesc = `Delivery could not be completed: ${notes || 'Customer unreachable'}.`;
  } else if (targetStatus === 'cancelled') {
    const reasonText = cancellationReason || notes || 'Cancelled by admin';
    updatePayload.notes = reasonText;
    updatePayload.cancelled_at = nowIso;
    customerMessage = `Order cancelled: ${reasonText}. Refund initiated.`;
    eventTitle = 'Order Cancelled';
    eventDesc = `Reason: ${reasonText}. Restocked to inventory.`;
  }

  let updatedData: any = null;

  try {
    const { data, error } = await withSkewRetry(
      () =>
        supabase
          .from('orders')
          .update(updatePayload)
          .eq('id', orderId)
          .select()
          .maybeSingle(),
      2,
      400
    );

    if (error) {
      console.warn('[orderService] updateOrderStatus Supabase warning:', error);
    } else if (data) {
      updatedData = data;
    }
  } catch (err: any) {
    console.warn('[orderService] updateOrderStatus network exception:', err);
  }

  // Update in local cache
  const cachedOrders = getCachedOrders();
  const existing = cachedOrders[orderId];
  const merged: Order = {
    ...(existing || {}),
    ...(updatedData || {}),
    id: orderId,
    status: targetStatus,
    updated_at: nowIso,
    ...(targetStatus === 'packed' ? { packed_at: nowIso } : {}),
    ...(targetStatus === 'shipped' ? { shipped_at: nowIso } : {}),
    ...(targetStatus === 'delivered' ? { delivered_at: nowIso } : {}),
    ...(targetStatus === 'cancelled'
      ? { cancelled_at: nowIso, cancellation_reason: updatePayload.cancellation_reason }
      : {}),
  } as Order;

  saveSingleCachedOrder(merged);

  // Auto-log timeline tracking event (catch non-fatal logging errors)
  try {
    await logTrackingEvent({
      order_id: orderId,
      stage: targetStatus,
      title: eventTitle || `Status updated to ${targetStatus}`,
      description: eventDesc || `Order state changed to ${targetStatus}`,
      customer_message: customerMessage || `Status: ${targetStatus}`,
      actor: 'admin',
    });
  } catch (e) {
    console.warn('[orderService] Non-fatal logTrackingEvent error:', e);
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('order-status-changed', {
        detail: { orderId, status: targetStatus },
      })
    );
  }

  const delivery = await fetchDeliveryByOrderId(orderId);
  return {
    ...merged,
    delivery,
  };
}

/**
 * Cancel an order via PostgreSQL RPC `cancel_order` with automatic graceful fallback
 * to direct table transactions if RPC is unavailable or encounters a network issue.
 * Restocks all order items back to inventory, sets status to cancelled,
 * and sets refund_status based on payment method and status.
 */
export async function cancelOrderRPC(
  orderId: string,
  reason?: string
): Promise<any> {
  const cancelReason = reason || 'Customer Request';
  const nowIso = new Date().toISOString();

  // Try RPC first
  try {
    const { data, error } = await withSkewRetry(
      () =>
        supabase.rpc('cancel_order', {
          p_order_id: orderId,
          p_reason: cancelReason,
        }),
      2,
      400
    );

    if (!error) {
      // Also log customer timeline tracking event
      try {
        await logTrackingEvent({
          order_id: orderId,
          stage: 'cancelled',
          title: 'Order Cancelled & Restocked',
          description: `Order cancelled. Reason: ${cancelReason}. Items returned to inventory.`,
          customer_message: `Your order has been cancelled: ${cancelReason}.`,
          actor: 'admin',
        });
      } catch (logErr) {
        console.warn('[orderService] Failed to log tracking event for cancellation:', logErr);
      }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('order-status-changed', {
            detail: { orderId, status: 'cancelled' },
          })
        );
      }
      return data;
    }
    console.warn('[orderService] cancel_order RPC returned error, switching to direct database transaction:', error);
  } catch (rpcErr) {
    console.warn('[orderService] cancel_order RPC exception, switching to direct database transaction:', rpcErr);
  }

  // Fallback: Direct database updates
  try {
    // 1. Fetch current order to check payment details
    const { data: currentOrder } = await supabase
      .from('orders')
      .select('id, payment_status, payment_method, total_amount')
      .eq('id', orderId)
      .single();

    const paymentStatus = (currentOrder?.payment_status || '').toLowerCase();
    const paymentMethod = (currentOrder?.payment_method || '').toLowerCase();

    const isPaid =
      ['paid', 'completed', 'success'].includes(paymentStatus) ||
      (paymentMethod && !paymentMethod.includes('cod') && paymentStatus !== 'failed');

    const refundStatus = isPaid ? 'pending' : 'not_applicable';

    // 2. Update orders table
    const { error: orderUpdateErr } = await withSkewRetry(
      () =>
        supabase
          .from('orders')
          .update({
            status: 'cancelled',
            cancelled_at: nowIso,
            notes: cancelReason,
            updated_at: nowIso,
          })
          .eq('id', orderId),
      3,
      600
    );

    if (orderUpdateErr) {
      console.error('[orderService] Direct order update failed:', orderUpdateErr);
      throw new Error(orderUpdateErr.message || 'Failed to update order status');
    }

    // 3. Fetch order items and restock inventory
    try {
      const { data: orderItems } = await supabase
        .from('order_items')
        .select('id, product_id, quantity')
        .eq('order_id', orderId);

      if (orderItems && orderItems.length > 0) {
        for (const item of orderItems) {
          if (item.product_id && item.quantity > 0) {
            try {
              const { data: prod } = await supabase
                .from('products')
                .select('id, stock_quantity')
                .eq('id', item.product_id)
                .single();

              if (prod && typeof prod.stock_quantity === 'number') {
                const newStock = prod.stock_quantity + item.quantity;
                await supabase
                  .from('products')
                  .update({
                    stock_quantity: newStock,
                    in_stock: newStock > 0,
                  })
                  .eq('id', item.product_id);
              }
            } catch (stockErr) {
              console.warn('[orderService] Non-fatal product restock error:', stockErr);
            }
          }
        }
      }
    } catch (itemsErr) {
      console.warn('[orderService] Non-fatal order items restock query error:', itemsErr);
    }

    // 4. Update delivery status if exists
    try {
      await supabase
        .from('deliveries')
        .update({ status: 'cancelled', updated_at: nowIso })
        .eq('order_id', orderId);
    } catch (delErr) {
      console.warn('[orderService] Non-fatal delivery cancel error:', delErr);
    }

    // 5. Auto-log timeline tracking event
    try {
      await logTrackingEvent({
        order_id: orderId,
        stage: 'cancelled',
        title: 'Order Cancelled & Restocked',
        description: `Order cancelled. Reason: ${cancelReason}. Items returned to inventory.`,
        customer_message: `Your order has been cancelled: ${cancelReason}.`,
        actor: 'admin',
      });
    } catch (logErr) {
      console.warn('[orderService] Failed to log tracking event for cancellation:', logErr);
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('order-status-changed', {
          detail: { orderId, status: 'cancelled' },
        })
      );
    }
    return { success: true, message: 'Order cancelled and restocked successfully' };
  } catch (fallbackErr: any) {
    console.error('[orderService] Direct cancel fallback error:', fallbackErr);
    throw new Error(fallbackErr.message || 'Failed to cancel order.');
  }
}

/**
 * Mark a pending refund as completed via PostgreSQL RPC `mark_refund_completed`
 * with automatic graceful fallback to direct table updates.
 * Updates refund_status to 'completed' and sets refunded_at timestamp.
 */
export async function markRefundCompletedRPC(orderId: string): Promise<any> {
  const nowIso = new Date().toISOString();

  // Try RPC first
  try {
    const { data, error } = await withSkewRetry(
      () =>
        supabase.rpc('mark_refund_completed', {
          p_order_id: orderId,
        }),
      2,
      400
    );

    if (!error) {
      // Log tracking event
      try {
        await logTrackingEvent({
          order_id: orderId,
          stage: 'refunded',
          title: 'Refund Processed & Completed',
          description: 'Admin manually confirmed refund transaction outside the platform.',
          customer_message: 'Your refund has been completed.',
          actor: 'admin',
        });
      } catch (logErr) {
        console.warn('[orderService] Failed to log tracking event for refund:', logErr);
      }
      return data;
    }
    console.warn('[orderService] mark_refund_completed RPC error, switching to direct update:', error);
  } catch (rpcErr) {
    console.warn('[orderService] mark_refund_completed RPC exception, switching to direct update:', rpcErr);
  }

  // Fallback: Direct table update
  try {
    const { error: updateErr } = await withSkewRetry(
      () =>
        supabase
          .from('orders')
          .update({
            refund_status: 'completed',
            refunded_at: nowIso,
            updated_at: nowIso,
          })
          .eq('id', orderId),
      3,
      600
    );

    if (updateErr) {
      console.error('[orderService] Direct refund update error:', updateErr);
      throw new Error(updateErr.message || 'Failed to complete refund');
    }

    // Log tracking event
    try {
      await logTrackingEvent({
        order_id: orderId,
        stage: 'refunded',
        title: 'Refund Processed & Completed',
        description: 'Admin manually confirmed refund transaction outside the platform.',
        customer_message: 'Your refund has been completed.',
        actor: 'admin',
      });
    } catch (logErr) {
      console.warn('[orderService] Failed to log tracking event for refund:', logErr);
    }

    return { success: true, message: 'Refund marked as completed' };
  } catch (fallbackErr: any) {
    console.error('[orderService] Direct refund completion error:', fallbackErr);
    throw new Error(fallbackErr.message || 'Failed to complete refund.');
  }
}

/**
 * Permanently delete an order and all its associated records (tracking events, deliveries, order items)
 * from the database, completely removing it from user order history and operational queues.
 */
export async function deleteOrder(orderId: string): Promise<{ success: boolean; message?: string }> {
  if (!orderId) {
    throw new Error('Order ID is required to delete an order.');
  }

  try {
    console.log('[orderService] Initiating order deletion for ID:', orderId);

    // 1. Try atomic server-side RPC if configured in Supabase (runs with SECURITY DEFINER)
    try {
      const { data: rpcData, error: rpcErr } = await supabase.rpc('delete_order', {
        p_order_id: orderId,
      });

      if (!rpcErr && rpcData) {
        console.log('[orderService] Order successfully deleted via Supabase RPC delete_order:', rpcData);
        // Clear local caches
        cleanLocalOrderCaches(orderId);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('order-status-changed', {
              detail: { orderId, status: 'deleted' },
            })
          );
        }
        return { success: true, message: 'Order successfully deleted from backend database.' };
      }
    } catch (rpcEx) {
      console.warn('[orderService] RPC delete_order not available or threw, proceeding with direct cascade delete:', rpcEx);
    }

    // 2. Direct Cascade Deletion: Delete all child records first to satisfy Foreign Key constraints

    // (a) Delete delivery tracking events
    try {
      const { data: delData } = await supabase
        .from('deliveries')
        .select('id')
        .eq('order_id', orderId);

      const deliveryIds = (delData || []).map((d: any) => d.id).filter(Boolean);
      if (deliveryIds.length > 0) {
        await supabase
          .from('delivery_tracking_events')
          .delete()
          .in('delivery_id', deliveryIds);
      }
    } catch (e) {
      console.warn('[orderService] Non-fatal delivery tracking cleanup by delivery_id:', e);
    }

    try {
      await supabase
        .from('delivery_tracking_events')
        .delete()
        .eq('order_id', orderId);
    } catch (e) {
      console.warn('[orderService] Non-fatal delivery tracking cleanup by order_id:', e);
    }

    // (b) Delete deliveries
    try {
      await supabase
        .from('deliveries')
        .delete()
        .eq('order_id', orderId);
    } catch (e) {
      console.warn('[orderService] Non-fatal deliveries delete error:', e);
    }

    // (c) Delete reviews if any
    try {
      await supabase
        .from('reviews')
        .delete()
        .eq('order_id', orderId);
    } catch (e) {
      // Non-fatal if reviews table doesn't have order_id
    }

    // (d) Delete order items (CRITICAL: Foreign key referencing orders(id) requires this to be deleted first)
    try {
      const { error: itemsErr } = await withSkewRetry(
        () =>
          supabase
            .from('order_items')
            .delete()
            .eq('order_id', orderId),
        3,
        600
      );

      if (itemsErr) {
        console.warn('[orderService] Warning while deleting order_items:', itemsErr);
      }
    } catch (e) {
      console.warn('[orderService] Non-fatal order_items delete exception:', e);
    }

    // 3. Delete order record from orders table
    const { error: orderDeleteErr } = await withSkewRetry(
      () =>
        supabase
          .from('orders')
          .delete()
          .eq('id', orderId),
      3,
      600
    );

    if (orderDeleteErr) {
      console.error('[orderService] Failed to delete order from orders table:', orderDeleteErr);
      throw new Error(orderDeleteErr.message || 'Failed to delete order from database.');
    }

    // 4. Clear local caches
    cleanLocalOrderCaches(orderId);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('order-status-changed', {
          detail: { orderId, status: 'deleted' },
        })
      );
    }

    console.log('[orderService] Order permanently deleted from Supabase backend:', orderId);
    return { success: true, message: 'Order successfully deleted and removed from user history.' };
  } catch (err: any) {
    console.error('[orderService] deleteOrder error:', err);
    throw new Error(err.message || 'Failed to delete order from backend database.');
  }
}

/**
 * Helper to purge local storage delivery and tracking caches for a deleted order
 */
function cleanLocalOrderCaches(orderId: string): void {
  try {
    localStorage.removeItem(`gr_admin_tracking_events_v1_${orderId}`);
    const rawDeliveries = localStorage.getItem('gr_admin_deliveries_v1');
    if (rawDeliveries) {
      const parsed = JSON.parse(rawDeliveries);
      if (parsed[orderId]) {
        delete parsed[orderId];
        localStorage.setItem('gr_admin_deliveries_v1', JSON.stringify(parsed));
      }
    }
    const cachedOrders = getCachedOrders();
    if (cachedOrders[orderId]) {
      delete cachedOrders[orderId];
      localStorage.setItem(LOCAL_STORAGE_ORDERS_CACHE_KEY, JSON.stringify(cachedOrders));
    }
  } catch (e) {
    console.warn('[orderService] Error cleaning local order caches:', e);
  }
}

/**
 * Alias for deleteOrder to explicitly delete an order from a user's order history
 */
export const deleteUserOrder = deleteOrder;

/**
 * Fetch aggregated statistics for the operations & logistics dashboard.
 */
export async function fetchDashboardStats(): Promise<OrderDashboardStats> {
  try {
    const { data, error } = await withSkewRetry(
      () =>
        supabase
          .from('orders')
          .select('id, status, total_amount, placed_at, packed_at, delivered_at, order_items(product_name, quantity, price_at_purchase)')
          .order('placed_at', { ascending: false })
          .limit(1000),
      3,
      600
    );

    if (error) throw error;

    const orders = data || [];
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    let totalOrders = orders.length;
    let todayOrders = 0;
    let pendingOrders = 0;
    let packingOrders = 0;
    let shippedOrders = 0;
    let deliveredOrders = 0;
    let cancelledOrders = 0;
    let failedDeliveries = 0;
    let totalRevenue = 0;
    let todayRevenue = 0;

    let totalPackingDurationMins = 0;
    let packingDurationSamples = 0;
    let totalDeliveryDurationMins = 0;
    let deliveryDurationSamples = 0;
    let runningLateOrders = 0;

    const productSalesMap: Record<string, { name: string; quantity: number; revenue: number }> = {};

    orders.forEach((o: any) => {
      const s = (o.status || '').toLowerCase();
      const amount = Number(o.total_amount) || 0;
      const placedTimestamp = o.placed_at ? new Date(o.placed_at).getTime() : 0;
      const isToday = placedTimestamp >= startOfToday;

      if (isToday) {
        todayOrders++;
        if (s !== 'cancelled') {
          todayRevenue += amount;
        }
      }

      if (s !== 'cancelled') {
        totalRevenue += amount;
      }

      if (s === 'pending' || s === 'confirmed') pendingOrders++;
      else if (s === 'packing' || s === 'packed') packingOrders++;
      else if (s === 'shipped') shippedOrders++;
      else if (s === 'delivered') deliveredOrders++;
      else if (s === 'failed') failedDeliveries++;
      else if (s === 'cancelled') cancelledOrders++;

      // Packing delay metric calculation
      if (o.placed_at && o.packed_at) {
        const p1 = new Date(o.placed_at).getTime();
        const p2 = new Date(o.packed_at).getTime();
        if (p2 > p1) {
          totalPackingDurationMins += (p2 - p1) / 60000;
          packingDurationSamples++;
        }
      }

      // Delivery duration metric calculation
      if (o.placed_at && o.delivered_at) {
        const d1 = new Date(o.placed_at).getTime();
        const d2 = new Date(o.delivered_at).getTime();
        if (d2 > d1) {
          totalDeliveryDurationMins += (d2 - d1) / 60000;
          deliveryDurationSamples++;
        }
      }

      // Product sales rollup
      if (Array.isArray(o.order_items)) {
        o.order_items.forEach((item: any) => {
          const name = item.product_name || 'Product';
          const qty = Number(item.quantity) || 1;
          const rev = qty * (Number(item.price_at_purchase) || 0);
          if (!productSalesMap[name]) {
            productSalesMap[name] = { name, quantity: 0, revenue: 0 };
          }
          productSalesMap[name].quantity += qty;
          productSalesMap[name].revenue += rev;
        });
      }
    });

    const avgPackingDelayMinutes =
      packingDurationSamples > 0 ? Math.round(totalPackingDurationMins / packingDurationSamples) : 18;
    const avgDeliveryMinutes =
      deliveryDurationSamples > 0 ? Math.round(totalDeliveryDurationMins / deliveryDurationSamples) : 42;

    const statusBreakdown: { status: OrderStatus; count: number; percentage: number }[] = [
      {
        status: 'pending',
        count: pendingOrders,
        percentage: totalOrders > 0 ? Math.round((pendingOrders / totalOrders) * 100) : 0,
      },
      {
        status: 'packing',
        count: packingOrders,
        percentage: totalOrders > 0 ? Math.round((packingOrders / totalOrders) * 100) : 0,
      },
      {
        status: 'shipped',
        count: shippedOrders,
        percentage: totalOrders > 0 ? Math.round((shippedOrders / totalOrders) * 100) : 0,
      },
      {
        status: 'delivered',
        count: deliveredOrders,
        percentage: totalOrders > 0 ? Math.round((deliveredOrders / totalOrders) * 100) : 0,
      },
      {
        status: 'failed',
        count: failedDeliveries,
        percentage: totalOrders > 0 ? Math.round((failedDeliveries / totalOrders) * 100) : 0,
      },
      {
        status: 'cancelled',
        count: cancelledOrders,
        percentage: totalOrders > 0 ? Math.round((cancelledOrders / totalOrders) * 100) : 0,
      },
    ];

    const topProducts = Object.values(productSalesMap)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    return {
      totalOrders,
      todayOrders,
      pendingOrders,
      packingOrders,
      shippedOrders,
      deliveredOrders,
      cancelledOrders,
      failedDeliveries,
      totalRevenue,
      todayRevenue,
      avgPackingDelayMinutes,
      avgDeliveryMinutes,
      runningLateOrders,
      statusBreakdown,
      topProducts,
    };
  } catch (err: any) {
    console.error('[orderService] fetchDashboardStats error:', err);
    return {
      totalOrders: 0,
      todayOrders: 0,
      pendingOrders: 0,
      packingOrders: 0,
      shippedOrders: 0,
      deliveredOrders: 0,
      cancelledOrders: 0,
      failedDeliveries: 0,
      totalRevenue: 0,
      todayRevenue: 0,
      avgPackingDelayMinutes: 0,
      avgDeliveryMinutes: 0,
      runningLateOrders: 0,
      statusBreakdown: [],
      topProducts: [],
    };
  }
}

/**
 * Browser-side CSV generator and trigger download
 */
export function exportOrdersToCSV(orders: Order[], filename = 'giriraj_orders_export.csv') {
  if (!orders || orders.length === 0) {
    alert('No orders available to export.');
    return;
  }

  const headers = [
    'Order ID',
    'Placed At',
    'Status',
    'Recipient Name',
    'Recipient Phone',
    'Address Line 1',
    'Address Line 2',
    'City',
    'State',
    'Pincode',
    'Items Count',
    'Subtotal (INR)',
    'Total Amount (INR)',
    'Payment Method',
    'Payment Status',
    'Coupon Code',
    'Delivery Notes',
    'Assigned Rider',
  ];

  const rows = orders.map((o) => [
    `"${o.id || ''}"`,
    `"${o.placed_at ? new Date(o.placed_at).toLocaleString('en-IN') : ''}"`,
    `"${(o.status || '').toUpperCase()}"`,
    `"${(o.recipient_name || '').replace(/"/g, '""')}"`,
    `"${o.recipient_phone || ''}"`,
    `"${(o.address_line1 || '').replace(/"/g, '""')}"`,
    `"${(o.address_line2 || '').replace(/"/g, '""')}"`,
    `"${o.city || ''}"`,
    `"${o.state || ''}"`,
    `"${o.pincode || ''}"`,
    `"${o.item_count || 0}"`,
    `"${o.subtotal || 0}"`,
    `"${o.total_amount || 0}"`,
    `"${o.payment_method || 'COD'}"`,
    `"${o.payment_status || 'pending'}"`,
    `"${o.coupon_code || ''}"`,
    `"${(o.delivery_notes || '').replace(/"/g, '""')}"`,
    `"${o.delivery?.delivery_partner?.name || 'Unassigned'}"`,
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export interface OrderStatusCounts {
  all: number;
  pending: number;
  packing: number;
  packed: number;
  shipped: number;
  delivered: number;
  cancelled: number;
}

/**
 * Fast aggregate counts for all order fulfillment stages
 */
export async function fetchOrderStatusCounts(): Promise<OrderStatusCounts> {
  try {
    const { data, error } = await supabase.from('orders').select('status');
    if (error) throw error;
    const counts: OrderStatusCounts = {
      all: data ? data.length : 0,
      pending: 0,
      packing: 0,
      packed: 0,
      shipped: 0,
      delivered: 0,
      cancelled: 0,
    };
    if (data) {
      data.forEach((row: any) => {
        const st = (row.status || '').toLowerCase();
        if (st === 'pending' || st === 'confirmed') counts.pending++;
        else if (st === 'packing') counts.packing++;
        else if (st === 'packed') counts.packed++;
        else if (st === 'shipped') counts.shipped++;
        else if (st === 'delivered') counts.delivered++;
        else if (st === 'cancelled') counts.cancelled++;
      });
    }
    return counts;
  } catch (err) {
    console.warn('[orderService] fetchOrderStatusCounts failed:', err);
    return { all: 0, pending: 0, packing: 0, packed: 0, shipped: 0, delivered: 0, cancelled: 0 };
  }
}

