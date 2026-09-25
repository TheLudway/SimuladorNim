/**
 * NimSimulator — React component that visualises the Minimax and
 * Alpha-Beta algorithms on the Nim [1,3] game tree.
 *
 * Logic is split across `src/nim/*` modules which are independently
 * unit-tested. This component only handles React state, rendering,
 * and the interactive controls.
 */

import { useEffect, useRef, useState } from "react";
import { buildTree, resetNodeId, layout } from "../nim/tree";
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
  const [theme, setTheme] = useState<"dark" | "light">("dark");

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

  /* ---- theme management ------------------------------------------- */
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.setAttribute("data-theme", "dark");
    } else {
      root.removeAttribute("data-theme");
    }
  }, [theme]);

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

  const handleThemeToggle = () => {
    setTheme((t) => (t === "dark" ? "light" : "dark"));
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

  /* ---- render ---------------------------------------------------- */
  return (
    <div className="nim-wrap">
      <h1 className="nim-h1">
        Nim [1,3] — Minimax y Poda Alfa‑Beta
      </h1>

      {/* Controls */}
      <div className="nim-panel nim-controls">
        <select
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

        <button
          className="nim-btn-secondary"
          id="nim-theme-toggle"
          onClick={handleThemeToggle}
          title={
            theme === "dark"
              ? "Cambiar a tema claro"
              : "Cambiar a tema oscuro"
          }
        >
          {theme === "dark" ? "☀️ Claro" : "🌙 Oscuro"}
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
        <div id="nim-msg">{info.message}</div>
      </div>

      {/* SVG tree */}
      <div id="nim-svgwrap" className="nim-panel">
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
            Podado
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
