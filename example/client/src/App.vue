<template>
    <FileUpload />
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import FileUpload from './fileUpload.vue';

export default defineComponent({
    name: 'App',
    components: {
        FileUpload,
    },
});
</script>

<style>
#app {
    font-family: Avenir, Helvetica, Arial, sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    width: 400px;
    padding: 64px;
    color: #2c3e50;
}
</style>
