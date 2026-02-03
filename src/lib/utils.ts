import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency: string = "USD"): string {
  try {
    if (currency === "USD") return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
    if (currency === "EUR") return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(amount);
    return new Intl.NumberFormat("es-VE", { style: "currency", currency: "VES" }).format(amount);
  } catch (e) {
    return `${currency} ${amount.toFixed(2)}`;
  }
}
