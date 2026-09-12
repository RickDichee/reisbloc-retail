import fs from 'node:fs'
import path from 'node:path'

const envFile = process.argv[2] || '.env.local'
const rootDir = process.cwd()
const srcPath = path.resolve(rootDir, envFile)
const destPath = path.resolve(rootDir, '.env')

try {
  if (fs.existsSync(srcPath)) {
    fs.copyFileSync(srcPath, destPath)
  }
} catch (err) {
  console.warn(`[switch-env] Note: Could not copy ${envFile} to .env:`, err.message)
}
