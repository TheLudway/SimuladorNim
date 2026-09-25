/**
 * SVG string generation and side-panel info computation.
 *
 * The SVG is rendered as a string and injected via `dangerouslySetInnerHTML`
 * in the React component, which keeps the rendering logic testable.
 */

import type { NimNode, SimulationEvent, SimulationMode } from "./types";
import { findNode } from "./tree";
import { px, py, R } from "./tree";

export { px, py, R };

/** Collect every node in pre-order (duplicated here to avoid circular import). */
function allNodes(node: NimNode): NimNode[] {
  const nodes: NimNode[] = [];
  collect(node, nodes);
  return nodes;
}

function collect(node: NimNode, acc: NimNode[]): void {
  acc.push(node);
  for (const child of node.children) collect(child, acc);
}

/* ---------------------------------------------------------------------------
 * SVG generation
 * ------------------------------------------------------------------------- */

/**
 * Generate the full SVG string for the tree, with node styling applied
 * based on the current simulation step.
 *
 * @param tree   The game tree (must have layout x/y already assigned).
 * @param events The complete event list (from `buildEvents`).
 * @param step   Index of the current event (0-based).
 */
export function svgTreeWithState(
  tree: NimNode,
  events: SimulationEvent[],
  step: number,
): string {
  const nodes = allNodes(tree);

  let maxX = 0;
  let maxY = 0;
  for (const n of nodes) {
    maxX = Math.max(maxX, px(n));
    maxY = Math.max(maxY, py(n));
  }

  let svg = `<svg viewBox="0 0 ${maxX + 40} ${maxY + 30}" data-tree="true">`;

  // --- edges ---
  for (const n of nodes) {
    for (const c of n.children) {
      svg += `<line x1="${px(n)}" y1="${py(n)}" x2="${px(c)}" y2="${py(c)}" stroke="#444" stroke-width="1.5" data-edge="${c.id}"/>`;
    }
  }

  // --- nodes ---
  const upto = step < events.length ? events.slice(0, step + 1) : events;
  const currentId = step < events.length ? events[step]?.id : undefined;

  for (const n of nodes) {
    const evEntry = upto
      .filter((e) => (e.type === "leaf" || e.type === "internal") && e.id === n.id)
      .pop();
    const pruned = upto.some((e) => e.type === "prunedNode" && e.id === n.id);
    const isCurrent = currentId !== undefined && currentId === n.id;

    const { fill, stroke, strokeWidth, dash } = nodeStyle(n, evEntry, pruned, isCurrent);
    const dashAttr = dash ? ` stroke-dasharray="${dash}"` : "";

    const valText =
      evEntry && evEntry.value !== undefined
        ? evEntry.value > 0
          ? "+1"
          : evEntry.value < 0
            ? "-1"
            : ""
        : "";

    svg += `<g data-node="${n.id}">` +
      `<circle cx="${px(n)}" cy="${py(n)}" r="${R}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"${dashAttr}/>` +
      `<text x="${px(n)}" y="${py(n) + 4}" font-size="9.5" text-anchor="middle" fill="#ddd">${n.state[0]},${n.state[1]}</text>` +
      `<text id="val-${n.id}" x="${px(n)}" y="${py(n) + R + 11}" font-size="9" text-anchor="middle" fill="#3ddc84">${valText}</text>` +
      `</g>`;
  }

  return svg + `</svg>`;
}

interface NodeStyle {
  fill: string;
  stroke: string;
  strokeWidth: string;
  dash?: string;
}

function nodeStyle(
  n: NimNode,
  evEntry: SimulationEvent | undefined,
  pruned: boolean,
  isCurrent: boolean,
): NodeStyle {
  if (pruned) {
    return { fill: "#333", stroke: "#555", strokeWidth: "2", dash: "3,2" };
  }
  if (isCurrent) {
    return { fill: "#444", stroke: "#fff", strokeWidth: "3" };
  }
  if (evEntry) {
    if (n.terminal) {
      return { fill: "#7a5a12", stroke: "#888", strokeWidth: "2" };
    }
    return {
      fill: n.player === "MAX" ? "#1e3a63" : "#5e2323",
      stroke: "#888",
      strokeWidth: "2",
    };
  }
  return { fill: "#2a2e38", stroke: "#555", strokeWidth: "2" };
}

/* ---------------------------------------------------------------------------
 * Side-panel info
 * ------------------------------------------------------------------------- */

export interface RenderInfo {
  state: string;
  player: string;
  alpha: string;
  beta: string;
  message: string;
  showAlphaBeta: boolean;
  step: number;
  total: number;
  isDone: boolean;
  decisionText?: string;
}

/**
 * Compute the side-panel info for the current simulation step.
 */
export function getRenderInfo(
  tree: NimNode,
  events: SimulationEvent[],
  step: number,
  mode: SimulationMode,
): RenderInfo {
  let state = "-";
  let player = "-";
  let alpha = "-";
  let beta = "-";
  let message = "";

  if (step < events.length) {
    const e = events[step]!;
    const n = findNode(e.id, tree);
    if (n) {
      state = `(${n.state[0]},${n.state[1]})`;
      player = n.terminal ? `${n.player} · terminal` : n.player;

      if (e.type === "enter") {
        alpha = e.alpha === -Infinity ? "-∞" : String(e.alpha);
        beta = e.beta === Infinity ? "∞" : String(e.beta);
        message = `Explorando ${state}, turno de ${n.player}.`;
      }
      if (e.type === "leaf") {
        const util =
          e.value !== undefined && e.value > 0 ? "+1 (gana MAX)" : "-1 (gana MIN)";
        message = `Terminal ${state}: utilidad = ${util}.`;
      }
      if (e.type === "internal") {
        const val =
          e.value !== undefined && e.value > 0 ? "+1" : "-1";
        message = `Valor propagado en ${state} (${n.player}): ${val}.`;
      }
      if (e.type === "prune") {
        message = `✂ Poda: la rama hacia (${n.state[0]},${n.state[1]}) no se explora (α ≥ β).`;
      }
    }
  }

  const isDone = step >= events.length - 1;

  let decisionText: string | undefined;
  if (isDone && tree.value !== undefined && tree.mmChosen) {
    const val = tree.value > 0 ? "+1" : "-1";
    decisionText = `Valor Minimax = ${val}. Mejor jugada: ${tree.mmChosen.moveDesc} → estado (${tree.mmChosen.state[0]},${tree.mmChosen.state[1]}).`;
  }

  return {
    state,
    player,
    alpha,
    beta,
    message,
    showAlphaBeta: mode === "alphabeta",
    step: Math.min(step + 1, events.length),
    total: events.length,
    isDone,
    decisionText,
  };
}
