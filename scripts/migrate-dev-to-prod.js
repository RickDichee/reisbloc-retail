const { createClient } = require('@supabase/supabase-js');

const devSb = createClient(
  'https://jnyyaclrelqcqzjummwe.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpueXlhY2xyZWxxY3F6anVtbXdlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDY3MDI5MSwiZXhwIjoyMDg2MjQ2MjkxfQ.zCTmhiDn-OVssG5ohhFz82J8Tq4Md-t_eE9xcaE4cCY'
);

const prodSb = createClient(
  'https://nmovxyaibnixvxtepbod.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5tb3Z4eWFpYm5peHZ4dGVwYm9kIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTUwNjkyOCwiZXhwIjoyMDg1MDgyOTI4fQ.mtV7dMDmeI4rmapIpELPyptDiVU8k_qhIDmk43JP1GI'
);

const MM_ORG_ID = '1b498fa6-aca5-428c-9bdd-01e6fea30316';

async function migrate() {
  console.log('🚀 Iniciando migración de datos de DEV a PROD para Moda Miel MX...');

  // 1. Migrar retail_products
  console.log('\n📦 1. Migrando retail_products...');
  const { data: devProducts, error: pErr } = await devSb
    .from('retail_products')
    .select('*')
    .eq('organization_id', MM_ORG_ID);

  if (pErr) {
    console.error('Error al leer retail_products de DEV:', pErr.message);
  } else {
    console.log(`Leídos ${devProducts.length} productos de DEV`);
    
    // Adaptar URLs de imágenes para apuntar a PROD
    const prodProducts = devProducts.map(p => {
      let img = p.image;
      if (img && img.includes('jnyyaclrelqcqzjummwe.supabase.co')) {
        img = img.replace('jnyyaclrelqcqzjummwe.supabase.co', 'nmovxyaibnixvxtepbod.supabase.co');
      }
      return {
        ...p,
        image: img
      };
    });

    // Insertar en lotes de 50
    const batchSize = 50;
    for (let i = 0; i < prodProducts.length; i += batchSize) {
      const batch = prodProducts.slice(i, i + batchSize);
      const { error: insErr } = await prodSb.from('retail_products').upsert(batch, { onConflict: 'id' });
      if (insErr) {
        console.error(`Error en lote ${i} - ${i + batch.length}:`, insErr.message);
      } else {
        console.log(`✅ Lote ${i + 1} a ${Math.min(i + batchSize, prodProducts.length)} insertado con éxito.`);
      }
    }
  }

  // 2. Migrar orders
  console.log('\n🛍️ 2. Migrando orders (pedidos)...');
  const { data: devOrders, error: oErr } = await devSb
    .from('orders')
    .select('*')
    .eq('organization_id', MM_ORG_ID);

  if (oErr) {
    console.error('Error al leer orders de DEV:', oErr.message);
  } else {
    console.log(`Leídas ${devOrders.length} órdenes de DEV`);
    const allowedCols = [
      'id', 'table_number', 'waiter_id', 'status', 'items', 'subtotal',
      'tip_amount', 'tip_percentage', 'total', 'payment_method', 'notes',
      'created_at', 'updated_at', 'sent_to_kitchen_at', 'completed_at',
      'organization_id', 'created_by', 'deleted_at', 'deleted_by'
    ];

    const cleanOrders = devOrders.map(o => {
      const row = {};
      for (const col of allowedCols) {
        if (col in o) row[col] = o[col];
      }
      return row;
    });

    const { error: insOrdErr } = await prodSb.from('orders').upsert(cleanOrders, { onConflict: 'id' });
    if (insOrdErr) {
      console.error('Error al insertar orders en PROD:', insOrdErr.message);
    } else {
      console.log(`✅ ${cleanOrders.length} órdenes migradas con éxito a PROD.`);
    }
  }

  console.log('\n🏁 Migración finalizada con éxito.');
}

migrate().catch(console.error);
