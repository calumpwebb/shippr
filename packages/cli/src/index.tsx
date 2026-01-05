#!/usr/bin/env bun
import { render } from 'ink'
import { Router } from './components/Router'
import { routes } from './routes'
import { logger } from './utils/logger'

function App(): React.ReactNode {
  return <Router routes={routes} />
}

// Log startup before entering alternate buffer
logger.info('CLI starting')

// Enter alternate screen buffer and position cursor at top-left
process.stdout.write('\x1b[?1049h\x1b[H')

const { waitUntilExit } = render(<App />, { exitOnCtrlC: false })

waitUntilExit().then(() => {
  logger.info('CLI exiting')
  // Flush logs before exiting (pino transport uses worker thread)
  logger.flush()
  // Leave alternate screen buffer
  process.stdout.write('\x1b[?1049l')
})
