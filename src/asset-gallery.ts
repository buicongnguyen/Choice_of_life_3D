import "./gallery.css";
import * as T from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { lightWorld } from "./lighting";
import { modelURL } from "./asset-url";

const entries = [
  [
    "home",
    "The family room",
    "Upholstery piping, framed cot, pleated curtains, individually laid oak boards and ceramic pots.",
  ],
  [
    "female",
    "Female character",
    "Tailored shirt, a coiled bun, layered hair, shaped sneakers and expressive eyes.",
  ],
  [
    "male",
    "Male character",
    "Swept hair, shirt collar and buttons, articulated hands, trouser seams and laced shoes.",
  ],
  [
    "baby",
    "The little beginning",
    "Seated romper, small hands, soft shoes, bright eyes and a curled lock of hair.",
  ],
  [
    "apple",
    "A freshly picked apple",
    "A lobed silhouette, indented crown, curved stalk and a shaped leaf with a midrib.",
  ],
  [
    "book",
    "A story worth keeping",
    "Bound covers, gilt spine bands, visible page edges and a ribbon bookmark.",
  ],
  [
    "coins",
    "A little security",
    "Metallic surfaces, raised rims, an embossed star and minted edge decoration.",
  ],
  [
    "boat",
    "Rowan’s toy boat",
    "A curved hull, inset timber deck, gunwale, mast, rigging and a billowing triangular sail.",
  ],
  [
    "tin",
    "The blue keepsake tin",
    "Rolled metal edges, fitted lid, hinges, brass clasp and a name plaque.",
  ],
  [
    "blanket",
    "A moment of comfort",
    "Layered cloth, edge binding, subtle woven surface and a soft fringe.",
  ],
  [
    "rattle",
    "The first favourite toy",
    "A wooden teething ring, rounded shell, equator band and decorative inlays.",
  ],
  [
    "plant",
    "Something to care for",
    "A tapered ceramic pot, visible soil, curved stems and individual pointed leaves.",
  ],
  [
    "letter",
    "A note from a friend",
    "Folded paper, envelope seams and a stamped wax seal.",
  ],
  ["ball", "Time to play", "A rounded play ball with stitched panel seams."],
  [
    "cat",
    "A familiar companion",
    "Pointed ears, a muzzle, whiskers, tabby markings and an upright curved tail.",
  ],
  [
    "school",
    "A place to learn",
    "Detailed desks, drawer hardware, bound books, chalk tray, curtains and a reading mat.",
  ],
  [
    "campus",
    "The learning quarter",
    "Warm timber, tailored desk details, books and a central teal study space.",
  ],
  [
    "office",
    "Your first workplace",
    "Monitor bezels, screen contents, individual keyboard keys, mugs, desk aprons and hardware.",
  ],
  [
    "town",
    "A home in the neighbourhood",
    "Layered cottage siding, overlapping roof tiles, framed windows, slatted benches and flowers.",
  ],
  [
    "garden",
    "The legacy garden",
    "A turned fountain basin, water ripples, branching trees, planters and separate stepping stones.",
  ],
] as const;
const host = document.querySelector<HTMLElement>("#stage")!;
const select = document.querySelector<HTMLSelectElement>("#asset")!;
const name = document.querySelector<HTMLElement>("#model-name")!;
const description = document.querySelector<HTMLElement>("#description")!;
for (const [id, label] of entries) select.add(new Option(label, id));
const renderer = new T.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
host.append(renderer.domElement);
const scene = new T.Scene();
const camera = new T.PerspectiveCamera(35, 1, 0.01, 100);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.minDistance = 2;
controls.maxDistance = 16;
controls.maxPolarAngle = Math.PI * 0.49;
const releaseLighting = lightWorld(scene, renderer);
const ground = new T.Mesh(
  new T.CircleGeometry(3.6, 64),
  new T.MeshStandardMaterial({ color: 0xe2e4d3, roughness: 0.95 }),
);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.02;
ground.receiveShadow = true;
scene.add(ground);
const loader = new GLTFLoader();
let current: T.Group | undefined,
  ticket = 0,
  index = 0,
  loaded = "";
function disposeModel(root: T.Group) {
  const textures = new Set<T.Texture>();
  root.traverse((obj) => {
    if (obj instanceof T.Mesh) {
      obj.geometry.dispose();
      for (const mat of Array.isArray(obj.material)
        ? obj.material
        : [obj.material]) {
        for (const value of Object.values(mat))
          if (value instanceof T.Texture) textures.add(value);
        mat.dispose();
      }
    }
  });
  for (const texture of textures) texture.dispose();
}
function resetView() {
  const mobile = host.clientWidth < 600;
  camera.position.set(
    mobile ? 5.6 : 4.8,
    mobile ? 4.1 : 3.5,
    mobile ? 6.8 : 5.8,
  );
  controls.target.set(0, 1.15, 0);
  controls.update();
}
async function show(id: string) {
  const next = entries.findIndex((e) => e[0] === id);
  if (next < 0) return;
  index = next;
  select.value = id;
  const request = ++ticket;
  loaded = "";
  name.textContent = entries[index][1];
  description.textContent = "Loading the detailed Blender model…";
  try {
    const gltf = await loader.loadAsync(modelURL(`${id}.glb`));
    if (request !== ticket) {
      disposeModel(gltf.scene);
      return;
    }
    if (current) {
      scene.remove(current);
      disposeModel(current);
    }
    current = gltf.scene;
    const box = new T.Box3().setFromObject(current),
      size = box.getSize(new T.Vector3()),
      center = box.getCenter(new T.Vector3());
    const scale = 3.2 / Math.max(size.x, size.y, size.z);
    current.scale.setScalar(scale);
    current.position.set(
      -center.x * scale,
      -box.min.y * scale,
      -center.z * scale,
    );
    current.traverse((obj) => {
      if (obj instanceof T.Mesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;
      }
    });
    scene.add(current);
    loaded = id;
    description.textContent = entries[index][2];
    const url = new URL(location.href);
    url.searchParams.set("model", id);
    history.replaceState(null, "", url);
    resetView();
  } catch (error) {
    description.textContent =
      "This model could not load. Select another model, or select this one again to retry.";
    console.error(error);
  }
}
select.addEventListener("change", () => void show(select.value));
document
  .querySelector("#previous")!
  .addEventListener(
    "click",
    () => void show(entries[(index + entries.length - 1) % entries.length][0]),
  );
document
  .querySelector("#next")!
  .addEventListener(
    "click",
    () => void show(entries[(index + 1) % entries.length][0]),
  );
document.querySelector("#reset")!.addEventListener("click", resetView);
const resize = new ResizeObserver(() => {
  renderer.setSize(host.clientWidth, host.clientHeight);
  camera.aspect = host.clientWidth / host.clientHeight;
  camera.updateProjectionMatrix();
});
resize.observe(host);
const renderFrame = () => {
  controls.update();
  renderer.render(scene, camera);
};
renderer.setAnimationLoop(renderFrame);
Object.defineProperty(window, "artDiagnostics", {
  get: () => ({
    loaded,
    drawCalls: renderer.info.render.calls,
    triangles: renderer.info.render.triangles,
  }),
});
window.addEventListener("pageshow", (event) => {
  if (event.persisted) renderer.setAnimationLoop(renderFrame);
});
window.addEventListener("pagehide", (event) => {
  renderer.setAnimationLoop(null);
  if (event.persisted) return;
  resize.disconnect();
  controls.dispose();
  if (current) disposeModel(current);
  releaseLighting();
  ground.geometry.dispose();
  ground.material.dispose();
  renderer.dispose();
});
const initial = new URLSearchParams(location.search).get("model");
void show(entries.some((e) => e[0] === initial) ? initial! : "home");
