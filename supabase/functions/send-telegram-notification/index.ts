const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface NotificationPayload {
  order_id: number;
  unique_order_id: string;
  customer_name: string;
  whatsapp: string;
  total: number;
  items: Array<{
    product_name: string;
    quantity: number;
    price: number;
  }>;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const telegramBotToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
    const telegramChatId = Deno.env.get('TELEGRAM_CHAT_ID');

    if (!telegramBotToken || !telegramChatId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Telegram configuration missing. Please set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const payload: NotificationPayload = await req.json();

    const itemsList = payload.items
      .map(item => `• ${item.product_name} × ${item.quantity} = ₹${(item.price * item.quantity).toFixed(2)}`)
      .join('\n');

    const message = `
*NEW ORDER RECEIVED*

📦 *Order ID:* \`${payload.unique_order_id}\`
👤 *Customer:* ${payload.customer_name}
📱 *WhatsApp:* +91${payload.whatsapp.replace(/^\+?91/, '')}

📋 *Items Ordered:*
${itemsList}

💰 *Total Amount:* ₹${payload.total.toFixed(2)}

⏰ *Status:* Pending

_Please verify payment and confirm order_
    `.trim();

    const response = await fetch(`https://api.telegram.org/bot${telegramBotToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: telegramChatId,
        text: message,
        parse_mode: 'Markdown',
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(`Telegram API error: ${result.description || 'Unknown error'}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Telegram notification sent successfully',
        telegram_message_id: result.result.message_id,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Telegram notification error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Failed to send telegram notification',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
