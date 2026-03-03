/**
 * cartStore.tsx — Global cart state using React Context + useReducer.
 * Adapted from Hillaha-Services/client/src/lib/cart-store.ts for React Native.
 *
 * Usage:
 *   1. Wrap root layout with <CartProvider>
 *   2. Call useCart() inside any screen to access cart state and actions
 */

import React, { createContext, useContext, useReducer } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type CartItem = {
  id: string;           // unique per (partner + item) e.g. "p1_item_burger"
  name: string;
  nameAr: string;
  price: number;
  image?: string;
  partnerId: string;
  partnerName: string;
};

type CartEntry = CartItem & { qty: number };

type CartState = {
  items: Record<string, CartEntry>;
  partnerId: string | null;
  partnerName: string | null;
  deliveryFee: number;
};

type CartAction =
  | { type: "ADD";              item: CartItem; deliveryFee?: number }
  | { type: "REMOVE";           id: string }
  | { type: "UPDATE_QTY";       id: string; qty: number }
  | { type: "SET_DELIVERY_FEE"; fee: number }
  | { type: "CLEAR" };

// ─── Reducer ──────────────────────────────────────────────────────────────────

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "ADD": {
      // Prevent mixing items from different partners
      if (state.partnerId && state.partnerId !== action.item.partnerId) {
        return state;
      }
      const existing = state.items[action.item.id];
      return {
        ...state,
        partnerId:   action.item.partnerId,
        partnerName: action.item.partnerName,
        deliveryFee: action.deliveryFee ?? state.deliveryFee,
        items: {
          ...state.items,
          [action.item.id]: {
            ...action.item,
            qty: (existing?.qty ?? 0) + 1,
          },
        },
      };
    }

    case "REMOVE": {
      const current = state.items[action.id];
      if (!current) return state;
      const next = { ...state.items };
      if (current.qty <= 1) {
        delete next[action.id];
      } else {
        next[action.id] = { ...current, qty: current.qty - 1 };
      }
      const isEmpty = Object.keys(next).length === 0;
      return {
        ...state,
        items:       next,
        partnerId:   isEmpty ? null : state.partnerId,
        partnerName: isEmpty ? null : state.partnerName,
        deliveryFee: isEmpty ? 0 : state.deliveryFee,
      };
    }

    case "UPDATE_QTY": {
      if (action.qty <= 0) {
        const next = { ...state.items };
        delete next[action.id];
        const isEmpty = Object.keys(next).length === 0;
        return {
          ...state,
          items:       next,
          partnerId:   isEmpty ? null : state.partnerId,
          partnerName: isEmpty ? null : state.partnerName,
          deliveryFee: isEmpty ? 0 : state.deliveryFee,
        };
      }
      return {
        ...state,
        items: {
          ...state.items,
          [action.id]: { ...state.items[action.id], qty: action.qty },
        },
      };
    }

    case "SET_DELIVERY_FEE":
      return { ...state, deliveryFee: action.fee };

    case "CLEAR":
      return { items: {}, partnerId: null, partnerName: null, deliveryFee: 0 };
  }
}

// ─── Context & Provider ───────────────────────────────────────────────────────

type CartContextValue = {
  state:    CartState;
  dispatch: React.Dispatch<CartAction>;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, {
    items:       {},
    partnerId:   null,
    partnerName: null,
    deliveryFee: 0,
  });

  return (
    <CartContext.Provider value={{ state, dispatch }}>
      {children}
    </CartContext.Provider>
  );
}

// ─── useCart hook ─────────────────────────────────────────────────────────────

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be inside <CartProvider>");

  const { state, dispatch } = ctx;
  const itemList    = Object.values(state.items);
  const totalItems  = itemList.reduce((s, i) => s + i.qty, 0);
  const subtotal    = itemList.reduce((s, i) => s + i.price * i.qty, 0);
  const deliveryFee = state.deliveryFee;
  const total       = subtotal + deliveryFee;
  // 1 loyalty point per 250 EGP spent
  const loyaltyEarn = Math.floor(subtotal / 250);

  return {
    // State
    items:       state.items,
    itemList,
    partnerId:   state.partnerId,
    partnerName: state.partnerName,
    totalItems,
    subtotal,
    deliveryFee,
    total,
    loyaltyEarn,

    // Actions
    addItem:         (item: CartItem, fee?: number) => dispatch({ type: "ADD",              item, deliveryFee: fee }),
    removeItem:      (id: string)                     => dispatch({ type: "REMOVE",          id }),
    updateQty:       (id: string, qty: number)        => dispatch({ type: "UPDATE_QTY",      id, qty }),
    setDeliveryFee:  (fee: number)                     => dispatch({ type: "SET_DELIVERY_FEE", fee }),
    clearCart:       ()                                => dispatch({ type: "CLEAR" }),

    // Utility: check if a partner conflicts with current cart
    hasConflict: (pId: string) =>
      !!(state.partnerId && state.partnerId !== pId),
  };
}
