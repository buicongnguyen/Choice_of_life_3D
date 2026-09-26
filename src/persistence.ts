/** Never leave the current game until both its progress and the new settings are safe. */
export function reloadAfterSaving(saveLife: () => boolean, saveSettings: () => boolean, reload: () => void): boolean {
  if (!saveLife() || !saveSettings()) return false;
  reload();
  return true;
}
