import React, { useEffect, useState, useCallback } from 'react';
import { Product } from '../types';
import { fetchProductsList } from '../services/productService';
import { formatCurrency } from '../utils/formatters';
import {
  Layers,
  Search,
  RefreshCw,
  Box,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Tag,
  ChevronLeft,
  ChevronRight,
  Filter,
} from 'lucide-react';

export const ProductsStockPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProducts = useCallback(
    async (isManual = false) => {
      if (isManual) setRefreshing(true);
      else setLoading(true);
      setError(null);

      try {
        const res = await fetchProductsList(search, category, page, pageSize);
        setProducts(res.products);
        setTotalCount(res.totalCount);
      } catch (err: any) {
        console.error('Error fetching products:', err);
        setError(err.message || 'Failed to load inventory.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [search, category, page, pageSize]
  );

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-serif-display font-bold text-slate-900 flex items-center gap-2">
            <span>Inventory & Stock Catalog</span>
            <span className="text-xs font-mono-code bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200 font-normal">
              {totalCount} products
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitor real-time warehouse stock quantities and availability flags.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => loadProducts(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg border border-slate-200 transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh Stock'}</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-4 shadow-xs flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search products by title, brand, or SKU..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs sm:text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
          />
        </div>

        <select
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 font-medium cursor-pointer w-full sm:w-auto"
        >
          <option value="all">All Categories</option>
          <option value="electrical">Electrical</option>
          <option value="switches">Switches & Sockets</option>
          <option value="wires">Wires & Cables</option>
          <option value="lighting">Lighting & Fixtures</option>
        </select>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg flex items-center justify-between">
          <span>{error}</span>
          <button
            onClick={() => loadProducts(true)}
            className="underline font-bold hover:text-rose-950 cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Table / Grid */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            <div className="h-10 bg-slate-100 animate-pulse rounded"></div>
            <div className="h-10 bg-slate-100 animate-pulse rounded"></div>
            <div className="h-10 bg-slate-100 animate-pulse rounded"></div>
          </div>
        ) : products.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Box className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h3 className="text-sm font-semibold text-slate-800">No products found</h3>
            <p className="text-xs text-slate-400 mt-0.5">Try clearing the search query.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50 text-slate-600 text-[11px] font-mono-code uppercase border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Product Info</th>
                  <th className="py-3 px-4">Brand / Category</th>
                  <th className="py-3 px-4 text-right">Price</th>
                  <th className="py-3 px-4 text-center">Stock Units</th>
                  <th className="py-3 px-4 text-center">Availability</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {products.map((prod) => {
                  const qty = prod.stock_quantity ?? 0;
                  const isOut = qty <= 0 || prod.in_stock === false;
                  const isLow = qty > 0 && qty <= 15;

                  return (
                    <tr key={prod.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          {prod.image_urls && prod.image_urls[0] ? (
                            <img
                              src={prod.image_urls[0]}
                              alt={prod.name}
                              className="w-10 h-10 object-contain bg-slate-50 border border-slate-200 rounded p-0.5 shrink-0"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-10 h-10 bg-slate-100 border border-slate-200 rounded flex items-center justify-center shrink-0">
                              <Box className="w-4 h-4 text-slate-400" />
                            </div>
                          )}
                          <div className="min-w-0 max-w-md">
                            <div className="font-semibold text-slate-900 line-clamp-1">
                              {prod.name}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono-code mt-0.5">
                              ID: {prod.id.slice(0, 8)}...
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-slate-600 text-xs">
                        <div className="font-medium text-slate-800">{prod.brand || 'Giriraj'}</div>
                        <div className="text-[11px] text-slate-400 capitalize">
                          {prod.subcategory || prod.category || 'General'}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-right font-mono-code font-bold text-slate-900">
                        {formatCurrency(prod.price)}
                        {prod.unit && (
                          <span className="block text-[10px] text-slate-400 font-normal">
                            per {prod.unit}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-center font-mono-code">
                        <span
                          className={`font-bold text-sm ${
                            isOut
                              ? 'text-rose-600'
                              : isLow
                              ? 'text-amber-600'
                              : 'text-emerald-700'
                          }`}
                        >
                          {qty}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center">
                        {isOut ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-800 border border-rose-200">
                            <XCircle className="w-3 h-3 text-rose-600" />
                            Out of Stock
                          </span>
                        ) : isLow ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            <AlertTriangle className="w-3 h-3 text-amber-600" />
                            Low Stock ({qty})
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            In Stock
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
          <div>
            Showing <span className="font-bold">{products.length}</span> of{' '}
            <span className="font-bold">{totalCount}</span> items
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1 rounded bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 font-mono-code font-bold">
              {page} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1 rounded bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
