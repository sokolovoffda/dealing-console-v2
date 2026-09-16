export const useWebLocation = () => {
  const getWebSocketProtocol = (): 'ws:' | 'wss:' => {
    return location.protocol === 'http:' ? 'ws:' : 'wss:'
  }

  return {
    getWebSocketProtocol,
  }
}
