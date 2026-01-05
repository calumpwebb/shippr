import { SignJWT, jwtVerify } from 'jose'
import type { JwtPayload } from '@shippr/shared'
import { env } from '@shippr/shared/env'

const secret = new TextEncoder().encode(env.JWT_SECRET)

export async function generateToken(payload: JwtPayload): Promise<string> {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret)
}

export async function verifyToken(token: string): Promise<JwtPayload> {
  const { payload } = await jwtVerify(token, secret)
  return payload as JwtPayload
}
