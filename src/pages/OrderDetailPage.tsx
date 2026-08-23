import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { withSkewRetry } from '../utils/supabaseHelper';
import { Order, OrderItem, OrderStatus } from '../types';
import { PackingSlip } from '../components/PackingSlip';
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
  Mail,
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
} from 'lucide-react';

const STATUS_FLOW: {
  status: OrderStatus;
  label: string;
  nextStatus?: OrderStatus;
  nextLabel?: string;
  icon: any;
}[] = [
  { status: 'pending', label: 'Pending', nextStatus: 'packing', nextLabel: 'Start Packing', icon: Clock },
  { status: 'packing', label: 'Packing', nextStatus: 'packed', nextLabel: 'Mark as Packed', icon: Box },
  { status: 'packed', label: 'Packed', nextStatus: 'shipped', nextLabel: 'Mark as Shipped', icon: CheckCircle2 },
  { status: 'shipped', label: 'Shipped', nextStatus: 'delivered', nextLabel: 'Mark as Delivered', icon: Truck },
  { status: 'delivered', label: 'Delivered', icon: Sparkles },
];

export const OrderDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [updating, setUpdating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [updateMessage, setUpdateMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Local state for checking off items while packing
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});

  const fetchOrderDetails = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);

    try {
      // 1. Fetch order
      const { data: orderData, error: orderErr } = await withSkewRetry(
        () =>
          supabase
            .from('orders')
            .select('*')
            .eq('id', id)
            .single(),
        3,
        600
      );

      if (orderErr) {
        throw orderErr;
      }

      setOrder(orderData);

      // 2. Fetch order_items
      const { data: itemsData, error: itemsErr } = await withSkewRetry(
        () =>
          supabase
            .from('order_items')
            .select('*')
            .eq('order_id', id),
        3,
        600
      );

      if (itemsErr) {
        console.warn('Error fetching order items:', itemsErr);
      } else {
        setItems(itemsData || []);
      }
    } catch (err: any) {
      console.error('Error fetching order detail:', err);
      setError(err.message || 'Failed to load order details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrderDetails();
  }, [id]);

  const toggleItemChecked = (itemId: string) => {
    setCheckedItems((prev) => ({
      ...prev,
      [itemId]: !prev[itemId],
    }));
  };

  const handleUpdateStatus = async (targetStatus: OrderStatus) => {
    if (!order || !id) return;

    // Confirm cancel if cancelling
    if (targetStatus === 'cancelled') {
      const confirmCancel = window.confirm(
        'Are you sure you want to CANCEL this order? This action will mark it as cancelled.'
      );
      if (!confirmCancel) return;
    }

    setUpdating(true);
    setUpdateMessage(null);

    try {
      const nowIso = new Date().toISOString();
      const updatePayload: Partial<Order> & { updated_at: string } = {
        status: targetStatus,
        updated_at: nowIso,
      };

      if (targetStatus === 'packed') {
        updatePayload.packed_at = nowIso;
      } else if (targetStatus === 'shipped') {
        updatePayload.shipped_at = nowIso;
      } else if (targetStatus === 'delivered') {
        updatePayload.delivered_at = nowIso;
      }

      const { error: updateErr } = await withSkewRetry(
        () =>
          supabase
            .from('orders')
            .update(updatePayload)
            .eq('id', id),
        3,
        600
      );

      if (updateErr) {
        throw updateErr;
      }

      setUpdateMessage({
        type: 'success',
        text: `Order status updated to "${targetStatus.toUpperCase()}".`,
      });

      // Refetch order to ensure UI reflects server state
      await fetchOrderDetails();
    } catch (err: any) {
      console.error('Error updating order status:', err);
      setUpdateMessage({
        type: 'error',
        text: err.message || 'Failed to update order status. Please try again.',
      });
    } finally {
      setUpdating(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-slate-950 flex flex-col items-center justify-center p-6 text-slate-100">
        <Loader2 className="w-8 h-8 text-amber-500 animate-spin mb-3" />
        <p className="text-sm font-medium text-slate-400">Loading order #{id?.slice(0, 8)}...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-slate-950 p-4 sm:p-6">
        <div className="max-w-3xl mx-auto bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto" />
          <h2 className="text-xl font-bold text-white">Order Not Found</h2>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            {error || `Unable to locate order with ID "${id}". It may have been deleted or the ID is invalid.`}
          </p>
          <div className="pt-2 flex justify-center gap-3">
            <button
              onClick={() => fetchOrderDetails()}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold rounded-xl border border-slate-700 transition cursor-pointer"
            >
              Retry
            </button>
            <Link
              to="/orders"
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-sm font-bold rounded-xl transition inline-flex items-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Orders
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const currentStatus = (order.status || 'pending').toLowerCase() as OrderStatus;
  const statusCfg = getStatusConfig(currentStatus);
  const paymentBadge = getPaymentBadge(order.payment_status);

  // Check progress calculation
  const totalItemsCount = items.reduce((sum, item) => sum + (item.quantity || 1), 0);
  const checkedCount = items.filter((it) => checkedItems[it.id]).length;
  const isFullyChecked = items.length > 0 && checkedCount === items.length;

  // Find next action in status flow
  const currentStep = STATUS_FLOW.find((s) => s.status === currentStatus);
  const nextStatusOption = currentStep?.nextStatus;
  const nextStatusLabel = currentStep?.nextLabel;

  return (
    <>
      {/* Hidden element for printing only */}
      <PackingSlip order={order} items={items} />

      {/* Main Interactive Screen */}
      <div className="min-h-[calc(100vh-4rem)] bg-slate-950 pb-20 print:hidden">
        {/* Sticky Action Bar */}
        <div className="bg-slate-900/95 border-b border-slate-800 sticky top-16 z-30 backdrop-blur-md">
          <div className="max-w-5xl mx-auto px-3 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-2.5">
            {/* Back button & Short ID */}
            <div className="flex items-center gap-2.5">
              <Link
                to="/orders"
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition active:scale-95 cursor-pointer"
                title="Back to orders list"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-base sm:text-lg font-bold text-white font-mono">
                    {formatShortId(order.id)}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-bold border ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border}`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dotBg}`} />
                    {statusCfg.label}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 font-mono hidden sm:block truncate max-w-xs">
                  {order.id}
                </div>
              </div>
            </div>

            {/* Print & Refresh Buttons */}
            <div className="flex items-center gap-2">
              <button
                id="print-packing-slip-btn"
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-semibold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-xl shadow-md transition active:scale-95 cursor-pointer min-h-[40px]"
              >
                <Printer className="w-4 h-4" />
                <span>Print Packing Slip</span>
              </button>

              <button
                onClick={() => fetchOrderDetails()}
                disabled={updating}
                className="p-2 text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition active:scale-95 cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center"
                title="Refresh order details"
              >
                <RefreshCw className={`w-4 h-4 text-amber-400 ${updating ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Main Content Details */}
        <div className="max-w-5xl mx-auto px-3 sm:px-6 pt-5 space-y-6">
          {/* Status Update Banner / Feedback */}
          {updateMessage && (
            <div
              className={`p-4 rounded-xl border text-sm flex items-start gap-2.5 transition-all ${
                updateMessage.type === 'success'
                  ? 'bg-emerald-950/70 border-emerald-800 text-emerald-200'
                  : 'bg-red-950/70 border-red-800 text-red-200'
              }`}
            >
              {updateMessage.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              )}
              <div className="flex-1 font-medium">{updateMessage.text}</div>
              <button
                onClick={() => setUpdateMessage(null)}
                className="text-xs opacity-75 hover:opacity-100 font-bold"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Section 4: STATUS UPDATE WORKFLOW ACTIONS */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <PackageCheck className="w-5 h-5 text-amber-500" />
                  Order Workflow & Status
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Update order milestone as it moves through warehouse dispatch
                </p>
              </div>

              {/* Status timestamps preview */}
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                {order.packed_at && (
                  <span className="bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                    Packed: {formatDateTime(order.packed_at)}
                  </span>
                )}
                {order.shipped_at && (
                  <span className="bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                    Shipped: {formatDateTime(order.shipped_at)}
                  </span>
                )}
                {order.delivered_at && (
                  <span className="bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                    Delivered: {formatDateTime(order.delivered_at)}
                  </span>
                )}
              </div>
            </div>

            {/* Workflow Progression Buttons */}
            <div className="space-y-3">
              {/* Main Forward Action Button */}
              {nextStatusOption && currentStatus !== 'delivered' && currentStatus !== 'cancelled' && (
                <button
                  id={`advance-status-${nextStatusOption}`}
                  onClick={() => handleUpdateStatus(nextStatusOption)}
                  disabled={updating}
                  className="w-full py-3.5 px-4 bg-amber-500 hover:bg-amber-400 disabled:bg-amber-500/50 text-slate-950 font-bold text-sm sm:text-base rounded-xl shadow-lg shadow-amber-500/15 transition flex items-center justify-center gap-2.5 cursor-pointer disabled:cursor-not-allowed min-h-[48px] active:scale-[0.99]"
                >
                  {updating ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Updating Database...</span>
                    </>
                  ) : (
                    <>
                      <span>Next Step: <strong>{nextStatusLabel}</strong> ({nextStatusOption.toUpperCase()})</span>
                      <ArrowLeft className="w-4 h-4 rotate-180" />
                    </>
                  )}
                </button>
              )}

              {/* Status Milestones Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 pt-2">
                {(['pending', 'packing', 'packed', 'shipped', 'delivered', 'cancelled'] as OrderStatus[]).map(
                  (st) => {
                    const isCurrent = currentStatus === st;
                    const cfg = getStatusConfig(st);
                    const isCancel = st === 'cancelled';

                    // Cancel button disabled if already delivered
                    const isCancelDisabled = isCancel && currentStatus === 'delivered';

                    return (
                      <button
                        key={st}
                        id={`set-status-${st}`}
                        onClick={() => handleUpdateStatus(st)}
                        disabled={updating || isCurrent || isCancelDisabled}
                        className={`py-2 px-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition flex flex-col items-center justify-center text-center gap-1 border min-h-[44px] cursor-pointer disabled:cursor-not-allowed ${
                          isCurrent
                            ? `${cfg.bg} ${cfg.text} ${cfg.border} ring-2 ring-amber-400 font-black`
                            : isCancel
                            ? 'bg-slate-950 hover:bg-red-950/40 text-red-400/80 hover:text-red-300 border-slate-800 hover:border-red-800/60 disabled:opacity-30'
                            : 'bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border-slate-800'
                        }`}
                      >
                        <span className="text-[10px] opacity-75">{isCurrent ? 'Current' : 'Set to'}</span>
                        <span className="truncate w-full">{st}</span>
                      </button>
                    );
                  }
                )}
              </div>
            </div>
          </div>

          {/* Section 1: DELIVERY DETAILS CARD */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <MapPin className="w-5 h-5 text-amber-500" />
                Delivery & Customer Details
              </h2>
              {order.address_label && (
                <span className="text-xs uppercase font-bold tracking-wider px-2.5 py-0.5 rounded bg-slate-800 text-amber-400 border border-slate-700">
                  {order.address_label}
                </span>
              )}
            </div>

            {/* High-contrast large readable delivery info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Recipient info */}
              <div className="space-y-3">
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Recipient Name
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-white tracking-tight mt-0.5">
                    {order.recipient_name}
                  </div>
                </div>

                {/* Contact phone with tap-to-call link */}
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Phone Number (Tap to Call)
                  </div>
                  {order.recipient_phone ? (
                    <a
                      href={`tel:${order.recipient_phone}`}
                      className="inline-flex items-center gap-2.5 mt-1 px-3.5 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 hover:text-amber-200 font-mono text-base sm:text-lg font-bold transition active:scale-95"
                    >
                      <Phone className="w-4 h-4" />
                      <span>{order.recipient_phone}</span>
                    </a>
                  ) : (
                    <span className="text-slate-500 text-sm">No phone provided</span>
                  )}
                </div>

                {/* Email with mailto link */}
                {order.recipient_email && (
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Email Address
                    </div>
                    <a
                      href={`mailto:${order.recipient_email}`}
                      className="inline-flex items-center gap-1.5 mt-0.5 text-sm text-slate-300 hover:text-amber-400 font-mono"
                    >
                      <Mail className="w-3.5 h-3.5" />
                      <span>{order.recipient_email}</span>
                    </a>
                  </div>
                )}
              </div>

              {/* Full Address details */}
              <div className="space-y-3 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-amber-500" />
                  Full Shipping Address
                </div>

                <div className="text-base sm:text-lg font-semibold text-slate-100 leading-snug">
                  <div>{order.address_line1}</div>
                  {order.address_line2 && <div className="text-slate-300 mt-0.5">{order.address_line2}</div>}
                  <div className="mt-1 text-amber-300 font-bold">
                    {order.city}, {order.state} - <span className="font-mono text-lg">{order.pincode}</span>
                  </div>
                </div>

                {/* Delivery Notes highlighted */}
                {order.delivery_notes && (
                  <div className="mt-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                    <div className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5" /> Delivery Instructions
                    </div>
                    <div className="text-sm font-semibold text-amber-100 mt-1">
                      "{order.delivery_notes}"
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Section 2: ITEMS TO PACK CHECKLIST */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <Box className="w-5 h-5 text-amber-500" />
                  Items to Pack ({items.length} Products, {totalItemsCount} Units)
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Tick off each product as you place it inside the shipping box
                </p>
              </div>

              {/* Checklist progress pill */}
              <div
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold font-mono ${
                  isFullyChecked
                    ? 'bg-emerald-950/70 border-emerald-700 text-emerald-300'
                    : 'bg-slate-800 border-slate-700 text-slate-300'
                }`}
              >
                {isFullyChecked ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <CheckSquare className="w-4 h-4 text-amber-400" />
                )}
                <span>
                  {checkedCount} / {items.length} Items Checked
                </span>
              </div>
            </div>

            {/* Items List */}
            {items.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-sm">
                No individual items listed in database for this order.
              </div>
            ) : (
              <div className="space-y-3">
                {items.map((item, index) => {
                  const isChecked = Boolean(checkedItems[item.id]);

                  return (
                    <div
                      key={item.id || index}
                      id={`order-item-${item.id || index}`}
                      onClick={() => toggleItemChecked(item.id)}
                      className={`flex items-center justify-between gap-3 p-3.5 sm:p-4 rounded-xl border transition cursor-pointer select-none ${
                        isChecked
                          ? 'bg-emerald-950/20 border-emerald-600/40 text-slate-200'
                          : 'bg-slate-950/80 hover:bg-slate-950 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {/* Checkbox trigger */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleItemChecked(item.id);
                        }}
                        className="p-1 text-slate-400 hover:text-amber-400 transition"
                      >
                        {isChecked ? (
                          <CheckSquare className="w-6 h-6 text-emerald-400 fill-emerald-950/60" />
                        ) : (
                          <Square className="w-6 h-6 text-slate-600 hover:text-slate-400" />
                        )}
                      </button>

                      {/* Product Image Thumbnail */}
                      <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center overflow-hidden shrink-0">
                        {item.product_image ? (
                          <img
                            src={item.product_image}
                            alt={item.product_name}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              (e.currentTarget as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <ShoppingBag className="w-6 h-6 text-slate-500" />
                        )}
                      </div>

                      {/* Item Details */}
                      <div className="flex-1 min-w-0">
                        <div
                          className={`text-sm sm:text-base font-bold leading-tight ${
                            isChecked ? 'line-through text-slate-400' : 'text-white'
                          }`}
                        >
                          {item.product_name}
                        </div>

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-xs text-slate-400">
                          {item.brand && (
                            <span className="font-semibold text-slate-300">
                              Brand: {item.brand}
                            </span>
                          )}
                          {item.unit && (
                            <span className="bg-slate-800 px-1.5 py-0.2 rounded font-mono text-slate-300">
                              Unit: {item.unit}
                            </span>
                          )}
                          <span className="font-mono text-slate-400">
                            {formatCurrency(item.price_at_purchase)} each
                          </span>
                        </div>
                      </div>

                      {/* Quantity Pill (Large & Bold) */}
                      <div className="text-right shrink-0">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Qty
                        </div>
                        <div
                          className={`inline-flex items-center justify-center px-3 py-1 rounded-lg font-mono font-black text-lg sm:text-xl border ${
                            isChecked
                              ? 'bg-emerald-900/40 border-emerald-600/60 text-emerald-300'
                              : 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm'
                          }`}
                        >
                          x{item.quantity}
                        </div>
                        <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                          {formatCurrency((item.price_at_purchase || 0) * (item.quantity || 1))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section 3: ORDER SUMMARY */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
              <CreditCard className="w-5 h-5 text-amber-500" />
              Financial & Payment Summary
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Payment Status & Details */}
              <div className="space-y-3">
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Payment Method
                  </div>
                  <div className="text-base font-bold text-white uppercase font-mono mt-0.5">
                    {order.payment_method || 'Cash on Delivery (COD)'}
                  </div>
                </div>

                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Payment Status
                  </div>
                  <div className="mt-1">
                    <span
                      className={`inline-block text-xs font-bold uppercase px-2.5 py-1 rounded-md border ${paymentBadge.bg} ${paymentBadge.text} ${paymentBadge.border}`}
                    >
                      {paymentBadge.label}
                    </span>
                  </div>
                </div>

                {order.coupon_code && (
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Applied Coupon
                    </div>
                    <div className="inline-flex items-center gap-1.5 mt-0.5 px-2 py-0.5 bg-emerald-950/60 border border-emerald-700/60 rounded text-emerald-300 font-mono text-xs font-bold">
                      <Tag className="w-3 h-3" />
                      {order.coupon_code}
                    </div>
                  </div>
                )}

                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Order Placed Timestamp
                  </div>
                  <div className="text-xs text-slate-300 font-mono mt-0.5 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    {formatDateTime(order.placed_at)}
                  </div>
                </div>
              </div>

              {/* Price Breakdown */}
              <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-2 text-sm">
                <div className="flex justify-between text-slate-400">
                  <span>Subtotal</span>
                  <span className="font-mono text-slate-200">{formatCurrency(order.subtotal)}</span>
                </div>

                {order.discount_amount !== null && order.discount_amount !== undefined && order.discount_amount > 0 && (
                  <div className="flex justify-between text-emerald-400">
                    <span>Discount</span>
                    <span className="font-mono">-{formatCurrency(order.discount_amount)}</span>
                  </div>
                )}

                {order.fees !== null && order.fees !== undefined && order.fees > 0 && (
                  <div className="flex justify-between text-slate-400">
                    <span>Shipping & Packaging Fees</span>
                    <span className="font-mono text-slate-200">{formatCurrency(order.fees)}</span>
                  </div>
                )}

                <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-base sm:text-lg font-black text-white">
                  <span>Total Amount</span>
                  <span className="font-mono text-amber-400 text-xl sm:text-2xl">
                    {formatCurrency(order.total_amount)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
