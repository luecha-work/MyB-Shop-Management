import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { canManageSettings, sessionFromRequest } from '@/lib/auth/session'

export const runtime = 'nodejs'

const PRODUCT_IMAGE_BUCKET = 'images'
const PRODUCT_IMAGE_FOLDER = 'products'
const MAX_IMAGE_SIZE = 5 * 1024 * 1024

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const storageClient = () => {
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase Storage environment variables are not configured')
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

export async function POST(request: NextRequest) {
  const session = await sessionFromRequest(request)
  if (!canManageSettings(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file')
    const productName = String(formData.get('productName') ?? 'product').trim()

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'กรุณาเลือกไฟล์รูปภาพ' }, { status: 400 })
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'กรุณาเลือกไฟล์รูปภาพเท่านั้น' }, { status: 400 })
    }

    if (file.size > MAX_IMAGE_SIZE) {
      return NextResponse.json({ error: 'ไฟล์รูปภาพต้องมีขนาดไม่เกิน 5MB' }, { status: 400 })
    }

    const extension = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg'
    const safeName = productName.toLowerCase().replace(/[^a-z0-9ก-๙]+/gi, '-').replace(/^-+|-+$/g, '') || 'product'
    const path = `${PRODUCT_IMAGE_FOLDER}/${Date.now()}-${crypto.randomUUID()}-${safeName}.${extension}`
    const supabase = storageClient()
    const { data, error } = await supabase.storage
      .from(PRODUCT_IMAGE_BUCKET)
      .upload(path, file, {
        cacheControl: '31536000',
        contentType: file.type,
        upsert: false,
      })

    if (error) {
      return NextResponse.json({ error: error.message || 'อัปโหลดรูปภาพไม่สำเร็จ' }, { status: 500 })
    }

    const { data: publicUrlData } = supabase.storage
      .from(PRODUCT_IMAGE_BUCKET)
      .getPublicUrl(data.path)

    return NextResponse.json({
      path: data.path,
      publicUrl: publicUrlData.publicUrl,
    })
  } catch (error) {
    console.error('POST /api/products/images failed', error)
    return NextResponse.json({ error: 'อัปโหลดรูปภาพไม่สำเร็จ' }, { status: 500 })
  }
}
