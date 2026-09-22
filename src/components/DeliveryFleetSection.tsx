import React from 'react';
import {
  Truck,
  UserPlus,
  Zap,
  Phone,
  Star,
  MapPin,
  AlertTriangle,
  Navigation,
  Clock,
  Bike,
  Car,
  Loader2,
  Warehouse,
  CheckCircle2,
} from 'lucide-react';
import { Delivery, DeliveryStatus, Order } from '../types';

interface DeliveryFleetSectionProps {
  order: Order;
  delivery: Delivery | null;
  updating: boolean;
  onManualAssign: () => void;
  onAutoAssignNearest: () => void;
  onDeliveryStatusChange: (status: DeliveryStatus, extra?: any) => void;
  onRequestFailedModal: () => void;
}

export const DeliveryFleetSection: React.FC<DeliveryFleetSectionProps> = ({
  order,
  delivery,
  updating,
  onManualAssign,
  onAutoAssignNearest,
  onDeliveryStatusChange,
  onRequestFailedModal,
}) => {
  const partner = delivery?.delivery_partner;
  const isAssigned = Boolean(delivery?.delivery_partner_id || partner);

  const getVehicleIcon = (type?: string) => {
    switch (type) {
      case 'scooter':
      case 'bike':
        return <Bike className="w-4 h-4 text-cyan-600" />;
      case 'van':
      case 'car':
        return <Car className="w-4 h-4 text-cyan-600" />;
      default:
        return <Truck className="w-4 h-4 text-cyan-600" />;
    }
  };

  const getStatusBadge = (status?: DeliveryStatus) => {
    switch (status) {
      case 'delivered':
        return { label: 'Delivered', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case 'out_for_delivery':
        return { label: 'Out for Delivery', color: 'bg-blue-50 text-blue-700 border-blue-200' };
      case 'near_destination':
        return { label: 'Nearby Customer', color: 'bg-amber-50 text-amber-800 border-amber-200' };
      case 'picked_up':
        return { label: 'Picked Up', color: 'bg-sky-50 text-sky-700 border-sky-200' };
      case 'assigned':
        return { label: 'Rider Assigned', color: 'bg-cyan-50 text-cyan-800 border-cyan-200' };
      case 'failed':
        return { label: 'Delivery Issue', color: 'bg-rose-50 text-rose-700 border-rose-200' };
      default:
        return { label: 'Unassigned', color: 'bg-slate-100 text-slate-700 border-slate-200' };
    }
  };

  // Calculate estimated time for rider to arrive at the warehouse
  const getWarehouseArrivalETA = () => {
    if (!delivery) return null;

    if (['picked_up', 'out_for_delivery', 'near_destination', 'delivered'].includes(delivery.status)) {
      return {
        arrived: true,
        title: 'Arrived at Warehouse',
        subtitle: delivery.picked_up_at
          ? `Parcel picked up at ${new Date(delivery.picked_up_at).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}`
          : 'Package collected from warehouse',
      };
    }

    // Default estimate: 8 minutes from assignment
    const assignedTime = delivery.assigned_at ? new Date(delivery.assigned_at).getTime() : Date.now();
    const elapsedMinutes = Math.floor((Date.now() - assignedTime) / 60000);
    const remainingMinutes = Math.max(2, 8 - elapsedMinutes);
    const arrivalTime = new Date(assignedTime + 8 * 60000).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });

    return {
      arrived: false,
      title: `Arriving at Warehouse in ~${remainingMinutes} mins`,
      subtitle: `Expected pickup arrival by ${arrivalTime}`,
    };
  };

  const statusBadge = getStatusBadge(delivery?.status);
  const warehouseETA = isAssigned ? getWarehouseArrivalETA() : null;

  return (
    <section
      id="delivery-fleet-section"
      aria-label="Delivery Fleet Management"
      className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden transition-all"
    >
      {/* Header Bar */}
      <div className="px-3.5 py-3 sm:px-4 sm:py-3.5 bg-slate-50/75 border-b border-slate-200/80 flex items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-cyan-100/70 border border-cyan-200 flex items-center justify-center shrink-0">
            <Truck className="w-4 h-4 text-cyan-700" />
          </div>
          <h2 className="text-xs font-bold text-slate-900 tracking-tight uppercase font-mono-code flex items-center gap-1.5">
            Delivery Fleet
          </h2>
        </div>

        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${statusBadge.color}`}
        >
          {statusBadge.label}
        </span>
      </div>

      {/* Main Content Area */}
      <div className="p-3.5 sm:p-4 space-y-3.5">
        {/* If Rider is Assigned: Show Rider Details & Warehouse Arrival ETA */}
        {isAssigned && partner && (
          <div className="space-y-3">
            {/* Rider Identity & Arrival ETA Card */}
            <div className="p-3 sm:p-3.5 rounded-xl bg-slate-50/90 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {/* Rider Name & Number */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center shrink-0 shadow-2xs">
                  {getVehicleIcon(partner.vehicle_type)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">{partner.name}</span>
                    <span className="flex items-center gap-0.5 text-[11px] font-semibold text-amber-600 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      {partner.rating || 5.0}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-500 font-mono-code mt-0.5 flex-wrap">
                    {partner.phone ? (
                      <a
                        href={`tel:${partner.phone}`}
                        className="text-cyan-700 hover:text-cyan-800 flex items-center gap-1 font-semibold"
                        title="Click to call rider"
                      >
                        <Phone className="w-3 h-3" />
                        <span>{partner.phone}</span>
                      </a>
                    ) : (
                      <span className="text-slate-400">No phone recorded</span>
                    )}
                    <span>•</span>
                    <span className="capitalize">{partner.vehicle_type || 'bike'}</span>
                    {partner.vehicle_number && (
                      <>
                        <span>•</span>
                        <span className="uppercase">{partner.vehicle_number}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Warehouse Arrival ETA Banner */}
              {warehouseETA && (
                <div
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border text-xs shrink-0 self-start sm:self-auto ${
                    warehouseETA.arrived
                      ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                      : 'bg-cyan-50 text-cyan-900 border-cyan-200 shadow-2xs'
                  }`}
                >
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                      warehouseETA.arrived
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-cyan-100 text-cyan-700'
                    }`}
                  >
                    {warehouseETA.arrived ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      <Warehouse className="w-4 h-4" />
                    )}
                  </div>
                  <div>
                    <div className="font-bold leading-tight font-mono-code">
                      {warehouseETA.title}
                    </div>
                    <div className="text-[11px] opacity-80 leading-tight mt-0.5">
                      {warehouseETA.subtitle}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Rider Milestone Progression Buttons */}
            <div className="pt-0.5">
              <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 flex-wrap">
                {/* 1. Picked Up */}
                <button
                  type="button"
                  disabled={
                    updating ||
                    delivery?.status === 'picked_up' ||
                    delivery?.status === 'out_for_delivery' ||
                    delivery?.status === 'near_destination' ||
                    delivery?.status === 'delivered'
                  }
                  onClick={() => onDeliveryStatusChange('picked_up')}
                  className="relative overflow-hidden h-8.5 px-3 rounded-full flex items-center justify-center gap-1.5 text-xs font-semibold text-sky-950 bg-gradient-to-b from-sky-50 via-sky-100 to-sky-200 border border-sky-300 shadow-[inset_0_1px_1px_rgba(255,255,255,0.8),0_1.5px_3px_rgba(14,165,233,0.15)] backdrop-blur-md hover:from-white hover:to-sky-200 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <span className="pointer-events-none absolute inset-x-0 top-0 h-[46%] bg-gradient-to-b from-white/90 via-white/20 to-transparent rounded-t-full" />
                  <Truck className="w-3.5 h-3.5 text-sky-700 relative z-10 shrink-0" />
                  <span className="truncate relative z-10">1. Mark Picked Up</span>
                </button>

                {/* 2. Out for Delivery */}
                <button
                  type="button"
                  disabled={
                    updating ||
                    delivery?.status === 'out_for_delivery' ||
                    delivery?.status === 'near_destination' ||
                    delivery?.status === 'delivered'
                  }
                  onClick={() => onDeliveryStatusChange('out_for_delivery')}
                  className="relative overflow-hidden h-8.5 px-3 rounded-full flex items-center justify-center gap-1.5 text-xs font-semibold text-blue-950 bg-gradient-to-b from-blue-50 via-blue-100 to-blue-200 border border-blue-300 shadow-[inset_0_1px_1px_rgba(255,255,255,0.8),0_1.5px_3px_rgba(59,130,246,0.15)] backdrop-blur-md hover:from-white hover:to-blue-200 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <span className="pointer-events-none absolute inset-x-0 top-0 h-[46%] bg-gradient-to-b from-white/90 via-white/20 to-transparent rounded-t-full" />
                  <Navigation className="w-3.5 h-3.5 text-blue-700 relative z-10 shrink-0" />
                  <span className="truncate relative z-10">2. Out for Delivery</span>
                </button>

                {/* 3. Nearby Alert */}
                <button
                  type="button"
                  disabled={
                    updating ||
                    delivery?.status === 'near_destination' ||
                    delivery?.status === 'delivered'
                  }
                  onClick={() =>
                    onDeliveryStatusChange('near_destination', { locationName: order.city })
                  }
                  className="relative overflow-hidden h-8.5 px-3 rounded-full flex items-center justify-center gap-1.5 text-xs font-semibold text-amber-950 bg-gradient-to-b from-amber-50 via-amber-100 to-amber-200 border border-amber-300 shadow-[inset_0_1px_1px_rgba(255,255,255,0.8),0_1.5px_3px_rgba(245,158,11,0.15)] backdrop-blur-md hover:from-white hover:to-amber-200 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <span className="pointer-events-none absolute inset-x-0 top-0 h-[46%] bg-gradient-to-b from-white/90 via-white/20 to-transparent rounded-t-full" />
                  <MapPin className="w-3.5 h-3.5 text-amber-700 relative z-10 shrink-0" />
                  <span className="truncate relative z-10">3. Trigger Nearby</span>
                </button>

                {/* 4. Issue / Reschedule */}
                <button
                  type="button"
                  disabled={updating || delivery?.status === 'delivered'}
                  onClick={onRequestFailedModal}
                  className="relative overflow-hidden h-8.5 px-3 rounded-full flex items-center justify-center gap-1.5 text-xs font-semibold text-rose-900 bg-gradient-to-b from-rose-50 via-rose-100 to-rose-200 border border-rose-300 shadow-[inset_0_1px_1px_rgba(255,255,255,0.8),0_1.5px_3px_rgba(244,63,94,0.15)] backdrop-blur-md hover:from-white hover:to-rose-200 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <span className="pointer-events-none absolute inset-x-0 top-0 h-[46%] bg-gradient-to-b from-white/90 via-white/20 to-transparent rounded-t-full" />
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600 relative z-10 shrink-0" />
                  <span className="truncate relative z-10">Issue / Reschedule</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Two Assignment Buttons: Stacked on Phone (flex-col), Side-by-Side on Larger Screens (sm:flex-row) */}
        {/* Descriptions are completely removed! */}
        <div className="flex flex-col sm:flex-row gap-2.5 w-full">
          {/* Button 1: Auto-Assign Nearest Rider */}
          <button
            id="btn-auto-assign-rider"
            type="button"
            disabled={updating}
            onClick={onAutoAssignNearest}
            className="relative overflow-hidden w-full sm:flex-1 h-10 sm:h-11 px-4 rounded-full flex items-center justify-center gap-2 text-xs sm:text-sm font-bold text-cyan-950 bg-gradient-to-b from-cyan-100 via-cyan-200 to-cyan-300 border border-cyan-300/80 shadow-[inset_0_1px_1.5px_rgba(255,255,255,0.9),0_2px_5px_rgba(6,182,212,0.25)] backdrop-blur-md hover:from-cyan-50 hover:to-cyan-200 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50 group/auto"
            title="Automatically queries backend for nearest available rider and assigns them"
          >
            <span className="pointer-events-none absolute inset-x-0 top-0 h-[46%] bg-gradient-to-b from-white/90 via-white/30 to-transparent rounded-t-full" />
            {updating ? (
              <Loader2 className="w-4 h-4 animate-spin relative z-10 shrink-0 text-cyan-800" />
            ) : (
              <Zap className="w-4 h-4 text-cyan-700 relative z-10 shrink-0 drop-shadow-xs group-hover/auto:scale-110 transition-transform" />
            )}
            <span className="truncate relative z-10">
              {isAssigned ? 'Auto Reassign Nearest Rider' : 'Auto Assign Nearest Rider'}
            </span>
          </button>

          {/* Button 2: Manual Assign Delivery Partner */}
          <button
            id="btn-manual-assign-rider"
            type="button"
            disabled={updating}
            onClick={onManualAssign}
            className="relative overflow-hidden w-full sm:flex-1 h-10 sm:h-11 px-4 rounded-full flex items-center justify-center gap-2 text-xs sm:text-sm font-bold text-slate-800 bg-gradient-to-b from-white/95 via-slate-50/90 to-slate-100/90 border border-slate-300 shadow-[inset_0_1px_1.5px_rgba(255,255,255,0.85),0_2px_4px_rgba(0,0,0,0.06)] backdrop-blur-md hover:from-white hover:to-slate-200 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50 group/manual"
            title="Open partner selector to manually assign a delivery partner from the backend"
          >
            <span className="pointer-events-none absolute inset-x-0 top-0 h-[46%] bg-gradient-to-b from-white/80 via-white/20 to-transparent rounded-t-full" />
            <UserPlus className="w-4 h-4 text-slate-600 relative z-10 shrink-0 drop-shadow-xs group-hover/manual:scale-110 transition-transform" />
            <span className="truncate relative z-10">
              {isAssigned ? 'Change Rider Manually' : 'Manual Assign Delivery Partner'}
            </span>
          </button>
        </div>
      </div>
    </section>
  );
};
