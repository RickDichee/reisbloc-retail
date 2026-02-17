-- Migración: Agregar soporte para inventario en tabla products
-- Ejecutar en Supabase SQL Editor

-- Agregar columna inventory a tabla products
ALTER TABLE products ADD COLUMN inventory JSONB DEFAULT NULL;

-- Crear índice para mejor rendimiento
CREATE INDEX idx_products_inventory ON products USING GIN (inventory);

-- Opcional: Migrar datos existentes si hay products sin inventory
UPDATE products SET inventory = jsonb_build_object(
  'hasInventory', false,
  'currentStock', 0,
  'minimumStock', 0
) WHERE inventory IS NULL;
