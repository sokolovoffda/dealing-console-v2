export type CallCardEditableTextState = {
  value: string
  selectionStart: number | null
  selectionEnd: number | null
}

export type CallCardTextSelectionPayload = {
  selectionStart?: number | null
  selectionEnd?: number | null
}

export type CallCardTextSelection = {
  selectionStart: number | null
  selectionEnd: number | null
}

export const clampTextPosition = (
  position: number,
  value: string,
): number =>
  Math.min(value.length, Math.max(0, position))

export const setTextSelection = (
  state: CallCardEditableTextState,
  payload: CallCardTextSelection,
): CallCardEditableTextState => {
  const selectionStart = payload.selectionStart === null
    ? null
    : clampTextPosition(payload.selectionStart, state.value)
  const selectionEnd = payload.selectionEnd === null
    ? selectionStart
    : clampTextPosition(payload.selectionEnd, state.value)

  return {
    ...state,
    selectionStart,
    selectionEnd,
  }
}

export const insertText = (
  state: CallCardEditableTextState,
  value: string,
  payload?: CallCardTextSelectionPayload,
): CallCardEditableTextState => {
  const selectionStart = payload?.selectionStart
    ?? state.selectionStart
    ?? state.value.length
  const selectionEnd = payload?.selectionEnd
    ?? state.selectionEnd
    ?? selectionStart
  const start = clampTextPosition(selectionStart, state.value)
  const end = clampTextPosition(selectionEnd, state.value)
  const nextCursorPosition = start + value.length

  return {
    value: `${state.value.slice(0, start)}${value}${state.value.slice(end)}`,
    selectionStart: nextCursorPosition,
    selectionEnd: nextCursorPosition,
  }
}

export const backspaceText = (
  state: CallCardEditableTextState,
): CallCardEditableTextState => {
  const selectionStart = state.selectionStart ?? state.value.length
  const selectionEnd = state.selectionEnd ?? selectionStart
  const start = clampTextPosition(selectionStart, state.value)
  const end = clampTextPosition(selectionEnd, state.value)

  if (start !== end) {
    return {
      value: `${state.value.slice(0, start)}${state.value.slice(end)}`,
      selectionStart: start,
      selectionEnd: start,
    }
  }

  if (start === 0) return state

  return {
    value: `${state.value.slice(0, start - 1)}${state.value.slice(start)}`,
    selectionStart: start - 1,
    selectionEnd: start - 1,
  }
}

export const clearText = (): CallCardEditableTextState => ({
  value: '',
  selectionStart: null,
  selectionEnd: null,
})
