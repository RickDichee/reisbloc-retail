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
        return createSupabaseClient(
            supabaseUrl = "https://jnyyaclrelqcqzjummwe.supabase.co",
            supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpueXlhY2xyZWxxY3F6anVtbXdlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2NzAyOTEsImV4cCI6MjA4NjI0NjI5MX0.s4ICD7RoQECq3MWTcA1iEcVqG4W8sB3rkm6kKyb29h8"
        ) {
            install(Postgrest)
            install(Auth)
            install(Realtime)
        }
    }
}
