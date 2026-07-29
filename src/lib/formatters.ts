/**
 * Centralized formatting utilities for dates, currency, and display text.
 */

/**
 * Format currency in Indian Rupee representation (e.g. "₹ 1,500.00").
 */
export function formatCurrency(amount: number = 0): string {
  return `₹ ${amount.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Format timestamp into human-readable relative/calendar time:
 * - "Today, 4:30 PM"
 * - "Yesterday, 2:15 PM"
 * - "Oct 11, 6:00 AM"
 */
export function formatTxnTime(dateInput?: string | Date): string {
  if (!dateInput) return "Recently";
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return "Recently";

  const now = new Date();
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();

  const timeStr = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  if (isToday) return `Today, ${timeStr}`;
  if (isYesterday) return `Yesterday, ${timeStr}`;

  const monthStr = date.toLocaleDateString("en-US", { month: "short" });
  return `${monthStr} ${date.getDate()}, ${timeStr}`;
}

/**
 * Extract clean 1-2 character uppercase initials from a user's full name.
 */
export function formatInitials(name?: string, fallback: string = "AP"): string {
  if (!name || !name.trim()) return fallback;
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
