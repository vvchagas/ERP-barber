<script setup lang="ts">
import * as THREE from "three";

const host = ref<HTMLDivElement | null>(null);
let cleanup: (() => void) | null = null;

onMounted(() => {
  if (!host.value) return;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  camera.position.set(0, 0, 6);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  host.value.appendChild(renderer.domElement);

  const pole = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.72, 0.72, 3.5, 32),
    new THREE.MeshBasicMaterial({ color: "#FFFFFF" }),
  );
  pole.add(body);

  for (let i = -2; i <= 2; i += 1) {
    const ring = new THREE.Mesh(
      new THREE.CylinderGeometry(0.735, 0.735, 0.28, 32, 1, false, i * Math.PI * 0.75, Math.PI * 0.5),
      new THREE.MeshBasicMaterial({ color: i % 2 === 0 ? "#F59E0B" : "#09090B", side: THREE.DoubleSide }),
    );
    ring.position.y = i * 0.68;
    pole.add(ring);
  }

  const top = new THREE.Mesh(
    new THREE.CylinderGeometry(0.9, 0.9, 0.16, 32),
    new THREE.MeshBasicMaterial({ color: "#F59E0B" }),
  );
  top.position.y = 1.83;
  pole.add(top);

  const bottom = top.clone();
  bottom.position.y = -1.83;
  pole.add(bottom);
  scene.add(pole);

  const resize = () => {
    if (!host.value) return;
    const { width, height } = host.value.getBoundingClientRect();
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };
  resize();

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(host.value);

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    || document.documentElement.classList.contains("senior-mode");
  let frameId = 0;
  const animate = () => {
    if (!reducedMotion) pole.rotation.y += 0.012;
    renderer.render(scene, camera);
    frameId = window.requestAnimationFrame(animate);
  };
  animate();

  cleanup = () => {
    window.cancelAnimationFrame(frameId);
    resizeObserver.disconnect();
    renderer.dispose();
    renderer.domElement.remove();
  };
});

onBeforeUnmount(() => {
  cleanup?.();
  cleanup = null;
});
</script>

<template>
  <ClientOnly>
    <div ref="host" class="h-90 w-full" aria-label="Animação 3D de poste de barbearia" />
  </ClientOnly>
</template>
