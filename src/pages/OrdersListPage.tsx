import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { Order, OrderStatus } from '../types';
import {
  fetchOrdersList,
  updateOrderStatus,
  cancelOrderRPC,
  fetchOrderStatusCounts,
  OrderStatusCounts,
} from '../services/orderService';
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
  XCircle,
  Box,
  Truck,
  Bike,
} from 'lucide-react';
import { PackingQueuePage } from './PackingQueuePage';
import { ReadyOrdersPage } from './ReadyOrdersPage';
import { DispatchBoardPage } from './DispatchBoardPage';
import { useSwipeGesture } from '../hooks/useSwipeGesture';

const STAGE_TABS: Array<'order' | 'packing' | 'packed' | 'dispatch'> = [
  'order',
  'packing',
  'packed',
  'dispatch',
];

const PENDING_ONLY_STATUSES: OrderStatus[] = ['pending', 'confirmed'];
const PAGE_SIZE = 30;

const isPendingOrder = (status?: string | null): boolean => {
  const s = (status || '').toLowerCase().trim();
  return s === 'pending' || s === 'confirmed' || s === 'placed';
};

export interface OrdersListPageProps {
  defaultTab?: 'order' | 'packing' | 'packed' | 'dispatch';
}

export const OrdersListPage: React.FC<OrdersListPageProps> = ({ defaultTab }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  // Resolve active tab from props, pathname, or query parameters
  const resolveCurrentTab = useCallback((): 'order' | 'packing' | 'packed' | 'dispatch' => {
    if (defaultTab) return defaultTab;
    if (location.pathname === '/packing') return 'packing';
    if (
      location.pathname === '/ready' ||
      location.pathname === '/orders/ready' ||
      location.pathname === '/orders/packed' ||
      location.pathname === '/packed'
    ) {
      return 'packed';
    }
    if (location.pathname === '/dispatch' || location.pathname === '/dispatched') return 'dispatch';
    const tabParam = searchParams.get('tab');
    if (tabParam === 'packing') return 'packing';
    if (tabParam === 'packed' || tabParam === 'ready') return 'packed';
    if (tabParam === 'dispatch') return 'dispatch';
    return 'order';
  }, [defaultTab, location.pathname, searchParams]);

  const [activeTab, setActiveTab] = useState<'order' | 'packing' | 'packed' | 'dispatch'>(resolveCurrentTab);

  // Sync tab state whenever URL pathname or search params update
  useEffect(() => {
    setActiveTab(resolveCurrentTab());
  }, [resolveCurrentTab]);

  const handleTabChange = (tab: 'order' | 'packing' | 'packed' | 'dispatch') => {
    setActiveTab(tab);
    if (tab === 'order') {
      navigate('/orders', { replace: true });
    } else if (tab === 'packing') {
      navigate('/packing', { replace: true });
    } else if (tab === 'packed') {
      navigate('/ready', { replace: true });
    } else if (tab === 'dispatch') {
      navigate('/dispatch', { replace: true });
    }
  };

  // Swipe gestures to smoothly transition between stages (Order <-> Packing <-> Packed <-> Dispatch)
  const handleSwipeLeft = useCallback(() => {
    const curIdx = STAGE_TABS.indexOf(activeTab);
    if (curIdx < STAGE_TABS.length - 1) {
      handleTabChange(STAGE_TABS[curIdx + 1]);
    }
  }, [activeTab]);

  const handleSwipeRight = useCallback(() => {
    const curIdx = STAGE_TABS.indexOf(activeTab);
    if (curIdx > 0) {
      handleTabChange(STAGE_TABS[curIdx - 1]);
    }
  }, [activeTab]);

  const swipeHandlers = useSwipeGesture({
    onSwipeLeft: handleSwipeLeft,
    onSwipeRight: handleSwipeRight,
    minDistance: 50,
  });

  // Real-time stage counts for minimal badges
  const [counts, setCounts] = useState<OrderStatusCounts>({
    all: 0,
    pending: 0,
    packing: 0,
    packed: 0,
    shipped: 0,
    delivered: 0,
    cancelled: 0,
  });

  const loadCounts = useCallback(async () => {
    try {
      const c = await fetchOrderStatusCounts();
      setCounts(c);
    } catch (err) {
      console.warn('Failed to load status counts in top nav:', err);
    }
  }, []);

  useEffect(() => {
    loadCounts();

    const channel = supabase
      .channel('top_nav_order_counts_sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => loadCounts()
      )
      .subscribe();

    const interval = setInterval(loadCounts, 30000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [loadCounts]);

  // Pending Orders State (Order Tab)
  const [orders, setOrders] = useState<Order[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [page, setPage] = useState<number>(1);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

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

      const pendingOnly = result.orders.filter((o) => isPendingOrder(o.status));
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
            if (!isPendingOrder(payload.new.status)) {
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

  const handleAcceptOrder = async (orderId: string) => {
    setProcessingId(orderId);
    try {
      await updateOrderStatus(orderId, 'packing');
      setOrders((prev) => prev.filter((o) => o.id !== orderId));
      setTotalCount((prev) => Math.max(0, prev - 1));
      setCounts((prev) => ({
        ...prev,
        pending: Math.max(0, prev.pending - 1),
        packing: prev.packing + 1,
      }));
    } catch (err: any) {
      alert(err.message || 'Failed to accept order.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleCancelOrder = async (orderId: string, orderShortId: string) => {
    const confirmCancel = window.confirm(`Are you sure you want to cancel order #${orderShortId}? Items will be restocked to inventory.`);
    if (!confirmCancel) return;

    setProcessingId(orderId);
    try {
      await cancelOrderRPC(orderId, 'Cancelled by store operator');
      setOrders((prev) => prev.filter((o) => o.id !== orderId));
      setTotalCount((prev) => Math.max(0, prev - 1));
      setCounts((prev) => ({
        ...prev,
        pending: Math.max(0, prev.pending - 1),
        cancelled: prev.cancelled + 1,
      }));
    } catch (err: any) {
      alert(err.message || 'Failed to cancel order.');
    } finally {
      setProcessingId(null);
    }
  };

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

      const pendingOnly = result.orders.filter((o) => isPendingOrder(o.status));
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

  const pendingOrders = orders.filter((o) => isPendingOrder(o.status));

  return (
    <div {...swipeHandlers} className="space-y-4 touch-pan-y min-h-[75vh]">
      {/* Top Navbar: 4 Minimal Buttons (Order, Packing, Packed, Dispatch) */}
      <div className="w-full flex items-center justify-between gap-3 pb-1 border-b border-slate-200/80">
        <div
          id="orders-top-navbar"
          role="tablist"
          aria-label="Order stages navigation"
          className="w-full sm:w-auto flex items-center p-1 bg-slate-100/90 backdrop-blur-md rounded-2xl border border-slate-200/80 shadow-2xs gap-0.5 sm:gap-1.5"
        >
          {/* 1st: Order [Where new order received will appear] */}
          <button
            type="button"
            id="top-nav-btn-order"
            role="tab"
            aria-selected={activeTab === 'order'}
            onClick={() => handleTabChange('order')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-150 cursor-pointer select-none ${
              activeTab === 'order'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200/70'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
            title="Order - Pending Review"
          >
            <Clock
              className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 ${
                activeTab === 'order' ? 'text-amber-500' : 'text-slate-400'
              }`}
            />
            <span className="hidden sm:inline">Order</span>
            {counts.pending > 0 && (
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] sm:text-xs font-mono-code font-bold ${
                  activeTab === 'order'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-slate-200 text-slate-600'
                }`}
              >
                {counts.pending}
              </span>
            )}
          </button>

          {/* 2nd: Packing [Packing order will appear] */}
          <button
            type="button"
            id="top-nav-btn-packing"
            role="tab"
            aria-selected={activeTab === 'packing'}
            onClick={() => handleTabChange('packing')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-150 cursor-pointer select-none ${
              activeTab === 'packing'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200/70'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
            title="Packing Queue"
          >
            <Box
              className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 ${
                activeTab === 'packing' ? 'text-blue-500' : 'text-slate-400'
              }`}
            />
            <span className="hidden sm:inline">Packing</span>
            {counts.packing > 0 && (
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] sm:text-xs font-mono-code font-bold ${
                  activeTab === 'packing'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-slate-200 text-slate-600'
                }`}
              >
                {counts.packing}
              </span>
            )}
          </button>

          {/* 3rd: Packed [Ready for Rider - Between Packing and Dispatch] */}
          <button
            type="button"
            id="top-nav-btn-packed"
            role="tab"
            aria-selected={activeTab === 'packed'}
            onClick={() => handleTabChange('packed')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-150 cursor-pointer select-none ${
              activeTab === 'packed'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200/70'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
            title="Packed - Ready for Rider"
          >
            <Bike
              className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 ${
                activeTab === 'packed' ? 'text-teal-600' : 'text-slate-400'
              }`}
            />
            <span className="hidden sm:inline">Packed</span>
            {counts.packed > 0 && (
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] sm:text-xs font-mono-code font-bold ${
                  activeTab === 'packed'
                    ? 'bg-teal-100 text-teal-800'
                    : 'bg-slate-200 text-slate-600'
                }`}
              >
                {counts.packed}
              </span>
            )}
          </button>

          {/* 4th: Dispatch [items which left warehouse will shown] */}
          <button
            type="button"
            id="top-nav-btn-dispatch"
            role="tab"
            aria-selected={activeTab === 'dispatch'}
            onClick={() => handleTabChange('dispatch')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-150 cursor-pointer select-none ${
              activeTab === 'dispatch'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200/70'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
            title="Dispatch - Out for Delivery"
          >
            <Truck
              className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 ${
                activeTab === 'dispatch' ? 'text-emerald-500' : 'text-slate-400'
              }`}
            />
            <span className="hidden sm:inline">Dispatch</span>
            {counts.shipped > 0 && (
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] sm:text-xs font-mono-code font-bold ${
                  activeTab === 'dispatch'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-slate-200 text-slate-600'
                }`}
              >
                {counts.shipped}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Dynamic Views: Packing, Packed, Dispatch, or Order */}
      {activeTab === 'packing' && <PackingQueuePage />}

      {activeTab === 'packed' && <ReadyOrdersPage />}

      {activeTab === 'dispatch' && <DispatchBoardPage />}

      {activeTab === 'order' && (
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

                  {/* Order Items Details (Customer info is hidden from outside of page) */}
                  <Link
                    to={`/orders/${order.id}`}
                    className="block bg-slate-50 hover:bg-slate-100/90 transition-colors rounded-xl p-3 border border-slate-200/80 group"
                    title="View item and order details"
                  >
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-2">
                      <span className="flex items-center gap-1.5 font-bold text-slate-900">
                        <ShoppingBag className="w-3.5 h-3.5 text-amber-500" />
                        Items ({order.item_count || items.length})
                      </span>
                      <span className="text-[11px] text-amber-600 font-medium group-hover:underline">
                        View details &rarr;
                      </span>
                    </div>

                    <div className="space-y-1.5 max-h-32 overflow-y-auto custom-scrollbar pr-1">
                      {items.length > 0 ? (
                        items.map((it) => (
                          <div key={it.id} className="flex items-center justify-between text-xs text-slate-700 py-0.5 border-b border-slate-100 last:border-0">
                            <span className="truncate font-medium flex items-center gap-1.5">
                              <span className="font-mono-code text-[11px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-900">
                                {it.quantity}x
                              </span>
                              <span className="truncate">{it.product_name}</span>
                            </span>
                            <span className="font-mono-code text-[11px] font-semibold text-slate-600 shrink-0 ml-2">
                              {formatCurrency(it.price_at_purchase * it.quantity)}
                            </span>
                          </div>
                        ))
                      ) : (
                        <div className="text-xs text-slate-400 italic py-1">No item breakdown available</div>
                      )}
                    </div>
                  </Link>
                </div>

                {/* Action Buttons: Divided in two equal parts (Left: Cancel, Right: Accept) */}
                <div className="mt-3 pt-2.5 border-t border-slate-100 grid grid-cols-2 gap-2.5 w-full">
                  <button
                    type="button"
                    id={`btn-cancel-order-${order.id}`}
                    onClick={() => handleCancelOrder(order.id, formatShortId(order.id))}
                    disabled={processingId === order.id}
                    className="relative overflow-hidden flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm text-rose-700 bg-rose-50 hover:bg-rose-100 active:bg-rose-200 border border-rose-200 transition shadow-2xs cursor-pointer select-none disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Cancel order"
                  >
                    {processingId === order.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-600" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5 text-rose-600" />
                    )}
                    <span>Cancel</span>
                  </button>

                  <button
                    type="button"
                    id={`btn-accept-order-${order.id}`}
                    onClick={() => handleAcceptOrder(order.id)}
                    disabled={processingId === order.id}
                    className="relative overflow-hidden flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm text-white bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 border border-emerald-500 transition shadow-[0_2px_8px_rgba(16,185,129,0.3)] cursor-pointer select-none disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Accept order and move to Packing"
                  >
                    {processingId === order.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                    )}
                    <span>Accept</span>
                  </button>
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
      )}
    </div>
  );
};
