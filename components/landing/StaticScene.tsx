// Still illustration of the 3D scene: used for reduced motion, Data Saver and
// devices without WebGL, and shown while the 3D scene loads.
export default function StaticScene({ className = "" }: { className?: string }) {
  const cards = [
    { x: 70, y: 52, r: -12, c: "#D2692F" },
    { x: 152, y: 26, r: 6, c: "#2E9097" },
    { x: 404, y: 40, r: 10, c: "#9467B8" },
    { x: 478, y: 92, r: -6, c: "#6E9636" },
  ];
  const pins = [
    { x: 64, y: 300, c: "#D2692F" },
    { x: 520, y: 286, c: "#4A84B8" },
    { x: 438, y: 352, c: "#6E9636" },
    { x: 150, y: 360, c: "#9467B8" },
  ];
  return (
    <svg viewBox="0 0 600 420" className={className} role="img" aria-label="Illustration: saved video cards flying into an open notebook, with map pins around it">
      {/* map ground */}
      <path d="M20 250 L300 170 L580 250 L300 410 Z" fill="#EFE5D1" />
      <g stroke="#E2D6C1" strokeWidth="3">
        <path d="M90 262 L370 182" /><path d="M160 290 L440 210" /><path d="M230 330 L510 250" />
        <path d="M110 230 L390 380" /><path d="M200 205 L480 355" />
      </g>
      <path d="M410 395 C 470 360, 520 330, 575 300" stroke="#BFD6E2" strokeWidth="14" fill="none" strokeLinecap="round" />
      {/* notebook */}
      <ellipse cx="300" cy="300" rx="170" ry="34" fill="#2A2219" opacity="0.12" />
      <path d="M140 250 L300 210 L460 250 L300 300 Z" fill="#2F5A43" />
      <path d="M150 244 L296 208 L296 288 L156 262 Z" fill="#FFFCF6" />
      <path d="M304 208 L450 244 L444 262 L304 288 Z" fill="#FFFCF6" />
      <g stroke="#2A2219" strokeWidth="2.5" strokeLinecap="round" opacity="0.75">
        <path d="M178 244 L270 222" /><path d="M182 254 L282 230" /><path d="M188 264 L262 246" />
        <path d="M326 226 L420 248" /><path d="M322 238 L430 262" /><path d="M320 250 L396 268" />
      </g>
      {/* reel cards */}
      {cards.map((card) => (
        <g key={card.x} transform={`translate(${card.x} ${card.y}) rotate(${card.r})`}>
          <rect width="58" height="100" rx="9" fill="#2A2219" />
          <rect x="5" y="6" width="48" height="88" rx="5" fill={card.c} />
          <path d="M24 40 L38 50 L24 60 Z" fill="#FFFFFF" />
        </g>
      ))}
      {/* pins */}
      {pins.map((pin) => (
        <g key={pin.x} transform={`translate(${pin.x} ${pin.y})`}>
          <ellipse cx="0" cy="34" rx="12" ry="4" fill="#2A2219" opacity="0.15" />
          <path d="M0 34 C -6 20, -16 12, -16 0 A 16 16 0 1 1 16 0 C 16 12, 6 20, 0 34 Z" fill={pin.c} />
          <circle r="6" fill="#FFFFFF" />
        </g>
      ))}
    </svg>
  );
}
