import { OrderStatus } from '../types';

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

export function formatShortId(id: string | null | undefined): string {
  if (!id) return '#---';
  // If it's a UUID or long string, show first 8 chars or full if shorter
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
        label: 'Pending',
        bg: 'bg-amber-500/15',
        text: 'text-amber-300',
        border: 'border-amber-500/30',
        dotBg: 'bg-amber-400',
      };
    case 'packing':
      return {
        label: 'Packing',
        bg: 'bg-indigo-500/15',
        text: 'text-indigo-300',
        border: 'border-indigo-500/30',
        dotBg: 'bg-indigo-400',
      };
    case 'packed':
      return {
        label: 'Packed',
        bg: 'bg-purple-500/15',
        text: 'text-purple-300',
        border: 'border-purple-500/30',
        dotBg: 'bg-purple-400',
      };
    case 'shipped':
      return {
        label: 'Shipped',
        bg: 'bg-blue-500/15',
        text: 'text-blue-300',
        border: 'border-blue-500/30',
        dotBg: 'bg-blue-400',
      };
    case 'delivered':
      return {
        label: 'Delivered',
        bg: 'bg-emerald-500/15',
        text: 'text-emerald-300',
        border: 'border-emerald-500/30',
        dotBg: 'bg-emerald-400',
      };
    case 'cancelled':
      return {
        label: 'Cancelled',
        bg: 'bg-rose-500/15',
        text: 'text-rose-300',
        border: 'border-rose-500/30',
        dotBg: 'bg-rose-400',
      };
    default:
      return {
        label: status || 'Unknown',
        bg: 'bg-slate-700/40',
        text: 'text-slate-300',
        border: 'border-slate-600',
        dotBg: 'bg-slate-400',
      };
  }
}

export function getPaymentBadge(paymentStatus: string | null | undefined) {
  const norm = (paymentStatus || '').toLowerCase();
  if (norm === 'paid' || norm === 'completed' || norm === 'success') {
    return {
      label: 'Paid',
      bg: 'bg-emerald-950/60',
      text: 'text-emerald-300',
      border: 'border-emerald-600/40',
    };
  }
  if (norm === 'pending' || norm === 'unpaid') {
    return {
      label: 'Unpaid',
      bg: 'bg-amber-950/60',
      text: 'text-amber-300',
      border: 'border-amber-600/40',
    };
  }
  if (norm === 'cod' || norm === 'cash_on_delivery') {
    return {
      label: 'Cash On Delivery',
      bg: 'bg-sky-950/60',
      text: 'text-sky-300',
      border: 'border-sky-600/40',
    };
  }
  if (norm === 'failed') {
    return {
      label: 'Failed',
      bg: 'bg-rose-950/60',
      text: 'text-rose-300',
      border: 'border-rose-600/40',
    };
  }
  return {
    label: paymentStatus || 'Pending',
    bg: 'bg-slate-800',
    text: 'text-slate-300',
    border: 'border-slate-700',
  };
}
