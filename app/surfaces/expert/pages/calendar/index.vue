<script setup lang="ts">
const localePath = useLocalePath()

await navigateTo(localePath('/'), { replace: true })
</script>
