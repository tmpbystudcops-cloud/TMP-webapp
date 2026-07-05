-- ============================================================
-- Seed data (idempotent: only runs when tables are empty)
-- ============================================================

-- ---------- default settings row ----------
insert into public.settings (shop_name, upi_id, tagline, enable_quick_pay, orders_enabled, admin_password)
select 'TMP at NU', 'tmpatnu@upi', 'Get your favorites delivered in minutes.', true, true, 'admin123'
where not exists (select 1 from public.settings);

-- ---------- sample products ----------
insert into public.products (name, description, price, original_price, stock, available, category, image_url, featured)
select * from (values
  ('Zesty Loaded Nachos', 'Crispy nachos, melted cheddar, jalapeños & fresh pico de gallo.', 120.00, null, 25, true, 'hot',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuAF3pqfWEAgmjSPNXMaiuux-JsBfrrsAIWiH6cJCDNinBG4qVC2jWi3RR-cFPtnyJCMZrmXZU14-3m4OuWlaMGOdzJkAlf8cRxN9P5MwR6Xp1m5GqWh8HH-j8v1LJUsh_obaz5zvSbRXQz338vepMebesBd0BxM3GhmkF7fRUYBblJfzCn5aj_CtL869ySEw08DFbzHBHtoJxqeKwhid1nzfx1wE3aQXvQhZ46qnr4yIaML6Q-bjs0qMlH_EYVRqG1rQks0JpiKaUPI', true),
  ('Blue Bolt Energy', 'Ice-cold energy drink to power your all-nighter.', 60.00, null, 40, true, 'drinks',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuDPvZRGQnGgimoaBS16OIr_0rCQ2RSPh8lv8vsmeMto5LYE5BUciAJYl7H9rBGXwQiOxazXBSucqwfDKHCNE2c0d0XrOowg_DZGfWpnN_hv5sFZi8bY2Sj86ft6Lp9TUHBY6cj1ZrEdQC3d7uDaZOYklvfkDR5D3PrxFp_o8SFdyHp2tkkLCFTxvnJ00yfDagM69qQCyOE_WsMcteSASixIwuKstnz2E5GKFgpcwGi1F9-TiYYDwQKNCk_gCXUuqyGmWmMQ4M8NsPLH', true),
  ('Dark Sea Salt Bar', 'Artisanal dark chocolate with sea salt crystals.', 50.00, null, 30, true, 'sweets',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuA4fELWd7sskR1k5PFWKzGneAGiTatV_7JEpIM3ZU_yZwJ1f2UeHU5DUS48XtMpnho4DHEaFLQNxKHgsax3h8jlON9QO7v5C4KX66mZ7xUyUzhR3iMISiWg-9VPYR0i2aQ8_VRADWF2pAtzIvjBn3Zj0PRvjs751P4_CuYuIl065fRwNCPRtpqwwB2CIT4kKXjAIbJLBxbdN3_RQj7TY9X6dx88pbQWQX9VZ70OyaVeMsC4DRcoy6hKJL5TOq_up1jszpGFfVuFAyGd', true),
  ('Glazed Donuts (2-for-1)', 'Warm glazed donuts with sprinkles. Perfect for study groups!', 40.00, 80.00, 20, true, 'sweets',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuCgDMbS6dFbi7nqF3LQ1OjJFtNNptPyR1eJ8JAnVbCxRMxZMpvd7mLjtAsqTJHlzBOpVXuahdOrsEaVamtwBwgFhAvHQ3RyC2Uc6Mzk2iF2KO7e18SSQZloOm-yLaloUl3z5BtOVSWqObUZfJ7Ikw1niFfdOAhuhvOT5-pTgklk7iWZZAbyHVzdOsju9CGLDQIKaXBg0MERRC8lV0L0uiM9cycDFqvrhFNNiOa0p-eUEPoU0VQSuEBSTYPNBUDiLBK_ovW-hPAAOr3a', false),
  ('Mixed Berry Cup', 'Organic blueberries, raspberries & strawberries.', 90.00, null, 15, true, 'healthy',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuBys7xaTNamV6V6Ntdw3QxWa0wc-578JOAEqJqB61s7K1TTA4YmJF6fny-PJkVTOH8Gv2gg_RgtrT55ib96WSgoytZLpG3TFy8leLWHopdfsJOUQrN6dLuI_HULUqwaKJA4REP-nIOZiEc1dKqXYSxSgLmaNjwEX2Me_N10fEZMZBUcS0w1YfV9GX9gZT5m1Oa3LTEQaLhxoLNXsobjBr8ekkRdBtHTqOc2G0Gx4Aceyjhc32P-Qb81e8SnOXXiUJ4VitDp0eL5i-AE', false),
  ('Protein Nut Mix', 'Roasted salted almonds & cashews. High-protein boost.', 75.00, null, 18, true, 'healthy',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuDzWqiSDYWB-CPtI1fdrPiugVqp69jfXKU2FygGFdcFKnalUTMDj9N20q7FdUBitHx_qSzOxrYFZcMPBD03kTK_8vD7e0RYfu09z9im0lSsVMIJtO2Xd58XeyYel_gpILJztKOSY4u33Ts2PVv3ABX-ycQGpNAzzeTvJDmbrnM9jtBfRO6wTcOGgk9VvvjtWEp4lNzwo2ALNVYC_eoWNt_3_WzU9x6zqlclsZ8T5L9BaORNwTCek0uGDKIbDPoyDUiwh9Rzx6sYuLXw', false),
  ('Sea Salt Kale Chips', 'Crispy baked kale chips with a hint of sea salt.', 50.00, null, 22, true, 'chips',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuDksydjmvWNPk4Rtu98zikAOefgcLTHt2VEStRZNC1dPn-6yuLbf3Vq1s2X7DCdhnrRZN3vSjgnSCU-h74Akw17kDXOoZo0ZNogZNAWLKl3WRTYLH8q2ulS1OMDMH7Pm25Vzb20wkI7QvFIVD9xFML1nXtOzHniMBAYY8OLHI8qmzcdyW0nDZaJJL7HGcpxf_7iAqLlJOjqCoOWA49ZXgC280u0t5JsSk_5-F31AwkKTzN2_GrTzWx-hbHOV86Ngd-hgEXyG6OpmBzr', false),
  ('Masala Potato Chips', 'Classic tangy masala crunch.', 30.00, null, 50, true, 'chips', null, false),
  ('Cold Coffee', 'Chilled creamy cold coffee.', 70.00, null, 28, true, 'drinks', null, false),
  ('Veg Samosa (2 pcs)', 'Hot, flaky samosas with spiced potato filling.', 40.00, null, 35, true, 'hot', null, false),
  ('Chocolate Muffin', 'Rich double-chocolate muffin.', 55.00, null, 3, true, 'sweets', null, false)
) as v(name, description, price, original_price, stock, available, category, image_url, featured)
where not exists (select 1 from public.products);
