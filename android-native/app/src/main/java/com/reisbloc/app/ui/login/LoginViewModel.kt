package com.reisbloc.app.ui.login

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.reisbloc.app.data.repository.AuthRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class LoginViewModel @Inject constructor(
    private val authRepository: AuthRepository
) : ViewModel() {

    var email by mutableStateOf("")
    var password by mutableStateOf("")
    var isLoading by mutableStateOf(false)
    var error by mutableStateOf<String?>(null)
    var isLoginSuccess by mutableStateOf(false)

    fun onLoginClick() {
        if (email.isBlank() || password.isBlank()) {
            error = "Por favor, completa todos los campos"
            return
        }

        viewModelScope.launch {
            isLoading = true
            error = null
            
            val result = authRepository.login(email, password)
            
            result.onSuccess {
                isLoginSuccess = true
            }.onFailure { e ->
                error = "Error al iniciar sesión: ${e.message}"
            }
            
            isLoading = false
        }
    }
}
