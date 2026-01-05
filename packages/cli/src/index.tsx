#!/usr/bin/env bun
import { render } from 'ink'
import { Router } from './components/Router'
import { routes } from './routes'

function App(): React.ReactNode {
  return <Router routes={routes} />
}

// Enter alternate screen buffer and position cursor at top-left
process.stdout.write('\x1b[?1049h\x1b[H')

const { waitUntilExit } = render(<App />, { exitOnCtrlC: false })

waitUntilExit().then(() => {
  // Leave alternate screen buffer
  process.stdout.write('\x1b[?1049l')
})
