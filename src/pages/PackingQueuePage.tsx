import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Package,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Play,
  FileText,
  Boxes,
  RefreshCw,
  Search,
  Filter,
  Check,
  ChevronRight,
} from 'lucide-react';
import { Order, OrderItem } from '../types';
import { fetchOrdersList, updateOrderStatus } from '../services/orderService';
import { formatCurrency, formatTimeElapsed, formatTimeOnly, formatShortId } from '../utils/formatters';
import { PackingSlip } from '../components/PackingSlip';

export const PackingQueuePage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeTab, setActiveTab] = useState<'pending' | 'packing' | 'packed'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOrderForSlip, setSelectedOrderForSlip] = useState<Order | null>(null);
  const [actionInProgressId, setActionInProgressId] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const res = await fetchOrdersList({ pageSize: 150 });
      setOrders(res.orders);
    } catch (err) {
      console.error('Failed to load packing orders:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleStartPacking = async (orderId: string) => {
    setActionInProgressId(orderId);
    try {
      const updated = await updateOrderStatus(orderId, 'packing');
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: 'packing' } : o)));
    } catch (err: any) {
      alert(err.message || 'Failed to start packing');
    } finally {
      setActionInProgressId(null);
    }
  };

  const handleMarkPacked = async (orderId: string) => {
    setActionInProgressId(orderId);
    try {
      const updated = await updateOrderStatus(orderId, 'packed');
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: 'packed', packed_at: new Date().toISOString() } : o)));
    } catch (err: any) {
      alert(err.message || 'Failed to mark packed');
    } finally {
      setActionInProgressId(null);
    }
  };

  // Filter orders by active queue tab and search
  const pendingOrders = orders.filter((o) => o.status === 'pending' || o.status === 'confirmed');
  const packingOrders = orders.filter((o) => o.status === 'packing');
  const packedOrders = orders.filter((o) => o.status === 'packed');

  const currentList =
    activeTab === 'pending'
      ? pendingOrders
      : activeTab === 'packing'
      ? packingOrders
      : packedOrders;

  const filteredOrders = currentList.filter((o) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      o.id.toLowerCase().includes(q) ||
      o.recipient_name.toLowerCase().includes(q) ||
      o.pincode.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif-display font-bold text-slate-900 text-2xl tracking-tight">
            Warehouse Packing Queue
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Pick, verify, and pack pending orders to prepare parcels for rider dispatch.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={loadData}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 shadow-xs transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh Queue
          </button>
          <Link
            to="/dispatch"
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs transition"
          >
            Go to Dispatch Board <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Queue Stage Tabs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Tab 1: Pending Review & Pick */}
        <button
          type="button"
          onClick={() => setActiveTab('pending')}
          className={`p-4 rounded-xl border text-left transition cursor-pointer ${
            activeTab === 'pending'
              ? 'bg-amber-50/70 border-amber-400 shadow-xs ring-1 ring-amber-400'
              : 'bg-white border-slate-200 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider font-mono-code">
              Stage 1: Awaiting Packing
            </span>
            <span className="w-6 h-6 rounded-full bg-amber-200 text-amber-900 text-xs font-bold flex items-center justify-center font-mono-code">
              {pendingOrders.length}
            </span>
          </div>
          <div className="text-lg font-bold text-slate-900 mt-1">Pending Orders</div>
          <div className="text-xs text-slate-500 mt-0.5">Ready for picking team assignment</div>
        </button>

        {/* Tab 2: Currently Packing */}
        <button
          type="button"
          onClick={() => setActiveTab('packing')}
          className={`p-4 rounded-xl border text-left transition cursor-pointer ${
            activeTab === 'packing'
              ? 'bg-indigo-50/70 border-indigo-400 shadow-xs ring-1 ring-indigo-400'
              : 'bg-white border-slate-200 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider font-mono-code">
              Stage 2: Active Packing
            </span>
            <span className="w-6 h-6 rounded-full bg-indigo-200 text-indigo-900 text-xs font-bold flex items-center justify-center font-mono-code">
              {packingOrders.length}
            </span>
          </div>
          <div className="text-lg font-bold text-slate-900 mt-1">Packing in Progress</div>
          <div className="text-xs text-slate-500 mt-0.5">Item verification & bagging</div>
        </button>

        {/* Tab 3: Packed & Staged */}
        <button
          type="button"
          onClick={() => setActiveTab('packed')}
          className={`p-4 rounded-xl border text-left transition cursor-pointer ${
            activeTab === 'packed'
              ? 'bg-purple-50/70 border-purple-400 shadow-xs ring-1 ring-purple-400'
              : 'bg-white border-slate-200 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider font-mono-code">
              Stage 3: Ready for Dispatch
            </span>
            <span className="w-6 h-6 rounded-full bg-purple-200 text-purple-900 text-xs font-bold flex items-center justify-center font-mono-code">
              {packedOrders.length}
            </span>
          </div>
          <div className="text-lg font-bold text-slate-900 mt-1">Packed & Staged</div>
          <div className="text-xs text-slate-500 mt-0.5">Awaiting rider allocation / pickup</div>
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Filter by Order ID, customer name, or pincode..."
          className="w-full pl-9 pr-4 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 bg-white"
        />
      </div>

      {/* Orders Queue List */}
      {isLoading ? (
        <div className="py-16 text-center text-slate-400 text-sm">Loading packing queue...</div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <Boxes className="w-6 h-6" />
          </div>
          <h3 className="font-serif-display font-semibold text-slate-900 text-base">No orders in this stage</h3>
          <p className="text-xs text-slate-500 mt-1">
            All orders have been processed or matched by the filter.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredOrders.map((order) => {
            const placedTime = new Date(order.placed_at).getTime();
            const elapsedMins = Math.floor((Date.now() - placedTime) / 60000);
            const isDelayed = elapsedMins > 25 && order.status !== 'packed';
            const items = order.order_items || [];

            return (
              <div
                key={order.id}
                className={`bg-white border rounded-2xl p-5 shadow-xs flex flex-col justify-between transition hover:shadow-md ${
                  isDelayed ? 'border-amber-400 bg-amber-50/15' : 'border-slate-200'
                }`}
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div>
                      <Link
                        to={`/orders/${order.id}`}
                        className="font-mono-code font-bold text-slate-900 text-sm hover:text-amber-600 transition"
                      >
                        {formatShortId(order.id)}
                      </Link>
                      <div className="text-[11px] text-slate-400 font-mono-code mt-0.5">
                        Placed {formatTimeOnly(order.placed_at)} ({formatTimeElapsed(order.placed_at)})
                      </div>
                    </div>

                    {isDelayed && (
                      <span className="flex items-center gap-1 px-2 py-0.5 bg-rose-100 text-rose-800 border border-rose-200 text-[10px] font-bold rounded-md uppercase font-mono-code">
                        <AlertTriangle className="w-3 h-3" /> Delay: {elapsedMins}m
                      </span>
                    )}
                  </div>

                  {/* Customer & Address Details */}
                  <div className="py-3 space-y-1">
                    <div className="text-xs font-semibold text-slate-900">{order.recipient_name}</div>
                    <div className="text-[11px] text-slate-500 truncate">
                      {order.city} • Pincode: <span className="font-mono-code text-slate-700">{order.pincode}</span>
                    </div>
                    {order.delivery_notes && (
                      <div className="text-[11px] text-amber-800 bg-amber-50 px-2 py-1 rounded border border-amber-200 mt-1">
                        Note: {order.delivery_notes}
                      </div>
                    )}
                  </div>

                  {/* Items Pick List preview */}
                  <div className="pt-2 border-t border-slate-100 space-y-1.5 max-h-36 overflow-y-auto">
                    <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider font-mono-code">
                      Items to Pack ({items.reduce((s, it) => s + (it.quantity || 1), 0)} units):
                    </div>
                    {items.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs py-0.5">
                        <span className="text-slate-700 truncate max-w-[200px]">{item.product_name}</span>
                        <span className="font-mono-code font-semibold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded text-[11px]">
                          x{item.quantity}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Card Actions Footer */}
                <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedOrderForSlip(order)}
                    className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200 transition"
                    title="Print Packing Slip"
                  >
                    <FileText className="w-4 h-4" />
                  </button>

                  {order.status === 'pending' || order.status === 'confirmed' ? (
                    <button
                      type="button"
                      onClick={() => handleStartPacking(order.id)}
                      disabled={actionInProgressId === order.id}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition disabled:opacity-50"
                    >
                      <Play className="w-3.5 h-3.5 fill-white" />
                      {actionInProgressId === order.id ? 'Starting...' : 'Start Packing'}
                    </button>
                  ) : order.status === 'packing' ? (
                    <button
                      type="button"
                      onClick={() => handleMarkPacked(order.id)}
                      disabled={actionInProgressId === order.id}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-lg shadow-xs transition disabled:opacity-50"
                    >
                      <Check className="w-3.5 h-3.5" />
                      {actionInProgressId === order.id ? 'Marking...' : 'Mark Packed & Ready'}
                    </button>
                  ) : (
                    <Link
                      to="/dispatch"
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-purple-900 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg transition"
                    >
                      Ready for Dispatch Board →
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Printable Packing Slip Modal */}
      {selectedOrderForSlip && (
        <PackingSlip
          order={selectedOrderForSlip}
          items={selectedOrderForSlip.order_items || []}
          onClose={() => setSelectedOrderForSlip(null)}
        />
      )}
    </div>
  );
};
