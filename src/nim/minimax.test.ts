import { test, expect, beforeEach } from "bun:test";
import { buildTree, resetNodeId, allNodes } from "./tree";
import { minimax } from "./minimax";
import type { NimNode } from "./types";

beforeEach(() => {
  resetNodeId();
});

function makeStandardTree(): NimNode {
  return buildTree([1, 3], "MAX", "Inicio", 0);
}

/* ----------------------------------------------------------------------- */
/* Root-level results for Nim [1,3]                                            */
/* ----------------------------------------------------------------------- */

test("minimax root value is +1 (MAX wins from [1,3])", () => {
  const root = makeStandardTree();
  const value = minimax(root);
  expect(value).toBe(1);
  expect(root.value).toBe(1);
});

test("minimax root mmChosen leads to state [1,1]", () => {
  const root = makeStandardTree();
  minimax(root);
  expect(root.mmChosen).toBeDefined();
  expect(root.mmChosen!.state).toEqual([1, 1]);
});

test("minimax root mmChosen moveDesc mentions row 2 and removing 2", () => {
  const root = makeStandardTree();
  minimax(root);
  expect(root.mmChosen!.moveDesc).toContain("Fila 2");
  expect(root.mmChosen!.moveDesc).toContain("2");
});

/* ----------------------------------------------------------------------- */
/* Terminal node values                                                      */
/* ----------------------------------------------------------------------- */

test("terminal nodes with MAX to move have value -1", () => {
  const root = makeStandardTree();
  minimax(root);
  const nodes = allNodes(root);
  const terminals = nodes.filter((n) => n.terminal);
  for (const t of terminals) {
    if (t.player === "MAX") {
      expect(t.value).toBe(-1);
    }
    if (t.player === "MIN") {
      expect(t.value).toBe(1);
    }
  }
});

/* ----------------------------------------------------------------------- */
/* Internal node values                                                      */
/* ----------------------------------------------------------------------- */

test("minimax sets value on every non-terminal node", () => {
  const root = makeStandardTree();
  minimax(root);
  const nodes = allNodes(root);
  for (const n of nodes) {
    expect(n.value).toBeDefined();
    expect(n.value).toBe(n.value! === 1 ? 1 : -1);
  }
});

test("minimax sets mmChosen on every non-terminal node", () => {
  const root = makeStandardTree();
  minimax(root);
  const nodes = allNodes(root);
  const internals = nodes.filter((n) => !n.terminal);
  for (const n of internals) {
    expect(n.mmChosen).toBeDefined();
    expect(n.children).toContain(n.mmChosen!);
  }
});

test("MAX node value is the max of children values", () => {
  const root = makeStandardTree();
  minimax(root);
  const nodes = allNodes(root);
  const maxNodes = nodes.filter((n) => !n.terminal && n.player === "MAX");
  for (const n of maxNodes) {
    const childVals = n.children.map((c) => c.value!);
    expect(n.value).toBe(Math.max(...childVals));
  }
});

test("MIN node value is the min of children values", () => {
  const root = makeStandardTree();
  minimax(root);
  const nodes = allNodes(root);
  const minNodes = nodes.filter((n) => !n.terminal && n.player === "MIN");
  for (const n of minNodes) {
    const childVals = n.children.map((c) => c.value!);
    expect(n.value).toBe(Math.min(...childVals));
  }
});

/* ----------------------------------------------------------------------- */
/* Specific value checks for key nodes                                       */
/* ----------------------------------------------------------------------- */

test("node [1,1] with MIN to move has value +1 (Nim-sum 0 is losing for mover)", () => {
  const root = makeStandardTree();
  minimax(root);
  const nodes = allNodes(root);
  const node11 = nodes.find((n) => n.state[0] === 1 && n.state[1] === 1 && n.player === "MIN");
  expect(node11).toBeDefined();
  // [1,1] with MIN to move: Nim-sum = 0, MIN loses → value = +1
  expect(node11!.value).toBe(1);
});

test("node [0,0] with MAX to move has value -1 (MAX loses)", () => {
  const root = makeStandardTree();
  minimax(root);
  const nodes = allNodes(root);
  const terminalMax = nodes.find(
    (n) => n.state[0] === 0 && n.state[1] === 0 && n.player === "MAX" && n.terminal,
  );
  expect(terminalMax).toBeDefined();
  expect(terminalMax!.value).toBe(-1);
});

test("node [0,0] with MIN to move has value +1 (MIN loses → MAX wins)", () => {
  const root = makeStandardTree();
  minimax(root);
  const nodes = allNodes(root);
  const terminalMin = nodes.find(
    (n) => n.state[0] === 0 && n.state[1] === 0 && n.player === "MIN" && n.terminal,
  );
  expect(terminalMin).toBeDefined();
  expect(terminalMin!.value).toBe(1);
});

/* ----------------------------------------------------------------------- */
/* Idempotency                                                               */
/* ----------------------------------------------------------------------- */

test("calling minimax twice produces the same result", () => {
  const root = makeStandardTree();
  minimax(root);
  const firstVal = root.value;
  const firstChosen = root.mmChosen;
  minimax(root);
  expect(root.value).toBe(firstVal);
  expect(root.mmChosen).toBe(firstChosen);
});
