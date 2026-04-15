interface SessionCrypto {
  getRandomValues?: (array: Uint8Array) => Uint8Array;
  randomUUID?: () => string;
}

function formatUuidFromRandomValues(randomValues: Uint8Array): string {
  const bytes = Array.from(randomValues);
  const byte6 = bytes[6] ?? 0;
  const byte8 = bytes[8] ?? 0;

  bytes[6] = (byte6 & 0x0f) | 0x40;
  bytes[8] = (byte8 & 0x3f) | 0x80;

  const hex = bytes.map((value) => value.toString(16).padStart(2, "0")).join("");

  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join("-");
}

export function createSessionId(cryptoObject: SessionCrypto | undefined): string {
  if (cryptoObject?.randomUUID) {
    return cryptoObject.randomUUID();
  }

  if (cryptoObject?.getRandomValues) {
    return formatUuidFromRandomValues(cryptoObject.getRandomValues(new Uint8Array(16)));
  }

  const timestampHex = Date.now().toString(16).padStart(12, "0").slice(-12);
  const randomHex = Array.from({ length: 20 }, () =>
    Math.floor(Math.random() * 16).toString(16),
  ).join("");
  const fallbackHex = `${timestampHex}${randomHex}`.slice(0, 32);

  return [
    fallbackHex.slice(0, 8),
    fallbackHex.slice(8, 12),
    `4${fallbackHex.slice(13, 16)}`,
    `a${fallbackHex.slice(17, 20)}`,
    fallbackHex.slice(20, 32),
  ].join("-");
}
