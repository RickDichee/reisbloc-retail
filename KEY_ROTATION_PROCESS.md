# 🔑 PROCESO DE ROTACIÓN DE LLAVES - REISBLOC STORE

## 📝 Resumen
Este documento describe el proceso de rotación de llaves de seguridad realizado debido a la exposición accidental de llaves en un commit de GitHub y la presencia de llaves hardcodeadas en el código fuente.

## ⚠️ Llaves Expuestas
- **Supabase Service Role Key**: `[REDACTED_ELIMINADA_ZCTMHIDN]`
- Esta llave fue pegada accidentalmente en el chat y fue revocada.

## 📍 Ubicaciones de Llaves Hardcodeadas Encontradas
1. **android-native/app/src/main/java/com/reisbloc/app/di/NetworkModule.kt** - Llave Supabase anon hardcodeada
2. **.env** - Variables de entorno con placeholders y algunas llaves reales
3. **Historial de Git** - Commit que contenía las llaves expuestas

## 🔄 Pasos de Rotación Realizados

### 1. Revocar Llaves Comprometidas en Supabase
- Acceder al proyecto de Supabase en https://supabase.com/dashboard
- Navegar a Settings → API
- Revocar la service role key expuesta
- Generar nuevas service role y anon keys

### 2. Actualizar Archivos de Configuración
#### Archivos Modificados:
- **android-native/app/src/main/java/com/reisbloc/app/di/NetworkModule.kt** 
  - Reemplazado valor hardcodeado con placeholder claro y comentarios de seguridad
  
- **.env**
  - Reemplazado llaves expuestas con placeholders seguros
  - Añadido recordatorio de que este archivo no debe commitearse
  
- **android/gradle/wrapper/gradle-wrapper.properties**
  - Actualizado Gradle a versión 8.9 (tarea de mantenimiento independiente)

### 3. Buenas Prácticas Implementadas
- Nunca almacenar llaves en código fuente
- Usar variables de entorno o servicios de gestión de secretos
- Asegurarse de que .env esté en .gitignore
- Rotar llaves periódicamente y después de cualquier exposición potencial
- Usar llaves con permisos mínimos necesarios (principio de menor privilegio)

## 🛡️ Medidas Preventivas Futuras
1. **GitHub Advanced Security**: Habilitar escaneo de secretos
2. **Pre-commit hooks**: Implementar hooks que detecten patrones de llaves antes de commit
3. **Revisión de código**: Verificar que no haya llaves hardcodeadas en PRs
4. **Entornos separados**: Usar llaves diferentes para desarrollo, staging y producción
5. **Monitoreo**: Configurar alertas para uso inusual de llaves

## 📋 Lista de Verificación Post-Rotación
- [x] Llaves comprometidas revocadas en Supabase
- [x] Nuevas llaves generadas y almacenadas de forma segura
- [x] Todos los archivos de código actualizados con placeholders o referencias a variables de entorno
- [x] .env.local actualizado con nuevas llaves de desarrollo
- [x] Secrets de Supabase Edge Functions actualizados
- [x] Verificar que la aplicación funcione con las nuevas llaves
- [x] Confirmar que no hay más llaves hardcodeadas en el repositorio
- [x] Actualizar documentación y capacitar al equipo sobre manejo seguro de secretos

## 📞 Recursos
- **Supabase Key Management**: https://supabase.com/docs/guides/api#creating-a-new-supabase-account
- **Variables de Entorno en Android**: https://developer.android.com/studio/build/gradle-tips#environment-variables
- **Mejores Prácticas para Secretos**: https://cloud.google.com/security-best-practices#secrets

*Documento creado: Marzo 2026*