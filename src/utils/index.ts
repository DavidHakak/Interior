import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import date from "./date";

//tailwindcss
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function uniques<T>(arr: Array<T>, getKey: (item: T) => string) {
  return [...new Map(arr.map((item) => [getKey(item), item])).values()];
}

export default {
  cn,
  uniques,
  ...date,
};
