"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows, OrbitControls, RoundedBox } from "@react-three/drei";
import { useRef, useState, type RefObject } from "react";
import { Vector3, type Group, type Mesh } from "three";
import { AGENTS, type AgentDef } from "@/lib/agents";

type Props = {
  working: string[];
  selected: string | null;
  onSelect: (id: string) => void;
};

export default function Office3D({ working, selected, onSelect }: Props) {
  // Étiquettes en HTML classique au-dessus du canvas, repositionnées à chaque image.
  const labelRefs = useRef<Record<string, HTMLDivElement | null>>({});
  return (
    <div className="relative h-full w-full">
      <Canvas shadows camera={{ position: [0, 11, 13], fov: 45 }} dpr={[1, 2]}>
        <color attach="background" args={["#e9eef5"]} />
        <hemisphereLight args={["#ffffff", "#b8c4d6", 0.9]} />
        <directionalLight
          position={[6, 12, 6]}
          intensity={1.6}
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-camera-left={-12}
          shadow-camera-right={12}
          shadow-camera-top={12}
          shadow-camera-bottom={-12}
        />
        <Room />
        <MeetingTable />
        <Plant position={[-8, 0, -7]} />
        <Plant position={[8, 0, -7]} />
        <Plant position={[-8, 0, 8]} />
        <Plant position={[8, 0, 8]} />
        {AGENTS.map((a) => (
          <Workstation
            key={a.id}
            agent={a}
            working={working.includes(a.id)}
            selected={selected === a.id}
            onSelect={() => onSelect(a.id)}
          />
        ))}
        <LabelTracker refs={labelRefs} />
        <ContactShadows position={[0, 0.01, 0]} opacity={0.35} scale={24} blur={2.5} far={4} />
        <OrbitControls
          target={[0, 0, 0.5]}
          maxPolarAngle={Math.PI / 2.3}
          minDistance={8}
          maxDistance={28}
          enablePan={false}
          // Les murs sont au fond et à gauche : on empêche la caméra de passer derrière.
          minAzimuthAngle={-0.35}
          maxAzimuthAngle={1.2}
        />
      </Canvas>
      {AGENTS.map((a) => {
        const isWorking = working.includes(a.id);
        return (
          <div
            key={a.id}
            ref={(el) => {
              labelRefs.current[a.id] = el;
            }}
            onClick={() => onSelect(a.id)}
            className="absolute left-0 top-0 cursor-pointer select-none whitespace-nowrap rounded-full bg-white px-3 py-1 text-center text-xs font-semibold text-gray-900 shadow-md"
            style={{
              visibility: "hidden",
              outline: selected === a.id ? `2px solid ${a.color}` : undefined,
              outlineOffset: 2,
            }}
          >
            <span style={{ color: a.color }}>●</span> {a.name}
            <div className="text-[10px] font-normal text-gray-500">
              {isWorking ? (
                <span className="animate-pulse text-amber-600">au travail…</span>
              ) : (
                a.role
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Projette la position 3D au-dessus de chaque agent vers l'écran et place son étiquette. */
function LabelTracker({ refs }: { refs: RefObject<Record<string, HTMLDivElement | null>> }) {
  const v = useRef(new Vector3());
  useFrame(({ camera, size }) => {
    for (const a of AGENTS) {
      const el = refs.current[a.id];
      if (!el) continue;
      v.current.set(a.desk[0], 2.4, a.desk[1]).project(camera);
      const x = (v.current.x * 0.5 + 0.5) * size.width;
      const y = (-v.current.y * 0.5 + 0.5) * size.height;
      el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -100%)`;
      el.style.visibility = v.current.z < 1 ? "visible" : "hidden";
    }
  });
  return null;
}

function Room() {
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color="#d8c3a5" />
      </mesh>
      {/* tapis central */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.005, 1]} receiveShadow>
        <circleGeometry args={[3.2, 48]} />
        <meshStandardMaterial color="#c9d6e8" />
      </mesh>
      {/* murs du fond et de gauche, avec fenêtres */}
      <mesh position={[0, 2, -10]} receiveShadow>
        <boxGeometry args={[20, 4, 0.2]} />
        <meshStandardMaterial color="#f7f4ee" />
      </mesh>
      <mesh position={[-10, 2, 0]} receiveShadow>
        <boxGeometry args={[0.2, 4, 20]} />
        <meshStandardMaterial color="#f2eee6" />
      </mesh>
      {[-5, 0, 5].map((x) => (
        <mesh key={x} position={[x, 2.3, -9.88]}>
          <boxGeometry args={[3, 1.6, 0.05]} />
          <meshStandardMaterial
            color="#9fc9ef"
            emissive="#9fc9ef"
            emissiveIntensity={0.35}
          />
        </mesh>
      ))}
      {/* tableau blanc */}
      <mesh position={[-9.88, 2, 0]} rotation-y={Math.PI / 2}>
        <boxGeometry args={[4, 1.8, 0.05]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
    </group>
  );
}

function MeetingTable() {
  return (
    <group position={[0, 0, 1]}>
      <mesh position={[0, 0.75, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[1.4, 1.4, 0.08, 40]} />
        <meshStandardMaterial color="#8a6b4f" />
      </mesh>
      <mesh position={[0, 0.37, 0]} castShadow>
        <cylinderGeometry args={[0.12, 0.25, 0.74, 16]} />
        <meshStandardMaterial color="#4b5563" />
      </mesh>
    </group>
  );
}

function Plant({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.3, 0]} castShadow>
        <cylinderGeometry args={[0.3, 0.22, 0.6, 16]} />
        <meshStandardMaterial color="#b45309" />
      </mesh>
      <mesh position={[0, 1, 0]} castShadow>
        <icosahedronGeometry args={[0.6, 0]} />
        <meshStandardMaterial color="#3f8f4f" flatShading />
      </mesh>
    </group>
  );
}

function Workstation({
  agent,
  working,
  selected,
  onSelect,
}: {
  agent: AgentDef;
  working: boolean;
  selected: boolean;
  onSelect: () => void;
}) {
  const [hover, setHover] = useState(false);
  const [x, z] = agent.desk;
  // Chaque poste fait face au centre de la pièce.
  const rotation = Math.atan2(-x, -z + 1);

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
      {/* sol du poste, surligné si sélectionné */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.006, -0.3]}>
        <circleGeometry args={[1.7, 40]} />
        <meshStandardMaterial
          color={agent.color}
          transparent
          opacity={selected ? 0.35 : hover ? 0.2 : 0.08}
        />
      </mesh>
      <Desk color={agent.color} working={working} />
      <Chair />
      <Character color={agent.color} working={working} />
    </group>
  );
}

function Desk({ color, working }: { color: string; working: boolean }) {
  const screen = useRef<Mesh>(null);
  useFrame(({ clock }) => {
    if (!screen.current) return;
    const m = screen.current.material as unknown as {
      emissiveIntensity: number;
    };
    m.emissiveIntensity = working
      ? 0.6 + Math.sin(clock.elapsedTime * 6) * 0.25
      : 0.15;
  });
  return (
    <group position={[0, 0, -0.9]}>
      <RoundedBox
        args={[2.2, 0.08, 1]}
        radius={0.03}
        position={[0, 0.78, 0]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial color="#f5f5f4" />
      </RoundedBox>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 1, 0.39, 0]} castShadow>
          <boxGeometry args={[0.06, 0.78, 0.9]} />
          <meshStandardMaterial color="#6b7280" />
        </mesh>
      ))}
      {/* écran */}
      <mesh position={[0, 1.2, -0.3]} castShadow>
        <boxGeometry args={[0.9, 0.55, 0.04]} />
        <meshStandardMaterial color="#111827" />
      </mesh>
      <mesh ref={screen} position={[0, 1.2, -0.275]}>
        <planeGeometry args={[0.84, 0.49]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.15}
        />
      </mesh>
      <mesh position={[0, 0.95, -0.3]}>
        <boxGeometry args={[0.06, 0.3, 0.06]} />
        <meshStandardMaterial color="#374151" />
      </mesh>
      {/* clavier et mug */}
      <mesh position={[0, 0.83, 0.1]}>
        <boxGeometry args={[0.6, 0.02, 0.2]} />
        <meshStandardMaterial color="#d1d5db" />
      </mesh>
      <mesh position={[0.75, 0.88, 0.05]} castShadow>
        <cylinderGeometry args={[0.06, 0.06, 0.13, 12]} />
        <meshStandardMaterial color={color} />
      </mesh>
    </group>
  );
}

function Chair() {
  return (
    <group position={[0, 0, 0.15]}>
      <mesh position={[0, 0.5, 0]} castShadow>
        <boxGeometry args={[0.6, 0.08, 0.6]} />
        <meshStandardMaterial color="#374151" />
      </mesh>
      <mesh position={[0, 0.9, 0.28]} castShadow>
        <boxGeometry args={[0.6, 0.7, 0.08]} />
        <meshStandardMaterial color="#374151" />
      </mesh>
      <mesh position={[0, 0.25, 0]}>
        <cylinderGeometry args={[0.04, 0.04, 0.5, 8]} />
        <meshStandardMaterial color="#9ca3af" />
      </mesh>
    </group>
  );
}

function Character({ color, working }: { color: string; working: boolean }) {
  const body = useRef<Group>(null);
  const armL = useRef<Mesh>(null);
  const armR = useRef<Mesh>(null);
  const offset = useRef(Math.random() * 10);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime + offset.current;
    if (body.current) {
      body.current.position.y = working
        ? Math.abs(Math.sin(t * 8)) * 0.02
        : Math.sin(t * 1.5) * 0.01;
      body.current.rotation.y = working
        ? Math.sin(t * 2) * 0.08
        : Math.sin(t * 0.5) * 0.25;
    }
    // bras qui tapent au clavier quand l'agent travaille
    const swing = working ? 0.25 : 0;
    if (armL.current) armL.current.rotation.x = -1.2 + Math.sin(t * 14) * swing;
    if (armR.current)
      armR.current.rotation.x = -1.2 + Math.sin(t * 14 + Math.PI) * swing;
  });

  return (
    <group ref={body} position={[0, 0, 0.1]}>
      {/* buste */}
      <mesh position={[0, 0.95, 0]} castShadow>
        <capsuleGeometry args={[0.22, 0.4, 6, 16]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {/* tête */}
      <mesh position={[0, 1.5, 0]} castShadow>
        <sphereGeometry args={[0.2, 24, 24]} />
        <meshStandardMaterial color="#f2c9a0" />
      </mesh>
      {/* cheveux */}
      <mesh position={[0, 1.58, 0.03]} castShadow>
        <sphereGeometry
          args={[0.205, 24, 24, 0, Math.PI * 2, 0, Math.PI / 2]}
        />
        <meshStandardMaterial color="#3b2f2f" />
      </mesh>
      {/* yeux */}
      {[-0.07, 0.07].map((ex) => (
        <mesh key={ex} position={[ex, 1.52, -0.18]}>
          <sphereGeometry args={[0.025, 8, 8]} />
          <meshStandardMaterial color="#111827" />
        </mesh>
      ))}
      {/* bras */}
      <mesh ref={armL} position={[-0.3, 1.1, -0.05]} castShadow>
        <capsuleGeometry args={[0.06, 0.4, 4, 8]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh ref={armR} position={[0.3, 1.1, -0.05]} castShadow>
        <capsuleGeometry args={[0.06, 0.4, 4, 8]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {/* jambes (assis) */}
      {[-0.11, 0.11].map((lx) => (
        <mesh
          key={lx}
          position={[lx, 0.6, -0.2]}
          rotation-x={Math.PI / 2}
          castShadow
        >
          <capsuleGeometry args={[0.08, 0.35, 4, 8]} />
          <meshStandardMaterial color="#1f2937" />
        </mesh>
      ))}
    </group>
  );
}
