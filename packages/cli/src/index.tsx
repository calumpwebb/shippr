#!/usr/bin/env bun
import { render } from 'ink'
import { Router } from './components/Router'
import { routes } from './routes'

function App(): React.ReactNode {
  return <Router routes={routes} />
}

// Enter alternate screen buffer
process.stdout.write('\x1b[?1049h')

const { waitUntilExit } = render(<App />, { exitOnCtrlC: false })

waitUntilExit().then(() => {
  // Leave alternate screen buffer
  process.stdout.write('\x1b[?1049l')
})
