-- 🛡️ MIGRACIÓN: Actualizar el trigger de descuento de inventario
-- Corrige el descuento de existencias al realizar una venta para que afecte a la tabla 
-- 'retail_products' en lugar de la tabla obsoleta 'products'.

CREATE OR REPLACE FUNCTION "public"."handle_sale_inventory_update"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  item JSONB;
  prod_id UUID;
  qty INTEGER;
BEGIN
  -- NEW.items es un array JSONB: [{"productId": "...", "quantity": 2, ...}, ...]
  FOR item IN SELECT * FROM jsonb_array_elements(NEW.items)
  LOOP
    prod_id := (item->>'productId')::UUID;
    qty := (item->>'quantity')::INTEGER;

    -- Actualizar stock en la tabla de retail_products si tiene habilitado el inventario
    UPDATE public.retail_products
    SET current_stock = current_stock - qty
    WHERE id = prod_id AND has_inventory = true;
  END LOOP;
  
  RETURN NEW;
END;
$$;
