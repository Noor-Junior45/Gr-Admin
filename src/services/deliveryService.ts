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

export function getLocalDeliveries(): Record<string, Delivery> {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_DELIVERIES_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('Error reading local deliveries:', e);
  }
  return {};
}

export function saveLocalDelivery(delivery: Delivery) {
  try {
    const all = getLocalDeliveries();
    all[delivery.order_id] = delivery;
    localStorage.setItem(LOCAL_STORAGE_DELIVERIES_KEY, JSON.stringify(all));
  } catch (e) {
    console.warn('Error saving local delivery:', e);
  }
}

/**
 * Fetch all assigned delivery records across both Supabase and localStorage
 */
export async function fetchAllAssignedDeliveries(): Promise<Record<string, Delivery>> {
  const result: Record<string, Delivery> = {};

  // 1. Get from localStorage first
  const localMap = getLocalDeliveries();
  Object.entries(localMap).forEach(([orderId, del]) => {
    if (del && (del.delivery_partner_id || (del as any).rider_id)) {
      result[orderId] = del;
    }
  });

  // 2. Supplement and merge with Supabase deliveries
  try {
    const { data: dbDeliveries } = await supabase
      .from('deliveries')
      .select('*, delivery_partner:delivery_partners(*)')
      .not('delivery_partner_id', 'is', null);

    if (dbDeliveries && Array.isArray(dbDeliveries)) {
      for (const d of dbDeliveries) {
        if (d.order_id) {
          result[d.order_id] = {
            ...result[d.order_id],
            ...d,
            delivery_partner: d.delivery_partner
              ? normalizeDeliveryPartner(d.delivery_partner)
              : result[d.order_id]?.delivery_partner || null,
          };
        }
      }
    }
  } catch (e) {
    console.warn('[deliveryService] fetchAllAssignedDeliveries Supabase query:', e);
  }

  return result;
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
 * Normalizes raw backend record from delivery_partners or riders table into clean DeliveryPartner
 */
export function normalizeDeliveryPartner(raw: any): DeliveryPartner {
  if (!raw) {
    return {
      id: `dp-${Date.now()}`,
      name: 'Rider',
      phone: '',
      vehicle_type: 'bike',
      vehicle_number: '',
      is_active: true,
      rating: 5.0,
      total_completed: 0,
      created_at: new Date().toISOString(),
    };
  }

  const id = String(raw.id || raw.rider_id || raw.partner_id || `dp-${Date.now()}`);
  const name = String(raw.name || raw.rider_name || raw.full_name || raw.username || 'Rider');
  const phone = String(raw.phone || raw.phone_number || raw.mobile || raw.contact_number || '');
  const vehicle_type = (raw.vehicle_type || raw.vehicle || 'bike') as DeliveryPartner['vehicle_type'];
  const vehicle_number = String(raw.vehicle_number || raw.vehicle_no || raw.plate_number || '');
  const is_active = raw.is_active !== undefined ? Boolean(raw.is_active) : raw.status ? raw.status === 'active' || raw.status === 'online' : true;
  const rating = typeof raw.rating === 'number' ? raw.rating : parseFloat(raw.rating) || 5.0;
  const total_completed = Number(raw.total_completed ?? raw.deliveries_completed ?? raw.total_trips ?? raw.completed_orders ?? 0);
  const current_active_orders = Number(raw.current_active_orders ?? raw.active_orders ?? 0);
  const avatar_url = raw.avatar_url || raw.photo_url || raw.profile_picture || null;
  const created_at = raw.created_at || raw.joined_at || null;

  return {
    id,
    name,
    phone,
    vehicle_type,
    vehicle_number,
    is_active,
    rating,
    total_completed,
    current_active_orders,
    avatar_url,
    created_at,
  };
}

/**
 * Fetch specific rider details from backend by ID
 */
export async function fetchRiderById(riderId: string): Promise<DeliveryPartner | null> {
  if (!riderId) return null;

  // 1. Check delivery_partners in backend
  try {
    const { data, error } = await supabase
      .from('delivery_partners')
      .select('*')
      .eq('id', riderId)
      .maybeSingle();

    if (!error && data) {
      return normalizeDeliveryPartner(data);
    }
  } catch {}

  // 2. Check riders in backend
  try {
    const { data, error } = await supabase
      .from('riders')
      .select('*')
      .eq('id', riderId)
      .maybeSingle();

    if (!error && data) {
      return normalizeDeliveryPartner(data);
    }
  } catch {}

  // 3. Check local partners cache
  const local = getLocalPartners();
  const found = local.find((p) => p.id === riderId);
  return found || null;
}

/**
 * Fetch all delivery partners / riders from backend
 */
export async function fetchDeliveryPartners(): Promise<DeliveryPartner[]> {
  // 1. Try delivery_partners in backend
  try {
    const { data, error } = await withSkewRetry(
      () => supabase.from('delivery_partners').select('*').order('name'),
      2,
      400
    );

    if (!error && data && data.length > 0) {
      const normalized = data.map(normalizeDeliveryPartner);
      saveLocalPartners(normalized);
      return normalized;
    }
  } catch (err) {
    console.warn('Backend delivery_partners query failed, checking riders table:', err);
  }

  // 2. Try riders in backend (in case backend table is named riders)
  try {
    const { data: riderData, error: riderErr } = await withSkewRetry(
      () => supabase.from('riders').select('*'),
      2,
      400
    );

    if (!riderErr && riderData && riderData.length > 0) {
      const normalized = riderData.map(normalizeDeliveryPartner);
      saveLocalPartners(normalized);
      return normalized;
    }
  } catch (err) {
    console.warn('Backend riders query failed:', err);
  }

  // 3. Fallback to local store
  return getLocalPartners();
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
 * Fetch delivery record for an order and load rider details from backend
 */
export async function fetchDeliveryByOrderId(orderId: string): Promise<Delivery | null> {
  const localDeliveries = getLocalDeliveries();
  const local = localDeliveries[orderId];

  try {
    // 1. Attempt embedded join query first
    const { data, error } = await withSkewRetry(
      () =>
        supabase
          .from('deliveries')
          .select('*, delivery_partner:delivery_partners(*)')
          .eq('order_id', orderId)
          .maybeSingle(),
      2,
      300
    );

    if (!error && data) {
      const delivery = data as Delivery;
      if (delivery.delivery_partner) {
        delivery.delivery_partner = normalizeDeliveryPartner(delivery.delivery_partner);
      } else {
        const partnerId = delivery.delivery_partner_id || (delivery as any).rider_id;
        if (partnerId) {
          const rider = await fetchRiderById(partnerId);
          delivery.delivery_partner = rider;
        } else if (local?.delivery_partner_id || local?.delivery_partner) {
          delivery.delivery_partner_id = local.delivery_partner_id;
          delivery.delivery_partner = local.delivery_partner;
        }
      }
      return delivery;
    }

    // 2. Direct select on deliveries table if join or FK failed
    const { data: rawDel, error: rawErr } = await withSkewRetry(
      () =>
        supabase
          .from('deliveries')
          .select('*')
          .eq('order_id', orderId)
          .maybeSingle(),
      2,
      300
    );

    if (!rawErr && rawDel) {
      const delivery = rawDel as Delivery;
      const partnerId = delivery.delivery_partner_id || (delivery as any).rider_id;
      if (partnerId) {
        const rider = await fetchRiderById(partnerId);
        delivery.delivery_partner = rider;
      } else if (local?.delivery_partner_id || local?.delivery_partner) {
        delivery.delivery_partner_id = local.delivery_partner_id;
        delivery.delivery_partner = local.delivery_partner;
      }
      return delivery;
    }
  } catch (e) {
    console.warn('Backend delivery lookup error:', e);
  }

  if (local) {
    const partnerId = local.delivery_partner_id || (local as any).rider_id;
    if (partnerId && !local.delivery_partner) {
      const rider = await fetchRiderById(partnerId);
      local.delivery_partner = rider;
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
  
  // Fetch rider details from backend
  const partner = await fetchRiderById(partnerId);

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
    const dbPayload = {
      order_id: orderId,
      delivery_partner_id: partnerId,
      status: 'assigned',
      estimated_delivery_at: estimatedDeliveryAt,
      delivery_notes: notes || null,
      updated_at: nowIso,
    };

    // Check if record exists for this order
    const { data: existing } = await supabase
      .from('deliveries')
      .select('id')
      .eq('order_id', orderId)
      .maybeSingle();

    if (existing?.id) {
      await supabase
        .from('deliveries')
        .update(dbPayload)
        .eq('id', existing.id);
      deliveryData.id = existing.id;
    } else {
      const { data: insData, error: insErr } = await supabase
        .from('deliveries')
        .insert({ id: deliveryData.id, ...dbPayload })
        .select('id')
        .maybeSingle();

      if (insErr) {
        // Fallback without explicit id
        const { data: insData2 } = await supabase
          .from('deliveries')
          .insert(dbPayload)
          .select('id')
          .maybeSingle();
        if (insData2?.id) deliveryData.id = insData2.id;
      } else if (insData?.id) {
        deliveryData.id = insData.id;
      }
    }
  } catch (e) {
    console.warn('Supabase delivery upsert fallback:', e);
  }

  saveLocalDelivery(deliveryData);

  // Trigger instantaneous cross-component and cross-tab synchronization
  try {
    window.dispatchEvent(
      new CustomEvent('rider_assigned', { detail: { orderId, partnerId, delivery: deliveryData } })
    );
    window.dispatchEvent(new Event('storage'));
  } catch {
    // Non-fatal
  }

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
    if (existing.delivered_at) payload.delivered_at = existing.delivered_at;
    if (extra?.notes) payload.delivery_notes = extra.notes;

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

-- 4. Atomic Order Deletion RPC Function (Safely cleans child records and removes order)
CREATE OR REPLACE FUNCTION public.delete_order(p_order_id UUID)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_deleted_count INT := 0;
BEGIN
    -- 1. Delete tracking events
    DELETE FROM public.delivery_tracking_events WHERE order_id = p_order_id;
    
    -- 2. Delete deliveries
    DELETE FROM public.deliveries WHERE order_id = p_order_id;
    
    -- 3. Delete reviews if table exists
    BEGIN
        DELETE FROM public.reviews WHERE order_id = p_order_id;
    EXCEPTION WHEN undefined_table OR undefined_column THEN
        -- Non-fatal
    END;

    -- 4. Delete order items
    DELETE FROM public.order_items WHERE order_id = p_order_id;
    
    -- 5. Delete order from orders table
    DELETE FROM public.orders WHERE id = p_order_id;
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    
    IF v_deleted_count > 0 THEN
        RETURN json_build_object('success', true, 'message', 'Order permanently deleted');
    ELSE
        RETURN json_build_object('success', false, 'message', 'Order not found or already deleted');
    END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_order(UUID) TO authenticated, anon;

-- Ensure RLS allows DELETE on orders and order_items
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'orders' AND policyname = 'Allow full delete access to orders'
    ) THEN
        CREATE POLICY "Allow full delete access to orders"
            ON public.orders FOR DELETE TO authenticated, anon USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'order_items' AND policyname = 'Allow full delete access to order_items'
    ) THEN
        CREATE POLICY "Allow full delete access to order_items"
            ON public.order_items FOR DELETE TO authenticated, anon USING (true);
    END IF;
END $$;
`;
}
