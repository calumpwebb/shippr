import React, { useState, useEffect } from 'react';
import { Text, useInput } from 'ink';

type TextInputProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: (value: string) => void;
  placeholder?: string;
  mask?: string;
  focus?: boolean;
};

export function TextInput({
  value,
  onChange,
  onSubmit,
  placeholder = '',
  mask,
  focus = true,
}: TextInputProps) {
  const [cursorOffset, setCursorOffset] = useState(value.length);

  useEffect(() => {
    setCursorOffset(value.length);
  }, [value.length]);

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
        return;
      }

      if (key.return) {
        onSubmit?.(value);
        return;
      }

      let nextValue = value;
      let nextCursorOffset = cursorOffset;

      if (key.leftArrow) {
        nextCursorOffset = Math.max(0, cursorOffset - 1);
      } else if (key.rightArrow) {
        nextCursorOffset = Math.min(value.length, cursorOffset + 1);
      } else if (key.backspace || key.delete) {
        if (key.meta || input === '\x17') {
          // Option+Backspace (meta) or Ctrl+W (\x17) - delete word backward
          const beforeCursor = value.slice(0, cursorOffset);
          const afterCursor = value.slice(cursorOffset);

          // Find word boundary (like terminal behavior)
          // First skip any trailing non-word chars, then skip word chars
          let i = beforeCursor.length - 1;

          // Skip trailing whitespace
          while (i >= 0 && beforeCursor[i] === ' ') i--;

          // Check what type of character we're on
          const isWordChar = (c: string) => /[a-zA-Z0-9]/.test(c);

          if (i >= 0 && isWordChar(beforeCursor[i])) {
            // Delete word characters
            while (i >= 0 && isWordChar(beforeCursor[i])) i--;
          } else if (i >= 0) {
            // Delete non-word, non-space characters (like @, ., etc.)
            while (i >= 0 && !isWordChar(beforeCursor[i]) && beforeCursor[i] !== ' ') i--;
          }

          const deleteToIndex = i + 1;
          nextValue = beforeCursor.slice(0, deleteToIndex) + afterCursor;
          nextCursorOffset = deleteToIndex;
        } else if (cursorOffset > 0) {
          // Regular backspace - delete single character
          nextValue =
            value.slice(0, cursorOffset - 1) + value.slice(cursorOffset);
          nextCursorOffset--;
        }
      } else if (!key.meta && !key.ctrl) {
        // Regular character input
        nextValue =
          value.slice(0, cursorOffset) + input + value.slice(cursorOffset);
        nextCursorOffset += input.length;
      }

      if (nextValue !== value) {
        onChange(nextValue);
      }
      if (nextCursorOffset !== cursorOffset) {
        setCursorOffset(nextCursorOffset);
      }
    },
    { isActive: focus }
  );

  const displayValue = mask ? mask.repeat(value.length) : value;
  const hasValue = value.length > 0;

  // Render with cursor
  const beforeCursor = displayValue.slice(0, cursorOffset);
  const atCursor = displayValue[cursorOffset] ?? ' ';
  const afterCursor = displayValue.slice(cursorOffset + 1);

  if (!hasValue && placeholder) {
    return (
      <Text>
        <Text inverse> </Text>
        <Text dimColor>{placeholder.slice(1)}</Text>
      </Text>
    );
  }

  return (
    <Text>
      {beforeCursor}
      <Text inverse>{atCursor}</Text>
      {afterCursor}
    </Text>
  );
}
