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
}

export default new EcosystemService()