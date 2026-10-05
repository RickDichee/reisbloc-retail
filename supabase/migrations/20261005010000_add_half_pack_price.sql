-- Migration: Add half_pack_price column to retail_products
-- Description: Supports manual pricing for half-pack sales (Medio Paquete)

ALTER TABLE public.retail_products 
ADD COLUMN IF NOT EXISTS half_pack_price NUMERIC DEFAULT 0;

COMMENT ON COLUMN public.retail_products.half_pack_price IS 'Precio de venta al menudeo para medio paquete (0.5 unidades de inventario)';
