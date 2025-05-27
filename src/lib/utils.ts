import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
   return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date): string {
   return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
   });
}

export function formatWindSpeed(speed: number | null): string {
   return speed !== null ? `${speed} mph` : "N/A";
}

export function getCategoryColor(category: number): string {
   const colors = {
      0: "#74B9FF", // Tropical Depression - Light Blue
      1: "#00B894", // Category 1 - Green
      2: "#FDCB6E", // Category 2 - Yellow
      3: "#E17055", // Category 3 - Orange
      4: "#E84393", // Category 4 - Pink
      5: "#6C5CE7", // Category 5 - Purple
   };
   return colors[category as keyof typeof colors] || "#74B9FF";
}

export function getCategoryName(category: number): string {
   const names = {
      0: "Tropical Depression",
      1: "Category 1",
      2: "Category 2",
      3: "Category 3",
      4: "Category 4",
      5: "Category 5",
   };
   return names[category as keyof typeof names] || "Unknown";
}
