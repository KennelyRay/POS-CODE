import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import type { Product } from '../App';

export interface BasketItem extends Product {
  quantity: number;
}

interface BasketContextType {
  basket: BasketItem[];
  setBasket: React.Dispatch<React.SetStateAction<BasketItem[]>>;
}

// sessionStorage keeps the basket across page switches and window reloads,
// but a fresh app launch starts with an empty basket.
const BASKET_STORAGE_KEY = 'pos_basket';

const loadBasket = (): BasketItem[] => {
  try {
    const stored = sessionStorage.getItem(BASKET_STORAGE_KEY);
    const parsed = stored ? JSON.parse(stored) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('Error loading basket:', error);
    return [];
  }
};

const BasketContext = createContext<BasketContextType | null>(null);

export const useBasket = (): BasketContextType => {
  const context = useContext(BasketContext);
  if (!context) {
    throw new Error('useBasket must be used within a BasketProvider');
  }
  return context;
};

export const BasketProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [basket, setBasket] = useState<BasketItem[]>(loadBasket);

  useEffect(() => {
    try {
      if (basket.length === 0) {
        sessionStorage.removeItem(BASKET_STORAGE_KEY);
      } else {
        sessionStorage.setItem(BASKET_STORAGE_KEY, JSON.stringify(basket));
      }
    } catch (error) {
      console.error('Error saving basket:', error);
    }
  }, [basket]);

  return (
    <BasketContext.Provider value={{ basket, setBasket }}>
      {children}
    </BasketContext.Provider>
  );
};
