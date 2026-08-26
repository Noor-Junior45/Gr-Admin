import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { Order, DeliveryPartner } from '../types';
import { fetchOrdersList, updateOrderStatus, deleteOrder } from '../services/orderService';
import {
  fetchDeliveryPartners,
  assignDeliveryPartner,
} from '../services/deliveryService';
import {
  formatCurrency,
  formatTimeElapsed,
  formatShortId,
  formatDateTime,
} from '../utils/formatters';
import { AssignPartnerModal } from '../components/AssignPartnerModal';
import { PackingSlip } from '../components/PackingSlip';
import {
  CheckCircle2,
  Truck,
  UserPlus,
  Search,
  RefreshCw,
  Phone,
  MapPin,
  Clock,
  Printer,
  ShieldCheck,
  ArrowRight,
  User,
  Navigation,
  Send,
  Boxes,
  Trash2,
} from 'lucide-react';

export const ReadyOrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [partners, setPartners] = useState<DeliveryPartner[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [assigningOrder, setAssigningOrder] = useState<Order | null>(null);
  const [selectedOrderForSlip, setSelectedOrderForSlip] = useState<Order | null>(null);
  const [directDispatchingId, setDirectDispatchingId] = useState<string | null>(null);

  const loadReadyOrders = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);

    try {
      const [orderRes, partnerList] = await Promise.all([
        fetchOrdersList({ status: 'packed', pageSize: 150 }),
        fetchDeliveryPartners(),
      ]);
      setOrders(orderRes.orders);
      setPartners(partnerList);
    } catch (err) {
      console.error('Failed to load ready orders:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadReadyOrders();

    const channel = supabase
      .channel('ready_orders_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => loadReadyOrders(true)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadReadyOrders]);

  const handlePartnerAssigned = async (
    partnerId: string,
    estimatedMinutes: number,
    notes?: string
  ) => {
    if (!assigningOrder) return;
    try {
      await assignDeliveryPartner(assigningOrder.id, partnerId, estimatedMinutes, notes);
      await updateOrderStatus(assigningOrder.id, 'shipped');
      setOrders((prev) => prev.filter((o) => o.id !== assigningOrder.id));
      setAssigningOrder(null);
    } catch (err: any) {
      alert(err.message || 'Failed to assign rider and dispatch');
    }
  };

  const handleDirectDispatch = async (orderId: string) => {
    if (!window.confirm('Dispatch this order for delivery directly?')) return;
    setDirectDispatchingId(orderId);
    try {
      await updateOrderStatus(orderId, 'shipped');
      setOrders((prev) => prev.filter((o) => o.id !== orderId));
    } catch (err: any) {
      alert(err.message || 'Failed to dispatch order');
    } finally {
      setDirectDispatchingId(null);
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (!window.confirm(`Permanently delete order #${formatShortId(orderId)} from database? This will completely remove it from user history.`)) {
      return;
    }
    setDirectDispatchingId(orderId);
    try {
      await deleteOrder(orderId);
      setOrders((prev) => prev.filter((o) => o.id !== orderId));
    } catch (err: any) {
      alert(err.message || 'Failed to delete order.');
    } finally {
      setDirectDispatchingId(null);
    }
  };

  const filteredOrders = orders.filter((o) => {
    if (!searchQuery.trim()) return true;
    const term = searchQuery.toLowerCase();
    return (
      o.recipient_name?.toLowerCase().includes(term) ||
      o.recipient_phone?.includes(term) ||
      o.id.toLowerCase().includes(term) ||
      o.city?.toLowerCase().includes(term) ||
      o.pincode?.includes(term)
    );
  });

  return (
    <div className="space-y-5">
      {/* Top Header Card */}
      <div
        id="ready-orders-header"
        className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs transition-all"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-cyan-100 text-cyan-900 border border-cyan-300 flex items-center gap-1.5 font-mono-code">
                <CheckCircle2 className="w-3.5 h-3.5 text-cyan-700" />
                Stage 3 • Ready for Rider
              </span>
              <span className="text-xs text-slate-400 font-mono-code">
                {orders.length} parcels packed & staged in store
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-serif-display font-bold text-slate-900">
              Ready for Dispatch
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              Assign delivery riders to staged packages or dispatch for delivery.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap self-start md:self-center">
            <button
              id="btn-refresh-ready"
              type="button"
              onClick={() => loadReadyOrders(true)}
              disabled={refreshing || loading}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span>Refresh Staged</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            id="input-search-ready"
            type="text"
            placeholder="Search staged orders..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-600 focus:bg-white transition"
          />
        </div>

        <div className="text-xs text-slate-500 font-mono-code">
          Showing {filteredOrders.length} of {orders.length} ready parcels
        </div>
      </div>

      {/* Content Grid */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <RefreshCw className="w-8 h-8 text-cyan-600 animate-spin mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-700">Loading staged parcels...</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-cyan-50 border border-cyan-200 flex items-center justify-center mx-auto text-cyan-600">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">Dispatch Bay Empty</h3>
          <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
            {searchQuery
              ? 'No ready orders match your search criteria.'
              : 'All packed orders have been dispatched to riders.'}
          </p>
          <Link
            to="/orders/packing"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white font-semibold text-xs rounded-xl shadow-xs hover:bg-slate-800 transition"
          >
            Check Packing Queue →
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredOrders.map((order) => {
            const isDispatching = directDispatchingId === order.id;
            const items = order.order_items || [];

            return (
              <div
                key={order.id}
                id={`ready-card-${order.id}`}
                className="bg-white rounded-2xl border border-slate-200 hover:border-cyan-400 p-4 flex flex-col justify-between shadow-xs transition-all duration-150"
              >
                <div className="space-y-3">
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-slate-100">
                    <div>
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/orders/${order.id}`}
                          className="font-mono-code font-bold text-xs text-slate-900 hover:text-cyan-700 transition"
                        >
                          #{formatShortId(order.id)}
                        </Link>
                        <span className="px-1.5 py-0.2 bg-cyan-50 text-cyan-900 text-[10px] font-bold rounded font-mono-code uppercase border border-cyan-200">
                          Packed & Ready
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500 font-mono-code flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3 text-cyan-600" />
                        Packed: {order.packed_at ? formatDateTime(order.packed_at) : 'Recently'}
                      </span>
                    </div>

                    <div className="text-right">
                      <div className="text-sm font-bold text-slate-900">
                        {formatCurrency(order.total_amount)}
                      </div>
                      <span className="text-[10px] font-mono-code uppercase px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-medium">
                        {order.payment_method || 'COD'}
                      </span>
                    </div>
                  </div>

                  {/* Destination Details */}
                  <div className="space-y-1.5 text-xs bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <div className="flex items-center justify-between font-bold text-slate-900">
                      <span className="truncate">{order.recipient_name}</span>
                      <a
                        href={`tel:${order.recipient_phone}`}
                        className="text-[11px] font-mono-code text-cyan-700 hover:underline flex items-center gap-1"
                      >
                        <Phone className="w-3 h-3" />
                        {order.recipient_phone}
                      </a>
                    </div>

                    <div className="flex items-start gap-1.5 text-slate-600 text-[11px]">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <span className="line-clamp-2">
                        {order.address_line1}, {order.city} - {order.pincode}
                      </span>
                    </div>

                    {order.delivery_notes && (
                      <div className="text-[10px] text-amber-800 bg-amber-50 p-1.5 rounded border border-amber-200">
                        <strong>Note:</strong> {order.delivery_notes}
                      </div>
                    )}
                  </div>

                  {/* Items summary */}
                  <div className="text-xs text-slate-600 flex items-center justify-between px-1">
                    <span className="text-slate-500 font-mono-code text-[11px]">
                      {order.item_count || items.length} item(s) sealed
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedOrderForSlip(order)}
                      className="text-cyan-700 hover:text-cyan-800 font-semibold text-[11px] flex items-center gap-1 cursor-pointer"
                    >
                      <Printer className="w-3 h-3" />
                      Print Slip
                    </button>
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2">
                  <Link
                    to={`/orders/${order.id}`}
                    className="px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
                  >
                    View
                  </Link>

                  <button
                    type="button"
                    onClick={() => handleDeleteOrder(order.id)}
                    disabled={isDispatching}
                    title="Delete order permanently"
                    className="p-2 text-rose-500 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl transition cursor-pointer disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDirectDispatch(order.id)}
                    disabled={isDispatching}
                    className="px-3 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer disabled:opacity-50"
                    title="Dispatch directly without rider assignment"
                  >
                    {isDispatching ? 'Dispatching...' : 'Self Deliver'}
                  </button>

                  <button
                    type="button"
                    onClick={() => setAssigningOrder(order)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 bg-cyan-700 hover:bg-cyan-600 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer active:scale-98"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Assign Rider</span>
                    <ArrowRight className="w-3.5 h-3.5 opacity-70" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Assign Rider Modal */}
      {assigningOrder && (
        <AssignPartnerModal
          isOpen={!!assigningOrder}
          orderId={assigningOrder.id}
          currentPartnerId={assigningOrder.delivery?.delivery_partner_id}
          defaultNotes={assigningOrder.delivery_notes}
          onClose={() => setAssigningOrder(null)}
          onAssign={handlePartnerAssigned}
        />
      )}

      {/* Packing Slip Modal */}
      {selectedOrderForSlip && (
        <PackingSlip
          order={selectedOrderForSlip}
          onClose={() => setSelectedOrderForSlip(null)}
        />
      )}
    </div>
  );
};
