// src/services/deviceAuth.ts

import { ENV } from '@/config/environment';
import { supabase } from '@/config/supabase';
import logger from '@/utils/logger';

export async function validateDevice(deviceId: string, userId: string): Promise<boolean> {
  if (ENV.features.skipMacValidation) {
    logger.info('device-auth', 'MAC validation skipped (development mode)');
    return true;
  }

  const { data: device, error } = await supabase
    .from('devices')
    .select('status')
    .eq('id', deviceId)
    .eq('user_id', userId)
    .single();

  if (error) {
    logger.error('device-auth', 'Error validating device', error);
    return false;
  }

  return device?.status === 'approved';
}