import "./gallery.css";
import * as T from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { Stage } from "./lighting";
import { modelURL } from "./asset-url";

const entries = [
  ["nursery", "1 · Under the Eaves", "The attic nursery: striped wallpaper, a cot with a kite mobile, Nana June's rocking chair and a rainbow rug."],
  ["gardens", "2 · The Gap in the Fence", "Two back gardens, one picket fence with a child-sized gap, a sandpit, a paddling pool and an apple tree with a stuck kite."],
  ["schoolyard", "3 · The Rocket Lunchbox", "Harbour Primary with its clock tower, a climbing frame, a slide, a painted court and the famous bike shed."],
  ["pier", "4 · The Kite Festival", "The Old Pier on festival day: striped stalls, bunting, a lighthouse, bobbing boats and a sky full of kites."],
  ["storm", "5 · The Storm", "The harbour at midnight: glowing lamps, a sweeping lighthouse beam, the Marigold straining at her ropes."],
  ["station", "6 · The Last Train", "The clifftop station at dawn with the 7:14 to the city waiting at the platform."],
  ["workplace", "7 · First Badge", "A workplace with three fit-outs — design studio, boat workshop and clinic — chosen by your story."],
  ["rooftop", "8 · Someone to Come Home To", "The chandlery roof at sunset: string lights, picnic tables, a water tower and the town below."],
  ["kitchen", "9 · The Busy Middle", "A full family kitchen: fridge drawings, a dinner table, pendant lamps and a cat asleep in its bed."],
  ["square", "10 · The Vote", "The town square: the hall and clock tower, a fountain, rows of chairs and teal-versus-purple banners."],
  ["cottage", "11 · Room to Breathe", "Nana June's thatched cottage by the sea, with vegetable beds, a bird bath and a dry-stone wall."],
  ["clifftop", "12 · The Last Festival", "The clifftop at dusk: the lighthouse, wildflowers, a picnic blanket and every kite in town."],
  ["harbour", "Kitehaven harbour", "The town on the hill. The pier is shown in all four states the story can leave it in."],
  ["adult", "Townsfolk", "One of four chunky character bodies. Eight hairstyles and ten accessories are switched at runtime."],
  ["kid", "Children", "Bigger heads, shorter legs, the same expressive glossy eyes."],
  ["elder", "Elders", "A gentle stoop, glasses and a cane for the later chapters."],
  ["baby", "The baby", "Where every life in Kitehaven begins."],
  ["props", "Keepsakes and props", "Kites, toy boats, lunchboxes, lanterns, keys, medals and more — one small pack."],
] as const;
const host = document.querySelector<HTMLElement>("#stage")!;
const select = document.querySelector<HTMLSelectElement>("#asset")!;
const name = document.querySelector<HTMLElement>("#model-name")!;
const description = document.querySelector<HTMLElement>("#description")!;
for (const [id, label] of entries) select.add(new Option(label, id));
const renderer = new T.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
host.append(renderer.domElement);
const scene = new T.Scene();
const camera = new T.PerspectiveCamera(35, 1, 0.01, 100);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.minDistance = 2;
controls.maxDistance = 30;
controls.maxPolarAngle = Math.PI * 0.49;
const stage = new Stage(scene, renderer, false);
stage.apply("afternoon");
scene.fog = null;
const releaseLighting = () => stage.dispose();
const ground = new T.Mesh(
  new T.CircleGeometry(3.6, 64),
  new T.MeshStandardMaterial({ color: 0xfff1d6, roughness: 0.9 }),
);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.02;
ground.receiveShadow = true;
scene.add(ground);
const loader = new GLTFLoader();
loader.setDRACOLoader(new DRACOLoader());
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
  description.textContent = "Loading the Blender model…";
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
    // Characters ship every hairstyle and accessory; show one sensible outfit.
    current.traverse((o) => {
      if (/^Hair_[a-z]+$/.test(o.name)) o.visible = o.name === (id === "baby" ? "Hair_curl" : id === "kid" ? "Hair_curls" : "Hair_bob");
      if (/^Acc_[a-z]+$/.test(o.name)) o.visible = id === "elder" && (o.name === "Acc_glasses" || o.name === "Acc_scarf");
      if (o.name === "Mouth_open") o.visible = false;
      if (/^Var_[a-z]+$/.test(o.name)) o.visible = o.name === "Var_studio";
      if (["Pier_ruined", "Pier_old", "Marina"].includes(o.name)) o.visible = false;
    });
    const box = new T.Box3().setFromObject(current),
      size = box.getSize(new T.Vector3()),
      center = box.getCenter(new T.Vector3());
    const scale = (["adult", "kid", "elder", "baby"].includes(id) ? 2.6 : 5.5) / Math.max(size.x, size.y, size.z);
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
void show(entries.some((e) => e[0] === initial) ? initial! : "pier");
