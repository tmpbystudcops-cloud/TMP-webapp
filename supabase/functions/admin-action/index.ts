import { createClient } from 'npm:@supabase/supabase-js@2.50.5';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const body = await req.json();
    const { action, password, payload } = body;

    if (!password) {
      return new Response(JSON.stringify({ error: 'Password required' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: settings, error: settingsError } = await supabase
      .from('settings')
      .select('admin_password')
      .limit(1)
      .maybeSingle();

    if (settingsError) throw settingsError;

    const storedPassword = settings?.admin_password;
    if (!storedPassword || storedPassword !== password) {
      return new Response(JSON.stringify({ error: 'Invalid password' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    switch (action) {

      case 'insert_product': {
        const { error } = await supabase.from('products').insert([payload]);
        if (error) throw error;
        return ok({ success: true });
      }

      case 'update_product': {
        const { id, ...data } = payload;
        const { error } = await supabase.from('products').update(data).eq('id', id);
        if (error) throw error;
        return ok({ success: true });
      }

      case 'delete_product': {
        const { error } = await supabase.from('products').delete().eq('id', payload.id);
        if (error) throw error;
        return ok({ success: true });
      }

      case 'update_order_status': {
        const { id, status } = payload;
        const allowed = ['Pending', 'Ready', 'Picked Up'];
        if (!allowed.includes(status)) {
          return new Response(JSON.stringify({ error: 'Invalid status' }), {
            status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        const { error } = await supabase.from('orders').update({ status }).eq('id', id);
        if (error) throw error;
        return ok({ success: true });
      }

      case 'update_settings': {
        const { id, ...data } = payload;
        const { error } = await supabase.from('settings').update(data).eq('id', id);
        if (error) throw error;
        return ok({ success: true });
      }

      case 'insert_settings': {
        const { error } = await supabase.from('settings').insert([payload]);
        if (error) throw error;
        return ok({ success: true });
      }

      case 'toggle_orders': {
        const { id, orders_enabled } = payload;
        const { error } = await supabase.from('settings').update({ orders_enabled }).eq('id', id);
        if (error) throw error;
        return ok({ success: true });
      }

      case 'toggle_orders_insert': {
        const { error } = await supabase.from('settings').insert([payload]);
        if (error) throw error;
        return ok({ success: true });
      }

      case 'change_password': {
        const { id, new_password } = payload;
        if (!new_password || new_password.length < 6) {
          return new Response(JSON.stringify({ error: 'Password too short' }), {
            status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        const { error } = await supabase.from('settings').update({ admin_password: new_password }).eq('id', id);
        if (error) throw error;
        return ok({ success: true });
      }

      case 'change_password_insert': {
        const { error } = await supabase.from('settings').insert([payload]);
        if (error) throw error;
        return ok({ success: true });
      }

      default:
        return new Response(JSON.stringify({ error: 'Unknown action' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    console.error('admin-action error:', err);
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function ok(data: unknown): Response {
  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
