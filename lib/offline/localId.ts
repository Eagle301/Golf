export function generateLocalId(): string {
  return `local_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}
