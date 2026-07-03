-- ============================================================
-- place_order(): atomic order placement.
-- Locks each product row (FOR UPDATE), validates availability &
-- stock, computes the authoritative total from live DB prices,
-- inserts the order, and decrements stock — all in one
-- transaction so concurrent orders cannot oversell.
--
-- Expects p_items as a consolidated array: [{product_id, quantity}]
-- (quantities already summed per product by the caller).
-- Raises coded exceptions the API maps to friendly messages.
-- ============================================================
create or replace function public.place_order(
  p_name            text,
  p_whatsapp        text,
  p_items           jsonb,
  p_transaction_id  text,
  p_unique_order_id text
) returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item        jsonb;
  v_pid         bigint;
  v_qty         integer;
  v_product     public.products%rowtype;
  v_total       numeric(10,2) := 0;
  v_order_items jsonb := '[]'::jsonb;
  v_order       public.orders;
  v_enabled     boolean;
begin
  -- shop open?
  select orders_enabled into v_enabled from public.settings limit 1;
  if v_enabled is not null and v_enabled = false then
    raise exception 'SHOP_CLOSED';
  end if;

  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'EMPTY_CART';
  end if;

  -- validate + lock + accumulate total
  for v_item in select value from jsonb_array_elements(p_items)
  loop
    v_pid := (v_item->>'product_id')::bigint;
    v_qty := floor((v_item->>'quantity')::numeric)::int;
    if v_qty is null or v_qty <= 0 then
      raise exception 'BAD_ITEM';
    end if;

    select * into v_product from public.products where id = v_pid for update;

    if not found or not v_product.available then
      raise exception 'UNAVAILABLE:%', coalesce(v_product.name, 'An item');
    end if;
    if v_product.stock < v_qty then
      raise exception 'STOCK:%:%', v_product.stock, v_product.name;
    end if;

    v_total := v_total + v_product.price * v_qty;
    v_order_items := v_order_items || jsonb_build_object(
      'product_id',   v_product.id,
      'product_name', v_product.name,
      'quantity',     v_qty,
      'price',        v_product.price
    );
  end loop;

  if v_total <= 0 then
    raise exception 'BAD_TOTAL';
  end if;

  -- insert the order (unique_order_id collisions raise unique_violation / 23505)
  insert into public.orders (name, whatsapp, items, total, transaction_id, status, unique_order_id)
  values (p_name, p_whatsapp, v_order_items, v_total, p_transaction_id, 'Pending', p_unique_order_id)
  returning * into v_order;

  -- decrement stock (rows already locked above, so this is race-safe)
  for v_item in select value from jsonb_array_elements(p_items)
  loop
    v_pid := (v_item->>'product_id')::bigint;
    v_qty := floor((v_item->>'quantity')::numeric)::int;
    update public.products set stock = stock - v_qty where id = v_pid;
  end loop;

  return v_order;
end;
$$;

-- Only the server (service_role) may place orders; block direct anon/authenticated calls.
revoke all on function public.place_order(text, text, jsonb, text, text) from public, anon, authenticated;
grant execute on function public.place_order(text, text, jsonb, text, text) to service_role;
