import { mount } from '@vue/test-utils'

import { Contact } from '@/entities/contact'

import SmallContactListItem from '../ui/SmallContactListItem.vue'

const contact: Contact = {
  id: 'id1',
  pServed: '<sip:44981@1.2.3.4:9999>',
  name: 'name1',
  internalNumber: '44981',
  mobilePhone: '44981',
  groupIds: ['12312sadfsdf24', '1resagfe351131', 'zdxfrw1qfds98sdf98sdf'],
  photo: '',
  organization: 'Organization',
  position: 'Position',
  imLogin: 'imLogin',
  terminalLogin: '',
  terminalPassword: '',
  groups: [],
}

describe('SmallContactListItem', () => {
  it('Имя отображается', () => {
    const wrapper = mount(SmallContactListItem, {
      props: {
        contact,
      },
    })

    expect(wrapper.find('[data-test="name"]').text()).toBe(contact.name)
  })

  it('Внутренний номер отображается', () => {
    const wrapper = mount(SmallContactListItem, {
      props: {
        contact,
      },
    })

    expect(wrapper.find('[data-test="internal-number"]').text()).toContain(contact.internalNumber)
  })

  it('Мобильный номер отображается', () => {
    const wrapper = mount(SmallContactListItem, {
      props: {
        contact,
      },
    })

    expect(wrapper.find('[data-test="mobile-phone"]').text()).toContain(contact.mobilePhone)
  })

  it('При отсутствии имени контакта отображается заглушка', () => {
    contact.name = ''
    const wrapper = mount(SmallContactListItem, {
      props: {
        contact,
      },
    })

    expect(wrapper.find('[data-test="name"]').text()).toBe('Нет имени')
  })

  it('При отсутствии внутреннего номера не отображать ее', () => {
    contact.internalNumber = ''
    const wrapper = mount(SmallContactListItem, {
      props: {
        contact,
      },
    })

    expect(wrapper.find('[data-test="internal-number"]').exists()).toBeFalsy()
  })

  it('При отсутствии мобильного номера не отображать ее', () => {
    contact.mobilePhone = ''
    const wrapper = mount(SmallContactListItem, {
      props: {
        contact,
      },
    })

    expect(wrapper.find('[data-test="mobile-phone"]').exists()).toBeFalsy()
  })
})
