const PRIVATE_IPV4_PATTERNS = [
  /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/i,
  /^192\.168\.\d{1,3}\.\d{1,3}$/i,
  /^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/i,
];

function isPrivateIpv4Hostname(hostname: string): boolean {
  return PRIVATE_IPV4_PATTERNS.some((pattern) => pattern.test(hostname));
}

function isLocalDevelopmentHostname(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || isPrivateIpv4Hostname(hostname);
}

function normalizeOrigins(clientOrigin: string): string[] {
  return clientOrigin
    .split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}

export function isAllowedClientOrigin(
  origin: string | undefined,
  clientOrigin: string,
  nodeEnv: "development" | "test" | "production",
): boolean {
  if (!origin) {
    return true;
  }

  const normalizedOrigins = normalizeOrigins(clientOrigin);
  if (normalizedOrigins.includes(origin)) {
    return true;
  }

  if (nodeEnv !== "development") {
    return false;
  }

  try {
    const parsedOrigin = new URL(origin);
    return isLocalDevelopmentHostname(parsedOrigin.hostname);
  } catch {
    return false;
  }
}

export function createCorsOriginValidator(
  clientOrigin: string,
  nodeEnv: "development" | "test" | "production",
): (origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void) => void {
  return (origin, callback) => {
    if (isAllowedClientOrigin(origin, clientOrigin, nodeEnv)) {
      callback(null, true);
      return;
    }

    callback(new Error(`Origin ${origin ?? "<none>"} is not allowed by TuneTrack server.`));
  };
}
