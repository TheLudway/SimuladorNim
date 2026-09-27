/**
 * NimSimulator — React component that visualises the Minimax and
 * Alpha-Beta algorithms on the Nim [1,3] game tree.
 *
 * Logic is split across `src/nim/*` modules which are independently
 * unit-tested. This component only handles React state, rendering,
 * and the interactive controls.
 */

import { useEffect, useRef, useState } from "react";
import { allNodes, buildTree, findNode, resetNodeId, layout } from "../nim/tree";
import { minimax } from "../nim/minimax";
import { buildEvents } from "../nim/alphabeta";
import { svgTreeWithState, getRenderInfo } from "../nim/svg";
import type { NimNode, SimulationEvent, SimulationMode } from "../nim/types";

import "./NimSimulator.css";

const STEP_INTERVAL_MS = 650;

export function NimSimulator() {
  /* ---- state ------------------------------------------------------- */
  const [tree, setTree] = useState<NimNode | null>(null);
  const [events, setEvents] = useState<SimulationEvent[]>([]);
  const [step, setStep] = useState(0);
  const [mode, setMode] = useState<SimulationMode>("minimax");
  const [autoRunning, setAutoRunning] = useState(false);

  /* ---- refs (avoid stale closures in setInterval) ----------------- */
  const eventsRef = useRef<SimulationEvent[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  eventsRef.current = events;

  /* ---- tree initialisation (once) --------------------------------- */
  useEffect(() => {
    resetNodeId();
    const initialTree = buildTree([1, 3], "MAX", "Inicio", 0);
    layout(initialTree);
    minimax(initialTree);
    setTree(initialTree);
  }, []);

  /* ---- event regeneration when mode changes ----------------------- */
  useEffect(() => {
    if (!tree) return;
    const newEvents = buildEvents(tree, mode);
    setEvents(newEvents);
    setStep(0);
    setAutoRunning(false);
    // Clean up any running timer
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, [mode, tree]);

  /* ---- auto-play effect (depends only on autoRunning) ------------- */
  useEffect(() => {
    if (!autoRunning) return;

    const timer = setInterval(() => {
      setStep((s) => {
        if (s >= eventsRef.current.length - 1) {
          // Reached the end — stop auto-play
          setAutoRunning(false);
          return s;
        }
        return s + 1;
      });
    }, STEP_INTERVAL_MS);

    timerRef.current = timer;

    return () => {
      clearInterval(timer);
      timerRef.current = null;
    };
  }, [autoRunning]);

  /* ---- cleanup timer on unmount ----------------------------------- */
  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  /* ---- event handlers --------------------------------------------- */
  const handleNext = () => {
    if (step < events.length - 1) setStep(step + 1);
  };

  const handlePrev = () => {
    if (step > 0) setStep(step - 1);
  };

  const handleReset = () => {
    if (tree) {
      const newEvents = buildEvents(tree, mode);
      setEvents(newEvents);
      setStep(0);
      setAutoRunning(false);
      if (timerRef.current !== null) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const handleAuto = () => {
    if (autoRunning) {
      setAutoRunning(false);
    } else if (step < events.length - 1) {
      setAutoRunning(true);
    }
  };

  const handleModeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setMode(e.target.value as SimulationMode);
  };

  /* ---- early return ----------------------------------------------- */
  if (!tree) {
    return (
      <div className="nim-wrap">
        <p>Cargando simulador…</p>
      </div>
    );
  }

  /* ---- derived data ----------------------------------------------- */
  const info = getRenderInfo(tree, events, step, mode);
  const svgContent = svgTreeWithState(tree, events, step);
  const isDone = step >= events.length - 1;
  const canNext = step < events.length - 1;
  const canPrev = step > 0;
  const activeNode = step < events.length
    ? findNode(events[step]?.id ?? tree.id, tree)
    : tree;
  const eventsSoFar = step < events.length ? events.slice(0, step + 1) : events;
  const visitedNodes = new Set(
    eventsSoFar
      .filter((event) => event.type === "enter")
      .map((event) => event.id),
  );
  // A node is counted only after its value is produced: leaf or internal.
  // Entering a node is exploration, but it is not evaluation yet.
  const evaluatedNodeCount = new Set(
    eventsSoFar
      .filter((event) => event.type === "leaf" || event.type === "internal")
      .map((event) => event.id),
  ).size;
  const prunedBranches = eventsSoFar.filter((event) => event.type === "prune").length;
  const totalNodes = allNodes(tree).length;

  /* ---- render ---------------------------------------------------- */
  return (
    <div className="nim-wrap">
      <header className="nim-hero">
        <div>
          <p className="nim-kicker">Búsqueda entre adversarios</p>
          <h1 className="nim-h1">Nim <span>[1, 3]</span></h1>
          <p className="nim-subtitle">
            Observa cómo MAX elige su jugada mientras MIN intenta impedir la victoria.
          </p>
        </div>
        <div className={`nim-turn-badge ${activeNode?.player === "MAX" ? "is-max" : "is-min"}`}>
          <span>Turno actual</span>
          <strong>{activeNode?.player ?? "-"}</strong>
        </div>
      </header>

      {/* Controls */}
      <div className="nim-panel nim-controls">
        <label className="nim-mode-label" htmlFor="nim-mode">Algoritmo</label>
        <select
          id="nim-mode"
          className="nim-select"
          value={mode}
          onChange={handleModeChange}
        >
          <option value="minimax">Minimax (sin poda)</option>
          <option value="alphabeta">Alfa‑Beta (con poda)</option>
        </select>

        <button
          className="nim-btn-secondary"
          onClick={handlePrev}
          disabled={!canPrev}
        >
          ◀ Anterior
        </button>
        <button className="nim-btn" onClick={handleNext} disabled={!canNext}>
          Siguiente ▶
        </button>
        <button
          className="nim-btn-secondary"
          onClick={handleAuto}
        >
          {autoRunning ? "⏸ Pausa" : "▶ Auto"}
        </button>
        <button className="nim-btn-secondary" onClick={handleReset}>
          ⟲ Reiniciar
        </button>

      </div>

      {/* Info panel */}
      <div className="nim-panel">
        <div className="nim-info">
          <span>
            <b>Nodo:</b> <span id="nim-curState">{info.state}</span>
          </span>
          <span>
            <b>Turno:</b> <span id="nim-curPlayer">{info.player}</span>
          </span>
          <span
            id="nim-abInfo"
            style={{ display: info.showAlphaBeta ? "inline" : "none" }}
          >
            <b>α:</b> <span id="nim-curA">{info.alpha}</span>&nbsp;{" "}
            <b>β:</b> <span id="nim-curB">{info.beta}</span>
          </span>
          <span>
            <b>Paso:</b> <span id="nim-stepNum">{info.step}</span>/
            <span id="nim-stepTotal">{info.total}</span>
          </span>
        </div>
        <div className="nim-current-state">
          <div>
            <span className="nim-label">Estado en evaluación</span>
            <strong>{info.state}</strong>
          </div>
          <div className="nim-board" aria-label={`Filas con ${activeNode?.state[0] ?? 0} y ${activeNode?.state[1] ?? 0} objetos`}>
            {[activeNode?.state[0] ?? 0, activeNode?.state[1] ?? 0].map((count, row) => (
              <div className="nim-row" key={row}>
                <span>Fila {row + 1}</span>
                <div className="nim-stones">
                  {Array.from({ length: count }, (_, index) => <i key={index} />)}
                  {count === 0 && <em>vacía</em>}
                </div>
                <b>{count}</b>
              </div>
            ))}
          </div>
          <div className="nim-message" id="nim-msg">{info.message}</div>
        </div>
      </div>

      <div className="nim-dashboard">
        <section className="nim-panel nim-moves">
          <div className="nim-section-heading">
            <div>
              <span className="nim-label">Acciones legales</span>
              <h2>Movimientos desde {info.state}</h2>
            </div>
            <span className="nim-count">{activeNode?.children.length ?? 0}</span>
          </div>
          {activeNode?.terminal ? (
            <p className="nim-empty">Estado terminal: no quedan movimientos.</p>
          ) : (
            <div className="nim-move-list">
              {activeNode?.children.map((child) => (
                <div className={`nim-move ${child.pruned ? "is-pruned" : ""}`} key={child.id}>
                  <span className="nim-move-order">{child.pruned ? "✕" : "→"}</span>
                  <span>{child.moveDesc}<small>[{child.state.join(", ")}]</small></span>
                  <b>{child.pruned ? "podado" : visitedNodes.has(child.id) && child.value !== undefined ? (child.value > 0 ? "+1" : "-1") : "pendiente"}</b>
                </div>
              ))}
            </div>
          )}
        </section>
        <section className="nim-panel nim-metrics">
          <div className="nim-section-heading"><h2>Progreso del análisis</h2><span className="nim-mode-chip">{mode === "minimax" ? "MINIMAX" : "ALFA-BETA"}</span></div>
          <div className="nim-stat-grid">
            <div>
              <strong>{evaluatedNodeCount}</strong>
              <span>nodos evaluados</span>
              <small>{evaluatedNodeCount} de {totalNodes}</small>
            </div>
            <div><strong>{mode === "alphabeta" ? prunedBranches : 0}</strong><span>ramas podadas</span></div>
            <div><strong>{totalNodes}</strong><span>nodos del árbol</span></div>
          </div>
          <p className="nim-metric-note">{mode === "alphabeta" ? "Las ramas con ✕ se descartan cuando α ≥ β." : "Minimax recorre todo el árbol: ninguna rama se descarta."}</p>
        </section>
      </div>

      {/* SVG tree */}
      <div id="nim-svgwrap" className="nim-panel">
        <div className="nim-tree-heading"><h2>Árbol de juego</h2><span>Izquierda → derecha · Fila 1 antes que Fila 2</span></div>
        <div dangerouslySetInnerHTML={{ __html: svgContent }} />
      </div>

      {/* Legend */}
      <div className="nim-panel">
        <div className="nim-legend">
          <span>
            <span className="nim-dot" style={{ background: "var(--max)" }} />
            MAX
          </span>
          <span>
            <span className="nim-dot" style={{ background: "var(--min)" }} />
            MIN
          </span>
          <span>
            <span className="nim-dot" style={{ background: "var(--term)" }} />
            Terminal
          </span>
          <span>
            <span className="nim-dot" style={{ background: "var(--pruned)" }} />
            Podado / no evaluado
          </span>
        </div>
      </div>

      {/* Result panel */}
      <div
        className="nim-panel"
        id="nim-resultPanel"
        style={{ display: isDone ? "block" : "none" }}
      >
        <b>Decisión óptima de MAX:</b>{" "}
        <span id="nim-decisionText">{info.decisionText ?? ""}</span>
      </div>
    </div>
  );
}
