import { SignJWT, jwtVerify } from 'jose'
import type { JwtPayload } from './types.js'

export type { JwtPayload }

export function createSecret(secretString: string): Uint8Array {
  return new TextEncoder().encode(secretString)
}

export async function generateToken(payload: JwtPayload, secret: Uint8Array): Promise<string> {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret)
}

export async function verifyToken(token: string, secret: Uint8Array): Promise<JwtPayload> {
  const { payload } = await jwtVerify(token, secret)
  return payload as JwtPayload
}

/** Service that encapsulates JWT operations with the secret hidden internally */
export interface JwtService {
  generateToken(payload: JwtPayload): Promise<string>
  verifyToken(token: string): Promise<JwtPayload>
}

export function createJwtService(secretString: string): JwtService {
  const secret = createSecret(secretString)

  return {
    generateToken: (payload: JwtPayload): Promise<string> => generateToken(payload, secret),
    verifyToken: (token: string): Promise<JwtPayload> => verifyToken(token, secret),
  }
}
