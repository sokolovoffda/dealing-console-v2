import { useDialog } from '@wui/common-library'
import type { ComponentOptions, Ref } from 'vue'

import type { Contact } from '@/entities/contact'
import type { FastDialGroup } from '@/entities/fast-dial'

import { ChangeContactsModal } from '@/shared/ui'

import { useQuickCallContactTransfer } from '../use-quick-call-contact-transfer'
import {
  moveContactInQuickCallFastDialLayout,
  removeContactFromQuickCallFastDialLayout,
  type QuickCallGridLayout,
} from '../use-quick-call-fast-dial-grid'
import { useQuickCallFastDialLayoutSave } from '../use-quick-call-fast-dial-layout-save'
import { useQuickCallMoveState } from '../use-quick-call-move-state'

type UseQuickCallGridActionsParams = {
  activeGroupGuid: Ref<string | undefined>
  contacts: Ref<Contact[]>
  contactsByGroupGuid: Ref<Map<string, Contact[]>>
  layout: Ref<QuickCallGridLayout>
  groupsByGroupGuid: Ref<Map<string, FastDialGroup>>
  getGroupLayout: (
    groupGuid: string,
    groupContacts: Contact[],
    groupFastDial: FastDialGroup | undefined,
  ) => QuickCallGridLayout
  setLocalLayout: (nextLayout: QuickCallGridLayout) => void
  setLocalGroupLayout: (groupGuid: string, nextLayout: QuickCallGridLayout, groupContacts: Contact[]) => void
  addCachedGroupContact: (groupGuid: string, contact: Contact) => void
  removeCachedGroupContact: (groupGuid: string, contactGuid: string) => void
}

const getContactGuid = (contact: Contact) => {
  return contact.guid || contact.id
}

export const useQuickCallGridActions = ({
  activeGroupGuid,
  contacts,
  contactsByGroupGuid,
  layout,
  groupsByGroupGuid,
  getGroupLayout,
  setLocalLayout,
  setLocalGroupLayout,
  addCachedGroupContact,
  removeCachedGroupContact,
}: UseQuickCallGridActionsParams) => {
  const { showDialog } = useDialog<Contact[] | undefined>()
  const {
    addContactToGroup,
    moveContactToGroup,
    removeContactFromGroup,
    transferring,
  } = useQuickCallContactTransfer()
  const {
    cancelMove,
    isGroupTransferInSourceGroup,
    isMoveMode,
    isMovingSourceCell,
    movingContact,
    startDuplicateToGroup,
    startMoveInsideGroup,
    startMoveToGroup,
  } = useQuickCallMoveState({
    activeGroupGuid,
  })
  const {
    saveActiveFastDialLayout,
    saveFastDialLayout,
  } = useQuickCallFastDialLayoutSave({
    activeGroupGuid,
  })

  const getCachedGroupContacts = (groupGuid: string) => {
    return contactsByGroupGuid.value.get(groupGuid) ?? []
  }

  const isContactInActiveGroup = (contactGuid: string) => {
    return contacts.value.some(contact => getContactGuid(contact) === contactGuid)
  }

  const applyActiveLayout = async (
    nextLayout: QuickCallGridLayout,
    options: { createIfMissing?: boolean } = {},
  ) => {
    await saveActiveFastDialLayout(nextLayout, options)
    setLocalLayout(nextLayout)
  }

  const applyGroupLayout = async (
    groupGuid: string,
    nextLayout: QuickCallGridLayout,
    groupContacts: Contact[],
    options: { createIfMissing?: boolean } = {},
  ) => {
    await saveFastDialLayout(groupGuid, nextLayout, options)
    setLocalGroupLayout(groupGuid, nextLayout, groupContacts)
  }

  const finishMoveInsideGroup = async (cellIndex: number) => {
    const currentMovingContact = movingContact.value
    if (!currentMovingContact || currentMovingContact.mode !== 'inside-group') return

    const nextLayout = moveContactInQuickCallFastDialLayout(
      layout.value,
      contacts.value,
      currentMovingContact.contactGuid,
      cellIndex,
    )

    if (!nextLayout) return

    try {
      await applyActiveLayout(nextLayout)
      cancelMove()
    } catch (e) {
      cancelMove()
      console.error('Quick call panel move contact inside group failed:', e)
    }
  }

  const finishMoveToGroup = async (targetCellIndex: number) => {
    const currentMovingContact = movingContact.value
    const targetGroupGuid = activeGroupGuid.value

    if (!currentMovingContact || currentMovingContact.mode !== 'between-groups' || !targetGroupGuid) return
    if (targetGroupGuid === currentMovingContact.sourceGroupGuid) return

    try {
      await moveContactToGroup({
        contactGuid: currentMovingContact.contactGuid,
        sourceGroupGuid: currentMovingContact.sourceGroupGuid,
        targetGroupGuid,
      })
      removeCachedGroupContact(currentMovingContact.sourceGroupGuid, currentMovingContact.contactGuid)
      addCachedGroupContact(targetGroupGuid, currentMovingContact.contact)

      const sourceContacts = getCachedGroupContacts(currentMovingContact.sourceGroupGuid)
      const targetContacts = getCachedGroupContacts(targetGroupGuid)
      const sourceLayout = getGroupLayout(
        currentMovingContact.sourceGroupGuid,
        sourceContacts,
        groupsByGroupGuid.value.get(currentMovingContact.sourceGroupGuid),
      )
      const targetLayout = getGroupLayout(
        targetGroupGuid,
        targetContacts,
        groupsByGroupGuid.value.get(targetGroupGuid),
      )
      const nextSourceLayout = removeContactFromQuickCallFastDialLayout(
        sourceLayout,
        sourceContacts,
        currentMovingContact.contactGuid,
      )
      const nextTargetLayout = moveContactInQuickCallFastDialLayout(
        targetLayout,
        targetContacts,
        currentMovingContact.contactGuid,
        targetCellIndex,
      )

      if (!nextTargetLayout) return

      await applyGroupLayout(
        currentMovingContact.sourceGroupGuid,
        nextSourceLayout,
        sourceContacts,
        { createIfMissing: false },
      )
      await applyGroupLayout(targetGroupGuid, nextTargetLayout, targetContacts)
      cancelMove()
    } catch (e) {
      console.error('Quick call panel move contact to another group failed:', e)
    }
  }

  const finishDuplicateToGroup = async (targetCellIndex: number) => {
    const currentMovingContact = movingContact.value
    const targetGroupGuid = activeGroupGuid.value

    if (!currentMovingContact || currentMovingContact.mode !== 'duplicate-to-group' || !targetGroupGuid) return
    if (targetGroupGuid === currentMovingContact.sourceGroupGuid) return

    try {
      const added = await addContactToGroup({
        contactGuid: currentMovingContact.contactGuid,
        targetGroupGuid,
      })

      if (!added) return

      addCachedGroupContact(targetGroupGuid, currentMovingContact.contact)

      const targetContacts = getCachedGroupContacts(targetGroupGuid)
      const targetLayout = getGroupLayout(
        targetGroupGuid,
        targetContacts,
        groupsByGroupGuid.value.get(targetGroupGuid),
      )
      const nextTargetLayout = moveContactInQuickCallFastDialLayout(
        targetLayout,
        targetContacts,
        currentMovingContact.contactGuid,
        targetCellIndex,
      )

      if (!nextTargetLayout) return

      await applyGroupLayout(targetGroupGuid, nextTargetLayout, targetContacts)
      cancelMove()
    } catch (e) {
      console.error('Quick call panel duplicate contact to another group failed:', e)
    }
  }

  const handleContactCellSelect = (cell: { contactGuid: string | null, index: number }) => {
    if (!movingContact.value) return

    if (isMovingSourceCell(cell)) {
      cancelMove()
      return
    }

    if (movingContact.value.mode === 'inside-group') {
      void finishMoveInsideGroup(cell.index)
    }
  }

  const handleAddContact = async (cellIndex: number) => {
    const groupGuid = activeGroupGuid.value
    if (!groupGuid) return

    try {
      const selectedContacts = await showDialog(ChangeContactsModal as ComponentOptions, {
        title: 'Добавить контакт',
        contactsPServed: [],
        isOnce: true,
        groupGuid,
        hasOverlay: false,
      })
      const selectedContact = selectedContacts?.at(0)

      if (!selectedContact) return

      const contactGuid = getContactGuid(selectedContact)
      if (isContactInActiveGroup(contactGuid)) return

      const isContactAlreadyInBackendGroup = selectedContact.groupIds.includes(groupGuid)
      const added = isContactAlreadyInBackendGroup || await addContactToGroup({
        contactGuid,
        targetGroupGuid: groupGuid,
      })

      if (!added) return

      addCachedGroupContact(groupGuid, selectedContact)

      const nextLayout = moveContactInQuickCallFastDialLayout(
        layout.value,
        contacts.value,
        contactGuid,
        cellIndex,
      )

      if (!nextLayout) return

      await applyActiveLayout(nextLayout)
    } catch (e) {
      console.error('Quick call panel add contact to group failed:', e)
    }
  }

  const handleEmptyCellClick = (cellIndex: number) => {
    if (movingContact.value?.mode === 'inside-group') {
      void finishMoveInsideGroup(cellIndex)
      return
    }

    if (movingContact.value?.mode === 'between-groups') {
      void finishMoveToGroup(cellIndex)
      return
    }

    if (movingContact.value?.mode === 'duplicate-to-group') {
      void finishDuplicateToGroup(cellIndex)
      return
    }

    void handleAddContact(cellIndex)
  }

  const handleDeleteContact = async (cell: {
    contactGuid: string | null
    index: number
    contact?: Contact | null
  }) => {
    const groupGuid = activeGroupGuid.value
    if (!cell.contactGuid || !groupGuid) return

    try {
      const removed = await removeContactFromGroup({
        contactGuid: cell.contactGuid,
        sourceGroupGuid: groupGuid,
        contact: cell.contact,
        knownContactGuids: contacts.value.map(getContactGuid),
      })

      if (!removed) return

      removeCachedGroupContact(groupGuid, cell.contactGuid)

      const nextLayout = removeContactFromQuickCallFastDialLayout(
        layout.value,
        contacts.value,
        cell.contactGuid,
      )

      await applyActiveLayout(nextLayout, { createIfMissing: false })
    } catch (e) {
      console.error('Quick call panel delete contact from group failed:', e)
    }
  }

  return {
    cancelMove,
    handleContactCellSelect,
    handleDeleteContact,
    handleEmptyCellClick,
    isGroupTransferInSourceGroup,
    isMoveMode,
    isMovingSourceCell,
    movingContact,
    startDuplicateToGroup,
    startMoveInsideGroup,
    startMoveToGroup,
    transferring,
  }
}
