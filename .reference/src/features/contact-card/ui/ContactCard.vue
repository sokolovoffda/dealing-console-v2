<template>
  <section
    :data-presence="presence"
    :data-self-status="selfStatus"
    :data-subscriber-status="subscriberStatus"
    :data-device-side="deviceSide"
    :data-device-kind="deviceKind"
    :data-pinned-session="isPinnedSession"
    :data-call-disabled="isCallDisabled || undefined"
    :data-movable="isMovingSource || undefined"
    tabindex="0"
    class="relative flex min-h-29 items-start select-none gap-2 overflow-hidden rounded-12 transition-colors p-4"
    :class="[
      tone.root,
      canUseNeutconInteraction ? CONTACT_CARD_NEUTCON_INTERACTION_CLASSES : undefined,
      {
        'cursor-pointer': (!isEditMode && hasCallAction) || isMoveMode,
      },
    ]"
    @click="handleCardClick"
  >
    <context-menu
      v-if="isEditMode"
      v-bind="menuProps"
      @close="closeMenu"
    />
    <div
      v-if="showSubscriberIconColumn"
      class="flex w-12 shrink-0 flex-col items-center gap-2"
    >
      <div class="flex h-12 w-12 items-center justify-center">
        <wui-icon
          :name="tone.primaryIcon.name"
          :class="tone.primaryIcon.class"
          class="h-12! w-12! [&_svg]:h-full! [&_svg]:w-full!"
          data-test="contact-primary-icon"
        />
      </div>
      <div
        v-if="tone.subscriberIcon"
        class="flex h-6 w-12 items-center justify-center"
      >
        <wui-icon
          :name="tone.subscriberIcon.name"
          :class="tone.subscriberIcon.class"
          class="h-6! w-6! [&_svg]:h-full! [&_svg]:w-full!"
          data-test="contact-subscriber-icon"
        />
      </div>
    </div>
    <div
      v-else
      class="flex h-12 w-12 shrink-0 items-center justify-center"
    >
      <wui-icon
        :name="tone.primaryIcon.name"
        :class="tone.primaryIcon.class"
        class="h-12! w-12! [&_svg]:h-full! [&_svg]:w-full!"
        data-test="contact-primary-icon"
      />
    </div>
    <div class="flex min-w-0 flex-1 flex-col">
      <div class="flex min-h-12 items-center gap-2">
        <p class="min-w-0 flex-1 truncate" :class="[contactNumberTypographyClass, tone.number]">
          {{ contactNumber }}
        </p>
        <div
          v-if="isEditMode"
          class="shrink-0"
          @click.stop
        >
          <wui-btn
            icon
            text
            rounded
            :size="48"
            prepend-icon="kebabHorizontalM"
            class="bg-transparent! transition-colors hover:bg-btn-neut-soft-bg-hov! text-card-neutcon-menu-def!"
            data-test="contact-card-menu-toggle"
            @click.stop="openMenu($event)"
          />
        </div>
      </div>
      <p class="truncate" :class="[CONTACT_CARD_TYPOGRAPHY.name, tone.name]">
        {{ contactName }}
      </p>
    </div>
  </section>
</template>

<script lang="ts" setup>
import { WuiBtn, WuiIcon } from '@wui/common-library'
import { computed, watch } from 'vue'

import type { Contact } from '@/entities/contact'

import { ContextMenu, useContextMenu } from '@/shared/ui'
import type { ContextMenuItem } from '@/shared/ui'

import {
  CONTACT_CARD_NEUTCON_INTERACTION_CLASSES,
  CONTACT_PRESENCES,
  getContactCardTone,
} from '../model/contact-card-tone'
import {
  CONTACT_CARD_TYPOGRAPHY,
  getContactCardNumberTypography,
} from '../model/contact-card-typography'
import { useContactCardCall } from '../model/use-contact-card-call'
import { useContactCardStatus } from '../model/use-contact-card-status'

const props = withDefaults(defineProps<{
  user: Contact
  isEditMode?: boolean
  hasMultipleGroups?: boolean
  isMoveMode?: boolean
  isMovingSource?: boolean
  /** Перемещение внутри сетки (ПБВ / AM reorder). */
  enableMoveInside?: boolean
  /** Удаление из меню. */
  enableDelete?: boolean
  /** Блокировать новый звонок при offline BLF (Activity Monitor). */
  requireOnlineForCall?: boolean
  /**
   * Online/offline и subscriber-иконка по BLF.
   * ПБВ: false (подписки нет — иначе все карточки серые).
   * Монитор активности: true.
   */
  enablePresenceVisual?: boolean
}>(), {
  isEditMode: false,
  hasMultipleGroups: false,
  isMoveMode: false,
  isMovingSource: false,
  enableMoveInside: true,
  enableDelete: true,
  requireOnlineForCall: false,
  enablePresenceVisual: false,
})

const emit = defineEmits<{
  select: []
  moveInsideGroup: []
  moveToGroup: []
  duplicateToGroup: []
  delete: []
}>()

const contact = computed(() => props.user)
const {
  presence,
  selfStatus,
  subscriberStatus,
  deviceSide,
  deviceKind,
  isPinnedSession,
} = useContactCardStatus(contact)
const { hasCallAction, toggleCall } = useContactCardCall(contact, {
  requireOnlineForCall: () => props.requireOnlineForCall,
})

// В edit mode оставляем обычный/self тон — там клик не звонок, а меню/перенос.
const isCallDisabled = computed(() => !props.isEditMode && !hasCallAction.value)

/** Для тона: без BLF-визуала считаем online (как раньше в ПБВ). */
const tonePresence = computed(() => {
  return props.enablePresenceVisual ? presence.value : CONTACT_PRESENCES.online
})

const toneSubscriberStatus = computed(() => {
  return props.enablePresenceVisual ? subscriberStatus.value : null
})

const tone = computed(() => getContactCardTone(undefined, {
  presence: tonePresence.value,
  selfStatus: selfStatus.value,
  subscriberStatus: toneSubscriberStatus.value,
  deviceSide: deviceSide.value,
  deviceKind: deviceKind.value,
  isPinnedSession: isPinnedSession.value,
  // Presence/offline уже даёт серый тон; disabled не должен перекрывать online в AM.
  disabled: props.enablePresenceVisual ? false : isCallDisabled.value,
  movable: props.isMovingSource,
}))

/** Двухрядная колонка иконок только в AM при наличии subscriber-иконки; ПБВ — как fix-for-qa. */
const showSubscriberIconColumn = computed(() => {
  return props.enablePresenceVisual && Boolean(tone.value.subscriberIcon)
})

// hov/foc/pres только для neutcon online base: не для offline, disabled, movable и self.
const canUseNeutconInteraction = computed(() => {
  return !isCallDisabled.value
    && !props.isMovingSource
    && !selfStatus.value
    && tonePresence.value === CONTACT_PRESENCES.online
})

const contactNumber = computed(() => {
  return props.user.internalNumber || props.user.mobilePhone || props.user.email || props.user.pServed
})

const contactNumberTypographyClass = computed(() => getContactCardNumberTypography(contactNumber.value))

const contactName = computed(() => {
  return props.user.name
})

const menuItems = computed<ContextMenuItem[]>(() => {
  const items: ContextMenuItem[] = []

  if (props.hasMultipleGroups) {
    items.push(
      {
        label: 'Переместить в другую группу',
        icon: 'layoutSetM',
        dataTest: 'contact-card-menu-move-to-group',
        onClick: () => emit('moveToGroup'),
      },
      {
        label: 'Дублировать в другую группу',
        icon: 'userAddM',
        dataTest: 'contact-card-menu-duplicate-to-group',
        onClick: () => emit('duplicateToGroup'),
      },
    )
  }

  if (props.enableMoveInside) {
    items.push({
      label: 'Переместить',
      icon: 'chevronRightLgM',
      dataTest: 'contact-card-menu-move-inside',
      onClick: () => emit('moveInsideGroup'),
    })
  }

  if (props.enableDelete) {
    items.push({
      label: 'Удалить',
      icon: 'trashM',
      iconClass: 'text-comp-menu-item-icon-base-neg',
      border: items.length > 0 ? 'top' : undefined,
      dataTest: 'contact-card-menu-delete',
      onClick: () => emit('delete'),
    })
  }

  return items
})

const {
  menuProps,
  open: openMenu,
  close: closeMenu,
} = useContextMenu({
  items: menuItems,
  anchorMode: 'cursor',
})

watch(() => props.isEditMode, (isEditMode) => {
  if (!isEditMode) {
    closeMenu()
  }
})

const handleCardClick = () => {
  if (props.isEditMode) {
    if (props.isMoveMode) {
      emit('select')
    }

    return
  }

  if (!hasCallAction.value) return

  toggleCall()
}
</script>
