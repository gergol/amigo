// Inline SVG icons lifted from the design (no icon library). All inherit currentColor.
import type { JSX } from 'preact'

type P = { size?: number } & JSX.SVGAttributes<SVGSVGElement>
const Svg = ({ size = 20, children, ...rest }: P & { children: any }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" {...rest}>{children}</svg>
)

export const ChevronRight = (p: P) => <Svg {...p}><path d="m9 18 6-6-6-6" /></Svg>
export const ChevronLeft = (p: P) => <Svg {...p}><path d="m15 18-6-6 6-6" /></Svg>
export const X = (p: P) => <Svg {...p}><path d="M18 6 6 18M6 6l12 12" /></Svg>
export const Search = (p: P) => <Svg {...p}><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></Svg>
export const Bookmark = (p: P) => <Svg {...p}><path d="M4 4v16l8-5 8 5V4a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2z" /></Svg>
export const Lock = (p: P) => <Svg {...p}><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></Svg>
export const CheckList = (p: P) => <Svg {...p}><path d="m9 11 3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></Svg>

export const Gear = (p: P) => (
  <Svg {...p}><path d="M21 4H14" /><path d="M10 4H3" /><path d="M21 12H12" /><path d="M8 12H3" />
    <path d="M21 20H16" /><path d="M12 20H3" /><path d="M14 2v4" /><path d="M8 10v4" /><path d="M16 18v4" /></Svg>
)
export const BookIcon = (p: P) => (
  <Svg {...p}><path d="M12 7v14" /><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z" /></Svg>
)
export const TableIcon = (p: P) => (
  <Svg {...p}><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 3v18" /></Svg>
)
export const SpeechIcon = (p: P) => (
  <Svg {...p}><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22z" /></Svg>
)
export const Mic = (p: P) => (
  <Svg {...p}><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2" /><path d="M12 19v3" /></Svg>
)
