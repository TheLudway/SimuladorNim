import { test, expect, beforeEach } from "bun:test";
import {
  buildTree,
  resetNodeId,
  generateMoves,
  allNodes,
  findNode,
  layout,
  px,
  py,
  XSPACE,
  YSPACE,
  MARGIN_X,
  MARGIN_Y,
} from "./tree";
import type { NimNode, Player } from "./types";

beforeEach(() => {
  resetNodeId();
});

/* ----------------------------------------------------------------------- */
/* generateMoves                                                              */
/* ----------------------------------------------------------------------- */

test("generateMoves returns empty array for [0,0]", () => {
  expect(generateMoves([0, 0])).toEqual([]);
});

test("generateMoves for [1,0] returns one move from row 1", () => {
  expect(generateMoves([1, 0])).toEqual([
    { moveDesc: "Fila 1, retira 1", newState: [0, 0] },
  ]);
});

test("generateMoves for [0,3] returns three moves from row 2", () => {
  expect(generateMoves([0, 3])).toEqual([
    { moveDesc: "Fila 2, retira 1", newState: [0, 2] },
    { moveDesc: "Fila 2, retira 2", newState: [0, 1] },
    { moveDesc: "Fila 2, retira 3", newState: [0, 0] },
  ]);
});

test("generateMoves for [1,3] returns four moves (row 1 first, then row 2)", () => {
  const moves = generateMoves([1, 3]);
  expect(moves).toHaveLength(4);
  expect(moves[0]).toEqual({
    moveDesc: "Fila 1, retira 1",
    newState: [0, 3],
  });
  expect(moves[1]).toEqual({
    moveDesc: "Fila 2, retira 1",
    newState: [1, 2],
  });
  expect(moves[2]).toEqual({
    moveDesc: "Fila 2, retira 2",
    newState: [1, 1],
  });
  expect(moves[3]).toEqual({
    moveDesc: "Fila 2, retira 3",
    newState: [1, 0],
  });
});

/* ----------------------------------------------------------------------- */
/* buildTree                                                                    */
/* ----------------------------------------------------------------------- */

test("buildTree creates a terminal node for [0,0] with MAX losing (value -1)", () => {
  const node = buildTree([0, 0], "MAX", "test", 0);
  expect(node.terminal).toBe(true);
  expect(node.children).toHaveLength(0);
  expect(node.value).toBe(-1);
  expect(node.state).toEqual([0, 0]);
  expect(node.player).toBe("MAX");
  expect(node.id).toBe(0);
});

test("buildTree creates a terminal node for [0,0] with MIN losing (value +1)", () => {
  const node = buildTree([0, 0], "MIN", "test", 0);
  expect(node.terminal).toBe(true);
  expect(node.value).toBe(1);
  expect(node.player).toBe("MIN");
});

test("buildTree root [1,3] MAX has 4 children", () => {
  const root = buildTree([1, 3], "MAX", "Inicio", 0);
  expect(root.state).toEqual([1, 3]);
  expect(root.player).toBe("MAX");
  expect(root.terminal).toBe(false);
  expect(root.depth).toBe(0);
  expect(root.children).toHaveLength(4);
});

test("buildTree root [1,3] children have alternating player MIN", () => {
  const root = buildTree([1, 3], "MAX", "Inicio", 0);
  for (const child of root.children) {
    expect(child.player).toBe("MIN");
    expect(child.depth).toBe(1);
    expect(child.terminal).toBe(false);
  }
});

test("buildTree children of [1,3] have correct states", () => {
  const root = buildTree([1, 3], "MAX", "Inicio", 0);
  const childStates = root.children.map((c) => c.state);
  expect(childStates).toContainEqual([0, 3]);
  expect(childStates).toContainEqual([1, 2]);
  expect(childStates).toContainEqual([1, 1]);
  expect(childStates).toContainEqual([1, 0]);
});

test("buildTree assigns sequential IDs starting from 0", () => {
  resetNodeId();
  const root = buildTree([1, 3], "MAX", "Inicio", 0);
  const nodes = allNodes(root);
  // IDs should be 0, 1, 2, ... in pre-order
  for (let i = 0; i < nodes.length; i++) {
    expect(nodes[i]!.id).toBe(i);
  }
});

test("buildTree for [1,3] produces 28 total nodes", () => {
  const root = buildTree([1, 3], "MAX", "Inicio", 0);
  expect(allNodes(root)).toHaveLength(28);
});

/* ----------------------------------------------------------------------- */
/* allNodes / findNode                                                       */
/* ----------------------------------------------------------------------- */

test("allNodes includes root and all descendants", () => {
  const root = buildTree([1, 3], "MAX", "Inicio", 0);
  const nodes = allNodes(root);
  expect(nodes[0]).toBe(root);
  expect(nodes.length).toBe(28);
});

test("findNode returns the root when searching for root id", () => {
  const root = buildTree([1, 3], "MAX", "Inicio", 0);
  expect(findNode(root.id, root)).toBe(root);
});

test("findNode returns the correct child node", () => {
  const root = buildTree([1, 3], "MAX", "Inicio", 0);
  const firstChild = root.children[0]!;
  expect(findNode(firstChild.id, root)).toBe(firstChild);
});

test("findNode returns null for non-existent id", () => {
  const root = buildTree([1, 3], "MAX", "Inicio", 0);
  expect(findNode(9999, root)).toBeNull();
});

test("findNode finds a deeply nested terminal node", () => {
  const root = buildTree([1, 3], "MAX", "Inicio", 0);
  const nodes = allNodes(root);
  const terminal = nodes.find((n) => n.terminal)!;
  expect(terminal).toBeDefined();
  expect(findNode(terminal.id, root)).toBe(terminal);
});

/* ----------------------------------------------------------------------- */
/* layout                                                                      */
/* ----------------------------------------------------------------------- */

test("layout assigns y = depth to every node", () => {
  const root = buildTree([1, 3], "MAX", "Inicio", 0);
  layout(root);
  const nodes = allNodes(root);
  for (const n of nodes) {
    expect(n.y).toBe(n.depth);
  }
});

test("layout assigns x sequentially to leaves (pre-order)", () => {
  const root = buildTree([1, 3], "MAX", "Inicio", 0);
  layout(root);
  const nodes = allNodes(root);
  const leaves = nodes.filter((n) => n.children.length === 0);
  // Leaves should have strictly increasing x values
  for (let i = 1; i < leaves.length; i++) {
    expect(leaves[i]!.x).toBeGreaterThan(leaves[i - 1]!.x!);
  }
  expect(leaves[0]!.x).toBe(0);
  expect(leaves[leaves.length - 1]!.x).toBe(leaves.length - 1);
});

test("layout assigns internal node x as midpoint of first and last child", () => {
  const root = buildTree([1, 3], "MAX", "Inicio", 0);
  layout(root);
  // Root has 4 children; its x should be the average of the first and last
  const firstChild = root.children[0]!;
  const lastChild = root.children[root.children.length - 1]!;
  expect(root.x).toBeCloseTo((firstChild.x! + lastChild.x!) / 2, 5);
});

test("layout parent x is midpoint of first and last direct children", () => {
  const root = buildTree([1, 3], "MAX", "Inicio", 0);
  layout(root);
  const nodes = allNodes(root);
  const internals = nodes.filter((n) => n.children.length > 0);
  for (const n of internals) {
    const firstChild = n.children[0]!;
    const lastChild = n.children[n.children.length - 1]!;
    expect(n.x).toBeCloseTo((firstChild.x! + lastChild.x!) / 2, 5);
  }
});

test("px and py map layout coordinates to SVG pixels", () => {
  const root = buildTree([1, 3], "MAX", "Inicio", 0);
  layout(root);
  expect(px(root)).toBe(MARGIN_X + (root.x ?? 0) * XSPACE);
  expect(py(root)).toBe(MARGIN_Y + (root.y ?? 0) * YSPACE);
});

/* ----------------------------------------------------------------------- */
/* Combined tree + minimax (sanity)                                          */
/* ----------------------------------------------------------------------- */

test("terminal nodes exist at every depth for [1,3] tree", () => {
  const root = buildTree([1, 3], "MAX", "Inicio", 0);
  const nodes = allNodes(root);
  const terminals = nodes.filter((n) => n.terminal);
  expect(terminals.length).toBeGreaterThan(0);
  for (const t of terminals) {
    expect(t.state).toEqual([0, 0]);
    expect(t.children).toHaveLength(0);
  }
});

test("terminal value is -1 when MAX to move, +1 when MIN to move", () => {
  const root = buildTree([1, 3], "MAX", "Inicio", 0);
  const nodes = allNodes(root);
  const terminals = nodes.filter((n) => n.terminal);
  for (const t of terminals) {
    // Even depth = MAX to move, odd depth = MIN to move
    const expected = t.depth % 2 === 0 ? -1 : 1;
    expect(t.value).toBe(expected);
  }
});
