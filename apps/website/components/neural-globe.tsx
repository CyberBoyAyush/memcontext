"use client";

import {
  memo,
  useRef,
  useMemo,
  useState,
  useEffect,
  type ReactElement,
} from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Line, Html, PerspectiveCamera } from "@react-three/drei";
import type { Group, Mesh } from "three";

const TOTAL_NODES = 90;
const ACTIVE_COUNT = 14;
const SPHERE_RADIUS = 2.4;
const CONNECTION_DISTANCE = 1.1;

const LABELS = [
  "EXPAND + CLASSIFY",
  "AUTO-TTL",
  "DEDUP + VERSION",
  "EMBED",
  "INDEX",
  "VECTORIZE",
  "REWRITE",
  "ROUTE",
  "PERSIST",
  "RANK",
  "FUSE",
  "ENRICH",
] as const;

interface NodeData {
  position: [number, number, number];
  isActive: boolean;
  offset: number;
}

interface ConnectionData {
  start: [number, number, number];
  end: [number, number, number];
  isActive: boolean;
}

function fibonacciSphere(count: number): [number, number, number][] {
  const points: [number, number, number][] = [];
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));

  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2;
    const radiusAtY = Math.sqrt(1 - y * y);
    const theta = goldenAngle * i;

    points.push([
      Math.cos(theta) * radiusAtY * SPHERE_RADIUS,
      y * SPHERE_RADIUS,
      Math.sin(theta) * radiusAtY * SPHERE_RADIUS,
    ]);
  }
  return points;
}

// ---------- Memoized leaf components ----------

const ActiveNode = memo(function ActiveNode({
  position,
  offset,
}: {
  position: [number, number, number];
  offset: number;
}) {
  const meshRef = useRef<Mesh>(null);
  const ringRef = useRef<Mesh>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (meshRef.current) {
      const scale = 1.0 + 0.12 * Math.sin(t * 0.8 + offset);
      meshRef.current.scale.setScalar(scale);
    }
    if (ringRef.current) {
      const ringScale = 1.0 + 0.3 * Math.sin(t * 1.2 + offset);
      ringRef.current.scale.setScalar(ringScale);
    }
  });

  return (
    <group position={position}>
      <mesh ref={meshRef}>
        <sphereGeometry args={[0.05, 16, 16]} />
        <meshStandardMaterial
          color="#e8613c"
          emissive="#e8613c"
          emissiveIntensity={0.5}
        />
      </mesh>
      <mesh ref={ringRef}>
        <ringGeometry args={[0.075, 0.088, 24]} />
        <meshBasicMaterial color="#e8613c" transparent opacity={0.3} />
      </mesh>
    </group>
  );
});

const InactiveNode = memo(function InactiveNode({
  position,
  size,
}: {
  position: [number, number, number];
  size: number;
}) {
  return (
    <mesh position={position}>
      <sphereGeometry args={[size, 8, 8]} />
      <meshBasicMaterial color="#4a4a4a" transparent opacity={0.6} />
    </mesh>
  );
});

const ConnectionLine = memo(function ConnectionLine({
  start,
  end,
  isActive,
}: {
  start: [number, number, number];
  end: [number, number, number];
  isActive: boolean;
}) {
  return (
    <Line
      points={[start, end]}
      color={isActive ? "#c97857" : "#3a3a3a"}
      lineWidth={isActive ? 0.8 : 0.5}
      transparent
      opacity={isActive ? 0.3 : 0.6}
    />
  );
});

const LabelChip = memo(function LabelChip({
  position,
  text,
  isVisible,
}: {
  position: [number, number, number];
  text: string;
  isVisible: boolean;
}) {
  return (
    <Html
      position={position}
      center
      occlude={false}
      zIndexRange={[100, 0]}
      style={{
        pointerEvents: "none",
        transition: "opacity 800ms ease-in-out, transform 800ms ease-in-out",
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? "translateY(0px)" : "translateY(4px)",
      }}
    >
      <div className="px-2 py-1 rounded-md bg-accent border border-accent/30 backdrop-blur-sm whitespace-nowrap pointer-events-none select-none ml-3">
        <p className="font-mono text-[9px] uppercase tracking-wider text-white font-medium">
          {text}
        </p>
      </div>
    </Html>
  );
});

// ---------- Static geometry layer (never re-renders after mount) ----------

const StaticGeometry = memo(function StaticGeometry({
  nodes,
  connections,
}: {
  nodes: NodeData[];
  connections: ConnectionData[];
}) {
  // Materialize nodes + lines once. Wrapped in memo so this whole tree is
  // skipped on every label-cycle re-render of the parent.
  const renderedNodes = useMemo(
    () =>
      nodes.map((node, i) =>
        node.isActive ? (
          <ActiveNode
            key={`node-${i}`}
            position={node.position}
            offset={node.offset}
          />
        ) : (
          <InactiveNode
            key={`node-${i}`}
            position={node.position}
            size={0.02 + (i % 3) * 0.008}
          />
        ),
      ),
    [nodes],
  );

  const renderedLines = useMemo<ReactElement[]>(
    () =>
      connections.map((conn, i) => (
        <ConnectionLine
          key={`line-${i}`}
          start={conn.start}
          end={conn.end}
          isActive={conn.isActive}
        />
      )),
    [connections],
  );

  return (
    <>
      {/* Wireframe sphere guide */}
      <mesh>
        <sphereGeometry args={[SPHERE_RADIUS, 32, 16]} />
        <meshBasicMaterial
          wireframe
          color="#2a2a2a"
          transparent
          opacity={0.85}
        />
      </mesh>

      {renderedLines}
      {renderedNodes}
    </>
  );
});

// ---------- Label layer (re-renders on cycle, isolated from geometry) ----------

function LabelLayer({ positions }: { positions: [number, number, number][] }) {
  const [visibleLabels, setVisibleLabels] = useState<Set<number>>(
    () => new Set([0]),
  );

  useEffect(() => {
    const pickNext = () => {
      const count = 1 + Math.floor(Math.random() * 3);
      const next = new Set<number>();
      while (next.size < count) {
        next.add(Math.floor(Math.random() * LABELS.length));
      }
      setVisibleLabels(next);
    };
    const interval = setInterval(pickNext, 2200);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      {positions.map((pos, i) => (
        <LabelChip
          key={LABELS[i]}
          position={pos}
          text={LABELS[i] ?? ""}
          isVisible={visibleLabels.has(i)}
        />
      ))}
    </>
  );
}

// ---------- Scene ----------

function GlobeScene() {
  const groupRef = useRef<Group>(null);

  // Compute ALL static data once. This object is stable across renders.
  const sceneData = useMemo(() => {
    const positions = fibonacciSphere(TOTAL_NODES);

    const activeIndices = new Set<number>();
    const step = Math.floor(TOTAL_NODES / ACTIVE_COUNT);
    for (let i = 0; i < ACTIVE_COUNT; i++) {
      activeIndices.add((i * step + 3) % TOTAL_NODES);
    }

    const nodes: NodeData[] = positions.map((pos, idx) => ({
      position: pos,
      isActive: activeIndices.has(idx),
      offset: idx * 0.7,
    }));

    const connections: ConnectionData[] = [];
    const maxDistSq = CONNECTION_DISTANCE * CONNECTION_DISTANCE;

    for (let i = 0; i < positions.length; i++) {
      const a = positions[i];
      if (!a) continue;
      for (let j = i + 1; j < positions.length; j++) {
        const b = positions[j];
        if (!b) continue;
        const dx = a[0] - b[0];
        const dy = a[1] - b[1];
        const dz = a[2] - b[2];
        const distSq = dx * dx + dy * dy + dz * dz;
        if (distSq < maxDistSq) {
          const eitherActive = activeIndices.has(i) || activeIndices.has(j);
          connections.push({ start: a, end: b, isActive: eitherActive });
        }
      }
    }

    const activeList = Array.from(activeIndices);
    const labelPositions: [number, number, number][] = LABELS.map((_, i) => {
      const floatIdx = (i * activeList.length) / LABELS.length;
      const idx = activeList[Math.floor(floatIdx)] ?? activeList[0] ?? 0;
      return positions[idx] ?? ([0, 0, 0] as [number, number, number]);
    });

    return { nodes, connections, labelPositions };
  }, []);

  // Rotation lives on the imperative ref — does NOT cause React re-renders.
  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.rotation.y += 0.0012;
    }
  });

  return (
    <group ref={groupRef}>
      <StaticGeometry
        nodes={sceneData.nodes}
        connections={sceneData.connections}
      />
      <LabelLayer positions={sceneData.labelPositions} />
    </group>
  );
}

// ---------- Public component, memoized so parent re-renders are no-ops ----------

export const NeuralGlobe = memo(function NeuralGlobe() {
  return (
    <div className="w-full h-[380px] lg:h-[440px]">
      <Canvas
        gl={{ alpha: true, antialias: true }}
        style={{ background: "transparent" }}
        dpr={[1, 2]}
      >
        <PerspectiveCamera position={[0, 0, 8.5]} fov={40} makeDefault />
        <ambientLight intensity={0.5} />
        <pointLight position={[8, 6, 8]} intensity={0.7} />
        <GlobeScene />
      </Canvas>
    </div>
  );
});
