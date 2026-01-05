import { homedir } from 'os'
import { join } from 'path'
import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync } from 'fs'

const CONFIG_DIR = join(homedir(), '.ink-starter')
const CREDENTIALS_PATH = join(CONFIG_DIR, 'credentials.json')

export function getToken(): string | null {
  try {
    if (!existsSync(CREDENTIALS_PATH)) {
      return null
    }
    const data = readFileSync(CREDENTIALS_PATH, 'utf-8')
    const { token } = JSON.parse(data)
    return token || null
  } catch {
    return null
  }
}

export function saveToken(token: string): void {
  try {
    if (!existsSync(CONFIG_DIR)) {
      mkdirSync(CONFIG_DIR, { recursive: true })
    }
    writeFileSync(CREDENTIALS_PATH, JSON.stringify({ token }, null, 2), 'utf-8')
  } catch (error) {
    console.error('Failed to save credentials:', error)
  }
}

export function clearToken(): void {
  try {
    if (existsSync(CREDENTIALS_PATH)) {
      unlinkSync(CREDENTIALS_PATH)
    }
  } catch (error) {
    console.error('Failed to clear credentials:', error)
  }
}

export async function isTokenValid(token: string): Promise<boolean> {
  try {
    // Just check if token is well-formed and not expired
    // Don't verify signature (we don't have the secret on client)
    const parts = token.split('.')
    if (parts.length !== 3) {
      return false
    }

    const payload = JSON.parse(atob(parts[1]))
    const exp = payload.exp

    if (!exp) {
      return false
    }

    // Check if expired (exp is in seconds, Date.now() is in ms)
    return exp * 1000 > Date.now()
  } catch {
    return false
  }
}
