package com.reisbloc.app.di

import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.createSupabaseClient
import io.github.jan.supabase.auth.Auth
import io.github.jan.supabase.postgrest.Postgrest
import io.github.jan.supabase.realtime.Realtime
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object NetworkModule {

    @Provides
    @Singleton
    fun provideSupabaseClient(): SupabaseClient {
        // IMPORTANT: For security, supabaseKey should be retrieved from secure source
        // such as Android Keystore, encrypted shared preferences, or build config
        // NEVER hardcode keys in source code
        return createSupabaseClient(
            supabaseUrl = "https://jnyyaclrelqcqzjummwe.supabase.co",
            supabaseKey = "PLACEHOLDER_SUPABASE_ANON_KEY_ROTATED_MUST_BE_UPDATED_IN_SUPERBASE_DASHBOARD"
        ) {
            install(Postgrest)
            install(Auth)
            install(Realtime)
        }
    }
}