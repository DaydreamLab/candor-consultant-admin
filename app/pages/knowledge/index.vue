<script setup lang="ts">
const localePath = useLocalePath()

await navigateTo(localePath('/knowledge/datasets'), { replace: true })
</script>
