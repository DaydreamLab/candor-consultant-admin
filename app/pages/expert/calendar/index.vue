<script setup lang="ts">
definePageMeta({
  layout: 'expert',
  name: 'expert-station-calendar'
})

const localePath = useLocalePath()

await navigateTo(localePath('/expert'), { replace: true })
</script>
