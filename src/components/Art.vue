<script setup>
defineProps({ kind: String })
</script>
<template>
  <div class="art" :class="`art-${kind || 'sunset'}`" aria-hidden="true">
    <template v-if="kind === 'code' || kind === 'grid'"
      ><div class="code-window">
        <span class="code-dots">● ● ●</span
        ><code
          ><span>&lt;script setup&gt;</span><br />const life = ref('beautiful')<br />const ideas =
          computed(() =&gt; {<br />&nbsp; return createSomething()<br />})<br /><span
            >&lt;/script&gt;</span
          ></code
        >
      </div>
      <span class="art-caption">{{
        kind === 'code' ? 'BUILD SOMETHING PERSONAL.' : 'A LITTLE SPACE TO CREATE.'
      }}</span></template
    ><template v-else-if="kind === 'book' || kind === 'tea'"
      ><div class="draw-book"></div>
      <div class="draw-cup"></div>
      <span class="art-caption">SLOW DOWN. LOOK AROUND.</span></template
    ><template v-else
      ><div class="land-sun"></div>
      <div class="land-hill back"></div>
      <div class="land-hill front"></div>
      <div class="land-grass"></div>
      <span class="art-caption">{{
        kind === 'mountain' ? 'TAKE A BREATH, GO OUTSIDE.' : 'COLLECT LITTLE MOMENTS.'
      }}</span></template
    >
  </div>
</template>
