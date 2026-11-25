import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { NodeInfo, NodeStatus } from '../types';
import { playTactileClick } from '../utils/soundEngine';

interface AtmosphericStageProps {
  nodes: NodeInfo[];
  weatherEnabled: boolean;
  swoopTrigger: number;
  lightningTrigger: number;
  healingTrigger: { key: number; targetIndices: number[] };
  onSelectNodeIndex: (index: number) => void;
  onAltitudeChange?: (pct: number) => void;
}

const NODE_COLORS_HEX: Record<NodeStatus, number> = {
  Online: 0x7a9e7e,     // Sage Healthy
  Recovering: 0x4d8fb8, // Powder Blue Dark
  Degraded: 0xc8853a,   // Amber
  Offline: 0xb5363a,    // Cherry
};

export const AtmosphericStage: React.FC<AtmosphericStageProps> = ({
  nodes,
  weatherEnabled,
  swoopTrigger,
  lightningTrigger,
  healingTrigger,
  onSelectNodeIndex,
  onAltitudeChange,
}) => {
  const webglCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const weatherCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const lightningRef = useRef<HTMLDivElement | null>(null);
  const ridgeImgRef = useRef<HTMLImageElement | null>(null);
  const hawkActorRef = useRef<HTMLDivElement | null>(null);
  const scrollBarRef = useRef<HTMLDivElement | null>(null);
  const haloRef = useRef<HTMLDivElement | null>(null);

  const swoopBoostRef = useRef(0);
  const weatherEnabledRef = useRef(weatherEnabled);
  const nodesRef = useRef<NodeInfo[]>(nodes);
  const nodeMeshesRef = useRef<THREE.Mesh[]>([]);
  const ringGroupRef = useRef<THREE.Group | null>(null);
  const healingArcsRef = useRef<
    Array<{
      line: THREE.Line;
      orb: THREE.Mesh;
      curve: THREE.QuadraticBezierCurve3;
      progress: number;
    }>
  >([]);
  const onSelectNodeIndexRef = useRef(onSelectNodeIndex);
  const onAltitudeChangeRef = useRef(onAltitudeChange);

  useEffect(() => {
    weatherEnabledRef.current = weatherEnabled;
  }, [weatherEnabled]);

  useEffect(() => {
    onSelectNodeIndexRef.current = onSelectNodeIndex;
    onAltitudeChangeRef.current = onAltitudeChange;
  }, [onSelectNodeIndex, onAltitudeChange]);

  // Sync nodes state to Three.js meshes & storm-stress body class
  useEffect(() => {
    nodesRef.current = nodes;
    const stressedCount = nodes.filter((n) => n.status === 'Offline' || n.status === 'Degraded').length;
    document.body.classList.toggle('storm-stress', stressedCount >= 3);

    nodeMeshesRef.current.forEach((mesh, idx) => {
      const node = nodes[idx];
      if (!node || !mesh) return;
      const mat = mesh.material as THREE.MeshStandardMaterial;
      mat.color.setHex(NODE_COLORS_HEX[node.status]);
      mesh.scale.setScalar(
        node.status === 'Offline' ? 0.62 : node.status === 'Degraded' ? 1.18 : 1.0
      );
    });
  }, [nodes]);

  // Trigger swoop boost
  useEffect(() => {
    if (swoopTrigger > 0) {
      swoopBoostRef.current = 0.88;
    }
  }, [swoopTrigger]);

  // Trigger lightning flash
  const fireLightningFlash = () => {
    const flash = lightningRef.current;
    if (!flash) return;
    flash.style.opacity = '0.9';
    setTimeout(() => {
      if (flash) flash.style.opacity = '0.15';
    }, 90);
    setTimeout(() => {
      if (flash) flash.style.opacity = '0.75';
    }, 160);
    setTimeout(() => {
      if (flash) flash.style.opacity = '0';
    }, 280);
  };

  useEffect(() => {
    if (lightningTrigger > 0) {
      fireLightningFlash();
    }
  }, [lightningTrigger]);

  // Spawn 3D healing arcs
  useEffect(() => {
    if (healingTrigger.key === 0) return;
    const ringGroup = ringGroupRef.current;
    const nodeMeshes = nodeMeshesRef.current;
    if (!ringGroup || !nodeMeshes.length) return;

    healingTrigger.targetIndices.forEach((targetIdx) => {
      if (targetIdx < 0 || targetIdx >= nodeMeshes.length) return;
      const healthyIndices = nodesRef.current
        .map((n, idx) => (n.status === 'Online' && idx !== targetIdx ? idx : -1))
        .filter((idx) => idx !== -1);
      const sources = healthyIndices.sort(() => Math.random() - 0.5).slice(0, 2);
      const endPos = nodeMeshes[targetIdx].position.clone();

      sources.forEach((srcIdx) => {
        const startPos = nodeMeshes[srcIdx].position.clone();
        const midPos = startPos.clone().add(endPos).multiplyScalar(0.5);
        midPos.z += 1.45;
        const curve = new THREE.QuadraticBezierCurve3(startPos, midPos, endPos);
        const pts = curve.getPoints(28);
        const arcGeo = new THREE.BufferGeometry().setFromPoints(pts);
        const arcMat = new THREE.LineBasicMaterial({ color: 0x7bafd4, transparent: true, opacity: 0.92 });
        const arcLine = new THREE.Line(arcGeo, arcMat);
        ringGroup.add(arcLine);

        const orbGeo = new THREE.SphereGeometry(0.1, 10, 10);
        const orbMat = new THREE.MeshBasicMaterial({ color: 0x7bafd4, transparent: true, opacity: 1 });
        const orb = new THREE.Mesh(orbGeo, orbMat);
        ringGroup.add(orb);

        healingArcsRef.current.push({ line: arcLine, orb, curve, progress: 0 });
      });
    });
  }, [healingTrigger]);

  // Main Three.js + Weather + Parallax + Magnetic Halo setup
  useEffect(() => {
    const canvas = webglCanvasRef.current;
    if (!canvas) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 1.2, 11.5);

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Warm editorial lighting
    const ambient = new THREE.AmbientLight(0xfaf7f2, 0.9);
    scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(0xffffff, 0.85);
    keyLight.position.set(6, 10, 8);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x7bafd4, 0.6);
    rimLight.position.set(-8, -4, 4);
    scene.add(rimLight);

    // 12-Node 3D Topology Ring
    const ringGroup = new THREE.Group();
    ringGroupRef.current = ringGroup;
    const radius = 3.1;
    const nodeGeo = new THREE.IcosahedronGeometry(0.24, 0);
    const meshes: THREE.Mesh[] = [];

    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const mat = new THREE.MeshStandardMaterial({
        color: NODE_COLORS_HEX[nodesRef.current[i]?.status ?? 'Online'],
        roughness: 0.35,
        metalness: 0.15,
        flatShading: true,
      });
      const mesh = new THREE.Mesh(nodeGeo, mat);
      mesh.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius, 0);
      ringGroup.add(mesh);
      meshes.push(mesh);
    }
    nodeMeshesRef.current = meshes;

    // Ring edges & cross-chord parity links
    const lineMat = new THREE.LineBasicMaterial({ color: 0x7bafd4, transparent: true, opacity: 0.35 });
    for (let i = 0; i < 12; i++) {
      const next = (i + 1) % 12;
      const across = (i + 4) % 12;
      [next, across].forEach((targetIdx) => {
        const pts = [meshes[i].position.clone(), meshes[targetIdx].position.clone()];
        const geo = new THREE.BufferGeometry().setFromPoints(pts);
        const line = new THREE.Line(geo, lineMat);
        ringGroup.add(line);
      });
    }

    // Inner orbital halo
    const torusGeo = new THREE.TorusGeometry(radius, 0.015, 8, 72);
    const torusMat = new THREE.MeshBasicMaterial({ color: 0xc8907a, transparent: true, opacity: 0.35 });
    const torus = new THREE.Mesh(torusGeo, torusMat);
    ringGroup.add(torus);

    ringGroup.position.set(0, -1.5, -2.5);
    ringGroup.rotation.x = 0.65;
    scene.add(ringGroup);

    // Floating editorial wind motes
    const pCount = 90;
    const pGeo = new THREE.BufferGeometry();
    const pPos = new Float32Array(pCount * 3);
    for (let i = 0; i < pCount; i++) {
      pPos[i * 3] = (Math.random() - 0.5) * 18;
      pPos[i * 3 + 1] = (Math.random() - 0.5) * 12;
      pPos[i * 3 + 2] = (Math.random() - 0.5) * 8;
    }
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
    const pMat = new THREE.PointsMaterial({ color: 0x7bafd4, size: 0.06, transparent: true, opacity: 0.5 });
    const pulseParticles = new THREE.Points(pGeo, pMat);
    scene.add(pulseParticles);

    const raycaster = new THREE.Raycaster();
    const pointerVec = new THREE.Vector2(-99, -99);
    let hoveredNodeIdx = -1;
    let mouseXNorm = 0;
    let mouseYNorm = 0;

    const onPointerMove = (e: PointerEvent) => {
      pointerVec.x = (e.clientX / Math.max(1, window.innerWidth)) * 2 - 1;
      pointerVec.y = -(e.clientY / Math.max(1, window.innerHeight)) * 2 + 1;
      mouseXNorm = e.clientX / Math.max(1, window.innerWidth) - 0.5;
      mouseYNorm = e.clientY / Math.max(1, window.innerHeight) - 0.5;
    };

    const onWindowClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && target.closest && target.closest('button, a, input, select, label, #node-inspector')) return;
      raycaster.setFromCamera(pointerVec, camera);
      const hits = raycaster.intersectObjects(meshes, false);
      if (hits.length > 0) {
        const idx = meshes.indexOf(hits[0].object as THREE.Mesh);
        if (idx !== -1) {
          playTactileClick();
          onSelectNodeIndexRef.current(idx);
        }
      }
    };

    const wCanvas = weatherCanvasRef.current;
    const wCtx = wCanvas ? wCanvas.getContext('2d') : null;
    const raindrops = Array.from({ length: 110 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      len: 14 + Math.random() * 22,
      speed: 9 + Math.random() * 8,
      alpha: 0.08 + Math.random() * 0.16,
    }));

    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      if (wCanvas) {
        wCanvas.width = window.innerWidth;
        wCanvas.height = window.innerHeight;
      }
    };
    onResize();

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('click', onWindowClick);
    window.addEventListener('resize', onResize);

    // Ambient occasional lightning
    const lightningInterval = window.setInterval(() => {
      if (weatherEnabledRef.current && Math.random() < 0.35) {
        fireLightningFlash();
      }
    }, 6500);

    // Magnetic Cursor Halo
    const halo = haloRef.current;
    let hx = -100, hy = -100, tx = -100, ty = -100;
    const finePointer = window.matchMedia('(pointer: fine)').matches;
    const onMouseMoveHalo = (e: MouseEvent) => {
      if (!halo || !finePointer) return;
      halo.style.opacity = '1';
      const target = e.target as HTMLElement | null;
      const cta = target?.closest?.('button, a');
      const card = target?.closest?.('.editorial-card');
      if (cta) {
        const r = cta.getBoundingClientRect();
        tx = r.left + r.width / 2;
        ty = r.top + r.height / 2;
        halo.classList.add('is-cta');
        halo.classList.remove('is-card');
      } else {
        tx = e.clientX;
        ty = e.clientY;
        halo.classList.remove('is-cta');
        halo.classList.toggle('is-card', Boolean(card));
      }
    };
    const onMouseLeaveHalo = () => {
      if (halo) halo.style.opacity = '0';
    };
    if (finePointer) {
      window.addEventListener('mousemove', onMouseMoveHalo);
      window.addEventListener('mouseleave', onMouseLeaveHalo);
    }

    const clock = new THREE.Clock();
    let rafId = 0;

    const animate = () => {
      rafId = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();
      const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const scrollRatio = Math.min(1, Math.max(0, window.scrollY / maxScroll));

      if (scrollBarRef.current) {
        scrollBarRef.current.style.width = `${(scrollRatio * 100).toFixed(1)}%`;
      }
      if (onAltitudeChangeRef.current) {
        onAltitudeChangeRef.current(Math.round((1 - scrollRatio) * 100));
      }

      swoopBoostRef.current *= 0.94;
      const dive = Math.min(1, scrollRatio * 1.4 + swoopBoostRef.current);

      // Raycast hover tilt on 3D topology ring
      let hoverTiltX = 0;
      let hoverTiltY = 0;
      raycaster.setFromCamera(pointerVec, camera);
      const hits = raycaster.intersectObjects(meshes, false);
      const nextHover = hits.length > 0 ? meshes.indexOf(hits[0].object as THREE.Mesh) : -1;
      if (nextHover !== hoveredNodeIdx) {
        hoveredNodeIdx = nextHover;
        document.body.style.cursor = hoveredNodeIdx !== -1 ? 'pointer' : '';
      }
      if (hoveredNodeIdx !== -1) {
        hoverTiltX = pointerVec.y * 0.18;
        hoverTiltY = pointerVec.x * 0.22;
      }

      ringGroup.rotation.z = t * 0.14 + scrollRatio * 2.2;
      const targetRotX = 0.65 - scrollRatio * 0.35 + hoverTiltX;
      ringGroup.rotation.x += (targetRotX - ringGroup.rotation.x) * 0.1;
      ringGroup.rotation.y += (hoverTiltY - ringGroup.rotation.y) * 0.1;
      const ringY = -1.6 + scrollRatio * 1.8;
      const ringScale = 0.85 + Math.sin(scrollRatio * Math.PI) * 0.35;
      ringGroup.position.y += (ringY - ringGroup.position.y) * 0.08;
      ringGroup.scale.setScalar(ringScale);

      // Animate 3D healing arcs
      const arcs = healingArcsRef.current;
      for (let i = arcs.length - 1; i >= 0; i--) {
        const a = arcs[i];
        a.progress += 0.028;
        if (a.progress >= 1) {
          ringGroup.remove(a.line);
          ringGroup.remove(a.orb);
          a.line.geometry.dispose();
          (a.line.material as THREE.Material).dispose();
          a.orb.geometry.dispose();
          (a.orb.material as THREE.Material).dispose();
          arcs.splice(i, 1);
        } else {
          const p = a.curve.getPoint(a.progress);
          a.orb.position.copy(p);
          const fade = a.progress > 0.72 ? (1 - a.progress) / 0.28 : 1;
          (a.line.material as THREE.LineBasicMaterial).opacity = 0.85 * fade;
          (a.orb.material as THREE.MeshBasicMaterial).opacity = fade;
        }
      }

      pulseParticles.rotation.y = t * 0.03 + scrollRatio * 0.4;
      renderer.render(scene, camera);

      // Rain canvas
      if (wCtx && wCanvas) {
        wCtx.clearRect(0, 0, wCanvas.width, wCanvas.height);
        if (weatherEnabledRef.current) {
          const stressed = document.body.classList.contains('storm-stress');
          const slant = stressed ? 0.52 : 0.25;
          const speedMul = stressed ? 1.55 : 1.0;
          const alphaMul = stressed ? 1.65 : 1.0;
          wCtx.lineWidth = stressed ? 1.35 : 1;
          raindrops.forEach((d) => {
            wCtx.strokeStyle = `rgba(77, 143, 184, ${Math.min(0.45, d.alpha * alphaMul)})`;
            wCtx.beginPath();
            wCtx.moveTo(d.x, d.y);
            wCtx.lineTo(d.x - d.len * slant, d.y + d.len);
            wCtx.stroke();
            d.x -= d.speed * speedMul * slant;
            d.y += d.speed * speedMul;
            if (d.y > wCanvas.height) {
              d.y = -30;
              d.x = Math.random() * (wCanvas.width + 120);
            }
            if (d.x < -40) d.x = wCanvas.width + 20;
          });
        }
      }

      // Parallax misty mountain ridge
      if (ridgeImgRef.current) {
        const ridgeY = scrollRatio * -55;
        const ridgeScale = 1.06 + scrollRatio * 0.08;
        ridgeImgRef.current.style.transform = `translate3d(${mouseXNorm * -18}px, ${ridgeY + mouseYNorm * -12}px, 0) scale(${ridgeScale})`;
      }

      // Realistic 3D-perspective Diving Hawk
      if (hawkActorRef.current) {
        const txHawk = -dive * 36 + mouseXNorm * 28;
        const tyHawk = dive * 42 + mouseYNorm * 18;
        const rotZ = -dive * 14 + mouseXNorm * 5;
        const rotY = -12 + dive * 22 + mouseXNorm * 12;
        const rotX = 6 - dive * 10 - mouseYNorm * 8;
        const scaleHawk = 1.02 + Math.sin(dive * Math.PI) * 0.22;
        const opHawk = Math.max(0.18, 0.96 - scrollRatio * 0.65);
        hawkActorRef.current.style.opacity = opHawk.toFixed(2);
        hawkActorRef.current.style.transform = `translate3d(${txHawk}vw, ${tyHawk}vh, 0) rotateX(${rotX}deg) rotateY(${rotY}deg) rotateZ(${rotZ}deg) scale(${scaleHawk})`;
      }

      // Magnetic cursor halo tick
      if (halo && finePointer) {
        hx += (tx - hx) * 0.18;
        hy += (ty - hy) * 0.18;
        halo.style.transform = `translate3d(${hx - halo.offsetWidth / 2}px, ${hy - halo.offsetHeight / 2}px, 0)`;
      }
    };

    animate();

    return () => {
      cancelAnimationFrame(rafId);
      clearInterval(lightningInterval);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('click', onWindowClick);
      window.removeEventListener('resize', onResize);
      if (finePointer) {
        window.removeEventListener('mousemove', onMouseMoveHalo);
        window.removeEventListener('mouseleave', onMouseLeaveHalo);
      }
      document.body.style.cursor = '';
      renderer.dispose();
    };
  }, []);

  return (
    <>
      <div id="scroll-progress" ref={scrollBarRef} />
      <div className="grain-overlay" />

      {/* Realistic Misty Ridge Parallax Background */}
      <div id="backdrop-ridge">
        <img
          ref={ridgeImgRef}
          id="backdrop-ridge-img"
          src="/assets/ridge-backdrop.jpg"
          alt="Misty alpine mountain ridge"
        />
      </div>
      <div id="backdrop-fade" />

      {/* Realistic 3D-Perspective Diving Hawk */}
      <div id="hawk-3d-stage">
        <div id="hawk-3d-actor" ref={hawkActorRef}>
          <img src="/assets/hawk-diving.jpg" alt="Diving Hawk" />
        </div>
      </div>

      {/* Natural Rain & Lightning Effects */}
      <canvas id="weather-canvas" ref={weatherCanvasRef} />
      <div id="lightning-flash" ref={lightningRef} />

      {/* Full-Viewport 3D WebGL Scene */}
      <canvas id="webgl-canvas" ref={webglCanvasRef} />

      {/* Magnetic Cursor Halo */}
      <div id="cursor-halo" ref={haloRef} aria-hidden="true" />
    </>
  );
};
