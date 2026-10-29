// Shared, mutable scroll/pointer state read by the 3D scene every frame.
// Kept outside React so scrolling never triggers re-renders.
//
// `chapter` runs from 0 (hero) to 5 (final call to action). Each whole
// number lines up with the middle of a page section, so the camera arrives
// at a section exactly as its text is centred on screen.
export const scrollState = {
  progress: 0,
  chapter: 0,
  pointer: { x: 0, y: 0 },
};

export const CHAPTER_COUNT = 6;

/** Maps raw scroll progress (0–1) to a chapter value using section anchors. */
export function progressToChapter(progress: number, anchors: number[]): number {
  if (anchors.length < 2) return 0;
  if (progress <= anchors[0]) return 0;
  for (let i = 0; i < anchors.length - 1; i++) {
    const a = anchors[i];
    const b = anchors[i + 1];
    if (progress <= b) return i + (b > a ? (progress - a) / (b - a) : 1);
  }
  return anchors.length - 1;
}
