import type { BossRuntime } from '@roomba/core';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Eye, useBossMaterial } from './parts';

interface ModelProps {
  boss: BossRuntime;
  infrared: boolean;
}

const hurtFlash = (boss: BossRuntime): number => (boss.hurtAge < 0.5 ? Math.sin(boss.hurtAge * 40) * 0.5 + 0.5 : 0);

/** Places the model at the boss position with heading, appear and vanish scaling. */
const useBossTransform = (boss: BossRuntime, lift = 0) => {
  const root = useRef<THREE.Group>(null);
  useFrame(() => {
    const g = root.current;
    if (!g) return;
    g.position.set(boss.x, lift, boss.z);
    g.rotation.y = boss.heading;
    const appear = THREE.MathUtils.smoothstep(boss.appear, 0, 1);
    const vanish = 1 - boss.vanishProgress;
    const s = appear * vanish;
    g.scale.setScalar(Math.max(0.0001, s));
    g.visible = boss.phase !== 'gone';
  });
  return root;
};

const DustBody = ({ boss, infrared, tint }: ModelProps & { tint: string }) => {
  const puffs = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => {
        const a = (i / 14) * Math.PI * 2;
        const ring = i % 2 === 0 ? 0.55 : 0.3;
        return { x: Math.cos(a) * ring, y: 0.2 + ((i * 37) % 10) / 20, z: Math.sin(a) * ring, s: 0.35 + ((i * 17) % 10) / 40, phase: i };
      }),
    [],
  );
  const material = useBossMaterial(tint, infrared, { opacity: 0.82, roughness: 1 });
  const group = useRef<THREE.Group>(null);
  const eyes = useRef<THREE.Group>(null);
  useFrame(() => {
    const t = boss.animTime;
    group.current?.children.forEach((c, i) => {
      const p = puffs[i];
      if (!p) return;
      c.position.y = p.y + Math.sin(t * 2 + p.phase) * 0.06;
      c.scale.setScalar(p.s * (1 + Math.sin(t * 3 + p.phase) * 0.08) * boss.def.radius * 1.6);
    });
    if (material instanceof THREE.MeshStandardMaterial) {
      material.emissive.set('#ff2200');
      material.emissiveIntensity = hurtFlash(boss);
    }
    if (eyes.current) {
      const sleepy = boss.phase !== 'active';
      eyes.current.scale.y = sleepy ? 0.15 : boss.mood === 'angry' ? 0.6 : 1;
    }
  });
  const r = boss.def.radius;
  return (
    <group>
      <group ref={group}>
        {puffs.map((p) => (
          <mesh key={p.phase} position={[p.x * r, p.y, p.z * r]} material={material}>
            <sphereGeometry args={[0.5, 14, 10]} />
          </mesh>
        ))}
      </group>
      <group ref={eyes} position={[0, 0.75, r * 0.55]}>
        <Eye position={[-0.18, 0, 0]} size={0.14} />
        <Eye position={[0.18, 0, 0]} size={0.14} />
      </group>
      <mesh position={[0, 0.48, r * 0.7]} rotation={[0, 0, Math.PI]}>
        <torusGeometry args={[0.12, 0.03, 8, 16, Math.PI]} />
        <meshStandardMaterial color="#2a2522" />
      </mesh>
    </group>
  );
};

export const DustCloudModel = ({ boss, infrared }: ModelProps) => {
  const root = useBossTransform(boss, 0.15);
  return (
    <group ref={root}>
      <DustBody boss={boss} infrared={infrared} tint="#b9b4a8" />
    </group>
  );
};

export const MudCloudModel = ({ boss, infrared }: ModelProps) => {
  const root = useBossTransform(boss);
  const left = useRef<THREE.Group>(null);
  const right = useRef<THREE.Group>(null);
  const bootMaterial = useBossMaterial('#4b3218', infrared, { roughness: 0.9 });
  useFrame(() => {
    const t = boss.animTime * 7;
    const moving = Math.hypot(boss.vx, boss.vz) > 0.1;
    if (left.current) {
      left.current.position.y = moving ? Math.max(0, Math.sin(t)) * 0.15 : 0;
      left.current.position.z = moving ? Math.cos(t) * 0.15 : 0;
    }
    if (right.current) {
      right.current.position.y = moving ? Math.max(0, -Math.sin(t)) * 0.15 : 0;
      right.current.position.z = moving ? -Math.cos(t) * 0.15 : 0;
    }
  });
  const Boot = () => (
    <>
      <mesh position={[0, 0.2, -0.05]} material={bootMaterial} castShadow>
        <cylinderGeometry args={[0.13, 0.14, 0.4, 14]} />
      </mesh>
      <mesh position={[0, 0.05, 0.08]} material={bootMaterial} castShadow>
        <boxGeometry args={[0.24, 0.1, 0.4]} />
      </mesh>
    </>
  );
  return (
    <group ref={root}>
      <group ref={left}>
        <group position={[-0.2, 0, 0]}>
          <Boot />
        </group>
      </group>
      <group ref={right}>
        <group position={[0.2, 0, 0]}>
          <Boot />
        </group>
      </group>
      <group position={[0, 0.45, 0]}>
        <DustBody boss={boss} infrared={infrared} tint="#9c8b73" />
      </group>
    </group>
  );
};

export const ChildModel = ({ boss, infrared }: ModelProps) => {
  const root = useBossTransform(boss);
  const legL = useRef<THREE.Group>(null);
  const legR = useRef<THREE.Group>(null);
  const armL = useRef<THREE.Group>(null);
  const armR = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const shirt = useBossMaterial('#ff8c42', infrared);
  const skin = useBossMaterial('#f1c27d', infrared);
  const pants = useBossMaterial('#3d5a80', infrared);
  const mud = useBossMaterial('#4b3218', infrared);
  const hair = useBossMaterial('#8b5a2b', infrared);
  useFrame(() => {
    const speed = Math.hypot(boss.vx, boss.vz);
    const t = boss.animTime * 11;
    const swing = Math.min(1, speed / 1.5) * 0.9;
    if (legL.current) legL.current.rotation.x = Math.sin(t) * swing;
    if (legR.current) legR.current.rotation.x = -Math.sin(t) * swing;
    if (armL.current) armL.current.rotation.x = -Math.sin(t) * swing * 1.2 - (boss.mood === 'angry' ? 2.4 : 0);
    if (armR.current) armR.current.rotation.x = Math.sin(t) * swing * 1.2 - (boss.mood === 'angry' ? 2.4 : 0);
    if (body.current) {
      body.current.position.y = Math.abs(Math.sin(t)) * 0.05 * swing;
      body.current.rotation.z = boss.hurtAge < 0.5 ? Math.sin(boss.hurtAge * 30) * 0.3 : 0;
    }
  });
  return (
    <group ref={root}>
      <group ref={body}>
        {[
          [legL, -0.09],
          [legR, 0.09],
        ].map(([ref, x], i) => (
          <group key={i} ref={ref as React.RefObject<THREE.Group>} position={[x as number, 0.45, 0]}>
            <mesh position={[0, -0.2, 0]} material={pants}>
              <cylinderGeometry args={[0.06, 0.055, 0.4, 10]} />
            </mesh>
            <mesh position={[0, -0.4, 0.04]} material={mud} castShadow>
              <boxGeometry args={[0.13, 0.12, 0.24]} />
            </mesh>
          </group>
        ))}
        <mesh position={[0, 0.65, 0]} material={shirt} castShadow>
          <cylinderGeometry args={[0.15, 0.17, 0.42, 14]} />
        </mesh>
        {[
          [armL, -0.21],
          [armR, 0.21],
        ].map(([ref, x], i) => (
          <group key={i} ref={ref as React.RefObject<THREE.Group>} position={[x as number, 0.82, 0]}>
            <mesh position={[0, -0.17, 0]} material={shirt}>
              <cylinderGeometry args={[0.045, 0.04, 0.34, 8]} />
            </mesh>
            <mesh position={[0, -0.36, 0]} material={skin}>
              <sphereGeometry args={[0.05, 10, 8]} />
            </mesh>
          </group>
        ))}
        <mesh position={[0, 1.02, 0]} material={skin} castShadow>
          <sphereGeometry args={[0.17, 18, 14]} />
        </mesh>
        <mesh position={[0, 1.12, -0.02]} material={hair}>
          <sphereGeometry args={[0.16, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
        </mesh>
        <Eye position={[-0.06, 1.05, 0.14]} size={0.04} />
        <Eye position={[0.06, 1.05, 0.14]} size={0.04} />
        <mesh position={[0, 0.96, 0.15]} rotation={[0.2, 0, Math.PI]}>
          <torusGeometry args={[0.05, 0.012, 6, 12, Math.PI]} />
          <meshStandardMaterial color="#8b1e1e" />
        </mesh>
        <mesh position={[0.05, 0.93, 0.16]} material={mud}>
          <sphereGeometry args={[0.025, 8, 6]} />
        </mesh>
      </group>
    </group>
  );
};

export const CatModel = ({ boss, infrared }: ModelProps) => {
  const root = useBossTransform(boss);
  const tail = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const bodyGroup = useRef<THREE.Group>(null);
  const eyes = useRef<THREE.Group>(null);
  const fur = useBossMaterial('#f4a261', infrared, { roughness: 1 });
  const light = useBossMaterial('#fde2c4', infrared, { roughness: 1 });
  const legs = useRef<THREE.Group>(null);
  useFrame(() => {
    const t = boss.animTime;
    const sleeping = boss.phase !== 'active';
    const paused = boss.mood === 'paused';
    if (tail.current) tail.current.rotation.z = Math.sin(t * (boss.mood === 'angry' ? 12 : 3)) * 0.6;
    if (head.current) {
      head.current.rotation.x = paused ? 0.5 + Math.sin(t * 10) * 0.25 : sleeping ? 0.6 : 0;
      head.current.position.y = sleeping ? 0.25 : 0.42;
    }
    if (bodyGroup.current) {
      bodyGroup.current.scale.y = sleeping ? 0.6 : 1;
      bodyGroup.current.rotation.z = boss.hurtAge < 0.5 ? Math.sin(boss.hurtAge * 30) * 0.25 : 0;
    }
    if (eyes.current) eyes.current.scale.y = sleeping ? 0.1 : boss.mood === 'angry' ? 0.5 : 1;
    if (legs.current) {
      const speed = Math.hypot(boss.vx, boss.vz);
      legs.current.children.forEach((leg, i) => {
        leg.rotation.x = Math.sin(t * 12 + (i % 2) * Math.PI) * Math.min(0.7, speed * 0.4);
      });
      legs.current.visible = !sleeping;
    }
  });
  return (
    <group ref={root}>
      <group ref={bodyGroup}>
        <mesh position={[0, 0.25, 0]} material={fur} castShadow>
          <sphereGeometry args={[0.22, 18, 14]} />
        </mesh>
        <mesh position={[0, 0.25, 0]} scale={[1, 0.85, 1.7]} material={fur}>
          <sphereGeometry args={[0.2, 18, 14]} />
        </mesh>
        <mesh position={[0, 0.21, 0.08]} scale={[0.8, 0.8, 1.3]} material={light}>
          <sphereGeometry args={[0.17, 14, 10]} />
        </mesh>
        <group ref={legs}>
          {[
            [-0.1, 0.2],
            [0.1, 0.2],
            [-0.1, -0.2],
            [0.1, -0.2],
          ].map(([x, z], i) => (
            <group key={i} position={[x as number, 0.12, z as number]}>
              <mesh position={[0, -0.05, 0]} material={fur}>
                <cylinderGeometry args={[0.04, 0.035, 0.14, 8]} />
              </mesh>
            </group>
          ))}
        </group>
        <group ref={tail} position={[0, 0.3, -0.32]}>
          <mesh position={[0, 0.2, -0.05]} rotation={[-0.4, 0, 0]} material={fur}>
            <cylinderGeometry args={[0.035, 0.05, 0.45, 8]} />
          </mesh>
        </group>
      </group>
      <group ref={head} position={[0, 0.42, 0.3]}>
        <mesh material={fur} castShadow>
          <sphereGeometry args={[0.16, 18, 14]} />
        </mesh>
        {[-0.08, 0.08].map((x) => (
          <mesh key={x} position={[x, 0.15, -0.02]} rotation={[0, 0, x > 0 ? -0.3 : 0.3]} material={fur}>
            <coneGeometry args={[0.055, 0.12, 8]} />
          </mesh>
        ))}
        <group ref={eyes}>
          <Eye position={[-0.06, 0.03, 0.12]} size={0.05} />
          <Eye position={[0.06, 0.03, 0.12]} size={0.05} />
        </group>
        <mesh position={[0, -0.03, 0.155]} material={light}>
          <sphereGeometry args={[0.05, 10, 8]} />
        </mesh>
        <mesh position={[0, -0.005, 0.2]}>
          <sphereGeometry args={[0.018, 8, 6]} />
          <meshStandardMaterial color="#e56b6f" />
        </mesh>
        {[-1, 1].map((side) =>
          [0, 1].map((k) => (
            <mesh key={`${side}${k}`} position={[side * 0.1, -0.02 - k * 0.02, 0.15]} rotation={[0, 0, Math.PI / 2 + side * (0.1 + k * 0.12)]}>
              <cylinderGeometry args={[0.002, 0.002, 0.16, 3]} />
              <meshBasicMaterial color="#ffffff" />
            </mesh>
          )),
        )}
      </group>
    </group>
  );
};

export const DogModel = ({ boss, infrared }: ModelProps) => {
  const root = useBossTransform(boss);
  const tail = useRef<THREE.Group>(null);
  const legs = useRef<THREE.Group>(null);
  const tongue = useRef<THREE.Mesh>(null);
  const bodyGroup = useRef<THREE.Group>(null);
  const earL = useRef<THREE.Mesh>(null);
  const earR = useRef<THREE.Mesh>(null);
  const coat = useBossMaterial('#c8872f', infrared);
  const dark = useBossMaterial('#5a3a1a', infrared);
  const belly = useBossMaterial('#f3d9b1', infrared);
  useFrame(() => {
    const t = boss.animTime;
    const speed = Math.hypot(boss.vx, boss.vz);
    const sleeping = boss.phase !== 'active';
    if (tail.current) tail.current.rotation.y = Math.sin(t * (sleeping ? 1 : 18)) * (sleeping ? 0.1 : 0.7);
    if (legs.current) {
      legs.current.children.forEach((leg, i) => {
        leg.rotation.x = sleeping ? Math.PI / 2 : Math.sin(t * 14 + (i === 0 || i === 3 ? 0 : Math.PI)) * Math.min(0.9, speed * 0.35);
      });
    }
    if (tongue.current) tongue.current.visible = !sleeping && (boss.mood === 'chasing' || speed > 1);
    if (bodyGroup.current) {
      bodyGroup.current.position.y = sleeping ? -0.22 : Math.abs(Math.sin(t * 14)) * Math.min(0.06, speed * 0.02);
      bodyGroup.current.rotation.z = boss.hurtAge < 0.5 ? Math.sin(boss.hurtAge * 30) * 0.25 : 0;
    }
    const flap = Math.sin(t * 16) * Math.min(0.5, speed * 0.2);
    if (earL.current) earL.current.rotation.z = 0.3 + flap;
    if (earR.current) earR.current.rotation.z = -0.3 - flap;
  });
  return (
    <group ref={root}>
      <group ref={bodyGroup}>
        <mesh position={[0, 0.42, 0]} scale={[0.8, 0.75, 1.5]} material={coat} castShadow>
          <sphereGeometry args={[0.28, 18, 14]} />
        </mesh>
        <mesh position={[0, 0.36, 0.05]} scale={[0.7, 0.6, 1.3]} material={belly}>
          <sphereGeometry args={[0.25, 14, 10]} />
        </mesh>
        <group ref={legs}>
          {[
            [-0.13, 0.28],
            [0.13, 0.28],
            [-0.13, -0.28],
            [0.13, -0.28],
          ].map(([x, z], i) => (
            <group key={i} position={[x as number, 0.3, z as number]}>
              <mesh position={[0, -0.14, 0]} material={coat}>
                <cylinderGeometry args={[0.055, 0.05, 0.3, 8]} />
              </mesh>
              <mesh position={[0, -0.28, 0.03]} material={belly}>
                <sphereGeometry args={[0.06, 8, 6]} />
              </mesh>
            </group>
          ))}
        </group>
        <group ref={tail} position={[0, 0.52, -0.4]}>
          <mesh position={[0, 0.1, -0.1]} rotation={[-0.8, 0, 0]} material={coat}>
            <cylinderGeometry args={[0.03, 0.05, 0.3, 8]} />
          </mesh>
        </group>
        <group position={[0, 0.66, 0.42]}>
          <mesh material={coat} castShadow>
            <sphereGeometry args={[0.2, 18, 14]} />
          </mesh>
          <mesh position={[0, -0.06, 0.17]} scale={[0.8, 0.65, 1.1]} material={belly}>
            <sphereGeometry args={[0.12, 14, 10]} />
          </mesh>
          <mesh position={[0, -0.01, 0.3]}>
            <sphereGeometry args={[0.04, 10, 8]} />
            <meshStandardMaterial color="#111" roughness={0.2} />
          </mesh>
          <mesh ref={tongue} position={[0.03, -0.14, 0.24]} rotation={[0.5, 0, 0]}>
            <boxGeometry args={[0.06, 0.012, 0.14]} />
            <meshStandardMaterial color="#ff6f91" />
          </mesh>
          <Eye position={[-0.08, 0.07, 0.15]} size={0.05} />
          <Eye position={[0.08, 0.07, 0.15]} size={0.05} />
          <mesh ref={earL} position={[-0.17, 0.02, 0]} material={dark}>
            <boxGeometry args={[0.05, 0.22, 0.12]} />
          </mesh>
          <mesh ref={earR} position={[0.17, 0.02, 0]} material={dark}>
            <boxGeometry args={[0.05, 0.22, 0.12]} />
          </mesh>
        </group>
      </group>
    </group>
  );
};

export const BossModel = ({ boss, infrared }: ModelProps) => {
  switch (boss.def.model) {
    case 'dustCloud':
      return <DustCloudModel boss={boss} infrared={infrared} />;
    case 'mudCloud':
      return <MudCloudModel boss={boss} infrared={infrared} />;
    case 'child':
      return <ChildModel boss={boss} infrared={infrared} />;
    case 'cat':
      return <CatModel boss={boss} infrared={infrared} />;
    case 'dog':
      return <DogModel boss={boss} infrared={infrared} />;
  }
};
