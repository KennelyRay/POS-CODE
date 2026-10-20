import type { Product } from '../App';

// Stock is unlimited unless it has been switched on for the product
export const tracksStock = (product: Pick<Product, 'trackStock'>) => product.trackStock === true;

/** 'untracked' for unlimited stock, otherwise where the tracked quantity stands. */
export const stockState = (product: Pick<Product, 'trackStock' | 'quantity'>, lowStock: number) => {
  if (!tracksStock(product)) return 'untracked' as const;
  if (product.quantity <= 0) return 'out' as const;
  return product.quantity <= lowStock ? ('low' as const) : ('ok' as const);
};
