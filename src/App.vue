<template>
  <EffortCard />
</template>

<script setup>
import EffortCard from './components/EffortCard.vue';
</script>

<style>
*,
*::before,
*::after {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  background: #000000f1;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'DM Sans', -apple-system, system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
}
</style>
