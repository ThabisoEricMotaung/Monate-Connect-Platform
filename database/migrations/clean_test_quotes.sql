DELETE FROM quotes
WHERE amount > 10000000
AND supplier_name IN (
  'TNT Kano',
  'thabiso.motaung@up.ac.za'
);
