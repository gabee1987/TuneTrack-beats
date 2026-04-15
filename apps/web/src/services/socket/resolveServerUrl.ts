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

  const protocol = locationProtocol === "https:" ? "https:" : "http:";
  return `${protocol}//${locationHostname}:3001`;
}
