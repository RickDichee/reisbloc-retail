#!/usr/bin/env node
/**
 * scripts/migrate-base64-to-storage.mjs
 *
 * Detecta imágenes incrustadas como Data URLs (`data:image/...;base64,...`)
 * directamente en las columnas `image` / `image_url` de las tablas
 * `retail_products`, `products` y `users`, las comprime a JPEG (~40-80 KB,
 * máx. 800 px), las sube al bucket público `products` (o `avatars`), y
 * actualiza la fila en PostgreSQL con la URL pública resultante.
 *
 * POR QUÉ ES CRÍTICO PARA EL EGRESS:
 * En PROD (`modamiel`), 105 de 385 productos cayeron en el fallback Base64,
 * haciendo que un solo `SELECT *` o RPC del catálogo pese 5.21 MB de JSON.
 * Al migrar esas 105 filas a Storage URLs, el payload del catálogo baja de
 * ~5,216 KB a ~110 KB (-98% Database Egress).
 *
 * USO:
 *   # 1. Dry-run (por defecto, solo audita y muestra ahorro exacto):
 *   SUPABASE_URL="https://nmovxyaibnixvxtepbod.supabase.co" \
 *   SUPABASE_SERVICE_ROLE_KEY="sb_secret_..." \
 *   node scripts/migrate-base64-to-storage.mjs
 *
 *   # 2. Aplicar migración en vivo:
 *   SUPABASE_URL="https://nmovxyaibnixvxtepbod.supabase.co" \
 *   SUPABASE_SERVICE_ROLE_KEY="sb_secret_..." \
 *   node scripts/migrate-base64-to-storage.mjs --apply --confirm
 */

import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const args = process.argv.slice(2)
const has = (flag) => args.includes(flag)
const APPLY = has('--apply')
const CONFIRM = has('--confirm')

if (has('--help') || has('-h')) {
  console.log(`
Uso:
  node scripts/migrate-base64-to-storage.mjs [opciones]

Opciones:
  --dry-run            Solo reporta cuántas filas tienen Base64 y cuánto pesan (default).
  --apply --confirm    Sube cada Base64 a Storage (comprimido con sharp si está disponible)
                       y reemplaza la columna por la publicUrl.

Variables de entorno (o en .env.local):
  SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
`)
  process.exit(0)
}

if (APPLY && !CONFIRM) {
  console.error('ERROR: --apply exige --confirm.')
  process.exit(1)
}

function loadDotEnvLocal() {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
  const envFile = path.join(root, '.env.local')
  if (!existsSync(envFile)) return
  for (const line of readFileSync(envFile, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (!m) continue
    const [, key, raw] = m
    if (process.env[key] === undefined) {
      process.env[key] = raw.replace(/^['"]|['"]$/g, '')
    }
  }
}
loadDotEnvLocal()

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('ERROR: Faltan SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY.')
  process.exit(1)
}

const { createClient } = await import('@supabase/supabase-js')
const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

let sharp = null
try {
  sharp = (await import('sharp')).default
} catch {
  // Si sharp no está instalado, sube el buffer binario decodificado del Base64 directamente
}

const fmtKB = (b) => `${(b / 1024).toFixed(1)} KB`

async function optimizeBuffer(buf) {
  if (!sharp) return buf
  for (const q of [80, 68, 55, 42]) {
    const out = await sharp(buf)
      .resize({ width: 800, height: 800, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: q, mozjpeg: true })
      .toBuffer()
    if (out.length <= 100 * 1024) return out
  }
  return buf
}

const TABLES = [
  { table: 'retail_products', col: 'image', bucket: 'products' },
  { table: 'products', col: 'image', bucket: 'products' },
  { table: 'users', col: 'avatar_url', bucket: 'avatars' },
]

console.log(`Proyecto: ${SUPABASE_URL}`)
console.log(`Modo: ${APPLY ? 'APPLY (migra Base64 → Storage URL)' : 'DRY-RUN (solo auditoría)'}`)
console.log(`Compresor sharp: ${sharp ? 'activo' : 'no instalado (usará binario original del Base64)'}\n`)

let grandTotalRows = 0
let grandTotalBase64Bytes = 0
let grandMigrated = 0

for (const { table, col, bucket } of TABLES) {
  const { data: rows, error } = await supabase
    .from(table)
    .select(`id, ${col}`)
    .like(col, 'data:image/%')

  if (error) {
    console.warn(`⚠️ [${table}.${col}]: no se pudo consultar (${error.message})`)
    continue
  }

  const count = rows?.length || 0
  const totalBytes = (rows || []).reduce((acc, r) => acc + Buffer.byteLength(r[col] || '', 'utf8'), 0)
  grandTotalRows += count
  grandTotalBase64Bytes += totalBytes

  console.log(`Tabla [${table}.${col}]: ${count} filas con Base64 | Peso en JSON DB: ${fmtKB(totalBytes)}`)

  if (!APPLY || count === 0) continue

  // Asegurar que el bucket exista y sea público
  await supabase.storage.createBucket(bucket, { public: true }).catch(() => {})

  for (const row of rows) {
    try {
      const dataUrl = row[col]
      const commaIdx = dataUrl.indexOf(',')
      if (commaIdx === -1) continue
      const base64Data = dataUrl.slice(commaIdx + 1)
      const rawBuf = Buffer.from(base64Data, 'base64')
      const finalBuf = await optimizeBuffer(rawBuf)

      const cleanId = String(row.id).replace(/[^a-zA-Z0-9_-]/g, '_')
      const storagePath = `migrated/${cleanId}_${Date.now()}.jpg`

      const { data: upData, error: upErr } = await supabase.storage
        .from(bucket)
        .upload(storagePath, finalBuf, { contentType: 'image/jpeg', upsert: true })

      if (upErr) throw new Error(`Storage upload: ${upErr.message}`)

      const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(upData.path)

      const { error: dbErr } = await supabase
        .from(table)
        .update({ [col]: publicUrl })
        .eq('id', row.id)

      if (dbErr) throw new Error(`DB update: ${dbErr.message}`)

      grandMigrated++
      console.log(`  ✓ ${table}/${row.id}: Base64 (${fmtKB(Buffer.byteLength(dataUrl))}) → ${publicUrl} (${fmtKB(finalBuf.length)})`)
    } catch (err) {
      console.error(`  ✗ ${table}/${row.id}: ${err.message}`)
    }
  }
}

console.log('\n========================================')
console.log(`Total filas con Base64 en DB: ${grandTotalRows}`)
console.log(`Peso total en cada SELECT del catálogo: ${fmtKB(grandTotalBase64Bytes)} (~${(grandTotalBase64Bytes / 1024 / 1024).toFixed(2)} MB)`)
if (APPLY) {
  console.log(`Filas migradas exitosamente a Storage URL: ${grandMigrated}/${grandTotalRows}`)
} else {
  console.log('Para ejecutar la migración: añade --apply --confirm')
}
