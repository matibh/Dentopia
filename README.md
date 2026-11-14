# DENTOPIA

**Un mundo de criaturas comestibles. Una arena. Consecuencias permanentes.**

DENTOPIA es un juego de colección y combate automático. Reclutá criaturas inspiradas en alimentos —albóndigas, tomates, pastas, quesos, hongos y ravioles— y elegí tres campeones para luchar en equipos de **3 contra 3**.

## Prototipo 0.2 — Reclutamiento y escuadrón

- Reclutamiento de criaturas generadas con estadísticas variables.
- Rarezas: común, raro y épico.
- Rasgos individuales y nombres de criatura.
- Colección persistente en el navegador mediante localStorage.
- Selección de tres criaturas para formar el escuadrón.
- Rivales generados automáticamente para cada combate.
- Arena 3D procedural con Three.js.
- Combate automático con puntos de vida, daño, derrotas y registro.
- Victorias individuales registradas en cada criatura superviviente.
- Pausa, velocidad 1× / 2× y reinicio del enfrentamiento.
- Interfaz adaptable a escritorio y móvil.

> La colección y el Archivo de Leyendas se guardan en el navegador actual. La sincronización entre dispositivos todavía está pendiente.

## Tecnología

- React + TypeScript
- Three.js
- Vite

## Ejecutar localmente

```bash
npm install
npm run dev
```

Compilar para producción:

```bash
npm run build
```

**Reclutá. Combatí. Recordá.**


## Creature abilities

Each food species has a unique passive combat ability: Meatball reduces incoming damage, Tomato punishes weakened rivals, Pasta can trigger a stronger lash, Cheese has a tougher crust, Mushroom can trigger bonus spore damage, and Ravioli can unleash a high-variance surprise strike. Permanent deaths are recorded in the local Archivo de Leyendas, including the actual final opponent when available.

## Progresión individual

- Las criaturas supervivientes ganan experiencia al terminar cada combate.
- La victoria y las bajas conseguidas otorgan experiencia adicional.
- Cada nivel aumenta la vida máxima y el ataque; cada tercer nivel también aumenta la defensa.
- El coste para subir de nivel aumenta progresivamente.
- Las bajas, los combates y el nivel alcanzado se conservan en el Archivo de Leyendas.
