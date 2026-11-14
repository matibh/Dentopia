import * as THREE from "three";
import type { Creature } from "./creatures";

export class Arena {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
  private fighters = new Map<string, THREE.Group>();
  private frame = 0;
  private observer: ResizeObserver;

  constructor(private host: HTMLDivElement) {
    this.scene.background = new THREE.Color("#171b2a");
    this.scene.fog = new THREE.Fog("#171b2a", 13, 30);
    this.camera.position.set(0, 8.5, 13);
    this.camera.lookAt(0, 0.7, 0);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    host.appendChild(this.renderer.domElement);
    this.scene.add(new THREE.HemisphereLight("#fff1d5", "#45435d", 2.1));
    const sun = new THREE.DirectionalLight("#fff3d8", 3.2);
    sun.position.set(-4, 9, 6); sun.castShadow = true; this.scene.add(sun);
    const floor = new THREE.Mesh(new THREE.CircleGeometry(7, 64), new THREE.MeshStandardMaterial({ color: "#33374a", roughness: 0.95 }));
    floor.rotation.x = -Math.PI / 2; floor.position.y = -0.08; floor.receiveShadow = true; this.scene.add(floor);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(5.7, 0.08, 12, 96), new THREE.MeshStandardMaterial({ color: "#d7a65c", metalness: 0.25, roughness: 0.55 }));
    ring.rotation.x = Math.PI / 2; ring.position.y = 0.02; this.scene.add(ring);
    const grid = new THREE.GridHelper(11, 22, "#77758a", "#4a4c60"); grid.position.y = -0.04; this.scene.add(grid);
    this.observer = new ResizeObserver(() => this.resize()); this.observer.observe(host); this.resize(); this.animate();
  }

  private resize() {
    const w = Math.max(1, this.host.clientWidth), h = Math.max(1, this.host.clientHeight);
    this.camera.aspect = w / h; this.camera.updateProjectionMatrix(); this.renderer.setSize(w, h, false);
  }

  private makeFighter(c: Creature): THREE.Group {
    const group = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: c.color, roughness: 0.72 });
    const body = new THREE.Mesh(new THREE.SphereGeometry(c.kind === "cheese" ? 0.62 : 0.57, 24, 18), mat);
    body.scale.set(c.kind === "cheese" ? 1.05 : 0.92, c.kind === "pasta" ? 0.62 : 0.88, 0.82);
    body.position.y = 0.72; body.castShadow = true; group.add(body);
    if (c.kind === "tomato") {
      const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.28, 5), new THREE.MeshStandardMaterial({ color: "#5f9c57" }));
      leaf.position.set(0, 1.28, 0); group.add(leaf);
    }
    if (c.kind === "mushroom") {
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.24, 0.42, 12), new THREE.MeshStandardMaterial({ color: "#f1dfc7" }));
      stem.position.y = 0.48; group.add(stem);
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.53, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: "#a65f48" }));
      cap.position.y = 0.96; group.add(cap);
    }
    const eyeMat = new THREE.MeshStandardMaterial({ color: "#211d24" });
    for (const x of [-0.19, 0.19]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 10), eyeMat);
      eye.position.set(x, 0.82, 0.49); group.add(eye);
    }
    const feetMat = new THREE.MeshStandardMaterial({ color: "#302a35" });
    for (const x of [-0.22, 0.22]) {
      const foot = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 8), feetMat);
      foot.scale.set(1.2, 0.65, 1); foot.position.set(x, 0.13, 0.06); group.add(foot);
    }
    group.position.set(c.x, 0, c.side === "blue" ? 1.25 : -1.25);
    group.userData.baseY = 0;
    return group;
  }

  setCreatures(creatures: Creature[]) {
    for (const group of this.fighters.values()) this.scene.remove(group);
    this.fighters.clear();
    creatures.forEach(c => { const group = this.makeFighter(c); this.fighters.set(c.id, group); this.scene.add(group); });
  }

  updateHealth(creatures: Creature[]) {
    creatures.forEach(c => {
      const group = this.fighters.get(c.id);
      if (group) { group.visible = c.hp > 0; group.scale.setScalar(c.hp > 0 ? 1 : 0.01); }
    });
  }

  private animate = () => {
    this.frame = requestAnimationFrame(this.animate);
    const time = performance.now() * 0.001;
    this.fighters.forEach((group, id) => {
      group.position.y = Math.sin(time * 2.2 + id.length) * 0.055;
      group.rotation.y = Math.sin(time * 0.8 + id.length) * 0.12;
    });
    this.renderer.render(this.scene, this.camera);
  };

  dispose() {
    cancelAnimationFrame(this.frame); this.observer.disconnect(); this.renderer.dispose();
    this.host.removeChild(this.renderer.domElement);
  }
}