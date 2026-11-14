import { useCallback, useEffect, useRef, useState } from "react";
import { Arena } from "./game/Arena";
import { recruitCreature, rollDamage, type Creature } from "./game/creatures";

type LogLine = { id: number; text: string; tone: "blue" | "red" | "neutral" };
const STORAGE_KEY = "dentopia-roster-v1";
function loadRoster(): Creature[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved) as Creature[];
  } catch { /* start with a fresh roster */ }
  return Array.from({ length: 6 }, () => recruitCreature());
}
const saveRoster = (roster: Creature[]) => localStorage.setItem(STORAGE_KEY, JSON.stringify(roster));

export default function App() {
  const host = useRef<HTMLDivElement>(null);
  const arena = useRef<Arena | null>(null);
  const [roster, setRoster] = useState<Creature[]>(loadRoster);
  const [selected, setSelected] = useState<string[]>(() => loadRoster().slice(0, 3).map(c => c.id));
  const [battleUnits, setBattleUnits] = useState<Creature[]>([]);
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [logs, setLogs] = useState<LogLine[]>([{ id: 0, text: "Tu escuadrón espera nuevas órdenes.", tone: "neutral" }]);
  const [round, setRound] = useState(0);
  const [winner, setWinner] = useState<string | null>(null);
  const [tab, setTab] = useState<"roster" | "arena">("roster");
  const logId = useRef(1);

  useEffect(() => { saveRoster(roster); }, [roster]);
  useEffect(() => {
    if (!host.current) return;
    const instance = new Arena(host.current);
    arena.current = instance;
    return () => { instance.dispose(); arena.current = null; };
  }, []);
  useEffect(() => { if (battleUnits.length) arena.current?.setCreatures(battleUnits); }, [battleUnits.length > 0]);
  useEffect(() => { if (battleUnits.length) arena.current?.updateHealth(battleUnits); }, [battleUnits]);

  const recruit = () => {
    const fresh = recruitCreature();
    setRoster(old => [...old, fresh]);
    setLogs(old => [{ id: logId.current++, text: fresh.name + " se unió a Dentopia.", tone: "neutral" }, ...old].slice(0, 8));
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
      const next = battleUnits.map(c => c.id === target.id ? { ...c, hp: Math.max(0, c.hp - damage) } : c);
      setBattleUnits(next); setRound(r => r + 1);
      const defeated = target.hp - damage <= 0;
      setLogs(old => [{ id: logId.current++, text: defeated ? attacker.name + " derrotó a " + target.name + "." : attacker.name + " golpeó a " + target.name + " por " + damage + " de daño.", tone: attacker.side }, ...old].slice(0, 8));
      const blueLeft = next.filter(c => c.side === "blue" && c.hp > 0).length;
      const redLeft = next.filter(c => c.side === "red" && c.hp > 0).length;
      if (!blueLeft || !redLeft) {
        const won = blueLeft > 0;
        setWinner(won ? "¡Victoria!" : "Derrota"); setRunning(false);
        if (won) {
          const survivors = new Set(next.filter(c => c.side === "blue" && c.hp > 0).map(c => c.id));
          setRoster(old => old.map(c => survivors.has(c.id) ? { ...c, wins: c.wins + 1 } : c));
        }
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
    <nav className="game-tabs"><button className={tab === "roster" ? "active" : ""} onClick={() => setTab("roster")}>01 / RECLUTAMIENTO Y COLECCIÓN</button><button className={tab === "arena" ? "active" : ""} onClick={() => setTab("arena")}>02 / ARENA DE COMBATE</button></nav>
    {tab === "roster" ? <section className="roster-screen">
      <div className="roster-heading"><div><span className="eyebrow">ELIGE A TUS CAMPEONES</span><h2>Tu escuadrón <em>({selected.length}/3)</em></h2><p>Seleccioná hasta tres criaturas. Cada una tiene atributos y rareza propios.</p></div><button className="primary-btn recruit-btn" onClick={recruit}>＋ RECLUTAR CRIATURA</button></div>
      <div className="roster-grid">{roster.map(c => <CreatureCard key={c.id} c={c} selected={selected.includes(c.id)} onClick={() => toggleSelected(c.id)} />)}</div>
      <div className="roster-bottom"><div><strong>{activeRoster.length === 3 ? "Escuadrón listo para luchar" : "Tu escuadrón necesita tres criaturas"}</strong><span>{activeRoster.map(c => c.name).join(" · ") || "Todavía no seleccionaste a nadie"}</span></div><button className="primary-btn" disabled={selected.length !== 3} onClick={startBattle}>⚔ ENTRAR A LA ARENA</button></div>
    </section> : <section className="battle-layout">
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
    <div className="card-footer"><span>VICTORIAS</span><strong>{c.wins}</strong></div>
  </button>;
}
function CreatureRow({ c }: { c: Creature }) {
  const pct = Math.max(0, c.hp / c.maxHp * 100);
  const symbol = c.kind === "meatball" ? "●" : c.kind === "tomato" ? "🍅" : c.kind === "pasta" ? "〰" : c.kind === "cheese" ? "◆" : c.kind === "mushroom" ? "🍄" : "▧";
  return <div className={"creature-row " + c.side + (c.hp <= 0 ? " defeated" : "")}><div className="creature-avatar">{symbol}</div><div className="creature-info"><div className="creature-name">{c.name}<span>{c.hp <= 0 ? "CAÍDO" : c.rarity.toUpperCase()}</span></div><div className="health-track"><i style={{ width: pct + "%" }} /></div><small>{c.hp}/{c.maxHp} HP <b>·</b> ATQ {c.attack} <b>·</b> DEF {c.defense}</small></div></div>;
}
