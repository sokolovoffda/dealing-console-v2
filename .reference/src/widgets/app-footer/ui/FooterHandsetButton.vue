<template>
  <wui-btn
    :aria-label="title"
    :size="72"
    :icon="false"
    :prepend-icon="isLeft ? iconName : undefined"
    :append-icon="isLeft ? undefined : iconName"
    :content-align="isLeft ? 'start' : 'end'"
    :disabled="disabled"
    class="footer-handset-button w-[260px]! shrink-0"
    :class="buttonClasses"
  >
    <div
      class="flex flex-col min-w-0"
      :class="isLeft ? 'items-start text-left' : 'items-end text-right'"
    >
      <span class="w-full text-[22px] leading-[26px] truncate font-medium">{{ title }}</span>
      <span class="w-full text-[16px] leading-[22px] truncate font-medium">{{ statusText }}</span>
    </div>
  </wui-btn>
</template>

<script lang="ts" setup>
import { WuiBtn } from '@wui/common-library'
import { computed } from 'vue'

type FooterHandsetId = 'left' | 'right'
type FooterHandsetIconName = NonNullable<InstanceType<typeof WuiBtn>['$props']['prependIcon']>
type FooterHandsetTone =
  | 'neutcon'
  | 'waitcon'
  | 'callcon'
  | 'warncon'
  | 'negcon'

const props = withDefaults(defineProps<{
  icon: string
  id: FooterHandsetId
  title: string
  statusText: string
  tone: FooterHandsetTone
  selected?: boolean
  disabled?: boolean
}>(), {
  selected: false,
  disabled: false,
})

const isLeft = computed(() => props.id === 'left')
const iconName = computed(() => props.icon as FooterHandsetIconName)
const state = computed(() => (props.selected ? 'active' : 'inactive'))

const buttonClasses = computed(() => [
  `footer-handset-button--${props.tone}`,
  `footer-handset-button--${state.value}`,
])
</script>

<style scoped>
.footer-handset-button {
  border: 1px solid var(--footer-handset-brd-def, var(--color-transparent)) !important;
  background-color: var(--footer-handset-bg-def) !important;
  color: var(--footer-handset-txt-def) !important;
}

.footer-handset-button :deep(.wui-icon),
.footer-handset-button :deep(.wui-btn__content) {
  color: inherit;
}

.footer-handset-button :deep(.wui-icon) {
  color: var(--footer-handset-icon-def) !important;
}

@media (hover: hover) {
  .footer-handset-button:not(.wui-btn--is-disabled):hover {
    border-color: var(--footer-handset-brd-hov, var(--footer-handset-brd-def, var(--color-transparent))) !important;
    background-color: var(--footer-handset-bg-hov, var(--footer-handset-bg-def)) !important;
  }
}

.footer-handset-button.wui-btn--is-disabled {
  color: var(--footer-handset-txt-dis, var(--footer-handset-txt-def)) !important;
}

.footer-handset-button.wui-btn--is-disabled :deep(.wui-icon) {
  color: var(--footer-handset-icon-dis, var(--footer-handset-icon-def)) !important;
}

.footer-handset-button--neutcon.footer-handset-button--inactive {
  --footer-handset-bg-def: var(--color-handset-neutcon-inactive-bg-def);
  --footer-handset-bg-hov: var(--color-handset-neutcon-inactive-bg-hov);
  --footer-handset-icon-def: var(--color-handset-neutcon-inactive-icon-def);
  --footer-handset-icon-dis: var(--color-handset-neutcon-inactive-icon-dis);
  --footer-handset-txt-def: var(--color-handset-neutcon-inactive-txt-def);
  --footer-handset-txt-dis: var(--color-handset-neutcon-inactive-txt-dis);
}

.footer-handset-button--neutcon.footer-handset-button--active {
  --footer-handset-bg-def: var(--color-handset-neutcon-active-bg-def);
  --footer-handset-icon-def: var(--color-handset-neutcon-active-icon-def);
  --footer-handset-icon-dis: var(--color-handset-neutcon-active-icon-dis);
  --footer-handset-txt-def: var(--color-handset-neutcon-active-txt-def);
  --footer-handset-txt-dis: var(--color-handset-neutcon-active-txt-dis);
  --footer-handset-brd-def: var(--color-handset-neutcon-active-brd-def);
  --footer-handset-brd-hov: var(--color-handset-neutcon-active-brd-hov);
}

.footer-handset-button--callcon.footer-handset-button--inactive {
  --footer-handset-bg-def: var(--color-handset-neutcon-inactive-bg-def);
  --footer-handset-bg-hov: var(--color-handset-neutcon-inactive-bg-hov);
  --footer-handset-icon-def: var(--color-handset-callcon-inactive-icon-def);
  --footer-handset-txt-def: var(--color-handset-callcon-inactive-txt-def);
}

.footer-handset-button--callcon.footer-handset-button--active {
  --footer-handset-bg-def: var(--color-handset-callcon-active-bg-def);
  --footer-handset-icon-def: var(--color-handset-callcon-active-icon-def);
  --footer-handset-txt-def: var(--color-handset-callcon-active-txt-def);
  --footer-handset-brd-def: var(--color-handset-callcon-active-brd-def);
  --footer-handset-brd-hov: var(--color-handset-callcon-active-brd-hov);
}

.footer-handset-button--waitcon.footer-handset-button--inactive {
  --footer-handset-bg-def: var(--color-handset-neutcon-inactive-bg-def);
  --footer-handset-bg-hov: var(--color-handset-neutcon-inactive-bg-hov);
  --footer-handset-icon-def: var(--color-handset-waitcon-inactive-icon-def);
  --footer-handset-txt-def: var(--color-handset-waitcon-inactive-txt-def);
}

.footer-handset-button--waitcon.footer-handset-button--active {
  --footer-handset-bg-def: var(--color-handset-waitcon-active-bg-def);
  --footer-handset-icon-def: var(--color-handset-waitcon-active-icon-def);
  --footer-handset-txt-def: var(--color-handset-waitcon-active-txt-def);
  --footer-handset-brd-def: var(--color-handset-waitcon-active-brd-def);
  --footer-handset-brd-hov: var(--color-handset-waitcon-active-brd-hov);
}

.footer-handset-button--warncon.footer-handset-button--inactive {
  --footer-handset-bg-def: var(--color-handset-neutcon-inactive-bg-def);
  --footer-handset-bg-hov: var(--color-handset-neutcon-inactive-bg-hov);
  --footer-handset-icon-def: var(--color-handset-warncon-inactive-icon-def);
  --footer-handset-txt-def: var(--color-handset-warncon-inactive-txt-def);
}

.footer-handset-button--warncon.footer-handset-button--active {
  --footer-handset-bg-def: var(--color-handset-warncon-active-bg-def);
  --footer-handset-icon-def: var(--color-handset-warncon-active-icon-def);
  --footer-handset-txt-def: var(--color-handset-warncon-active-txt-def);
  --footer-handset-brd-def: var(--color-handset-warncon-active-brd-def);
  --footer-handset-brd-hov: var(--color-handset-warncon-active-brd-hov);
}

.footer-handset-button--negcon.footer-handset-button--inactive {
  --footer-handset-bg-def: var(--color-handset-neutcon-inactive-bg-def);
  --footer-handset-bg-hov: var(--color-handset-neutcon-inactive-bg-hov);
  --footer-handset-icon-def: var(--color-handset-negcon-inactive-icon-def);
  --footer-handset-txt-def: var(--color-handset-negcon-inactive-txt-def);
}

.footer-handset-button--negcon.footer-handset-button--active {
  --footer-handset-bg-def: var(--color-handset-negcon-active-bg-def);
  --footer-handset-icon-def: var(--color-handset-negcon-active-icon-def);
  --footer-handset-txt-def: var(--color-handset-negcon-active-txt-def);
  --footer-handset-brd-def: var(--color-handset-negcon-active-brd-def);
  --footer-handset-brd-hov: var(--color-handset-negcon-active-brd-hov);
}
</style>
