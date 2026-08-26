import { supabase } from '../lib/supabaseClient';
import { withSkewRetry } from '../utils/supabaseHelper';
import {
  Delivery,
  DeliveryPartner,
  DeliveryStatus,
  DeliveryTrackingEvent,
  OrderStatus,
  ProofOfDelivery,
} from '../types';

const LOCAL_STORAGE_PARTNERS_KEY = 'gr_admin_delivery_partners_v1';
const LOCAL_STORAGE_DELIVERIES_KEY = 'gr_admin_deliveries_v1';
const LOCAL_STORAGE_EVENTS_KEY = 'gr_admin_tracking_events_v1';

// No default/demo partners - starts with a clean slate
const DEFAULT_PARTNERS: DeliveryPartner[] = [];

// Helper: Local fallback store read/write
function getLocalPartners(): DeliveryPartner[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_PARTNERS_KEY);
    if (raw) {
      const parsed: DeliveryPartner[] = JSON.parse(raw);
      // Filter out any legacy demo partners (dp-101, dp-102, dp-103, dp-104)
      const clean = parsed.filter(
        (p) => !['dp-101', 'dp-102', 'dp-103', 'dp-104'].includes(p.id)
      );
      if (clean.length !== parsed.length) {
        localStorage.setItem(LOCAL_STORAGE_PARTNERS_KEY, JSON.stringify(clean));
      }
      return clean;
    }
  } catch (e) {
    console.warn('Error reading local delivery partners:', e);
  }
  localStorage.setItem(LOCAL_STORAGE_PARTNERS_KEY, JSON.stringify([]));
  return [];
}

function saveLocalPartners(partners: DeliveryPartner[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_PARTNERS_KEY, JSON.stringify(partners));
  } catch (e) {
    console.warn('Error saving local delivery partners:', e);
  }
}

function getLocalDeliveries(): Record<string, Delivery> {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_DELIVERIES_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('Error reading local deliveries:', e);
  }
  return {};
}

function saveLocalDelivery(delivery: Delivery) {
  try {
    const all = getLocalDeliveries();
    all[delivery.order_id] = delivery;
    localStorage.setItem(LOCAL_STORAGE_DELIVERIES_KEY, JSON.stringify(all));
  } catch (e) {
    console.warn('Error saving local delivery:', e);
  }
}

function getLocalEvents(orderId: string): DeliveryTrackingEvent[] {
  try {
    const raw = localStorage.getItem(`${LOCAL_STORAGE_EVENTS_KEY}_${orderId}`);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('Error reading local tracking events:', e);
  }
  return [];
}

function saveLocalEvent(event: DeliveryTrackingEvent) {
  try {
    const existing = getLocalEvents(event.order_id);
    const updated = [event, ...existing];
    localStorage.setItem(`${LOCAL_STORAGE_EVENTS_KEY}_${event.order_id}`, JSON.stringify(updated));
  } catch (e) {
    console.warn('Error saving local tracking event:', e);
  }
}

/**
 * Fetch all delivery partners
 */
export async function fetchDeliveryPartners(): Promise<DeliveryPartner[]> {
  try {
    const { data, error } = await withSkewRetry(
      () => supabase.from('delivery_partners').select('*').order('name'),
      2,
      400
    );

    if (error || !data || data.length === 0) {
      return getLocalPartners();
    }

    return data as DeliveryPartner[];
  } catch {
    return getLocalPartners();
  }
}

/**
 * Save / update delivery partner
 */
export async function saveDeliveryPartner(partner: Partial<DeliveryPartner> & { name: string; phone: string }): Promise<DeliveryPartner> {
  const isNew = !partner.id;
  const partnerId = partner.id || `dp-${Date.now()}`;
  const record: DeliveryPartner = {
    id: partnerId,
    name: partner.name,
    phone: partner.phone,
    vehicle_type: partner.vehicle_type || 'bike',
    vehicle_number: partner.vehicle_number || '',
    is_active: partner.is_active !== undefined ? partner.is_active : true,
    rating: partner.rating || 5.0,
    total_completed: partner.total_completed || 0,
    current_active_orders: partner.current_active_orders || 0,
    avatar_url: partner.avatar_url || null,
    created_at: partner.created_at || new Date().toISOString(),
  };

  try {
    const { data, error } = await supabase
      .from('delivery_partners')
      .upsert(record)
      .select()
      .single();

    if (!error && data) {
      // Sync local
      const local = getLocalPartners();
      const idx = local.findIndex((p) => p.id === record.id);
      if (idx >= 0) local[idx] = data as DeliveryPartner;
      else local.push(data as DeliveryPartner);
      saveLocalPartners(local);
      return data as DeliveryPartner;
    }
  } catch (e) {
    console.warn('Supabase partner save fallback to local:', e);
  }

  // Fallback local update
  const local = getLocalPartners();
  const idx = local.findIndex((p) => p.id === record.id);
  if (idx >= 0) {
    local[idx] = { ...local[idx], ...record };
  } else {
    local.push(record);
  }
  saveLocalPartners(local);
  return record;
}

/**
 * Toggle Partner active state
 */
export async function togglePartnerActiveStatus(partnerId: string, isActive: boolean): Promise<void> {
  try {
    await supabase.from('delivery_partners').update({ is_active: isActive }).eq('id', partnerId);
  } catch {}
  const local = getLocalPartners();
  const target = local.find((p) => p.id === partnerId);
  if (target) {
    target.is_active = isActive;
    saveLocalPartners(local);
  }
}

/**
 * Delete a delivery partner
 */
export async function deleteDeliveryPartner(partnerId: string): Promise<void> {
  try {
    await supabase.from('delivery_partners').delete().eq('id', partnerId);
  } catch (e) {
    console.warn('Supabase partner delete fallback:', e);
  }
  const local = getLocalPartners();
  const filtered = local.filter((p) => p.id !== partnerId);
  saveLocalPartners(filtered);
}

/**
 * Clear all delivery partners
 */
export async function clearAllDeliveryPartners(): Promise<void> {
  try {
    await supabase.from('delivery_partners').delete().neq('id', '');
  } catch (e) {
    console.warn('Supabase partners clear all fallback:', e);
  }
  saveLocalPartners([]);
}

/**
 * Fetch delivery record for an order
 */
export async function fetchDeliveryByOrderId(orderId: string): Promise<Delivery | null> {
  try {
    const { data, error } = await withSkewRetry(
      () =>
        supabase
          .from('deliveries')
          .select('*, delivery_partner:delivery_partners(*)')
          .eq('order_id', orderId)
          .single(),
      2,
      400
    );

    if (!error && data) {
      return data as Delivery;
    }
  } catch (e) {
    // Fallback to local
  }

  const localDeliveries = getLocalDeliveries();
  const local = localDeliveries[orderId];
  if (local) {
    // Attach partner if present
    if (local.delivery_partner_id) {
      const partners = getLocalPartners();
      local.delivery_partner = partners.find((p) => p.id === local.delivery_partner_id) || null;
    }
    return local;
  }

  return null;
}

/**
 * Create or assign delivery partner to order
 */
export async function assignDeliveryPartner(
  orderId: string,
  partnerId: string,
  estimatedMinutes = 30,
  notes?: string
): Promise<Delivery> {
  const nowIso = new Date().toISOString();
  const estimatedDeliveryAt = new Date(Date.now() + estimatedMinutes * 60000).toISOString();
  const partners = await fetchDeliveryPartners();
  const partner = partners.find((p) => p.id === partnerId);

  const deliveryData: Delivery = {
    id: `del-${orderId}`,
    order_id: orderId,
    delivery_partner_id: partnerId,
    delivery_partner: partner || null,
    status: 'assigned',
    assigned_at: nowIso,
    estimated_delivery_at: estimatedDeliveryAt,
    delivery_notes: notes || null,
    created_at: nowIso,
    updated_at: nowIso,
  };

  try {
    await supabase.from('deliveries').upsert({
      id: deliveryData.id,
      order_id: orderId,
      delivery_partner_id: partnerId,
      status: 'assigned',
      assigned_at: nowIso,
      estimated_delivery_at: estimatedDeliveryAt,
      delivery_notes: notes,
      updated_at: nowIso,
    });
  } catch (e) {
    console.warn('Supabase delivery upsert fallback:', e);
  }

  saveLocalDelivery(deliveryData);

  // Add timeline tracking event
  await logTrackingEvent({
    order_id: orderId,
    delivery_id: deliveryData.id,
    stage: 'assigned',
    title: 'Delivery Partner Assigned',
    description: `Assigned to ${partner?.name || 'Rider'} (${partner?.phone || 'Contact available'}). Estimated delivery in ${estimatedMinutes} mins.`,
    customer_message: `Assigned to ${partner?.name || 'delivery partner'} (${partner?.phone || 'Contact'})`,
    actor: 'admin',
  });

  return deliveryData;
}

/**
 * Update delivery progression and synchronize with order status & customer timeline
 */
export async function updateDeliveryStatus(
  orderId: string,
  newDeliveryStatus: DeliveryStatus,
  extra?: {
    locationName?: string;
    proofOfDelivery?: ProofOfDelivery;
    failureReason?: string;
    failureAction?: 'reschedule' | 'return_to_store' | 'refund';
    notes?: string;
  }
): Promise<Delivery> {
  const nowIso = new Date().toISOString();
  let existing = await fetchDeliveryByOrderId(orderId);

  if (!existing) {
    existing = {
      id: `del-${orderId}`,
      order_id: orderId,
      status: newDeliveryStatus,
      created_at: nowIso,
      updated_at: nowIso,
    };
  }

  existing.status = newDeliveryStatus;
  existing.updated_at = nowIso;

  let customerMsg = '';
  let eventTitle = '';
  let eventDesc = '';
  let correspondingOrderStatus: OrderStatus | null = null;

  switch (newDeliveryStatus) {
    case 'picked_up':
      existing.picked_up_at = nowIso;
      customerMsg = 'Order picked up';
      eventTitle = 'Order Picked Up by Partner';
      eventDesc = 'Delivery partner has picked up the packed parcel from warehouse.';
      correspondingOrderStatus = 'shipped';
      break;

    case 'out_for_delivery':
      existing.out_for_delivery_at = nowIso;
      customerMsg = 'Your order is on the way';
      eventTitle = 'Out for Delivery';
      eventDesc = 'Rider is en route to customer destination.';
      correspondingOrderStatus = 'shipped';
      break;

    case 'near_destination':
      existing.near_destination_at = nowIso;
      customerMsg = 'Your delivery partner is nearby';
      eventTitle = 'Rider Nearby (Arriving Soon)';
      eventDesc = `Delivery partner has entered customer drop zone${extra?.locationName ? ` near ${extra.locationName}` : ''}.`;
      correspondingOrderStatus = 'shipped';
      break;

    case 'delivered':
      existing.delivered_at = nowIso;
      if (extra?.proofOfDelivery) {
        existing.proof_of_delivery = extra.proofOfDelivery;
      }
      customerMsg = 'Delivered';
      eventTitle = 'Order Delivered Successfully';
      eventDesc = `Delivered to ${extra?.proofOfDelivery?.recipient_name || 'Customer'}. POD verified via ${extra?.proofOfDelivery?.method?.toUpperCase() || 'standard confirmation'}.`;
      correspondingOrderStatus = 'delivered';
      break;

    case 'failed':
      existing.failure_reason = extra?.failureReason || 'Customer unavailable';
      existing.failure_action = extra?.failureAction || 'reschedule';
      customerMsg = `Delivery attempt failed: ${extra?.failureReason || 'Customer unavailable'}. Action: ${extra?.failureAction === 'refund' ? 'Refund initiated' : 'Rescheduling delivery'}.`;
      eventTitle = 'Delivery Attempt Failed';
      eventDesc = `Failure reason: ${existing.failure_reason}. Next step: ${existing.failure_action}.`;
      correspondingOrderStatus = 'failed';
      break;

    case 'returned':
      customerMsg = 'Order returned to store';
      eventTitle = 'Parcel Returned to Warehouse';
      eventDesc = 'Parcel restocked in warehouse inventory.';
      correspondingOrderStatus = 'cancelled';
      break;

    default:
      customerMsg = 'Delivery status updated';
      eventTitle = 'Delivery Update';
      eventDesc = `Status moved to ${newDeliveryStatus}`;
  }

  // Update Supabase if deliveries table exists
  try {
    const payload: any = {
      status: newDeliveryStatus,
      updated_at: nowIso,
    };
    if (existing.picked_up_at) payload.picked_up_at = existing.picked_up_at;
    if (existing.out_for_delivery_at) payload.out_for_delivery_at = existing.out_for_delivery_at;
    if (existing.delivered_at) payload.delivered_at = existing.delivered_at;
    if (existing.proof_of_delivery) payload.proof_of_delivery = existing.proof_of_delivery;
    if (existing.failure_reason) payload.failure_reason = existing.failure_reason;
    if (existing.failure_action) payload.failure_action = existing.failure_action;

    await supabase.from('deliveries').update(payload).eq('order_id', orderId);
  } catch (e) {
    console.warn('Supabase delivery update error:', e);
  }

  // Also sync order status in orders table if needed
  if (correspondingOrderStatus) {
    try {
      const orderPayload: any = {
        status: correspondingOrderStatus,
        updated_at: nowIso,
      };
      if (correspondingOrderStatus === 'shipped') orderPayload.shipped_at = nowIso;
      if (correspondingOrderStatus === 'delivered') orderPayload.delivered_at = nowIso;

      await supabase.from('orders').update(orderPayload).eq('id', orderId);
    } catch (e) {
      console.warn('Supabase order status sync error:', e);
    }
  }

  saveLocalDelivery(existing);

  // Log tracking milestone
  await logTrackingEvent({
    order_id: orderId,
    delivery_id: existing.id,
    stage: newDeliveryStatus,
    title: eventTitle,
    description: eventDesc,
    customer_message: customerMsg,
    location_name: extra?.locationName || null,
    actor: 'delivery_partner',
  });

  return existing;
}

/**
 * Log a tracking event (visible in Customer Tracking Timeline)
 */
export async function logTrackingEvent(event: {
  order_id: string;
  delivery_id?: string | null;
  stage: string;
  title: string;
  description: string;
  customer_message: string;
  actor: 'system' | 'admin' | 'delivery_partner' | 'customer';
  location_name?: string | null;
}): Promise<DeliveryTrackingEvent> {
  const fullEvent: DeliveryTrackingEvent = {
    id: `evt-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    order_id: event.order_id,
    delivery_id: event.delivery_id || null,
    stage: event.stage,
    title: event.title,
    description: event.description,
    customer_message: event.customer_message,
    actor: event.actor,
    location_name: event.location_name || null,
    created_at: new Date().toISOString(),
  };

  try {
    await supabase.from('delivery_tracking_events').insert(fullEvent);
  } catch (e) {
    // fallback
  }

  saveLocalEvent(fullEvent);
  return fullEvent;
}

/**
 * Fetch all tracking events for order
 */
export async function fetchTrackingEvents(orderId: string): Promise<DeliveryTrackingEvent[]> {
  try {
    const { data, error } = await withSkewRetry(
      () =>
        supabase
          .from('delivery_tracking_events')
          .select('*')
          .eq('order_id', orderId)
          .order('created_at', { ascending: false }),
      2,
      400
    );

    if (!error && data && data.length > 0) {
      return data as DeliveryTrackingEvent[];
    }
  } catch (e) {}

  const local = getLocalEvents(orderId);
  return local;
}

/**
 * Record Proof of Delivery for an order and update delivery status
 */
export async function saveProofOfDelivery(
  orderId: string,
  pod: ProofOfDelivery
): Promise<Delivery> {
  return updateDeliveryStatus(orderId, 'delivered', {
    proofOfDelivery: pod,
  });
}

/**
 * Record a failed delivery attempt and failure notes
 */
export async function markDeliveryFailed(
  orderId: string,
  reason: string,
  action: 'reschedule' | 'return_to_store' | 'refund' = 'reschedule',
  notes?: string
): Promise<Delivery> {
  return updateDeliveryStatus(orderId, 'failed', {
    failureReason: reason,
    failureAction: action,
    notes,
  });
}

/**
 * Generates SQL migration script for Supabase Database
 */
export function getLogisticsSchemaSQL(): string {
  return `-- ==============================================================================
-- GIRIRAJ POWER WAREHOUSE - LOGISTICS & DELIVERY SCHEMA MIGRATION
-- Run this in your Supabase SQL Editor to enable real-time delivery tracking
-- ==============================================================================

-- 1. Delivery Partners Table
CREATE TABLE IF NOT EXISTS public.delivery_partners (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    vehicle_type TEXT DEFAULT 'bike',
    vehicle_number TEXT,
    is_active BOOLEAN DEFAULT true,
    rating NUMERIC(3, 2) DEFAULT 5.0,
    total_completed INTEGER DEFAULT 0,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Deliveries Table (1 per order)
CREATE TABLE IF NOT EXISTS public.deliveries (
    id TEXT PRIMARY KEY,
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
    delivery_partner_id TEXT REFERENCES public.delivery_partners(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'unassigned',
    assigned_at TIMESTAMPTZ,
    picked_up_at TIMESTAMPTZ,
    out_for_delivery_at TIMESTAMPTZ,
    near_destination_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    estimated_delivery_at TIMESTAMPTZ,
    proof_of_delivery JSONB,
    failure_reason TEXT,
    failure_action TEXT,
    delivery_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Delivery Tracking Events Table (Customer timeline feed)
CREATE TABLE IF NOT EXISTS public.delivery_tracking_events (
    id TEXT PRIMARY KEY,
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
    delivery_id TEXT REFERENCES public.deliveries(id) ON DELETE CASCADE,
    stage TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    customer_message TEXT NOT NULL,
    actor TEXT DEFAULT 'admin',
    location_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for lightning fast lookups
CREATE INDEX IF NOT EXISTS idx_deliveries_order_id ON public.deliveries(order_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_status ON public.deliveries(status);
CREATE INDEX IF NOT EXISTS idx_tracking_events_order_id ON public.delivery_tracking_events(order_id);

-- Enable Row Level Security (RLS) & Policies
ALTER TABLE public.delivery_partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_tracking_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated warehouse admins full access to delivery_partners"
    ON public.delivery_partners FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated warehouse admins full access to deliveries"
    ON public.deliveries FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated warehouse admins full access to tracking events"
    ON public.delivery_tracking_events FOR ALL TO authenticated USING (true) WITH CHECK (true);
`;
}
