<template>
  <tr class="table__row">
    <!-- Вкл. -->
    <td class="table__cell text-center">
      <wui-btn
        prepend-icon="power"
        icon
        text
        rounded
        :class="[model.enabled ? '!text-positive' : '!text-black-700']"
        class="mx-auto hover:!bg-black"
        data-test="enable-button"
        @click="model.enabled = !model.enabled"
      />
    </td>
    <!-- Приоритет -->
    <td class="table__cell">
      <div v-if="!notShowPriority" data-test="priority" class="flex">
        <wui-btn
          prepend-icon="select"
          icon
          text
          rounded
          class="mr-3 !h-6 !w-6 -rotate-180"
          :class="[isUpPriorityDisabled ? '!text-black-600' : '!text-black-135 hover:!bg-black cursor-pointer']"
          :disabled="isUpPriorityDisabled"
          @click="changePriority('up', list[index], list[index - 1])"
        />
        <wui-btn
          prepend-icon="select"
          icon
          rounded
          text
          class="!h-6 !w-6 hover:!bg-black-700"
          :class="[isDownPriorityDisabled ? '!text-black-600' : '!text-black-135 hover:!bg-black-700 cursor-pointer']"
          :disabled="isDownPriorityDisabled"
          @click="changePriority('down', list[index], list[index + 1])"
        />
      </div>
    </td>
    <!-- Сервис -->
    <td class="table__cell">
      <wui-select
        v-model="model.service.key"
        :items="servicesList"
        class="app-select" small
        :class="{'shake-animation outline outline-[1px] outline-warning-shades-500': fieldsWithErrors.has('service')}"
      />
    </td>
    <!-- Условие -->
    <td class="table__cell">
      <div class="flex items-center">
        <span v-if="currentCondition !== ForwardingConditions.ALL">
          {{ conditionsLabelsMap[model.condition] }}
        </span>
        <div v-else>
          <wui-select
            v-model="model.condition"
            :items="conditions"
            class="app-select" small
            data-test="conditions"
          />
        </div>
        <div
          v-if="model.condition === ForwardingConditions.NO_ANSWER"
          class="ml-3 flex items-center justify-between"
          data-test="timeout"
        >
          <wui-icon name="clock" class="mr-3" />
          <wui-input
            v-model="model.timeout"
            type="number" small
            class="app-input w-12 number-input number-input--without-arrows"
            :class="{'shake-animation outline outline-[1px] outline-warning-shades-500': fieldsWithErrors.has('timeout')}"
            @focus="editInModal('timeout')"
          />
        </div>
      </div>
    </td>
    <!-- A-номер -->
    <td class="table__cell">
      <div class="flex items-center">
        <wui-input
          v-model="model.aNumber"
          inputmode="tel"
          class="app-input number-input w-24 number-input--without-arrows" small
          :class="{'shake-animation outline outline-[1px] outline-warning-shades-500': fieldsWithErrors.has('aNumber')}"
          data-test="incoming-call-handling-list-item-forward-number"
          @focus="editInModal('aNumber')"
        />
        <wui-dropdown close-on-click-outside direction="left-bottom">
          <template #activator="{ toggle }">
            <!-- Иконка юзера -->
            <div class="flex h-full items-center">
              <wui-btn
                prepend-icon="person"
                icon
                text
                rounded
                class="ml-1 !text-black-135 hover:!bg-black"
                @click.prevent="toggle"
              />
            </div>
          </template>
          <template #default="{ close, isActive }">
            <!-- Выпадающий список контактов -->
            <div class="flex h-64 w-60 flex-col justify-center rounded-8 bg-black-735 p-2 border border-black-865">
              <small-contacts-list
                v-if="isActive"
                @click="close"
                @select-contact="($event) => onSelectContact('aNumber', $event)"
              />
            </div>
          </template>
        </wui-dropdown>
      </div>
    </td>
    <!-- Номер переадресации -->
    <td class="table__cell">
      <div class="flex items-center">
        <template v-if="!scenarios && model.service.value === FORWARD">
          <wui-input
            v-model="model.forwardNumber"
            inputmode="tel"
            class="app-input number-input w-24 number-input--without-arrows" small
            :class="{'shake-animation outline outline-[1px] outline-warning-shades-500': fieldsWithErrors.has('forwardNumber')}"
            data-test="incoming-call-handling-list-item-forward-number"
            @focus="editInModal('forwardNumber')"
          />
          <wui-dropdown close-on-click-outside direction="left-bottom">
            <template #activator="{ toggle }">
              <!-- Иконка юзера -->
              <div class="flex h-full items-center">
                <wui-btn
                  prepend-icon="person"
                  icon
                  text
                  rounded
                  class="ml-1 !text-black-135 hover:!bg-black"
                  @click.prevent="toggle"
                />
              </div>
            </template>
            <template #default="{ close, isActive }">
              <!-- Выпадающий список контактов -->
              <div class="flex flex-col justify-center rounded-8 bg-black-735 p-2 border border-black-865">
                <small-contacts-list
                  v-if="isActive"
                  @click="close"
                  @select-contact="($event) => onSelectContact('forwardNumber', $event)"
                />
              </div>
            </template>
          </wui-dropdown>
        </template>

        <template v-else-if="scenarios">
          <wui-select
            v-model="model.scenario.key as string"
            class="app-select" small
            :class="{'shake-animation outline outline-[1px] outline-warning-shades-500': fieldsWithErrors.has('scenario')}"
            :items="scenarios"
          />
        </template>
      </div>
    </td>
    <!-- Действие -->
    <td class="table__cell flex justify-center min-w-[90px]">
      <wui-btn
        v-if="isDirty || isNewCreateRule"
        icon
        :prepend-icon="isForwardingSaving ? 'animatedLoaderWheel' : 'saveBlack'"
        rounded
        text
        class="!text-positive-shades-900 hover:!bg-black"
        :disabled="isForwardingSaving"
        @click="onClickSave"
      />

      <wui-btn
        prepend-icon="deleteOutlined"
        icon
        text
        rounded
        class="!text-warning-shades-900 hover:!bg-black"
        data-test="remove"
        @click="emit('remove')"
      />
    </td>
  </tr>
</template>

<script lang="ts" setup>
import {
  WuiBtn,
  WuiIcon,
  WuiSelect,
  WuiInput,
  WuiDropdown,
  useDialog,
} from '@wui/common-library'
import { storeToRefs } from 'pinia'
import { ref, computed, watch, onBeforeMount, ComputedRef, Ref, toRef, ComponentOptions } from 'vue'

import { SmallContactsList } from '@/features/small-contacts-list'

import { Contact } from '@/entities/contact'
import { useEnvSettingsStore } from '@/entities/env-settings'
import {
  useForwardingSettingsStore,
  ForwardingConditions, Forwarding, Condition,
} from '@/entities/forwarding-settings'

import { useLocalization } from '@/shared/i18n'
import { KeyboardWithTextModal } from '@/shared/ui'

const emit = defineEmits<{
  (event: 'save', value: Forwarding, onCompleted: () => void): void;
  (event: 'remove'): void;
}>()

const props = withDefaults(defineProps<{
  isNewCreateRule: boolean,
  modelValue: Forwarding,
  currentCondition: ForwardingConditions,
  index: number,
  list?: Forwarding[],
  notShowPriority?: boolean
}>(), {
  list: () => [],
})

const { t } = useLocalization()

const conditions = computed<Condition[]>(() => [
  { value: ForwardingConditions.UNCONDITIONAL, label: t('Undoubtedly') },
  { value: ForwardingConditions.NO_ANSWER, label: t('ByNonResponse') },
  { value: ForwardingConditions.BUSY, label: t('ByEmployment') },
  { value: ForwardingConditions.UNREACHABLE, label: t('DueToUnavailability') },
]) 

const conditionsLabelsMap = computed<{[key in ForwardingConditions]?: string}>(() => ({
  [ForwardingConditions.UNCONDITIONAL]: t('Undoubtedly'),
  [ForwardingConditions.NO_ANSWER]: t('ByNonResponse'),
  [ForwardingConditions.BUSY]: t('ByEmployment'),
  [ForwardingConditions.UNREACHABLE]: t('DueToUnavailability'),
}))

const FORWARD = 'Forward'

const forwardingSettingsStore = useForwardingSettingsStore()
const { changePriority } = forwardingSettingsStore
const { subscriberServices, servicesList } = storeToRefs(forwardingSettingsStore)

const isForwardingSaving = ref(false)

const originalModel: Ref<Forwarding> = ref(JSON.parse(JSON.stringify(props.modelValue)))
const model = toRef(props, 'modelValue')

const isDirty = computed(() => {
  return JSON.stringify(originalModel.value) !== JSON.stringify(model.value)
})

const { getSettingByKey } = useEnvSettingsStore()

const timeout = computed(() => {
  const setting = getSettingByKey('NoAnswerForwardTimer')
  if (setting) {
    return setting.value
  }

  return null
})

onBeforeMount(() => {
  if (!model.value.service.key && !model.value.service.value) { // при добавлении правила
    if (servicesList.value?.length && subscriberServices.value.get(servicesList.value[0].value)) {
      model.value.service.key = servicesList.value[0].value
      model.value.service.value = subscriberServices.value.get(servicesList.value[0].value) as string
    }
  }

  if (timeout.value && !model.value.timeout && model.value.condition === 'noAnswer') {
    model.value.timeout = timeout.value
  }
})

const isUpPriorityDisabled: ComputedRef<boolean | undefined> = computed(() => {
  return props.list && (props.index === 0)
})

const isDownPriorityDisabled: ComputedRef<boolean | undefined> = computed(() => {
  return (props.list && props.index !== undefined) && (props.index + 1 === props.list.length)
})

const scenarios = computed(() => {
  return forwardingSettingsStore.getScenariosList(model.value.service.key)
})

const onClickSave = () => {
  if(validate(model.value, true)) {
    isForwardingSaving.value = true
    emit('save', model.value, () => {
      isForwardingSaving.value = false
      originalModel.value = JSON.parse(JSON.stringify(model.value))

      if(props.isNewCreateRule) {
        emit('remove')
      }
    })
  }
}

const onSelectContact = (field: 'aNumber' | 'forwardNumber', contact: Contact) => {
  if (!contact?.internalNumber) return
  if(field === 'aNumber') model.value.aNumber = contact.internalNumber
  if(field === 'forwardNumber') model.value.forwardNumber = contact.internalNumber
}

const fieldsWithErrors = ref(new Set<string>())

function validate (item: Forwarding, needVisualize = false): boolean {
  const FOLLOW_ME = 'FollowMe'
  const IVR = 'IVR'
  const NO_ANSWER = 'noAnswer'
  const FORWARD = 'Forward'

  let result = true

  if (!item.aNumber) {
    if (needVisualize) fieldsWithErrors.value.add('aNumber')
    result = false
  } else {
    fieldsWithErrors.value.delete('aNumber')
  }

  if ((item.service?.value === FOLLOW_ME || item.service?.value === IVR) && !item.scenario?.key) {
    if (needVisualize) fieldsWithErrors.value.add('scenario')
    result = false
  } else {
    fieldsWithErrors.value.delete('scenario')
  }

  if (item.condition === NO_ANSWER && (!item.timeout || (+item.timeout > 99 || +item.timeout < 0))) {
    if (needVisualize) fieldsWithErrors.value.add('timeout')
    result = false
  } else {
    fieldsWithErrors.value.delete('timeout')
  }

  const isNotExistForwardNumber = item.service?.value === FORWARD && !item.forwardNumber
  if (item.enabled && isNotExistForwardNumber) {
    if (needVisualize) fieldsWithErrors.value.add('forwardNumber')
    result = false
  } else {
    fieldsWithErrors.value.delete('forwardNumber')
  }

  return result
}

watch(
  () => model.value.service.key,
  () => {
    model.value.service.value = subscriberServices.value.get(model.value.service.key) as string
    model.value.scenario.key = null
    model.value.scenario.value = null
  },
)

watch(() => model.value.condition, (v) => {
  if (v === 'noAnswer') {
    if (timeout.value) {
      model.value.timeout = timeout.value
    }
  } else {
    model.value.timeout = ''
  }
})

const { showDialog } = useDialog()

const editInModal = (fieldName: keyof Forwarding) => {
  showDialog(KeyboardWithTextModal as ComponentOptions, {
    value: model.value[fieldName],
    hasOverlay: false,
    placeholder: '',
  }).then((value: unknown) => {
    if(typeof value === 'string') {
      model.value[fieldName] = value.trim() as never
    }
  })
}
</script>
