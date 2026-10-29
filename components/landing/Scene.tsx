"use client";

import { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, Environment, Lightformer, PerformanceMonitor, RoundedBox } from "@react-three/drei";
import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing";
import { scrollState } from "./scrollState";
import type { DeviceTier } from "./deviceTier";

// ---------------------------------------------------------------------------
// Fieldnotes 3D scene — all geometry is built in code (no model downloads).
// Story, one chapter per page section:
//   0 hero      reel cards orbit an open notebook
//   1 paste     the cards fly into the notebook
//   2 read      lines get written across the pages
//   3 sort      coloured category tokens rise out of the book
//   4 map       camera tilts down; pins drop onto the map around it
//   5 cta       wide closing shot
// ---------------------------------------------------------------------------

const PALETTE = {
  paper: "#FFFCF6",
  ground: "#EFE5D1",
  street: "#E2D6C1",
  park: "#CFDDBF",
  water: "#BFD6E2",
  ink: "#2A2219",
  pine: "#2F5A43",
  saffron: "#E3A53B",
};
const CATEGORY_COLORS = ["#D2692F", "#6E9636", "#9467B8", "#2E9097", "#4A84B8"];

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const smooth = (edge0: number, edge1: number, x: number) => {
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
};
const easeOutBack = (t: number) => {
  const c1 = 1.4;
  return 1 + (c1 + 1) * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};
/** Frame-rate independent smoothing factor. */
const dampFactor = (lambda: number, delta: number) => 1 - Math.exp(-lambda * delta);

// ---- Camera ---------------------------------------------------------------
const CAMERA_KEYS: { pos: [number, number, number]; look: [number, number, number] }[] = [
  { pos: [0.4, 1.6, 7.4], look: [0, 0.5, 0] }, // hero
  { pos: [3.4, 2.6, 5.0], look: [-0.4, 0.3, 0] }, // paste
  { pos: [0.5, 5.2, 2.7], look: [0, 0, 0.1] }, // read
  { pos: [-3.8, 2.4, 4.6], look: [0.6, 0.8, 0] }, // sort
  { pos: [0.3, 9.5, 3.4], look: [0, 0, -0.4] }, // map
  { pos: [0, 3.6, 9.2], look: [0, 0.4, 0] }, // cta
];

function CameraRig() {
  const { camera, size } = useThree();
  const look = useRef(new THREE.Vector3(0, 0.5, 0));
  const targetPos = useMemo(() => new THREE.Vector3(), []);
  const targetLook = useMemo(() => new THREE.Vector3(), []);
  const a = useMemo(() => new THREE.Vector3(), []);
  const b = useMemo(() => new THREE.Vector3(), []);

  useFrame((_, delta) => {
    const c = Math.min(CAMERA_KEYS.length - 1, Math.max(0, scrollState.chapter));
    const i = Math.min(CAMERA_KEYS.length - 2, Math.floor(c));
    const t = smooth(0, 1, c - i);
    targetPos.copy(a.fromArray(CAMERA_KEYS[i].pos)).lerp(b.fromArray(CAMERA_KEYS[i + 1].pos), t);
    targetLook.copy(a.fromArray(CAMERA_KEYS[i].look)).lerp(b.fromArray(CAMERA_KEYS[i + 1].look), t);

    // Portrait screens: pull back so the whole diorama fits.
    const aspect = size.width / size.height;
    if (aspect < 1) targetPos.multiplyScalar(1 + (1 - aspect) * 0.9);

    // In the hero, keep the scene clear of the headline: off to the right on
    // wide screens, below the text on tall ones. Eases out by chapter 1.
    const heroWeight = 1 - smooth(0, 1, c);
    if (aspect > 1.1) {
      targetPos.x -= 2.8 * heroWeight;
      targetLook.x -= 2.8 * heroWeight;
    } else {
      targetPos.y += 2.2 * heroWeight;
      targetLook.y += 2.2 * heroWeight;
    }

    // Gentle mouse parallax, strongest in the hero.
    const parallax = 0.55 - 0.35 * smooth(0, 1, c);
    targetPos.x += scrollState.pointer.x * parallax;
    targetPos.y += scrollState.pointer.y * parallax * 0.5;

    camera.position.lerp(targetPos, dampFactor(3.2, delta));
    look.current.lerp(targetLook, dampFactor(3.2, delta));
    camera.lookAt(look.current);
  });
  return null;
}

// ---- Notebook -------------------------------------------------------------
const PAGE_W = 2.2;
const PAGE_D = 3;
const LINE_W = 1.6;
const LINES_PER_PAGE = 7;

function Notebook() {
  const lines = useRef<(THREE.Mesh | null)[]>([]);

  useFrame(() => {
    const written = smooth(1.35, 2.05, scrollState.chapter) * LINES_PER_PAGE * 2;
    lines.current.forEach((mesh, index) => {
      if (!mesh) return;
      const s = Math.max(0.0001, clamp01(written - index));
      const startX = mesh.userData.startX as number;
      mesh.scale.x = s;
      mesh.position.x = startX + (LINE_W * s) / 2;
    });
  });

  return (
    <group rotation={[0, -0.25, 0]}>
      {/* cover */}
      <RoundedBox args={[PAGE_W * 2 + 0.35, 0.08, PAGE_D + 0.25]} radius={0.04} position={[0, -0.04, 0]} castShadow receiveShadow>
        <meshStandardMaterial color={PALETTE.pine} roughness={0.7} />
      </RoundedBox>
      {/* pages */}
      {[-1, 1].map((side) => (
        <RoundedBox
          key={side}
          args={[PAGE_W, 0.09, PAGE_D]}
          radius={0.03}
          position={[side * (PAGE_W / 2 + 0.03), 0.07, 0]}
          rotation={[0, 0, -side * 0.05]}
          castShadow
          receiveShadow
        >
          <meshStandardMaterial color={PALETTE.paper} roughness={0.9} />
        </RoundedBox>
      ))}
      {/* spine */}
      <mesh position={[0, 0.06, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.05, 0.05, PAGE_D, 12]} />
        <meshStandardMaterial color={PALETTE.ink} roughness={0.6} />
      </mesh>
      {/* handwriting lines, "written" as you scroll */}
      {Array.from({ length: LINES_PER_PAGE * 2 }, (_, index) => {
        const page = index < LINES_PER_PAGE ? -1 : 1;
        const row = index % LINES_PER_PAGE;
        const startX = page * (PAGE_W / 2 + 0.03) - LINE_W / 2;
        const width = row === 0 ? 0.7 : 1;
        return (
          <mesh
            key={index}
            ref={(mesh) => {
              lines.current[index] = mesh;
            }}
            userData={{ startX }}
            position={[startX, 0.125, -1.15 + row * 0.36]}
            rotation={[0, 0, -page * 0.05]}
            scale={[0.0001, 1, 1]}
          >
            <boxGeometry args={[LINE_W * width, 0.012, row === 0 ? 0.07 : 0.04]} />
            <meshStandardMaterial color={row === 0 ? PALETTE.pine : PALETTE.ink} roughness={0.8} />
          </mesh>
        );
      })}
    </group>
  );
}

// ---- Reel cards -----------------------------------------------------------
const CARD_COUNT = 6;

function ReelCards() {
  const cards = useRef<(THREE.Group | null)[]>([]);
  const orbit = useMemo(() => new THREE.Vector3(), []);
  const desk = useMemo(() => new THREE.Vector3(), []);

  useFrame(({ clock }) => {
    const time = clock.getElapsedTime();
    const flyIn = smooth(0.3, 1.05, scrollState.chapter);
    cards.current.forEach((card, i) => {
      if (!card) return;
      const angle = (i / CARD_COUNT) * Math.PI * 2 + time * 0.14;
      orbit.set(
        Math.cos(angle) * 3.0,
        1.0 + Math.sin(time * 0.9 + i) * 0.16 + (i % 2) * 0.35,
        Math.sin(angle) * 2.2
      );
      // Land in a tidy 3 × 2 grid on the left page.
      desk.set(-1.85 + (i % 3) * 0.62, 0.16 + i * 0.006, -0.75 + Math.floor(i / 3) * 1.05);
      const stagger = clamp01(flyIn * 1.35 - i * 0.07);
      const t = smooth(0, 1, stagger);
      card.position.lerpVectors(orbit, desk, t);
      // Hop up slightly mid-flight so the arc reads clearly.
      card.position.y += Math.sin(t * Math.PI) * 0.9;
      card.rotation.set(
        THREE.MathUtils.lerp(-0.12 + scrollState.pointer.y * 0.15, -Math.PI / 2, t),
        THREE.MathUtils.lerp(-angle + Math.PI / 2 + scrollState.pointer.x * 0.25, -0.25, t),
        THREE.MathUtils.lerp(Math.sin(time + i) * 0.08, (i - 2.5) * 0.04, t)
      );
      card.scale.setScalar(THREE.MathUtils.lerp(1, 0.5, t));
    });
  });

  return (
    <>
      {Array.from({ length: CARD_COUNT }, (_, i) => (
        <group
          key={i}
          ref={(group) => {
            cards.current[i] = group;
          }}
        >
          <RoundedBox args={[0.62, 1.1, 0.06]} radius={0.07} castShadow>
            <meshStandardMaterial color={PALETTE.ink} roughness={0.35} metalness={0.2} />
          </RoundedBox>
          <mesh position={[0, 0, 0.032]}>
            <planeGeometry args={[0.54, 0.98]} />
            <meshStandardMaterial
              color={CATEGORY_COLORS[i % CATEGORY_COLORS.length]}
              emissive={CATEGORY_COLORS[i % CATEGORY_COLORS.length]}
              emissiveIntensity={0.25}
              roughness={0.5}
            />
          </mesh>
          {/* play button */}
          <mesh position={[0.02, 0, 0.04]} rotation={[0, 0, -Math.PI / 2]}>
            <circleGeometry args={[0.11, 3]} />
            <meshBasicMaterial color="#FFFFFF" />
          </mesh>
        </group>
      ))}
    </>
  );
}

// ---- Category tokens ------------------------------------------------------
function CategoryTokens() {
  const tokens = useRef<(THREE.Mesh | null)[]>([]);
  useFrame(({ clock }) => {
    const time = clock.getElapsedTime();
    const rise = smooth(2.3, 3.0, scrollState.chapter) * (1 - smooth(3.45, 3.95, scrollState.chapter));
    tokens.current.forEach((token, i) => {
      if (!token) return;
      const r = clamp01(rise * 1.4 - i * 0.08);
      token.position.set(0.35 + i * 0.5 - 1.0, 0.2 + r * (1.35 + (i % 2) * 0.3) + Math.sin(time * 1.6 + i) * 0.05 * r, 0.25 - i * 0.12);
      token.rotation.set(Math.PI / 2 - 0.35, 0, time * 0.8 + i);
      token.scale.setScalar(Math.max(0.0001, r));
    });
  });
  return (
    <>
      {CATEGORY_COLORS.map((color, i) => (
        <mesh
          key={color}
          ref={(mesh) => {
            tokens.current[i] = mesh;
          }}
          castShadow
          scale={0.0001}
        >
          <cylinderGeometry args={[0.24, 0.24, 0.07, 32]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.2} roughness={0.35} metalness={0.1} />
        </mesh>
      ))}
    </>
  );
}

// ---- Map ground + pins ----------------------------------------------------
const PIN_SPOTS: [number, number][] = [
  [-3.4, -1.6], [3.3, -1.2], [-2.6, 2.3], [2.4, 2.6], [4.2, 1.0], [-4.4, 0.6], [0.6, -3.0],
];

function MapGround({ detailed }: { detailed: boolean }) {
  const streets = useMemo(() => {
    const list: { pos: [number, number, number]; size: [number, number, number] }[] = [];
    for (let k = -6; k <= 6; k++) {
      list.push({ pos: [k * 1.7, -0.115, 0], size: [0.09, 0.01, 24] });
      list.push({ pos: [0, -0.115, k * 1.7], size: [24, 0.01, 0.09] });
    }
    return list;
  }, []);
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.12, 0]} receiveShadow>
        <planeGeometry args={[40, 40]} />
        <meshStandardMaterial color={PALETTE.ground} roughness={1} />
      </mesh>
      {streets.map((s, i) => (
        <mesh key={i} position={s.pos}>
          <boxGeometry args={s.size} />
          <meshStandardMaterial color={PALETTE.street} roughness={1} />
        </mesh>
      ))}
      {detailed && (
        <>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-4.2, -0.11, -3.4]}>
            <planeGeometry args={[2.6, 1.8]} />
            <meshStandardMaterial color={PALETTE.park} roughness={1} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0.5]} position={[4.6, -0.11, 3.6]}>
            <planeGeometry args={[9, 0.9]} />
            <meshStandardMaterial color={PALETTE.water} roughness={0.4} />
          </mesh>
        </>
      )}
    </group>
  );
}

function MapPins() {
  const pins = useRef<(THREE.Group | null)[]>([]);
  useFrame(({ clock }) => {
    const time = clock.getElapsedTime();
    pins.current.forEach((pin, i) => {
      if (!pin) return;
      const drop = smooth(3.15 + i * 0.07, 3.6 + i * 0.07, scrollState.chapter);
      const y = THREE.MathUtils.lerp(5, 0.38, easeOutBack(drop));
      pin.position.set(PIN_SPOTS[i][0], y + Math.sin(time * 2 + i) * 0.03 * drop, PIN_SPOTS[i][1]);
      pin.rotation.y = time * 0.6 + i;
      pin.scale.setScalar(drop > 0.001 ? 1 : 0.0001);
    });
  });
  return (
    <>
      {PIN_SPOTS.map((_, i) => {
        const color = CATEGORY_COLORS[i % CATEGORY_COLORS.length];
        return (
          <group
            key={i}
            ref={(group) => {
              pins.current[i] = group;
            }}
            scale={0.0001}
          >
            <mesh position={[0, 0.2, 0]} castShadow>
              <sphereGeometry args={[0.2, 24, 24]} />
              <meshStandardMaterial color={color} roughness={0.35} />
            </mesh>
            <mesh position={[0, -0.1, 0]} rotation={[Math.PI, 0, 0]} castShadow>
              <coneGeometry args={[0.13, 0.42, 24]} />
              <meshStandardMaterial color={color} roughness={0.35} />
            </mesh>
            <mesh position={[0, 0.2, 0.17]}>
              <circleGeometry args={[0.07, 20]} />
              <meshBasicMaterial color="#FFFFFF" />
            </mesh>
          </group>
        );
      })}
    </>
  );
}

// ---- Canvas ---------------------------------------------------------------
interface SceneProps {
  tier: Exclude<DeviceTier, "static">;
  onReady?: () => void;
}

export default function Scene({ tier, onReady }: SceneProps) {
  const high = tier === "high";
  const [dpr, setDpr] = useState(high ? 1.75 : 1.25);
  const [effects, setEffects] = useState(high);

  return (
    <Canvas
      dpr={dpr}
      gl={{ antialias: high, alpha: true, powerPreference: high ? "high-performance" : "low-power" }}
      camera={{ position: [0.4, 1.6, 7.4], fov: 38, near: 0.1, far: 80 }}
      onCreated={() => onReady?.()}
      style={{ pointerEvents: "none" }}
      aria-hidden="true"
    >
      {/* If the frame rate drops, lower the resolution and turn off effects;
          restore them when it recovers. Never swaps the scene for the still image. */}
      <PerformanceMonitor
        onDecline={() => {
          setDpr(1);
          setEffects(false);
        }}
        onIncline={() => {
          setDpr(high ? 1.75 : 1.25);
          setEffects(high);
        }}
      />
      <CameraRig />

      <ambientLight intensity={0.65} />
      <directionalLight position={[4, 8, 5]} intensity={1.5} color="#FFF4E0" />
      <directionalLight position={[-5, 4, -3]} intensity={0.35} color="#CFE0FF" />
      {/* Local light rig for soft reflections; no environment map download. */}
      <Environment resolution={high ? 256 : 64} frames={1}>
        <Lightformer form="rect" intensity={2} position={[0, 5, -6]} scale={[10, 3, 1]} color="#FFF4E0" />
        <Lightformer form="circle" intensity={1.2} position={[-6, 3, 2]} scale={4} color="#FDF1D2" />
        <Lightformer form="rect" intensity={0.8} position={[6, 2, 4]} scale={[4, 6, 1]} color="#E4EEE7" />
      </Environment>

      <MapGround detailed={high} />
      <Notebook />
      <ReelCards />
      <CategoryTokens />
      <MapPins />

      <ContactShadows
        position={[0, -0.1, 0]}
        opacity={0.35}
        scale={16}
        blur={2.6}
        far={4}
        resolution={high ? 512 : 256}
        frames={high ? Infinity : 1}
        color="#2A2219"
      />

      {effects && (
        <EffectComposer multisampling={0}>
          <Bloom intensity={0.25} luminanceThreshold={0.85} mipmapBlur />
          <Vignette offset={0.3} darkness={0.35} />
        </EffectComposer>
      )}
    </Canvas>
  );
}
