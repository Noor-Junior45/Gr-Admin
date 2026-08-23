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
        bg: 'bg-amber-50',
        text: 'text-amber-800',
        border: 'border-amber-300',
        dotBg: 'bg-amber-500',
      };
    case 'packing':
      return {
        label: 'Packing',
        bg: 'bg-indigo-50',
        text: 'text-indigo-800',
        border: 'border-indigo-300',
        dotBg: 'bg-indigo-500',
      };
    case 'packed':
      return {
        label: 'Packed',
        bg: 'bg-purple-50',
        text: 'text-purple-800',
        border: 'border-purple-300',
        dotBg: 'bg-purple-500',
      };
    case 'shipped':
      return {
        label: 'Shipped',
        bg: 'bg-blue-50',
        text: 'text-blue-800',
        border: 'border-blue-300',
        dotBg: 'bg-blue-500',
      };
    case 'delivered':
      return {
        label: 'Delivered',
        bg: 'bg-emerald-50',
        text: 'text-emerald-800',
        border: 'border-emerald-300',
        dotBg: 'bg-emerald-500',
      };
    case 'cancelled':
      return {
        label: 'Cancelled',
        bg: 'bg-rose-50',
        text: 'text-rose-800',
        border: 'border-rose-300',
        dotBg: 'bg-rose-500',
      };
    default:
      return {
        label: status || 'Unknown',
        bg: 'bg-slate-100',
        text: 'text-slate-700',
        border: 'border-slate-300',
        dotBg: 'bg-slate-500',
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
