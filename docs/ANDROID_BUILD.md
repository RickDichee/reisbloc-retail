# 📱 Android Build Guide - Reisbloc POS

Guía completa para generar APK de Android para distribución.

## 📋 Requisitos

### Software Necesario

1. **Node.js** 18+ (ya instalado)
2. **Android Studio** (recomendado) o **Android SDK Command Line Tools**
3. **Java JDK** 17+ (requerido por Gradle)

### Instalar Android Studio

**Ubuntu/Linux:**
```bash
# Opción 1: Snap (recomendado)
sudo snap install android-studio --classic

# Opción 2: Manual
# Descargar de: https://developer.android.com/studio
# Extraer y ejecutar: ./android-studio/bin/studio.sh
```

**Variables de entorno necesarias:**
```bash
# Agregar a ~/.bashrc o ~/.zshrc
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64

# Aplicar cambios
source ~/.bashrc
```

### Verificar Instalación

```bash
# Verificar Java
java -version
# Debe mostrar: openjdk version "17.x.x"

# Verificar Android SDK
sdkmanager --version
# Debe mostrar versión del SDK Manager

# Verificar Gradle (se instala automáticamente)
cd android && ./gradlew --version
```

## 🏗️ Build de Desarrollo

### 1. Build del Web App

```bash
# Desde la raíz del proyecto
npm run build

# Output esperado: dist/ folder
```

### 2. Sincronizar con Android

```bash
# Copiar assets web a Android
npx cap sync android

# O individualmente:
npx cap copy android
npx cap update android
```

### 3. Abrir en Android Studio

```bash
npx cap open android
```

Esto abre Android Studio con el proyecto Android. Desde ahí puedes:
- ▶️ Run → Instalar en dispositivo conectado
- 🔨 Build → Generate Signed Bundle/APK

### 4. Build desde Línea de Comandos (Debug)

```bash
cd android

# Debug APK (no firmado, para testing)
./gradlew assembleDebug

# Output: android/app/build/outputs/apk/debug/app-debug.apk
```

## 🚀 Build de Producción (Release)

### 1. Generar Keystore (Solo Primera Vez)

```bash
# Crear keystore para firmar la APK
keytool -genkey -v -keystore reisbloc-pos.keystore \
  -alias reisbloc-pos-key \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000

# Responder preguntas:
# - Contraseña del keystore: [GUARDAR EN LUGAR SEGURO]
# - Nombre, Organización, etc.
```

**⚠️ CRÍTICO:** Guarda el keystore y contraseña en lugar seguro. Si los pierdes, no podrás actualizar la app.

**Recomendación:**
```bash
# Guardar en directorio seguro
mkdir -p ~/.android-keys
mv reisbloc-pos.keystore ~/.android-keys/
chmod 600 ~/.android-keys/reisbloc-pos.keystore

# Crear archivo de credenciales
cat > ~/.android-keys/reisbloc-pos-credentials.txt << 'CREDS'
Keystore: ~/.android-keys/reisbloc-pos.keystore
Keystore Password: [TU_PASSWORD]
Alias: reisbloc-pos-key
Alias Password: [TU_PASSWORD]
CREDS
chmod 600 ~/.android-keys/reisbloc-pos-credentials.txt
```

### 2. Configurar Gradle para Release

Editar `android/app/build.gradle`:

```gradle
android {
    ...
    signingConfigs {
        release {
            storeFile file(System.getenv("KEYSTORE_PATH") ?: "release.keystore")
            storePassword System.getenv("KEYSTORE_PASSWORD")
            keyAlias System.getenv("KEY_ALIAS")
            keyPassword System.getenv("KEY_PASSWORD")
        }
    }
    
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
}
```

### 3. Build Release APK

```bash
# Configurar variables de entorno
export KEYSTORE_PATH=~/.android-keys/reisbloc-pos.keystore
export KEYSTORE_PASSWORD="tu_password_aqui"
export KEY_ALIAS="reisbloc-pos-key"
export KEY_PASSWORD="tu_password_aqui"

# Build
cd android
./gradlew assembleRelease

# Output: android/app/build/outputs/apk/release/app-release.apk
```

### 4. Script Automatizado

Crear `scripts/build-android.sh`:

```bash
#!/bin/bash

set -e

echo "🏗️ Building Reisbloc POS Android APK..."

# 1. Build web app
echo "📦 Building web app..."
npm run build

# 2. Sync with Capacitor
echo "🔄 Syncing with Android..."
npx cap sync android

# 3. Build APK
echo "🤖 Building Android APK..."
cd android

# Check if release or debug
if [ "$1" == "release" ]; then
    echo "🚀 Building RELEASE APK..."
    
    # Verificar variables de entorno
    if [ -z "$KEYSTORE_PATH" ]; then
        echo "❌ Error: KEYSTORE_PATH no configurado"
        exit 1
    fi
    
    ./gradlew assembleRelease
    APK_PATH="app/build/outputs/apk/release/app-release.apk"
else
    echo "🔧 Building DEBUG APK..."
    ./gradlew assembleDebug
    APK_PATH="app/build/outputs/apk/debug/app-debug.apk"
fi

cd ..

echo "✅ Build complete!"
echo "📱 APK location: android/$APK_PATH"

# Copiar al root para fácil acceso
cp "android/$APK_PATH" "reisbloc-pos-$(date +%Y%m%d).apk"
echo "📦 Copiado a: reisbloc-pos-$(date +%Y%m%d).apk"
```

Uso:
```bash
chmod +x scripts/build-android.sh

# Debug
./scripts/build-android.sh

# Release
./scripts/build-android.sh release
```

## 📦 Instalación en Dispositivos

### Opción 1: ADB (Android Debug Bridge)

```bash
# Conectar tablet/celular por USB (habilitar "Depuración USB")

# Verificar dispositivo conectado
adb devices

# Instalar APK
adb install reisbloc-pos-20260126.apk

# O reinstalar (si ya existe)
adb install -r reisbloc-pos-20260126.apk
```

### Opción 2: Transferencia Manual

1. Copiar APK a la tablet (USB, email, etc.)
2. Abrir archivo con gestor de archivos
3. Android solicitará permisos para "Instalar apps desconocidas"
4. Aceptar y instalar

### Opción 3: QR Code

```bash
# Generar servidor HTTP local
python3 -m http.server 8000

# Generar QR code
qrencode -t ANSIUTF8 "http://TU_IP:8000/reisbloc-pos-20260126.apk"

# Escanear con tablet y descargar
```

## 🔧 Troubleshooting

### Error: "SDK location not found"

```bash
# Crear android/local.properties
echo "sdk.dir=$HOME/Android/Sdk" > android/local.properties
```

### Error: "Java version incompatible"

```bash
# Instalar Java 17
sudo apt install openjdk-17-jdk

# Configurar como default
sudo update-alternatives --config java
```

### Error: Gradle build failed

```bash
# Limpiar cache de Gradle
cd android
./gradlew clean

# Reintentar
./gradlew assembleDebug
```

### APK muy grande (>50MB)

```bash
# Habilitar minify en build.gradle
minifyEnabled true
shrinkResources true
```

## 📊 Información de Build

| Tipo | Tamaño Aprox. | Tiempo Build | Uso |
|------|---------------|--------------|-----|
| **Debug** | ~15-30 MB | 2-5 min | Testing, desarrollo |
| **Release** | ~10-20 MB | 5-10 min | Producción, distribución |
| **Bundle (AAB)** | ~8-15 MB | 5-10 min | Google Play Store |

## 🚀 Distribución

### Opción A: Instalación Directa (Sideloading)

1. Genera APK release
2. Distribuye por:
   - Drive/Dropbox link
   - Email
   - USB
   - QR code
3. Usuarios instalan manualmente

**Pros:**
- ✅ Sin intermediarios
- ✅ Control total
- ✅ Gratis

**Contras:**
- ❌ Usuarios deben habilitar "Fuentes desconocidas"
- ❌ No hay updates automáticos
- ❌ Menos confianza (no está en Play Store)

### Opción B: Google Play Store

1. Crear cuenta de desarrollador ($25 USD one-time)
2. Generar AAB (Android App Bundle)
3. Subir a Play Console
4. Llenar información de la app
5. Esperar revisión (~2-5 días)

**Pros:**
- ✅ Distribución masiva
- ✅ Updates automáticos
- ✅ Mayor confianza

**Contras:**
- ❌ Costo inicial $25
- ❌ Proceso de revisión
- ❌ Políticas de Google

## 📝 Checklist Pre-Release

- [ ] Build web app (`npm run build`)
- [ ] Probar en emulador
- [ ] Probar en dispositivo físico
- [ ] Verificar permisos (manifest)
- [ ] Generar keystore (si es primera vez)
- [ ] Build release APK
- [ ] Verificar tamaño (<50MB idealmente)
- [ ] Probar instalación en tablet limpia
- [ ] Verificar offline mode
- [ ] Verificar sincronización
- [ ] Documentar versión y changelog

## 🔐 Seguridad

- ⚠️ **NUNCA** commitear keystore al repositorio
- ⚠️ **NUNCA** compartir contraseñas del keystore
- ⚠️ Agregar `*.keystore` a `.gitignore`
- ⚠️ Hacer backup del keystore en lugar seguro
- ⚠️ Considerar usar secretos de CI/CD para builds automáticos

## 📚 Referencias

- [Capacitor Android Docs](https://capacitorjs.com/docs/android)
- [Android Studio Download](https://developer.android.com/studio)
- [APK Signing](https://developer.android.com/studio/publish/app-signing)
