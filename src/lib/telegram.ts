import "server-only";
import type { OrderItem } from "./types";

interface NotifyPayload {
  unique_order_id: string;
  customer_name: string;
  whatsapp: string;
  total: number;
  items: OrderItem[];
}

// Sends a Telegram message to the admin. Silent failure — never breaks order placement.
export async function sendTelegramNotification(payload: NotifyPayload): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return; // not configured — skip quietly

  const itemLines = payload.items
    .map((i) => `• ${i.product_name} × ${i.quantity} = ₹${(i.price * i.quantity).toFixed(2)}`)
    .join("\n");

  const text =
    `*NEW ORDER RECEIVED*\n\n` +
    `📦 *Order ID:* \`${payload.unique_order_id}\`\n` +
    `👤 *Customer:* ${payload.customer_name}\n` +
    `📱 *WhatsApp:* +91${payload.whatsapp}\n\n` +
    `📋 *Items Ordered:*\n${itemLines}\n\n` +
    `💰 *Total Amount:* ₹${payload.total.toFixed(2)}\n\n` +
    `⏰ *Status:* Pending\n\n` +
    `_Please verify payment and confirm order_`;

  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "Markdown",
      }),
    });
  } catch {
    // swallow — notifications must never block an order
  }
}
