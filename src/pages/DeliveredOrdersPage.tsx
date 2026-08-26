import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { Order } from '../types';
import { fetchOrdersList } from '../services/orderService';
import {
  formatCurrency,
  formatDateTime,
  formatShortId,
} from '../utils/formatters';
import { PackingSlip } from '../components/PackingSlip';
import {
  Sparkles,
  ShieldCheck,
  Search,
  RefreshCw,
  Printer,
  Calendar,
  IndianRupee,
  User,
  Phone,
  MapPin,
  Camera,
  FileCheck,
} from 'lucide-react';

export const DeliveredOrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrderForSlip, setSelectedOrderForSlip] = useState<Order | null>(null);

  const loadDeliveredOrders = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);

    try {
      const res = await fetchOrdersList({ status: 'delivered', pageSize: 150 });
      setOrders(res.orders);
    } catch (err) {
      console.error('Failed to load delivered orders:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDeliveredOrders();

    const channel = supabase
      .channel('delivered_orders_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => loadDeliveredOrders(true)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadDeliveredOrders]);

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

  const totalDeliveredRevenue = orders.reduce((sum, o) => sum + (o.total_amount || 0), 0);

  return (
    <div className="space-y-5">
      {/* Top Header Card */}
      <div
        id="delivered-orders-header"
        className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs transition-all"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-900 border border-emerald-300 flex items-center gap-1.5 font-mono-code">
                <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
                Stage 5 • Fulfilled & Delivered
              </span>
              <span className="text-xs text-slate-400 font-mono-code">
                {orders.length} successfully delivered orders
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-serif-display font-bold text-slate-900">
              Delivered Orders
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              Completed customer deliveries verified with Proof of Delivery (POD) and collected revenue.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap self-start md:self-center">
            <div className="bg-emerald-50 border border-emerald-200 px-3.5 py-1.5 rounded-xl text-right">
              <div className="text-[10px] uppercase font-mono-code text-emerald-800 font-bold">
                Total Delivered Value
              </div>
              <div className="text-sm font-bold text-emerald-950 font-mono-code">
                {formatCurrency(totalDeliveredRevenue)}
              </div>
            </div>

            <button
              id="btn-refresh-delivered"
              type="button"
              onClick={() => loadDeliveredOrders(true)}
              disabled={refreshing || loading}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            id="input-search-delivered"
            type="text"
            placeholder="Search delivered archive..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
          />
        </div>

        <div className="text-xs text-slate-500 font-mono-code">
          Showing {filteredOrders.length} of {orders.length} completed
        </div>
      </div>

      {/* Content Grid */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-700">Loading completed orders...</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto text-emerald-600">
            <Sparkles className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">No Delivered Orders Yet</h3>
          <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
            {searchQuery
              ? 'No delivered orders match your search query.'
              : 'As packages are delivered and marked with proof of delivery, they will appear here.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredOrders.map((order) => {
            const partner = order.delivery?.delivery_partner;
            const pod = order.delivery?.proof_of_delivery;

            return (
              <div
                key={order.id}
                id={`delivered-card-${order.id}`}
                className="bg-white rounded-2xl border border-slate-200 hover:border-emerald-300 p-4 flex flex-col justify-between shadow-xs transition-all duration-150"
              >
                <div className="space-y-3">
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-slate-100">
                    <div>
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/orders/${order.id}`}
                          className="font-mono-code font-bold text-xs text-slate-900 hover:text-emerald-700 transition"
                        >
                          #{formatShortId(order.id)}
                        </Link>
                        <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-900 text-[10px] font-bold rounded font-mono-code uppercase border border-emerald-300 flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3 text-emerald-600" />
                          Delivered
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500 font-mono-code flex items-center gap-1 mt-0.5">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        {order.delivered_at ? formatDateTime(order.delivered_at) : 'Completed'}
                      </span>
                    </div>

                    <div className="text-right">
                      <div className="text-sm font-bold text-emerald-950">
                        {formatCurrency(order.total_amount)}
                      </div>
                      <span className="text-[10px] font-mono-code uppercase px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold">
                        Paid ({order.payment_method || 'COD'})
                      </span>
                    </div>
                  </div>

                  {/* Customer Info */}
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center justify-between font-bold text-slate-900">
                      <span className="truncate">{order.recipient_name}</span>
                      <span className="font-mono-code text-[11px] text-slate-500">{order.pincode}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 line-clamp-1">
                      {order.address_line1}, {order.city}
                    </div>
                  </div>

                  {/* Proof of Delivery Details Box */}
                  <div className="bg-emerald-50/50 rounded-xl p-2.5 border border-emerald-200/70 space-y-1 text-xs text-emerald-950">
                    <div className="flex items-center justify-between font-semibold">
                      <span className="flex items-center gap-1">
                        <FileCheck className="w-3.5 h-3.5 text-emerald-600" />
                        Proof of Delivery
                      </span>
                      <span className="font-mono-code text-[10px] uppercase text-emerald-700">
                        {pod?.method || 'Direct Handover'}
                      </span>
                    </div>
                    <div className="text-[11px] text-emerald-900">
                      Received by: <strong>{pod?.recipient_name || order.recipient_name}</strong>
                    </div>
                    {partner?.name && (
                      <div className="text-[10px] text-slate-500 font-mono-code">
                        Delivered by Rider: {partner.name}
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedOrderForSlip(order)}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                  >
                    <Printer className="w-3.5 h-3.5 text-slate-600" />
                    <span>Print Invoice</span>
                  </button>

                  <Link
                    to={`/orders/${order.id}`}
                    className="px-4 py-1.5 text-xs font-bold text-slate-900 hover:text-white bg-slate-100 hover:bg-slate-900 rounded-lg transition shadow-2xs"
                  >
                    Full Details →
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Invoice / Slip Print Modal */}
      {selectedOrderForSlip && (
        <PackingSlip
          order={selectedOrderForSlip}
          onClose={() => setSelectedOrderForSlip(null)}
        />
      )}
    </div>
  );
};
