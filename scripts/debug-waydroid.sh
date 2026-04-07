#!/bin/bash
# Script para instalar y debuggear APK en Waydroid

echo "=== 1. Copiar APK a Waydroid ==="


echo "=== 2. Iniciar sesión de Waydroid ==="
waydroid session start

echo "=== Esperando que Android esté listo... ==="
sleep 5

echo "=== 3. Verificar estado ==="
waydroid status

echo "=== 4. Listar apps instaladas ==="
waydroid app list 2>&1 | head -20

echo ""
echo "=== Listo! Ahora puedes: ==="
echo "- Abrir el file manager en Waydroid e instalar la APK"
echo "- O ejecutar: waydroid app launch com.reisbloc.store"
echo ""
echo "=== Para ver logs en tiempo real: ==="
echo "waydroid logcat"
