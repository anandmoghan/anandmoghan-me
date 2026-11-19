import type { ComponentType } from 'react'
import type { GlyphProps } from './Glyph'
import { AdminGlyph } from './admin'
import { ExpenseGlyph } from './expense'
import { FamilyGlyph } from './family'
import { HomeGlyph } from './home'
import { LadderGlyph } from './ladder'
import { MaterialsGlyph } from './materials'
import { NilaGlyph } from './nila'
import { PlannerGlyph } from './planner'
import { ShareGlyph } from './share'
import { TimeGlyph } from './time'
import { WealthGlyph } from './wealth'

/** Apps with a tracked icon: every public app id, plus Nila (installed from inside Family). */
export type GlyphId =
  | 'family'
  | 'ladder'
  | 'planner'
  | 'home'
  | 'wealth'
  | 'expense'
  | 'time'
  | 'share'
  | 'materials'
  | 'admin'
  | 'nila'

export const APP_GLYPH: Record<GlyphId, ComponentType<GlyphProps>> = {
  family: FamilyGlyph,
  ladder: LadderGlyph,
  planner: PlannerGlyph,
  home: HomeGlyph,
  wealth: WealthGlyph,
  expense: ExpenseGlyph,
  time: TimeGlyph,
  share: ShareGlyph,
  materials: MaterialsGlyph,
  admin: AdminGlyph,
  nila: NilaGlyph,
}

export function isGlyphId(id: string): id is GlyphId {
  return id in APP_GLYPH
}
