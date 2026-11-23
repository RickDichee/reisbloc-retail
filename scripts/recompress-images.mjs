#!/usr/bin/env node
/**
 * Recomprime las fotos YA existentes en Supabase Storage a ~100 KB.
 *
 * Uso:
 *   node scripts/recompress-images.mjs                       # dry-run (por defecto)
 *   node scripts/recompress-images.mjs --dry-run --all-buckets
 *   node scripts/recompress-images.mjs --apply --confirm --bucket products
 *   node scripts/recompress-images.mjs --apply --confirm --all-buckets --limit 50
 *
 * SEGURIDAD — leer antes de usar --apply:
 * - Por defecto el script es SOLO LECTURA (dry-run): lista objetos y reporta
 *   tamaños actuales y tamaño estimado tras comprimir. No descarga ni escribe.
 * - --apply exige además --confirm. Sin --confirm no escribe nada.
 * - En --apply, cada foto se descarga, se comprime y se sube DE NUEVO a la
 *   MISMA ruta con upsert. El original solo se sobrescribe si la compresión
 *   y la subida salieron bien; si algo falla, el original queda intacto.
 * - Nunca borra objetos ni toca filas de la base de datos. Las fotos que
 *   viven como data URL base64 dentro de columnas de la BD NO las toca este
 *   script (esas van por otro proceso).
 * - Necesita SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en el entorno o en
 *   .env.local (raíz del repo). NUNCA se escriben claves en este archivo.
 *
 * Requisitos:
 * - dry-run: @supabase/supabase-js (ya es dependencia del repo).
 * - --apply: además `sharp` (`npm install --no-save sharp`).
 *
 * Buckets que toca: products (default), tickets y avatars (con --all-buckets).
 * Son los 3 buckets que usa storageService.uploadProductImage() como
 * intentos 1-3. El script NO toca el bucket de tickets de tickets reales
 * fuera de fotos de producto: con --all-buckets procesa todo lo del bucket
 * `tickets`, así que revisa el reporte dry-run antes de aplicar.
 */

import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

// ---------- Config ----------
const TARGET_BYTES = 100 * 1024
const TARGET_MAX_BYTES = 120 * 1024 // tolerancia: ~100 KB, hasta 120 KB
const MAX_SIDE = 800
const QUALITIES = [82, 70, 55, 40]
const ALL_BUCKETS = ['products', 'tickets', 'avatars']

const args = process.argv.slice(2)
const has = (flag) => args.includes(flag)
const valueOf = (flag, def) => {
  const i = args.indexOf(flag)
  return i >= 0 && args[i + 1] ? args[i + 1] : def
}

if (has('--help') || has('-h')) {
  console.log(`
Uso:
  node scripts/recompress-images.mjs [opciones]

Opciones:
  --dry-run            Solo reporta (es el modo por defecto).
  --apply --confirm    Recomprime y sobrescribe (exige --confirm).
  --bucket <nombre>    Bucket a procesar (default: products).
  --all-buckets        Procesa products, tickets y avatars.
  --prefix <ruta>      Solo objetos bajo este prefijo (ej. prod_123/).
  --limit <n>          Máximo de objetos a procesar (default: sin límite).

Variables de entorno (o en .env.local):
  SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
`)
  process.exit(0)
}

const APPLY = has('--apply')
const CONFIRM = has('--confirm')
const BUCKETS = has('--all-buckets')
  ? ALL_BUCKETS
  : [valueOf('--bucket', 'products')]
const PREFIX = valueOf('--prefix', '')
const LIMIT = Number(valueOf('--limit', '0')) || 0

if (APPLY && !CONFIRM) {
  console.error('ERROR: --apply exige --confirm. Sin --confirm no se escribe nada.')
  console.error('Si de verdad quieres recomprimir, corre con --apply --confirm.')
  process.exit(1)
}

// ---------- Env (.env.local) ----------
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

const SUPABASE_URL = process.env.SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('ERROR: faltan SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY.')
  console.error('Ponlas en el entorno o en .env.local (raíz del repo).')
  process.exit(1)
}

const { createClient } = await import('@supabase/supabase-js')
const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

console.log(`Proyecto: ${SUPABASE_URL}`)
console.log(`Modo: ${APPLY ? 'APPLY (escribe)' : 'DRY-RUN (solo lectura)'}`)
console.log(`Buckets: ${BUCKETS.join(', ')}${PREFIX ? ` | prefijo: ${PREFIX}` : ''}${LIMIT ? ` | límite: ${LIMIT}` : ''}`)
console.log('')

// ---------- Listado recursivo ----------
async function listAll(bucket, prefix) {
  const out = []
  async function walk(pfx) {
    let offset = 0
    for (;;) {
      const { data, error } = await supabase.storage
        .from(bucket)
        .list(pfx, { limit: 100, offset, sortBy: { column: 'name', order: 'asc' } })
      if (error) throw new Error(`list ${bucket}/${pfx}: ${error.message}`)
      if (!data || data.length === 0) break
      for (const obj of data) {
        const fullPath = pfx ? `${pfx}/${obj.name}` : obj.name
        if (obj.id === null || obj.id === undefined) {
          await walk(fullPath) // carpeta
        } else {
          out.push({ bucket, path: fullPath, size: obj.metadata?.size ?? null })
        }
      }
      if (data.length < 100) break
      offset += 100
    }
  }
  await walk(prefix)
  return out
}

const fmtKB = (bytes) => `${(bytes / 1024).toFixed(1)} KB`

// ---------- Dry-run ----------
if (!APPLY) {
  let total = 0
  let totalBytes = 0
  let toCompress = 0
  let toCompressBytes = 0
  let estimatedBytes = 0
  let unknown = 0
  for (const bucket of BUCKETS) {
    const objects = await listAll(bucket, PREFIX)
    for (const obj of objects) {
      if (LIMIT && total >= LIMIT) break
      total++
      if (obj.size === null) {
        unknown++
        console.log(`  ? ${bucket}/${obj.path} — tamaño desconocido (la API no lo devolvió)`)
        continue
      }
      totalBytes += obj.size
      if (obj.size > TARGET_MAX_BYTES) {
        toCompress++
        toCompressBytes += obj.size
        // Estimación: tras comprimir, como máximo ~100 KB por foto.
        // Es un techo, el real suele ser menor. Sin descargar no se puede
        // saber el tamaño exacto.
        estimatedBytes += Math.min(obj.size, TARGET_BYTES)
        console.log(`  → ${bucket}/${obj.path} — ${fmtKB(obj.size)} → ~${fmtKB(Math.min(obj.size, TARGET_BYTES))} estimado`)
      } else {
        estimatedBytes += obj.size
        console.log(`  ✓ ${bucket}/${obj.path} — ${fmtKB(obj.size)} (ya está en objetivo)`)
      }
    }
  }
  console.log('')
  console.log(`Objetos: ${total} | ya en objetivo: ${total - toCompress - unknown} | a recomprimir: ${toCompress} | sin tamaño: ${unknown}`)
  console.log(`Tamaño actual total: ${fmtKB(totalBytes)}`)
  console.log(`Tamaño estimado tras comprimir: ~${fmtKB(estimatedBytes)} (techo, el real suele ser menor)`)
  console.log(`Ahorro estimado: ~${fmtKB(Math.max(0, totalBytes - estimatedBytes))}`)
  console.log('')
  console.log('Nada se modificó (dry-run). Para aplicar: --apply --confirm')
  process.exit(0)
}

// ---------- Apply ----------
let sharp
try {
  sharp = (await import('sharp')).default
} catch {
  console.error('ERROR: --apply necesita `sharp`. Instálalo con:')
  console.error('  npm install --no-save sharp')
  process.exit(1)
}

async function compressBuffer(buffer) {
  let out = null
  for (const q of QUALITIES) {
    const candidate = await sharp(buffer)
      .resize({ width: MAX_SIDE, height: MAX_SIDE, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: q, mozjpeg: true })
      .toBuffer()
    out = candidate
    if (candidate.length <= TARGET_MAX_BYTES) break
  }
  return out
}

let ok = 0
let skipped = 0
let failed = 0
let processed = 0
for (const bucket of BUCKETS) {
  const objects = await listAll(bucket, PREFIX)
  for (const obj of objects) {
    if (LIMIT && processed >= LIMIT) break
    processed++
    try {
      const { data, error } = await supabase.storage.from(bucket).download(obj.path)
      if (error) throw new Error(`download: ${error.message}`)
      const input = Buffer.from(await data.arrayBuffer())
      if (input.length <= TARGET_MAX_BYTES) {
        skipped++
        continue
      }
      const compressed = await compressBuffer(input)
      if (!compressed) throw new Error('sharp no devolvió imagen')
      const { error: upErr } = await supabase.storage
        .from(bucket)
        .upload(obj.path, compressed, { contentType: 'image/jpeg', upsert: true })
      if (upErr) throw new Error(`upload: ${upErr.message}`)
      ok++
      console.log(`  ✓ ${bucket}/${obj.path} — ${fmtKB(input.length)} → ${fmtKB(compressed.length)}`)
    } catch (e) {
      failed++
      console.error(`  ✗ ${bucket}/${obj.path} — falló (${e.message}). Original intacto.`)
    }
  }
}

console.log('')
console.log(`Recomprimidas: ${ok} | ya en objetivo: ${skipped} | fallidas: ${failed}`)
if (failed > 0) process.exit(1)
