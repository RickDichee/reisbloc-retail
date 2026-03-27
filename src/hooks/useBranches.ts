import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/config/supabase'
import { useAppStore } from '@/store/appStore'

export interface Branch {
  id: string
  organization_id: string
  name: string
  code: string | null
  address: string | null
  phone: string | null
  email: string | null
  city: string | null
  state: string | null
  is_main: boolean
  is_active: boolean
  default_open_time: string
  default_close_time: string
  created_at: string
}

export interface EmployeeSchedule {
  id: string
  user_id: string
  branch_id: string | null
  day_of_week: number
  start_time: string
  end_time: string
  break_duration_minutes: number
  is_active: boolean
}

const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

export function useBranches() {
  const { currentUser } = useAppStore()
  const organizationId = currentUser?.organizationId
  const [branches, setBranches] = useState<Branch[]>([])
  const [currentBranch, setCurrentBranch] = useState<Branch | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchBranches = useCallback(async () => {
    if (!organizationId) return

    setLoading(true)
    setError(null)

    try {
      const { data, error } = await supabase
        .from('branches')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .order('is_main', { ascending: false })
        .order('name')

      if (error) throw error
      setBranches(data || [])

      // Seleccionar la principal por defecto
      const main = data?.find(b => b.is_main) || data?.[0]
      setCurrentBranch(main || null)
    } catch (err: any) {
      setError(err.message)
      console.error('Error fetching branches:', err)
    } finally {
      setLoading(false)
    }
  }, [organizationId])

  useEffect(() => {
    fetchBranches()
  }, [fetchBranches])

  const selectBranch = useCallback((branchId: string) => {
    const branch = branches.find(b => b.id === branchId)
    if (branch) {
      setCurrentBranch(branch)
      localStorage.setItem('current_branch_id', branchId)
    }
  }, [branches])

  const createBranch = useCallback(async (branch: Partial<Branch>): Promise<Branch | null> => {
    if (!organizationId) return null

    try {
      const { data, error } = await supabase
        .from('branches')
        .insert({
          ...branch,
          organization_id: organizationId
        })
        .select()
        .single()

      if (error) throw error
      await fetchBranches()
      return data
    } catch (err) {
      console.error('Error creating branch:', err)
      return null
    }
  }, [organizationId, fetchBranches])

  const updateBranch = useCallback(async (branchId: string, updates: Partial<Branch>): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('branches')
        .update(updates)
        .eq('id', branchId)

      if (error) throw error
      await fetchBranches()
      return true
    } catch (err) {
      console.error('Error updating branch:', err)
      return false
    }
  }, [fetchBranches])

  const deleteBranch = useCallback(async (branchId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('branches')
        .update({ is_active: false })
        .eq('id', branchId)

      if (error) throw error
      await fetchBranches()
      return true
    } catch (err) {
      console.error('Error deleting branch:', err)
      return false
    }
  }, [fetchBranches])

  return {
    branches,
    currentBranch,
    selectBranch,
    createBranch,
    updateBranch,
    deleteBranch,
    fetchBranches,
    loading,
    error
  }
}

export function useEmployeeSchedules(userId?: string) {
  const { currentUser } = useAppStore()
  const organizationId = currentUser?.organizationId
  const [schedules, setSchedules] = useState<EmployeeSchedule[]>([])
  const [loading, setLoading] = useState(true)

  const targetUserId = userId || currentUser?.id

  const fetchSchedules = useCallback(async () => {
    if (!organizationId || !targetUserId) return

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('employee_schedules')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('user_id', targetUserId)
        .eq('is_active', true)
        .order('day_of_week')

      if (error) throw error
      setSchedules(data || [])
    } catch (err) {
      console.error('Error fetching schedules:', err)
    } finally {
      setLoading(false)
    }
  }, [organizationId, targetUserId])

  useEffect(() => {
    fetchSchedules()
  }, [fetchSchedules])

  const setSchedule = useCallback(async (
    dayOfWeek: number,
    startTime: string,
    endTime: string,
    branchId?: string
  ): Promise<boolean> => {
    if (!organizationId || !targetUserId) return false

    try {
      const { error } = await supabase
        .from('employee_schedules')
        .upsert({
          organization_id: organizationId,
          user_id: targetUserId,
          branch_id: branchId || null,
          day_of_week: dayOfWeek,
          start_time: startTime,
          end_time: endTime,
          is_active: true
        }, {
          onConflict: 'user_id,day_of_week,branch_id'
        })

      if (error) throw error
      await fetchSchedules()
      return true
    } catch (err) {
      console.error('Error setting schedule:', err)
      return false
    }
  }, [organizationId, targetUserId, fetchSchedules])

  const deleteSchedule = useCallback(async (scheduleId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('employee_schedules')
        .delete()
        .eq('id', scheduleId)

      if (error) throw error
      await fetchSchedules()
      return true
    } catch (err) {
      console.error('Error deleting schedule:', err)
      return false
    }
  }, [fetchSchedules])

  const isWorkingDay = useCallback((dayOfWeek: number): boolean => {
    return schedules.some(s => s.day_of_week === dayOfWeek && s.is_active)
  }, [schedules])

  const getScheduleForDay = useCallback((dayOfWeek: number): EmployeeSchedule | undefined => {
    return schedules.find(s => s.day_of_week === dayOfWeek && s.is_active)
  }, [schedules])

  return {
    schedules,
    setSchedule,
    deleteSchedule,
    fetchSchedules,
    isWorkingDay,
    getScheduleForDay,
    loading,
    DAY_NAMES
  }
}
