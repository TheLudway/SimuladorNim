/**
 * Alpha-beta search with event generation for step-by-step simulation.
 *
 * In `minimax` mode the search visits every node (same as plain minimax
 * but with event generation so the UI can step through).
 * In `alphabeta` mode, branches are pruned when α ≥ β and the
 * pruned children are marked so the visualization can grey them out.
 */

import type { NimNode, SimulationEvent, SimulationMode } from "./types";

/** Reset the `pruned` flag on every node (idempotent). */
function clearPruned(node: NimNode): void {
  node.pruned = false;
  for (const child of node.children) {
    clearPruned(child);
  }
}

/** Recursively mark a node and all its descendants as pruned. */
function markPruned(node: NimNode, events: SimulationEvent[]): void {
  node.pruned = true;
  events.push({ type: "prunedNode", id: node.id });
  for (const child of node.children) {
    markPruned(child, events);
  }
}

/**
 * Run alpha-beta search and return the ordered list of simulation events.
 *
 * The tree's `pruned` flags are also set as a side-effect.
 */
export function buildEvents(
  tree: NimNode,
  mode: SimulationMode,
): SimulationEvent[] {
  const events: SimulationEvent[] = [];
  clearPruned(tree);

  function ab(
    node: NimNode,
    alpha: number,
    beta: number,
  ): number {
    events.push({ type: "enter", id: node.id, alpha, beta });

    if (node.terminal) {
      events.push({ type: "leaf", id: node.id, value: node.value });
      return node.value ?? 0;
    }

    let value = node.player === "MAX" ? -Infinity : Infinity;

    for (let i = 0; i < node.children.length; i++) {
      const child = node.children[i]!;

      // Pruning check (alpha-beta only)
      if (mode === "alphabeta" && alpha >= beta) {
        events.push({ type: "prune", id: child.id, parent: node.id });
        markPruned(child, events);
        continue;
      }

      const v = ab(child, alpha, beta);

      value =
        node.player === "MAX"
          ? Math.max(value, v)
          : Math.min(value, v);

      if (mode === "alphabeta") {
        if (node.player === "MAX") {
          alpha = Math.max(alpha, value);
        } else {
          beta = Math.min(beta, value);
        }
      }
    }

    events.push({ type: "internal", id: node.id, value, alpha, beta });
    return value;
  }

  ab(tree, -Infinity, Infinity);
  return events;
}
