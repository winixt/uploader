<template>
    <Uploader action="http://127.0.0.1:3000">
        <FButton>上传文件</FButton>
    </Uploader>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { FButton } from '@fesjs/fes-design';
import Uploader from '../../../packages/fesd/src/uploader.vue';

export default defineComponent({
    name: 'App',
    components: {
        Uploader,
        FButton,
    },
});
</script>

<style>
#app {
    font-family: Avenir, Helvetica, Arial, sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    text-align: center;
    color: #2c3e50;
    margin-top: 60px;
}
</style>
