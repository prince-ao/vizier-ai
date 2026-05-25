import { createHmac, timingSafeEqual } from 'crypto'

// @spec LIC-API-002, LIC-API-003
export function verifySignature(rawBody: Buffer, signature: string, secret: string): boolean {
  const computed = createHmac('sha256', secret).update(rawBody).digest('hex')
  if (computed.length !== signature.length) return false
  return timingSafeEqual(Buffer.from(computed), Buffer.from(signature))
}
