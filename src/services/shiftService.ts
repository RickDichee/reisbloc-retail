import { supabase } from '@/config/supabase';
import logger from '@/utils/logger';

export interface Shift {
  id: string;
  organization_id: string;
  user_id: string;
  start_time: string;
  end_time?: string;
  opening_amount: number;
  closing_amount?: number;
  expected_amount?: number;
  status: 'open' | 'closed';
}

export const shiftService = {
  async getActiveShift(userId: string) {
    const { data, error } = await supabase
      .from('shifts')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'open')
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async openShift(userId: string, orgId: string, openingAmount: number) {
    const { data, error } = await supabase
      .from('shifts')
      .insert([
        {
          user_id: userId,
          organization_id: orgId,
          opening_amount: openingAmount,
          status: 'open',
          start_time: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async closeShift(shiftId: string, closingAmount: number, expectedAmount: number) {
    const { data, error } = await supabase
      .from('shifts')
      .update({
        closing_amount: closingAmount,
        expected_amount: expectedAmount,
        status: 'closed',
        end_time: new Date().toISOString(),
      })
      .eq('id', shiftId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async calculateExpectedAmount(orgId: string, startTime: string) {
    try {
      const { data, error } = await supabase
        .from('sales')
        .select('total, tip_amount, payment_method, tip_source')
        .eq('organization_id', orgId)
        .gte('created_at', startTime);

      if (error) {
        logger.error('shift', 'Error calculating expected amount (check DB schema)', error);
        return 0; // Retornamos 0 para no romper el UI
      }

      return (data || []).reduce((sum, sale) => {
        let cashDelta = 0;
        // Si la venta fue en efectivo, el total ya incluye la propina
        if (sale.payment_method === 'cash') {
          cashDelta = Number(sale.total || 0);
        } 
        // Si la venta fue tarjeta pero la propina fue en efectivo, sumamos solo la propina
        else if (sale.tip_source === 'cash') {
          cashDelta = Number(sale.tip_amount || 0);
        }
        return sum + cashDelta;
      }, 0);
    } catch (error) {
      logger.error('shift', 'Unexpected error in calculateExpectedAmount', error);
      return 0;
    }
  },

  async appendShiftNote(shiftId: string, note: string) {
    try {
      const { data: currentShift } = await supabase.from('shifts').select('notes').eq('id', shiftId).maybeSingle();
      const existingNotes = currentShift?.notes || '';
      const timeStr = new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
      const updatedNotes = existingNotes ? `${existingNotes}\n[${timeStr}] ${note}` : `[${timeStr}] ${note}`;

      await supabase.from('shifts').update({ notes: updatedNotes }).eq('id', shiftId);
    } catch (e) {
      logger.warn('shift', 'Could not append shift note', e);
    }
  },

  async getAllActiveShifts(orgId: string) {
    const { data, error } = await supabase
      .from('shifts')
      .select('*')
      .eq('organization_id', orgId)
      .eq('status', 'open');

    if (error) throw error;
    return data || [];
  }
};