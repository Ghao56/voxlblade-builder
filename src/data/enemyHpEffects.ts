export interface EnemyHpGate {
  hpThreshold: number
  aboveThreshold: boolean
}

function isEnemyHpGateActive(gate: EnemyHpGate, enemyHpFillPct: number): boolean {
  return gate.aboveThreshold ? enemyHpFillPct > gate.hpThreshold : enemyHpFillPct <= gate.hpThreshold
}

export interface EnemyHpDebuffEffect {
  buffName: string
  getPotency: (perkAmount: number) => number
  duration: number
}

export interface EnemyHpDotBoost {
  dotType: string
  getMultiplier: (perkAmount: number) => number
}

export interface EnemyHpEffectDef {
  perkName: string
  condition: string
  hpGate: EnemyHpGate
  requiresDebuff?: string
  debuff?: EnemyHpDebuffEffect
  dotBoost?: EnemyHpDotBoost
}

const ENEMY_HP_EFFECT_DEFS: EnemyHpEffectDef[] = [
  {
    perkName: 'Mycotic Bloom',
    condition: 'Poisoned enemies above 50% HP',
    hpGate: { hpThreshold: 50, aboveThreshold: true },
    requiresDebuff: 'Poison',
    debuff: {
      buffName: 'Slowness',
      getPotency: (amt) => 0.2 * amt,
      duration: 5,
    },
  },
  {
    perkName: 'Mycotic Bloom',
    condition: 'Poisoned enemies below 50% HP · +25% Poison dmg per stack',
    hpGate: { hpThreshold: 50, aboveThreshold: false },
    dotBoost: {
      dotType: 'Poison',
      getMultiplier: (amt) => 1 + 0.25 * amt,
    },
  },
]

export function getActiveEnemyHpDebuffs(
  perks: Record<string, number>,
  enemyHpFillPct: number,
  activeDebuffNames: string[],
): Array<{ buffName: string; potency: number; duration: number; condition: string; sourceName: string }> {
  const out: Array<{ buffName: string; potency: number; duration: number; condition: string; sourceName: string }> = []
  for (const def of ENEMY_HP_EFFECT_DEFS) {
    if (!def.debuff) continue
    const amt = perks[def.perkName] ?? 0
    if (amt <= 0) continue
    if (def.requiresDebuff && !activeDebuffNames.includes(def.requiresDebuff)) continue
    if (!isEnemyHpGateActive(def.hpGate, enemyHpFillPct)) continue
    out.push({
      buffName: def.debuff.buffName,
      potency: def.debuff.getPotency(amt),
      duration: def.debuff.duration,
      condition: def.condition,
      sourceName: def.perkName,
    })
  }
  return out
}

export function getEnemyHpDotMultiplier(
  perks: Record<string, number>,
  enemyHpFillPct: number,
  dotType: string,
): number {
  let mult = 1
  for (const def of ENEMY_HP_EFFECT_DEFS) {
    if (!def.dotBoost || def.dotBoost.dotType !== dotType) continue
    const amt = perks[def.perkName] ?? 0
    if (amt <= 0) continue
    if (!isEnemyHpGateActive(def.hpGate, enemyHpFillPct)) continue
    mult *= def.dotBoost.getMultiplier(amt)
  }
  return mult
}
