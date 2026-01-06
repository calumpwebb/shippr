import { Text, useInput } from 'ink'
import { colors } from '../utils/colors'

type ButtonProps = {
  label: string
  onPress: () => void
  focus?: boolean
}

export function Button({ label, onPress, focus = false }: ButtonProps): React.ReactNode {
  useInput(
    (input, key) => {
      // Handle both \r (Bun) and \n (Node) for Enter key
      if (key.return || input === '\n') {
        onPress()
      }
    },
    { isActive: focus }
  )

  return (
    <Text color={focus ? colors.primary : colors.muted}>
      <Text bold={focus}>[</Text>{' '}
      <Text color={focus ? colors.primaryLight : undefined}>{label}</Text>{' '}
      <Text bold={focus}>]</Text>
    </Text>
  )
}
