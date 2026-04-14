#!/bin/bash
# =============================================================================
# Script completo: Build APK + Configurar App Links para Google Play
# =============================================================================

set -e

PROJECT_DIR="${REISBLOC_PROJECT_DIR:-$(pwd)}"
cd "$PROJECT_DIR"

echo "=============================================="
echo "  BUILD APK + APP LINKS CONFIGURATION"
echo "=============================================="
echo ""

# -----------------------------------------------------------------------------
# PASO 1: Build Web App
# -----------------------------------------------------------------------------
echo "📦 [1/6] Construyendo web app..."
npm run build 2>&1 | tail -15
echo "✅ Web app construida"
echo ""

# -----------------------------------------------------------------------------
# PASO 2: Sync con Capacitor
# -----------------------------------------------------------------------------
echo "🔄 [2/6] Sincronizando con Android..."
npx cap sync android
echo "✅ Capacitor sync completado"
echo ""

# -----------------------------------------------------------------------------
# PASO 3: Build APK Debug
# -----------------------------------------------------------------------------
echo "🔨 [3/6] Construyendo APK debug..."
cd android
./gradlew assembleDebug 2>&1 | tail -10
cd ..
echo "✅ APK debug construida"
echo ""

# -----------------------------------------------------------------------------
# PASO 4: Obtener SHA256 Fingerprint Debug
# -----------------------------------------------------------------------------
echo "🔑 [4/6] Obteniendo SHA256 fingerprint debug..."
echo ""
echo "   =========================================="
echo "   COPIA ESTA FINGERPRINT PARA assetlinks.json"
echo "   =========================================="
echo ""

KEYSTORE="$HOME/.android/debug.keystore"
if [ -f "$KEYSTORE" ]; then
    FINGERPRINT=$(keytool -list -v -keystore "$KEYSTORE" -alias androiddebugkey -storepass android -keypass android 2>/dev/null | grep "SHA256" | awk '{print $2}')
    echo "   DEBUG_FINGERPRINT=\"$FINGERPRINT\""
    echo ""
else
    echo "   ⚠️  No se encontró debug keystore"
    echo "   Ejecuta: keytool -genkeypair -v -keystore ~/.android/debug.keystore -alias androiddebugkey -keyalg RSA -keysize 2048 -validity 10000"
    echo ""
fi

# -----------------------------------------------------------------------------
# PASO 5: Mostrar ubicación de archivos
# -----------------------------------------------------------------------------
echo "📁 [5/6] Archivos generados:"
echo ""
echo "   APK Debug: $PROJECT_DIR/android/app/build/outputs/apk/debug/app-debug.apk"
echo ""
echo "   Para instalar en Waydroid:"
echo "   sudo cp $PROJECT_DIR/android/app/build/outputs/apk/debug/app-debug.apk /var/lib/waydroid/media/0/Download/"
echo ""

# -----------------------------------------------------------------------------
# PASO 6: Generar assetlinks.json
# -----------------------------------------------------------------------------
echo "🔗 [6/6] Generando assetlinks.json..."
echo ""

# Obtener fingerprints
DEBUG_FP=""
RELEASE_FP=""

KEYSTORE="$HOME/.android/debug.keystore"
if [ -f "$KEYSTORE" ]; then
    DEBUG_FP=$(keytool -list -v -keystore "$KEYSTORE" -alias androiddebugkey -storepass android -keypass android 2>/dev/null | grep "SHA256" | awk '{print $2}' | tr -d '\n')
fi

# Verificar si existe keystore de release
RELEASE_KEYSTORE="$PROJECT_DIR/android/app/release.keystore"
if [ -f "$RELEASE_KEYSTORE" ]; then
    RELEASE_FP=$(keytool -list -v -keystore "$RELEASE_KEYSTORE" -alias release -storepass android -keypass android 2>/dev/null | grep "SHA256" | awk '{print $2}')
fi

# Crear assetlinks.json
mkdir -p "$PROJECT_DIR/scripts/well-known"
cat > "$PROJECT_DIR/scripts/well-known/assetlinks.json" << EOF
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "com.reisbloclab.pos",
      "sha256_cert_fingerprints": [
        ${DEBUG_FP:+"\"$DEBUG_FP\","}
        ${RELEASE_FP:+"\"$RELEASE_FP\""}
      ]
    }
  }
]
EOF

echo "✅ assetlinks.json generado en:"
echo "   $PROJECT_DIR/scripts/well-known/assetlinks.json"
echo ""

# -----------------------------------------------------------------------------
# RESUMEN
# -----------------------------------------------------------------------------
echo "=============================================="
echo "  📋 RESUMEN - PRÓXIMOS PASOS"
echo "=============================================="
echo ""
echo "1️⃣  SUBIR ARCHIVO AL SERVIDOR:"
echo "   Sube este archivo a:"
echo "   https://reisbloc.com/.well-known/assetlinks.json"
echo ""
echo "2️⃣  VERIFICAR URLs PÚBLICAS:"
echo "   https://reisbloc.com/privacy"
echo "   https://reisbloc.com/terms"
echo ""
echo "3️⃣  INSTALAR APK EN WAYDROID:"
echo "   sudo cp $PROJECT_DIR/android/app/build/outputs/apk/debug/app-debug.apk /var/lib/waydroid/media/0/Download/"
echo "   # Luego abre el file manager en Waydroid e instala"
echo ""
echo "4️⃣  PARA DEBUG EN TIEMPO REAL:"
echo "   waydroid logcat"
echo "   waydroid app launch com.reisbloclab.pos"
echo ""
echo "=============================================="
echo "  ✅ BUILD COMPLETADO"
echo "=============================================="
