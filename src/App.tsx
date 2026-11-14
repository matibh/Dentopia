import { useCallback, useEffect, useRef, useState } from "react";
import { Arena } from "./game/Arena";
import { makeTeam, rollDamage, type Creature } from "./game/creatures";

type LogLine = { id: number; text: string; tone: "blue" | "red" | "neutral" };
const initial = () => [...makeTeam("blue"), ...makeTeam("red")];

export default function App() {
  const host = useRef<HTMLDivElement>(null);
  const arena = useRef<Arena | null>(null);
  const [units, setUnits] = useState<Creature[]>(initial);
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [logs, setLogs] = useState<LogLine[]>([{ id: 0, text: "¡La arena está lista! Que comience el duelo.", tone: "neutral" }]);
  const [round, setRound] = useState(0);
  const [winner, setWinner] = useState<string | null>(null);
  const logId = useRef(1);

  useEffect(() => {
    if (!host.current) return;
    const instance = new Arena(host.current);
    arena.current = instance;
    instance.setCreatures(initial());
    return () => { instance.dispose(); arena.current = null; };
  }, []);
  useEffect(() => { arena.current?.updateHealth(units); }, [units]);

  const reset = useCallback(() => {
    const fresh = initial();
    setUnits(fresh);
    arena.current?.setCreatures(fresh);
    setLogs([{ id: logId.current++, text: "Nuevos equipos ingresan a la arena.", tone: "neutral" }]);
    setRound(0);
    setWinner(null);
    setRunning(false);
  }, []);

  useEffect(() => {
    if (!running || winner) return;
    const timer = window.setTimeout(() => {
      const aliveBlue = units.filter(c => c.side === "blue" && c.hp > 0);
      const aliveRed = units.filter(c => c.side === "red" && c.hp > 0);
      if (!aliveBlue.length || !aliveRed.length) {
        setWinner(aliveBlue.length ? "Tu equipo" : "Equipo rival");
        setRunning(false);
        return;
      }
      const attackers = [...aliveBlue, ...aliveRed];
      const attacker = attackers[Math.floor(Math.random() * attackers.length)];
      const opponents = units.filter(c => c.side !== attacker.side && c.hp > 0);
      const target = opponents[Math.floor(Math.random() * opponents.length)];
      const damage = rollDamage(attacker, target);
      const next = units.map(c => c.id === target.id ? { ...c, hp: Math.max(0, c.hp - damage) } : c);
      setUnits(next);
      setRound(r => r + 1);
      const defeated = target.hp - damage <= 0;
      setLogs(old => [{
        id: logId.current++,
        text: defeated ? attacker.name + " derrotó a " + target.name + "." : attacker.name + " golpeó a " + target.name + " por " + damage + " de daño.",
        tone: attacker.side
      }, ...old].slice(0, 8));
      if (defeated) {
        const blueLeft = next.filter(c => c.side === "blue" && c.hp > 0).length;
        const redLeft = next.filter(c => c.side === "red" && c.hp > 0).length;
        if (!blueLeft || !redLeft) {
          setWinner(blueLeft ? "Tu equipo" : "Equipo rival");
          setRunning(false);
        }
      }
    }, 1050 / speed);
    return () => window.clearTimeout(timer);
  }, [running, speed, round, winner, units]);

  const blue = units.filter(c => c.side === "blue");
  const red = units.filter(c => c.side === "red");
  const aliveBlue = blue.filter(c => c.hp > 0).length;
  const aliveRed = red.filter(c => c.hp > 0).length;

  return <main className="app-shell">
    <header className="topbar"><a className="brand" href="#"><span className="brand-mark">D</span><span>DENTOPIA<small>FOOD FIGHTERS ARENA</small></span></a><div className="top-status"><i /> PROTOTIPO 0.1 <span className="status-divider">/</span> COMBATE AUTOMÁTICO</div><div className="profile-dot">✦</div></header>
    <section className="intro"><div><div className="eyebrow">BIENVENIDO A LA ARENA</div><h1>Que empiece<br/><em>el festín.</em></h1><p>Seis criaturas. Dos equipos. Nadie sale igual.</p></div><div className="match-card"><span>ENFRENTAMIENTO</span><strong>3 <b>VS</b> 3</strong><small>ARENA DE PRUEBA · PARTIDA LOCAL</small></div></section>
    <section className="battle-layout">
      <div className="arena-panel"><div className="arena-head"><div><span className="live-dot" /> ARENA CENTRAL</div><span>RONDA {String(round).padStart(2, "0")}</span></div><div className="arena-canvas" ref={host}><div className="arena-vs">VS</div><div className="arena-side-label left">TU ESCUADRÓN</div><div className="arena-side-label right">RIVALES</div></div>
        <div className="arena-controls"><div className="control-copy"><strong>{winner ? winner + " gana." : running ? "Combate en curso" : "Esperando órdenes"}</strong><span>{winner ? "La batalla terminó." : running ? "Las criaturas luchan por su supervivencia." : "Iniciá el combate cuando estés listo."}</span></div><div className="buttons"><button className="secondary-btn" onClick={reset}>REINICIAR</button><button className="primary-btn" onClick={() => winner ? reset() : setRunning(v => !v)}>{winner ? "NUEVA PARTIDA" : running ? "Ⅱ PAUSAR" : "▶ INICIAR"}</button></div></div>
      </div>
      <aside className="side-panel"><div className="panel-title"><span>01 / ESCUADRONES</span><span className="muted">ESTADO EN VIVO</span></div>
        <div className="team-title blue-title"><span>◆ TU EQUIPO</span><b>{aliveBlue}/3 ACTIVOS</b></div>
        {blue.map(c => <CreatureRow key={c.id} c={c} />)}
        <div className="team-title red-title"><span>◆ EQUIPO RIVAL</span><b>{aliveRed}/3 ACTIVOS</b></div>
        {red.map(c => <CreatureRow key={c.id} c={c} />)}
        <div className="log-title">02 / REGISTRO DE BATALLA</div><div className="battle-log">{logs.map(line => <div className={"log-line " + line.tone} key={line.id}><i />{line.text}</div>)}</div>
      </aside>
    </section>
    <footer><span>DENTOPIA © 2026</span><span>RECLUTÁ. COMBATÍ. RECORDÁ.</span><div className="speed-control"><span>VELOCIDAD</span><button className={speed === 1 ? "selected" : ""} onClick={() => setSpeed(1)}>1×</button><button className={speed === 2 ? "selected" : ""} onClick={() => setSpeed(2)}>2×</button></div></footer>
  </main>;
}

function CreatureRow({ c }: { c: Creature }) {
  const pct = Math.max(0, c.hp / c.maxHp * 100);
  const symbol = c.kind === "meatball" ? "●" : c.kind === "tomato" ? "🍅" : c.kind === "pasta" ? "〰" : c.kind === "cheese" ? "◆" : c.kind === "mushroom" ? "🍄" : "▧";
  return <div className={"creature-row " + c.side + (c.hp <= 0 ? " defeated" : "")}><div className="creature-avatar">{symbol}</div><div className="creature-info"><div className="creature-name">{c.name}<span>{c.hp <= 0 ? "CAÍDO" : "NV. 1"}</span></div><div className="health-track"><i style={{ width: pct + "%" }} /></div><small>{c.hp}/{c.maxHp} HP <b>·</b> ATQ {c.attack} <b>·</b> DEF {c.defense}</small></div></div>;
}