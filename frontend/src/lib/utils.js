import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// Format currency using ŦaxiCoin (Ŧ) symbol
export function formatCurrency(amount) {
  return `Ŧ${amount.toFixed(2)}`;
}
