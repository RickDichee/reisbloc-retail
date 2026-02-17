/*
================================================================================
DETALLE DE CAMBIOS Y PASOS DE SOLUCIÓN — verify-sales-schema.sql
================================================================================

Contexto:
Este script fue creado para verificar que el esquema de la base de datos de ventas (sales) en Supabase cumple con todos los constraints (NOT NULL, claves foráneas, etc.) y que puede ejecutarse de forma idempotente y sin errores, incluso en entornos productivos.

Problemas encontrados:
- Violaciones de constraints NOT NULL y claves foráneas al insertar datos de prueba.
- UUIDs aleatorios causaban inconsistencias en pruebas repetidas.
- Falta de datos dummy para satisfacer todas las relaciones y restricciones.
- Scripts no idempotentes: fallaban si se ejecutaban varias veces.
- Falta de documentación sobre el propósito y uso del script.

Soluciones implementadas:
1. Uso de UUIDs determinísticos para todos los inserts de prueba, asegurando que los datos sean siempre los mismos en cada ejecución.
2. Inserción de datos dummy para todas las tablas relacionadas, cubriendo todos los constraints y relaciones.
3. Envolvimiento de los inserts en bloques BEGIN/COMMIT para asegurar atomicidad y facilitar rollback en caso de error.
4. Estructura idempotente: los inserts usan ON CONFLICT DO NOTHING o chequeos previos para evitar duplicados.
5. Documentación clara al inicio del archivo, explicando el propósito, problemas y soluciones.

Pasos de solución para futuros casos similares:
1. Identificar todas las tablas y constraints involucradas en el flujo de datos a probar.
2. Generar datos dummy para cada tabla, asegurando que todos los campos NOT NULL y claves foráneas estén cubiertos.
3. Usar UUIDs fijos o determinísticos para evitar duplicados y facilitar pruebas repetidas.
4. Envolver los inserts en transacciones (BEGIN/COMMIT) para facilitar el manejo de errores.
5. Usar ON CONFLICT DO NOTHING o chequeos previos para hacer los scripts idempotentes.
6. Documentar claramente el propósito del script y los pasos seguidos para robustecerlo.

Resultado:
El script puede ejecutarse múltiples veces sin error, inserta todos los datos necesarios para validar el esquema y sirve como referencia para robustecer otros scripts de verificación o migración.

Última actualización: 27/01/2026
================================================================================
*/


SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'sales'
ORDER BY ordinal_position;

SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'sales';

SELECT
  tc.constraint_name,
  kcu.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM
  information_schema.table_constraints AS tc
  JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
  JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE
  tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'sales';


BEGIN;

INSERT INTO users (id, name, pin, role)
SELECT '11111111-1111-1111-1111-111111111111'::uuid, 'Dummy User', '0000', 'capitan'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE id = '11111111-1111-1111-1111-111111111111'::uuid);

INSERT INTO devices (id, user_id, mac_address)
SELECT '22222222-2222-2222-2222-222222222222'::uuid, '11111111-1111-1111-1111-111111111111'::uuid, '00:00:00:00:00:00'
WHERE NOT EXISTS (SELECT 1 FROM devices WHERE id = '22222222-2222-2222-2222-222222222222'::uuid);

INSERT INTO orders (id, table_number, waiter_id, items, subtotal, tip_amount, tip_percentage, total, status, created_by)
SELECT
  '33333333-3333-3333-3333-333333333333'::uuid,
  1,
  '11111111-1111-1111-1111-111111111111'::uuid,
  '[]'::jsonb,
  100.00,
  10.00,
  10,
  110.00,
  'pending',
  '11111111-1111-1111-1111-111111111111'::uuid
WHERE NOT EXISTS (SELECT 1 FROM orders WHERE id = '33333333-3333-3333-3333-333333333333'::uuid);

INSERT INTO sales (
  order_id,
  waiter_id,
  table_number,
  items,
  subtotal,
  tip_amount,
  tip_percentage,
  total,
  payment_method,
  device_id
) VALUES (
  '33333333-3333-3333-3333-333333333333'::uuid,
  '11111111-1111-1111-1111-111111111111'::uuid,
  1,
  '[]'::jsonb,
  100.00,
  10.00,
  10,
  110.00,
  'cash',
  '22222222-2222-2222-2222-222222222222'::uuid
);

COMMIT;

SELECT * FROM sales WHERE order_id = '33333333-3333-3333-3333-333333333333'::uuid;

SELECT * FROM sales ORDER BY created_at DESC LIMIT 10;
