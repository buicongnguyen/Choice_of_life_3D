export type GraphicsQuality = "low" | "high";

/** A saved explicit choice wins over the first-visit phone default. */
export function graphicsQuality(
  saved: unknown,
  mobile: boolean,
): GraphicsQuality {
  return saved === "low" || saved === "high" ? saved : mobile ? "low" : "high";
}

export function graphicsProfile(quality: GraphicsQuality, deviceRatio: number) {
  const low = quality === "low";
  return {
    low,
    pixelRatio: low ? Math.min(deviceRatio, 0.85) : Math.min(deviceRatio, 1.5),
    antialias: !low,
    shadows: !low,
    modelFolder: low ? "low/" : "",
    maxFPS: low ? 30 : 60,
  } as const;
}
