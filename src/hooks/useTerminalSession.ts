import { useEffect, useState, useRef, useCallback } from 'react'
import { supabase } from '@/config/supabase'
import { useAppStore } from '@/store/appStore'
import { usePlanLimits } from '@/hooks/usePlanLimits'

export interface TerminalInfo {
  terminalId: string
  terminalName: string
  userId: string
  userName: string
  joinedAt: number
}

export function useTerminalSession() {
  const { currentUser } = useAppStore()
  const { planLimits, planName } = usePlanLimits()
  const [isLocked, setIsLocked] = useState(false)
  const [activeTerminals, setActiveTerminals] = useState<TerminalInfo[]>([])
  const [competingTerminal, setCompetingTerminal] = useState<TerminalInfo | null>(null)
  
  // Terminal ID persistente en este dispositivo/navegador
  const terminalIdRef = useRef<string>('')
  const terminalNameRef = useRef<string>('')

  if (!terminalIdRef.current && typeof window !== 'undefined') {
    let tid = localStorage.getItem('reisbloc_terminal_id')
    if (!tid) {
      tid = 'term_' + Math.random().toString(36).substring(2, 9)
      localStorage.setItem('reisbloc_terminal_id', tid)
    }
    terminalIdRef.current = tid

    let tname = localStorage.getItem('reisbloc_terminal_name')
    if (!tname) {
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
      tname = isMobile ? 'Caja Móvil' : 'Caja Mostrador'
      localStorage.setItem('reisbloc_terminal_name', tname)
    }
    terminalNameRef.current = tname
  }

  const maxRegisters = planLimits.registers ?? 1
  const orgId = currentUser?.organizationId

  const evaluateTerminals = useCallback((terminals: TerminalInfo[]) => {
    // Si el plan es ilimitado (-1), nunca bloquear
    if (maxRegisters === -1) {
      setIsLocked(false)
      setCompetingTerminal(null)
      return
    }

    // Filtrar duplicados por terminalId
    const uniqueTerminals = Array.from(
      new Map(terminals.map(t => [t.terminalId, t])).values()
    ).sort((a, b) => a.joinedAt - b.joinedAt) // Los más antiguos tienen prioridad

    setActiveTerminals(uniqueTerminals)

    const myId = terminalIdRef.current
    const myIndex = uniqueTerminals.findIndex(t => t.terminalId === myId)

    // Si hay más terminales que las permitidas por el plan:
    if (uniqueTerminals.length > maxRegisters) {
      // Si este terminal no está dentro de los permitidos por antigüedad
      if (myIndex >= maxRegisters) {
        const blocker = uniqueTerminals[0]
        setCompetingTerminal(blocker)
        setIsLocked(true)
        return
      }
    }

    setIsLocked(false)
    setCompetingTerminal(null)
  }, [maxRegisters])

  useEffect(() => {
    if (!orgId || !currentUser) return

    const myTerminalInfo: TerminalInfo = {
      terminalId: terminalIdRef.current,
      terminalName: terminalNameRef.current,
      userId: currentUser.id,
      userName: currentUser.name || currentUser.username || 'Cajero',
      joinedAt: Date.now()
    }

    const channelName = `pos_terminals:${orgId}`
    const channel = supabase.channel(channelName, {
      config: {
        presence: {
          key: terminalIdRef.current
        }
      }
    })

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        const rawList: TerminalInfo[] = []
        
        Object.values(state).forEach((presences: any) => {
          if (Array.isArray(presences)) {
            presences.forEach(p => {
              if (p.terminalId) {
                rawList.push({
                  terminalId: p.terminalId,
                  terminalName: p.terminalName || 'Caja Desconocida',
                  userId: p.userId,
                  userName: p.userName || 'Cajero',
                  joinedAt: p.joinedAt || Date.now()
                })
              }
            })
          }
        })

        evaluateTerminals(rawList)
      })
      .on('broadcast', { event: 'claim_terminal' }, (payload: any) => {
        // Si otra terminal reclamó forzadamente el turno
        if (payload?.payload?.claimedBy && payload.payload.claimedBy !== terminalIdRef.current) {
          if (maxRegisters === 1) {
            setIsLocked(true)
            setCompetingTerminal({
              terminalId: payload.payload.claimedBy,
              terminalName: payload.payload.terminalName || 'Otra Caja',
              userId: payload.payload.userId,
              userName: payload.payload.userName || 'Cajero',
              joinedAt: Date.now()
            })
          }
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track(myTerminalInfo)
        }
      })

    return () => {
      channel.unsubscribe()
    }
  }, [orgId, currentUser, evaluateTerminals, maxRegisters])

  // Función para reclamar control en esta máquina
  const claimControl = useCallback(async () => {
    if (!orgId || !currentUser) return

    const myTerminalInfo: TerminalInfo = {
      terminalId: terminalIdRef.current,
      terminalName: terminalNameRef.current,
      userId: currentUser.id,
      userName: currentUser.name || currentUser.username || 'Cajero',
      joinedAt: 1 // Prioridad máxima al forzar
    }

    const channelName = `pos_terminals:${orgId}`
    const channel = supabase.channel(channelName)
    await channel.send({
      type: 'broadcast',
      event: 'claim_terminal',
      payload: {
        claimedBy: terminalIdRef.current,
        terminalName: terminalNameRef.current,
        userId: currentUser.id,
        userName: currentUser.name || currentUser.username
      }
    })

    setIsLocked(false)
    setCompetingTerminal(null)
  }, [orgId, currentUser])

  return {
    isLocked,
    activeTerminals,
    competingTerminal,
    terminalId: terminalIdRef.current,
    terminalName: terminalNameRef.current,
    maxRegisters,
    planName,
    claimControl
  }
}
