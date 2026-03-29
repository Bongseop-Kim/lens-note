export function isPluginUnavailableError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /not available|plugin.*(missing|not found|not initialized)|unsupported/i.test(message);
}
