import { NextResponse } from "next/server"

export async function GET() {
  return NextResponse.json({
    hasMerchantId: !!process.env.PAYFAST_MERCHANT_ID,
    hasMerchantKey: !!process.env.PAYFAST_MERCHANT_KEY,
    hasPassphrase: !!process.env.PAYFAST_PASSPHRASE,
    hasNextPublicAppUrl: !!process.env.NEXT_PUBLIC_APP_URL,
    hasAppUrl: !!process.env.APP_URL,
    hasVercelUrl: !!process.env.VERCEL_URL,
    merchantIdLength: process.env.PAYFAST_MERCHANT_ID?.length ?? 0,
    merchantKeyLength: process.env.PAYFAST_MERCHANT_KEY?.length ?? 0,
    passphraseLength: process.env.PAYFAST_PASSPHRASE?.length ?? 0,
  })
}
