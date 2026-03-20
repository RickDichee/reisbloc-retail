package com.reisbloc.app.data.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class Product(
    val id: String,
    @SerialName("name") val name: String,
    @SerialName("description") val description: String? = null,
    @SerialName("price") val price: Double,
    @SerialName("image_url") val imageUrl: String? = null,
    @SerialName("stock") val stock: Int = 0,
    @SerialName("category") val category: String? = null
)
