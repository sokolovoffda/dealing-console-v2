<template>
  <tr class="table__row default-rule">
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
      <div
        v-if="!notShowPriority"
        data-test="priority"
        class="flex"
      >
        <wui-btn
          prepend-icon="select"
          icon
          text
          rounded
          class="mr-3 !h-6 !w-6 -rotate-180 !text-black-135 hover:!bg-black"
          :disabled="isUpPriorityDisabled || isFeatureItem"
          @click="changePriority('up', list[index], list[index - 1])"
        />
        <wui-btn
          prepend-icon="select"
          icon
          text
          rounded
          class="!h-6 !w-6 !text-black-135 hover:!bg-black"
          :disabled="isDownPriorityDisabled || isFeatureItem"
          @click="changePriority('down', list[index], list[index + 1])"
        />
      </div>
    </td>
    <!-- Сервис -->
    <td class="table__cell">
      {{ serviceLabel }}
    </td>
    <!-- Условие -->
    <td class="table__cell">
      <div class="flex items-center">
        <span>
          {{ conditionLabel }}
        </span>
        <div
          v-if="model.condition === ForwardingConditions.NO_ANSWER"
          data-test="timeout"
          class="ml-3 flex items-center justify-between"
        >
          <wui-icon name="clock" class="mr-3 !text-black-135" />
          <wui-input
            v-model="model.timeout"
            type="number" rounded small
            class="app-input number-input number-input--without-arrows w-12"
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
          disabled inputmode="tel"
          class="app-input number-input w-24 number-input--without-arrows" small
        />
      </div>
    </td>
    <!-- Номер переадресации -->
    <td class="table__cell text-center">
      <div class="flex items-center">
        <template v-if="!scenarios && model.service.value === FORWARD">
          <wui-input
            v-model="model.forwardNumber"
            inputmode="tel" small
            class="app-input number-input w-24 number-input--without-arrows"
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
                  @select-contact="onSelectContact($event); close()"
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
    <td class="table__cell min-w-[90px]">
      <wui-btn
        v-if="isDirty"
        icon
        text
        :prepend-icon="isForwardingSaving ? 'animatedLoaderWheel' : 'saveBlack'"
        rounded 
        class="mx-auto !text-positive-shades-900 hover:!bg-black"
        :disabled="isForwardingSaving"
        @click="onClickSave"
      />
    </td>
  </tr>
</template>

<script lang="ts" setup>
import { WuiIcon, WuiSelect, WuiInput, WuiDropdown, WuiBtn, useDialog } from '@wui/common-library'
import { storeToRefs } from 'pinia'
import { ref, computed, watch, onBeforeMount, ComputedRef, Ref, toRef, ComponentOptions } from 'vue'

import { SmallContactsList } from '@/features/small-contacts-list'

import { Contact } from '@/entities/contact'
import {
  useForwardingSettingsStore,
  ForwardingConditions, Forwarding, Condition, FeaturesNames,
} from '@/entities/forwarding-settings'

import { useLocalization } from '@/shared/i18n'
import { KeyboardWithTextModal } from '@/shared/ui'

const emit = defineEmits<{
  (event: 'save', value: Forwarding, onCompleted: () => void): void;
}>()

const props = withDefaults(defineProps<{
  modelValue: Forwarding,
  currentCondition: string,
  index: number,
  list?: Forwarding[],
  notShowPriority?: boolean
}>(), {
  list: () => [],
})

onBeforeMount(() => {
  if (!model.value.service.key && !model.value.service.value) {
    if (servicesList.value?.length && subscriberServices.value.get(servicesList.value[0].value)) {
      model.value.service.key = servicesList.value[0].value
      model.value.service.value = subscriberServices.value.get(servicesList.value[0].value) as string
    }
  }
})

const { t } = useLocalization()
const forwardingSettingsStore = useForwardingSettingsStore()
const { changePriority } = forwardingSettingsStore
const { subscriberServices, servicesList } = storeToRefs(forwardingSettingsStore)

const isForwardingSaving = ref(false)

const conditions = computed<Condition[]>(() => [
  { value: ForwardingConditions.UNCONDITIONAL, label: t('Undoubtedly') },
  { value: ForwardingConditions.NO_ANSWER, label: t('ByNonResponse') },
  { value: ForwardingConditions.UNREACHABLE, label: t('DueToUnavailability') },
  { value: ForwardingConditions.BUSY, label: t('ByEmployment') },
])

const FORWARD = 'Forward'

const originalModel: Ref<Forwarding> = ref(JSON.parse(JSON.stringify(props.modelValue)))
const model = toRef(props, 'modelValue')

const isDirty = computed(() => {
  return JSON.stringify(originalModel.value) !== JSON.stringify(model.value)
})

const isFeatureItem = computed(() => {
  return model.value.service.key === FeaturesNames.CALL_WAITING ||
    model.value.service.key === FeaturesNames.CALL_INTRUSION
})

const serviceLabel = computed(() => {
  const service = servicesList.value.find(service => service.value === model.value.service.key)
  return service?.label ?? model.value.service.key
})

const conditionLabel = computed(() => {
  const condition = conditions.value.find(condition => condition.value === model.value.condition)
  return condition?.label ?? model.value.condition
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
    })
  }
}

const onSelectContact = (contact: Contact) => {
  if (contact?.internalNumber) {
    model.value.forwardNumber = contact.internalNumber
  }
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
