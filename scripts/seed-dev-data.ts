// scripts/seed-dev-data.ts

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function seedDevData() {
  console.log('🌱 Seeding development data...');

  // 1. Crear Organizaciones (Sincronizadas con IDs de PROD)
  const { data: retailOrg } = await supabase
    .from('organizations')
    .upsert({
      id: '8ba45da3-7373-4c9f-867f-5ea2d8300cc6',
      name: 'Reisbloc Lab',
      slug: 'reisbloc-lab',
      type: 'store',
      app_mode: 'retail',
      plan: 'free',
      status: 'active',
      active: true,
    })
    .select()
    .single();

  const { data: restOrg } = await supabase
    .from('organizations')
    .upsert({
      id: '4eb9c537-8d82-4243-896a-c1b4f6440ddd',
      name: 'Cevicheria Mexa',
      slug: 'cevicheria-mexa',
      type: 'restaurant',
      app_mode: 'restaurant',
      plan: 'free',
      status: 'active',
      active: true,
    })
    .select()
    .single();

  const { data: mgmtOrg } = await supabase
    .from('organizations')
    .upsert({
      id: '8fdd0efd-544a-4624-80a3-a6c26054f639',
      name: 'Reisbloc Management',
      slug: 'reisbloc-hq',
      type: 'management',
      app_mode: 'admin',
      plan: 'enterprise',
      status: 'active',
      active: true,
    })
    .select()
    .single();

  console.log('✅ Organizations created: Retail, Restaurant & Management');

  // 2. Crear Usuario "Fresh" (ID de Desarrollo)
  const devUserId = '00000000-0000-0000-0000-000000000001';
  
  const { data: user } = await supabase
    .from('users')
    .upsert({
      id: devUserId,
      name: 'Dev Master',
      pin: '0000',
      role: 'admin',
      is_primary_admin: true,
      active: true,
      organization_id: retailOrg.id, // Empezamos en modo Tienda
    })
    .select()
    .single();

  console.log('✅ User created:', user.name);

  // 3. Limpiar dispositivos viejos y aprobar el actual
  await supabase.from('devices').delete().eq('user_id', devUserId);

  const yourFingerprint = 'dev-machine-fingerprint-123'; 
  
  await supabase
    .from('devices')
    .upsert({
      fingerprint: yourFingerprint,
      user_id: user.id,
      organization_id: retailOrg.id,
      device_name: 'Dev Machine',
      status: 'approved',
      is_approved: true,
      device_type: 'desktop',
      last_access: new Date().toISOString(),
    });

  console.log('✅ Device auto-approved:', yourFingerprint);

  // 4. Productos de prueba (Mix de ambos mundos)
  const products = [
    { name: 'Playera Reisbloc', price: 250, category: 'Ropa', organization_id: retailOrg.id },
    { name: 'Gorra Logo', price: 150, category: 'Accesorios', organization_id: retailOrg.id },
    { name: 'Ceviche Mixto', price: 180, category: 'Mariscos', organization_id: restOrg.id },
    { name: 'Tostada de Camaron', price: 45, category: 'Entradas', organization_id: restOrg.id },
  ];

  for (const product of products) {
    await supabase.from('products').insert(product);
  }

  console.log('✅ Products created:', products.length);

  console.log('\n🎉 Dev data seeded successfully!');
  console.log('\nLogin credentials:');
  console.log(`  User: ${user.name} (ID: ${devUserId})`);
  console.log('  PIN: 0000');
  console.log(`  Org Actual: ${retailOrg.name} (Modo: ${retailOrg.app_mode})`);
  console.log('\n💡 Para probar Cevicheria, cambia el organization_id del usuario a: org-rest-dev');
}

seedDevData();