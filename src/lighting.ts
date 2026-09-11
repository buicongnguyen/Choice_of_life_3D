import * as T from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

/** Shared material-review and gameplay illumination; entirely local, no HDR download. */
export function lightWorld(scene: T.Scene, renderer: T.WebGLRenderer) {
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  const studio = new RoomEnvironment();
  const generator = new T.PMREMGenerator(renderer);
  const reflection = generator.fromScene(studio, 0.06);
  scene.environment = reflection.texture;
  scene.environmentIntensity = 0.36;
  studio.dispose();
  generator.dispose();
  const ambient = new T.HemisphereLight(0xfff3dc, 0x89988e, 1.65);
  const sun = new T.DirectionalLight(0xffecd0, 3.1);
  sun.position.set(-5, 12, 6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, {
    left: -10,
    right: 10,
    top: 10,
    bottom: -10,
    near: 0.5,
    far: 35,
  });
  sun.shadow.normalBias = 0.028;
  sun.shadow.bias = -0.0001;
  const fill = new T.DirectionalLight(0xdcecff, 0.75);
  fill.position.set(6, 7, -5);
  scene.add(ambient, sun, fill);
  return () => {
    scene.remove(ambient, sun, fill);
    reflection.dispose();
    sun.dispose();
  };
}
