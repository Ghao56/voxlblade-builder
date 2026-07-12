import { readFileSync } from 'fs';
const STAT_KEYS = ['dexterityBoost','physicalBoost','airBoost','earthBoost','fireBoost','waterBoost','hexBoost','holyBoost','magicBoost','summonBoost','speedBoost','attackSpeed','warding','physicalDefense','magicDefense','airDefense','earthDefense','waterDefense','fireDefense','hexDefense','holyDefense','protection','tenacity','armorPenetration','jumpBoost','heatResistance','coldResistance'];
const PERCENT_STATS = new Set(['dexterityBoost','physicalBoost','airBoost','earthBoost','fireBoost','waterBoost','hexBoost','holyBoost','magicBoost','summonBoost','speedBoost','attackSpeed','warding','physicalDefense','magicDefense','airDefense','earthDefense','waterDefense','fireDefense','hexDefense','holyDefense','heatResistance','coldResistance']);
const armors = JSON.parse(readFileSync('./src/data/armors.json', 'utf-8'));
const rings = JSON.parse(readFileSync('./src/data/rings.json', 'utf-8'));
const runes = JSON.parse(readFileSync('./src/data/runes.json', 'utf-8'));
const blades = JSON.parse(readFileSync('./src/data/blades.json', 'utf-8'));
const handles = JSON.parse(readFileSync('./src/data/handles.json', 'utf-8'));
const races = JSON.parse(readFileSync('./src/data/races.json', 'utf-8'));
const guilds = JSON.parse(readFileSync('./src/data/guilds.json', 'utf-8'));
const enchants = JSON.parse(readFileSync('./src/data/enchantments.json', 'utf-8'));
const perksData = JSON.parse(readFileSync('./src/data/perks.json', 'utf-8'));

const PERK_MAP = Object.fromEntries(perksData.map(p => [p.name, p]));
function getPerk(name) { return PERK_MAP[name]; }

const ARMOR_MAP = Object.fromEntries(armors.map(a => [a.name, {
  name: a.name,
  parts: a.parts.map(p => ({
    type: p.type,
    stats: { ...(a.sharedPart?.stats ?? {}), ...(p.stats ?? {}) },
    perkName: p.perkName ?? a.sharedPart?.perkName ?? '',
    perkAmount: p.perkAmount ?? a.sharedPart?.perkAmount ?? 0,
  }))
}]));
function getArmorPart(name, type) { const a = ARMOR_MAP[name]; if (!a) return undefined; return a.parts.find(p => p.type === type); }

const RING_MAP = Object.fromEntries(rings.map(r => [r.name, r]));
const RUNE_MAP = Object.fromEntries(runes.map(r => [r.name, r]));

function applyUpgrade(stats, level) {
  if (level <= 0) return { ...stats };
  const mult = 1 + level * 0.1;
  const result = {};
  for (const k of STAT_KEYS) {
    const v = stats[k];
    if (v == null) continue;
    if (v > 0) result[k] = v * mult;
    else if (v < 0) result[k] = v / mult;
    else result[k] = 0;
  }
  return result;
}

const ENCHANT_MAP = Object.fromEntries(enchants.map(e => [e.name, e]));
const STAT_SELECTORS = [
  { key: 'positiveStats', pred: (v) => v > 0 },
  { key: 'negativeStats', pred: (v) => v < 0 },
  { key: 'defenseStats', pred: (v, k) => k.endsWith('Defense') && v > 0 },
];

function applyEnchantmentsToSlot(baseStats, basePerks, enchantNames, upgradeLevel) {
  const ordered = [...enchantNames].reverse();
  const baseMult = {}; const add = {}; const perks = { ...basePerks };
  for (const name of ordered) {
    if (!name) continue;
    const e = ENCHANT_MAP[name]; if (!e) continue;
    const es = e.stats; if (!es) continue;
    for (const { key, pred } of STAT_SELECTORS) {
      if (!es[key]) continue;
      const mods = Array.isArray(es[key]) ? es[key] : [es[key]];
      for (const mod of mods) {
        for (const sk of STAT_KEYS) {
          const cv = (baseStats[sk] ?? 0) * (baseMult[sk] ?? 1) + (add[sk] ?? 0);
          if (pred(cv, sk)) {
            if (mod.type === 'multiplier') baseMult[sk] = (baseMult[sk] ?? 1) * mod.value;
            else add[sk] = (add[sk] ?? 0) + mod.value;
          }
        }
      }
    }
  }
  let currentStats = {};
  for (const k of STAT_KEYS) { const r = (baseStats[k] ?? 0) * (baseMult[k] ?? 1); if (r !== 0) currentStats[k] = r; }
  if (upgradeLevel > 0) {
    const pre = currentStats.armorPenetration;
    currentStats = applyUpgrade(currentStats, upgradeLevel);
    if (currentStats.armorPenetration !== pre) currentStats.armorPenetration = pre;
  }
  const bonusMult = {}; const bonusAdd = {};
  for (const name of ordered) {
    if (!name) continue;
    const e = ENCHANT_MAP[name]; if (!e) continue;
    const es = e.stats; if (!es) continue;
    for (const k of STAT_KEYS) {
      const modifier = es[k]; if (!modifier) continue;
      const mods = Array.isArray(modifier) ? modifier : [modifier];
      for (const mod of mods) {
        if (mod.type === 'multiplier') bonusMult[k] = (bonusMult[k] ?? 1) * mod.value;
        else bonusAdd[k] = (bonusAdd[k] ?? 0) + mod.value;
      }
    }
    if (es.perks) {
      const mods = Array.isArray(es.perks) ? es.perks : [es.perks];
      for (const pn in perks) { let v = perks[pn]; for (const mod of mods) v = mod.type === 'multiplier' ? v * mod.value : v + mod.value; perks[pn] = v; }
    }
    if (e.effects) { for (const eff of e.effects) perks[eff.name] = (perks[eff.name] ?? 0) + eff.value; }
  }
  const stats = {};
  for (const k of STAT_KEYS) { const r = (currentStats[k] ?? 0) * (bonusMult[k] ?? 1) + (bonusAdd[k] ?? 0); if (r !== 0) stats[k] = r; }
  return { stats, perks };
}

const SHRINE_MULTIPLIERS = { 1: 3.0, 2: 1.7, 3: 1.4, 4: 1.1, 5: 1.0 };
function applyShrine(stats, tier) {
  if (!stats) return {};
  const mult = SHRINE_MULTIPLIERS[tier] ?? 1.0;
  if (mult === 1.0) return { ...stats };
  const r = {};
  for (const k of STAT_KEYS) { const v = stats[k]; if (v != null) r[k] = Math.round((v * mult + Number.EPSILON) * 100) / 100; }
  return r;
}

function applyInfusion(baseStats, basePerks) {
  const stats = {};
  for (const k of STAT_KEYS) { const v = baseStats[k]; if (v != null) stats[k] = v * 0.5; }
  return { stats, perks: { ...basePerks } };
}

const state = {
  race: 'HALF-ORK', guild: 'Cursed', guildRank: 3,
  helmet: 'Curse Flame', chestplate: 'Curse Flame', leggings: 'Curse Flame',
  ring: 'Fire Ring', rune: 'Winter Woof Mount Rune',
  enchantments: { helmet: ['Spell Proof','',''], chestplate: ['Spell Proof','',''], leggings: ['Spell Proof','',''], ring: ['Warped','',''], rune: ['Warped','',''] },
  infusionHelmet: 'Mischievous Mask', infusionChestplate: 'Curse Flame', infusionLeggings: 'Dreadful Lift', infusionRing: 'Fire Ring',
  weaponBlade: 'Flame Dagger', weaponHandle: 'Cursed Handle',
  shrineActive: true, upgradeHelmet: 5, upgradeChestplate: 5, upgradeLeggings: 5, upgradeRing: 5, upgradeRune: 5,
  selectedWeaponArt: 'Cursed Ground', summonCount: 15,
};

const rawStats = {}; const rawPerks = {};
function addStats(s) { if (!s) return; for (const k of STAT_KEYS) { if (s[k] != null) rawStats[k] = (rawStats[k] ?? 0) + s[k]; } }
function addPerkMap(m) { for (const k in m) rawPerks[k] = (rawPerks[k] ?? 0) + m[k]; }

addStats((races.find(r => r.name === state.race))?.statModifiers);

const guild = guilds.find(g => g.name === state.guild);
if (guild) {
  const rank = guild.ranks.find(r => r.rank === state.guildRank);
  if (rank) { addStats(rank.stats); if (rank.perks) rank.perks.forEach(p => rawPerks[p.name] = (rawPerks[p.name] ?? 0) + p.amount); }
}

for (const [an, pt, es, uk] of [['Curse Flame','Helmet','helmet','upgradeHelmet'],['Curse Flame','Chestplate','chestplate','upgradeChestplate'],['Curse Flame','Leggings','leggings','upgradeLeggings']]) {
  const part = getArmorPart(an, pt);
  if (!part) continue;
  const sr = applyEnchantmentsToSlot(part.stats, part.perkName ? { [part.perkName]: 1 } : {}, state.enchantments[es], state[uk] ?? 0);
  addStats(sr.stats); addPerkMap(sr.perks);
}

const ringItem = RING_MAP[state.ring];
if (ringItem) {
  const sr = applyEnchantmentsToSlot(ringItem.stats, ringItem.perkName ? { [ringItem.perkName]: ringItem.perkAmount ?? 1 } : {}, state.enchantments.ring, state.upgradeRing ?? 0);
  addStats(sr.stats); addPerkMap(sr.perks);
}

const runeItem = RUNE_MAP[state.rune];
if (runeItem) {
  const sr = applyEnchantmentsToSlot(runeItem.stats, runeItem.perkName ? { [runeItem.perkName]: runeItem.perkAmount ?? 1 } : {}, state.enchantments.rune, state.upgradeRune ?? 0);
  addStats(sr.stats); addPerkMap(sr.perks);
}

const blade = blades.find(b => b.name === state.weaponBlade);
if (blade) {
  addStats(state.shrineActive ? applyShrine(blade.stats, blade.tier) : blade.stats);
  if (blade.perks) blade.perks.forEach(p => rawPerks[p.name] = (rawPerks[p.name] ?? 0) + p.amount);
}
const handle = handles.find(h => h.name === state.weaponHandle);
if (handle) {
  addStats(state.shrineActive ? applyShrine(handle.stats, handle.tier) : handle.stats);
  if (handle.perks) handle.perks.forEach(p => rawPerks[p.name] = (rawPerks[p.name] ?? 0) + p.amount);
}

for (const [infName, infType] of [['Mischievous Mask','Helmet'],['Curse Flame','Chestplate'],['Dreadful Lift','Leggings']]) {
  const part = getArmorPart(infName, infType);
  if (part) {
    const inf = applyInfusion(part.stats, part.perkName ? { [part.perkName]: part.perkAmount ?? 1 } : {});
    addStats(inf.stats); addPerkMap(inf.perks);
  }
}
const infRing = RING_MAP['Fire Ring'];
if (infRing) {
  const inf = applyInfusion(infRing.stats, infRing.perkName ? { [infRing.perkName]: infRing.perkAmount ?? 1 } : {});
  addStats(inf.stats); addPerkMap(inf.perks);
}

rawStats.armorPenetration = (rawStats.armorPenetration ?? 0) + (races.find(r => r.name === state.race)?.globalArmorPenetration ?? 0);

for (const k of STAT_KEYS) {
  if (rawStats[k] != null) {
    rawStats[k] = PERCENT_STATS.has(k) ? Math.round((rawStats[k] + Number.EPSILON) * 100) / 100 : rawStats[k];
  }
}

console.log('=== ACCUMULATED STATS ===');
console.log(JSON.stringify(rawStats, null, 2));
console.log();

function finalizePerks(raw) {
  let final = {};
  for (const k in raw) { if (raw[k] !== 0) final[k] = raw[k]; }
  const pe = final['Perk Effectiveness'] ?? 0; const cu = final['Cursed'] ?? 0;
  if (pe > 0 || cu > 0) {
    const mult = (1 + pe * 0.1) * (1 + cu * 0.1);
    const ENCH_EFF = new Set(enchants.flatMap(e => (e.effects ?? []).map(ef => ef.name)));
    const EXEMPT = new Set([...ENCH_EFF, 'Cursed', 'Luminescent Fervor', 'Valor', 'Spirit Commune', 'Channeled Weapon', 'Quickcast', 'Thief Training', 'Vampire', 'Heal Boost', 'Stored Corruption', 'Minion Absorption', 'Poison Potency', 'Burn Potency', 'Bleed Potency']);
    const app = {};
    for (const n in final) app[n] = EXEMPT.has(n) ? final[n] : final[n] * mult;
    final = app;
  }
  if (final['Buckler'] != null) final['Parry'] = (final['Parry'] ?? 0) + final['Buckler'];
  const POT = new Set(['Bleed Potency','Burn Potency','Poison Potency']);
  for (const k of Object.keys(final)) {
    if (POT.has(k)) continue;
    const def = getPerk(k); if (!def) continue;
    for (const tag of def.tags) { if (POT.has(tag)) final[tag] = (final[tag] ?? 0) + final[k]; }
  }
  return final;
}

console.log('=== RAW PERKS ===');
console.log(JSON.stringify(rawPerks, null, 2));
console.log();

const fp = finalizePerks(rawPerks);
console.log('=== FINAL PERKS (after Perk Effectiveness ×1.56 & grantor conversion) ===');
Object.entries(fp).sort((a,b) => a[0].localeCompare(b[0])).forEach(([k,v]) => console.log('  ' + k + ': ' + v));
console.log();

// Weapon Type info
console.log('=== WEAPON DAMAGE TYPES ===');
const bladeItem = blades.find(b => b.name === 'Flame Dagger');
const handleItem = handles.find(h => h.name === 'Cursed Handle');
console.log('  Blade: Flame Dagger - fireType: ' + bladeItem.fireType + ', magicType: ' + bladeItem.magicType + ', fireScaling: ' + bladeItem.fireScaling + ', dexterityScaling: ' + bladeItem.dexterityScaling);
console.log('  Handle: Cursed Handle - hexType: ' + handleItem.hexType + ', hexScaling: ' + handleItem.hexScaling);
const combinedTypes = {};
for (const k of ['physicalType','magicType','fireType','waterType','earthType','airType','hexType','holyType','summonType','trueType']) {
  const bv = bladeItem[k] ?? 0; const hv = handleItem[k] ?? 0;
  if (bv + hv > 0) combinedTypes[k.replace('Type','')] = { blade: bv, handle: hv, total: bv + hv };
}
for (const [type, vals] of Object.entries(combinedTypes)) {
  console.log('  ' + type + ': ' + (vals.blade * vals.total * 100).toFixed(0) + '% (blade ' + (vals.blade*100).toFixed(0) + '%, handle ' + (vals.handle*100).toFixed(0) + '%)');
}
console.log();

// Fire boost + Hex boost from stats
console.log('=== CORE STATS ===');
console.log('  fireBoost: ' + rawStats.fireBoost + '%');
console.log('  hexBoost: ' + rawStats.hexBoost + '%');
console.log('  dexterityBoost: ' + rawStats.dexterityBoost + '%');
console.log('  fireDefense: ' + rawStats.fireDefense + '%');
console.log('  hexDefense: ' + rawStats.hexDefense + '%');
console.log('  physicalDefense: ' + rawStats.physicalDefense + '%');
console.log('  magicDefense: ' + rawStats.magicDefense + '%');
console.log('  armorPenetration: ' + rawStats.armorPenetration);
