import { Ref, ref } from 'vue'

export const hasMicrophonePermission: Ref<boolean> = ref<boolean>(false)

export async function checkMicrophonePermission (): Promise<void> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    if (stream) {
      hasMicrophonePermission.value = true
    }
  } catch (e) {
    hasMicrophonePermission.value = false
  }
}
