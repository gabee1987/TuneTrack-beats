interface ResolveServerUrlOptions {
  envServerUrl?: string | undefined;
  locationHostname?: string | undefined;
  locationProtocol?: string | undefined;
}

export function resolveServerUrl({
  envServerUrl,
  locationHostname,
  locationProtocol,
}: ResolveServerUrlOptions): string {
  if (envServerUrl) {
    return envServerUrl;
  }

  if (!locationHostname) {
    return "http://localhost:3001";
  }

  // When served over HTTPS (e.g. dev with TLS), route socket.io through the
  // Vite proxy (/socket.io → http://localhost:3001) so the browser doesn't
  // block a mixed-content connection to the plain-HTTP server.
  if (locationProtocol === "https:") {
    return "/";
  }

  return `http://${locationHostname}:3001`;
}
