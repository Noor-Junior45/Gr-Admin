import React from 'react';
import { Order, OrderItem } from '../types';
import { formatCurrency, formatDateTime, formatShortId } from '../utils/formatters';
import { PackageCheck, Phone, MapPin, Calendar, Tag } from 'lucide-react';

interface PackingSlipProps {
  order: Order;
  items: OrderItem[];
}

export const PackingSlip: React.FC<PackingSlipProps> = ({ order, items }) => {
  const totalQuantity = items.reduce((acc, it) => acc + (it.quantity || 1), 0);

  return (
    <div className="hidden print:block print-page p-6 bg-white text-black font-sans">
      {/* Header */}
      <div className="border-b-2 border-black pb-4 mb-4 flex justify-between items-start">
        <div>
          <div className="flex items-center gap-2">
            <PackageCheck className="w-6 h-6 text-black" />
            <h1 className="text-2xl font-black uppercase tracking-wide">Giriraj Warehouse</h1>
          </div>
          <p className="text-xs font-semibold text-gray-700 mt-0.5">
            Official Packing Slip & Dispatch Manifest
          </p>
        </div>
        <div className="text-right">
          <div className="text-lg font-mono font-bold tracking-tight">
            ORDER: {formatShortId(order.id)}
          </div>
          <div className="text-xs text-gray-600 font-mono">{order.id}</div>
          <div className="text-xs text-gray-800 mt-1 flex items-center justify-end gap-1">
            <Calendar className="w-3 h-3" />
            {formatDateTime(order.placed_at)}
          </div>
        </div>
      </div>

      {/* Recipient / Delivery Details Box */}
      <div className="grid grid-cols-2 gap-4 mb-6 border border-black p-3.5 rounded-none">
        <div>
          <div className="text-[11px] uppercase font-bold text-gray-700 tracking-wider mb-1 flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-black" /> Ship To / Recipient
          </div>
          <div className="text-base font-bold uppercase">{order.recipient_name}</div>
          <div className="text-sm font-medium mt-1 leading-snug">
            {order.address_line1}
            {order.address_line2 ? `, ${order.address_line2}` : ''}
          </div>
          <div className="text-sm font-bold mt-0.5">
            {order.city}, {order.state} - <span className="font-mono text-base">{order.pincode}</span>
          </div>
          {order.address_label && (
            <div className="inline-block border border-black px-1.5 py-0.5 text-[10px] uppercase font-bold mt-1">
              Label: {order.address_label}
            </div>
          )}
        </div>

        <div className="border-l border-gray-300 pl-4 flex flex-col justify-between">
          <div>
            <div className="text-[11px] uppercase font-bold text-gray-700 tracking-wider mb-1 flex items-center gap-1">
              <Phone className="w-3.5 h-3.5 text-black" /> Contact & Payment
            </div>
            <div className="text-sm font-bold font-mono">
              Phone: {order.recipient_phone || 'N/A'}
            </div>
            {order.recipient_email && (
              <div className="text-xs text-gray-800 font-mono mt-0.5">
                Email: {order.recipient_email}
              </div>
            )}
            <div className="text-xs font-semibold mt-2">
              Payment Method: <span className="uppercase font-mono">{order.payment_method || 'COD'}</span>
            </div>
            <div className="text-xs font-semibold">
              Payment Status: <span className="uppercase font-mono">{order.payment_status || 'PENDING'}</span>
            </div>
          </div>

          {order.delivery_notes && (
            <div className="bg-gray-100 border border-gray-400 p-1.5 text-xs mt-2">
              <span className="font-bold">Delivery Note: </span>
              {order.delivery_notes}
            </div>
          )}
        </div>
      </div>

      {/* Items Table */}
      <div className="mb-6">
        <div className="text-xs uppercase font-black tracking-wider mb-2 flex justify-between items-center">
          <span>Items to Pack ({items.length} unique, {totalQuantity} total qty)</span>
          <span className="text-[10px] font-normal text-gray-600 font-mono">Packer initials: ________</span>
        </div>

        <table className="w-full text-left border-collapse border border-black text-xs">
          <thead>
            <tr className="bg-gray-200 border-b border-black">
              <th className="p-2 border-r border-black w-10 text-center font-bold">#</th>
              <th className="p-2 border-r border-black font-bold">Product Description</th>
              <th className="p-2 border-r border-black w-24 font-bold">Brand / Unit</th>
              <th className="p-2 border-r border-black w-16 text-center font-black text-sm">Qty</th>
              <th className="p-2 w-14 text-center font-bold">Packed [✓]</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={item.id || index} className="border-b border-gray-400">
                <td className="p-2 border-r border-black text-center font-mono">{index + 1}</td>
                <td className="p-2 border-r border-black">
                  <div className="font-bold text-sm leading-tight">{item.product_name}</div>
                  {item.product_id && (
                    <div className="text-[10px] text-gray-600 font-mono mt-0.5">
                      SKU: {item.product_id}
                    </div>
                  )}
                </td>
                <td className="p-2 border-r border-black text-gray-800">
                  <div className="font-medium">{item.brand || '—'}</div>
                  <div className="text-[11px] text-gray-600">{item.unit || ''}</div>
                </td>
                <td className="p-2 border-r border-black text-center font-black text-base font-mono">
                  {item.quantity}
                </td>
                <td className="p-2 text-center">
                  <div className="w-5 h-5 border-2 border-black mx-auto"></div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer Details */}
      <div className="border-t border-black pt-3 flex justify-between items-end text-xs">
        <div>
          <p className="font-bold">Thank you for shopping with Giriraj!</p>
          <p className="text-[11px] text-gray-600">
            For support or returns, please keep this packing slip.
          </p>
        </div>
        <div className="text-right font-mono">
          <div>Total Items: <strong>{totalQuantity}</strong></div>
          <div className="text-sm font-bold">Order Value: {formatCurrency(order.total_amount)}</div>
        </div>
      </div>
    </div>
  );
};
