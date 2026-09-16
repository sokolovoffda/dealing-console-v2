import { mount } from '@vue/test-utils'

import SkeletonBands from './SkeletonBands.vue'

test('SkeletonBands mount component', async () => {
  expect(SkeletonBands).toBeTruthy()
  const wrapper = mount(SkeletonBands)
  expect(wrapper.html()).toMatchSnapshot()
})
