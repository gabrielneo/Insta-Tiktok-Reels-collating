// Client-side hint only: flags pasted lines that the server will reject, so
// users can fix them before a long run. The server still validates every link.
// Keep in sync with PLATFORMS in app/api/parse-reels/route.ts.
const SUPPORTED_LINK_PATTERNS = [
  /^https?:\/\/(www\.)?instagram\.com\/(reel|p|reels)\/[^/\s]+\/?/i,
  /^https?:\/\/((www|m)\.)?tiktok\.com\/(@[^/\s]+\/(video|photo)\/\d+|t\/[^/\s]+)|^https?:\/\/(vm|vt)\.tiktok\.com\/[^/\s]+|^https?:\/\/(www\.)?tiktokv\.com\/share\/video\/\d+/i,
];

export const MAX_LINKS_PER_BATCH = 50;

export function isSupportedLink(url: string): boolean {
  return SUPPORTED_LINK_PATTERNS.some((pattern) => pattern.test(url));
}
