import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// Format currency using Ⓣ symbol
export function formatCurrency(amount) {
  return `Ⓣ${amount.toFixed(2)}`;
}
