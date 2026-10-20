const SDK_SCRIPT_SRC = "https://sdk.scdn.co/spotify-player.js";

let sdkLoadPromise: Promise<void> | null = null;

/** Injects the Web Playback SDK once per page; a failed load may be retried. */
export function loadSpotifySdk(): Promise<void> {
  if (window.Spotify) return Promise.resolve();
  if (sdkLoadPromise) return sdkLoadPromise;

  sdkLoadPromise = new Promise<void>((resolve, reject) => {
    window.onSpotifyWebPlaybackSDKReady = () => resolve();

    const script = document.createElement("script");
    script.src = SDK_SCRIPT_SRC;
    script.async = true;
    script.onerror = () => {
      script.remove();
      // Allow a later attempt to retry after a failed/aborted load.
      sdkLoadPromise = null;
      reject(new Error("Spotify Web Playback SDK failed to load"));
    };
    document.head.appendChild(script);
  });

  return sdkLoadPromise;
}
