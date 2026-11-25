"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, OrbitControls, QuadraticBezierLine, RoundedBox } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { CanvasTexture, Color, RepeatWrapping, SRGBColorSpace, Vector3, type Group, type Mesh, type MeshStandardMaterial } from "three";
import { AGENTS, AGENT_BY_ID, type AgentDef } from "@/lib/agents";

type Props = {
  working: string[];
  selected: string | null;
  onSelect: (id: string) => void;
  /** Délégations en cours : [agent qui délègue, agent qui exécute]. */
  links?: [string, string][];
};

// ------------------------------------------------------------------ Apparence des agents

type Look = {
  skin: string;
  hair: string;
  hairStyle: "short" | "long" | "bun" | "curly" | "ponytail";
  glasses?: boolean;
  headset?: boolean;
  beard?: boolean;
};

const LOOKS: Record<string, Look> = {
  direction: { skin: "#e8b98f", hair: "#3b2416", hairStyle: "bun", glasses: true },
  mail: { skin: "#f3d1b5", hair: "#d9b15b", hairStyle: "long", headset: true },
  compta: { skin: "#f0c8a4", hair: "#1f1a17", hairStyle: "short", glasses: true },
  prospection: { skin: "#8a5a3c", hair: "#140f0c", hairStyle: "curly", headset: true },
  marketing: { skin: "#f6d5bd", hair: "#a3402a", hairStyle: "long" },
  documents: { skin: "#d9a477", hair: "#5a3b22", hairStyle: "short", beard: true },
  rh: { skin: "#c68b62", hair: "#20140e", hairStyle: "ponytail" },
};

// ------------------------------------------------------------------ Ambiance selon l'heure

type Ambience = { sky: string; skyGlow: number; sun: string; sunIntensity: number; hemi: number; bg: string; lamps: boolean };

function ambienceFor(hour: number): Ambience {
  if (hour >= 8 && hour < 17) return { sky: "#a9d6ff", skyGlow: 0.55, sun: "#fff6e5", sunIntensity: 1.7, hemi: 0.95, bg: "#e7edf5", lamps: false };
  if ((hour >= 17 && hour < 20) || (hour >= 6 && hour < 8))
    return { sky: "#ffb37a", skyGlow: 0.6, sun: "#ffcf9e", sunIntensity: 1.3, hemi: 0.75, bg: "#efe4da", lamps: true };
  return { sky: "#1d2b4f", skyGlow: 0.35, sun: "#9db4ff", sunIntensity: 0.45, hemi: 0.45, bg: "#1b2233", lamps: true };
}

// ------------------------------------------------------------------ Textures dessinées (aucun fichier externe)

function canvasTexture(w: number, h: number, draw: (c: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  draw(canvas.getContext("2d")!);
  const t = new CanvasTexture(canvas);
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/** Générateur pseudo-aléatoire stable : le parquet est identique à chaque chargement. */
function seeded(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
}

function useWoodTexture() {
  return useMemo(() => {
    const rand = seeded(42);
    const t = canvasTexture(1024, 1024, (c) => {
      const plankH = 64;
      for (let row = 0; row < 1024 / plankH; row++) {
        let x = -Math.floor(rand() * 300);
        while (x < 1024) {
          const w = 260 + rand() * 260;
          const l = 62 + rand() * 10;
          c.fillStyle = `hsl(${30 + rand() * 6}, ${38 + rand() * 10}%, ${l}%)`;
          c.fillRect(x, row * plankH, w, plankH);
          // veinage
          c.strokeStyle = "rgba(90,55,25,0.08)";
          for (let k = 0; k < 4; k++) {
            c.beginPath();
            const y = row * plankH + 8 + rand() * (plankH - 16);
            c.moveTo(x, y);
            c.bezierCurveTo(x + w / 3, y + rand() * 6 - 3, x + (2 * w) / 3, y + rand() * 6 - 3, x + w, y);
            c.stroke();
          }
          c.fillStyle = "rgba(60,35,15,0.35)";
          c.fillRect(x + w - 2, row * plankH, 2, plankH);
          x += w;
        }
        c.fillStyle = "rgba(60,35,15,0.4)";
        c.fillRect(0, row * plankH + plankH - 2, 1024, 2);
      }
    });
    t.wrapS = t.wrapT = RepeatWrapping;
    t.repeat.set(3, 3);
    return t;
  }, []);
}

function useRugTexture() {
  return useMemo(
    () =>
      canvasTexture(512, 512, (c) => {
        const g = c.createRadialGradient(256, 256, 40, 256, 256, 256);
        g.addColorStop(0, "#dfe7f2");
        g.addColorStop(1, "#c3cfe0");
        c.fillStyle = g;
        c.fillRect(0, 0, 512, 512);
        c.strokeStyle = "rgba(255,255,255,0.7)";
        c.lineWidth = 10;
        for (const r of [230, 200]) {
          c.beginPath();
          c.arc(256, 256, r, 0, Math.PI * 2);
          c.stroke();
        }
        c.strokeStyle = "rgba(120,140,170,0.35)";
        c.lineWidth = 4;
        for (let i = 0; i < 16; i++) {
          const a = (i / 16) * Math.PI * 2;
          c.beginPath();
          c.moveTo(256 + Math.cos(a) * 120, 256 + Math.sin(a) * 120);
          c.lineTo(256 + Math.cos(a) * 185, 256 + Math.sin(a) * 185);
          c.stroke();
        }
      }),
    [],
  );
}

function useWhiteboardTexture() {
  return useMemo(
    () =>
      canvasTexture(512, 256, (c) => {
        c.fillStyle = "#fbfcfd";
        c.fillRect(0, 0, 512, 256);
        c.font = "bold 22px sans-serif";
        c.fillStyle = "#334155";
        c.fillText("Objectifs du trimestre", 24, 38);
        const bars = [70, 110, 95, 150, 175];
        bars.forEach((h, i) => {
          c.fillStyle = ["#8b5cf6", "#ec4899", "#10b981", "#f59e0b", "#3b82f6"][i];
          c.fillRect(40 + i * 60, 220 - h, 38, h);
        });
        c.strokeStyle = "#ef4444";
        c.lineWidth = 4;
        c.beginPath();
        c.moveTo(40, 170);
        bars.forEach((h, i) => c.lineTo(59 + i * 60, 205 - h));
        c.stroke();
        c.fillStyle = "#64748b";
        c.font = "18px sans-serif";
        ["✓ Lancer l'offre", "✓ 10 nouveaux clients", "○ Recruter un vendeur"].forEach((txt, i) => c.fillText(txt, 340, 90 + i * 40));
      }),
    [],
  );
}

function usePosterTexture() {
  return useMemo(
    () =>
      canvasTexture(256, 340, (c) => {
        const g = c.createLinearGradient(0, 0, 256, 340);
        g.addColorStop(0, "#fde68a");
        g.addColorStop(1, "#f472b6");
        c.fillStyle = g;
        c.fillRect(0, 0, 256, 340);
        c.fillStyle = "rgba(255,255,255,0.85)";
        c.beginPath();
        c.arc(128, 140, 70, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = "#1f2937";
        c.font = "bold 30px sans-serif";
        c.textAlign = "center";
        c.fillText("Osez", 128, 290);
        c.font = "18px sans-serif";
        c.fillText("chaque jour", 128, 315);
      }),
    [],
  );
}

/** Écran d'un poste : barre de titre à la couleur de l'agent et lignes qui défilent quand il travaille. */
function useScreenTexture(color: string, seed: number) {
  return useMemo(() => {
    const rand = seeded(seed);
    const t = canvasTexture(256, 512, (c) => {
      c.fillStyle = "#0f172a";
      c.fillRect(0, 0, 256, 512);
      for (let y = 12; y < 512; y += 18) {
        const indent = Math.floor(rand() * 4) * 14;
        const w = 40 + rand() * 150;
        c.fillStyle = rand() > 0.75 ? color : rand() > 0.5 ? "#94a3b8" : "#475569";
        c.fillRect(14 + indent, y, w, 7);
        if (rand() > 0.6) {
          c.fillStyle = "#334155";
          c.fillRect(24 + indent + w, y, 30 + rand() * 40, 7);
        }
      }
    });
    t.wrapS = t.wrapT = RepeatWrapping;
    t.repeat.set(1, 0.35);
    return t;
  }, [color, seed]);
}

// ------------------------------------------------------------------ Scène

export default function Office3D({ working, selected, onSelect, links = [] }: Props) {
  // Étiquettes en HTML classique au-dessus du canvas, repositionnées à chaque image.
  const labelRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [hour, setHour] = useState(() => new Date().getHours());
  useEffect(() => {
    const t = setInterval(() => setHour(new Date().getHours()), 60_000);
    return () => clearInterval(t);
  }, []);
  const amb = ambienceFor(hour);

  return (
    <div className="relative h-full w-full">
      <Canvas shadows camera={{ position: [0, 22, 26], fov: 42 }} dpr={[1, 2]}>
        <color attach="background" args={[amb.bg]} />
        <fog attach="fog" args={[amb.bg, 32, 60]} />
        <hemisphereLight args={["#ffffff", "#c8b8a2", amb.hemi]} />
        <directionalLight
          position={[7, 13, 4]}
          color={amb.sun}
          intensity={amb.sunIntensity}
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-bias={-0.0004}
          shadow-camera-left={-13}
          shadow-camera-right={13}
          shadow-camera-top={13}
          shadow-camera-bottom={-13}
        />
        <Room amb={amb} />
        <MeetingTable lamps={amb.lamps} />
        <Lounge />
        <Bookshelf position={[-9.55, 0, 6.2]} />
        <CoffeeCorner position={[-8.9, 0, -8.4]} />
        <Plant position={[-9, 0, 9]} size={1.2} />
        <Plant position={[9.1, 0, 9]} size={1.1} />
        <Plant position={[9.2, 0, -3.2]} size={0.9} />
        <Plant position={[-9.2, 0, -3.4]} size={0.8} />
        {AGENTS.map((a, i) => (
          <Workstation
            key={a.id}
            agent={a}
            seed={i + 1}
            working={working.includes(a.id)}
            selected={selected === a.id}
            lamp={amb.lamps}
            onSelect={() => onSelect(a.id)}
          />
        ))}
        {links.map(([from, to]) => (
          <DelegationBeam key={`${from}-${to}`} from={from} to={to} />
        ))}
        <LabelTracker refs={labelRefs} />
        <ContactShadows position={[0, 0.012, 0]} opacity={0.4} scale={24} blur={2.2} far={3.5} />
        <OrbitControls
          makeDefault
          target={[0, 0, 0.5]}
          maxPolarAngle={Math.PI / 2.3}
          minDistance={7}
          maxDistance={28}
          enablePan={false}
          enableDamping
          // Les murs sont au fond et à gauche : on empêche la caméra de passer derrière.
          minAzimuthAngle={-0.35}
          maxAzimuthAngle={1.2}
        />
        <CameraIntro />
      </Canvas>
      {AGENTS.map((a) => {
        const isWorking = working.includes(a.id);
        const isSelected = selected === a.id;
        return (
          <div
            key={a.id}
            ref={(el) => {
              labelRefs.current[a.id] = el;
            }}
            onClick={() => onSelect(a.id)}
            className={`absolute left-0 top-0 flex cursor-pointer select-none items-center gap-1 whitespace-nowrap rounded-full py-0.5 pl-0.5 pr-2 text-[10px] font-semibold shadow-lg backdrop-blur transition-colors sm:gap-1.5 sm:py-1 sm:pl-1 sm:pr-3 sm:text-xs ${
              isSelected ? "text-white" : "bg-white/90 text-gray-900"
            }`}
            style={{ visibility: "hidden", background: isSelected ? a.color : undefined }}
          >
            <span
              className="grid h-5 w-5 place-items-center rounded-full text-[10px] text-white sm:h-6 sm:w-6 sm:text-[11px]"
              style={{ background: isSelected ? "rgba(255,255,255,0.25)" : a.color }}
            >
              {a.name[0]}
            </span>
            <span className="leading-tight">
              {a.name}
              <span
                className={`${isWorking ? "block" : "hidden sm:block"} text-[10px] font-normal ${isSelected ? "text-white/80" : "text-gray-500"}`}
              >
                {isWorking ? (
                  <span className="inline-flex items-center gap-1">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-amber-500" />
                    </span>
                    au travail
                  </span>
                ) : (
                  a.role
                )}
              </span>
            </span>
          </div>
        );
      })}
    </div>
  );
}

/** Arrivée en douceur de la caméra au chargement. */
function CameraIntro() {
  const { camera } = useThree();
  const start = useRef<number | null>(null);
  const from = useMemo(() => new Vector3(0, 22, 26), []);
  const to = useMemo(() => new Vector3(0, 13.5, 16.5), []);
  useFrame(({ clock }) => {
    if (start.current === null) start.current = clock.elapsedTime;
    const k = Math.min((clock.elapsedTime - start.current) / 1.8, 1);
    if (k >= 1) return;
    const e = 1 - Math.pow(1 - k, 3);
    camera.position.lerpVectors(from, to, e);
  });
  return null;
}

/** Projette la position 3D au-dessus de chaque agent vers l'écran et place son étiquette. */
function LabelTracker({ refs }: { refs: RefObject<Record<string, HTMLDivElement | null>> }) {
  const v = useRef(new Vector3());
  useFrame(({ camera, size }) => {
    for (const a of AGENTS) {
      const el = refs.current[a.id];
      if (!el) continue;
      v.current.set(a.desk[0], 2.35, a.desk[1]).project(camera);
      const x = (v.current.x * 0.5 + 0.5) * size.width;
      const y = (-v.current.y * 0.5 + 0.5) * size.height;
      el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -100%)`;
      el.style.visibility = v.current.z < 1 ? "visible" : "hidden";
    }
  });
  return null;
}

// ------------------------------------------------------------------ Pièce

function Room({ amb }: { amb: Ambience }) {
  const wood = useWoodTexture();
  const rug = useRugTexture();
  const board = useWhiteboardTexture();
  const poster = usePosterTexture();
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial map={wood} roughness={0.75} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.006, 1]} receiveShadow>
        <circleGeometry args={[3.3, 64]} />
        <meshStandardMaterial map={rug} roughness={1} />
      </mesh>

      {/* murs */}
      <mesh position={[0, 2, -10.1]} receiveShadow>
        <boxGeometry args={[20.4, 4, 0.2]} />
        <meshStandardMaterial color="#f4efe7" />
      </mesh>
      <mesh position={[-10.1, 2, 0]} receiveShadow>
        <boxGeometry args={[0.2, 4, 20.4]} />
        <meshStandardMaterial color="#ece6dc" />
      </mesh>
      {/* plinthes */}
      <mesh position={[0, 0.08, -9.98]}>
        <boxGeometry args={[20, 0.16, 0.05]} />
        <meshStandardMaterial color="#d8cfc1" />
      </mesh>
      <mesh position={[-9.98, 0.08, 0]}>
        <boxGeometry args={[0.05, 0.16, 20]} />
        <meshStandardMaterial color="#d8cfc1" />
      </mesh>

      {/* fenêtres : ciel selon l'heure, encadrement et croisillon */}
      {[-5, 0, 5].map((x) => (
        <group key={x} position={[x, 2.2, -9.98]}>
          <mesh>
            <planeGeometry args={[3, 1.9]} />
            <meshStandardMaterial color={amb.sky} emissive={amb.sky} emissiveIntensity={amb.skyGlow} />
          </mesh>
          {[
            [0, 0.98, 3.16, 0.1],
            [0, -0.98, 3.16, 0.14],
            [-1.53, 0, 0.1, 2.06],
            [1.53, 0, 0.1, 2.06],
            [0, 0, 0.06, 1.9],
            [0, 0.15, 3, 0.05],
          ].map(([px, py, w, h], i) => (
            <mesh key={i} position={[px, py, 0.03]}>
              <boxGeometry args={[w, h, 0.06]} />
              <meshStandardMaterial color="#ffffff" />
            </mesh>
          ))}
        </group>
      ))}
      {/* lumière du soleil qui entre */}
      {[-5, 0, 5].map((x) => (
        <mesh key={`sun${x}`} rotation-x={-Math.PI / 2} position={[x + 0.6, 0.008, -8.2]}>
          <planeGeometry args={[2.8, 2.6]} />
          <meshBasicMaterial color={amb.sky} transparent opacity={amb.lamps ? 0.04 : 0.12} />
        </mesh>
      ))}

      {/* tableau blanc */}
      <group position={[-9.97, 2, 0.5]} rotation-y={Math.PI / 2}>
        <mesh position={[0, 0, -0.03]}>
          <boxGeometry args={[4.2, 2.1, 0.05]} />
          <meshStandardMaterial color="#cbd5e1" />
        </mesh>
        <mesh>
          <planeGeometry args={[4, 1.95]} />
          <meshStandardMaterial map={board} />
        </mesh>
      </group>

      <WallClock position={[-2.5, 3.1, -9.97]} />
      {/* tableau décoratif au-dessus du canapé */}
      <group position={[7.6, 2.5, -9.97]}>
        <mesh position={[0, 0, -0.02]}>
          <boxGeometry args={[1.25, 1.6, 0.05]} />
          <meshStandardMaterial color="#1f2937" />
        </mesh>
        <mesh position={[0, 0, 0.012]}>
          <planeGeometry args={[1.1, 1.45]} />
          <meshStandardMaterial map={poster} />
        </mesh>
      </group>
    </group>
  );
}

function WallClock({ position }: { position: [number, number, number] }) {
  const hourHand = useRef<Group>(null);
  const minuteHand = useRef<Group>(null);
  useFrame(() => {
    const d = new Date();
    const m = d.getMinutes() + d.getSeconds() / 60;
    const h = (d.getHours() % 12) + m / 60;
    if (minuteHand.current) minuteHand.current.rotation.z = -(m / 60) * Math.PI * 2;
    if (hourHand.current) hourHand.current.rotation.z = -(h / 12) * Math.PI * 2;
  });
  return (
    <group position={position}>
      <mesh rotation-x={Math.PI / 2}>
        <cylinderGeometry args={[0.42, 0.42, 0.06, 40]} />
        <meshStandardMaterial color="#1f2937" />
      </mesh>
      <mesh position={[0, 0, 0.035]}>
        <circleGeometry args={[0.37, 40]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      {Array.from({ length: 12 }, (_, i) => (
        <mesh key={i} position={[Math.sin((i / 12) * Math.PI * 2) * 0.31, Math.cos((i / 12) * Math.PI * 2) * 0.31, 0.04]}>
          <circleGeometry args={[i % 3 === 0 ? 0.025 : 0.013, 8]} />
          <meshBasicMaterial color="#334155" />
        </mesh>
      ))}
      <group ref={hourHand} position={[0, 0, 0.05]}>
        <mesh position={[0, 0.09, 0]}>
          <boxGeometry args={[0.03, 0.18, 0.01]} />
          <meshBasicMaterial color="#111827" />
        </mesh>
      </group>
      <group ref={minuteHand} position={[0, 0, 0.055]}>
        <mesh position={[0, 0.13, 0]}>
          <boxGeometry args={[0.02, 0.26, 0.01]} />
          <meshBasicMaterial color="#111827" />
        </mesh>
      </group>
    </group>
  );
}

function MeetingTable({ lamps }: { lamps: boolean }) {
  return (
    <group position={[0, 0, 1]}>
      <mesh position={[0, 0.75, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[1.35, 1.35, 0.08, 48]} />
        <meshStandardMaterial color="#7a5a3f" roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.37, 0]} castShadow>
        <cylinderGeometry args={[0.1, 0.3, 0.74, 20]} />
        <meshStandardMaterial color="#374151" metalness={0.4} roughness={0.4} />
      </mesh>
      {/* chaises autour */}
      {[0.6, 2.2, 3.8, 5.4].map((a) => (
        <group key={a} position={[Math.sin(a) * 1.8, 0, Math.cos(a) * 1.8]} rotation-y={a + Math.PI}>
          <mesh position={[0, 0.45, 0]} castShadow>
            <cylinderGeometry args={[0.28, 0.28, 0.08, 20]} />
            <meshStandardMaterial color="#e2e8f0" />
          </mesh>
          <mesh position={[0, 0.22, 0]}>
            <cylinderGeometry args={[0.03, 0.03, 0.44, 8]} />
            <meshStandardMaterial color="#94a3b8" metalness={0.6} />
          </mesh>
        </group>
      ))}
      {/* tasses et carnet */}
      <mesh position={[0.4, 0.84, 0.2]} castShadow>
        <cylinderGeometry args={[0.07, 0.06, 0.12, 14]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      <mesh position={[-0.3, 0.8, -0.35]} rotation-y={0.4} castShadow>
        <boxGeometry args={[0.4, 0.03, 0.55]} />
        <meshStandardMaterial color="#0ea5e9" />
      </mesh>
      {/* suspensions */}
      {[-0.6, 0.6].map((x) => (
        <group key={x} position={[x, 0, 0]}>
          <mesh position={[0, 5, 0]}>
            <cylinderGeometry args={[0.006, 0.006, 2, 4]} />
            <meshBasicMaterial color="#94a3b8" />
          </mesh>
          <mesh position={[0, 3.95, 0]}>
            <coneGeometry args={[0.2, 0.22, 24, 1, true]} />
            <meshStandardMaterial color="#e8dcc8" side={2} />
          </mesh>
          <mesh position={[0, 3.87, 0]}>
            <sphereGeometry args={[0.1, 12, 12]} />
            <meshStandardMaterial color="#fff7d6" emissive="#ffd88a" emissiveIntensity={lamps ? 2 : 0.3} />
          </mesh>
          {lamps && <pointLight position={[0, 3.7, 0]} intensity={5} distance={7} color="#ffd9a0" />}
        </group>
      ))}
    </group>
  );
}

function Lounge() {
  return (
    <group position={[7.6, 0, -8.6]}>
      {/* canapé */}
      <RoundedBox args={[3, 0.45, 1]} radius={0.12} position={[0, 0.35, 0]} castShadow receiveShadow>
        <meshStandardMaterial color="#5b7c99" />
      </RoundedBox>
      <RoundedBox args={[3, 0.75, 0.3]} radius={0.12} position={[0, 0.75, -0.38]} castShadow>
        <meshStandardMaterial color="#5b7c99" />
      </RoundedBox>
      {[-1.42, 1.42].map((x) => (
        <RoundedBox key={x} args={[0.25, 0.6, 1]} radius={0.1} position={[x, 0.55, 0]} castShadow>
          <meshStandardMaterial color="#4f6d88" />
        </RoundedBox>
      ))}
      {[-0.6, 0.55].map((x, i) => (
        <RoundedBox key={x} args={[0.55, 0.45, 0.15]} radius={0.07} position={[x, 0.82, -0.18]} rotation-x={-0.2} castShadow>
          <meshStandardMaterial color={i ? "#f2c14e" : "#e76f51"} />
        </RoundedBox>
      ))}
      {/* table basse */}
      <mesh position={[0, 0.32, 1.25]} castShadow receiveShadow>
        <cylinderGeometry args={[0.55, 0.55, 0.06, 32]} />
        <meshStandardMaterial color="#e7dccb" />
      </mesh>
      <mesh position={[0, 0.15, 1.25]}>
        <cylinderGeometry args={[0.05, 0.12, 0.3, 12]} />
        <meshStandardMaterial color="#1f2937" />
      </mesh>
      <mesh position={[0.15, 0.4, 1.2]} castShadow>
        <boxGeometry args={[0.35, 0.05, 0.25]} />
        <meshStandardMaterial color="#f97316" />
      </mesh>
    </group>
  );
}

function Bookshelf({ position }: { position: [number, number, number] }) {
  const books = useMemo(() => {
    const rand = seeded(7);
    const out: { x: number; y: number; h: number; w: number; c: string }[] = [];
    const colors = ["#1d4ed8", "#be123c", "#047857", "#b45309", "#6d28d9", "#0f766e", "#e11d48", "#334155"];
    for (const y of [0.45, 1.15, 1.85]) {
      let x = -1;
      while (x < 0.95) {
        const w = 0.08 + rand() * 0.07;
        if (rand() > 0.12) out.push({ x: x + w / 2, y, h: 0.38 + rand() * 0.2, w, c: colors[Math.floor(rand() * colors.length)] });
        x += w + 0.01;
      }
    }
    return out;
  }, []);
  return (
    <group position={position} rotation-y={Math.PI / 2}>
      <mesh position={[0, 1.2, -0.02]} castShadow receiveShadow>
        <boxGeometry args={[2.2, 2.4, 0.04]} />
        <meshStandardMaterial color="#8b6a4a" />
      </mesh>
      {[0.2, 0.9, 1.6, 2.3].map((y) => (
        <mesh key={y} position={[0, y, 0.18]} castShadow receiveShadow>
          <boxGeometry args={[2.2, 0.05, 0.4]} />
          <meshStandardMaterial color="#a07c58" />
        </mesh>
      ))}
      {[-1.08, 1.08].map((x) => (
        <mesh key={x} position={[x, 1.2, 0.18]} castShadow>
          <boxGeometry args={[0.05, 2.4, 0.4]} />
          <meshStandardMaterial color="#a07c58" />
        </mesh>
      ))}
      {books.map((b, i) => (
        <mesh key={i} position={[b.x, b.y - 0.23 + b.h / 2, 0.2]} castShadow>
          <boxGeometry args={[b.w, b.h, 0.28]} />
          <meshStandardMaterial color={b.c} />
        </mesh>
      ))}
    </group>
  );
}

function CoffeeCorner({ position }: { position: [number, number, number] }) {
  const steam = useRef<Mesh>(null);
  useFrame(({ clock }) => {
    if (!steam.current) return;
    const t = clock.elapsedTime % 2;
    steam.current.position.y = 1.35 + t * 0.25;
    (steam.current.material as MeshStandardMaterial).opacity = 0.35 * (1 - t / 2);
  });
  return (
    <group position={position} rotation-y={Math.PI / 4}>
      <RoundedBox args={[1.4, 0.9, 0.7]} radius={0.04} position={[0, 0.45, 0]} castShadow receiveShadow>
        <meshStandardMaterial color="#f8fafc" />
      </RoundedBox>
      <mesh position={[0, 0.92, 0]}>
        <boxGeometry args={[1.44, 0.04, 0.74]} />
        <meshStandardMaterial color="#334155" />
      </mesh>
      {/* machine à café */}
      <RoundedBox args={[0.38, 0.5, 0.35]} radius={0.04} position={[-0.3, 1.2, -0.05]} castShadow>
        <meshStandardMaterial color="#111827" metalness={0.3} roughness={0.4} />
      </RoundedBox>
      <mesh position={[-0.3, 1.02, 0.1]}>
        <cylinderGeometry args={[0.05, 0.04, 0.08, 12]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      <mesh ref={steam} position={[-0.3, 1.35, 0.1]}>
        <sphereGeometry args={[0.05, 8, 8]} />
        <meshStandardMaterial color="#ffffff" transparent opacity={0.3} />
      </mesh>
      {/* tasses */}
      {[0.2, 0.38].map((x) => (
        <mesh key={x} position={[x, 0.99, 0.12]} castShadow>
          <cylinderGeometry args={[0.05, 0.045, 0.09, 12]} />
          <meshStandardMaterial color={x > 0.3 ? "#f59e0b" : "#8b5cf6"} />
        </mesh>
      ))}
    </group>
  );
}

function Plant({ position, size = 1 }: { position: [number, number, number]; size?: number }) {
  const leaves = useMemo(() => {
    const rand = seeded(Math.round(position[0] * 13 + position[2] * 7 + 100));
    return Array.from({ length: 7 }, (_, i) => ({
      a: (i / 7) * Math.PI * 2 + rand() * 0.4,
      tilt: 0.5 + rand() * 0.5,
      h: 0.55 + rand() * 0.35,
      c: rand() > 0.5 ? "#3f8f4f" : "#4fa25f",
    }));
  }, [position]);
  return (
    <group position={position} scale={size}>
      <mesh position={[0, 0.28, 0]} castShadow>
        <cylinderGeometry args={[0.3, 0.22, 0.56, 20]} />
        <meshStandardMaterial color="#e5d5c0" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.55, 0]}>
        <cylinderGeometry args={[0.28, 0.28, 0.02, 20]} />
        <meshStandardMaterial color="#4a3426" />
      </mesh>
      {leaves.map((l, i) => (
        <group key={i} position={[0, 0.55, 0]} rotation={[0, l.a, l.tilt]}>
          <mesh position={[0, l.h / 2 + 0.05, 0]} castShadow>
            <sphereGeometry args={[0.12, 10, 10]} />
            <meshStandardMaterial color={l.c} />
          </mesh>
          <mesh position={[0, l.h / 2 + 0.05, 0]} scale={[0.9, l.h * 3.2, 0.35]} castShadow>
            <sphereGeometry args={[0.12, 10, 10]} />
            <meshStandardMaterial color={l.c} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// ------------------------------------------------------------------ Postes de travail

function Workstation({
  agent,
  seed,
  working,
  selected,
  lamp,
  onSelect,
}: {
  agent: AgentDef;
  seed: number;
  working: boolean;
  selected: boolean;
  lamp: boolean;
  onSelect: () => void;
}) {
  const [hover, setHover] = useState(false);
  const ring = useRef<Mesh>(null);
  const [x, z] = agent.desk;
  // Chaque poste tourne le dos au centre de la pièce.
  const rotation = Math.atan2(-x, -z + 1);
  useFrame(({ clock }) => {
    if (!ring.current) return;
    const m = ring.current.material as MeshStandardMaterial;
    m.opacity = selected ? 0.28 + Math.sin(clock.elapsedTime * 3) * 0.08 : hover ? 0.2 : 0.07;
  });

  return (
    <group
      position={[x, 0, z]}
      rotation-y={rotation}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHover(true);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        setHover(false);
        document.body.style.cursor = "";
      }}
    >
      <mesh ref={ring} rotation-x={-Math.PI / 2} position={[0, 0.01, -0.35]}>
        <circleGeometry args={[1.75, 48]} />
        <meshStandardMaterial color={agent.color} transparent opacity={0.07} />
      </mesh>
      <Desk color={agent.color} seed={seed} working={working} lamp={lamp} />
      <Chair color={agent.color} />
      <Character look={LOOKS[agent.id] ?? LOOKS.compta} color={agent.color} working={working} />
    </group>
  );
}

function Desk({ color, seed, working, lamp }: { color: string; seed: number; working: boolean; lamp: boolean }) {
  const screenTex = useScreenTexture(color, seed * 97);
  const glow = useRef<MeshStandardMaterial>(null);
  useFrame(({ clock }, delta) => {
    if (working) screenTex.offset.y += delta * 0.08;
    if (glow.current) glow.current.emissiveIntensity = working ? 0.9 + Math.sin(clock.elapsedTime * 5) * 0.1 : 0.45;
  });
  return (
    <group position={[0, 0, -0.9]}>
      <RoundedBox args={[2.2, 0.07, 1]} radius={0.025} position={[0, 0.78, 0]} castShadow receiveShadow>
        <meshStandardMaterial color="#c8a27c" roughness={0.6} />
      </RoundedBox>
      {/* pieds en métal */}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 0.98, 0, 0]}>
          <mesh position={[0, 0.38, -0.4]} castShadow>
            <boxGeometry args={[0.05, 0.76, 0.05]} />
            <meshStandardMaterial color="#1f2937" metalness={0.5} roughness={0.4} />
          </mesh>
          <mesh position={[0, 0.38, 0.4]} castShadow>
            <boxGeometry args={[0.05, 0.76, 0.05]} />
            <meshStandardMaterial color="#1f2937" metalness={0.5} roughness={0.4} />
          </mesh>
        </group>
      ))}
      {/* écran */}
      <RoundedBox args={[1.0, 0.6, 0.04]} radius={0.015} position={[0, 1.25, -0.28]} castShadow>
        <meshStandardMaterial color="#0b1220" />
      </RoundedBox>
      <mesh position={[0, 1.25, -0.257]}>
        <planeGeometry args={[0.93, 0.53]} />
        <meshStandardMaterial ref={glow} map={screenTex} emissiveMap={screenTex} emissive="#ffffff" emissiveIntensity={0.45} />
      </mesh>
      <mesh position={[0, 1.53, -0.255]}>
        <planeGeometry args={[0.93, 0.05]} />
        <meshBasicMaterial color={color} />
      </mesh>
      <mesh position={[0, 0.95, -0.3]}>
        <boxGeometry args={[0.05, 0.3, 0.05]} />
        <meshStandardMaterial color="#334155" />
      </mesh>
      <mesh position={[0, 0.82, -0.3]}>
        <boxGeometry args={[0.3, 0.02, 0.18]} />
        <meshStandardMaterial color="#334155" />
      </mesh>
      {/* clavier, souris, mug, carnet */}
      <RoundedBox args={[0.62, 0.025, 0.2]} radius={0.01} position={[0, 0.83, 0.12]}>
        <meshStandardMaterial color="#e5e7eb" />
      </RoundedBox>
      <mesh position={[0.45, 0.83, 0.15]} scale={[1, 0.5, 1.4]}>
        <sphereGeometry args={[0.045, 12, 12]} />
        <meshStandardMaterial color="#e5e7eb" />
      </mesh>
      <mesh position={[0.82, 0.88, -0.05]} castShadow>
        <cylinderGeometry args={[0.06, 0.055, 0.13, 14]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[-0.72, 0.83, 0.05]} rotation-y={0.25}>
        <boxGeometry args={[0.32, 0.03, 0.42]} />
        <meshStandardMaterial color="#f8fafc" />
      </mesh>
      {/* lampe de bureau, allumée le soir */}
      <group position={[-0.85, 0.82, -0.3]}>
        <mesh position={[0, 0.02, 0]}>
          <cylinderGeometry args={[0.1, 0.1, 0.03, 16]} />
          <meshStandardMaterial color="#111827" />
        </mesh>
        <mesh position={[0, 0.25, 0]} rotation-z={0.25}>
          <cylinderGeometry args={[0.012, 0.012, 0.45, 6]} />
          <meshStandardMaterial color="#111827" />
        </mesh>
        <mesh position={[0.08, 0.47, 0.05]} rotation-x={0.4}>
          <coneGeometry args={[0.1, 0.14, 16, 1, true]} />
          <meshStandardMaterial color="#111827" side={2} />
        </mesh>
        <mesh position={[0.08, 0.43, 0.07]}>
          <sphereGeometry args={[0.035, 8, 8]} />
          <meshStandardMaterial color="#fff7d6" emissive="#ffd88a" emissiveIntensity={lamp ? 3 : 0.1} />
        </mesh>
        {lamp && <pointLight position={[0.1, 0.35, 0.2]} intensity={1.2} distance={2} color="#ffd9a0" />}
      </group>
    </group>
  );
}

function Chair({ color }: { color: string }) {
  const accent = useMemo(() => new Color(color).lerp(new Color("#1f2937"), 0.55).getStyle(), [color]);
  return (
    <group position={[0, 0, 0.18]}>
      <RoundedBox args={[0.62, 0.1, 0.6]} radius={0.04} position={[0, 0.5, 0]} castShadow>
        <meshStandardMaterial color={accent} />
      </RoundedBox>
      <RoundedBox args={[0.6, 0.72, 0.08]} radius={0.04} position={[0, 0.92, 0.3]} rotation-x={-0.08} castShadow>
        <meshStandardMaterial color={accent} />
      </RoundedBox>
      <mesh position={[0, 0.27, 0]}>
        <cylinderGeometry args={[0.035, 0.035, 0.45, 8]} />
        <meshStandardMaterial color="#9ca3af" metalness={0.6} />
      </mesh>
      {[0, 1, 2, 3, 4].map((i) => (
        <mesh key={i} position={[Math.sin((i / 5) * Math.PI * 2) * 0.22, 0.05, Math.cos((i / 5) * Math.PI * 2) * 0.22]} rotation-y={(i / 5) * Math.PI * 2}>
          <boxGeometry args={[0.04, 0.03, 0.44]} />
          <meshStandardMaterial color="#374151" />
        </mesh>
      ))}
    </group>
  );
}

function Character({ look, color, working }: { look: Look; color: string; working: boolean }) {
  const body = useRef<Group>(null);
  const head = useRef<Group>(null);
  const armL = useRef<Group>(null);
  const armR = useRef<Group>(null);
  const eyes = useRef<Group>(null);
  const offset = useRef(Math.random() * 10);
  const nextBlink = useRef(2 + Math.random() * 3);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime + offset.current;
    if (body.current) {
      body.current.position.y = working ? Math.abs(Math.sin(t * 9)) * 0.012 : Math.sin(t * 1.6) * 0.008;
    }
    if (head.current) {
      head.current.rotation.y = working ? Math.sin(t * 1.3) * 0.08 : Math.sin(t * 0.45) * 0.35;
      head.current.rotation.x = working ? 0.12 : Math.sin(t * 0.3) * 0.05;
    }
    const swing = working ? 0.22 : 0.02;
    if (armL.current) armL.current.rotation.x = -1.15 + Math.sin(t * 15) * swing;
    if (armR.current) armR.current.rotation.x = -1.15 + Math.sin(t * 15 + Math.PI) * swing;
    // clignement des yeux
    if (eyes.current) {
      const local = clock.elapsedTime;
      if (local > nextBlink.current + 0.12) nextBlink.current = local + 2.5 + Math.random() * 3.5;
      eyes.current.scale.y = local > nextBlink.current ? 0.1 : 1;
    }
  });

  return (
    <group ref={body} position={[0, 0, 0.12]}>
      {/* buste et col */}
      <mesh position={[0, 0.98, 0]} castShadow>
        <capsuleGeometry args={[0.23, 0.38, 8, 20]} />
        <meshStandardMaterial color={color} roughness={0.8} />
      </mesh>
      <mesh position={[0, 1.27, -0.02]}>
        <cylinderGeometry args={[0.09, 0.1, 0.1, 16]} />
        <meshStandardMaterial color={look.skin} />
      </mesh>
      {/* tête */}
      <group ref={head} position={[0, 1.5, 0]}>
        <mesh castShadow>
          <sphereGeometry args={[0.21, 32, 32]} />
          <meshStandardMaterial color={look.skin} roughness={0.7} />
        </mesh>
        {/* oreilles */}
        {[-0.205, 0.205].map((ex) => (
          <mesh key={ex} position={[ex, -0.01, 0]} scale={[0.5, 1, 0.8]}>
            <sphereGeometry args={[0.05, 12, 12]} />
            <meshStandardMaterial color={look.skin} />
          </mesh>
        ))}
        {/* yeux, sourcils, sourire (le visage regarde vers -z) */}
        <group ref={eyes}>
          {[-0.075, 0.075].map((ex) => (
            <mesh key={ex} position={[ex, 0.02, -0.19]}>
              <sphereGeometry args={[0.026, 12, 12]} />
              <meshStandardMaterial color="#111827" />
            </mesh>
          ))}
        </group>
        {[-0.075, 0.075].map((ex) => (
          <mesh key={`b${ex}`} position={[ex, 0.085, -0.19]} rotation-z={ex > 0 ? -0.15 : 0.15}>
            <boxGeometry args={[0.07, 0.014, 0.01]} />
            <meshStandardMaterial color={look.hair} />
          </mesh>
        ))}
        <mesh position={[0, -0.06, -0.185]} rotation={[0.25, 0, Math.PI]}>
          <torusGeometry args={[0.05, 0.011, 8, 16, Math.PI]} />
          <meshStandardMaterial color="#9f3b3b" />
        </mesh>
        {[-0.12, 0.12].map((ex) => (
          <mesh key={`c${ex}`} position={[ex, -0.03, -0.17]}>
            <sphereGeometry args={[0.03, 10, 10]} />
            <meshStandardMaterial color="#f29b9b" transparent opacity={0.45} />
          </mesh>
        ))}
        <Hair look={look} />
        {look.glasses && (
          <group position={[0, 0.02, -0.205]}>
            {[-0.075, 0.075].map((ex) => (
              <mesh key={ex} position={[ex, 0, 0]}>
                <torusGeometry args={[0.045, 0.009, 8, 20]} />
                <meshStandardMaterial color="#111827" />
              </mesh>
            ))}
            <mesh>
              <boxGeometry args={[0.06, 0.008, 0.008]} />
              <meshStandardMaterial color="#111827" />
            </mesh>
          </group>
        )}
        {look.headset && (
          <group>
            <mesh rotation-y={Math.PI / 2}>
              <torusGeometry args={[0.235, 0.014, 8, 24, Math.PI]} />
              <meshStandardMaterial color="#1f2937" />
            </mesh>
            {[-0.23, 0.23].map((ex) => (
              <mesh key={ex} position={[ex, 0, 0]} rotation-z={Math.PI / 2}>
                <cylinderGeometry args={[0.06, 0.06, 0.04, 16]} />
                <meshStandardMaterial color="#111827" />
              </mesh>
            ))}
            <mesh position={[-0.16, -0.1, -0.12]} rotation={[0.9, 0, -0.5]}>
              <cylinderGeometry args={[0.008, 0.008, 0.2, 6]} />
              <meshStandardMaterial color="#111827" />
            </mesh>
          </group>
        )}
        {look.beard && (
          <mesh position={[0, -0.09, -0.07]} scale={[1, 0.75, 0.95]}>
            <sphereGeometry args={[0.165, 20, 20, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
            <meshStandardMaterial color={look.hair} />
          </mesh>
        )}
      </group>
      {/* bras (épaule, avant-bras, main) */}
      {[
        { ref: armL, x: -0.31 },
        { ref: armR, x: 0.31 },
      ].map(({ ref, x }) => (
        <group key={x} ref={ref} position={[x, 1.18, -0.02]} rotation-x={-1.15}>
          <mesh position={[0, -0.2, 0]} castShadow>
            <capsuleGeometry args={[0.065, 0.32, 6, 10]} />
            <meshStandardMaterial color={color} roughness={0.8} />
          </mesh>
          <mesh position={[0, -0.44, 0]}>
            <sphereGeometry args={[0.06, 12, 12]} />
            <meshStandardMaterial color={look.skin} />
          </mesh>
        </group>
      ))}
      {/* jambes (assis) */}
      {[-0.11, 0.11].map((lx) => (
        <group key={lx}>
          <mesh position={[lx, 0.62, -0.18]} rotation-x={Math.PI / 2} castShadow>
            <capsuleGeometry args={[0.085, 0.32, 6, 10]} />
            <meshStandardMaterial color="#27324a" />
          </mesh>
          <mesh position={[lx, 0.33, -0.4]} castShadow>
            <capsuleGeometry args={[0.075, 0.38, 6, 10]} />
            <meshStandardMaterial color="#27324a" />
          </mesh>
          <mesh position={[lx, 0.07, -0.47]} scale={[1, 0.6, 1.5]}>
            <sphereGeometry args={[0.08, 12, 12]} />
            <meshStandardMaterial color="#1f2937" />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function Hair({ look }: { look: Look }) {
  const mat = <meshStandardMaterial color={look.hair} roughness={0.9} />;
  const cap = (
    <mesh position={[0, 0.03, 0.02]} rotation-x={-0.35}>
      <sphereGeometry args={[0.222, 32, 32, 0, Math.PI * 2, 0, Math.PI / 1.9]} />
      {mat}
    </mesh>
  );
  if (look.hairStyle === "curly") {
    const puffs = Array.from({ length: 14 }, (_, i) => {
      const a = (i / 14) * Math.PI * 2;
      return [Math.cos(a) * 0.17, 0.12 + (i % 2) * 0.04, Math.sin(a) * 0.17 + 0.03] as [number, number, number];
    });
    return (
      <group>
        {cap}
        {puffs.map((p, i) => (
          <mesh key={i} position={p}>
            <icosahedronGeometry args={[0.075, 1]} />
            {mat}
          </mesh>
        ))}
        <mesh position={[0, 0.2, 0.03]}>
          <icosahedronGeometry args={[0.12, 1]} />
          {mat}
        </mesh>
      </group>
    );
  }
  return (
    <group>
      {cap}
      {look.hairStyle === "long" && (
        <mesh position={[0, -0.12, 0.12]} scale={[1.05, 1.5, 0.6]}>
          <sphereGeometry args={[0.2, 20, 20]} />
          {mat}
        </mesh>
      )}
      {look.hairStyle === "bun" && (
        <mesh position={[0, 0.2, 0.12]}>
          <sphereGeometry args={[0.09, 16, 16]} />
          {mat}
        </mesh>
      )}
      {look.hairStyle === "ponytail" && (
        <group>
          <mesh position={[0, 0.1, 0.2]}>
            <sphereGeometry args={[0.05, 12, 12]} />
            {mat}
          </mesh>
          <mesh position={[0, -0.08, 0.27]} rotation-x={0.25}>
            <capsuleGeometry args={[0.05, 0.24, 6, 10]} />
            {mat}
          </mesh>
        </group>
      )}
    </group>
  );
}

// ------------------------------------------------------------------ Délégation

/** Rayon animé entre l'agent qui délègue et celui qui exécute, avec une « enveloppe » qui voyage. */
function DelegationBeam({ from, to }: { from: string; to: string }) {
  const a = AGENT_BY_ID[from];
  const b = AGENT_BY_ID[to];
  const line = useRef<{ material: { dashOffset: number } } | null>(null);
  const orb = useRef<Mesh>(null);
  const start = useMemo(() => new Vector3(a?.desk[0] ?? 0, 2, a?.desk[1] ?? 0), [a]);
  const end = useMemo(() => new Vector3(b?.desk[0] ?? 0, 2, b?.desk[1] ?? 0), [b]);
  const mid = useMemo(() => start.clone().add(end).multiplyScalar(0.5).setY(4.2), [start, end]);
  const tmp = useMemo(() => new Vector3(), []);
  useFrame(({ clock }, delta) => {
    if (line.current) line.current.material.dashOffset -= delta * 2;
    if (orb.current) {
      const k = (clock.elapsedTime * 0.5) % 1;
      // point sur la courbe de Bézier quadratique
      tmp.copy(start).multiplyScalar((1 - k) * (1 - k)).addScaledVector(mid, 2 * (1 - k) * k).addScaledVector(end, k * k);
      orb.current.position.copy(tmp);
    }
  });
  if (!a || !b) return null;
  return (
    <group>
      <QuadraticBezierLine
        ref={line as never}
        start={start}
        end={end}
        mid={mid}
        color={b.color}
        lineWidth={2.5}
        dashed
        dashScale={2}
        dashSize={0.6}
        gapSize={0.4}
        transparent
        opacity={0.85}
      />
      <mesh ref={orb}>
        <sphereGeometry args={[0.12, 16, 16]} />
        <meshStandardMaterial color="#ffffff" emissive={b.color} emissiveIntensity={2.5} />
      </mesh>
    </group>
  );
}
