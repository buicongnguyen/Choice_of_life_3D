/** Stable per release, but invalidates old browser-cached GLBs after an art update. */
export const modelURL = (file: string) =>
  `${import.meta.env.BASE_URL}models/${file}?v=${__GAME_VERSION__}`;
