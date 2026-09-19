import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { Order, OrderStatus } from '../types';
import { fetchOrdersList } from '../services/orderService';
import {
  formatCurrency,
  formatDateTime,
  formatTimeElapsed,
  formatShortId,
} from '../utils/formatters';
import {
  Clock,
  RefreshCw,
  Phone,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ShoppingBag,
  User,
} from 'lucide-react';

const PENDING_ONLY_STATUSES: OrderStatus[] = ['pending'];
const PAGE_SIZE = 30;

export const OrdersListPage: React.FC = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [page, setPage] = useState<number>(1);
  const [error, setError] = useState<string | null>(null);

  const observerRef = useRef<HTMLDivElement | null>(null);

  // Initial load of strictly pending orders
  const loadInitialOrders = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const result = await fetchOrdersList({
        statusIn: PENDING_ONLY_STATUSES,
        sortBy: 'placed_at_desc',
        page: 1,
        pageSize: PAGE_SIZE,
      });

      const pendingOnly = result.orders.filter((o) => o.status === 'pending');
      setOrders(pendingOnly);
      setTotalCount(result.totalCount);
      setPage(1);
      setHasMore(result.orders.length >= PAGE_SIZE && result.orders.length < result.totalCount);
    } catch (err: any) {
      console.error('Failed to load pending orders:', err);
      setError(err.message || 'Failed to load pending orders.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadInitialOrders();
  }, [loadInitialOrders]);

  // Realtime subscription: new pending orders arrive automatically, accepted orders are removed
  useEffect(() => {
    const channel = supabase
      .channel('admin_pending_orders_realtime_list')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        (payload: any) => {
          if (payload?.eventType === 'UPDATE' && payload?.new) {
            if (payload.new.status !== 'pending') {
              setOrders((prev) => prev.filter((o) => o.id !== payload.new.id));
              return;
            }
          }
          loadInitialOrders(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadInitialOrders]);

  // Infinite scroll loader: loads next pages as user scrolls
  const loadMoreOrders = useCallback(async () => {
    if (loadingMore || !hasMore || loading) return;
    setLoadingMore(true);

    try {
      const nextPage = page + 1;
      const result = await fetchOrdersList({
        statusIn: PENDING_ONLY_STATUSES,
        sortBy: 'placed_at_desc',
        page: nextPage,
        pageSize: PAGE_SIZE,
      });

      const pendingOnly = result.orders.filter((o) => o.status === 'pending');
      if (pendingOnly.length > 0) {
        setOrders((prev) => {
          const existingIds = new Set(prev.map((o) => o.id));
          const newUnique = pendingOnly.filter((o) => !existingIds.has(o.id));
          return [...prev, ...newUnique];
        });
        setPage(nextPage);
        if (result.orders.length < PAGE_SIZE) {
          setHasMore(false);
        }
      } else {
        setHasMore(false);
      }
    } catch (err: any) {
      console.error('Error loading more orders:', err);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, loading, page]);

  // Infinite scroll IntersectionObserver
  useEffect(() => {
    const target = observerRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
          loadMoreOrders();
        }
      },
      { threshold: 0.1, rootMargin: '250px' }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [loadMoreOrders, hasMore, loadingMore, loading]);

  const pendingOrders = orders.filter((o) => o.status === 'pending');

  return (
    <div className="space-y-4">
      {/* Error Banner */}
      {error && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm rounded-xl flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold">Error: </span>
            {error}
          </div>
          <button
            type="button"
            onClick={() => loadInitialOrders(true)}
            className="text-xs font-semibold underline text-rose-900 hover:text-rose-700 cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading state */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <RefreshCw className="w-8 h-8 text-amber-500 animate-spin mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-700">Loading pending orders...</p>
        </div>
      ) : pendingOrders.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto text-emerald-600">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">All caught up!</h3>
          <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
            There are currently no new pending orders waiting for warehouse confirmation.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5 sm:gap-4">
          {pendingOrders.map((order) => {
            const items = order.order_items || [];
            const isUrgent = order.placed_at
              ? new Date().getTime() - new Date(order.placed_at).getTime() > 15 * 60 * 1000
              : false;

            return (
              <div
                key={order.id}
                id={`pending-card-${order.id}`}
                className={`bg-white rounded-xl border transition-all duration-150 p-3 sm:p-3.5 flex flex-col justify-between shadow-2xs hover:shadow-xs ${
                  isUrgent ? 'border-amber-400 ring-1 ring-amber-300/70' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                {/* Card Header */}
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-2 pb-2 border-b border-slate-100">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Link
                          to={`/orders/${order.id}`}
                          className="font-mono-code font-bold text-xs text-slate-900 hover:text-amber-600 transition"
                        >
                          #{formatShortId(order.id)}
                        </Link>
                        {isUrgent && (
                          <span className="px-1.5 py-0.2 bg-rose-100 text-rose-800 text-[10px] font-bold rounded font-mono-code uppercase">
                            Overdue
                          </span>
                        )}
                      </div>

                      {/* Date & Time beside Just Now / Elapsed Time */}
                      <div className="flex items-center gap-1.5 flex-wrap text-[10.5px] text-slate-500 font-mono-code mt-0.5">
                        <span className="flex items-center gap-1 font-medium text-amber-700">
                          <Clock className="w-3 h-3 text-amber-500 shrink-0" />
                          {order.placed_at ? formatTimeElapsed(order.placed_at) : 'Just now'}
                        </span>
                        {order.placed_at && (
                          <>
                            <span className="text-slate-300">•</span>
                            <span className="text-slate-600">{formatDateTime(order.placed_at)}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-sm font-bold text-slate-900">
                        {formatCurrency(order.total_amount)}
                      </div>
                      <span className="text-[10px] font-mono-code uppercase px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-medium">
                        {order.payment_method || 'COD'}
                      </span>
                    </div>
                  </div>

                  {/* Customer Info */}
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center gap-1.5 font-bold text-slate-900">
                      <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{order.recipient_name}</span>
                    </div>

                    <div className="flex items-center gap-1.5 text-slate-600 font-mono-code text-[11px]">
                      <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                      <a href={`tel:${order.recipient_phone}`} className="hover:underline hover:text-slate-900">
                        {order.recipient_phone}
                      </a>
                    </div>

                    <div className="flex items-start gap-1.5 text-slate-500 text-[11px]">
                      <MapPin className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />
                      <span className="line-clamp-2">
                        {order.address_line1}, {order.city} - {order.pincode}
                      </span>
                    </div>
                  </div>

                  {/* Order Items Preview */}
                  <div className="bg-slate-50 rounded-lg p-2 space-y-1 border border-slate-100">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700">
                      <span className="flex items-center gap-1">
                        <ShoppingBag className="w-3 h-3 text-slate-400" />
                        Items ({order.item_count || items.length})
                      </span>
                    </div>

                    <div className="space-y-1 max-h-20 overflow-y-auto custom-scrollbar pr-1">
                      {items.length > 0 ? (
                        items.map((it) => (
                          <div key={it.id} className="flex items-center justify-between text-xs text-slate-600">
                            <span className="truncate font-medium">
                              {it.quantity}x {it.product_name}
                            </span>
                            <span className="font-mono-code text-[11px] text-slate-500 shrink-0 ml-2">
                              {formatCurrency(it.price_at_purchase * it.quantity)}
                            </span>
                          </div>
                        ))
                      ) : (
                        <div className="text-[11px] text-slate-400 italic">No item breakdown available</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Center Long Red Liquid Apple Glassmorphism Pending Button */}
                <div className="mt-2.5 pt-2.5 border-t border-slate-100 flex items-center justify-center w-full">
                  <Link
                    to={`/orders/${order.id}`}
                    id={`btn-pending-action-${order.id}`}
                    className="w-full sm:w-[94%] relative overflow-hidden flex items-center justify-center gap-2 py-2.5 px-6 rounded-2xl font-bold text-xs sm:text-sm text-white tracking-wider uppercase shadow-[0_8px_20px_-3px_rgba(239,68,68,0.45),inset_0_1px_1.5px_0_rgba(255,255,255,0.55),inset_0_-2px_4px_0_rgba(0,0,0,0.2)] bg-gradient-to-r from-red-600 via-rose-600 to-red-600 backdrop-blur-xl border border-white/35 cursor-pointer select-none"
                    title="View pending order details"
                  >
                    {/* Liquid Apple Glass Surface Sheen & Specular Reflection */}
                    <div className="absolute inset-x-0 top-0 h-[48%] bg-gradient-to-b from-white/35 via-white/10 to-transparent pointer-events-none rounded-t-2xl" />

                    {/* Button Content */}
                    <span className="relative z-10 flex items-center justify-center gap-2 drop-shadow-xs">
                      <span className="w-2 h-2 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.95)] animate-pulse" />
                      <span>Pending</span>
                    </span>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Infinite Scroll Sentinel */}
      <div ref={observerRef} className="py-2 text-center text-xs text-slate-400">
        {loadingMore && (
          <div className="flex items-center justify-center gap-2 py-3 text-slate-500">
            <Loader2 className="w-4 h-4 animate-spin text-amber-600" />
            <span>Loading more pending orders...</span>
          </div>
        )}
      </div>
    </div>
  );
};
