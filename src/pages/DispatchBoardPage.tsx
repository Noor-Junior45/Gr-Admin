import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Truck,
  UserPlus,
  PackageCheck,
  MapPin,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Phone,
  ShieldCheck,
  Search,
  Database,
  ArrowRight,
  Send,
  Boxes,
  Users,
} from 'lucide-react';
import { Order, Delivery, DeliveryPartner, ProofOfDelivery } from '../types';
import { fetchOrdersList } from '../services/orderService';
import {
  fetchDeliveryPartners,
  assignDeliveryPartner,
  updateDeliveryStatus,
} from '../services/deliveryService';
import {
  formatCurrency,
  formatTimeElapsed,
  formatTimeOnly,
  formatShortId,
  formatDateTime,
} from '../utils/formatters';
import { AssignPartnerModal } from '../components/AssignPartnerModal';
import { ProofOfDeliveryModal } from '../components/ProofOfDeliveryModal';
import { FailedDeliveryModal } from '../components/FailedDeliveryModal';
import { SchemaMigrationModal } from '../components/SchemaMigrationModal';

export const DispatchBoardPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [partners, setPartners] = useState<DeliveryPartner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activePartnerFilter, setActivePartnerFilter] = useState('all');

  // Modals state
  const [assignModalOrder, setAssignModalOrder] = useState<Order | null>(null);
  const [podModalOrder, setPodModalOrder] = useState<Order | null>(null);
  const [failedModalOrder, setFailedModalOrder] = useState<Order | null>(null);
  const [isSchemaModalOpen, setIsSchemaModalOpen] = useState(false);
  const [processingOrderId, setProcessingOrderId] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [orderRes, partnerList] = await Promise.all([
        fetchOrdersList({ pageSize: 150 }),
        fetchDeliveryPartners(),
      ]);
      setOrders(orderRes.orders);
      setPartners(partnerList);
    } catch (err) {
      console.error('Failed to load dispatch board data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Dispatch lifecycle handlers
  const handleAssignSubmit = async (partnerId: string, estimatedMinutes: number, notes?: string) => {
    if (!assignModalOrder) return;
    const updatedDelivery = await assignDeliveryPartner(
      assignModalOrder.id,
      partnerId,
      estimatedMinutes,
      notes
    );
    setOrders((prev) =>
      prev.map((o) => (o.id === assignModalOrder.id ? { ...o, delivery: updatedDelivery } : o))
    );
  };

  const handleStatusProgression = async (orderId: string, nextStatus: any, extra?: any) => {
    setProcessingOrderId(orderId);
    try {
      const updatedDelivery = await updateDeliveryStatus(orderId, nextStatus, extra);
      setOrders((prev) =>
        prev.map((o) => {
          if (o.id === orderId) {
            let updatedOrderStatus = o.status;
            if (nextStatus === 'picked_up' || nextStatus === 'out_for_delivery' || nextStatus === 'near_destination') {
              updatedOrderStatus = 'shipped';
            } else if (nextStatus === 'delivered') {
              updatedOrderStatus = 'delivered';
            } else if (nextStatus === 'failed') {
              updatedOrderStatus = 'failed';
            }
            return {
              ...o,
              status: updatedOrderStatus,
              delivery: updatedDelivery,
            };
          }
          return o;
        })
      );
    } catch (err: any) {
      alert(err.message || 'Failed to update delivery status');
    } finally {
      setProcessingOrderId(null);
    }
  };

  const handlePodSubmit = async (pod: ProofOfDelivery) => {
    if (!podModalOrder) return;
    await handleStatusProgression(podModalOrder.id, 'delivered', { proofOfDelivery: pod });
  };

  const handleFailedSubmit = async (
    reason: string,
    action: 'reschedule' | 'return_to_store' | 'refund',
    notes?: string
  ) => {
    if (!failedModalOrder) return;
    await handleStatusProgression(failedModalOrder.id, 'failed', {
      failureReason: reason,
      failureAction: action,
      notes,
    });
  };

  // Group orders into Kanban lanes
  const unassignedOrders = orders.filter(
    (o) =>
      (o.status === 'packed' || o.status === 'confirmed' || o.status === 'pending') &&
      (!o.delivery || o.delivery.status === 'unassigned' || !o.delivery.delivery_partner_id)
  );

  const assignedOrders = orders.filter(
    (o) =>
      o.delivery?.delivery_partner_id &&
      (o.delivery.status === 'assigned' || (!o.delivery.status && o.status === 'packed'))
  );

  const inTransitOrders = orders.filter(
    (o) =>
      o.delivery?.status === 'picked_up' ||
      o.delivery?.status === 'out_for_delivery' ||
      o.delivery?.status === 'near_destination' ||
      (o.status === 'shipped' && o.delivery?.status !== 'delivered' && o.delivery?.status !== 'failed')
  );

  const deliveredOrders = orders.filter(
    (o) => o.status === 'delivered' || o.delivery?.status === 'delivered'
  );

  const failedOrders = orders.filter(
    (o) => o.status === 'failed' || o.delivery?.status === 'failed'
  );

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-serif-display font-bold text-slate-900 text-2xl tracking-tight">
              Logistics & Delivery Dispatch Board
            </h1>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              Live Fleet Hub
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Assign fleet riders, track live transit milestones, trigger ETA near alerts, and verify proof of delivery.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={() => setIsSchemaModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 shadow-xs transition"
          >
            <Database className="w-3.5 h-3.5 text-amber-600" />
            Database Schema (SQL)
          </button>
          <Link
            to="/delivery-partners"
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 shadow-xs transition"
          >
            <Users className="w-3.5 h-3.5 text-cyan-600" />
            Manage Riders ({partners.length})
          </Link>
          <button
            type="button"
            onClick={loadData}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh Board
          </button>
        </div>
      </div>

      {/* Filter Row */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search parcel ID, customer, phone..."
            className="w-full pl-9 pr-4 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-slate-500 font-medium whitespace-nowrap">Filter Rider:</span>
          <select
            value={activePartnerFilter}
            onChange={(e) => setActivePartnerFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white text-slate-700 font-medium focus:outline-hidden"
          >
            <option value="all">All Fleet Riders</option>
            {partners.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.vehicle_type})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Kanban Dispatch Columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 items-start">
        {/* Column 1: Unassigned Orders */}
        <div className="bg-slate-100/70 border border-slate-200 rounded-2xl p-3.5 space-y-3 min-h-[500px]">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
              <h3 className="font-semibold text-slate-800 text-xs uppercase font-mono-code">
                1. Packed / Unassigned
              </h3>
            </div>
            <span className="px-2 py-0.5 bg-white text-slate-700 rounded-full text-xs font-mono-code font-bold shadow-xs">
              {unassignedOrders.length}
            </span>
          </div>

          <div className="space-y-3">
            {unassignedOrders.map((order) => (
              <div
                key={order.id}
                className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs space-y-2.5 hover:border-slate-300 transition"
              >
                <div className="flex items-center justify-between">
                  <Link
                    to={`/orders/${order.id}`}
                    className="font-mono-code font-bold text-xs text-slate-900 hover:text-blue-600"
                  >
                    {formatShortId(order.id)}
                  </Link>
                  <span className="text-[10px] font-mono-code text-slate-400">
                    {formatTimeElapsed(order.placed_at)}
                  </span>
                </div>

                <div>
                  <div className="text-xs font-semibold text-slate-900">{order.recipient_name}</div>
                  <div className="text-[11px] text-slate-500 truncate">
                    {order.address_line1}, {order.pincode}
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100">
                  <span className="font-mono-code font-bold text-slate-900">
                    {formatCurrency(order.total_amount)}
                  </span>
                  <button
                    type="button"
                    onClick={() => setAssignModalOrder(order)}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-cyan-900 bg-cyan-50 hover:bg-cyan-100 border border-cyan-200 rounded-lg transition"
                  >
                    <UserPlus className="w-3.5 h-3.5" /> Assign Rider
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Column 2: Rider Assigned (Awaiting Pickup) */}
        <div className="bg-cyan-50/40 border border-cyan-200/80 rounded-2xl p-3.5 space-y-3 min-h-[500px]">
          <div className="flex items-center justify-between pb-2 border-b border-cyan-200">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-500" />
              <h3 className="font-semibold text-cyan-950 text-xs uppercase font-mono-code">
                2. Rider Assigned
              </h3>
            </div>
            <span className="px-2 py-0.5 bg-white text-cyan-800 rounded-full text-xs font-mono-code font-bold shadow-xs">
              {assignedOrders.length}
            </span>
          </div>

          <div className="space-y-3">
            {assignedOrders.map((order) => {
              const partner = order.delivery?.delivery_partner;
              return (
                <div
                  key={order.id}
                  className="bg-white border border-cyan-200 rounded-xl p-3.5 shadow-xs space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <Link
                      to={`/orders/${order.id}`}
                      className="font-mono-code font-bold text-xs text-slate-900 hover:text-cyan-700"
                    >
                      {formatShortId(order.id)}
                    </Link>
                    <span className="text-[10px] font-mono-code text-cyan-700 bg-cyan-50 px-1.5 py-0.5 rounded">
                      Assigned
                    </span>
                  </div>

                  {/* Rider Profile Card in Column */}
                  <div className="p-2 rounded-lg bg-cyan-50/50 border border-cyan-100 text-xs space-y-1">
                    <div className="font-semibold text-cyan-950">{partner?.name || 'Rider Assigned'}</div>
                    <div className="flex items-center gap-1 text-[11px] text-slate-500">
                      <Phone className="w-3 h-3 text-slate-400" />
                      <span>{partner?.phone || 'Contact on file'}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100">
                    <span className="font-mono-code font-semibold text-slate-700">
                      {order.recipient_name}
                    </span>
                    <button
                      type="button"
                      disabled={processingOrderId === order.id}
                      onClick={() => handleStatusProgression(order.id, 'picked_up')}
                      className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-lg shadow-xs transition"
                    >
                      <Truck className="w-3.5 h-3.5" /> Mark Picked Up
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Column 3: Out For Delivery / On The Way / Near Destination */}
        <div className="bg-blue-50/40 border border-blue-200/80 rounded-2xl p-3.5 space-y-3 min-h-[500px]">
          <div className="flex items-center justify-between pb-2 border-b border-blue-200">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse" />
              <h3 className="font-semibold text-blue-950 text-xs uppercase font-mono-code">
                3. Out for Delivery
              </h3>
            </div>
            <span className="px-2 py-0.5 bg-white text-blue-800 rounded-full text-xs font-mono-code font-bold shadow-xs">
              {inTransitOrders.length}
            </span>
          </div>

          <div className="space-y-3">
            {inTransitOrders.map((order) => {
              const dStatus = order.delivery?.status || 'out_for_delivery';
              const isNear = dStatus === 'near_destination';
              const partner = order.delivery?.delivery_partner;

              return (
                <div
                  key={order.id}
                  className={`bg-white border rounded-xl p-3.5 shadow-xs space-y-2.5 ${
                    isNear ? 'border-amber-400 ring-1 ring-amber-400 bg-amber-50/20' : 'border-blue-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <Link
                      to={`/orders/${order.id}`}
                      className="font-mono-code font-bold text-xs text-slate-900 hover:text-blue-700"
                    >
                      {formatShortId(order.id)}
                    </Link>
                    <span
                      className={`text-[10px] font-mono-code font-bold px-2 py-0.5 rounded-full uppercase ${
                        isNear ? 'bg-amber-100 text-amber-900' : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {isNear ? 'Nearby Zone' : 'In Transit'}
                    </span>
                  </div>

                  <div className="text-xs">
                    <div className="font-semibold text-slate-900">{order.recipient_name}</div>
                    <div className="text-[11px] text-slate-500 truncate">{order.address_line1}</div>
                    {order.delivery?.estimated_delivery_at && (
                      <div className="flex items-center gap-1 text-[11px] font-mono-code text-blue-700 mt-1">
                        <Clock className="w-3 h-3 text-blue-500" />
                        ETA: {formatTimeOnly(order.delivery.estimated_delivery_at)}
                      </div>
                    )}
                  </div>

                  {/* Stage Progress Actions */}
                  <div className="pt-2 border-t border-slate-100 space-y-1.5">
                    {!isNear ? (
                      <button
                        type="button"
                        disabled={processingOrderId === order.id}
                        onClick={() =>
                          handleStatusProgression(order.id, 'near_destination', {
                            locationName: order.city,
                          })
                        }
                        className="w-full flex items-center justify-center gap-1 px-2.5 py-1 text-xs font-medium text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-lg transition"
                      >
                        <MapPin className="w-3.5 h-3.5 text-amber-600" /> Trigger “Nearby” Alert
                      </button>
                    ) : (
                      <div className="text-[11px] text-amber-800 bg-amber-100/60 px-2 py-0.5 rounded text-center font-medium">
                        Customer notified rider is nearby
                      </div>
                    )}

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setPodModalOrder(order)}
                        className="flex-1 flex items-center justify-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" /> Mark Delivered
                      </button>
                      <button
                        type="button"
                        onClick={() => setFailedModalOrder(order)}
                        className="px-2 py-1.5 text-xs font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition"
                        title="Report Delivery Issue"
                      >
                        Issue
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Column 4: Delivered / Completed (POD Verified) */}
        <div className="bg-emerald-50/40 border border-emerald-200/80 rounded-2xl p-3.5 space-y-3 min-h-[500px]">
          <div className="flex items-center justify-between pb-2 border-b border-emerald-200">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <h3 className="font-semibold text-emerald-950 text-xs uppercase font-mono-code">
                4. Delivered & POD
              </h3>
            </div>
            <span className="px-2 py-0.5 bg-white text-emerald-800 rounded-full text-xs font-mono-code font-bold shadow-xs">
              {deliveredOrders.length}
            </span>
          </div>

          <div className="space-y-3">
            {deliveredOrders.map((order) => {
              const pod = order.delivery?.proof_of_delivery;
              return (
                <div
                  key={order.id}
                  className="bg-white border border-emerald-200 rounded-xl p-3.5 shadow-xs space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <Link
                      to={`/orders/${order.id}`}
                      className="font-mono-code font-bold text-xs text-slate-900 hover:text-emerald-700"
                    >
                      {formatShortId(order.id)}
                    </Link>
                    <span className="flex items-center gap-0.5 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                      <CheckCircle2 className="w-3 h-3" /> Delivered
                    </span>
                  </div>

                  <div className="text-xs">
                    <div className="font-semibold text-slate-900">{order.recipient_name}</div>
                    <div className="text-[11px] text-slate-500">
                      Delivered at {formatTimeOnly(order.delivered_at || order.updated_at)}
                    </div>
                  </div>

                  {pod && (
                    <div className="p-2 bg-slate-50 rounded-lg border border-slate-200/70 text-[11px] space-y-0.5">
                      <div className="font-medium text-slate-700">Received by: {pod.recipient_name}</div>
                      <div className="text-slate-500 uppercase font-mono-code text-[10px]">
                        Method: {pod.method} {pod.otp_code ? `(OTP: ${pod.otp_code})` : ''}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Column 5: Failed / Reschedule Queue */}
        <div className="bg-rose-50/40 border border-rose-200/80 rounded-2xl p-3.5 space-y-3 min-h-[500px]">
          <div className="flex items-center justify-between pb-2 border-b border-rose-200">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              <h3 className="font-semibold text-rose-950 text-xs uppercase font-mono-code">
                5. Failed / Reschedule
              </h3>
            </div>
            <span className="px-2 py-0.5 bg-white text-rose-800 rounded-full text-xs font-mono-code font-bold shadow-xs">
              {failedOrders.length}
            </span>
          </div>

          <div className="space-y-3">
            {failedOrders.map((order) => (
              <div
                key={order.id}
                className="bg-white border border-rose-200 rounded-xl p-3.5 shadow-xs space-y-2"
              >
                <div className="flex items-center justify-between">
                  <Link
                    to={`/orders/${order.id}`}
                    className="font-mono-code font-bold text-xs text-slate-900 hover:text-rose-700"
                  >
                    {formatShortId(order.id)}
                  </Link>
                  <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded">
                    Action Needed
                  </span>
                </div>

                <div className="p-2 bg-rose-50/60 border border-rose-100 rounded-lg text-xs space-y-0.5">
                  <div className="font-semibold text-rose-950">
                    {order.delivery?.failure_reason || 'Customer unavailable'}
                  </div>
                  <div className="text-[11px] text-rose-700">
                    Next Step: {order.delivery?.failure_action || 'Reschedule'}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-1.5">
                  <button
                    type="button"
                    onClick={() => setAssignModalOrder(order)}
                    className="w-full flex items-center justify-center gap-1 px-2.5 py-1 text-xs font-semibold text-cyan-900 bg-cyan-50 hover:bg-cyan-100 border border-cyan-200 rounded-lg transition"
                  >
                    Reschedule / Reassign Rider
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modals */}
      {assignModalOrder && (
        <AssignPartnerModal
          isOpen={true}
          orderId={assignModalOrder.id}
          currentPartnerId={assignModalOrder.delivery?.delivery_partner_id}
          defaultNotes={assignModalOrder.delivery_notes}
          onClose={() => setAssignModalOrder(null)}
          onAssign={handleAssignSubmit}
        />
      )}

      {podModalOrder && (
        <ProofOfDeliveryModal
          isOpen={true}
          orderId={podModalOrder.id}
          recipientDefaultName={podModalOrder.recipient_name}
          onClose={() => setPodModalOrder(null)}
          onSubmit={handlePodSubmit}
        />
      )}

      {failedModalOrder && (
        <FailedDeliveryModal
          isOpen={true}
          orderId={failedModalOrder.id}
          onClose={() => setFailedModalOrder(null)}
          onSubmit={handleFailedSubmit}
        />
      )}

      <SchemaMigrationModal
        isOpen={isSchemaModalOpen}
        onClose={() => setIsSchemaModalOpen(false)}
      />
    </div>
  );
};
