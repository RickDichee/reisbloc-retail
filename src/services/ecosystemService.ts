import { supabase } from '@/config/supabase'
import { getAuthToken } from '@/config/supabase'

export interface WholesaleProduct {
  id: string
  wholesaler_id: string
  product_name: string
  description: string | null
  min_order_quantity: number
  wholesale_price: number
  category: string | null
  image_url: string | null
  created_at: string
}

export interface StoreInventoryItem {
  id: string
  store_id: string
  wholesale_product_id: string | null
  name: string
  cost_price: number | null
  sale_price: number | null
  stock_quantity: number
  min_stock_level: number
}

class EcosystemService {
  async getWholesaleCatalog(): Promise<WholesaleProduct[]> {
    const { data, error } = await supabase
      .from('wholesale_catalog')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  }

  async getStoreInventory(storeId: string): Promise<StoreInventoryItem[]> {
    const { data, error } = await supabase
      .from('store_inventory')
      .select('*')
      .eq('store_id', storeId)
      .order('name', { ascending: true })

    if (error) throw error
    return data || []
  }

  async addProductToStore(storeId: string, wholesaleProductId: string): Promise<StoreInventoryItem> {
    const token = await getAuthToken()
    if (!token) throw new Error('No autenticado')

    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/add-product-to-store`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        store_id: storeId,
        wholesale_product_id: wholesaleProductId,
      }),
    })

    const data = await response.json()

    if (!response.ok || data.error) {
      throw new Error(data.error || 'Error al añadir producto')
    }

    return data.item
  }

  async bulkAddProductsToStore(storeId: string, wholesaleProductIds: string[]): Promise<StoreInventoryItem[]> {
    const token = await getAuthToken()
    if (!token) throw new Error('No autenticado')

    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/add-product-to-store`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        store_id: storeId,
        wholesale_product_ids: wholesaleProductIds,
      }),
    })

    const data = await response.json()

    if (!response.ok || data.error) {
      throw new Error(data.error || 'Error al añadir productos')
    }

    return data.items || []
  }

  async createStore(name: string, slug: string, address?: string): Promise<{ id: string; slug: string }> {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) throw new Error('No autenticado')

    const { data, error } = await supabase
      .from('stores')
      .insert({
        owner_id: session.user.id,
        organization_id: session.user.id,
        name,
        slug,
        address,
        is_public: true,
      })
      .select('id, slug')
      .single()

    if (error) throw error
    return data
  }

  async updateInventoryPrice(itemId: string, salePrice: number): Promise<void> {
    const { error } = await supabase
      .from('store_inventory')
      .update({ sale_price: salePrice, updated_at: new Date().toISOString() })
      .eq('id', itemId)

    if (error) throw error
  }

  async updateInventoryStock(itemId: string, quantity: number): Promise<void> {
    const { error } = await supabase
      .from('store_inventory')
      .update({ stock_quantity: quantity, updated_at: new Date().toISOString() })
      .eq('id', itemId)

    if (error) throw error
  }

  async getEcosystemStats(storeId: string): Promise<{
    totalItems: number
    wholesaleItems: number
    ecosystemPercentage: string
    totalValue: number
    potentialSavings: number
  }> {
    const { data, error } = await supabase
      .from('store_inventory')
      .select('cost_price, sale_price, stock_quantity, wholesale_product_id')
      .eq('store_id', storeId)

    if (error) throw error

    const items = data || []
    const totalItems = items.length
    const wholesaleItems = items.filter(item => item.wholesale_product_id).length
    const ecosystemPercentage = totalItems > 0 ? ((wholesaleItems / totalItems) * 100).toFixed(1) : '0'
    
    const totalValue = items.reduce((sum, item) => {
      return sum + ((item.sale_price || item.cost_price || 0) * (item.stock_quantity || 0))
    }, 0)

    const potentialSavings = wholesaleItems * 15

    return {
      totalItems,
      wholesaleItems,
      ecosystemPercentage,
      totalValue,
      potentialSavings
    }
  }

  async getWholesalerAnalytics(): Promise<{
    totalProducts: number
    activeStores: number
    totalAdoptions: number
    categoryBreakdown: { category: string; count: number }[]
  }> {
    const { data: products, error: productsError } = await supabase
      .from('wholesale_catalog')
      .select('id, category')

    if (productsError) throw productsError

    const { data: inventory, error: inventoryError } = await supabase
      .from('store_inventory')
      .select('store_id, wholesale_product_id, wholesale_catalog(category)')

    if (inventoryError) throw inventoryError

    const productIds = new Set(inventory?.map(i => i.wholesale_product_id).filter(Boolean))
    const storeIds = new Set(inventory?.map(i => i.store_id).filter(Boolean))
    
    const categoryMap = new Map<string, number>()
    inventory?.forEach((item: any) => {
      const cat = item.wholesale_catalog?.category || 'Sin categoria'
      categoryMap.set(cat, (categoryMap.get(cat) || 0) + 1)
    })

    return {
      totalProducts: products?.length || 0,
      activeStores: storeIds.size,
      totalAdoptions: productIds.size,
      categoryBreakdown: Array.from(categoryMap.entries()).map(([category, count]) => ({ category, count }))
    }
  }

  async getWholesalerInsights(wholesalerId: string): Promise<{
    totalStoresWithProducts: number
    totalStockDistributed: number
    topProducts: { product_name: string; store_count: number; total_stock: number }[]
    categoryVelocity: { category: string; stores_count: number; stock_total: number }[]
    marketPenetration: { store_name: string; product_count: number; address: string | null }[]
    adoptionTrend: { date: string; imports: number; stores: number }[]
    totalMarketPenetration: number
    weeklyGrowth: number
  }> {
    const { data: products, error } = await supabase
      .from('wholesale_catalog')
      .select('id, product_name, category')
      .eq('wholesaler_id', wholesalerId)

    if (error) throw error

    const myProductIds = new Set(products?.map(p => p.id) || [])
    const allProductIds = Array.from(myProductIds)

    if (allProductIds.length === 0) {
      return {
        totalStoresWithProducts: 0,
        totalStockDistributed: 0,
        topProducts: [],
        categoryVelocity: [],
        marketPenetration: [],
        adoptionTrend: [],
        totalMarketPenetration: 0,
        weeklyGrowth: 0
      }
    }

    const { data: inventory, error: invError } = await supabase
      .from('store_inventory')
      .select('store_id, stock_quantity, wholesale_product_id, stores(name, address)')
      .in('wholesale_product_id', allProductIds)

    if (invError) throw invError

    // Time-series: get weekly adoption trend for this wholesaler's products
    const { data: events, error: eventsError } = await supabase
      .from('ecosystem_events')
      .select('created_at, store_id, event_type')
      .eq('wholesaler_id', wholesalerId)
      .order('created_at', { ascending: true })

    if (eventsError) throw eventsError

    // Get total market for penetration calculation
    const { data: allInventory, error: allInvError } = await supabase
      .from('store_inventory')
      .select('wholesale_product_id')

    if (allInvError) throw allInvError
    const totalMarketItems = allInventory?.filter(i => i.wholesale_product_id).length || 0
    const myMarketItems = inventory?.length || 0
    const totalMarketPenetration = totalMarketItems > 0 ? (myMarketItems / totalMarketItems) * 100 : 0

    // Calculate weekly growth (last 7 days vs previous 7 days)
    const now = new Date()
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)
    
    const lastWeekImports = events?.filter(e => 
      e.event_type === 'import' && new Date(e.created_at) >= sevenDaysAgo
    ).length || 0
    const prevWeekImports = events?.filter(e => 
      e.event_type === 'import' && new Date(e.created_at) >= fourteenDaysAgo && new Date(e.created_at) < sevenDaysAgo
    ).length || 0
    const weeklyGrowth = prevWeekImports > 0 ? ((lastWeekImports - prevWeekImports) / prevWeekImports) * 100 : (lastWeekImports > 0 ? 100 : 0)

    // Weekly adoption trend (last 4 weeks)
    const weeklyAdoption: { [week: string]: { imports: number; stores: Set<string> } } = {}
    for (let i = 0; i < 4; i++) {
      const weekStart = new Date(now.getTime() - (i + 1) * 7 * 24 * 60 * 60 * 1000)
      const weekKey = weekStart.toISOString().split('T')[0]
      weeklyAdoption[weekKey] = { imports: 0, stores: new Set() }
    }

    events?.forEach((e: any) => {
      const eventDate = new Date(e.created_at)
      const daysAgo = Math.floor((now.getTime() - eventDate.getTime()) / (24 * 60 * 60 * 1000))
      if (daysAgo < 28 && e.event_type === 'import') {
        const weekNum = Math.floor(daysAgo / 7)
        const weekStart = new Date(now.getTime() - (weekNum + 1) * 7 * 24 * 60 * 60 * 1000)
        const weekKey = weekStart.toISOString().split('T')[0]
        if (weeklyAdoption[weekKey]) {
          weeklyAdoption[weekKey].imports++
          weeklyAdoption[weekKey].stores.add(e.store_id)
        }
      }
    })

    const adoptionTrend = Object.entries(weeklyAdoption)
      .map(([date, data]) => ({
        date,
        imports: data.imports,
        stores: data.stores.size
      }))
      .reverse()

    const productMap = new Map<string, { name: string; category: string; stores: Set<string>; stock: number }>()
    const storeMap = new Map<string, { name: string; address: string | null; count: number }>()

    inventory?.forEach((item: any) => {
      const productId = item.wholesale_product_id
      const storeId = item.store_id
      
      if (!productMap.has(productId)) {
        const product = products?.find(p => p.id === productId)
        productMap.set(productId, {
          name: product?.product_name || 'Unknown',
          category: product?.category || 'Sin categoria',
          stores: new Set(),
          stock: 0
        })
      }
      
      const productData = productMap.get(productId)!
      productData.stores.add(storeId)
      productData.stock += item.stock_quantity || 0

      if (!storeMap.has(storeId)) {
        storeMap.set(storeId, {
          name: item.stores?.name || 'Unknown',
          address: item.stores?.address || null,
          count: 0
        })
      }
      storeMap.get(storeId)!.count++
    })

    const topProducts = Array.from(productMap.values())
      .sort((a, b) => b.stores.size - a.stores.size)
      .slice(0, 10)
      .map(p => ({
        product_name: p.name,
        store_count: p.stores.size,
        total_stock: p.stock
      }))

    const categoryVelocity = Array.from(productMap.values()).reduce((acc, p) => {
      const existing = acc.find(c => c.category === p.category)
      if (existing) {
        existing.stores_count += p.stores.size
        existing.stock_total += p.stock
      } else {
        acc.push({ category: p.category, stores_count: p.stores.size, stock_total: p.stock })
      }
      return acc
    }, [] as { category: string; stores_count: number; stock_total: number }[])
      .sort((a, b) => b.stores_count - a.stores_count)

    const marketPenetration = Array.from(storeMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 20)
      .map(s => ({
        store_name: s.name,
        product_count: s.count,
        address: s.address
      }))

    return {
      totalStoresWithProducts: storeMap.size,
      totalStockDistributed: inventory?.reduce((sum, i) => sum + (i.stock_quantity || 0), 0) || 0,
      topProducts,
      categoryVelocity,
      marketPenetration,
      adoptionTrend,
      totalMarketPenetration,
      weeklyGrowth
    }
  }
}

export default new EcosystemService()