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

// Capa de abstracción de base de datos
// Usa solo Supabase
import { SUPABASE_FEATURES } from '@/config/supabase'

import supabaseService from './supabaseService'
import logger from '@/utils/logger'
import {
  User,
  Device,
  Product,
  Order,
  Sale,
  DailyClose,
  AuditLog,
} from '@/types/index'

class DatabaseService {
  private get currentService() {
    const useSupabase = SUPABASE_FEATURES.DATABASE_ENABLED
    logger.info('database', `Using Supabase for database operations`)
    return supabaseService
  }

  // ==================== USERS ====================

  async getUserByUsername(username: string): Promise<User | null> {
    return this.currentService.getUserByUsername(username)
  }

  async getUserById(userId: string): Promise<User | null> {
    return this.currentService.getUserById(userId)
  }

  async getAllUsers(): Promise<User[]> {
    return this.currentService.getAllUsers()
  }

  async createUser(user: Omit<User, 'id'>): Promise<string> {
    return this.currentService.createUser(user)
  }

  async updateUser(userId: string, updates: Partial<User>): Promise<void> {
    return this.currentService.updateUser(userId, updates)
  }

  async deleteUser(userId: string): Promise<void> {
    return this.currentService.deleteUser(userId)
  }

  // ==================== DEVICES ====================

  async registerDevice(device: Omit<Device, 'id'>): Promise<string> {
    return this.currentService.registerDevice(device)
  }

  async getDevicesByUser(userId: string): Promise<Device[]> {
    return this.currentService.getDevicesByUser(userId)
  }

  async getDeviceById(deviceId: string): Promise<Device | null> {
    return this.currentService.getDeviceById(deviceId)
  }

  async getAllDevices(): Promise<Device[]> {
    return this.currentService.getAllDevices()
  }

  async updateDevice(deviceId: string, updates: Partial<Device>): Promise<void> {
    return this.currentService.updateDevice(deviceId, updates)
  }

  async approveDevice(deviceId: string): Promise<void> {
    return this.currentService.approveDevice(deviceId)
  }

  async revokeDevice(deviceId: string): Promise<void> {
    return this.currentService.revokeDevice(deviceId)
  }

  // ==================== PRODUCTS ====================

  async getAllProducts(): Promise<Product[]> {
    return this.currentService.getAllProducts()
  }

  async getProductById(productId: string): Promise<Product | null> {
    return this.currentService.getProductById(productId)
  }

  async createProduct(product: Omit<Product, 'id'>): Promise<string> {
    return this.currentService.createProduct(product)
  }

  async updateProduct(productId: string, updates: Partial<Product>): Promise<void> {
    return this.currentService.updateProduct(productId, updates)
  }

  async deleteProduct(productId: string): Promise<void> {
    return this.currentService.deleteProduct(productId)
  }

  // ==================== ORDERS ====================

  async getActiveOrders(): Promise<Order[]> {
    return this.currentService.getActiveOrders()
  }

  async getOrderById(orderId: string): Promise<Order | null> {
    return this.currentService.getOrderById(orderId)
  }

  async createOrder(order: Omit<Order, 'id'>): Promise<string> {
    return this.currentService.createOrder(order)
  }

  async updateOrder(orderId: string, updates: Partial<Order>): Promise<void> {
    return this.currentService.updateOrder(orderId, updates)
  }

  async deleteOrder(orderId: string): Promise<void> {
    return this.currentService.deleteOrder(orderId)
  }

  // ==================== SALES ====================

  async getTodaySales(): Promise<Sale[]> {
    return this.currentService.getTodaySales()
  }

  async getSalesByDateRange(startDate: Date, endDate: Date): Promise<Sale[]> {
    return this.currentService.getSalesByDateRange(startDate, endDate)
  }

  async createSale(sale: Omit<Sale, 'id'>): Promise<string> {
    return this.currentService.createSale(sale)
  }

  // ==================== AUDIT LOGS ====================

  async createAuditLog(log: Omit<AuditLog, 'id' | 'created_at'>): Promise<void> {
    // Dual write: escribir en ambos durante migración (opcional)
    if (SUPABASE_FEATURES.DATABASE_ENABLED) {
      await supabaseService.createAuditLog(log)
    } else {
      // Audit log solo en Supabase
    }
  }

  async getAuditLogs(limit = 100): Promise<AuditLog[]> {
    // @ts-ignore - ambos servicios tienen este método
    return this.currentService.getAuditLogs?.(limit) || []
  }

  // ==================== REAL-TIME SUBSCRIPTIONS ====================

  subscribeToOrders(callback: (orders: Order[]) => void) {
    if (SUPABASE_FEATURES.DATABASE_ENABLED) {
      return supabaseService.subscribeToOrders(callback)
    } else {
      // Solo Supabase disponible
      return () => {}
    }
  }

  subscribeToProducts(callback: (products: Product[]) => void) {
    if (SUPABASE_FEATURES.DATABASE_ENABLED) {
      return supabaseService.subscribeToProducts(callback)
    } else {
      // Solo Supabase disponible
      return () => {}
    }
  }
}

// Singleton export
const databaseService = new DatabaseService()
export default databaseService
