import { type ComputedRef, type InjectionKey, type MaybeRefOrGetter, computed, inject, provide, toValue } from 'vue'

import { MONOPOLY_WIDGET_VIEWPORT, type WidgetViewport } from './widget-viewport'

export const WIDGET_VIEWPORT_KEY: InjectionKey<ComputedRef<WidgetViewport>> = Symbol('widget-viewport')

export const provideWidgetViewport = (viewport: MaybeRefOrGetter<WidgetViewport>) => {
  const resolvedViewport = computed(() => toValue(viewport))
  provide(WIDGET_VIEWPORT_KEY, resolvedViewport)
}

export const useWidgetViewport = (): ComputedRef<WidgetViewport> => {
  return inject(WIDGET_VIEWPORT_KEY, () => computed(() => MONOPOLY_WIDGET_VIEWPORT), true)
}
