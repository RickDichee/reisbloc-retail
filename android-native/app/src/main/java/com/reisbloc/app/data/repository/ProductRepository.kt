package com.reisbloc.app.data.repository

import com.reisbloc.app.data.model.Product
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.postgrest.postgrest
import javax.inject.Inject
import javax.inject.Singleton

interface ProductRepository {
    suspend fun getProducts(): Result<List<Product>>
}

@Singleton
class ProductRepositoryImpl @Inject constructor(
    private val supabaseClient: SupabaseClient
) : ProductRepository {

    override suspend fun getProducts(): Result<List<Product>> {
        return try {
            // "products" es el nombre de la tabla en Supabase
            val products = supabaseClient.postgrest["products"]
                .select()
                .decodeList<Product>()
            
            Result.success(products)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
