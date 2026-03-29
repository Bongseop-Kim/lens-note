export function isPluginUnavailableError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /not available|plugin.*(missing|not found|not initialized)|(?:plugin|connector|integration|extension).{0,40}unsupported|unsupported.{0,40}(?:plugin|connector|integration|extension)/i.test(
    message,
  );
}
