/**
 * Reisbloc POS - Sistema POS Profesional
 * Copyright (C) 2026 Reisbloc POS
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 */

// Servicio Supabase para operaciones de base de datos (PostgreSQL)
import { supabase } from '@/config/supabase'
import logger from '@/utils/logger'
import { withOrg } from '@/utils/queryHelpers'
import { getStoredToken } from './jwtService'
import { offlineStorage } from './offlineStorage'
import { syncService } from './syncService'
import { useAppStore } from '@/store/appStore'
import {
  User,
  Device,
  Product,
  Order,
  Sale,
  DailyClose,
  AuditLog,
} from '@/types/index'

class SupabaseService {
  // Reintento simple para operaciones de red propensas a fallos transitorios
  private async withRetry<T>(operation: () => Promise<T>, retries = 2, delayMs = 200): Promise<T> {
    try {
      return await operation()
    } catch (error) {
      if (retries <= 0) throw error
      await new Promise(resolve => setTimeout(resolve, delayMs))
      return this.withRetry(operation, retries - 1, delayMs * 2)
    }
  }

  // Helper para obtener el ID de organización actual
  private getCurrentOrgId(): string {
    // 1. Intentar obtener del store global en memoria (siempre fresco)
    try {
      const storeState = useAppStore.getState()
      if (storeState?.currentUser?.organizationId) {
        return storeState.currentUser.organizationId
      }
    } catch (e) {}

    // 2. Intentar obtener de los datos del token en localStorage
    const token = getStoredToken()
    if (token && token.organizationId) {
      return token.organizationId
    }
    logger.warn('supabase', '⚠️ No organization ID found in token or store')
    // Fallback: Si no hay token (raro en operaciones autenticadas), intentar obtener de sesión
    // Por ahora retornamos string vacío que causará error SQL si es obligatorio, 
    // lo cual es correcto para seguridad.
    return ''
  }

  // ==================== USERS ====================

  async getUserByUsername(username: string): Promise<User | null> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('name', username) // Supabase uses 'name' column
        .maybeSingle()

      if (error) throw error
      // Map Supabase fields to TypeScript User type
      const user = data ? { ...data, username: data.name } : null
      return user as User
    } catch (error) {
      logger.error('supabase', 'Error getting user', error as any)
      return null
    }
  }

  async getUserById(userId: string): Promise<User | null> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle()

      if (error) throw error
      // Map Supabase fields to TypeScript User type
      const user = data ? {
        ...data,
        username: data.name,
        organizationId: data.organization_id // ✅ MAPEO CRÍTICO
      } : null
      return user as User
    } catch (error) {
      logger.error('supabase', 'Error getting user by ID', error as any)
      return null
    }
  }

  async getAllUsers(): Promise<User[]> {
    return this.withRetry(async () => {
      // 📡 OFFLINE FIRST: Si no hay internet, devolver caché rápido
      if (!navigator.onLine) {
        console.log('📴 [Offline] Retornando usuarios de IndexedDB')
        return await offlineStorage.getUsers()
      }

      console.log('🔍 [Supabase] Obteniendo usuarios de la nube...')

      const { data, error } = await withOrg(
        supabase.from('users').select('*'),
        this.getCurrentOrgId()
      )
        .eq('active', true)
        .order('name', { ascending: true })

      if (error) throw error

      const users = (data || []).map((user: any) => ({
        ...user,
        username: user.name,
        organizationId: user.organization_id,
        createdAt: new Date(user.created_at)
      })) as User[]

      // 💾 Cachear silenciosamente en disco
      offlineStorage.saveUsers(users)
      return users
    }).catch(async error => {
      logger.warn('supabase', 'Fallo de red al obtener usuarios. Usando caché offline.', error)
      return await offlineStorage.getUsers()
    })
  }

  async createUser(user: Omit<User, 'id'>): Promise<string> {
    try {
      // Map TypeScript User fields to Supabase schema
      const { username, ...rest } = user as any
      const supabaseUser = { ...rest, name: username, username: username, organization_id: this.getCurrentOrgId() }

      if (!supabaseUser.organization_id) throw new Error('Organization ID required to create user')

      // Usar RPC segura para evitar problemas de RLS circular
      const { data, error } = await supabase.rpc('create_user_secure', {
        p_name: supabaseUser.name,
        p_username: supabaseUser.username,
        p_pin: supabaseUser.pin,
        p_role: supabaseUser.role,
        p_organization_id: supabaseUser.organization_id
      })

      if (error) throw error
      return data // RPC devuelve el UUID directamente
    } catch (error) {
      logger.error('supabase', 'Error creating user', error as any)
      throw error
    }
  }

  async inviteUser(email: string, role: string): Promise<{ success: boolean; message?: string; devLink?: string }> {
    try {
      // 1. Intentar obtener el token de acceso fresco directamente del cliente Supabase
      const { data: { session } } = await supabase.auth.getSession()
      let accessToken = session?.access_token

      // 2. Si no hay sesión activa en Supabase, hacer fallback al localStorage
      if (!accessToken) {
        const token = getStoredToken()
        if (token && token.accessToken) {
          accessToken = token.accessToken
        }
      }

      if (!accessToken) {
        throw new Error('No estás autenticado para realizar esta acción.')
      }

      const { data, error } = await supabase.functions.invoke('send-invitation', {
        body: { email, role },
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      })

      if (error) throw error
      return {
        success: true,
        message: data.message,
        devLink: data.dev_invite_link
      }
    } catch (error: any) {
      logger.error('supabase', 'Error inviting user', error as any)
      return { success: false, message: error.message }
    }
  }

  // ==================== AUDIT LOGS ====================

  async createAuditLog(log: Omit<AuditLog, 'id' | 'timestamp'>): Promise<void> {
    try {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

      // Validar user_id
      let finalUserId = log.userId
      if (!uuidRegex.test(finalUserId)) {
        const storeUser = useAppStore.getState().currentUser?.id
        if (storeUser && uuidRegex.test(storeUser)) {
          finalUserId = storeUser
        } else {
          finalUserId = '00000000-0000-0000-0000-000000000000'
        }
      }

      // Validar entity_id
      let finalEntityId = log.entityId
      let finalDetails = log.details || ''
      if (finalEntityId && !uuidRegex.test(finalEntityId)) {
        finalDetails = `${finalDetails ? finalDetails + ' | ' : ''}Original Entity ID: ${finalEntityId}`
        finalEntityId = undefined as any
      }

      const { error } = await supabase
        .from('audit_logs')
        .insert({
          user_id: finalUserId,
          action: log.action,
          entity_type: log.entityType,
          entity_id: finalEntityId || null,
          old_value: log.oldValue,
          new_value: log.newValue,
          ip_address: log.ipAddress,
          device_id: log.deviceId,
          details: finalDetails || null,
          location: log.location,
          session_type: log.sessionType,
          organization_id: this.getCurrentOrgId()
        })

      if (error) throw error
    } catch (error) {
      logger.error('supabase', 'Error creating audit log', error as any)
    }
  }

  async getAuditLogs(limit = 100): Promise<AuditLog[]> {
    return this.withRetry(async () => {
      const { data, error } = await withOrg(
        supabase.from('audit_logs').select('*'),
        this.getCurrentOrgId()
      )
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) throw error
      return (data || []).map((log: any) => ({
        id: log.id,
        userId: log.user_id,
        action: log.action,
        entityType: log.entity_type,
        entityId: log.entity_id,
        oldValue: log.old_value,
        newValue: log.new_value,
        ipAddress: log.ip_address,
        deviceId: log.device_id,
        location: log.location,
        sessionType: log.session_type,
        timestamp: new Date(log.created_at)
      })) as AuditLog[]
    }).catch(error => {
      logger.error('supabase', 'Error getting audit logs', error as any)
      return []
    })
  }

  async updateUser(userId: string, updates: Partial<User>): Promise<void> {
    try {
      // Map TypeScript User fields to Supabase schema
      const { username, avatarUrl, ...rest } = updates as any
      const supabaseUpdates = username ? { ...rest, name: username, username: username } : rest

      // Forzar mapeo de avatarUrl -> avatar_url
      if (avatarUrl || updates.avatar_url) {
        supabaseUpdates.avatar_url = avatarUrl || updates.avatar_url
        delete supabaseUpdates.avatarUrl
      }

      const { error } = await supabase
        .from('users')
        .update(supabaseUpdates)
        .eq('id', userId)

      if (error) throw error
    } catch (error) {
      logger.error('supabase', 'Error updating user', error as any)
      throw error
    }
  }

  async deleteUser(userId: string): Promise<void> {
    try {
      // Soft delete - marcar como inactivo
      const { error } = await supabase
        .from('users')
        .update({ active: false })
        .eq('id', userId)
        .eq('organization_id', this.getCurrentOrgId()) // FIX: Requerido por RLS

      if (error) throw error
    } catch (error) {
      logger.error('supabase', 'Error deleting user', error as any)
      throw error
    }
  }

  // ==================== DEVICES ====================

  // Helper público para mapear snake_case (DB) a camelCase (Frontend)
  private mapDeviceFromDB(d: any): Device {
    return {
      id: d.id,
      userId: d.user_id,
      userName: d.userInfo?.username || d.userInfo?.name || 'Desconocido',
      macAddress: d.mac_address,
      deviceName: d.device_name,
      network: d.network || d.network_type,
      os: d.os,
      browser: d.browser,
      deviceType: d.device_type,
      fingerprint: d.fingerprint,
      registeredAt: new Date((d as any).registered_at || (d as any).created_at),
      lastAccess: new Date((d as any).last_access || (d as any).last_seen),
      isApproved: d.status === 'approved' || d.is_approved === true,
      isRejected: d.status === 'rejected',
    } as Device
  }

  async getAllDevices(): Promise<Device[]> {
    try {
      const { data, error } = await withOrg(
        supabase.from('devices').select('*, userInfo:users!devices_user_id_fkey(username, name)'),
        this.getCurrentOrgId()
      )

      if (error) throw error

      console.log('🔍 [Supabase] Devices raw:', data)

      // Mapear snake_case a camelCase
      return (data || []).map((d: any) => this.mapDeviceFromDB(d))
    } catch (error) {
      logger.error('supabase', 'Error getting all devices', error as any)
      return []
    }
  }

  async registerDevice(device: Omit<Device, 'id'>): Promise<string> {
    try {
      // Mapear camelCase a snake_case para PostgreSQL
      const deviceData = {
        user_id: device.userId,
        mac_address: device.macAddress,
        device_name: device.deviceName,
        device_type: device.deviceType,
        network: device.network,
        network_type: device.network,
        os: device.os,
        browser: device.browser,
        fingerprint: device.fingerprint,
        status: 'pending',
        registered_at: device.registeredAt?.toISOString() || new Date().toISOString(),
        last_access: device.lastAccess?.toISOString() || new Date().toISOString(),
        last_seen: new Date().toISOString(),
        organization_id: this.getCurrentOrgId() // Importante para admin manual
      }

      // Usar UPSERT para evitar errores de duplicado
      const { data, error } = await supabase
        .from('devices')
        .upsert([deviceData], { onConflict: 'mac_address' })
        .select('id')
        .single()

      if (error) throw error
      return data.id
    } catch (error) {
      logger.error('supabase', 'Error registering device', error as any)
      throw error
    }
  }

  async getDevicesByUser(userId: string): Promise<Device[]> {
    try {
      const { data, error } = await supabase
        .from('devices')
        .select('*')
        .eq('user_id', userId)
        .eq('organization_id', this.getCurrentOrgId())

      if (error) throw error

      // Mapear snake_case a camelCase
      return (data || []).map(d => this.mapDeviceFromDB(d))
    } catch (error) {
      logger.error('supabase', 'Error getting devices', error as any)
      return []
    }
  }

  async getDeviceByFingerprint(fingerprint: string, orgId?: string): Promise<Device | null> {
    try {
      const targetOrgId = orgId || this.getCurrentOrgId()
      const { data, error } = await supabase
        .from('devices')
        .select('*, userInfo:users!devices_user_id_fkey(username, name)')
        .eq('fingerprint', fingerprint)
        .eq('organization_id', targetOrgId)
        .maybeSingle()

      if (error) throw error
      if (!data) return null

      return this.mapDeviceFromDB(data)
    } catch (error) {
      logger.error('supabase', 'Error getting device by fingerprint', error as any)
      return null
    }
  }

  async getDeviceById(deviceId: string): Promise<Device | null> {
    try {
      const { data, error } = await supabase
        .from('devices')
        .select('*')
        .eq('id', deviceId)
        .single()

      if (error) throw error
      return this.mapDeviceFromDB(data)
    } catch (error) {
      logger.error('supabase', 'Error getting device', error as any)
      return null
    }
  }

  async updateDevice(deviceId: string, updates: Partial<Device>): Promise<void> {
    try {
      // Mapear camelCase a snake_case
      const updateData: any = {}
      if (updates.userId) updateData.user_id = updates.userId
      if (updates.macAddress) updateData.mac_address = updates.macAddress
      if (updates.deviceName) updateData.device_name = updates.deviceName
      if (updates.network) updateData.network = updates.network
      if (updates.os) updateData.os = updates.os
      if (updates.browser) updateData.browser = updates.browser
      if (updates.deviceType) updateData.device_type = updates.deviceType
      if (updates.fingerprint) updateData.fingerprint = updates.fingerprint
      if (updates.lastAccess) updateData.last_access = updates.lastAccess.toISOString()

      updateData.last_seen = new Date().toISOString()

      const { error } = await supabase
        .from('devices')
        .update(updateData)
        .eq('id', deviceId)

      if (error) throw error
    } catch (error) {
      logger.error('supabase', 'Error updating device', error as any)
      throw error
    }
  }

  async approveDevice(deviceId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('devices')
        .update({
          status: 'approved',
          approved_at: new Date().toISOString()
        })
        .eq('id', deviceId)

      if (error) throw error
    } catch (error) {
      logger.error('supabase', 'Error approving device', error as any)
      throw error
    }
  }

  async revokeDevice(deviceId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('devices')
        .update({
          status: 'rejected'
        })
        .eq('id', deviceId)

      if (error) throw error
    } catch (error) {
      logger.error('supabase', 'Error revoking device', error as any)
      throw error
    }
  }

  async deleteDevice(deviceId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('devices')
        .delete()
        .eq('id', deviceId)

      if (error) throw error
    } catch (error) {
      logger.error('supabase', 'Error deleting device', error as any)
      throw error
    }
  }

  // ==================== PRODUCTS ====================

  async getProducts(): Promise<Product[]> {
    return this.getAllProducts()
  }

  async getAllProducts(): Promise<Product[]> {
    return this.withRetry(async () => {
      // 📡 OFFLINE FIRST: Si no hay internet, devolver caché rápido
      if (!navigator.onLine) {
        console.log('📴 [Offline] Retornando productos de IndexedDB')
        return await offlineStorage.getProducts()
      }

      console.log('🔍 [Supabase] Obteniendo productos de la red...')
      const { data, error } = await withOrg(
        supabase.from('products').select('*'),
        this.getCurrentOrgId()
      )
        .order('category', { ascending: true })
        .order('name', { ascending: true })

      if (error) throw error

      // Filter in memory to show active/available products
      const products = (data || []).map((p: any) => ({
        ...p,
        active: p.available,
        currentStock: p.current_stock,
        minimumStock: p.minimum_stock,
        hasInventory: p.has_inventory,
        createdAt: new Date(p.created_at)
      })) as Product[]

      // 💾 Guardar una copia fresca para uso offline
      offlineStorage.saveProducts(products)
      return products
    }).catch(async error => {
      logger.warn('supabase', 'Fallo al descargar productos. Usando caché offline.', error)
      return await offlineStorage.getProducts()
    })
  }

  async getProductById(productId: string): Promise<Product | null> {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .single()

      if (error) throw error
      return data as Product
    } catch (error) {
      logger.error('supabase', 'Error getting product', error as any)
      return null
    }
  }

  async createProduct(product: Omit<Product, 'id'>): Promise<string> {
    try {
      const payload: any = { ...product }
      // Map active to available for Supabase schema
      if ('active' in product) {
        payload.available = product.active
        delete payload.active
      }
      // Map inventory fields to snake_case
      if ('currentStock' in product) {
        payload.current_stock = product.currentStock
        delete payload.currentStock
      }
      if ('hasInventory' in product) {
        payload.has_inventory = product.hasInventory
        delete payload.hasInventory
      }
      if ('minimumStock' in product) {
        payload.minimum_stock = product.minimumStock
        delete payload.minimumStock
      }

      // Ensure barcode, sku, image are included (they are already snake_case or match)
      // Remove any timestamp fields if present in incoming object
      delete payload.id
      delete payload.createdAt
      delete payload.updated_at
      delete payload.created_at

      payload.organization_id = this.getCurrentOrgId()

      const { data, error } = await supabase
        .from('products')
        .insert([payload])
        .select('id')
        .single()

      if (error) throw error
      return data.id
    } catch (error) {
      logger.error('supabase', 'Error creating product', error as any)
      throw error
    }
  }

  async updateProduct(productId: string, updates: Partial<Product>): Promise<void> {
    try {
      const payload: any = { ...updates }
      // Map active to available for Supabase schema
      if ('active' in updates) {
        payload.available = updates.active
        delete payload.active
      }
      // Map inventory fields to snake_case
      if ('currentStock' in updates) {
        payload.current_stock = updates.currentStock
        delete payload.currentStock
      }
      if ('hasInventory' in updates) {
        payload.has_inventory = updates.hasInventory
        delete payload.hasInventory
      }
      if ('minimumStock' in updates) {
        payload.minimum_stock = updates.minimumStock
        delete payload.minimumStock
      }

      // Supabase managed timestamps & frontend-only ids
      delete payload.id
      delete payload.createdAt
      delete payload.updated_at
      delete payload.created_at
      if ('updatedAt' in payload) delete payload.updatedAt

      const { error } = await supabase
        .from('products')
        .update(payload)
        .eq('id', productId)

      if (error) throw error
    } catch (error) {
      logger.error('supabase', 'Error updating product', error as any)
      throw error
    }
  }

  async updateProductStockBatch(updates: { productId: string; quantity: number }[]): Promise<void> {
    if (!updates.length) return

    try {
      // Usar RPC para actualización atómica y eficiente (definida en DB)
      const { error } = await supabase.rpc('update_stock_batch', { updates })

      if (error) throw error
    } catch (error) {
      logger.error('supabase', 'Error updating stock batch', error as any)
    }
  }

  async deleteProduct(productId: string): Promise<void> {
    try {
      // Soft delete - marcar como no disponible
      const { error } = await supabase
        .from('products')
        .update({ available: false })
        .eq('id', productId)

      if (error) throw error
    } catch (error) {
      logger.error('supabase', 'Error deleting product', error as any)
      throw error
    }
  }

  // ==================== ORDERS ====================

  private normalizeOrderStatus(status: any): string | undefined {
    if (!status) return undefined
    const allowed = ['pending', 'sent', 'preparing', 'ready', 'served', 'completed', 'cancelled', 'paid', 'open']
    return allowed.includes(status) ? status : 'pending'
  }

  private normalizeOrderItems(items: any[]): any[] {
    if (!Array.isArray(items)) return []
    return items.map(item => ({
      ...item,
      addedAt: item.addedAt instanceof Date ? item.addedAt.toISOString() : item.addedAt,
      deletedAt: item.deletedAt instanceof Date ? item.deletedAt.toISOString() : item.deletedAt,
    }))
  }

  private buildOrderPayload(order: Partial<Order> & Record<string, any>) {
    const payload: any = { ...order }

    // Validar tableNumber si está presente (debe ser &gt; 0)
    if ('tableNumber' in order) {
      const tableNum = order.tableNumber
      if (tableNum === null || tableNum === undefined || tableNum <= 0) {
        throw new Error(`Invalid table number: ${tableNum}. Must be greater than 0.`)
      }
      payload.table_number = tableNum
    }
    if ('waiterId' in order) payload.waiter_id = (order as any).waiterId
    if ('createdBy' in order) payload.created_by = (order as any).createdBy
    if ('status' in order) payload.status = this.normalizeOrderStatus((order as any).status)

    if ('createdAt' in order) {
      payload.created_at = order.createdAt instanceof Date
        ? order.createdAt.toISOString()
        : order.createdAt
    }

    if ('sentToKitchenAt' in order) {
      payload.sent_to_kitchen_at = order.sentToKitchenAt instanceof Date
        ? order.sentToKitchenAt.toISOString()
        : order.sentToKitchenAt
    }

    if ('items' in order) {
      payload.items = this.normalizeOrderItems(order.items as any[])
    }

    if ('tipAmount' in order) payload.tip_amount = (order as any).tipAmount ?? 0
    if ('tipPercentage' in order) payload.tip_percentage = (order as any).tipPercentage ?? 0
    if ('paymentMethod' in order) payload.payment_method = (order as any).paymentMethod

    const calculatedSubtotal = Array.isArray(payload.items)
      ? payload.items.reduce((sum: number, item: any) => sum + (item.unitPrice || 0) * (item.quantity || 0), 0)
      : 0

    if (!('subtotal' in payload)) payload.subtotal = (order as any).subtotal ?? calculatedSubtotal
    if (!('total' in payload)) payload.total = (order as any).total ?? (payload.subtotal ?? calculatedSubtotal) + ((order as any).tipAmount ?? 0)

    delete payload.tableNumber
    delete payload.waiterId
    delete payload.createdBy
    delete payload.createdAt
    delete payload.sentToKitchenAt
    delete payload.tipAmount
    delete payload.tipPercentage
    delete payload.paymentMethod
    delete payload.isCourtesy
    delete payload.authorizedBy
    delete payload.closedAt
    delete payload.closedBy
    delete payload.lastEditedAt
    delete payload.lastEditedBy
    delete payload.cancelledAt
    delete payload.cancelledBy
    delete payload.cancelReason

    return payload
  }

  async getOrdersByStatus(status: Order['status']): Promise<Order[]> {
    return this.withRetry(async () => {
      const { data, error } = await withOrg(
        supabase.from('orders').select('*'),
        this.getCurrentOrgId()
      )
        .eq('status', status)
        .order('created_at', { ascending: false })

      if (error) throw error
      // Normalizar table_number para evitar "Mesa 0"
      return (data || []).map((o: any) => ({
        ...o,
        tableNumber: o.table_number ?? o.tableNumber ?? 0,
      })) as Order[]
    }).catch(error => {
      logger.error('supabase', 'Error getting orders by status', error as any)
      return []
    })
  }

  async getActiveOrders(): Promise<Order[]> {
    return this.withRetry(async () => {
      logger.info('supabase', '🔍 Getting active orders...')
      const { data, error } = await withOrg(
        supabase.from('orders').select('*'),
        this.getCurrentOrgId()
      )
        .in('status', ['sent', 'preparing', 'ready', 'served'])
        .order('created_at', { ascending: true })

      if (error) {
        logger.error('supabase', 'Error in getActiveOrders query', error)
        throw error
      }

      const normalized = (data || []).map((o: any) => ({
        ...o,
        tableNumber: o.table_number ?? o.tableNumber ?? 0,
      }))

      logger.info('supabase', `✅ Found ${normalized.length} active orders`)
      // Log table_number para cada orden
      if (normalized.length > 0) {
        const tableNumbers = normalized.map((o: any) => ({ id: o.id, table_number: o.tableNumber }))
        logger.info('supabase', `📊 Order table numbers:`, tableNumbers)
      }
      return normalized as Order[]
    }).catch(error => {
      logger.error('supabase', 'Error getting active orders', error as any)
      return []
    })
  }

  async getOrderById(orderId: string): Promise<Order | null> {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single()

      if (error) throw error
      return data as Order
    } catch (error) {
      logger.error('supabase', 'Error getting order', error as any)
      return null
    }
  }

  async createOrder(order: Omit<Order, 'id'>): Promise<string> {
    try {
      const payload = this.buildOrderPayload({ ...order, createdAt: (order as any).createdAt || new Date() })
      payload.organization_id = this.getCurrentOrgId()

      if (!payload.organization_id) {
        logger.error('supabase', '❌ Intento de crear orden sin Organization ID')
        throw new Error('No se pudo identificar la organización. Por favor inicie sesión nuevamente.')
      }

      // 📡 OFFLINE FIRST: Si no hay internet, despachar a IndexedDB
      if (!navigator.onLine) {
        logger.warn('supabase', '⚠️ Sin conexión: Guardando orden de retail en la cola local.')
        const fauxId = crypto.randomUUID()
        await syncService.queueOperation('CREATE_ORDER', {
          order: { ...payload, id: fauxId },
          items: order.items // we pass items to let the executer know
        })
        return fauxId
      }

      const { data, error } = await supabase
        .from('orders')
        .insert([payload])
        .select('id')
        .single()

      if (error) throw error
      return data.id
    } catch (error) {
      logger.error('supabase', 'Error creating order', error as any)
      throw error
    }
  }

  async updateOrder(orderId: string, updates: Partial<Order>): Promise<void> {
    try {
      const payload = this.buildOrderPayload(updates)

      const { error } = await supabase.from('orders').update(payload).eq('id', orderId)

      if (error) throw error
    } catch (error) {
      logger.error('supabase', 'Error updating order', error as any)
      throw error
    }
  }

  async updateOrderStatus(orderId: string, status: Order['status']): Promise<void> {
    logger.info('supabase', `📝 Updating order ${orderId} status to: ${status}`)
    return this.updateOrder(orderId, { status })
  }

  async cancelOrder(orderId: string, reason: string, userId: string): Promise<void> {
    try {
      // 1. Update status to cancelled
      const { error } = await supabase
        .from('orders')
        .update({
          status: 'cancelled',
          notes: reason ? `Cancelado: ${reason}` : 'Cancelado por el usuario'
        })
        .eq('id', orderId)

      if (error) throw error

      // 2. Audit Log
      await this.createAuditLog({
        userId: userId,
        action: 'ORDER_CANCELLED',
        entityType: 'ORDER',
        entityId: orderId,
        newValue: { reason },
        ipAddress: 'client-terminal'
      })

      logger.info('supabase', `🛑 Order ${orderId} cancelled. Reason: ${reason}`)
    } catch (error) {
      logger.error('supabase', 'Error cancelling order', error as any)
      throw error
    }
  }

  async deleteOrder(orderId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('orders')
        .delete()
        .eq('id', orderId)

      if (error) throw error
    } catch (error) {
      logger.error('supabase', 'Error deleting order', error as any)
      throw error
    }
  }

  // ==================== SALES ====================

  async getTodaySales(): Promise<Sale[]> {
    try {
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const { data, error } = await withOrg(
        supabase.from('sales').select('*'),
        this.getCurrentOrgId()
      )
        .gte('created_at', today.toISOString())
        .order('created_at', { ascending: false })

      if (error) throw error

      // Normalizar campos de DB (snake_case) a App (camelCase)
      return (data || []).map((o: any) => ({
        ...o,
        tableNumber: o.table_number ?? o.tableNumber ?? 0,
        paymentMethod: o.payment_method || o.paymentMethod,
        saleBy: o.waiter_id || o.saleBy,
        tip: o.tip_amount || o.tip
      })) as Sale[]
    } catch (error) {
      logger.error('supabase', 'Error getting today sales', error as any)
      return []
    }
  }

  async getSalesByDateRange(startDate: Date, endDate: Date): Promise<Sale[]> {
    try {
      // 1. Fetch legacy sales
      const { data: legacySales, error: legacyError } = await withOrg(
        supabase.from('sales').select('*'),
        this.getCurrentOrgId()
      )
        .gte('created_at', startDate.toISOString())
        .lt('created_at', endDate.toISOString())

      if (legacyError) throw legacyError

      // 2. Fetch retail sales with items included (joined)
      const { data: retailSales, error: retailError } = await withOrg(
        supabase.from('retail_sales').select('*, items:retail_sale_items(*)'),
        this.getCurrentOrgId()
      )
        .gte('created_at', startDate.toISOString())
        .lt('created_at', endDate.toISOString())

      if (retailError) throw retailError

      // 3. Normalize and merge
      const normalizedLegacy = (legacySales || []).map((o: any) => ({
        ...o,
        tableNumber: o.table_number ?? o.tableNumber ?? 0,
        paymentMethod: o.payment_method || o.paymentMethod,
        saleBy: o.waiter_id || o.saleBy,
        tip: o.tip_amount || o.tip
      }))

      const normalizedRetail = (retailSales || []).map((o: any) => ({
        ...o,
        tableNumber: o.table_number ?? 0,
        paymentMethod: o.payment_method,
        saleBy: o.sale_by,
        tip: o.tip,
        // Map retail items to match the expected structure
        items: (o.items || []).map((i: any) => ({
          ...i,
          productId: i.product_id,
          productName: i.product_name,
          unitPrice: Number(i.unit_price),
          quantity: Number(i.quantity)
        })),
        created_at: o.created_at
      }))

      return [...normalizedLegacy, ...normalizedRetail].sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ) as Sale[]
    } catch (error) {
      logger.error('supabase', 'Error getting sales by date range', error as any)
      return []
    }
  }

  async createSale(sale: Omit<Sale, 'id'>): Promise<string> {
    try {
      // Validar tableNumber
      if (!sale.tableNumber || sale.tableNumber <= 0) {
        throw new Error('Table number must be greater than 0')
      }

      // Map TypeScript Sale to Supabase schema with type validation
      const payload: any = {
        order_id: (sale as any).orderIds?.[0] || null,
        waiter_id: (sale as any).saleBy || null,
        table_number: Number(sale.tableNumber),
        items: sale.items || [],
        subtotal: parseFloat(String(sale.subtotal)) || 0,
        tip_amount: parseFloat(String(sale.tip || 0)) || 0,
        tip_percentage: 0,
        tip_source: (sale as any).tipSource || 'cash',
        total: parseFloat(String(sale.total)) || 0,
        payment_method: String(sale.paymentMethod) || 'cash',
        device_id: null,
        organization_id: this.getCurrentOrgId()
      }

      // 📡 OFFLINE FIRST: Guardar venta sin conexión
      if (!navigator.onLine) {
        logger.warn('supabase', '⚠️ Sin conexión: Guardando cierre de Venta en la cola local.')
        const fauxId = crypto.randomUUID()
        await syncService.queueOperation('CLOSE_ORDER', {
          orderId: payload.order_id,
          status: 'closed',
          saleData: payload
        })
        return fauxId
      }

      logger.info('supabase', '💰 Creating sale with payload:', payload)
      logger.info('supabase', '   - order_id:', payload.order_id)
      logger.info('supabase', '   - waiter_id:', payload.waiter_id)
      logger.info('supabase', '   - table_number:', payload.table_number, typeof payload.table_number)
      logger.info('supabase', '   - subtotal:', payload.subtotal, typeof payload.subtotal)
      logger.info('supabase', '   - total:', payload.total, typeof payload.total)
      logger.info('supabase', '   - payment_method:', payload.payment_method)
      logger.info('supabase', '   - items count:', payload.items?.length || 0)

      // DEBUG: Verificar usuario actual antes de insertar
      const { data: { user } } = await supabase.auth.getUser()
      logger.info('supabase', '👤 Current Auth User:', user?.id, 'Role:', user?.role)

      // 🛡️ IDEMPOTENCIA: Verificar si ya existe una venta para esta orden
      if (payload.order_id) {
        const { data: existingSale } = await supabase
          .from('sales')
          .select('id')
          .eq('order_id', payload.order_id)
          .maybeSingle()

        if (existingSale) {
          logger.warn('supabase', '⚠️ Sale already exists for order:', payload.order_id)
          return payload.order_id // Retornar éxito silencioso para evitar errores en UI
        }
      }

      // Use returning: 'minimal' to avoid SELECT and bypass RLS on select
      const { error } = await supabase
        .from('sales')
        .insert([payload])

      if (error) {
        logger.error('supabase', '❌ Supabase insert error:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
          statusCode: (error as any).statusCode
        })
        throw new Error(`Supabase error: ${error.message} ${error.details ? '- ' + error.details : ''} ${error.hint ? '- ' + error.hint : ''}`)
      }

      logger.info('supabase', '✅ Sale created successfully (no returning id)')

      // Registrar en auditoría
      this.createAuditLog({
        userId: (sale as any).saleBy || 'system',
        action: 'SALE_COMPLETED',
        entityType: 'SALE',
        entityId: payload.order_id || 'unknown',
        newValue: { total: payload.total, method: payload.payment_method },
        ipAddress: 'system'
      }).catch(e => logger.error('supabase', 'Audit log failed', e))

      return payload.order_id || ''
    } catch (error: any) {
      logger.error('supabase', '❌ Error creating sale:', error?.message || String(error))
      throw error
    }
  }


  // ==================== CLOSINGS ====================

  async saveClosing(closing: Omit<DailyClose, 'id'>): Promise<string> {
    try {
      const payload = {
        date: closing.date instanceof Date ? closing.date.toISOString().split('T')[0] : closing.date,
        closed_by: closing.closedBy,
        total_sales: parseFloat(String(closing.totalSales)) || 0,
        total_cash: parseFloat(String(closing.totalCash)) || 0,
        total_card: parseFloat(String(closing.totalCard)) || 0,
        total_digital: parseFloat(String(closing.totalDigital)) || 0,
        total_tips: parseFloat(String(closing.totalTips)) || 0,
        orders_count: parseInt(String(closing.ordersCount)) || 0,
        sales_count: parseInt(String(closing.salesCount)) || 0,
        employee_metrics: closing.employeeMetrics || [],
        payment_methods: closing.paymentMethods || {},
        notes: closing.notes || '',
        status: closing.status || 'closed',
        closed_at: new Date().toISOString(),
        organization_id: this.getCurrentOrgId()
      }

      logger.info('supabase', '💾 Saving closing:', payload)

      const { error } = await supabase
        .from('closings')
        .insert([payload])

      if (error) {
        logger.error('supabase', '❌ Error saving closing:', error)
        throw new Error(`Supabase error: ${error.message}`)
      }

      logger.info('supabase', '✅ Closing saved successfully')
      return payload.closed_by || ''
    } catch (error: any) {
      logger.error('supabase', '❌ Error saving closing:', error?.message || String(error))
      throw error
    }
  }

  async getClosings(startDate: Date, endDate: Date): Promise<DailyClose[]> {
    try {
      const { data, error } = await withOrg(
        supabase.from('closings').select('*'),
        this.getCurrentOrgId()
      )
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', endDate.toISOString().split('T')[0])
        .order('date', { ascending: false })

      if (error) throw error

      // Map snake_case to camelCase
      return (data || []).map((closing: any) => ({
        id: closing.id,
        date: closing.date,
        closedBy: closing.closed_by,
        totalSales: parseFloat(closing.total_sales),
        totalCash: parseFloat(closing.total_cash),
        totalCard: parseFloat(closing.total_card),
        totalDigital: parseFloat(closing.total_digital),
        totalTips: parseFloat(closing.total_tips),
        ordersCount: closing.orders_count,
        salesCount: closing.sales_count,
        employeeMetrics: closing.employee_metrics,
        paymentMethods: closing.payment_methods,
        notes: closing.notes,
        status: closing.status,
        closedAt: new Date(closing.closed_at),
      })) as DailyClose[]
    } catch (error) {
      logger.error('supabase', 'Error getting closings', error as any)
      return []
    }
  }

  // ==================== REAL-TIME SUBSCRIPTIONS ====================

  subscribeToOrders(callback: (orders: Order[]) => void) {
    const orgId = this.getCurrentOrgId()
    if (!orgId) {
      logger.warn('supabase', '⚠️ Cannot subscribe to orders: No Organization ID')
      return () => { }
    }

    // Initial load
    this.getActiveOrders().then(callback).catch(err => {
      logger.error('supabase', 'Error loading initial orders', err)
    })

    // Usar ID único para evitar conflictos entre componentes o recargas en React StrictMode
    const channelId = `orders_changes_${Date.now()}_${Math.random().toString(36).slice(2)}`

    const channel = supabase
      .channel(channelId)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `organization_id=eq.${orgId}` // Filtrar por organización
        },
        (payload) => {
          logger.info('supabase', '🔔 Realtime event received:', payload.eventType)
          // Cuando hay cambios, recargar todas las órdenes activas
          this.getActiveOrders().then(callback)
        }
      )
      .subscribe((status) => {
        logger.info('supabase', `📡 Subscription status (${channelId}): ${status}`)
        if (status === 'SUBSCRIBED') {
          logger.info('supabase', '✅ Realtime connected for orders')
        }
        if (status === 'CLOSED') {
          logger.warn('supabase', '⚠️ Realtime connection closed for orders')
        }
        if (status === 'CHANNEL_ERROR') {
          logger.error('supabase', '❌ Realtime channel error for orders')
        }
      })

    return () => {
      logger.info('supabase', `🔌 Unsubscribing from orders (${channelId})`)
      supabase.removeChannel(channel)
    }
  }

  /**
   * Alias para compatibilidad con Kitchen.tsx y Bar.tsx
   * Permite callbacks para success y error
   */
  subscribeToActiveOrders(
    onSuccess: (orders: Order[]) => void,
    onError?: (message: string) => void
  ): (() => void) | undefined {
    try {
      return this.subscribeToOrders(onSuccess)
    } catch (error) {
      onError?.(error instanceof Error ? error.message : 'Unknown error')
      return undefined
    }
  }

  subscribeToOrdersByStatus(
    status: Order['status'],
    onData: (orders: Order[]) => void,
    onError?: (message: string) => void
  ) {
    try {
      const orgId = this.getCurrentOrgId()
      if (!orgId) {
        const msg = 'Cannot subscribe: No Organization ID'
        logger.warn('supabase', msg)
        onError?.(msg)
        return () => { }
      }

      // Primera carga
      this.getOrdersByStatus(status).then(onData).catch(err => onError?.(err?.message || 'Error loading orders'))

      const channelId = `orders_${status}_${Date.now()}_${Math.random().toString(36).slice(2)}`

      const channel = supabase
        .channel(channelId)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'orders',
            filter: `status=eq.${status} AND organization_id=eq.${orgId}`
          },
          () => {
            this.getOrdersByStatus(status).then(onData)
          }
        )
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    } catch (error: any) {
      const message = error?.message || 'Error creando suscripción de órdenes'
      logger.error('supabase', 'Error subscribing to orders by status', message)
      onError?.(message)
      return () => { }
    }
  }

  subscribeToProducts(callback: (products: Product[]) => void) {
    const orgId = this.getCurrentOrgId()
    if (!orgId) return () => { }

    const channelId = `products_changes_${Date.now()}_${Math.random().toString(36).slice(2)}`

    const channel = supabase
      .channel(channelId)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'products',
          filter: `organization_id=eq.${orgId}`
        },
        () => {
          this.getAllProducts().then(callback)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }
  async getSalesMetrics(
    startDate: Date,
    endDate: Date
  ): Promise<{
    totalSales: number
    totalCash: number
    totalTransferencia: number
    totalTarjeta: number
    totalTips: number
    transactionCount: number
    averageTicket: number
  }> {
    try {
      const sales = await this.getSalesByDateRange(startDate, endDate)

      const metrics = sales.reduce(
        (acc: any, sale: any) => {
          const total = Number(sale.total || 0)
          const tip = Number(sale.tip_amount || sale.tip || 0)
          acc.totalSales += total
          acc.totalTips += tip
          acc.transactionCount += 1
          const method = (sale.payment_method || '').toLowerCase()
          if (method === 'cash') acc.totalCash += total
          else if (['transferencia', 'digital', 'transfer'].includes(method)) acc.totalTransferencia += total
          else if (['tarjeta', 'clip', 'card'].includes(method)) acc.totalTarjeta += total
          return acc
        },
        {
          totalSales: 0,
          totalCash: 0,
          totalTransferencia: 0,
          totalTarjeta: 0,
          totalTips: 0,
          transactionCount: 0,
          averageTicket: 0,
        }
      )

      metrics.averageTicket = metrics.transactionCount
        ? metrics.totalSales / metrics.transactionCount
        : 0

      return metrics
    } catch (error) {
      logger.error('supabase', 'Error calculating sales metrics', error as any)
      return {
        totalSales: 0,
        totalCash: 0,
        totalTransferencia: 0,
        totalTarjeta: 0,
        totalTips: 0,
        transactionCount: 0,
        averageTicket: 0,
      }
    }
  }

  async getTopProducts(startDate: Date, endDate: Date, limit: number = 5): Promise<any[]> {
    try {
      const sales = await this.getSalesByDateRange(startDate, endDate)

      const productMap: Record<string, { name: string; qty: number; total: number }> = {}
      sales.forEach((sale: any) => {
        (sale.items || []).forEach((item: any) => {
          const pid = item.productId || item.product_id || item.id
          const pname = item.productName || item.name || 'Producto'
          if (!productMap[pid]) productMap[pid] = { name: pname, qty: 0, total: 0 }
          productMap[pid].qty += Number(item.quantity || 0)
          productMap[pid].total += Number(item.unitPrice || item.price || 0) * Number(item.quantity || 0)
        })
      })

      return Object.values(productMap)
        .sort((a, b) => b.qty - a.qty)
        .slice(0, limit)
        .map((p, i) => ({ id: i, ...p }))
    } catch (error) {
      logger.error('supabase', 'Error getting top products', error as any)
      return []
    }
  }

  async getEmployeeMetrics(startDate: Date, endDate: Date): Promise<any[]> {
    try {
      const sales = await this.getSalesByDateRange(startDate, endDate)
      const users = await this.getAllUsers()

      const byUser: Record<string, any> = {}
      users.forEach((u: any) => {
        byUser[u.id] = {
          userId: u.id,
          userName: (u as any).username || (u as any).name || 'Usuario',
          role: u.role,
          salesCount: 0,
          totalSales: 0,
          totalTips: 0,
          averageTicket: 0,
          averageTip: 0,
        }
      })

      sales.forEach((sale: any) => {
        const uid = sale.waiter_id || sale.saleBy
        if (uid && byUser[uid]) {
          byUser[uid].salesCount += 1
          byUser[uid].totalSales += Number(sale.total || 0)
          byUser[uid].totalTips += Number(sale.tip_amount || sale.tip || 0)
        }
      })

      return Object.values(byUser)
        .filter((m: any) => m.salesCount > 0)
        .map((m: any) => ({
          ...m,
          averageTicket: m.salesCount ? m.totalSales / m.salesCount : 0,
          averageTip: m.salesCount ? m.totalTips / m.salesCount : 0,
        }))
        .sort((a: any, b: any) => b.totalSales - a.totalSales)
    } catch (error) {
      logger.error('supabase', 'Error getting employee metrics', error as any)
      return []
    }
  }

  // ==================== PUBLIC STOREFRONT ====================

  async getOrganizationById(orgId: string): Promise<any | null> {
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('id, name, slug, logo_url, settings, plan, plan_note')
        .eq('id', orgId)
        .eq('active', true)
        .maybeSingle()

      if (error) throw error
      return data
    } catch (error) {
      logger.error('supabase', 'Error getting organization by ID', error as any)
      return null
    }
  }

  async getOrganizationBySlug(slug: string): Promise<any | null> {
    try {
      const normalizedSlug = (slug || '').toLowerCase().trim()

      const { data, error } = await supabase
        .from('organizations')
        .select('id, name, slug, logo_url, settings, plan, plan_note')
        .eq('active', true)

      if (error) throw error
      if (!data || data.length === 0) return null

      const match = data.find((org: any) => {
        const s = (org.slug || '').toLowerCase()
        const n = (org.name || '').toLowerCase()
        const idStr = (org.id || '').toLowerCase()
        return (
          s === normalizedSlug ||
          idStr === normalizedSlug ||
          s === normalizedSlug.replace(/mx$/, '') ||
          n.includes(normalizedSlug)
        )
      })

      return match || data[0] || null
    } catch (error) {
      logger.error('supabase', 'Error getting organization by slug', error as any)
      return null
    }
  }

  async getPublicProducts(orgIdOrSlug?: string): Promise<Product[]> {
    try {
      const isUUID = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)
      const targetSlug = (orgIdOrSlug || 'modamiel').trim()

      // 1. Intentar consultar la función RPC Gold Standard 'get_public_storefront_catalog'
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_public_storefront_catalog', {
        p_slug: targetSlug
      })

      if (rpcError) {
        console.warn('⚠️ [getPublicProducts RPC error]:', rpcError.message, rpcError.details)
      }

      const productsList = Array.isArray(rpcData) ? rpcData : (rpcData ? [rpcData] : [])

      if (!rpcError && productsList.length > 0) {
        return productsList.map((p: any) => ({
          id: p.id,
          name: p.name || 'Producto Sin Nombre',
          price: Number(p.price) || 0,
          category: p.category || 'General',
          description: p.description || '',
          imageUrl: p.image_url || 'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?auto=format&fit=crop&w=600&q=80',
          image: p.image_url || 'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?auto=format&fit=crop&w=600&q=80',
          isAvailable: p.available ?? true,
          active: p.available ?? true,
          stock: Number(p.stock) || 10,
          currentStock: Number(p.stock) || 10,
          minimumStock: 1,
          hasInventory: true,
          packQuantity: Number(p.pack_quantity) || 6,
          packPrice: Number(p.price) || 0,
          sku: p.sku || `MM-${p.id?.slice(0, 6)}`,
          createdAt: new Date(),
          updatedAt: new Date()
        })) as Product[]
      }

      // 2. Fallback seguro: Si orgIdOrSlug es un UUID válido, consultar por organization_id
      let query = supabase.from('products').select('id, name, price, category, current_stock, available, active, created_at, organization_id')
      if (isUUID(targetSlug)) {
        query = query.eq('organization_id', targetSlug)
      } else {
        // Resolver primero el UUID de la organización por slug
        const { data: org } = await supabase.from('organizations').select('id').or(`slug.eq.${targetSlug}`).limit(1).maybeSingle()
        if (org?.id) {
          query = query.eq('organization_id', org.id)
        }
      }
      
      let { data, error } = await query.order('name', { ascending: true })

      if (error || !data || data.length === 0) {
        const fallbackRes = await supabase.from('products').select('id, name, price, category, current_stock, available, active, created_at, organization_id').limit(50)
        data = fallbackRes.data || []
      }

      return (data || []).map((p: any) => {
        return {
          ...p,
          id: p.id,
          name: p.name || 'Producto Sin Nombre',
          price: p.price || 0,
          category: p.category || 'General',
          description: '',
          imageUrl: p.image_url || p.image || 'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?auto=format&fit=crop&w=600&q=80',
          image: p.image_url || p.image || 'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?auto=format&fit=crop&w=600&q=80',
          isAvailable: p.available ?? p.active ?? true,
          active: p.available ?? p.active ?? true,
          stock: p.stock ?? p.current_stock ?? 10,
          currentStock: p.current_stock ?? p.stock ?? 10,
          minimumStock: p.minimum_stock || 1,
          hasInventory: p.has_inventory ?? true,
          packQuantity: p.pack_quantity || 6,
          packPrice: p.price || 0,
          sku: p.sku || `MM-${p.id?.slice(0, 6)}`,
          createdAt: new Date(p.created_at || Date.now()),
          updatedAt: new Date(p.updated_at || Date.now())
        }
      }) as Product[]
    } catch (error) {
      logger.error('getPublicProducts exception', error)
      return []
    }
  }

  async getStoreInventoryBySlug(slug: string): Promise<{ store: any; inventory: any[] }> {
    try {
      const { data: store, error: storeError } = await supabase
        .from('stores')
        .select('id, name, slug, address, is_public')
        .eq('slug', slug)
        .single()

      if (storeError || !store) {
        throw new Error('Tienda no encontrada')
      }

      if (!store.is_public) {
        throw new Error('Tienda no encontrada')
      }

      const { data: inventory, error: invError } = await supabase
        .from('store_inventory')
        .select('id, name, sale_price, stock_quantity, cost_price, wholesale_product_id, image_url, category')
        .eq('store_id', store.id)
        .gt('stock_quantity', 0)
        .order('category', { ascending: true })
        .order('name', { ascending: true })

      if (invError) {
        logger.error('getStoreInventoryBySlug', invError)
        return { store, inventory: [] }
      }

      return { store, inventory: inventory || [] }
    } catch (error) {
      logger.error('getStoreInventoryBySlug', error)
      throw error
    }
  }

  async getSuppliers(): Promise<any[]> {
    try {
      const { data, error } = await withOrg(
        supabase.from('suppliers').select('*'),
        this.getCurrentOrgId()
      )
        .is('deleted_at', null)
        .order('name', { ascending: true })

      if (error) throw error
      return (data || []).map((s: any) => ({
        ...s,
        contactName: s.contact_name,
        taxId: s.tax_id,
        createdAt: new Date(s.created_at)
      }))
    } catch (error) {
      logger.error('supabase', 'Error getting suppliers', error as any)
      return []
    }
  }

  async createSupplier(supplier: any): Promise<void> {
    try {
      const payload = {
        ...supplier,
        contact_name: supplier.contactName,
        tax_id: supplier.taxId,
        organization_id: this.getCurrentOrgId()
      }
      delete payload.contactName
      delete payload.taxId

      const { error } = await supabase.from('suppliers').insert([payload])
      if (error) throw error
    } catch (error) {
      logger.error('supabase', 'Error creating supplier', error as any)
      throw error
    }
  }

  async deleteSupplier(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('suppliers')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
    } catch (error) {
      logger.error('supabase', 'Error deleting supplier', error as any)
      throw error
    }
  }

// ==================== PURCHASE ORDERS ====================

  async getPurchaseOrders(): Promise<any[]> {
    try {
      const { data, error } = await withOrg(
        supabase.from('purchase_orders').select('*, supplier:suppliers(*)'),
        this.getCurrentOrgId()
      )
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

      if (error) throw error
      return (data || []).map((o: any) => ({
        ...o,
        supplier: o.supplier ? {
          ...o.supplier,
          contactName: o.supplier.contact_name,
          taxId: o.supplier.tax_id
        } : null,
        date: new Date(o.date),
        createdAt: new Date(o.created_at)
      }))
    } catch (error) {
      logger.error('supabase', 'Error getting purchase orders', error as any)
      return []
    }
  }

  // ==================== E-COMMERCE ORDERS ====================

  async getEcommerceOrders(organizationId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('ecommerce_orders')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })

      if (error) throw error
      return (data || []).map((o: any) => ({
        ...o,
        createdAt: new Date(o.created_at),
        updatedAt: o.updated_at ? new Date(o.updated_at) : null,
        completedAt: o.completed_at ? new Date(o.completed_at) : null
      }))
    } catch (error) {
      logger.error('supabase', 'Error getting ecommerce orders', error as any)
      return []
    }
  }

  async createEcommerceOrder(order: any): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('ecommerce_orders')
        .insert(order)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      logger.error('supabase', 'Error creating ecommerce order', error as any)
      throw error
    }
  }

async updateEcommerceOrderStatus(orderId: string, status: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('ecommerce_orders')
        .update({ 
          status, 
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId)

      if (error) throw error
    } catch (error) {
      logger.error('supabase', 'Error updating ecommerce order', error as any)
      throw error
    }
  }

  async createPurchaseOrder(order: any, items: any[]): Promise<void> {
    try {
      const orgId = this.getCurrentOrgId()
      const { data: po, error: poError } = await supabase
        .from('purchase_orders')
        .insert([{
          ...order,
          supplier_id: order.supplierId,
          organization_id: orgId
        }])
        .select('id')
        .single()

      if (poError) throw poError

      const itemsPayload = items.map(item => ({
        purchase_order_id: po.id,
        product_id: item.productId,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        total: item.total
      }))

      const { error: itemsError } = await supabase.from('purchase_order_items').insert(itemsPayload)
      if (itemsError) throw itemsError
    } catch (error) {
      logger.error('supabase', 'Error creating purchase order', error as any)
      throw error
    }
  }

  async deletePurchaseOrder(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('purchase_orders')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
    } catch (error) {
      logger.error('supabase', 'Error deleting purchase order', error as any)
      throw error
    }
  }

  // ==================== RETAIL ====================

  async getAllRetailProducts(): Promise<Product[]> {
    return this.withRetry(async () => {
      const { data, error } = await withOrg(
        supabase.from('retail_products').select('*'),
        this.getCurrentOrgId()
      )
        .eq('active', true)
        .order('category', { ascending: true })
        .order('name', { ascending: true })

      if (error) throw error
      return (data || []).map((p: any) => {
        let parsedDesc = {
          description: p.description || '',
          packPrice: undefined,
          bulkPrice: undefined,
          packQty: undefined,
          bulkQty: undefined,
          packagesPerBulk: undefined,
          wholesalePrice: undefined,
          wholesaleMinQty: undefined
        }
        if (p.description && p.description.startsWith('{') && p.description.endsWith('}')) {
          try {
            const parsed = JSON.parse(p.description)
            parsedDesc = {
              description: parsed.description || '',
              packPrice: parsed.packPrice,
              bulkPrice: parsed.bulkPrice,
              packQty: parsed.packQty,
              bulkQty: parsed.bulkQty,
              packagesPerBulk: parsed.packagesPerBulk,
              wholesalePrice: parsed.wholesalePrice,
              wholesaleMinQty: parsed.wholesaleMinQty
            }
          } catch (e) {
            // Ignore parse errors
          }
        }

        return {
          ...p,
          description: parsedDesc.description,
          active: p.active,
          currentStock: (p.current_stock !== null && p.current_stock !== undefined) ? Number(p.current_stock) : 0,
          minimumStock: (p.minimum_stock !== null && p.minimum_stock !== undefined) ? Number(p.minimum_stock) : 10,
          hasInventory: (p.has_inventory !== null && p.has_inventory !== undefined) ? Boolean(p.has_inventory) : true,
          createdAt: new Date(p.created_at),
          parentId: p.parent_id,
          packQuantity: p.pack_quantity,
          wholesalePrice: parsedDesc.wholesalePrice !== undefined ? parsedDesc.wholesalePrice : (p.wholesale_price || undefined),
          wholesaleMinQty: parsedDesc.wholesaleMinQty !== undefined ? parsedDesc.wholesaleMinQty : (p.wholesale_min_qty || undefined),
          packPrice: parsedDesc.packPrice,
          packQty: parsedDesc.packQty,
          bulkPrice: parsedDesc.bulkPrice,
          bulkQty: parsedDesc.bulkQty,
          packagesPerBulk: parsedDesc.packagesPerBulk
        }
      }) as Product[]
    }).catch(error => {
      logger.error('supabase', 'Error getting retail products', error as any)
      return []
    })
  }

  async createRetailProduct(product: Omit<Product, 'id'>): Promise<string> {
    try {
      const descPayload = JSON.stringify({
        description: product.description || '',
        packPrice: product.packPrice,
        bulkPrice: product.bulkPrice,
        packQty: product.packQty,
        bulkQty: product.bulkQty,
        packagesPerBulk: product.packagesPerBulk,
        wholesalePrice: product.wholesalePrice,
        wholesaleMinQty: product.wholesaleMinQty
      })

      const payload: any = {
        organization_id: this.getCurrentOrgId(),
        name: product.name,
        description: descPayload,
        price: product.price,
        barcode: product.barcode,
        sku: product.sku,
        category: product.category,
        image: product.image,
        current_stock: product.currentStock || 0,
        minimum_stock: product.minimumStock || 0,
        has_inventory: product.hasInventory ?? true,
        active: product.active ?? true,
        parent_id: product.parentId || null,
        pack_quantity: product.packQuantity || 1
      }

      const { data, error } = await supabase
        .from('retail_products')
        .insert([payload])
        .select('id')
        .single()

      if (error) throw error
      return data.id
    } catch (error) {
      logger.error('supabase', 'Error creating retail product', error as any)
      throw error
    }
  }

  async updateRetailProduct(productId: string, updates: Partial<Product>): Promise<void> {
    try {
      const payload: any = {}
      
      // Copy explicit text and basic fields
      if ('name' in updates) payload.name = updates.name
      if ('price' in updates) payload.price = updates.price
      if ('barcode' in updates) payload.barcode = updates.barcode
      if ('sku' in updates) payload.sku = updates.sku
      if ('category' in updates) payload.category = updates.category
      if ('image' in updates) payload.image = updates.image
      if ('active' in updates) payload.active = updates.active

      // Map camelCase/alternative formats safely
      if ('currentStock' in updates) payload.current_stock = updates.currentStock
      if ('current_stock' in updates) payload.current_stock = (updates as any).current_stock

      if ('minimumStock' in updates) payload.minimum_stock = updates.minimumStock
      if ('minimum_stock' in updates) payload.minimum_stock = (updates as any).minimum_stock

      if ('hasInventory' in updates) payload.has_inventory = updates.hasInventory
      if ('has_inventory' in updates) payload.has_inventory = (updates as any).has_inventory

      if ('parentId' in updates) payload.parent_id = updates.parentId
      if ('parent_id' in updates) payload.parent_id = (updates as any).parent_id

      if ('packQuantity' in updates) payload.pack_quantity = updates.packQuantity
      if ('pack_quantity' in updates) payload.pack_quantity = (updates as any).pack_quantity

      // Handle extra pricing fields packaging in description
      if ('description' in updates || 'packPrice' in updates || 'bulkPrice' in updates || 'packQty' in updates || 'bulkQty' in updates || 'packagesPerBulk' in updates || 'wholesalePrice' in updates || 'wholesaleMinQty' in updates) {
        // Fetch current product to merge description payload
        const { data: currentProd } = await supabase
          .from('retail_products')
          .select('description')
          .eq('id', productId)
          .single()
        
        let currentDesc = ''
        let currentParsed: any = {}
        
        if (currentProd && currentProd.description) {
          currentDesc = currentProd.description
          if (currentDesc.startsWith('{') && currentDesc.endsWith('}')) {
            try {
              currentParsed = JSON.parse(currentDesc)
            } catch (e) {}
          } else {
            currentParsed.description = currentDesc
          }
        }

        const mergedParsed = {
          description: 'description' in updates ? updates.description : (currentParsed.description || ''),
          packPrice: 'packPrice' in updates ? updates.packPrice : currentParsed.packPrice,
          bulkPrice: 'bulkPrice' in updates ? updates.bulkPrice : currentParsed.bulkPrice,
          packQty: 'packQty' in updates ? updates.packQty : currentParsed.packQty,
          bulkQty: 'bulkQty' in updates ? updates.bulkQty : currentParsed.bulkQty,
          packagesPerBulk: 'packagesPerBulk' in updates ? updates.packagesPerBulk : currentParsed.packagesPerBulk,
          wholesalePrice: 'wholesalePrice' in updates ? updates.wholesalePrice : currentParsed.wholesalePrice,
          wholesaleMinQty: 'wholesaleMinQty' in updates ? updates.wholesaleMinQty : currentParsed.wholesaleMinQty
        }

        payload.description = JSON.stringify(mergedParsed)

      }

      const { error } = await supabase
        .from('retail_products')
        .update(payload)
        .eq('id', productId)

      if (error) throw error
    } catch (error) {
      logger.error('supabase', 'Error updating retail product', error as any)
      throw error
    }
  }

  async deleteRetailProduct(productId: string): Promise<void> {
    try {
      // Soft delete: set active to false
      const { error } = await supabase
        .from('retail_products')
        .update({ active: false })
        .eq('id', productId)

      if (error) throw error
    } catch (error) {
      logger.error('supabase', 'Error deleting retail product', error as any)
      throw error
    }
  }

  async getRetailProductByCode(code: string): Promise<Product | null> {
    try {
      const { data, error } = await withOrg(
        supabase.from('retail_products').select('*'),
        this.getCurrentOrgId()
      )
        .or(`barcode.eq."${code}",sku.eq."${code}"`)
        .eq('active', true)
        .maybeSingle()

      if (error) throw error
      if (!data) return null

      return {
        ...data,
        active: data.active,
        currentStock: data.current_stock,
        minimumStock: data.minimum_stock,
        hasInventory: data.has_inventory,
        createdAt: new Date(data.created_at),
        parentId: data.parent_id,
        packQuantity: data.pack_quantity
      } as Product
    } catch (error) {
      logger.error('supabase', 'Error getting retail product by code', error as any)
      return null
    }
  }

  async createRetailSale(sale: any, items: any[]): Promise<string> {
    try {
      const orgId = this.getCurrentOrgId()
      
      // Dynamic column check for client_id
      let hasClientIdColumn = false
      try {
        const { error } = await supabase.from('retail_sales').select('client_id').limit(1)
        if (!error) {
          hasClientIdColumn = true
        }
      } catch (err) {}

      const saleNotes = sale.clientName
        ? `${sale.notes || ''}\n[Cliente: ${sale.clientName} ${sale.clientPhone ? `(Tel: ${sale.clientPhone})` : ''}]`.trim()
        : sale.notes

      const insertPayload: any = {
        organization_id: orgId,
        table_number: sale.tableNumber,
        subtotal: sale.subtotal,
        discounts: sale.discounts || 0,
        tax: sale.tax || 0,
        total: sale.total,
        payment_method: sale.paymentMethod,
        tip: sale.tip || 0,
        tip_source: sale.tipSource || 'none',
        sale_by: sale.saleBy,
        notes: saleNotes
      }

      if (hasClientIdColumn && sale.clientId) {
        insertPayload.client_id = sale.clientId
      }

      // 1. Create sale header
      const { data: saleData, error: saleError } = await supabase
        .from('retail_sales')
        .insert([insertPayload])
        .select('id')
        .single()

      if (saleError) throw saleError

      // 2. Create sale items
      const itemsPayload = items.map(item => ({
        sale_id: saleData.id,
        product_id: item.productId,
        product_name: item.productName,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        total_price: item.unitPrice * item.quantity
      }))

      const { error: itemsError } = await supabase.from('retail_sale_items').insert(itemsPayload)
      if (itemsError) throw itemsError

      // 3. Update client total spent if associated
      if (sale.clientId) {
        try {
          const { data: clientData } = await supabase
            .from('clients')
            .select('total_spent')
            .eq('id', sale.clientId)
            .single()
          
          if (clientData) {
            const currentSpent = parseFloat(clientData.total_spent || 0)
            const newSpent = currentSpent + parseFloat(sale.total)
            await supabase
              .from('clients')
              .update({ total_spent: newSpent })
              .eq('id', sale.clientId)
          }
        } catch (clientErr) {
          logger.warn('supabase', 'Error updating client spent', clientErr)
        }
      }

      // 4. Update stock for items that have inventory
      const aggregatedStock: Record<string, number> = {}
      items.forEach(item => {
        if (!item.productId || item.productId.toLowerCase().startsWith('manual-') || item.id.toLowerCase().startsWith('manual-')) return
        const targetId = item.parentId || item.productId
        const qtyToDeduct = item.quantity * (item.packQuantity || 1)
        aggregatedStock[targetId] = (aggregatedStock[targetId] || 0) - qtyToDeduct
      })

      const stockUpdates = Object.entries(aggregatedStock).map(([productId, quantity]) => ({
        productId,
        quantity // This is already negative
      }))

      if (stockUpdates.length > 0) {
        await this.updateRetailStockBatch(stockUpdates)
      }

      return saleData.id
    } catch (error) {
      logger.error('supabase', 'Error creating retail sale', error as any)
      throw error
    }
  }

  async createPendingRetailSale(sale: any, items: any[]): Promise<string> {
    try {
      const orgId = this.getCurrentOrgId()

      let hasClientIdColumn = false
      try {
        const { error } = await supabase.from('retail_sales').select('client_id').limit(1)
        if (!error) {
          hasClientIdColumn = true
        }
      } catch (err) {}

      const saleNotes = sale.clientName
        ? `${sale.notes || ''}\n[Cliente: ${sale.clientName} ${sale.clientPhone ? `(Tel: ${sale.clientPhone})` : ''}]`.trim()
        : sale.notes

      const insertPayload: any = {
        organization_id: orgId,
        table_number: sale.tableNumber,
        subtotal: sale.subtotal,
        discounts: sale.discounts || 0,
        tax: sale.tax || 0,
        total: sale.total,
        payment_method: 'pending',
        status: 'pending',
        sale_by: sale.saleBy,
        notes: saleNotes
      }

      if (hasClientIdColumn && sale.clientId) {
        insertPayload.client_id = sale.clientId
      }

      const { data: saleData, error: saleError } = await supabase
        .from('retail_sales')
        .insert([insertPayload])
        .select('id')
        .single()

      if (saleError) throw saleError

      const itemsPayload = items.map(item => ({
        sale_id: saleData.id,
        product_id: item.productId,
        product_name: item.productName,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        total_price: item.unitPrice * item.quantity
      }))

      const { error: itemsError } = await supabase.from('retail_sale_items').insert(itemsPayload)
      if (itemsError) throw itemsError

      return saleData.id
    } catch (error) {
      logger.error('supabase', 'Error creating pending sale', error as any)
      throw error
    }
  }

  async addRetailPayment(payment: {
    saleId: string,
    method: string,
    amount: number,
    referenceId?: string
  }): Promise<void> {
    try {
      const { error } = await supabase.from('retail_sale_payments').insert({
        sale_id: payment.saleId,
        organization_id: this.getCurrentOrgId(),
        payment_method: payment.method,
        amount: payment.amount,
        reference_id: payment.referenceId
      })
      if (error) throw error
    } catch (error) {
      logger.error('supabase', 'Error adding retail payment', error as any)
      throw error
    }
  }

  async updateRetailStockBatch(updates: { productId: string; quantity: number }[]): Promise<void> {
    if (!updates.length) return
    try {
      const { error } = await supabase.rpc('update_retail_stock_batch', { updates })
      if (error) throw error
    } catch (error) {
      logger.error('supabase', 'Error updating retail stock batch', error as any)
    }
  }

  // ==================== PROMOTIONS ====================
  
  async getPromotions(): Promise<any[]> {
    try {
      const orgId = this.getCurrentOrgId()
      const { data, error } = await supabase
        .from('promotions')
        .select('*')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data || []
    } catch (error) {
      logger.error('supabase', 'Error fetching promotions', error as any)
      return []
    }
  }

  async createPromotion(promotion: any): Promise<string> {
    try {
      const orgId = this.getCurrentOrgId()
      const { data, error } = await supabase
        .from('promotions')
        .insert({ ...promotion, organization_id: orgId })
        .select('id')
        .single()
      if (error) throw error
      return data.id
    } catch (error) {
      logger.error('supabase', 'Error creating promotion', error as any)
      throw error
    }
  }

  async updatePromotion(id: string, updates: any): Promise<void> {
    try {
      const { error } = await supabase
        .from('promotions')
        .update(updates)
        .eq('id', id)
      if (error) throw error
    } catch (error) {
      logger.error('supabase', 'Error updating promotion', error as any)
      throw error
    }
  }

  async deletePromotion(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('promotions')
        .delete()
        .eq('id', id)
      if (error) throw error
    } catch (error) {
      logger.error('supabase', 'Error deleting promotion', error as any)
      throw error
    }
  }

  async getActivePromotions(): Promise<any[]> {
    try {
      const orgId = this.getCurrentOrgId()
      const now = new Date().toISOString()
      const { data, error } = await supabase
        .from('promotions')
        .select('*')
        .eq('organization_id', orgId)
        .eq('is_active', true)
        .lte('start_date', now)
        .or(`end_date.is.null,end_date.gte.${now}`)
      if (error) throw error
      return data || []
    } catch (error) {
      logger.error('supabase', 'Error fetching active promotions', error as any)
      return []
    }
  }

  // ==================== COUPONS ====================

  async getCoupons(): Promise<any[]> {
    try {
      const orgId = this.getCurrentOrgId()
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data || []
    } catch (error) {
      logger.error('supabase', 'Error fetching coupons', error as any)
      return []
    }
  }

  async createCoupon(coupon: any): Promise<string> {
    try {
      const orgId = this.getCurrentOrgId()
      const { data, error } = await supabase
        .from('coupons')
        .insert({ ...coupon, organization_id: orgId })
        .select('id')
        .single()
      if (error) throw error
      return data.id
    } catch (error) {
      logger.error('supabase', 'Error creating coupon', error as any)
      throw error
    }
  }

  async updateCoupon(id: string, updates: any): Promise<void> {
    try {
      const { error } = await supabase
        .from('coupons')
        .update(updates)
        .eq('id', id)
      if (error) throw error
    } catch (error) {
      logger.error('supabase', 'Error updating coupon', error as any)
      throw error
    }
  }

  async deleteCoupon(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('coupons')
        .delete()
        .eq('id', id)
      if (error) throw error
    } catch (error) {
      logger.error('supabase', 'Error deleting coupon', error as any)
      throw error
    }
  }

  async applyCoupon(code: string): Promise<any | null> {
    try {
      const orgId = this.getCurrentOrgId()
      const now = new Date().toISOString()
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .eq('organization_id', orgId)
        .eq('code', code.toUpperCase())
        .eq('is_active', true)
        .lte('valid_from', now)
        .or(`valid_until.is.null,valid_until.gte.${now}`)
        .single()
      if (error || !data) return null
      
      if (data.max_uses && data.current_uses >= data.max_uses) return null
      return data
    } catch (error) {
      return null
    }
  }

  async consolidateLegacyVariants(): Promise<void> {
    try {
      const orgId = this.getCurrentOrgId()
      const { data: products, error } = await supabase
        .from('retail_products')
        .select('*')
        .eq('organization_id', orgId)
        .eq('active', true)

      if (error || !products || products.length === 0) return

      const getBaseName = (name: string) => name.replace(/\s*\([^)]+\)$/, '').trim()
      const getSize = (name: string) => {
        const m = name.match(/\s*\(([^)]+)\)$/)
        return m ? m[1].trim() : null
      }

      const groups: Record<string, typeof products> = {}
      products.forEach(p => {
        const base = getBaseName(p.name)
        if (!groups[base]) groups[base] = []
        groups[base].push(p)
      })

      for (const [baseName, items] of Object.entries(groups)) {
        if (items.length <= 1) continue

        const hasSizes = items.some(item => getSize(item.name) !== null)
        if (!hasSizes) continue

        const master = items[0]
        const otherItems = items.slice(1)

        const totalStock = items.reduce((sum, item) => sum + (item.current_stock || 0), 0)

        const sizes: Record<string, number> = {}
        items.forEach(item => {
          const sz = getSize(item.name) || 'Única'
          sizes[sz] = (sizes[sz] || 0) + (item.current_stock || 0)
        })

        let descObj: any = {}
        if (master.description && master.description.startsWith('{') && master.description.endsWith('}')) {
          try {
            descObj = JSON.parse(master.description)
          } catch (e) {}
        } else {
          descObj.description = master.description || ''
        }
        descObj.sizes = { ...(descObj.sizes || {}), ...sizes }

        await supabase.from('retail_products').update({
          name: baseName,
          current_stock: totalStock,
          description: JSON.stringify(descObj)
        }).eq('id', master.id)

        const otherIds = otherItems.map(item => item.id)
        await supabase.from('retail_products').update({
          active: false
        }).in('id', otherIds)

        logger.info('supabase', `Consolidated legacy sizes for ${baseName} under master ID ${master.id}`)
      }
    } catch (err) {
      logger.error('supabase', 'Error during database consolidation of variants', err as any)
    }
  }
}

// Singleton export
const supabaseService = new SupabaseService()
export default supabaseService
