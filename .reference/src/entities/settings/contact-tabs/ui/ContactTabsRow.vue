<template>
  <tr class="table__row">
    <td class="table__cell">
      <wui-btn
        prepend-icon="power"
        icon
        text
        rounded
        class="mx-auto hover:!bg-black"
      />
    </td>
    <td class="table__cell">
      <div
        data-test="priority"
        class="flex"
      >
        <wui-btn
          prepend-icon="select"
          icon
          text
          white
          rounded
          class="mr-3 !h-6 !w-6 -rotate-180 !text-black-135 hover:!bg-black"
        />
        <wui-btn
          prepend-icon="select"
          icon
          text
          white
          rounded
          class="!h-6 !w-6 !text-black-135 hover:!bg-black"
        />
      </div>
    </td>
    <td class="table__cell">
      <div class="flex items-center gap-x-2">
        <p>test</p>
        <wui-btn
          prepend-icon="edit"
          icon
          text
          rounded
          class="!text-black-135 hover:!bg-black"
        />
      </div>
    </td>
    <td class="table__cell">
      <div class="flex items-center gap-x-2">
        <p>0</p>
        <wui-btn
          prepend-icon="edit"
          icon
          rounded
          text
          class="!text-black-135 hover:!bg-black"
        />
      </div>
    </td>
    <td class="table__cell text-center">
      <wui-btn
        prepend-icon="deleteOutlined"
        icon
        text
        rounded
        class="!text-warning-shades-900 hover:!bg-black mx-auto"
      />
    </td>
  </tr>
</template>

<script setup lang="ts">
import { WuiBtn } from '@wui/common-library'

</script>
