import { useEffect, useRef, useState } from "react";
import { Arena } from "./game/Arena";
import { abilityFor, recruitCreature, rollDamage, type Creature } from "./game/creatures";

type LogLine = { id: number; text: string; tone: "blue" | "red" | "neutral" };
const STORAGE_KEY = "dentopia-roster-v1";
const MEMORIAL_KEY = "dentopia-memorial-v1";
type MemorialCreature = Creature & { causeOfDeath: string; dateOfDeath: string };
function loadRoster(): Creature[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return (JSON.parse(saved) as Creature[]).map(c => ({ ...c, kills: c.kills ?? 0, ...abilityFor(c.kind) }));
  } catch { /* start with a fresh roster */ }
  return Array.from({ length: 6 }, () => recruitCreature());
}
const saveRoster = (roster: Creature[]) => localStorage.setItem(STORAGE_KEY, JSON.stringify(roster));
function loadMemorial(): MemorialCreature[] { try { return JSON.parse(localStorage.getItem(MEMORIAL_KEY) || "[]") as MemorialCreature[]; } catch { return []; } }

export default function App() {
  const host = useRef<HTMLDivElement>(null);
  const arena = useRef<Arena | null>(null);
  const [roster, setRoster] = useState<Creature[]>(loadRoster);
  const [memorial, setMemorial] = useState<MemorialCreature[]>(loadMemorial);
  const [selected, setSelected] = useState<string[]>([]);
  const initializedSelection = useRef(false);
  const [battleUnits, setBattleUnits] = useState<Creature[]>([]);
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [logs, setLogs] = useState<LogLine[]>([{ id: 0, text: "Tu escuadrón espera nuevas órdenes.", tone: "neutral" }]);
  const [round, setRound] = useState(0);
  const [winner, setWinner] = useState<string | null>(null);
  const [tab, setTab] = useState<"roster" | "arena" | "memorial">("roster");
  const logId = useRef(1);

  useEffect(() => { saveRoster(roster); }, [roster]);
  useEffect(() => { localStorage.setItem(MEMORIAL_KEY, JSON.stringify(memorial)); }, [memorial]);
  useEffect(() => { if (!initializedSelection.current && roster.length) { setSelected(roster.slice(0, 3).map(c => c.id)); initializedSelection.current = true; } }, [roster]);
  useEffect(() => {
    if (tab !== "arena" || !host.current) return;
    const instance = new Arena(host.current);
    arena.current = instance;
    if (battleUnits.length) instance.setCreatures(battleUnits);
    return () => { instance.dispose(); arena.current = null; };
  }, [tab]);
  useEffect(() => { if (battleUnits.length) arena.current?.setCreatures(battleUnits); }, [battleUnits.length > 0]);
  useEffect(() => { if (battleUnits.length) arena.current?.updateHealth(battleUnits); }, [battleUnits]);

  const recruit = () => {
    const fresh = recruitCreature();
    setRoster(old => [...old, fresh]);
    setLogs(old => [{ id: logId.current++, text: fresh.name + " se unió a Dentopia.", tone: "neutral" as const }, ...old].slice(0, 8));
  };
  const toggleSelected = (id: string) => {
    if (running) return;
    setSelected(old => old.includes(id) ? old.filter(x => x !== id) : old.length < 3 ? [...old, id] : old);
  };
  const startBattle = () => {
    if (selected.length !== 3) return;
    const team = roster.filter(c => selected.includes(c.id)).map(c => ({ ...c, hp: c.maxHp, side: "blue" as const, x: -2.4 }));
    const rival = Array.from({ length: 3 }, () => ({ ...recruitCreature(), side: "red" as const, x: 2.4 }));
    const fresh = [...team, ...rival];
    setBattleUnits(fresh); setRound(0); setWinner(null); setRunning(false); setTab("arena");
    setLogs([{ id: logId.current++, text: "¡Comienza el combate! Tu equipo entra a la arena.", tone: "neutral" }]);
    window.setTimeout(() => setRunning(true), 100);
  };
  const resetBattle = () => { setRunning(false); setWinner(null); setBattleUnits([]); setRound(0); setTab("roster"); };
  useEffect(() => {
    if (!running || winner || !battleUnits.length) return;
    const timer = window.setTimeout(() => {
      const aliveBlue = battleUnits.filter(c => c.side === "blue" && c.hp > 0);
      const aliveRed = battleUnits.filter(c => c.side === "red" && c.hp > 0);
      if (!aliveBlue.length || !aliveRed.length) {
        setWinner(aliveBlue.length ? "¡Victoria!" : "Derrota");
        setRunning(false); return;
      }
      const attacker = [...aliveBlue, ...aliveRed][Math.floor(Math.random() * (aliveBlue.length + aliveRed.length))];
      const opponents = battleUnits.filter(c => c.side !== attacker.side && c.hp > 0);
      const target = opponents[Math.floor(Math.random() * opponents.length)];
      const damage = rollDamage(attacker, target);
      const next = battleUnits.map(c => c.id === target.id ? { ...c, hp: Math.max(0, c.hp - damage), ...(target.hp - damage <= 0 ? { killerName: attacker.name } : {}) } : c.id === attacker.id && target.hp - damage <= 0 ? { ...c, kills: (c.kills ?? 0) + 1 } : c);
      setBattleUnits(next); setRound(r => r + 1);
      const defeated = target.hp - damage <= 0;
      setLogs(old => [{ id: logId.current++, text: defeated ? attacker.name + " derrotó a " + target.name + "." : attacker.name + " golpeó a " + target.name + " por " + damage + " de daño.", tone: attacker.side }, ...old].slice(0, 8));
      const blueLeft = next.filter(c => c.side === "blue" && c.hp > 0).length;
      const redLeft = next.filter(c => c.side === "red" && c.hp > 0).length;
      if (!blueLeft || !redLeft) {
        const won = blueLeft > 0;
        setWinner(won ? "¡Victoria!" : "Derrota"); setRunning(false);
        const fallen = next.filter(c => c.side === "blue" && c.hp <= 0);
        const fallenIds = new Set(fallen.map(c => c.id));
        const survivors = new Set(next.filter(c => c.side === "blue" && c.hp > 0).map(c => c.id));
        if (fallen.length) {
          setMemorial(old => [...old, ...fallen.map(c => ({ ...c, causeOfDeath: c.killerName || "La Arena", dateOfDeath: new Date().toISOString() }))]);
          setSelected(old => old.filter(id => !fallenIds.has(id)));
          setLogs(old => [{ id: logId.current++, text: fallen.map(c => c.name).join(", ") + " pasó al Archivo de Leyendas.", tone: "neutral" as const }, ...old].slice(0, 8));
        }
        setRoster(old => old.filter(c => !fallenIds.has(c.id)).map(c => survivors.has(c.id) && won ? { ...c, wins: c.wins + 1 } : c));
      }
    }, 1050 / speed);
    return () => window.clearTimeout(timer);
  }, [running, speed, round, winner, battleUnits]);

  const blue = battleUnits.filter(c => c.side === "blue");
  const red = battleUnits.filter(c => c.side === "red");
  const aliveBlue = blue.filter(c => c.hp > 0).length;
  const aliveRed = red.filter(c => c.hp > 0).length;
  const activeRoster = roster.filter(c => selected.includes(c.id));

  return <main className="app-shell">
    <header className="topbar"><a className="brand" href="#"><span className="brand-mark">D</span><span>DENTOPIA<small>FOOD FIGHTERS ARENA</small></span></a><div className="top-status"><i /> PROTOTIPO 0.2 <span className="status-divider">/</span> RECLUTAMIENTO</div><div className="profile-dot">✦</div></header>
    <section className="intro"><div><div className="eyebrow">UN REINO HECHO DE COMIDA</div><h1>Formá tu<br/><em>leyenda.</em></h1><p>Reclutá criaturas. Elegí tus tres campeones. Entrá a la arena.</p></div><div className="match-card"><span>TU COLECCIÓN</span><strong>{roster.length} <b>CRIATURAS</b></strong><small>{selected.length}/3 EN EL ESCUADRÓN</small></div></section>
    <nav className="game-tabs"><button className={tab === "roster" ? "active" : ""} onClick={() => setTab("roster")}>01 / RECLUTAMIENTO Y COLECCIÓN</button><button className={tab === "arena" ? "active" : ""} onClick={() => setTab("arena")}>02 / ARENA DE COMBATE</button><button className={tab === "memorial" ? "active" : ""} onClick={() => setTab("memorial")}>03 / ARCHIVO ({memorial.length})</button></nav>
    {tab === "roster" ? <section className="roster-screen">
      <div className="roster-heading"><div><span className="eyebrow">ELIGE A TUS CAMPEONES</span><h2>Tu escuadrón <em>({selected.length}/3)</em></h2><p>Seleccioná hasta tres criaturas. Cada una tiene atributos y rareza propios.</p></div><button className="primary-btn recruit-btn" onClick={recruit}>＋ RECLUTAR CRIATURA</button></div>
      <div className="roster-grid">{roster.map(c => <CreatureCard key={c.id} c={c} selected={selected.includes(c.id)} onClick={() => toggleSelected(c.id)} />)}</div>
      <div className="roster-bottom"><div><strong>{activeRoster.length === 3 ? "Escuadrón listo para luchar" : "Tu escuadrón necesita tres criaturas"}</strong><span>{activeRoster.map(c => c.name).join(" · ") || "Todavía no seleccionaste a nadie"}</span></div><button className="primary-btn" disabled={selected.length !== 3} onClick={startBattle}>⚔ ENTRAR A LA ARENA</button></div>
    </section> : tab === "memorial" ? <section className="roster-screen memorial-screen"><div className="roster-heading"><div><span className="eyebrow">LOS QUE DIERON TODO</span><h2>Archivo de <em>Leyendas</em></h2><p>Sus cartas permanecen. Sus lugares en el escuadrón, no.</p></div><div className="memorial-count">{memorial.length} CAÍDOS</div></div>{memorial.length ? <div className="roster-grid">{[...memorial].reverse().map(c => <MemorialCard key={c.id} c={c} />)}</div> : <div className="empty-memorial"><span>✦</span><strong>Tu historia todavía no tiene caídos.</strong><p>Las criaturas que no sobrevivan a la arena aparecerán aquí.</p></div>}</section> : <section className="battle-layout">
      <div className="arena-panel"><div className="arena-head"><div><span className="live-dot" /> ARENA CENTRAL</div><span>RONDA {String(round).padStart(2, "0")}</span></div><div className="arena-canvas" ref={host}><div className="arena-vs">VS</div><div className="arena-side-label left">TU ESCUADRÓN</div><div className="arena-side-label right">RIVALES</div></div>
        <div className="arena-controls"><div className="control-copy"><strong>{winner || (running ? "Combate en curso" : "Esperando órdenes")}</strong><span>{winner ? "El enfrentamiento terminó." : running ? "Las criaturas luchan por su supervivencia." : "Iniciá o continuá observando el combate."}</span></div><div className="buttons"><button className="secondary-btn" onClick={resetBattle}>VOLVER</button><button className="primary-btn" disabled={!battleUnits.length || !!winner} onClick={() => setRunning(v => !v)}>{running ? "Ⅱ PAUSAR" : "▶ CONTINUAR"}</button></div></div>
      </div>
      <aside className="side-panel"><div className="panel-title"><span>ESTADO DEL ENFRENTAMIENTO</span><span className="muted">EN VIVO</span></div>
        <div className="team-title blue-title"><span>◆ TU EQUIPO</span><b>{aliveBlue}/3 ACTIVOS</b></div>{blue.map(c => <CreatureRow key={c.id} c={c} />)}
        <div className="team-title red-title"><span>◆ RIVALES</span><b>{aliveRed}/3 ACTIVOS</b></div>{red.map(c => <CreatureRow key={c.id} c={c} />)}
        <div className="log-title">REGISTRO DE BATALLA</div><div className="battle-log">{logs.map(line => <div className={"log-line " + line.tone} key={line.id}><i />{line.text}</div>)}</div>
        <div className="speed-control"><span>VELOCIDAD</span><button className={speed === 1 ? "selected" : ""} onClick={() => setSpeed(1)}>1×</button><button className={speed === 2 ? "selected" : ""} onClick={() => setSpeed(2)}>2×</button></div>
      </aside>
    </section>}
    <footer><span>DENTOPIA © 2026</span><span>RECLUTÁ. COMBATÍ. RECORDÁ.</span><span>PROTOTIPO 0.2</span></footer>
  </main>;
}

function CreatureCard({ c, selected, onClick }: { c: Creature; selected: boolean; onClick: () => void }) {
  const symbol = c.kind === "meatball" ? "●" : c.kind === "tomato" ? "🍅" : c.kind === "pasta" ? "〰" : c.kind === "cheese" ? "◆" : c.kind === "mushroom" ? "🍄" : "▧";
  return <button className={"roster-card " + (selected ? "chosen" : "") + " rarity-" + c.rarity.toLowerCase()} onClick={onClick}>
    <div className="card-top"><span>{c.rarity.toUpperCase()}</span><span>{selected ? "✓ EN ESCUADRÓN" : "＋ SELECCIONAR"}</span></div>
    <div className="card-creature" style={{ color: c.color }}>{symbol}</div><h3>{c.name}</h3><p>{c.trait}</p>
    <div className="card-stats"><span><b>{c.maxHp}</b> HP</span><span><b>{c.attack}</b> ATQ</span><span><b>{c.defense}</b> DEF</span></div>
    <div className="card-footer"><span>VICTORIAS · BAJAS</span><strong>{c.wins} · {c.kills ?? 0}</strong></div>
  </button>;
}
function MemorialCard({ c }: { c: MemorialCreature }) {
  const symbol = c.kind === "meatball" ? "●" : c.kind === "tomato" ? "🍅" : c.kind === "pasta" ? "〰" : c.kind === "cheese" ? "◆" : c.kind === "mushroom" ? "🍄" : "▧";
  return <article className="roster-card memorial-card"><div className="card-top"><span>✦ LEYENDA CAÍDA</span><span>{c.rarity.toUpperCase()}</span></div><div className="card-creature" style={{ color: c.color }}>{symbol}</div><h3>{c.name}</h3><p>{c.trait}</p><div className="card-stats"><span><b>{c.maxHp}</b> HP</span><span><b>{c.attack}</b> ATQ</span><span><b>{c.defense}</b> DEF</span></div><div className="ability-chip"><strong>✦ {c.abilityName}</strong><span>{c.abilityDescription}</span></div><div className="memorial-details"><span>VICTORIAS <b>{c.wins}</b></span><span>BAJAS <b>{c.kills ?? 0}</b></span><span>DERROTADO POR <b>{c.causeOfDeath}</b></span><span>FECHA <b>{new Date(c.dateOfDeath).toLocaleDateString("es-AR")}</b></span></div></article>;
}
function CreatureRow({ c }: { c: Creature }) {
  const pct = Math.max(0, c.hp / c.maxHp * 100);
  const symbol = c.kind === "meatball" ? "●" : c.kind === "tomato" ? "🍅" : c.kind === "pasta" ? "〰" : c.kind === "cheese" ? "◆" : c.kind === "mushroom" ? "🍄" : "▧";
  return <div className={"creature-row " + c.side + (c.hp <= 0 ? " defeated" : "")}><div className="creature-avatar">{symbol}</div><div className="creature-info"><div className="creature-name">{c.name}<span>{c.hp <= 0 ? "CAÍDO" : c.rarity.toUpperCase()}</span></div><div className="health-track"><i style={{ width: pct + "%" }} /></div><small>{c.hp}/{c.maxHp} HP <b>·</b> ATQ {c.attack} <b>·</b> DEF {c.defense} <b>·</b> {c.abilityName}</small></div></div>;
}
