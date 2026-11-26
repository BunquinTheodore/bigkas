// three.js only: one softly rippling sphere. Loaded on demand, only where an orb is shown.
import {
  Color,
  IcosahedronGeometry,
  Mesh,
  PerspectiveCamera,
  Scene,
  ShaderMaterial,
  WebGLRenderer,
} from "three";

export interface OrbScene {
  /** `level` is 0 to 1 loudness, `turn` the rotation in radians. */
  draw(seconds: number, level: number, turn: number): void;
  resize(size: number, ratio: number): void;
  dispose(): void;
}

const VERTEX = /* glsl */ `
uniform float uTime;
uniform float uLevel;
varying vec3 vNormal;
varying float vWave;

void main() {
  float wave = sin(normal.x * 3.1 + uTime * 1.6)
    * sin(normal.y * 2.7 + uTime * 1.2)
    * sin(normal.z * 3.7 + uTime * 0.9);
  float ripple = sin(normal.y * 7.0 - uTime * 3.0) * uLevel * 0.06;
  float swell = 0.025 * sin(uTime * 1.3) + wave * (0.07 + uLevel * 0.28) + ripple;
  vWave = wave;
  vNormal = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position * (1.0 + swell), 1.0);
}`;

const FRAGMENT = /* glsl */ `
uniform vec3 uBlue;
uniform vec3 uViolet;
varying vec3 vNormal;
varying float vWave;

void main() {
  float blend = clamp(0.45 + vWave * 0.9 + vNormal.y * 0.4, 0.0, 1.0);
  float light = 0.65 + 0.5 * max(dot(vNormal, normalize(vec3(0.4, 0.8, 0.6))), 0.0);
  float rim = pow(1.0 - clamp(vNormal.z, 0.0, 1.0), 2.5);
  gl_FragColor = vec4(mix(uBlue, uViolet, blend) * light + rim * 0.4, 1.0);
  #include <colorspace_fragment>
}`;

const orbMaterial = () =>
  new ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    uniforms: {
      uTime: { value: 0 },
      uLevel: { value: 0 },
      uBlue: { value: new Color("#0071e3") },
      uViolet: { value: new Color("#7d5fff") },
    },
  });

export function createOrbScene(canvas: HTMLCanvasElement): OrbScene {
  const renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true });
  const scene = new Scene();
  const camera = new PerspectiveCamera(34, 1, 0.1, 10);
  camera.position.z = 4.5;
  const geometry = new IcosahedronGeometry(1, 20);
  const material = orbMaterial();
  const mesh = new Mesh(geometry, material);
  scene.add(mesh);
  return {
    draw(seconds, level, turn) {
      material.uniforms.uTime.value = seconds;
      material.uniforms.uLevel.value = level;
      mesh.rotation.y = turn;
      renderer.render(scene, camera);
    },
    resize(size, ratio) {
      renderer.setPixelRatio(ratio);
      renderer.setSize(size, size, false);
    },
    dispose() {
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      // Browsers allow only a few live graphics contexts, so give this one back at once.
      renderer.forceContextLoss();
    },
  };
}
