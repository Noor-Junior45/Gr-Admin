import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { Order, OrderItem, Delivery } from '../types';
import { fetchOrderById, updateOrderStatus } from '../services/orderService';
import {
  fetchDeliveryByOrderId,
  autoAssignNearestDeliveryPartner,
} from '../services/deliveryService';
import { PackingSlip } from '../components/PackingSlip';
import { formatCurrency, formatDateTime, formatShortId } from '../utils/formatters';
import {
  ArrowLeft,
  FileText,
  CheckCircle2,
  Bike,
  MapPin,
  Check,
  X,
  Loader2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

export const OrderDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [updating, setUpdating] = useState<boolean>(false);
  const [assigningRider, setAssigningRider] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Camera Popup State
  const [isCameraOpen, setIsCameraOpen] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scanningItem, setScanningItem] = useState<OrderItem | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Item Checklist State (square tick box beside product image)
  const [checkedItemIds, setCheckedItemIds] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem(`gr_order_${id}_checked_items`);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const toggleItemCheck = (itemId: string) => {
    setCheckedItemIds((prev) => {
      const next = { ...prev, [itemId]: !prev[itemId] };
      try {
        if (id) {
          localStorage.setItem(`gr_order_${id}_checked_items`, JSON.stringify(next));
        }
      } catch (e) {
        console.warn('Failed to persist checklist state:', e);
      }
      return next;
    });
  };

  const markItemChecked = (itemId: string) => {
    setCheckedItemIds((prev) => {
      const next = { ...prev, [itemId]: true };
      try {
        if (id) {
          localStorage.setItem(`gr_order_${id}_checked_items`, JSON.stringify(next));
        }
      } catch (e) {
        console.warn('Failed to persist checklist state:', e);
      }
      return next;
    });
  };

  const loadDetails = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);

    try {
      const [orderData, deliveryData] = await Promise.all([
        fetchOrderById(id),
        fetchDeliveryByOrderId(id),
      ]);
      setOrder(orderData.order);
      setItems(orderData.items);
      setDelivery(deliveryData);
    } catch (err: any) {
      console.error('Error fetching order details:', err);
      setError(err?.message || 'Failed to load order information.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDetails();

    const channel = supabase
      .channel(`order_detail_view_${id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders', filter: `id=eq.${id}` },
        () => loadDetails()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  // Camera handling for SKU scan popup with checklist support
  const openCamera = async (targetItem?: OrderItem) => {
    setScanningItem(targetItem || null);
    setCameraError(null);
    setIsCameraOpen(true);
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } else {
        setCameraError('Camera access not supported on this browser.');
      }
    } catch (err: any) {
      console.error('Camera access error:', err);
      setCameraError('Camera permission denied or camera not found.');
    }
  };

  const closeCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setScanningItem(null);
    setIsCameraOpen(false);
  };

  // Automatic Barcode Detection when camera is open (for SKU checklist)
  useEffect(() => {
    if (!isCameraOpen) return;
    let animId: number;
    let detector: any = null;

    if ('BarcodeDetector' in window) {
      try {
        detector = new (window as any).BarcodeDetector({
          formats: ['qr_code', 'ean_13', 'ean_8', 'code_128', 'code_39', 'upc_a', 'upc_e'],
        });
      } catch {
        detector = null;
      }
    }

    const checkBarcode = async () => {
      if (detector && videoRef.current && videoRef.current.readyState >= 2) {
        try {
          const barcodes = await detector.detect(videoRef.current);
          if (barcodes && barcodes.length > 0 && scanningItem) {
            markItemChecked(scanningItem.id);
            closeCamera();
            return;
          }
        } catch {
          // Ignore frame decode errors
        }
      }
      if (isCameraOpen) {
        animId = requestAnimationFrame(checkBarcode);
      }
    };

    if (detector) {
      animId = requestAnimationFrame(checkBarcode);
    }

    return () => {
      if (animId) cancelAnimationFrame(animId);
    };
  }, [isCameraOpen, scanningItem]);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  // Confirm packing done
  const handleConfirmPackingDone = async () => {
    if (!order || !id) return;
    const canConfirm = items.length === 0 || items.every((it) => Boolean(checkedItemIds[it.id]));
    if (!canConfirm) {
      alert('Please tick all order item checklist boxes before confirming packing.');
      return;
    }
    setUpdating(true);
    try {
      const updated = await updateOrderStatus(id, 'packed');
      setOrder((prev) =>
        prev
          ? {
              ...prev,
              ...updated,
              status: 'packed',
              packed_at: new Date().toISOString(),
            }
          : updated
      );
    } catch (err: any) {
      alert(err?.message || 'Failed to confirm packing.');
    } finally {
      setUpdating(false);
    }
  };

  // Auto assign nearest rider
  const handleAutoAssignRider = async () => {
    if (!id) return;
    setAssigningRider(true);
    try {
      const res = await autoAssignNearestDeliveryPartner(id, 25);
      if (res.success && res.delivery) {
        setDelivery(res.delivery);
      } else {
        alert(res.message || 'Could not find an available rider to auto-assign.');
      }
    } catch (err: any) {
      alert(err?.message || 'Failed to auto-assign rider.');
    } finally {
      setAssigningRider(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-md mx-auto py-12 px-4 text-center">
        <Loader2 className="w-8 h-8 text-slate-400 animate-spin mx-auto mb-3" />
        <p className="text-xs text-slate-500">Loading order details...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="max-w-md mx-auto py-10 px-4 text-center space-y-3">
        <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
        <p className="text-sm font-semibold text-slate-800">{error || 'Order not found'}</p>
        <button
          type="button"
          onClick={loadDetails}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 text-xs font-semibold text-slate-700 hover:bg-slate-200 cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Retry
        </button>
      </div>
    );
  }

  const fullAddress = [
    order.address_line1,
    order.address_line2,
    order.city,
    order.state,
    order.pincode,
  ]
    .filter(Boolean)
    .join(', ');

  const timelineSteps = [
    {
      title: 'Order Placed',
      timestamp: order.placed_at,
      completed: true,
    },
    {
      title: 'Packing Done (Admin)',
      timestamp:
        order.packed_at ||
        (['packed', 'shipped', 'delivered'].includes(order.status)
          ? order.updated_at
          : null),
      completed: ['packed', 'shipped', 'delivered'].includes(order.status),
    },
    {
      title: 'Rider Assigned',
      timestamp:
        delivery?.assigned_at ||
        (delivery?.delivery_partner ? delivery.created_at : null),
      completed: Boolean(delivery?.delivery_partner_id || delivery?.delivery_partner),
    },
    {
      title: 'Dispatched / Out for Delivery',
      timestamp:
        delivery?.out_for_delivery_at ||
        delivery?.picked_up_at ||
        order.shipped_at,
      completed:
        ['shipped', 'delivered'].includes(order.status) ||
        ['out_for_delivery', 'near_destination', 'delivered'].includes(
          delivery?.status as any
        ),
    },
    {
      title: 'Delivery Done',
      timestamp: delivery?.delivered_at || order.delivered_at,
      completed: order.status === 'delivered' || delivery?.status === 'delivered',
    },
  ];

  const isAlreadyPacked =
    order.status === 'packed' ||
    order.status === 'shipped' ||
    order.status === 'delivered';

  const allItemsChecked =
    items.length > 0
      ? items.every((it) => Boolean(checkedItemIds[it.id]))
      : true;

  return (
    <>
      {/* Phone Screen Optimized, Unboxed Layout */}
      <div className="max-w-md mx-auto py-2 sm:py-3 px-3.5 sm:px-4 text-slate-900 space-y-4 pb-20 font-sans">
        {/* Simple Back Navigation */}
        <div>
          <Link
            to="/orders"
            className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Orders
          </Link>
        </div>

        {/* 1. At top of page: Order id and in same line pdf button (no text), below shows date and time */}
        <div className="border-b border-slate-200 pb-3">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold font-mono tracking-tight text-slate-900">
              #{formatShortId(order.id)}
            </h1>
            <button
              type="button"
              onClick={() => window.print()}
              className="p-2 text-slate-600 hover:text-slate-900 active:scale-95 transition cursor-pointer"
              title="Print PDF"
              aria-label="PDF"
            >
              <FileText className="w-5 h-5" />
            </button>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {formatDateTime(order.placed_at)}
          </p>
        </div>

        {/* 2. Order Items Section: square checklist box beside image start, image, name, items colour, unit, price, and SKU button (opens camera) */}
        <div className="space-y-3 border-b border-slate-200 pb-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Order Items ({items.length})
            </h2>
            {items.length > 0 && (
              <span
                className={`text-[11px] font-semibold px-2 py-0.5 rounded-full transition-colors ${
                  items.every((it) => checkedItemIds[it.id])
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {items.filter((it) => checkedItemIds[it.id]).length}/{items.length} checked
              </span>
            )}
          </div>

          <div className="divide-y divide-slate-100">
            {items.map((item) => {
              const isChecked = Boolean(checkedItemIds[item.id]);

              return (
                <div key={item.id} className="flex items-start gap-2.5 py-3 first:pt-1">
                  {/* Square type checklist box in left side, beside of products image start */}
                  <div className="flex items-center shrink-0 gap-2.5">
                    <button
                      type="button"
                      id={`checklist-box-${item.id}`}
                      role="checkbox"
                      aria-checked={isChecked}
                      onClick={() => toggleItemCheck(item.id)}
                      className={`w-5 h-5 rounded-[4px] border flex items-center justify-center cursor-pointer transition-all ${
                        isChecked
                          ? 'bg-emerald-600 border-emerald-600 text-white shadow-2xs'
                          : 'bg-white border-slate-300 hover:border-slate-400 text-transparent'
                      }`}
                      title={isChecked ? 'Item checked (click to uncheck)' : 'Click to checklist item'}
                      aria-label={`Checklist ${item.product_name}`}
                    >
                      <Check
                        className={`w-3.5 h-3.5 stroke-[3] transition-all duration-150 ${
                          isChecked ? 'scale-100 opacity-100' : 'scale-50 opacity-0'
                        }`}
                      />
                    </button>

                    <img
                      src={
                        item.product_image ||
                        'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=120&auto=format&fit=crop&q=60'
                      }
                      alt={item.product_name}
                      className="w-14 h-14 rounded-lg object-cover bg-slate-100 shrink-0"
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm text-slate-900 leading-snug truncate">
                      {item.product_name}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      Colour: {(item as any).color || (item as any).variant || 'Standard'}
                    </div>
                    <div className="text-xs text-slate-500">
                      Unit:{' '}
                      {item.unit
                        ? `${item.quantity} ${item.unit}`
                        : `${item.quantity} unit${item.quantity > 1 ? 's' : ''}`}
                    </div>
                    <div className="text-xs font-bold text-slate-900 mt-1">
                      {formatCurrency(item.price_at_purchase * item.quantity)}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => openCamera(item)}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-md active:scale-95 transition cursor-pointer shrink-0 ${
                      isChecked
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                    }`}
                    title="Open SKU scanner for this item"
                  >
                    {isChecked ? 'Checked' : 'SKU'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* 3. Payment Section (Moved below order items, renamed to Payment) */}
        <div className="space-y-2 border-b border-slate-200 pb-4">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Payment
          </h2>
          <div className="flex items-center justify-between text-xs py-0.5">
            <span className="text-slate-500">Payment Method</span>
            <span className="font-semibold text-slate-900 capitalize">
              {order.payment_method || 'Cash on Delivery'}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs py-0.5">
            <span className="text-slate-500">Sub Total</span>
            <span className="font-mono text-slate-800">
              {formatCurrency(order.subtotal || order.total_amount)}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm font-bold py-1 border-t border-slate-100">
            <span className="text-slate-900">Total Charge</span>
            <span className="font-mono text-slate-900">
              {formatCurrency(order.total_amount)}
            </span>
          </div>
        </div>

        {/* 4. Confirm packing done button - grey theme and non-interactive until checklist items are ticked green */}
        <div className="pb-1">
          <button
            type="button"
            id="btn-confirm-packing-done"
            onClick={handleConfirmPackingDone}
            disabled={
              updating ||
              isAlreadyPacked ||
              !allItemsChecked
            }
            aria-disabled={!allItemsChecked || isAlreadyPacked || updating}
            className={`w-full py-3 px-4 rounded-xl text-sm font-bold transition flex items-center justify-center gap-2 ${
              isAlreadyPacked
                ? 'bg-emerald-600 text-white opacity-95 cursor-default'
                : allItemsChecked
                ? 'bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white cursor-pointer shadow-sm'
                : 'bg-slate-200 text-slate-400 border border-slate-300 cursor-not-allowed select-none'
            }`}
          >
            {updating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle2
                className={`w-4 h-4 ${
                  !isAlreadyPacked && !allItemsChecked ? 'text-slate-400' : ''
                }`}
              />
            )}
            <span>
              {isAlreadyPacked
                ? 'Packing Confirmed Done'
                : 'Confirm packing done'}
            </span>
          </button>
          {!isAlreadyPacked && !allItemsChecked && items.length > 0 && (
            <p className="text-[11px] text-slate-400 text-center mt-1.5 font-medium">
              Tick all order items above to enable packing confirmation
            </p>
          )}
        </div>

        {/* Space / gap between confirm packing done and delivery fleet button */}
        <div className="pt-2 border-t border-slate-200" />

        {/* 5. Delivery Fleet section (only one button to auto assign nearest rider) */}
        <div className="space-y-2.5 border-b border-slate-200 pb-4">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Delivery Fleet
          </h2>

          {delivery?.delivery_partner && (
            <div className="text-xs text-slate-700">
              Rider: <span className="font-bold text-slate-900">{delivery.delivery_partner.name}</span>
              {delivery.delivery_partner.phone && (
                <span className="font-mono text-slate-500 ml-1">
                  ({delivery.delivery_partner.phone})
                </span>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={handleAutoAssignRider}
            disabled={assigningRider || updating}
            className="w-full py-3 px-4 rounded-xl text-sm font-bold text-slate-900 bg-amber-400 hover:bg-amber-500 active:scale-[0.99] transition cursor-pointer flex items-center justify-center gap-2"
          >
            {assigningRider ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Bike className="w-4 h-4" />
            )}
            <span>Auto assign nearest rider</span>
          </button>
        </div>

        {/* 6. Customer details, delivery address, and open in google map button */}
        <div className="space-y-2 border-b border-slate-200 pb-4">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Customer Details & Address
          </h2>
          <div className="text-sm font-bold text-slate-900">{order.recipient_name}</div>
          <div className="text-xs text-slate-600 font-mono">
            <a href={`tel:${order.recipient_phone}`} className="hover:underline">
              {order.recipient_phone || 'No phone provided'}
            </a>
          </div>
          <div className="text-xs text-slate-600 leading-relaxed break-words">
            {fullAddress || 'No address provided'}
          </div>

          <div className="pt-1">
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                fullAddress
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 transition active:scale-95"
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>Open in Google Map</span>
            </a>
          </div>
        </div>

        {/* 7. Below payment: Delivery Timeline (checklist format with date & time) */}
        <div className="space-y-3 pt-1">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Delivery Timeline
          </h2>

          <div className="space-y-3.5">
            {timelineSteps.map((step, idx) => (
              <div key={idx} className="flex items-start gap-2.5">
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                    step.completed
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-200 text-slate-400'
                  }`}
                >
                  <Check className="w-3 h-3 stroke-[3]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div
                    className={`text-xs font-semibold leading-tight ${
                      step.completed ? 'text-slate-900' : 'text-slate-400'
                    }`}
                  >
                    {step.title}
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                    {step.timestamp ? formatDateTime(step.timestamp) : 'Pending'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Camera SKU Scan Popup: camera viewfinder, barcode detection, and checklist confirmation */}
      {isCameraOpen && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center">
          <button
            type="button"
            onClick={closeCamera}
            className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full bg-black/60 text-white flex items-center justify-center active:scale-95 transition cursor-pointer"
            aria-label="Close camera"
          >
            <X className="w-6 h-6" />
          </button>

          {scanningItem && (
            <div className="absolute top-4 left-4 right-16 z-20">
              <div className="bg-black/70 backdrop-blur-xs text-white px-3 py-2 rounded-xl text-xs flex items-center gap-2 border border-white/10 shadow-lg">
                <span className="font-bold text-emerald-400 shrink-0">SKU Scanner:</span>
                <span className="truncate font-medium">{scanningItem.product_name}</span>
              </div>
            </div>
          )}

          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />

          {/* Viewfinder reticle overlay */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="w-64 h-64 border-2 border-emerald-400/80 rounded-2xl relative shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]">
              <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-emerald-400 -mt-1 -ml-1 rounded-tl-sm" />
              <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-emerald-400 -mt-1 -mr-1 rounded-tr-sm" />
              <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-emerald-400 -mb-1 -ml-1 rounded-bl-sm" />
              <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-emerald-400 -mb-1 -mr-1 rounded-br-sm" />
              <div className="absolute inset-x-4 top-1/2 h-0.5 bg-emerald-400/70 shadow-[0_0_8px_#34d399] animate-pulse" />
            </div>
          </div>

          {/* Action to manually confirm / checklist item if barcode auto-detect is pending */}
          <div className="absolute bottom-8 inset-x-0 z-20 flex flex-col items-center gap-2 px-6">
            {scanningItem && (
              <button
                type="button"
                onClick={() => {
                  markItemChecked(scanningItem.id);
                  closeCamera();
                }}
                className="w-full max-w-xs py-3 px-4 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 shadow-xl cursor-pointer transition"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                Checklist Item as Verified
              </button>
            )}
            <span className="text-[11px] text-white/70">
              Align product barcode/SKU with frame or tap button to verify
            </span>
          </div>

          {cameraError && (
            <div className="absolute bottom-24 px-4 py-2 rounded-lg bg-rose-600/95 text-white text-xs max-w-[85%] text-center z-30 shadow-lg">
              {cameraError}
            </div>
          )}
        </div>
      )}

      {/* Hidden printable packing slip for PDF print button */}
      <PackingSlip order={order} items={items} />
    </>
  );
};
