import * as THREE from "three";
import type { Creature } from "./creatures";

export class Arena {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  private fighters = new Map<string, THREE.Group>();
  private frame = 0;
  private observer: ResizeObserver;
  private clock = new THREE.Clock();

  constructor(private host: HTMLDivElement) {
    this.scene.background = new THREE.Color("#111522");
    this.scene.fog = new THREE.Fog("#111522", 17, 34);
    this.camera.position.set(0, 9.5, 15.5);
    this.camera.lookAt(0, 0.75, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    host.appendChild(this.renderer.domElement);

    this.scene.add(new THREE.HemisphereLight("#fff1d8", "#34364f", 2.0));
    const key = new THREE.DirectionalLight("#fff0d4", 3.1);
    key.position.set(-5, 11, 7);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left = -9; key.shadow.camera.right = 9;
    key.shadow.camera.top = 9; key.shadow.camera.bottom = -9;
    key.shadow.bias = -0.0003;
    this.scene.add(key);
    const blueFill = new THREE.PointLight("#6caeff", 32, 13, 2);
    blueFill.position.set(-5, 3, 3); this.scene.add(blueFill);
    const redFill = new THREE.PointLight("#ff806e", 30, 13, 2);
    redFill.position.set(5, 3, -3); this.scene.add(redFill);
    const warmRim = new THREE.PointLight("#e9b45f", 22, 12, 2);
    warmRim.position.set(0, 5, -6); this.scene.add(warmRim);

    this.buildArena();
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(host);
    this.resize();
    this.animate();
  }

  private material(color: string, roughness = 0.62, metalness = 0) {
    return new THREE.MeshStandardMaterial({ color, roughness, metalness });
  }

  private addMesh(parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material, x=0, y=0, z=0) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }

  private buildArena() {
    const base = this.addMesh(this.scene, new THREE.CylinderGeometry(7.1, 7.35, 0.34, 96), this.material("#252b3c", 0.82), 0, -0.25, 0);
    base.receiveShadow = true;
    const top = this.addMesh(this.scene, new THREE.CircleGeometry(7.05, 96), this.material("#34394c", 0.9), 0, -0.065, 0);
    top.rotation.x = -Math.PI / 2;
    const outer = this.addMesh(this.scene, new THREE.TorusGeometry(6.82, 0.13, 12, 120), this.material("#d5a45d", 0.38, 0.45), 0, 0.02, 0);
    outer.rotation.x = Math.PI / 2;
    const inner = this.addMesh(this.scene, new THREE.TorusGeometry(5.65, 0.035, 8, 120), this.material("#77748b", 0.55, 0.2), 0, 0.015, 0);
    inner.rotation.x = Math.PI / 2;
    const center = this.addMesh(this.scene, new THREE.CircleGeometry(1.25, 64), this.material("#272d40", 0.8), 0, -0.045, 0);
    center.rotation.x = -Math.PI / 2;
    const centerRing = this.addMesh(this.scene, new THREE.TorusGeometry(1.3, 0.035, 8, 64), this.material("#e3b66c", 0.4, 0.25), 0, 0.025, 0);
    centerRing.rotation.x = Math.PI / 2;

    const markings = new THREE.Group();
    const lineMat = this.material("#555d75", 0.8);
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      const tick = this.addMesh(markings, new THREE.BoxGeometry(0.07, 0.018, i % 3 === 0 ? 0.42 : 0.2), lineMat,
        Math.cos(a) * 6.25, 0, Math.sin(a) * 6.25);
      tick.rotation.y = -a;
    }
    this.scene.add(markings);

    const ambientDots = new THREE.Group();
    const dotMat = new THREE.MeshBasicMaterial({ color: "#d7b477" });
    for (let i = 0; i < 18; i++) {
      const a = i / 18 * Math.PI * 2;
      const dot = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), dotMat);
      dot.position.set(Math.cos(a) * 6.83, 0.1, Math.sin(a) * 6.83);
      ambientDots.add(dot);
    }
    this.scene.add(ambientDots);

    const backdrop = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), this.material("#151a28", 1));
    backdrop.rotation.x = -Math.PI / 2;
    backdrop.position.y = -0.48;
    backdrop.receiveShadow = true;
    this.scene.add(backdrop);
  }

  private makeEyes(group: THREE.Group, y: number, spread = 0.19, z = 0.47) {
    const white = this.material("#fff8e9", 0.25);
    const pupil = this.material("#211c25", 0.2);
    const shine = new THREE.MeshBasicMaterial({ color: "#ffffff" });
    for (const x of [-spread, spread]) {
      this.addMesh(group, new THREE.SphereGeometry(0.095, 16, 12), white, x, y, z);
      this.addMesh(group, new THREE.SphereGeometry(0.052, 12, 10), pupil, x + 0.012, y - 0.005, z + 0.075);
      this.addMesh(group, new THREE.SphereGeometry(0.018, 8, 8), shine, x - 0.005, y + 0.025, z + 0.12);
    }
    const cheek = new THREE.MeshStandardMaterial({ color: "#ef9b8c", roughness: 0.8, transparent: true, opacity: 0.7 });
    for (const x of [-0.34, 0.34]) this.addMesh(group, new THREE.SphereGeometry(0.075, 12, 8), cheek, x, y - 0.14, z - 0.005);
    const smile = new THREE.Mesh(new THREE.TorusGeometry(0.105, 0.018, 8, 18, Math.PI), this.material("#5a3031", 0.8));
    smile.position.set(0, y - 0.2, z + 0.035);
    smile.rotation.z = Math.PI;
    group.add(smile);
  }

  private makeFighter(c: Creature): THREE.Group {
    const group = new THREE.Group();
    const bodyMat = this.material(c.color, 0.38);
    const cream = this.material("#f5e5c8", 0.7);
    const dark = this.material("#49313a", 0.7);

    // A soft, edible silhouette unique to each food species.
    if (c.kind === "meatball") {
      const body = this.addMesh(group, new THREE.SphereGeometry(0.62, 32, 24), bodyMat, 0, 0.72, 0);
      body.scale.set(1, 0.92, 0.86);
      for (let i = 0; i < 9; i++) {
        const a = i * 2.4;
        const crumb = this.addMesh(group, new THREE.SphereGeometry(0.035 + (i % 3) * 0.008, 8, 8), this.material("#e0a078"), Math.cos(a) * 0.42, 0.72 + Math.sin(a) * 0.38, Math.sin(a) * 0.38);
        crumb.scale.setScalar(0.8);
      }
      this.makeEyes(group, 0.82, 0.19, 0.49);
    } else if (c.kind === "tomato") {
      const body = this.addMesh(group, new THREE.SphereGeometry(0.62, 32, 24), bodyMat, 0, 0.72, 0);
      body.scale.set(1, 0.94, 0.9);
      const leafMat = this.material("#5e9d54", 0.75);
      for (let i = 0; i < 5; i++) {
        const leaf = this.addMesh(group, new THREE.ConeGeometry(0.16, 0.43, 5), leafMat, 0, 1.32, 0);
        leaf.rotation.z = (i / 5) * Math.PI * 2;
        leaf.rotation.x = Math.PI / 2.8;
      }
      this.makeEyes(group, 0.82, 0.19, 0.5);
    } else if (c.kind === "pasta") {
      const nest = new THREE.Group();
      for (let i = 0; i < 5; i++) {
        const points: THREE.Vector3[] = [];
        for (let j = 0; j <= 48; j++) {
          const t = j / 48 * Math.PI * 2;
          const r = 0.36 + i * 0.035;
          points.push(new THREE.Vector3(Math.cos(t) * r, 0.64 + Math.sin(t * 2 + i) * 0.055 + i * 0.025, Math.sin(t) * r * 0.72));
        }
        const curve = new THREE.CatmullRomCurve3(points, true);
        const noodle = new THREE.Mesh(new THREE.TubeGeometry(curve, 64, 0.075, 8, true), this.material(i % 2 ? "#f4d17c" : "#e6b85f", 0.38));
        noodle.castShadow = true; nest.add(noodle);
      }
      group.add(nest);
      this.makeEyes(group, 0.76, 0.17, 0.39);
    } else if (c.kind === "cheese") {
      const shape = new THREE.Shape();
      shape.moveTo(-0.58, -0.45); shape.lineTo(0.55, -0.45); shape.lineTo(0.35, 0.43); shape.lineTo(-0.42, 0.43); shape.closePath();
      const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.75, bevelEnabled: true, bevelSegments: 3, steps: 1, bevelSize: 0.09, bevelThickness: 0.09 });
      const wedge = this.addMesh(group, geo, bodyMat, 0, 0.62, -0.38);
      wedge.rotation.x = -0.08;
      const holes = this.material("#c99527", 0.8);
      [[-0.25,0.76,0.38],[0.18,0.9,0.39],[0.02,0.55,0.4],[-0.37,0.98,0.38]].forEach(([x,y,z],i) => this.addMesh(group,new THREE.SphereGeometry(i===1?0.09:0.065,12,10),holes,x,y,z));
      this.makeEyes(group, 0.86, 0.17, 0.48);
    } else if (c.kind === "mushroom") {
      this.addMesh(group, new THREE.CylinderGeometry(0.2, 0.27, 0.5, 20), cream, 0, 0.43, 0);
      const cap = this.addMesh(group, new THREE.SphereGeometry(0.62, 32, 20, 0, Math.PI * 2, 0, Math.PI / 2), bodyMat, 0, 0.84, 0);
      cap.scale.set(1.08, 0.92, 0.9);
      for (const [x,z] of [[-0.26,0.25],[0.22,0.32],[0,0.48],[-0.4,0.05]]) this.addMesh(group, new THREE.SphereGeometry(0.075,10,8), cream, x, 1.08, z);
      this.makeEyes(group, 0.68, 0.16, 0.45);
    } else {
      const shape = new THREE.Shape();
      shape.moveTo(-0.48,-0.42); shape.lineTo(0.48,-0.42); shape.lineTo(0.48,0.42); shape.lineTo(-0.48,0.42); shape.closePath();
      const pillow = new THREE.ExtrudeGeometry(shape,{depth:0.18,bevelEnabled:true,bevelSegments:5,steps:1,bevelSize:0.16,bevelThickness:0.16});
      const ravioli = this.addMesh(group,pillow,bodyMat,0,0.72,-0.09);
      ravioli.rotation.z = Math.PI / 4;
      for (let i=-1;i<=1;i++) for(let j=-1;j<=1;j++) {
        const dot=this.addMesh(group,new THREE.SphereGeometry(0.035,8,8),this.material("#c88e4d"),i*0.25,0.75+j*0.22,0.32);
        dot.scale.set(1,0.65,0.5);
      }
      this.makeEyes(group,0.82,0.18,0.46);
    }

    // Tiny feet, giving the fighters a readable toy-like stance.
    const feetMat = this.material("#45313a", 0.7);
    for (const x of [-0.25, 0.25]) {
      const foot = this.addMesh(group, new THREE.SphereGeometry(0.16, 14, 10), feetMat, x, 0.12, 0.12);
      foot.scale.set(1.15, 0.65, 1.2);
    }

    // Team-colored glow ring under each fighter.
    const teamColor = c.side === "blue" ? "#6eb5ff" : "#ff8a78";
    const halo = this.addMesh(group, new THREE.TorusGeometry(0.55, 0.025, 8, 40), new THREE.MeshBasicMaterial({ color: teamColor }), 0, 0.035, 0);
    halo.rotation.x = Math.PI / 2;
    const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.52, 32), new THREE.MeshBasicMaterial({ color: "#080b12", transparent: true, opacity: 0.28 }));
    shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.018; group.add(shadow);

    group.position.set(c.x, 0, c.side === "blue" ? 1.35 : -1.35);
    group.userData.baseY = 0;
    group.userData.phase = Math.random() * Math.PI * 2;
    return group;
  }

  setCreatures(creatures: Creature[]) {
    for (const group of this.fighters.values()) {
      this.scene.remove(group);
      group.traverse(obj => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
          mats.forEach(mat => mat.dispose());
        }
      });
    }
    this.fighters.clear();
    creatures.forEach(c => {
      const group = this.makeFighter(c);
      this.fighters.set(c.id, group);
      this.scene.add(group);
    });
  }

  updateHealth(creatures: Creature[]) {
    creatures.forEach(c => {
      const group = this.fighters.get(c.id);
      if (group) {
        group.visible = c.hp > 0;
        group.scale.setScalar(c.hp > 0 ? 1 : 0.01);
      }
    });
  }

  private resize() {
    const w = Math.max(1, this.host.clientWidth), h = Math.max(1, this.host.clientHeight);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
  }

  private animate = () => {
    this.frame = requestAnimationFrame(this.animate);
    const time = this.clock.getElapsedTime();
    this.fighters.forEach(group => {
      const phase = group.userData.phase as number;
      group.position.y = Math.sin(time * 2.1 + phase) * 0.055;
      group.rotation.y = Math.sin(time * 0.7 + phase) * 0.09;
    });
    this.renderer.render(this.scene, this.camera);
  };

  dispose() {
    cancelAnimationFrame(this.frame);
    this.observer.disconnect();
    this.fighters.forEach(group => {
      group.traverse(obj => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
          mats.forEach(mat => mat.dispose());
        }
      });
    });
    this.fighters.clear();
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement === this.host) this.host.removeChild(this.renderer.domElement);
  }
}
