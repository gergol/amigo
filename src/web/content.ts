import raw from './content.generated.json'
import type { Content } from '../engine/types'

// Prebuilt at predev/prebuild by scripts/build-content.ts — never parsed at runtime.
export const content = raw as unknown as Content
