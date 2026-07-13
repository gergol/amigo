// Single import surface for the engine — screens import from here, never from
// deep ../engine/* paths. The engine is pure and framework-agnostic (shared with the CLI).

export {
  pickVocabCard, pickVerbDrill, pickSentence,
  gradeVocab, gradeVerb, gradeSentence, unlockedModules,
} from '../engine/trainer'
export type { VocabCard, VerbDrill } from '../engine/trainer'

export {
  markKnown, markUnknown, isKnown, moduleKnown, currentModule, allPoints, vocabKeys,
} from '../engine/learner'
export type { Focus } from '../engine/learner'

export { checkAnswer, normalize } from '../engine/check'
export { iso, weight, isDue, fresh, mature, review, addDays } from '../engine/srs'
export { vocabKey } from '../engine/templates'
export type { Exercise, Rng } from '../engine/templates'
export * from '../engine/types'

export { content } from './content'
