<template>
  <!-- <section
    v-touch.long="{
      start: onLongPressStart,
      end: onLongPressEnd
    }"
    class="relative flex cursor-pointer select-none overflow-hidden w-full min-h-[116px] gap-4 px-4 py-4 rounded-[12px]"
    }" -->
  <section 
    :class="[
      cardClasses,
      { 'ready-to-add': isReadyToAdd },
      { 'is-selected': cardSelected },
      { '!cursor-not-allowed': isActiveConfFromTetATetCollecting && cardSelected }
    ]"
    @click="onClick"
  >
    <div :class="iconContainerClasses">
      <template v-if="groupIdx !== undefined">
        <div class="bg-black-600 w-6 h-6 text-white text-center rounded-4 mb-2">
          {{ groupIdx }}
        </div>
        <div>
          <wui-icon name="phoneCall" class="text-white" xlarge />
        </div>
      </template>
      <template v-else>
        <wui-icon :name="iconStyles.name" :class="iconStyles.class" xlarge />
      </template>
    </div>
    <template v-if="isLine && status">
      <div class="min-w-0 flex-1 ">
        <div class="flex items-center gap-2">
          <p class="text-white text-2xl ">{{ user.internalNumber || user.mobilePhone || $t('NoData') }}</p>
        </div>
        <p class="text-white text-xl truncate max-w-220 opacity-60 mt-3">{{ getByInternalNumber(status.internalNumber)?.name || $t('NoName') }}</p>
        <p class="card-info">{{ getByInternalNumber(status.fromNumber ?? status.targetNumber ?? '')?.name || '' }}</p>
      </div>
    </template>
    <template v-else>
      <div class="min-w-0 flex-1 ">
        <div class="flex items-center gap-2">
          <p class="text-white text-2xl ">{{ user.internalNumber || user.mobilePhone || $t('NoData') }}</p>
          <span
            v-if="showPinnedSlotIndex && pinnedCall"
            class="text-1214 leading-none px-1 py-0.5 rounded-4 bg-black-600 text-white shrink-0"
          >
            {{ pinnedCall.slotIndex }}
          </span>
        </div>
        <p class="text-white text-xl truncate max-w-220 opacity-60 mt-3">{{ user.name || $t('NoName') }}</p>
        <!-- <p class="card-info">{{ user.organizationalUnit || user.position || '' }}</p> -->
      </div>
    </template>
    <div
      v-if="groupContactsStore.isEditMode && readyToRemoveFromGroup"
      class="absolute inset-0 flex items-center justify-center rounded-8 text-white bg-black-800/80"
      data-test="remove-from-group-overlay"
    >
      <wui-icon name="remove" large />
    </div>

    <!-- Контекстное меню -->
    <teleport to="body">
      <div
        v-if="contextMenuVisible"
        class="context-menu"
        :style="{ left: contextMenuPosition.x + 'px', top: contextMenuPosition.y + 'px' }"
        @click.stop
      >
        <ul class="context-menu-list">
          <li @click="onAdd">Добавить</li>
          <li @click="onEdit">Редактировать</li>
          <li @click="onDelete">Удалить</li>
        </ul>
        <div class="context-menu-backdrop" @click="closeContextMenu" />
      </div>
    </teleport>
  </section>
</template>

<script lang="ts" setup>
import { IconName, UserInfo, WuiIcon } from '@wui/common-library'
import { storeToRefs } from 'pinia'
import { computed, ref, Ref } from 'vue'

import { CallManagerState, useCallManagerState } from '@/widgets/call-manager'

import { useCreateConferenceFromTetATet } from '@/features/create-conference-from-tet-a-tet'
import { useReferCallState } from '@/features/refer-call'

import { type PinnedCall, STATE, usePinnedCallsStore, useSessionStore, selectContact } from '@/entities/call-session'
import { useConferenceDraft } from '@/entities/conference'
import { Contact, SubscriberStatus, CallStatusState, useContactStore } from '@/entities/contact'
import { useGroupContactsStore } from '@/entities/group-contacts'

import { useAppStore } from '@/shared/composables'


type ContactStatus = 'offline' | 'online' | 'in-call' | 'in-call-self' | 'ringing' | 'ringing-self' | 'hold'

interface IconStyle {
  name: IconName
  class: string
}

const props = defineProps<{
  user: Contact | UserInfo
  status?: SubscriberStatus
  groupIdx?: number
  isLine?: boolean
  pinnedCall?: PinnedCall | null
  showPinnedSlotIndex?: boolean
}>()

const { currentUser } = storeToRefs(useAppStore())
const groupContactsStore = useGroupContactsStore()
const { isActive: isActiveConfCollecting, conferenceDraft } = useConferenceDraft()
const { creating: isActiveConfFromTetATetCollecting, contacts } = useCreateConferenceFromTetATet()
const { selectedReferType } = useReferCallState()
const { getByInternalNumber } = useContactStore()
const pinnedCallsStore = usePinnedCallsStore()
const { ringingSessions, getSessionById } = useSessionStore()
const { setCallManagerState } = useCallManagerState()
const { selected, selectedStatusLine } = useCallManagerState()
const { activePinnedCall } = storeToRefs(pinnedCallsStore)

const readyToRemoveFromGroup = ref<boolean>(false)
const contextMenuVisible = ref(false)
const contextMenuPosition = ref({ x: 0, y: 0 })
const pinnedSession = computed(() => {
  return props.pinnedCall?.sessionId ? getSessionById(props.pinnedCall.sessionId) : undefined
})

const cardSelected = computed(() =>
  props.isLine
    ? selectedStatusLine.value?.callId === props.status?.callId
    : props.pinnedCall
      ? activePinnedCall.value?.order === props.pinnedCall.order
      : selected.value?.pServed === ((props.user as Contact)?.pServed || props.user.imLogin),
)

const isSelectedForNewConf = computed(() => {
  return conferenceDraft.value?.subscribers?.find(({ phoneNumber }) => phoneNumber === props.user.internalNumber)
})

const isSelectedForNewConfFromTetATet = computed(() => {
  let res = false
  for (const { internalNumber } of contacts.value.values()) {
    if (internalNumber === props.user?.internalNumber) {
      res = true
      break
    }
  }
  return res
})

const isReadyToAdd = computed(() =>
  (isActiveConfFromTetATetCollecting.value && !isSelectedForNewConfFromTetATet.value) ||
    (isActiveConfCollecting.value && !isSelectedForNewConf.value) ||
    selectedReferType.value,
)

const contactStatus = computed<ContactStatus>(() => {
  if (!props.isLine && props.pinnedCall) {
    if (pinnedSession.value) {
      switch (pinnedSession.value.sessionState.value) {
      case STATE.CONNECTED:
        return 'in-call-self'
      case STATE.ONHOLD:
        return 'hold'
      case STATE.PROGRESS:
        return 'ringing-self'
      case STATE.RINGING:
        return 'ringing'
      }
    }

    if (!props.status?.registered) return 'offline'
    return 'online'
  }

  if (!props.status?.registered) return 'offline'
  let result: ContactStatus
  const isLocal = props.status.local && props.status.local !== CallStatusState.TERMINATED
  let preferredStatus = isLocal ? props.status.local : props.status.remote
  const fromNumber = props.status.fromNumber
  const targetNumber = props.status.targetNumber

  switch (preferredStatus) {
  case CallStatusState.CONFIRMED:
    const foundInIncomingSessions = ringingSessions.value.find(s => s.contact?.internalNumber === props.user.internalNumber)
    if (foundInIncomingSessions) {
      result = 'ringing-self'
    } else if (targetNumber === currentUser?.value?.internalNumber || fromNumber === currentUser?.value?.internalNumber) {
      result = 'in-call-self'
    } else {
      result = 'in-call'
    }
    break
  case CallStatusState.EARLY:
    if (fromNumber === currentUser.value?.internalNumber) {
      result = 'ringing-self'
    } else {
      result = 'ringing'
    }
    break
  case CallStatusState.HOLD:
    result = 'hold'
    break
  default:
    result = 'online'
  }
  return result
})

const direction = computed(() => {
  if (!props.status?.registered) return undefined
  return props.status.fromNumber ? 'incoming' : 'outgoing'
})



const iconContainerClasses = computed(() => {
  if (props.isLine) {
    return ''
  }

  return 'flex h-10 w-10 shrink-0 items-start justify-center'
})

const cardClasses: Ref<string> = computed(() => {
  switch (contactStatus.value) {
  case 'offline': return 'contact-card-state-offline'
  case 'online': return 'contact-card-state-online'
  case 'ringing': return 'contact-card-state-ringing'
  case 'ringing-self': return 'contact-card-state-ringing-self'
  case 'in-call': return 'contact-card-state-in-call'
  case 'in-call-self': return 'contact-card-state-in-call-self'
  case 'hold': return 'contact-card-state-hold'
  default: return 'online'
  }
})

const iconStyles: Ref<IconStyle> = computed(() => {
  const directionIcon = direction.value === 'incoming' ? 'callIncoming' : (direction.value === 'outgoing' ? 'callOutgoing' : 'phoneCall')
  switch (contactStatus.value) {
  case 'offline': return { name: 'user', class: 'text-black-600' }
  case 'online': return { name: 'user', class: 'text-black-400' }
  case 'ringing': return { name: directionIcon, class: 'text-positive' }
  case 'ringing-self': return { name: directionIcon, class: 'text-black' }
  case 'in-call': return { name: directionIcon, class: 'text-positive' }
  case 'in-call-self': return { name: 'phoneCall', class: 'text-black' }
  case 'hold': return { name: 'callPaused', class: 'text-threshold' }
  default: return { name: 'user', class: 'text-black-400' }
  }
})

// === Обработчики long press ===
function onLongPressStart (event: TouchEvent | MouseEvent) {
  const touch = 'touches' in event ? event.touches[0] : event
  let x = touch.clientX
  let y = touch.clientY

  // Корректировка позиции, чтобы не выйти за экран
  const menuWidth = 180
  const menuHeight = 120
  if (x + menuWidth > window.innerWidth) x = window.innerWidth - menuWidth - 10
  if (y + menuHeight > window.innerHeight) y = window.innerHeight - menuHeight - 10

  contextMenuPosition.value = { x, y }
  contextMenuVisible.value = true
}

function onLongPressEnd () {
  // Можно ничего не делать — закрытие по клику мимо
}

function closeContextMenu () {
  contextMenuVisible.value = false
}

function onAdd () {
  // Добавь свою логику
  closeContextMenu()
}

function onEdit () {
  // Добавь свою логику
  closeContextMenu()
}

function onDelete () {
  // Добавь свою логику
  closeContextMenu()
}

const onClick = () => {
  if (contextMenuVisible.value) return // Если меню открыто — игнорируем клик

  // Логика клика как раньше
  if (props.isLine) {
    if (['in-call-self', 'ringing-self'].includes(contactStatus.value)) {
      console.debug('Невозможно открыть карточку линии абонента. Разговор с нами...')
    } else if (contactStatus.value === 'ringing-self') {
      console.debug('Невозможно открыть карточку линии абонента. Звонок нам...' )
    } else if (isActiveConfCollecting.value) {
      console.debug('Невозможно открыть карточку линии абонента. Выполняется операция создания конференции...')
    } else if (selectedReferType.value) {
      console.debug('Невозможно открыть карточку линии абонента. Выполняется операция перевода вызова...')
    } else if (isActiveConfFromTetATetCollecting.value) {
      console.debug('Невозможно открыть карточку линии абонента. Выполняется операция создания конференции из сессии...')
    } else {
      setCallManagerState(CallManagerState.CONTACT_INTERCEPTION, props.status)
    }
    return
  }

  if (groupContactsStore.isEditMode && !readyToRemoveFromGroup.value) {
    readyToRemoveFromGroup.value = true
    return
  }

  if (groupContactsStore.isEditMode && props.groupIdx !== undefined && props.pinnedCall) {
    groupContactsStore.removeContact(props.groupIdx, props.pinnedCall)
    readyToRemoveFromGroup.value = false
    return
  }

  if (props.pinnedCall) {
    pinnedCallsStore.setActivePinnedCall(props.pinnedCall)
    return
  }

  selectContact(props.user as Contact)
}
</script>

<style scoped>


.contact-card-state-online {
  border: 1px solid var(--color-black-600);
  background-color: var(--color-black-800);
  &:hover { background-color: var(--color-black-735); }
}
.contact-card-state-offline {
  border: 1px solid var(--color-black-600);
  background-color: var(--color-black-800);
  &:hover { background-color: var(--color-black-735); }
}
.contact-card-state-ringing-self,
.contact-card-state-hold {
  border: 1px solid var(--color-threshold);
  background-color: var(--color-black-800);
}
.contact-card-state-ringing {
  border: 1px solid var(--color-positive);
  background-color: var(--color-black-800);
}
.contact-card-state-in-call {
  border: 1px solid var(--color-positive);
  background-color: var(--color-black-800);
}
.contact-card-state-in-call-self {
  border: 1px solid var(--color-positive-tints-800);
  background-color: var(--color-positive);
  & * { color: #000; }
}
.ready-to-add {
  outline: 1px solid #fff;
  cursor: pointer;
}

.ready-to-remove-from-group {
  position: absolute;
  display: flex;
  width: 100%;
  height: 100%;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-8);
  background-color: rgb(51 51 51 / 80%);
  color: #fff;
}



.context-menu {
  position: fixed;
  z-index: 10000;

  .context-menu-list {
    background: white;
    border: 1px solid #ddd;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    list-style: none;
    margin: 0;
    padding: 8px 0;
    min-width: 160px;

    li {
      padding: 10px 16px;
      cursor: pointer;
      font-size: 14px;
      color: #333;
      transition: background 0.2s;

      &:hover {
        background: #f5f5f5;
      }
    }
  }

  .context-menu-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: -1;
  }
}
</style>
