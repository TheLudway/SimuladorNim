/**
 * Game-tree construction and layout utilities for the Nim simulator.
 */

import type { NimNode, Player } from "./types";

/* ---------------------------------------------------------------------------
 * Move generation
 * ------------------------------------------------------------------------- */

/** A move: description + resulting state. */
export interface Move {
  moveDesc: string;
  newState: [number, number];
}

/**
 * Generate all legal moves from a given state.
 *
 * From `[a, b]` the player may remove 1..a stones from row 1,
 * or 1..b stones from row 2.
 *
 * The row-1 moves are generated **first**, then row-2 moves, which
 * determines the child ordering used by alpha-beta.
 */
export function generateMoves(state: [number, number]): Move[] {
  const moves: Move[] = [];
  for (let k = 1; k <= state[0]; k++) {
    moves.push({
      moveDesc: `Fila 1, retira ${k}`,
      newState: [state[0] - k, state[1]],
    });
  }
  for (let k = 1; k <= state[1]; k++) {
    moves.push({
      moveDesc: `Fila 2, retira ${k}`,
      newState: [state[0], state[1] - k],
    });
  }
  return moves;
}

/* ---------------------------------------------------------------------------
 * Node-ID counter (reset between independent builds)
 * ------------------------------------------------------------------------- */

let nodeIdCounter = 0;

/** Reset the global node-ID counter (call before building a fresh tree). */
export function resetNodeId(): void {
  nodeIdCounter = 0;
}

const nextNodeId = (): number => nodeIdCounter++;

/* ---------------------------------------------------------------------------
 * Tree construction
 * ------------------------------------------------------------------------- */

/**
 * Recursively build the complete game tree for a Nim position.
 *
 * @param state   Current stone counts [row1, row2].
 * @param player  Player to move at this node.
 * @param moveDesc  Description of the move that reached this node.
 * @param depth   Tree depth (root = 0).
 * @returns A fully constructed tree node (children included).
 */
export function buildTree(
  state: [number, number],
  player: Player,
  moveDesc: string,
  depth: number,
): NimNode {
  const terminal = state[0] === 0 && state[1] === 0;

  const node: NimNode = {
    id: nextNodeId(),
    state: [state[0], state[1]],
    player,
    moveDesc,
    depth,
    children: [],
    terminal,
  };

  if (terminal) {
    // The player to move at a terminal node has no legal move and therefore loses.
    node.value = player === "MAX" ? -1 : 1;
    return node;
  }

  const nextPlayer: Player = player === "MAX" ? "MIN" : "MAX";
  for (const move of generateMoves(state)) {
    node.children.push(
      buildTree(move.newState, nextPlayer, move.moveDesc, depth + 1),
    );
  }

  return node;
}

/* ---------------------------------------------------------------------------
 * Tree queries
 * ------------------------------------------------------------------------- */

/** Collect every node in pre-order traversal. */
export function allNodes(node: NimNode): NimNode[] {
  const nodes: NimNode[] = [];
  collect(node, nodes);
  return nodes;
}

function collect(node: NimNode, acc: NimNode[]): void {
  acc.push(node);
  for (const child of node.children) {
    collect(child, acc);
  }
}

/**
 * Find a node by its ID (pre-order search).
 * Returns `null` when not found.
 */
export function findNode(id: number, node: NimNode): NimNode | null {
  if (node.id === id) return node;
  for (const child of node.children) {
    const found = findNode(id, child);
    if (found) return found;
  }
  return null;
}

/* ---------------------------------------------------------------------------
 * Layout (horizontal positioning for SVG rendering)
 * ------------------------------------------------------------------------- */

const XSPACE = 48;
const YSPACE = 88;
const R = 15;
const MARGIN_X = 40;
const MARGIN_Y = 30;

/** Map a node's layout-x to an SVG pixel coordinate. */
export function px(node: NimNode): number {
  return MARGIN_X + (node.x ?? 0) * XSPACE;
}

/** Map a node's layout-y to an SVG pixel coordinate. */
export function py(node: NimNode): number {
  return MARGIN_Y + (node.y ?? 0) * YSPACE;
}

/** Layout constants (exported for tests). */
export { XSPACE, YSPACE, R, MARGIN_X, MARGIN_Y };

/**
 * Assign x / y coordinates to every node using a standard
 * left-to-right tree layout.
 *
 * Leaves are placed left-to-right; internal nodes are centred
 * above their leftmost and rightmost children.
 */
export function layout(node: NimNode): void {
  let xCounter = 0;
  assignLayout(node, () => xCounter++);
}

function assignLayout(node: NimNode, counter: () => number): void {
  if (node.children.length === 0) {
    node.x = counter();
  } else {
    for (const child of node.children) {
      assignLayout(child, counter);
    }
    const left = node.children[0]!.x!;
    const right = node.children[node.children.length - 1]!.x!;
    node.x = (left + right) / 2;
  }
  node.y = node.depth;
}
