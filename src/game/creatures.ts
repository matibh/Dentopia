export type CreatureKind = "meatball" | "tomato" | "pasta" | "cheese" | "mushroom" | "ravioli";
export type Creature = {
  id: string; name: string; kind: CreatureKind; hp: number; maxHp: number;
  attack: number; defense: number; color: string; side: "blue" | "red"; x: number;
};
const templates: Omit<Creature, "id" | "side" | "x">[] = [
  { name: "Albóndiga Real", kind: "meatball", hp: 92, maxHp: 92, attack: 13, defense: 5, color: "#a85a3b" },
  { name: "Tomatín", kind: "tomato", hp: 68, maxHp: 68, attack: 10, defense: 2, color: "#ef594f" },
  { name: "Fettuccino", kind: "pasta", hp: 74, maxHp: 74, attack: 12, defense: 1, color: "#e9c46a" },
  { name: "Quesardo", kind: "cheese", hp: 82, maxHp: 82, attack: 9, defense: 4, color: "#f5c542" },
  { name: "Champi", kind: "mushroom", hp: 76, maxHp: 76, attack: 11, defense: 3, color: "#c89a79" },
  { name: "Raviolón", kind: "ravioli", hp: 88, maxHp: 88, attack: 10, defense: 4, color: "#e9b86f" }
];
export function makeTeam(side: "blue" | "red"): Creature[] {
  const picks = side === "blue" ? [0, 2, 3] : [1, 4, 5];
  return picks.map((pick, i) => ({ ...templates[pick], id: side + "-" + i, side, x: side === "blue" ? -2.4 : 2.4 }));
}
export function rollDamage(attacker: Creature, defender: Creature): number {
  return Math.max(1, attacker.attack + Math.floor(Math.random() * 5) - defender.defense);
}