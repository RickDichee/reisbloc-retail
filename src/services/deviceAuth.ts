// src/services/deviceAuth.ts

import { ENV } from '@/config/environment';

export async function validateDevice(deviceId: string, userId: string): Promise<boolean> {
  // ✅ SKIP en desarrollo (tu máquina siempre pasa)
  if (ENV.features.skipMacValidation) {
    devLog('⚠️ MAC validation skipped (development mode)');
    return true;
  }

  // Validación normal para staging/production
  const { data: device } = await supabase
    .from('devices')
    .select('status')
    .eq('id', deviceId)
    .eq('user_id', userId)
    .single();

  return device?.status === 'approved';
}