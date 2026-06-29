/**
 * Migrates existing local static files to S3 and updates all file URL references in the database.
 *
 * Run after configuring S3 env vars but BEFORE switching the file provider:
 *   npx medusa exec src/scripts/migrate-files-to-s3.ts
 *
 * Required env vars (same as medusa-config.ts S3 block):
 *   S3_FILE_ACCESS_KEY_ID, S3_FILE_SECRET_ACCESS_KEY, S3_FILE_REGION, S3_FILE_BUCKET
 *
 * Optional:
 *   S3_FILE_PREFIX   — subfolder inside the bucket (default: "")
 *   S3_FILE_URL      — public base URL of the bucket (default: derived from bucket + region)
 *   LOCAL_STATIC_DIR — absolute path to the static dir (default: "<cwd>/static")
 *   DRY_RUN          — set to "true" to print what would happen without uploading
 */
import fs from 'node:fs'
import path from 'node:path'
import { createReadStream } from 'node:fs'
import { ExecArgs } from '@medusajs/framework/types'
import { MedusaError } from '@medusajs/framework/utils'
import {
  S3Client,
  PutObjectCommand,
  HeadObjectCommand
} from '@aws-sdk/client-s3'
import { lookup as mimeLookup } from 'mime-types'

function requireEnv(name: string): string {
  const v = process.env[name]?.trim()
  if (!v) throw new MedusaError(MedusaError.Types.INVALID_DATA, `Missing required env: ${name}`)
  return v
}

async function objectExists(s3: S3Client, bucket: string, key: string): Promise<boolean> {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }))
    return true
  } catch {
    return false
  }
}

export default async function migrateFilesToS3({ container }: ExecArgs) {
  const accessKeyId = requireEnv('S3_FILE_ACCESS_KEY_ID')
  const secretAccessKey = requireEnv('S3_FILE_SECRET_ACCESS_KEY')
  const region = requireEnv('S3_FILE_REGION')
  const bucket = requireEnv('S3_FILE_BUCKET')
  const prefix = (process.env.S3_FILE_PREFIX || '').replace(/\/$/, '')
  const dryRun = process.env.DRY_RUN === 'true'
  const staticDir = process.env.LOCAL_STATIC_DIR || path.join(process.cwd(), 'static')

  const publicBaseUrl = (
    process.env.S3_FILE_URL ||
    `https://${bucket}.s3.${region}.amazonaws.com`
  ).replace(/\/$/, '')

  if (!fs.existsSync(staticDir)) {
    console.log(`Static dir not found: ${staticDir} — nothing to migrate.`)
    return
  }

  const s3 = new S3Client({
    region,
    credentials: { accessKeyId, secretAccessKey }
  })

  const files = fs.readdirSync(staticDir).filter(f => {
    const full = path.join(staticDir, f)
    return fs.statSync(full).isFile()
  })

  console.log(`Found ${files.length} files in ${staticDir}`)
  if (dryRun) console.log('DRY RUN — no files will be uploaded or DB records changed.')

  // ── 1. Upload files to S3 ────────────────────────────────────────────────
  const uploaded: { filename: string; s3Key: string; s3Url: string }[] = []

  for (const filename of files) {
    const s3Key = prefix ? `${prefix}/${filename}` : filename
    const s3Url = `${publicBaseUrl}/${s3Key}`

    if (!dryRun) {
      const alreadyExists = await objectExists(s3, bucket, s3Key)
      if (alreadyExists) {
        console.log(`  skip (already exists): ${s3Key}`)
        uploaded.push({ filename, s3Key, s3Url })
        continue
      }

      const filePath = path.join(staticDir, filename)
      const contentType = (mimeLookup(filename) || 'application/octet-stream') as string
      await s3.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: s3Key,
          Body: createReadStream(filePath),
          ContentType: contentType
        })
      )
    }

    console.log(`  ${dryRun ? '[dry]' : 'uploaded'}: ${filename} → ${s3Url}`)
    uploaded.push({ filename, s3Key, s3Url })
  }

  console.log(`\nUploaded ${uploaded.length}/${files.length} files.`)

  // ── 2. Update file URL references in the database ────────────────────────
  //
  // Medusa v2 stores uploaded file URLs in the `file` table (module: @medusajs/medusa/file).
  // The `url` column contains the full public URL that was returned at upload time —
  // previously pointing to ${BACKEND_URL}/static/<filename>.
  //
  // We replace the host portion with the new S3 URL so existing product/media records
  // automatically resolve to the right place without any other DB changes.
  //
  // Note: product_image, variant_image etc. store the same URL string; updating `file.url`
  // is enough because those tables reference the URL directly (no FK to the file table).

  const query = container.resolve('query')

  let updatedCount = 0
  for (const { filename, s3Url } of uploaded) {
    // Match any URL whose path ends with /static/<filename> regardless of the host.
    const { data: fileRecords } = await query.graph({
      entity: 'file',
      fields: ['id', 'url'],
      filters: { url: { $like: `%/static/${filename}` } }
    })

    for (const record of fileRecords) {
      if (record.url === s3Url) continue
      console.log(`  db update: ${record.url} → ${s3Url}`)
      if (!dryRun) {
        const fileModuleService = container.resolve<{ updateFiles: (updates: { id: string; url: string }[]) => Promise<void> }>('fileModuleService')
        await fileModuleService.updateFiles([{ id: record.id, url: s3Url }])
      }
      updatedCount++
    }
  }

  console.log(`\nUpdated ${updatedCount} file records in the database.`)
  console.log('Migration complete.')
  console.log('\nNext steps:')
  console.log('  1. Set S3_FILE_ACCESS_KEY_ID (and other S3_FILE_* vars) in your .env / Docker.')
  console.log('  2. Set NEXT_PUBLIC_S3_BASE_URL in the storefront env.')
  console.log('  3. Redeploy backend — it will now use the S3 file provider for new uploads.')
}
