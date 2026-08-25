import { supabase } from '../lib/supabaseClient';
import { withSkewRetry } from '../utils/supabaseHelper';
import { Product } from '../types';

/**
 * Service for fetching inventory and low-stock products from `products` table.
 */

export async function fetchLowStockProducts(threshold = 20): Promise<Product[]> {
  try {
    const { data, error } = await withSkewRetry(
      () =>
        supabase
          .from('products')
          .select('id, name, brand, category, subcategory, price, mrp, stock_quantity, in_stock, image_urls, unit')
          .or(`stock_quantity.lte.${threshold},in_stock.eq.false`)
          .order('stock_quantity', { ascending: true })
          .limit(20),
      3,
      600
    );

    if (error) {
      console.warn('[productService] Error querying low stock products:', error);
      return [];
    }

    return (data || []) as Product[];
  } catch (err) {
    console.warn('[productService] fetchLowStockProducts exception:', err);
    return [];
  }
}

export async function fetchProductsList(
  search = '',
  category = 'all',
  page = 1,
  pageSize = 25
): Promise<{ products: Product[]; totalCount: number }> {
  try {
    let query = supabase
      .from('products')
      .select('id, name, brand, category, subcategory, price, mrp, stock_quantity, in_stock, image_urls, unit, rating_avg', {
        count: 'exact',
      });

    if (search.trim()) {
      query = query.or(`name.ilike.%${search.trim()}%,brand.ilike.%${search.trim()}%,category.ilike.%${search.trim()}%`);
    }

    if (category !== 'all') {
      query = query.eq('category', category);
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to).order('stock_quantity', { ascending: true });

    const { data, count, error } = await withSkewRetry(() => query, 3, 600);

    if (error) throw error;

    return {
      products: (data || []) as Product[],
      totalCount: count || 0,
    };
  } catch (err: any) {
    console.error('[productService] fetchProductsList error:', err);
    return { products: [], totalCount: 0 };
  }
}
