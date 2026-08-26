import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { Order, ProofOfDelivery } from '../types';
import { fetchOrdersList, updateOrderStatus } from '../services/orderService';
import { saveProofOfDelivery, markDeliveryFailed } from '../services/deliveryService';
import {
  formatCurrency,
  formatTimeElapsed,
  formatShortId,
  formatDateTime,
} from '../utils/formatters';
import { ProofOfDeliveryModal } from '../components/ProofOfDeliveryModal';
import { FailedDeliveryModal } from '../components/FailedDeliveryModal';
import {
  Truck,
  ShieldCheck,
  Phone,
  MapPin,
  Clock,
  Search,
  RefreshCw,
  AlertTriangle,
  User,
  CheckCircle2,
  XCircle,
  Camera,
  Navigation,
  ExternalLink,
} from 'lucide-react';

export const DispatchedOrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [podOrder, setPodOrder] = useState<Order | null>(null);
  const [failedOrder, setFailedOrder] = useState<Order | null>(null);

  const loadDispatchedOrders = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);

    try {
      const res = await fetchOrdersList({ status: 'shipped', pageSize: 150 });
      setOrders(res.orders);
    } catch (err) {
      console.error('Failed to load dispatched orders:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDispatchedOrders();

    const channel = supabase
      .channel('dispatched_orders_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => loadDispatchedOrders(true)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadDispatchedOrders]);

  const handleRecordPOD = async (podData: ProofOfDelivery) => {
    if (!podOrder) return;
    try {
      await saveProofOfDelivery(podOrder.id, podData);
      await updateOrderStatus(podOrder.id, 'delivered');
      setOrders((prev) => prev.filter((o) => o.id !== podOrder.id));
      setPodOrder(null);
    } catch (err: any) {
      alert(err.message || 'Failed to submit proof of delivery');
    }
  };

  const handleMarkFailed = async (
    reason: string,
    action: 'reschedule' | 'return_to_store' | 'refund',
    notes?: string
  ) => {
    if (!failedOrder) return;
    try {
      await markDeliveryFailed(failedOrder.id, reason, action, notes);
      setOrders((prev) => prev.filter((o) => o.id !== failedOrder.id));
      setFailedOrder(null);
    } catch (err: any) {
      alert(err.message || 'Failed to record failed delivery');
    }
  };

  const filteredOrders = orders.filter((o) => {
    if (!searchQuery.trim()) return true;
    const term = searchQuery.toLowerCase();
    const partnerName = o.delivery?.delivery_partner?.name?.toLowerCase() || '';
    return (
      o.recipient_name?.toLowerCase().includes(term) ||
      o.recipient_phone?.includes(term) ||
      o.id.toLowerCase().includes(term) ||
      o.city?.toLowerCase().includes(term) ||
      o.pincode?.includes(term) ||
      partnerName.includes(term)
    );
  });

  return (
    <div className="space-y-5">
      {/* Top Header Card */}
      <div
        id="dispatched-orders-header"
        className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs transition-all"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-sky-100 text-sky-900 border border-sky-300 flex items-center gap-1.5 font-mono-code">
                <Truck className="w-3.5 h-3.5 text-sky-700 animate-pulse" />
                Stage 4 • Out for Delivery
              </span>
              <span className="text-xs text-slate-400 font-mono-code">
                {orders.length} parcels in transit on the road
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-serif-display font-bold text-slate-900">
              Live Delivery Dispatches
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              Monitor active delivery riders on the road and record recipient proof of delivery (POD).
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap self-start md:self-center">
            <button
              id="btn-refresh-dispatched"
              type="button"
              onClick={() => loadDispatchedOrders(true)}
              disabled={refreshing || loading}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span>Refresh Transit</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            id="input-search-dispatched"
            type="text"
            placeholder="Search by customer, rider, phone, PIN..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white transition"
          />
        </div>

        <div className="text-xs text-slate-500 font-mono-code">
          Showing {filteredOrders.length} of {orders.length} active dispatches
        </div>
      </div>

      {/* Content Grid */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <RefreshCw className="w-8 h-8 text-sky-600 animate-spin mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-700">Loading live dispatches...</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-sky-50 border border-sky-200 flex items-center justify-center mx-auto text-sky-600">
            <Truck className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">No Parcels in Transit</h3>
          <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
            {searchQuery
              ? 'No active deliveries match your search query.'
              : 'There are no parcels currently out for delivery on the road.'}
          </p>
          <Link
            to="/orders/ready"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white font-semibold text-xs rounded-xl shadow-xs hover:bg-slate-800 transition"
          >
            Dispatch Ready Parcels →
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredOrders.map((order) => {
            const partner = order.delivery?.delivery_partner;

            return (
              <div
                key={order.id}
                id={`dispatched-card-${order.id}`}
                className="bg-white rounded-2xl border border-slate-200 hover:border-sky-400 p-4 flex flex-col justify-between shadow-xs transition-all duration-150"
              >
                <div className="space-y-3">
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-slate-100">
                    <div>
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/orders/${order.id}`}
                          className="font-mono-code font-bold text-xs text-slate-900 hover:text-sky-600 transition"
                        >
                          #{formatShortId(order.id)}
                        </Link>
                        <span className="px-1.5 py-0.2 bg-sky-50 text-sky-900 text-[10px] font-bold rounded font-mono-code uppercase border border-sky-200">
                          In Transit
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500 font-mono-code flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3 text-sky-500" />
                        Dispatched: {order.shipped_at ? formatTimeElapsed(order.shipped_at) : 'En route'}
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

                  {/* Delivery Partner / Rider Badge */}
                  <div className="bg-sky-50/70 rounded-xl p-2.5 border border-sky-200/80 flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-sky-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                        {partner?.name ? partner.name.charAt(0).toUpperCase() : 'R'}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-900 truncate">
                          {partner?.name || 'Self-Delivery (Store)'}
                        </div>
                        <div className="text-[10px] font-mono-code text-slate-500">
                          {partner?.vehicle_number || 'Direct Dispatch'} • {partner?.vehicle_type || 'Vehicle'}
                        </div>
                      </div>
                    </div>

                    {partner?.phone && (
                      <a
                        href={`tel:${partner.phone}`}
                        className="px-2 py-1 bg-white border border-sky-200 text-sky-700 rounded-lg text-xs font-mono-code font-bold hover:bg-sky-50 flex items-center gap-1 shrink-0"
                        title="Call delivery rider"
                      >
                        <Phone className="w-3 h-3" />
                        <span>Call</span>
                      </a>
                    )}
                  </div>

                  {/* Customer & Address Details */}
                  <div className="space-y-1.5 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <div className="flex items-center justify-between font-bold text-slate-900">
                      <span className="truncate">{order.recipient_name}</span>
                      <a
                        href={`tel:${order.recipient_phone}`}
                        className="text-[11px] font-mono-code text-slate-700 hover:underline flex items-center gap-1"
                      >
                        <Phone className="w-3 h-3 text-slate-400" />
                        {order.recipient_phone}
                      </a>
                    </div>

                    <div className="flex items-start gap-1.5 text-slate-600 text-[11px]">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <span className="line-clamp-2">
                        {order.address_line1}, {order.city} - {order.pincode}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setFailedOrder(order)}
                    className="px-2.5 py-2 text-xs font-semibold text-rose-700 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition cursor-pointer"
                    title="Report customer unreachable or address failure"
                  >
                    Failed
                  </button>

                  <button
                    type="button"
                    onClick={() => setPodOrder(order)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer active:scale-98"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Confirm Delivered (POD)</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Proof of Delivery Modal */}
      {podOrder && (
        <ProofOfDeliveryModal
          isOpen={!!podOrder}
          orderId={podOrder.id}
          recipientDefaultName={podOrder.recipient_name}
          onClose={() => setPodOrder(null)}
          onSubmit={handleRecordPOD}
        />
      )}

      {/* Failed Delivery Modal */}
      {failedOrder && (
        <FailedDeliveryModal
          isOpen={!!failedOrder}
          orderId={failedOrder.id}
          onClose={() => setFailedOrder(null)}
          onSubmit={handleMarkFailed}
        />
      )}
    </div>
  );
};
