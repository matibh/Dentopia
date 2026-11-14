export type CreatureKind = "meatball" | "tomato" | "pasta" | "cheese" | "mushroom" | "ravioli";
export type Rarity = "Común" | "Raro" | "Épico";
export type Creature = {
  id: string; name: string; kind: CreatureKind; hp: number; maxHp: number;
  attack: number; defense: number; color: string; side: "blue" | "red"; x: number;
  rarity: Rarity; trait: string; wins: number; kills: number; abilityName: string; abilityDescription: string; killerName?: string;
};
type Template = { name: string; kind: CreatureKind; hp: number; attack: number; defense: number; color: string; trait: string };
const templates: Template[] = [
  { name: "Albóndiga", kind: "meatball", hp: 92, attack: 13, defense: 5, color: "#a85a3b", trait: "Corazón de hierro" },
  { name: "Tomatín", kind: "tomato", hp: 68, attack: 10, defense: 2, color: "#ef594f", trait: "Sangre caliente" },
  { name: "Fettuccino", kind: "pasta", hp: 74, attack: 12, defense: 1, color: "#e9c46a", trait: "Golpe elástico" },
  { name: "Quesardo", kind: "cheese", hp: 82, attack: 9, defense: 4, color: "#f5c542", trait: "Corteza dura" },
  { name: "Champi", kind: "mushroom", hp: 76, attack: 11, defense: 3, color: "#c89a79", trait: "Esporas valientes" },
  { name: "Raviolón", kind: "ravioli", hp: 88, attack: 10, defense: 4, color: "#e9b86f", trait: "Relleno sorpresa" }
];
const names: Record<CreatureKind, string[]> = {
  meatball: ["Albóndiga", "Don Bolo", "Bollito", "Bruno"],
  tomato: ["Tomatín", "Rojito", "Pomodoro", "Toma"],
  pasta: ["Fettuccino", "Tallarín", "Spaghetto", "Linguini"],
  cheese: ["Quesardo", "Provolito", "Cheddarín", "Gouda"],
  mushroom: ["Champi", "Portobello", "Setín", "Míster Hongo"],
  ravioli: ["Raviolón", "Raviolito", "Cuadradín", "Ravi"]
};
const roll = (n: number) => Math.floor(Math.random() * n);
export function recruitCreature(): Creature {
  const t = templates[roll(templates.length)];
  const rarity: Rarity = Math.random() > .94 ? "Épico" : Math.random() > .76 ? "Raro" : "Común";
  const bonus = rarity === "Épico" ? 1.25 : rarity === "Raro" ? 1.12 : 1;
  const hp = Math.round((t.hp + roll(17) - 8) * bonus);
  return {
    ...t, id: crypto.randomUUID(), name: names[t.kind][roll(names[t.kind].length)],
    hp, maxHp: hp, attack: Math.max(1, Math.round((t.attack + roll(5) - 2) * bonus)),
    defense: Math.max(0, Math.round((t.defense + roll(3) - 1) * bonus)),
    side: "blue", x: -2.4, rarity, wins: 0, kills: 0,
    ...abilityFor(t.kind)
  };
}
export function makeTeam(side: "blue" | "red"): Creature[] {
  return Array.from({ length: 3 }, (_, i) => {
    const c = recruitCreature();
    return { ...c, side, x: side === "blue" ? -2.4 : 2.4, id: side + "-" + i };
  });
}
export function abilityFor(kind: CreatureKind): { abilityName: string; abilityDescription: string } {
  const abilities: Record<CreatureKind, { abilityName: string; abilityDescription: string }> = {
    meatball: { abilityName: "Caparazón", abilityDescription: "Recibe 3 puntos menos de daño." },
    tomato: { abilityName: "Sangre caliente", abilityDescription: "Inflige 6 de daño extra a rivales heridos." },
    pasta: { abilityName: "Latigazo", abilityDescription: "Tiene 1 de cada 4 chances de sumar 5 de daño." },
    cheese: { abilityName: "Corteza dura", abilityDescription: "Reduce en 2 el daño recibido." },
    mushroom: { abilityName: "Esporas", abilityDescription: "Tiene 1 de cada 5 chances de sumar 7 de daño." },
    ravioli: { abilityName: "Relleno sorpresa", abilityDescription: "Tiene 1 de cada 5 chances de sumar 9 de daño." }
  };
  return abilities[kind];
}
export function rollDamage(attacker: Creature, defender: Creature): number {
  let damage = attacker.attack + roll(5) - defender.defense;
  if (defender.kind === "meatball") damage -= 3;
  if (defender.kind === "cheese") damage -= 2;
  if (attacker.kind === "tomato" && defender.hp / defender.maxHp <= .4) damage += 6;
  if (attacker.kind === "pasta" && roll(4) === 0) damage += 5;
  if (attacker.kind === "mushroom" && roll(5) === 0) damage += 7;
  if (attacker.kind === "ravioli" && roll(5) === 0) damage += 9;
  return Math.max(1, damage);
}
