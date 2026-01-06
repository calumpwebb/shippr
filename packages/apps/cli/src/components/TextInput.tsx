import { useState, useEffect } from 'react'
import { Box, Text, useInput } from 'ink'
import chalk from 'chalk'
import { colors } from '../utils/colors'

type TextInputProps = {
  value: string
  onChange: (value: string) => void
  onSubmit?: (value: string) => void
  placeholder?: string
  mask?: string
  focus?: boolean
  label?: string
}

export function TextInput({
  value,
  onChange,
  onSubmit,
  placeholder = '',
  mask,
  focus = true,
  label,
}: TextInputProps): React.ReactNode {
  const [cursorOffset, setCursorOffset] = useState(value.length)

  useEffect(() => {
    setCursorOffset(value.length)
  }, [value.length])

  useInput(
    (input, key) => {
      if (
        key.upArrow ||
        key.downArrow ||
        (key.ctrl && input === 'c') ||
        key.tab ||
        (key.shift && key.tab) ||
        key.escape
      ) {
        return
      }

      // Handle both \r (Bun) and \n (Node) for Enter key
      if (key.return || input === '\n') {
        onSubmit?.(value)
        return
      }

      let nextValue = value
      let nextCursorOffset = cursorOffset

      // Check for line delete (Cmd+Backspace / Ctrl+U)
      const isLineDelete = input === '\x15' || (key.ctrl && input === 'u')

      // Check for word delete (Option+Backspace / Ctrl+W)
      // Option+Backspace sends delete:true + meta:true, Ctrl+W sends \x17
      const isWordDelete = input === '\x17' || (key.delete && key.meta)

      if (isLineDelete) {
        // Delete everything before cursor
        nextValue = value.slice(cursorOffset)
        nextCursorOffset = 0
      } else if (key.leftArrow) {
        nextCursorOffset = Math.max(0, cursorOffset - 1)
      } else if (key.rightArrow) {
        nextCursorOffset = Math.min(value.length, cursorOffset + 1)
      } else if (isWordDelete) {
        // Delete word backward
        const beforeCursor = value.slice(0, cursorOffset)
        const afterCursor = value.slice(cursorOffset)

        // Find word boundary (like terminal behavior)
        let i = beforeCursor.length - 1

        // Skip trailing whitespace
        while (i >= 0 && beforeCursor[i] === ' ') i--

        // Check what type of character we're on
        const isWordChar = (c: string): boolean => /[a-zA-Z0-9]/.test(c)

        if (i >= 0 && isWordChar(beforeCursor[i])) {
          // Delete word characters
          while (i >= 0 && isWordChar(beforeCursor[i])) i--
        } else if (i >= 0) {
          // Delete non-word, non-space characters (like @, ., etc.)
          while (i >= 0 && !isWordChar(beforeCursor[i]) && beforeCursor[i] !== ' ') i--
        }

        const deleteToIndex = i + 1
        nextValue = beforeCursor.slice(0, deleteToIndex) + afterCursor
        nextCursorOffset = deleteToIndex
      } else if (key.backspace || key.delete) {
        if (cursorOffset > 0) {
          // Regular backspace - delete single character
          nextValue = value.slice(0, cursorOffset - 1) + value.slice(cursorOffset)
          nextCursorOffset--
        }
      } else if (!key.meta && !key.ctrl) {
        // Regular character input
        nextValue = value.slice(0, cursorOffset) + input + value.slice(cursorOffset)
        nextCursorOffset += input.length
      }

      if (nextValue !== value) {
        onChange(nextValue)
      }
      if (nextCursorOffset !== cursorOffset) {
        setCursorOffset(nextCursorOffset)
      }
    },
    { isActive: focus }
  )

  const displayValue = mask ? mask.repeat(value.length) : value
  const hasValue = value.length > 0

  // Clamp cursor to valid range to prevent rendering glitches during paste
  const safeCursor = Math.min(cursorOffset, displayValue.length)

  // Build a single formatted string to prevent layout flickering during rapid re-renders
  // Using chalk.inverse() instead of nested <Text inverse> components ensures
  // the entire value renders as one element, avoiding vertical artifacts when pasting
  let renderedValue: string

  // When not focused, show muted value without cursor
  if (!focus) {
    if (hasValue) {
      renderedValue = chalk.hex(colors.muted)(displayValue)
    } else if (placeholder) {
      renderedValue = chalk.hex(colors.muted)(placeholder)
    } else {
      renderedValue = ' '
    }
  } else if (!hasValue && placeholder) {
    renderedValue =
      chalk.inverse(placeholder[0] ?? ' ') + chalk.hex(colors.muted)(placeholder.slice(1))
  } else if (hasValue) {
    const beforeCursor = displayValue.slice(0, safeCursor)
    const atCursor = displayValue[safeCursor] ?? ' '
    const afterCursor = displayValue.slice(safeCursor + 1)
    renderedValue = chalk.white(beforeCursor) + chalk.inverse(atCursor) + chalk.white(afterCursor)
  } else {
    renderedValue = chalk.inverse(' ')
  }

  const input = <Text>{renderedValue}</Text>

  if (label) {
    return (
      <Box>
        <Text>{focus ? chalk.hex(colors.label)(label) : chalk.hex(colors.labelDim)(label)}</Text>
        {input}
      </Box>
    )
  }

  return input
}
