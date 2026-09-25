/**
 * Core type definitions for the Nim game simulator.
 *
 * The game is Nim [1,3]: two rows with stones.
 * - Row 1 has 1 stone, Row 2 has 3 stones.
 * - Players alternate removing 1..N stones from a single row.
 * - The player who makes the last move (leaving [0,0]) wins.
 * - MAX is the maximising player (first to move), MIN is the minimising player.
 */

export type Player = "MAX" | "MIN";

export type SimulationMode = "minimax" | "alphabeta";

/**
 * A node in the Nim game tree.
 */
export interface NimNode {
  /** Unique identifier (incrementing during tree construction). */
  readonly id: number;
  /** Current stone counts [row1, row2]. */
  state: [number, number];
  /** Which player is to move at this node. */
  player: Player;
  /** Human-readable description of the move that led here. */
  moveDesc: string;
  /** Depth in the tree (root = 0). */
  depth: number;
  /** Child nodes (empty for terminal nodes). */
  children: NimNode[];
  /** True when the game is over (both rows empty). */
  terminal: boolean;
  /** Minimax/alpha-beta value. Set by `minimax()` or `buildEvents()`. */
  value?: number;
  /** Best child chosen by minimax (root-level only). */
  mmChosen?: NimNode;
  /** Marked `true` by alpha-beta pruning simulation. */
  pruned?: boolean;
  /** Layout x-coordinate (assigned by `layout()`). */
  x?: number;
  /** Layout y-coordinate (assigned by `layout()`). */
  y?: number;
}

/**
 * A single event produced during alpha-beta (or minimax) simulation.
 *
 * Events are generated in pre-order traversal. In minimax mode every node
 * is visited. In alpha-beta mode, pruned branches are skipped and marked
 * via `prunedNode` events.
 */
export type EventType = "enter" | "leaf" | "internal" | "prune" | "prunedNode";

export interface SimulationEvent {
  /** Kind of event. */
  type: EventType;
  /** ID of the node this event concerns. */
  id: number;
  /** Alpha bound (only meaningful for `enter` and `internal` events). */
  alpha?: number;
  /** Beta bound (only meaningful for `enter` and `internal` events). */
  beta?: number;
  /** Computed value (for `leaf` and `internal` events). */
  value?: number;
  /** Parent node ID (only for `prune` events — the pruned child). */
  parent?: number;
}
