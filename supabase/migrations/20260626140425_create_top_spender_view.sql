CREATE OR REPLACE VIEW top_spender AS
SELECT
  whatsapp,
  (array_agg(name ORDER BY created_at DESC))[1] AS name,
  sum(total) AS total
FROM orders
GROUP BY whatsapp
ORDER BY total DESC
LIMIT 1;

COMMENT ON VIEW top_spender IS 'Convenience view returning the customer with the highest cumulative spend across all orders.';
