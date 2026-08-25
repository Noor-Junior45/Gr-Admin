import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { Order, OrderItem, OrderStatus, Delivery, DeliveryTrackingEvent, ProofOfDelivery } from '../types';
import { fetchOrderById, updateOrderStatus } from '../services/orderService';
import {
  fetchDeliveryByOrderId,
  fetchTrackingEvents,
  assignDeliveryPartner,
  updateDeliveryStatus,
} from '../services/deliveryService';
import { OrderStatusStepper } from '../components/OrderStatusStepper';
import { PackingSlip } from '../components/PackingSlip';
import { CustomerTrackingTimeline } from '../components/CustomerTrackingTimeline';
import { AssignPartnerModal } from '../components/AssignPartnerModal';
import { ProofOfDeliveryModal } from '../components/ProofOfDeliveryModal';
import { FailedDeliveryModal } from '../components/FailedDeliveryModal';
import {
  formatCurrency,
  formatDateTime,
  formatShortId,
  getStatusConfig,
  getPaymentBadge,
} from '../utils/formatters';
import {
  ArrowLeft,
  Phone,
  MapPin,
  Printer,
  CheckSquare,
  Square,
  Clock,
  Box,
  CheckCircle2,
  Truck,
  Sparkles,
  XCircle,
  AlertCircle,
  Loader2,
  Calendar,
  CreditCard,
  FileText,
  Tag,
  PackageCheck,
  RefreshCw,
  ShoppingBag,
  Copy,
  Check,
  ExternalLink,
  Info,
  Database,
  Code2,
  UserPlus,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';

export const OrderDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [trackingEvents, setTrackingEvents] = useState<DeliveryTrackingEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [updating, setUpdating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [auditBanner, setAuditBanner] = useState<{
    type: 'success' | 'error';
    message: string;
    timestamp: string;
  } | null>(null);

  // Packing checklist state (client-side interactive helper)
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});

  // Copy feedback state
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Modals state
  const [showCancelModal, setShowCancelModal] = useState<boolean>(false);
  const [cancelReason, setCancelReason] = useState<string>('Customer Request');
  const [showMigrationModal, setShowMigrationModal] = useState<boolean>(false);
  const [showAssignModal, setShowAssignModal] = useState<boolean>(false);
  const [showPodModal, setShowPodModal] = useState<boolean>(false);
  const [showFailedModal, setShowFailedModal] = useState<boolean>(false);

  const loadDetails = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);

    try {
      const [orderData, deliveryData, eventsData] = await Promise.all([
        fetchOrderById(id),
        fetchDeliveryByOrderId(id),
        fetchTrackingEvents(id),
      ]);
      setOrder(orderData.order);
      setItems(orderData.items);
      setDelivery(deliveryData);
      setTrackingEvents(eventsData);
    } catch (err: any) {
      console.error('Error fetching order details:', err);
      setError(err.message || 'Failed to load order information.');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignPartner = async (partnerId: string, estimatedMinutes: number, notes?: string) => {
    if (!id) return;
    setUpdating(true);
    try {
      const updatedDelivery = await assignDeliveryPartner(id, partnerId, estimatedMinutes, notes);
      setDelivery(updatedDelivery);
      const events = await fetchTrackingEvents(id);
      setTrackingEvents(events);
      setAuditBanner({
        type: 'success',
        message: 'Delivery partner assigned and customer notified.',
        timestamp: new Date().toLocaleTimeString('en-IN'),
      });
    } catch (err: any) {
      alert(err.message || 'Failed to assign delivery partner');
    } finally {
      setUpdating(false);
    }
  };

  const handleDeliveryStatusChange = async (nextStatus: any, extra?: any) => {
    if (!id) return;
    setUpdating(true);
    try {
      const updatedDelivery = await updateDeliveryStatus(id, nextStatus, extra);
      setDelivery(updatedDelivery);
      const events = await fetchTrackingEvents(id);
      setTrackingEvents(events);

      // Refresh order state
      const refreshedOrder = await fetchOrderById(id);
      setOrder(refreshedOrder.order);

      setAuditBanner({
        type: 'success',
        message: `Delivery milestone updated to "${nextStatus.replace('_', ' ').toUpperCase()}".`,
        timestamp: new Date().toLocaleTimeString('en-IN'),
      });
    } catch (err: any) {
      alert(err.message || 'Failed to update delivery milestone');
    } finally {
      setUpdating(false);
    }
  };

  const handlePodSubmit = async (pod: ProofOfDelivery) => {
    await handleDeliveryStatusChange('delivered', { proofOfDelivery: pod });
  };

  const handleFailedSubmit = async (reason: string, action: any, notes?: string) => {
    await handleDeliveryStatusChange('failed', { failureReason: reason, failureAction: action, notes });
  };

  useEffect(() => {
    loadDetails();

    // Listen for realtime changes on this specific order
    const channel = supabase
      .channel(`order_detail_${id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${id}`,
        },
        (payload) => {
          console.log('[OrderDetailPage] Live update received:', payload);
          loadDetails();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  const copyToClipboard = (text: string, key: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleToggleCheckItem = (itemId: string) => {
    setCheckedItems((prev) => ({
      ...prev,
      [itemId]: !prev[itemId],
    }));
  };

  // Status transition with optimistic rollback
  const handleTransitionStatus = async (targetStatus: OrderStatus) => {
    if (!order || !id) return;

    const previousOrder = { ...order };
    setUpdating(true);
    setAuditBanner(null);

    // Optimistic UI update
    setOrder((prev) => (prev ? { ...prev, status: targetStatus } : null));

    try {
      const updated = await updateOrderStatus(id, targetStatus);
      setOrder((prev) => (prev ? { ...prev, ...updated } : updated));

      setAuditBanner({
        type: 'success',
        message: `Order #${formatShortId(id)} status successfully transitioned to "${targetStatus.toUpperCase()}".`,
        timestamp: new Date().toLocaleTimeString('en-IN'),
      });
    } catch (err: any) {
      console.error('Failed to transition order status:', err);
      // Revert optimistic update
      setOrder(previousOrder);
      setAuditBanner({
        type: 'error',
        message: err.message || 'Database rejected status change. Reverted to previous state.',
        timestamp: new Date().toLocaleTimeString('en-IN'),
      });
    } finally {
      setUpdating(false);
      setShowCancelModal(false);
    }
  };

  // Construct full delivery address
  const fullAddress = useMemo(() => {
    if (!order) return '';
    const parts = [
      order.address_line1,
      order.address_line2,
      order.city,
      order.state,
      order.pincode,
    ].filter(Boolean);
    return parts.join(', ');
  }, [order]);

  const googleMapsUrl = useMemo(() => {
    if (!fullAddress) return '';
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`;
  }, [fullAddress]);

  const allItemsPacked = useMemo(() => {
    if (items.length === 0) return true;
    return items.every((it) => checkedItems[it.id]);
  }, [items, checkedItems]);

  const handlePrintPackingSlip = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-500 space-y-3">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-amber-500" />
        <p className="text-sm font-medium">Loading order details from Supabase...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="bg-white p-8 rounded-xl border border-slate-200 text-center space-y-4 max-w-lg mx-auto mt-8 shadow-xs">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-lg font-bold text-slate-900">Order Not Found</h2>
        <p className="text-xs text-slate-500">{error || 'Could not locate the requested order.'}</p>
        <button
          type="button"
          onClick={() => navigate('/orders')}
          className="px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800 transition cursor-pointer"
        >
          Return to All Orders
        </button>
      </div>
    );
  }

  const statusCfg = getStatusConfig(order.status);
  const payBadge = getPaymentBadge(order.payment_status);

  return (
    <div className="space-y-5 pb-12">
      {/* Hidden printable packing slip rendered exclusively during window.print() */}
      <PackingSlip order={order} items={items} />

      {/* Audit Banner Notification */}
      {auditBanner && (
        <div
          className={`p-3.5 rounded-xl border text-xs sm:text-sm flex items-start justify-between gap-3 shadow-xs ${
            auditBanner.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          <div className="flex items-start gap-2">
            {auditBanner.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            )}
            <div>
              <span className="font-semibold">{auditBanner.message}</span>
              <div className="text-[11px] opacity-75 font-mono-code mt-0.5">
                Audit logged at {auditBanner.timestamp}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setAuditBanner(null)}
            className="text-xs font-bold opacity-60 hover:opacity-100 p-1 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Navigation & Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer border border-slate-200"
            title="Go Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-mono-code font-bold text-slate-900">
                {formatShortId(order.id)}
              </h1>
              <button
                type="button"
                onClick={() => copyToClipboard(order.id, 'order_id')}
                className="p-1 text-slate-400 hover:text-slate-700 rounded transition cursor-pointer"
                title="Copy Full UUID"
              >
                {copiedKey === 'order_id' ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>

              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dotBg}`} />
                {statusCfg.label}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Placed on {formatDateTime(order.placed_at)}
            </p>
          </div>
        </div>

        {/* Top Actions: Print Packing Slip + Refresh */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrintPackingSlip}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-xs transition cursor-pointer"
            title="Print Official Warehouse Packing Slip"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Packing Slip</span>
          </button>

          <button
            type="button"
            onClick={loadDetails}
            disabled={loading}
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg border border-slate-200 transition cursor-pointer"
            title="Reload order state"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Visual Order Status Timeline Stepper Component */}
      <OrderStatusStepper
        order={order}
        delivery={delivery}
        onTransitionStatus={handleTransitionStatus}
        onRequestCancel={() => setShowCancelModal(true)}
        onRequestAssignRider={() => setShowAssignModal(true)}
        onRequestPod={() => setShowPodModal(true)}
        isUpdating={updating}
      />

      {/* Two Column Grid: Recipient/Address/Payment and Order Items Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left Column (1/3): Recipient, Shipping Address & Financials */}
        <div className="space-y-5">
          {/* Recipient & Contact Details Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <h2 className="text-xs font-bold uppercase font-mono-code text-slate-700 tracking-wider flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-500" />
                <span>Customer / Recipient</span>
              </h2>
            </div>

            <div>
              <div className="text-sm font-bold text-slate-900">{order.recipient_name}</div>
              <div className="text-xs text-slate-600 font-mono-code mt-1 flex items-center justify-between">
                <span>{order.recipient_phone}</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => copyToClipboard(order.recipient_phone, 'phone')}
                    className="p-1 text-slate-400 hover:text-slate-700 rounded cursor-pointer"
                    title="Copy Phone"
                  >
                    {copiedKey === 'phone' ? (
                      <Check className="w-3 h-3 text-emerald-600" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                  <a
                    href={`tel:${order.recipient_phone}`}
                    className="p-1 text-slate-400 hover:text-emerald-700 rounded"
                    title="Call customer"
                  >
                    <Phone className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Shipping Address Card with Google Maps */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <h2 className="text-xs font-bold uppercase font-mono-code text-slate-700 tracking-wider flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-500" />
                <span>Delivery Destination</span>
              </h2>
              <button
                type="button"
                onClick={() => copyToClipboard(fullAddress, 'address')}
                className="text-[11px] text-amber-700 hover:text-amber-800 font-semibold flex items-center gap-1 cursor-pointer"
              >
                {copiedKey === 'address' ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-600" /> Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" /> Copy Address
                  </>
                )}
              </button>
            </div>

            <div className="text-xs text-slate-700 leading-relaxed space-y-1">
              <div className="font-semibold text-slate-900">{order.address_line1}</div>
              {order.address_line2 && <div>{order.address_line2}</div>}
              <div>
                {order.city}, {order.state} -{' '}
                <span className="font-mono-code font-bold text-slate-900">{order.pincode}</span>
              </div>
            </div>

            {order.delivery_notes && (
              <div className="p-2.5 bg-amber-50/70 border border-amber-200 rounded-lg text-xs text-amber-900 space-y-0.5">
                <div className="font-bold flex items-center gap-1 text-[11px] uppercase tracking-wider">
                  <Info className="w-3 h-3 text-amber-600" /> Special Delivery Note:
                </div>
                <div className="italic">{order.delivery_notes}</div>
              </div>
            )}

            {/* Google Maps link */}
            {googleMapsUrl && (
              <div className="pt-2">
                <a
                  href={googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg border border-slate-200 transition"
                >
                  <MapPin className="w-3.5 h-3.5 text-rose-600" />
                  <span>Open in Google Maps</span>
                  <ExternalLink className="w-3 h-3 text-slate-400 ml-0.5" />
                </a>
              </div>
            )}
          </div>

          {/* Payment & Financial Summary Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <h2 className="text-xs font-bold uppercase font-mono-code text-slate-700 tracking-wider flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-slate-500" />
                <span>Payment & Invoicing</span>
              </h2>
              <span
                className={`text-[10px] px-2 py-0.5 rounded font-sans border font-medium ${payBadge.bg} ${payBadge.text} ${payBadge.border}`}
              >
                {payBadge.label}
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Payment Method</span>
                <span className="font-mono-code font-bold uppercase text-slate-900">
                  {order.payment_method || 'COD'}
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span className="font-mono-code font-semibold text-slate-900">
                  {formatCurrency(order.subtotal)}
                </span>
              </div>
              {order.coupon_code && (
                <div className="flex justify-between text-emerald-700">
                  <span>Coupon Applied</span>
                  <span className="font-mono-code font-bold">{order.coupon_code}</span>
                </div>
              )}
              <div className="pt-2 border-t border-slate-100 flex justify-between items-center text-sm font-bold">
                <span className="text-slate-900">Total Charged</span>
                <span className="font-mono-code text-base text-slate-950">
                  {formatCurrency(order.total_amount)}
                </span>
              </div>
            </div>
          </div>

          {/* Internal Notes / Proposed Schema Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h2 className="text-xs font-bold uppercase font-mono-code text-slate-700 tracking-wider flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-slate-500" />
                <span>Internal Admin Notes</span>
              </h2>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Database schema does not currently include an <code className="font-mono-code bg-slate-100 px-1 py-0.5 rounded text-[11px]">admin_notes</code> column on <code className="font-mono-code bg-slate-100 px-1 py-0.5 rounded text-[11px]">orders</code>.
            </p>
            <button
              type="button"
              onClick={() => setShowMigrationModal(true)}
              className="inline-flex items-center gap-1 text-xs text-amber-700 hover:text-amber-800 font-semibold cursor-pointer"
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>View proposed migration SQL</span>
            </button>
          </div>
        </div>

        {/* Right Column (2/3): Items Packing Workspace & Customer Live Timeline */}
        <div className="lg:col-span-2 space-y-5">
          {/* Dispatch & Rider Quick Actions Bar */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Truck className="w-4 h-4 text-cyan-600" />
                  <span>Delivery Fleet & Milestone Actions</span>
                </h2>
                <p className="text-xs text-slate-500">
                  Manage rider dispatch, trigger real-time customer updates, and record proof of delivery.
                </p>
              </div>

              {delivery?.delivery_partner ? (
                <div className="flex items-center gap-2 text-xs bg-cyan-50 text-cyan-900 px-3 py-1 rounded-lg border border-cyan-200 font-medium">
                  <span className="font-semibold">Rider: {delivery.delivery_partner.name}</span>
                  <span>({delivery.delivery_partner.phone})</span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowAssignModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-cyan-700 hover:bg-cyan-800 rounded-lg shadow-xs transition"
                >
                  <UserPlus className="w-3.5 h-3.5" /> Assign Delivery Partner
                </button>
              )}
            </div>

            {/* Rider Milestone Progress Bar */}
            <div className="flex items-center gap-2 flex-wrap pt-1">
              {!delivery?.delivery_partner_id ? (
                <button
                  type="button"
                  onClick={() => setShowAssignModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-cyan-900 bg-cyan-50 hover:bg-cyan-100 border border-cyan-300 rounded-lg transition"
                >
                  <UserPlus className="w-3.5 h-3.5" /> 1. Assign Rider
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setShowAssignModal(true)}
                    className="px-2.5 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                  >
                    Change Rider
                  </button>

                  <button
                    type="button"
                    disabled={updating}
                    onClick={() => handleDeliveryStatusChange('picked_up')}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-sky-900 bg-sky-50 hover:bg-sky-100 border border-sky-300 rounded-lg transition disabled:opacity-50"
                  >
                    <Truck className="w-3.5 h-3.5" /> 2. Mark Picked Up
                  </button>

                  <button
                    type="button"
                    disabled={updating}
                    onClick={() => handleDeliveryStatusChange('out_for_delivery')}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-300 rounded-lg transition disabled:opacity-50"
                  >
                    <Truck className="w-3.5 h-3.5" /> 3. Out for Delivery
                  </button>

                  <button
                    type="button"
                    disabled={updating}
                    onClick={() =>
                      handleDeliveryStatusChange('near_destination', { locationName: order.city })
                    }
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-lg transition disabled:opacity-50"
                  >
                    <MapPin className="w-3.5 h-3.5 text-amber-600" /> 4. Trigger “Nearby” Alert
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowPodModal(true)}
                    className="flex items-center gap-1 px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" /> 5. Mark Delivered (POD)
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowFailedModal(true)}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition"
                  >
                    <AlertTriangle className="w-3.5 h-3.5" /> Issue / Reschedule
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Live Customer Tracking & Timeline Component */}
          <CustomerTrackingTimeline
            order={order}
            delivery={delivery}
            events={trackingEvents}
          />

          {/* Items & Packing Checklist Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <PackageCheck className="w-4 h-4 text-amber-600" />
                  <span>Order Items & Packing Checklist</span>
                </h2>
                <p className="text-xs text-slate-500">
                  {items.length} unique product line(s) • Check items off while packaging.
                </p>
              </div>

              {allItemsPacked && items.length > 0 && (
                <div className="flex items-center gap-1 px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-md text-xs font-semibold">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>All items verified</span>
                </div>
              )}
            </div>

            {items.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-xs">
                <ShoppingBag className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="font-semibold text-slate-700">No Item Rows Found</p>
                <p className="text-slate-400 mt-0.5">
                  No line records attached to this order in <code className="font-mono-code text-[11px]">order_items</code>.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {items.map((item, idx) => {
                  const isChecked = Boolean(checkedItems[item.id]);
                  const lineTotal = (item.quantity || 1) * (item.price_at_purchase || 0);

                  return (
                    <div
                      key={item.id || idx}
                      onClick={() => handleToggleCheckItem(item.id)}
                      className={`p-3.5 rounded-xl border transition cursor-pointer flex items-center justify-between gap-3 ${
                        isChecked
                          ? 'bg-emerald-50/40 border-emerald-300 ring-1 ring-emerald-300/50'
                          : 'bg-white hover:bg-slate-50/70 border-slate-200'
                      }`}
                    >
                      {/* Checkbox & Thumbnail */}
                      <div className="flex items-center gap-3 min-w-0">
                        <button
                          type="button"
                          className="text-slate-400 hover:text-emerald-600 p-1 shrink-0 cursor-pointer"
                          aria-label="Toggle packed status"
                        >
                          {isChecked ? (
                            <CheckSquare className="w-5 h-5 text-emerald-600" />
                          ) : (
                            <Square className="w-5 h-5 text-slate-300" />
                          )}
                        </button>

                        {item.product_image ? (
                          <img
                            src={item.product_image}
                            alt={item.product_name}
                            className="w-12 h-12 object-contain bg-slate-50 border border-slate-200 rounded-lg shrink-0 p-1"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-slate-100 border border-slate-200 rounded-lg flex items-center justify-center shrink-0">
                            <Box className="w-5 h-5 text-slate-400" />
                          </div>
                        )}

                        <div className="min-w-0">
                          <div
                            className={`text-xs sm:text-sm font-semibold truncate ${
                              isChecked ? 'text-slate-900 line-through opacity-80' : 'text-slate-900'
                            }`}
                            title={item.product_name}
                          >
                            {item.product_name}
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono-code mt-0.5">
                            {item.brand ? `${item.brand} • ` : ''}
                            {formatCurrency(item.price_at_purchase)}{' '}
                            {item.unit ? `(${item.unit})` : ''}
                          </div>
                        </div>
                      </div>

                      {/* Quantity & Line Total */}
                      <div className="text-right shrink-0">
                        <div className="font-mono-code font-bold text-slate-900 text-sm">
                          <span className="text-xs text-slate-500 font-normal">Qty: </span>
                          <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded text-slate-900 font-mono-code">
                            {item.quantity}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 font-mono-code mt-1">
                          {formatCurrency(lineTotal)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Packing Summary Footer */}
            <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-600">
              <div className="font-mono-code">
                Items Packed:{' '}
                <span className="font-bold text-slate-900">
                  {Object.values(checkedItems).filter(Boolean).length}
                </span>{' '}
                / {items.length} lines
              </div>

              {order.status === 'packing' && (
                <button
                  type="button"
                  onClick={() => handleTransitionStatus('packed')}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg text-xs transition cursor-pointer shadow-xs"
                >
                  Confirm Packing Done
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Assign Delivery Partner Modal */}
      {showAssignModal && (
        <AssignPartnerModal
          isOpen={true}
          orderId={order.id}
          currentPartnerId={delivery?.delivery_partner_id}
          defaultNotes={order.delivery_notes}
          onClose={() => setShowAssignModal(false)}
          onAssign={handleAssignPartner}
        />
      )}

      {/* Proof of Delivery Modal */}
      {showPodModal && (
        <ProofOfDeliveryModal
          isOpen={true}
          orderId={order.id}
          recipientDefaultName={order.recipient_name}
          onClose={() => setShowPodModal(false)}
          onSubmit={handlePodSubmit}
        />
      )}

      {/* Failed Delivery / Reschedule Modal */}
      {showFailedModal && (
        <FailedDeliveryModal
          isOpen={true}
          orderId={order.id}
          onClose={() => setShowFailedModal(false)}
          onSubmit={handleFailedSubmit}
        />
      )}

      {/* Cancel Order Confirmation Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-5 sm:p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center border border-rose-200 shrink-0">
                <AlertCircle className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Cancel This Order?</h3>
                <p className="text-xs text-slate-500">Order ID: {formatShortId(order.id)}</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Cancelling this order will mark it as cancelled across the system and dispatch notifications.
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Reason for Cancellation:</label>
              <select
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800"
              >
                <option value="Customer Request">Customer requested cancellation</option>
                <option value="Out of Stock">Item out of stock</option>
                <option value="Delivery Unserviceable">Delivery address unserviceable</option>
                <option value="Payment Issue">Payment failed / unverified</option>
                <option value="Duplicate Order">Duplicate order placed</option>
              </select>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition cursor-pointer"
              >
                Keep Order
              </button>
              <button
                type="button"
                onClick={() => handleTransitionStatus('cancelled')}
                disabled={updating}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition cursor-pointer disabled:opacity-50"
              >
                {updating ? 'Processing...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Migration Proposal SQL Modal */}
      {showMigrationModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-xl w-full p-5 sm:p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-amber-600">
                <Database className="w-5 h-5 text-amber-500" />
                <h3 className="text-base font-bold text-slate-900">
                  Proposed Schema Extension (Optional)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowMigrationModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              In accordance with security guidelines, this application enforces verified existing schema without running unrequested DDL commands. To persist internal warehouse comments and cancellation reasons in Supabase, the following optional migration can be executed in your Supabase SQL Editor:
            </p>

            <div className="bg-slate-900 text-slate-100 p-3.5 rounded-xl font-mono-code text-xs overflow-x-auto">
              <pre className="text-amber-300">-- 1. Add admin notes and cancellation reason to orders table</pre>
              <pre className="text-slate-200 mt-1">ALTER TABLE public.orders</pre>
              <pre className="text-emerald-400">  ADD COLUMN IF NOT EXISTS admin_notes text,</pre>
              <pre className="text-emerald-400">  ADD COLUMN IF NOT EXISTS cancellation_reason text,</pre>
              <pre className="text-emerald-400">  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz;</pre>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setShowMigrationModal(false)}
                className="px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
