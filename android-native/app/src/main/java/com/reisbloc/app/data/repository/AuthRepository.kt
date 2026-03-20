package com.reisbloc.app.data.repository

import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.auth.auth
import io.github.jan.supabase.auth.providers.builtin.Email
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import javax.inject.Inject
import javax.inject.Singleton

interface AuthRepository {
    suspend fun login(email: String, password: String): Result<Unit>
    suspend fun logout(): Result<Unit>
    fun isUserLoggedIn(): Boolean
}

@Singleton
class AuthRepositoryImpl @Inject constructor(
    private val supabaseClient: SupabaseClient
) : AuthRepository {

    override suspend fun login(email: String, password: String): Result<Unit> {
        return try {
            supabaseClient.auth.signInWith(Email) {
                this.email = email
                this.password = password
            }
            // Llamada centralizada para auditoría al log-auth-event Edge Function
            try {
                // Hacemos el request con el Functions client de Supabase Kotlin
                val functionClient = supabaseClient.pluginManager.getPlugin("functions") as? io.github.jan.supabase.functions.Functions
                functionClient?.invoke("log-auth-event", buildJsonObject {
                    put("sessionType", "Android Native")
                    put("deviceId", "Device_${System.currentTimeMillis()}") // O idealmente el ID del dispositivo si lo tuvieran
                })
            } catch (e: Exception) {
                // No rompemos el flujo de login si falla el log
                e.printStackTrace()
            }
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun logout(): Result<Unit> {
        return try {
            supabaseClient.auth.signOut()
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override fun isUserLoggedIn(): Boolean {
        return supabaseClient.auth.currentAccessTokenOrNull() != null
    }
}
