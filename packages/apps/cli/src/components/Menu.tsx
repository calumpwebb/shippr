import { useState, useEffect } from 'react'
import { Box, Text, useInput } from 'ink'
import { colors } from '../utils/colors'

type MenuItem<T extends string> = {
  label: string
  value: T
}

type MenuProps<T extends string> = {
  items: MenuItem<T>[]
  onSelect: (value: T) => void
  focus?: boolean
}

export function Menu<T extends string>({
  items,
  onSelect,
  focus = true,
}: MenuProps<T>): React.ReactNode {
  const [selectedIndex, setSelectedIndex] = useState(0)

  useEffect(() => {
    if (selectedIndex >= items.length) {
      setSelectedIndex(Math.max(0, items.length - 1))
    }
  }, [items.length, selectedIndex])

  useInput(
    (_input, key) => {
      if (key.upArrow) {
        setSelectedIndex((i) => (i > 0 ? i - 1 : i))
      } else if (key.downArrow) {
        setSelectedIndex((i) => (i < items.length - 1 ? i + 1 : i))
      } else if (key.tab) {
        setSelectedIndex((i) => (i + 1) % items.length)
      } else if (key.return) {
        onSelect(items[selectedIndex].value)
      }
    },
    { isActive: focus }
  )

  return (
    <Box flexDirection="column">
      {items.map((item, index) => {
        const isSelected = index === selectedIndex
        const indicator = isSelected ? '❯ ' : '  '

        if (!focus) {
          return (
            <Box key={item.value}>
              <Text color={colors.muted}>
                {indicator}
                {item.label}
              </Text>
            </Box>
          )
        }

        return (
          <Box key={item.value}>
            <Text color={isSelected ? colors.primary : colors.muted}>{indicator}</Text>
            <Text color={isSelected ? colors.primaryLight : undefined}>{item.label}</Text>
          </Box>
        )
      })}
    </Box>
  )
}
