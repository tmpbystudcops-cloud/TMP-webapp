import { createClient } from 'npm:@supabase/supabase-js@2.50.5';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface OrderItem {
  product_id: number;
  product_name: string;
  quantity: number;
  price: number;
}

interface OrderRequest {
  name: string;
  whatsapp: string;
  items: OrderItem[];
  total: number;
  transaction_id: string;
  unique_order_id: string;
}

interface OrderRow {
  id: number;
  unique_order_id: string;
  name: string;
  whatsapp: string;
  total: number;
  items: OrderItem[];
}

const sendTelegramNotification = async (order: OrderRow) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    if (!supabaseUrl || !supabaseAnonKey) return;

    await fetch(`${supabaseUrl}/functions/v1/send-telegram-notification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify({
        order_id: order.id,
        unique_order_id: order.unique_order_id,
        customer_name: order.name,
        whatsapp: order.whatsapp,
        total: order.total,
        items: order.items,
      }),
    });
  } catch (error) {
    console.error('Failed to send Telegram notification:', error);
  }
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const orderData: OrderRequest = await req.json();

    for (const item of orderData.items) {
      const { data: product, error: productError } = await supabase
        .from('products')
        .select('stock, available')
        .eq('id', item.product_id)
        .single();

      if (productError) {
        throw new Error(`Product ${item.product_id} not found`);
      }
      if (!product.available) {
        throw new Error(`Product ${item.product_name} is not available`);
      }
      if (product.stock < item.quantity) {
        throw new Error(`Insufficient stock for ${item.product_name}. Available: ${product.stock}, Requested: ${item.quantity}`);
      }
    }

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert([{
        name: orderData.name,
        whatsapp: orderData.whatsapp,
        items: orderData.items,
        total: orderData.total,
        transaction_id: orderData.transaction_id,
        unique_order_id: orderData.unique_order_id,
        status: 'Pending'
      }])
      .select()
      .single();

    if (orderError) throw orderError;

    sendTelegramNotification(order as OrderRow);

    for (const item of orderData.items) {
      const { data: currentProduct, error: getCurrentError } = await supabase
        .from('products')
        .select('stock')
        .eq('id', item.product_id)
        .single();

      if (getCurrentError) {
        throw new Error(`Failed to get current stock for ${item.product_name}`);
      }

      const { error: stockError } = await supabase
        .from('products')
        .update({ stock: currentProduct.stock - item.quantity })
        .eq('id', item.product_id);

      if (stockError) {
        throw new Error(`Failed to update stock for ${item.product_name}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        order_id: order.id,
        message: 'Order placed successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Order processing error:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'Failed to process order',
        success: false
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
