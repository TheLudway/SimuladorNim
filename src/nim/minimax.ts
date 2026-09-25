/**
 * Pure Minimax algorithm (no pruning).
 *
 * Computes the value of every node in the tree bottom-up and
 * records the best move (`mmChosen`) at each internal node.
 */

import type { NimNode } from "./types";

/**
 * Run minimax on the tree rooted at `node`.
 * Mutates `node.value` and `node.mmChosen` for every node.
 * Returns the minimax value of `node`.
 */
export function minimax(node: NimNode): number {
  if (node.terminal) {
    return node.value ?? 0;
  }

  const childValues = node.children.map(minimax);
  node.value =
    node.player === "MAX"
      ? Math.max(...childValues)
      : Math.min(...childValues);

  // Record which child achieves the value (used for the decision display).
  const idx = childValues.indexOf(node.value);
  node.mmChosen = node.children[idx];

  return node.value;
}
