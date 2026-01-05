import { mkdirSync } from 'fs'
import { homedir } from 'os'
import { join } from 'path'
import pino from 'pino'

const LOG_DIR = join(homedir(), '.shippr', 'logs')
const LOG_FILE = join(LOG_DIR, 'cli.log')

// Ensure log directory exists
mkdirSync(LOG_DIR, { recursive: true })

// Use pino.destination for sync writes (no worker thread buffering)
const destination = pino.destination({
  dest: LOG_FILE,
  sync: true, // Sync writes ensure logs aren't lost
})

// TODO: Replace with config file approach
const LOG_LEVEL = process.env.LOG_LEVEL ?? 'info'

export const logger = pino(
  {
    level: LOG_LEVEL,
  },
  destination
)

export function getLogPath(): string {
  return LOG_FILE
}
