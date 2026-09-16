/**
 * Менеджер общих AudioContext для оптимизации нагрузки на pulse-audio
 * Группирует сессии по outputId (устройству вывода) и использует один AudioContext на группу
 */

interface AudioContextInfo {
  audioContext: AudioContext
  sinkId: string | null
  activeSessions: Set<string> // Set<sessionId> для отслеживания активных сессий
}

// Глобальная карта: outputId -> AudioContextInfo
const audioContextsMap = new Map<string, AudioContextInfo>()

/**
 * Получить или создать AudioContext для указанного outputId
 * @param outputId - ID устройства вывода аудио
 * @param sessionId - ID сессии для отслеживания использования
 * @returns AudioContext
 */
export async function getSharedAudioContext (outputId: string, sessionId: string): Promise<AudioContext> {
  // Используем 'default' если outputId не указан
  const key = outputId || 'default'
  
  let contextInfo = audioContextsMap.get(key)
  
  // Создаем новый AudioContext если его еще нет
  if (!contextInfo) {
    const audioContext = new AudioContext()
    contextInfo = {
      audioContext,
      sinkId: null,
      activeSessions: new Set(),
    }
    audioContextsMap.set(key, contextInfo)
  }
  
  // Добавляем сессию в список активных
  contextInfo.activeSessions.add(sessionId)
  
  // Устанавливаем sinkId если он еще не установлен или изменился
  if (contextInfo.sinkId !== outputId && 'setSinkId' in AudioContext.prototype) {
    try {
      await (contextInfo.audioContext as unknown as { setSinkId: (id: string) => Promise<void> }).setSinkId(outputId)
      contextInfo.sinkId = outputId
    } catch (e) {
      console.error('Error setting sinkId on shared AudioContext:', e)
    }
  }
  
  // Пробуждаем AudioContext если он в состоянии suspended
  if (contextInfo.audioContext.state === 'suspended') {
    await contextInfo.audioContext.resume()
  }
  
  return contextInfo.audioContext
}

/**
 * Освободить AudioContext когда сессия больше не использует его
 * @param outputId - ID устройства вывода аудио
 * @param sessionId - ID сессии
 */
export async function releaseSharedAudioContext (outputId: string, sessionId: string): Promise<void> {
  const key = outputId || 'default'
  const contextInfo = audioContextsMap.get(key)
  
  if (!contextInfo) {
    return
  }
  
  // Удаляем сессию из списка активных
  contextInfo.activeSessions.delete(sessionId)
  
  // Если больше нет активных сессий, закрываем и удаляем AudioContext
  if (contextInfo.activeSessions.size === 0) {
    try {
      if (contextInfo.audioContext.state !== 'closed') {
        await contextInfo.audioContext.close()
      }
      audioContextsMap.delete(key)
    } catch (e) {
      console.error('Error closing shared AudioContext:', e)
    }
  }
}

/**
 * Получить информацию о текущем состоянии AudioContext
 * @param outputId - ID устройства вывода аудио
 * @returns Информация о контексте или undefined
 */
export function getAudioContextInfo (outputId: string): { sessionCount: number; state: AudioContextState } | undefined {
  const key = outputId || 'default'
  const contextInfo = audioContextsMap.get(key)
  
  if (!contextInfo) {
    return undefined
  }
  
  return {
    sessionCount: contextInfo.activeSessions.size,
    state: contextInfo.audioContext.state,
  }
}

/**
 * Очистить все AudioContext (используется для тестирования или при завершении работы приложения)
 */
export async function clearAllAudioContexts (): Promise<void> {
  const closePromises = Array.from(audioContextsMap.values()).map(async (contextInfo) => {
    try {
      if (contextInfo.audioContext.state !== 'closed') {
        await contextInfo.audioContext.close()
      }
    } catch (e) {
      console.error('Error closing AudioContext during cleanup:', e)
    }
  })
  
  await Promise.all(closePromises)
  audioContextsMap.clear()
}

