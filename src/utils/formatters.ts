import { OrderStatus, DeliveryStatus } from '../types';

export function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) return '₹0.00';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return dateStr;
  }
}

export function formatDateShort(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

export function formatTimeOnly(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return dateStr;
  }
}

export function formatShortId(id: string | null | undefined): string {
  if (!id) return '#---';
  if (id.includes('-')) {
    return `#${id.split('-')[0].toUpperCase()}`;
  }
  if (id.length > 8) {
    return `#${id.slice(0, 8).toUpperCase()}`;
  }
  return `#${id.toUpperCase()}`;
}

export interface StatusConfig {
  label: string;
  customerLabel: string;
  bg: string;
  text: string;
  border: string;
  dotBg: string;
}

export function getStatusConfig(status: OrderStatus | string): StatusConfig {
  const norm = (status || '').toLowerCase() as OrderStatus;
  switch (norm) {
    case 'pending':
      return {
        label: 'Pending Review',
        customerLabel: 'Order Placed',
        bg: 'bg-amber-50',
        text: 'text-amber-800',
        border: 'border-amber-300',
        dotBg: 'bg-amber-500',
      };
    case 'confirmed':
      return {
        label: 'Confirmed',
        customerLabel: 'Order confirmed',
        bg: 'bg-teal-50',
        text: 'text-teal-800',
        border: 'border-teal-300',
        dotBg: 'bg-teal-500',
      };
    case 'packing':
      return {
        label: 'Packing in Progress',
        customerLabel: 'Your items are being packed',
        bg: 'bg-indigo-50',
        text: 'text-indigo-800',
        border: 'border-indigo-300',
        dotBg: 'bg-indigo-500',
      };
    case 'packed':
      return {
        label: 'Packed & Staged',
        customerLabel: 'Packed and ready for dispatch',
        bg: 'bg-purple-50',
        text: 'text-purple-800',
        border: 'border-purple-300',
        dotBg: 'bg-purple-500',
      };
    case 'shipped':
      return {
        label: 'Out for Delivery',
        customerLabel: 'Your order is on the way',
        bg: 'bg-blue-50',
        text: 'text-blue-800',
        border: 'border-blue-300',
        dotBg: 'bg-blue-500',
      };
    case 'delivered':
      return {
        label: 'Delivered',
        customerLabel: 'Delivered',
        bg: 'bg-emerald-50',
        text: 'text-emerald-800',
        border: 'border-emerald-300',
        dotBg: 'bg-emerald-500',
      };
    case 'failed':
      return {
        label: 'Delivery Failed',
        customerLabel: 'Delivery attempt failed - Rescheduled',
        bg: 'bg-orange-50',
        text: 'text-orange-800',
        border: 'border-orange-300',
        dotBg: 'bg-orange-500',
      };
    case 'cancelled':
      return {
        label: 'Cancelled',
        customerLabel: 'Cancelled',
        bg: 'bg-rose-50',
        text: 'text-rose-800',
        border: 'border-rose-300',
        dotBg: 'bg-rose-500',
      };
    default:
      return {
        label: status || 'Unknown',
        customerLabel: status || 'Processing',
        bg: 'bg-slate-100',
        text: 'text-slate-700',
        border: 'border-slate-300',
        dotBg: 'bg-slate-500',
      };
  }
}

export function getDeliveryStatusConfig(status: DeliveryStatus | string): StatusConfig {
  const norm = (status || '').toLowerCase() as DeliveryStatus;
  switch (norm) {
    case 'unassigned':
      return {
        label: 'Unassigned',
        customerLabel: 'Awaiting rider allocation',
        bg: 'bg-slate-100',
        text: 'text-slate-700',
        border: 'border-slate-300',
        dotBg: 'bg-slate-400',
      };
    case 'assigned':
      return {
        label: 'Rider Assigned',
        customerLabel: 'Delivery partner assigned',
        bg: 'bg-cyan-50',
        text: 'text-cyan-800',
        border: 'border-cyan-300',
        dotBg: 'bg-cyan-500',
      };
    case 'picked_up':
      return {
        label: 'Picked Up',
        customerLabel: 'Order picked up',
        bg: 'bg-sky-50',
        text: 'text-sky-800',
        border: 'border-sky-300',
        dotBg: 'bg-sky-500',
      };
    case 'out_for_delivery':
      return {
        label: 'Out for Delivery',
        customerLabel: 'Your order is on the way',
        bg: 'bg-blue-50',
        text: 'text-blue-800',
        border: 'border-blue-300',
        dotBg: 'bg-blue-500',
      };
    case 'near_destination':
      return {
        label: 'Near Destination',
        customerLabel: 'Your delivery partner is nearby',
        bg: 'bg-amber-50',
        text: 'text-amber-900',
        border: 'border-amber-400',
        dotBg: 'bg-amber-500',
      };
    case 'delivered':
      return {
        label: 'Delivered',
        customerLabel: 'Delivered',
        bg: 'bg-emerald-50',
        text: 'text-emerald-800',
        border: 'border-emerald-300',
        dotBg: 'bg-emerald-500',
      };
    case 'failed':
      return {
        label: 'Delivery Attempt Failed',
        customerLabel: 'Delivery attempt failed - Rescheduling',
        bg: 'bg-rose-50',
        text: 'text-rose-800',
        border: 'border-rose-300',
        dotBg: 'bg-rose-500',
      };
    case 'returned':
      return {
        label: 'Returned to Warehouse',
        customerLabel: 'Returned to store',
        bg: 'bg-slate-100',
        text: 'text-slate-800',
        border: 'border-slate-300',
        dotBg: 'bg-slate-600',
      };
    default:
      return {
        label: status || 'Pending',
        customerLabel: status || 'Pending',
        bg: 'bg-slate-100',
        text: 'text-slate-700',
        border: 'border-slate-300',
        dotBg: 'bg-slate-400',
      };
  }
}

export function getPaymentBadge(paymentStatus: string | null | undefined) {
  const norm = (paymentStatus || '').toLowerCase();
  if (norm === 'paid' || norm === 'completed' || norm === 'success') {
    return {
      label: 'Paid',
      bg: 'bg-emerald-50',
      text: 'text-emerald-800',
      border: 'border-emerald-300',
    };
  }
  if (norm === 'pending' || norm === 'unpaid') {
    return {
      label: 'Unpaid',
      bg: 'bg-amber-50',
      text: 'text-amber-800',
      border: 'border-amber-300',
    };
  }
  if (norm === 'cod' || norm === 'cash_on_delivery') {
    return {
      label: 'Cash On Delivery',
      bg: 'bg-sky-50',
      text: 'text-sky-800',
      border: 'border-sky-300',
    };
  }
  if (norm === 'failed') {
    return {
      label: 'Failed',
      bg: 'bg-rose-50',
      text: 'text-rose-800',
      border: 'border-rose-300',
    };
  }
  return {
    label: paymentStatus || 'Pending',
    bg: 'bg-slate-100',
    text: 'text-slate-700',
    border: 'border-slate-300',
  };
}

export function getRefundBadge(refundStatus: string | null | undefined) {
  const norm = (refundStatus || '').toLowerCase();
  if (norm === 'pending') {
    return {
      status: 'pending',
      label: 'Refund Pending',
      shortLabel: 'Pending',
      bg: 'bg-amber-50',
      text: 'text-amber-900',
      border: 'border-amber-300',
      pillBg: 'bg-amber-100 text-amber-900 border-amber-300',
      dotBg: 'bg-amber-500',
    };
  }
  if (norm === 'completed') {
    return {
      status: 'completed',
      label: 'Refund Completed',
      shortLabel: 'Refunded',
      bg: 'bg-emerald-50',
      text: 'text-emerald-900',
      border: 'border-emerald-300',
      pillBg: 'bg-emerald-100 text-emerald-900 border-emerald-300',
      dotBg: 'bg-emerald-500',
    };
  }
  return {
    status: 'not_applicable',
    label: 'No Refund Needed',
    shortLabel: 'No Refund',
    bg: 'bg-slate-50',
    text: 'text-slate-600',
    border: 'border-slate-200',
    pillBg: 'bg-slate-100 text-slate-600 border-slate-200',
    dotBg: 'bg-slate-400',
  };
}

/**
 * Calculates human duration string e.g. "18 mins ago" or "2 hrs"
 */
export function formatTimeElapsed(fromIso: string | null | undefined): string {
  if (!fromIso) return '—';
  try {
    const diffMs = Date.now() - new Date(fromIso).getTime();
    if (diffMs < 0) return 'Just now';
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ${mins % 60}m ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  } catch {
    return '—';
  }
}

