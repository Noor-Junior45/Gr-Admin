import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { Order, OrderItem } from '../types';
import { fetchOrdersList, updateOrderStatus } from '../services/orderService';
import {
  formatCurrency,
  formatTimeElapsed,
  formatShortId,
  formatDateTime,
} from '../utils/formatters';
import { PackingSlip } from '../components/PackingSlip';
import {
  Box,
  CheckCircle2,
  Search,
  RefreshCw,
  Printer,
  ShoppingBag,
  Clock,
  ArrowRight,
  Truck,
  CheckSquare,
  Square,
  AlertCircle,
  FileText,
  User,
  Phone,
  MapPin,
} from 'lucide-react';

export const PackingQueuePage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selectedOrderForSlip, setSelectedOrderForSlip] = useState<Order | null>(null);

  // State to track item check-off per order
  const [checkedItems, setCheckedItems] = useState<Record<string, Record<string, boolean>>>({});

  const loadPackingOrders = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);

    try {
      const res = await fetchOrdersList({ status: 'packing', pageSize: 150 });
      setOrders(res.orders);
    } catch (err) {
      console.error('Failed to load packing queue:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadPackingOrders();

    const channel = supabase
      .channel('packing_queue_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => loadPackingOrders(true)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadPackingOrders]);

  const toggleItemCheck = (orderId: string, itemId: string) => {
    setCheckedItems((prev) => {
      const orderChecks = prev[orderId] || {};
      return {
        ...prev,
        [orderId]: {
          ...orderChecks,
          [itemId]: !orderChecks[itemId],
        },
      };
    });
  };

  const handleMarkPacked = async (orderId: string) => {
    setProcessingId(orderId);
    try {
      await updateOrderStatus(orderId, 'packed');
      setOrders((prev) => prev.filter((o) => o.id !== orderId));
    } catch (err: any) {
      alert(err.message || 'Failed to mark order as packed');
    } finally {
      setProcessingId(null);
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
        id="packing-queue-header"
        className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs transition-all"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-indigo-100 text-indigo-900 border border-indigo-300 flex items-center gap-1.5 font-mono-code">
                <Box className="w-3.5 h-3.5 text-indigo-700 animate-bounce" />
                Stage 2 • Warehouse Packing
              </span>
              <span className="text-xs text-slate-400 font-mono-code">
                {orders.length} orders actively being packed
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-serif-display font-bold text-slate-900">
              Packing Queue
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              Pick items from inventory shelves, verify packing checklists, print slips, and seal parcels for dispatch.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap self-start md:self-center">
            <button
              id="btn-refresh-packing"
              type="button"
              onClick={() => loadPackingOrders(true)}
              disabled={refreshing || loading}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span>Refresh Queue</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            id="input-search-packing"
            type="text"
            placeholder="Search packing queue..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
          />
        </div>

        <div className="text-xs text-slate-500 font-mono-code">
          Showing {filteredOrders.length} of {orders.length} in packing
        </div>
      </div>

      {/* Queue Content */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-700">Loading packing queue...</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-indigo-50 border border-indigo-200 flex items-center justify-center mx-auto text-indigo-600">
            <Box className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">Packing Queue Clear</h3>
          <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
            {searchQuery
              ? 'No packing orders match your search criteria.'
              : 'There are currently no orders waiting to be packed. Check Pending Orders to accept new arrivals.'}
          </p>
          <Link
            to="/orders/pending"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white font-semibold text-xs rounded-xl shadow-xs hover:bg-slate-800 transition"
          >
            Go to Pending Orders →
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredOrders.map((order) => {
            const isProcessing = processingId === order.id;
            const items = order.order_items || [];
            const orderChecks = checkedItems[order.id] || {};
            const checkedCount = items.filter((it) => orderChecks[it.id]).length;
            const allChecked = items.length > 0 && checkedCount === items.length;

            return (
              <div
                key={order.id}
                id={`packing-card-${order.id}`}
                className="bg-white rounded-2xl border border-slate-200 hover:border-indigo-300 p-4 flex flex-col justify-between shadow-xs transition-all duration-150"
              >
                <div className="space-y-3">
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-slate-100">
                    <div>
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/orders/${order.id}`}
                          className="font-mono-code font-bold text-xs text-slate-900 hover:text-indigo-600 transition"
                        >
                          #{formatShortId(order.id)}
                        </Link>
                        <span className="px-1.5 py-0.2 bg-indigo-50 text-indigo-800 text-[10px] font-bold rounded font-mono-code uppercase border border-indigo-200">
                          Packing
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500 font-mono-code flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3 text-indigo-500" />
                        Started: {order.placed_at ? formatTimeElapsed(order.placed_at) : 'Active'}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedOrderForSlip(order)}
                      className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                      title="Print packing slip"
                    >
                      <Printer className="w-3.5 h-3.5 text-slate-600" />
                      <span>Slip</span>
                    </button>
                  </div>

                  {/* Customer Preview */}
                  <div className="text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 truncate">{order.recipient_name}</span>
                      <span className="font-mono-code text-[11px] text-slate-500">{order.pincode}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-1 font-mono-code">
                      <Phone className="w-3 h-3 text-slate-400" />
                      <span>{order.recipient_phone}</span>
                    </div>
                  </div>

                  {/* Interactive Packing Checklist */}
                  <div className="bg-indigo-50/40 rounded-xl p-3 border border-indigo-100/80 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-indigo-950">
                      <span className="flex items-center gap-1.5">
                        <ShoppingBag className="w-3.5 h-3.5 text-indigo-600" />
                        Picking Checklist
                      </span>
                      <span className="text-[11px] font-mono-code text-indigo-700 bg-indigo-100 px-2 py-0.2 rounded-md">
                        {checkedCount}/{items.length} Checked
                      </span>
                    </div>

                    <div className="space-y-1.5 max-h-36 overflow-y-auto custom-scrollbar pr-1">
                      {items.map((it) => {
                        const isChecked = !!orderChecks[it.id];
                        return (
                          <div
                            key={it.id}
                            onClick={() => toggleItemCheck(order.id, it.id)}
                            className={`flex items-center justify-between p-2 rounded-lg text-xs cursor-pointer select-none transition ${
                              isChecked
                                ? 'bg-emerald-50 border border-emerald-200 text-emerald-900 line-through opacity-85'
                                : 'bg-white border border-slate-200 text-slate-800 hover:border-indigo-300'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              {isChecked ? (
                                <CheckSquare className="w-4 h-4 text-emerald-600 shrink-0" />
                              ) : (
                                <Square className="w-4 h-4 text-slate-400 shrink-0" />
                              )}
                              <span className="truncate font-medium">
                                <strong className="font-mono-code text-slate-900">{it.quantity}x</strong> {it.product_name}
                              </span>
                            </div>
                            <span className="text-[11px] font-mono-code text-slate-500 shrink-0 ml-2">
                              {it.unit || 'unit'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Card Action Footer */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2">
                  <Link
                    to={`/orders/${order.id}`}
                    className="px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
                  >
                    View
                  </Link>

                  <button
                    type="button"
                    onClick={() => handleMarkPacked(order.id)}
                    disabled={isProcessing}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50 active:scale-98 ${
                      allChecked
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                        : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{isProcessing ? 'Updating...' : 'Mark Packed & Ready'}</span>
                    <ArrowRight className="w-3.5 h-3.5 opacity-70" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Packing Slip Print Modal */}
      {selectedOrderForSlip && (
        <PackingSlip
          order={selectedOrderForSlip}
          onClose={() => setSelectedOrderForSlip(null)}
        />
      )}
    </div>
  );
};
