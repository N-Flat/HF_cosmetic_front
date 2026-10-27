import * as THREE from "three";
import type { Feature, Vec3 } from "@/lib/ai/types";
import { anchorPosition, faceBounds } from "./anchor";
import { OneEuroFilter } from "./smoothing";
import { stampForType } from "@/lib/stamps";
export function createMirrorRenderer(canvas: HTMLCanvasElement) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  const scene = new THREE.Scene(),
    camera = new THREE.OrthographicCamera(0, 1, 0, 1, -10, 10);
  camera.position.z = 1;
  const loader = new THREE.TextureLoader(),
    textures = {
      star: loader.load("/stamps/star.png"),
      planet: loader.load("/stamps/planet.png"),
      glitter: loader.load("/stamps/glitter.png"),
    };
  const sprites = new Map<string, THREE.Sprite>(),
    filters = new Map<string, [OneEuroFilter, OneEuroFilter]>();
  return {
    draw(
      points: Vec3[],
      features: Feature[],
      time: number,
      settings: {
        smoothing: boolean;
        blend: "normal" | "screen" | "multiply";
        stamp: "type" | "star" | "planet" | "glitter";
      },
      roll: number,
      width: number,
      height: number,
    ) {
      renderer.setSize(width, height, false);
      // Blend against the actual video element, not an empty WebGL framebuffer.
      canvas.style.mixBlendMode = settings.blend;
      const active = new Set(features.map((f) => f.id));
      for (const [id, sprite] of sprites)
        if (!active.has(id)) {
          scene.remove(sprite);
          sprite.material.dispose();
          sprites.delete(id);
          filters.delete(id);
        }
      for (const feature of features) {
        const p = anchorPosition(feature.anchor, points);
        if (!p) continue;
        let sprite = sprites.get(feature.id);
        if (!sprite) {
          sprite = new THREE.Sprite(
            new THREE.SpriteMaterial({ transparent: true, depthTest: false }),
          );
          sprites.set(feature.id, sprite);
          filters.set(feature.id, [
            new OneEuroFilter(1, 0.2),
            new OneEuroFilter(1, 0.2),
          ]);
          scene.add(sprite);
        }
        const fs = filters.get(feature.id) ?? [
          new OneEuroFilter(1, 0.2),
          new OneEuroFilter(1, 0.2),
        ];
        filters.set(feature.id, fs);
        const smooth = [fs[0].filter(p[0], time), fs[1].filter(p[1], time)];
        sprite.position.set(
          settings.smoothing ? smooth[0] : p[0],
          settings.smoothing ? smooth[1] : p[1],
          0,
        );
        const size = Math.max(0.035, faceBounds(points).w * 0.14);
        sprite.scale.set(size, (size * width) / height, 1);
        sprite.material.rotation = -roll;
        sprite.material.map =
          textures[
            settings.stamp === "type"
              ? stampForType[feature.type]
              : settings.stamp
          ];
        sprite.material.blending = THREE.NormalBlending;
        sprite.material.needsUpdate = true;
      }
      renderer.render(scene, camera);
    },
    clear() {
      renderer.clear();
      filters.clear();
    },
    dispose() {
      for (const s of sprites.values()) s.material.dispose();
      for (const t of Object.values(textures)) t.dispose();
      renderer.dispose();
    },
  };
}
