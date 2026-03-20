package com.reisbloc.app.ui.products

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.reisbloc.app.data.model.Product
import com.reisbloc.app.data.repository.ProductRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class ProductViewModel @Inject constructor(
    private val productRepository: ProductRepository
) : ViewModel() {

    var products by mutableStateOf<List<Product>>(emptyList())
    var isLoading by mutableStateOf(false)
    var error by mutableStateOf<String?>(null)

    init {
        loadProducts()
    }

    fun loadProducts() {
        viewModelScope.launch {
            isLoading = true
            error = null
            
            val result = productRepository.getProducts()
            
            result.onSuccess { list ->
                products = list
            }.onFailure { e ->
                error = "Error al cargar productos: ${e.message}"
            }
            
            isLoading = false
        }
    }
}
