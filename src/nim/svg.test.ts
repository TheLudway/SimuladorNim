import { test, expect, beforeEach } from "bun:test";
import { buildTree, resetNodeId, layout, allNodes } from "./tree";
import { minimax } from "./minimax";
import { buildEvents } from "./alphabeta";
import { svgTreeWithState, getRenderInfo } from "./svg";
import type { NimNode } from "./types";

beforeEach(() => {
  resetNodeId();
});

function makeFullTree(): NimNode {
  const root = buildTree([1, 3], "MAX", "Inicio", 0);
  layout(root);
  minimax(root);
  return root;
}

/* ----------------------------------------------------------------------- */
/* SVG generation                                                             */
/* ----------------------------------------------------------------------- */

test("svgTreeWithState returns a valid SVG string", () => {
  const tree = makeFullTree();
  const events = buildEvents(tree, "minimax");
  const svg = svgTreeWithState(tree, events, 0);

  expect(svg).toContain("<svg");
  expect(svg).toContain("</svg>");
  expect(svg).toContain('viewBox="0 0');
});

test("svgTreeWithState includes all nodes as circles", () => {
  const tree = makeFullTree();
  const events = buildEvents(tree, "minimax");
  const svg = svgTreeWithState(tree, events, 0);

  const nodes = allNodes(tree);
  for (const n of nodes) {
    expect(svg).toContain(`data-node="${n.id}"`);
  }
});

test("svgTreeWithState includes state labels (row1,row2)", () => {
  const tree = makeFullTree();
  const events = buildEvents(tree, "minimax");
  const svg = svgTreeWithState(tree, events, events.length - 1);

  // The root should display "1,3"
  expect(svg).toContain(">1,3<");
});

test("svgTreeWithState includes edges between parent and child", () => {
  const tree = makeFullTree();
  const events = buildEvents(tree, "minimax");
  const svg = svgTreeWithState(tree, events, 0);

  // There should be at least one edge
  expect(svg).toContain('stroke="#444"');
  expect(svg).toContain('data-edge=');
});

test("svgTreeWithState highlights current node with white stroke", () => {
  const tree = makeFullTree();
  const events = buildEvents(tree, "minimax");
  const svg = svgTreeWithState(tree, events, 0);

  const firstEventId = events[0]!.id;
  const currentGroup = svg.match(
    new RegExp(`data-node="${firstEventId}"[^]*?stroke-width="3"`),
  );
  expect(currentGroup).not.toBeNull();
});

test("svgTreeWithState marks pruned nodes with dashed stroke", () => {
  const tree = makeFullTree();
  const events = buildEvents(tree, "alphabeta");
  const svg = svgTreeWithState(tree, events, events.length - 1);

  // Find pruned nodes
  const prunedIds = new Set(
    events.filter((e) => e.type === "prunedNode").map((e) => e.id),
  );
  expect(prunedIds.size).toBeGreaterThan(0);

  // Each pruned node should have stroke-dasharray="3,2"
  for (const id of prunedIds) {
    const group = svg.match(
      new RegExp(`data-node="${id}"[^]*?stroke-dasharray="3,2"`),
    );
    expect(group).not.toBeNull();
  }
});

test("svgTreeWithState shows +1 or -1 for visited terminal nodes", () => {
  const tree = makeFullTree();
  const events = buildEvents(tree, "minimax");
  // At the end, all nodes should have values displayed
  const svg = svgTreeWithState(tree, events, events.length - 1);

  // Should contain either +1 or -1
  expect(svg).toContain("+1");
  expect(svg).toContain("-1");
});

/* ----------------------------------------------------------------------- */
/* RenderInfo                                                                 */
/* ----------------------------------------------------------------------- */

test("getRenderInfo shows correct message for enter event", () => {
  const tree = makeFullTree();
  const events = buildEvents(tree, "minimax");
  const info = getRenderInfo(tree, events, 0, "minimax");

  expect(info.message).toContain("Explorando");
  expect(info.message).toContain("(1,3)");
});

test("getRenderInfo shows correct message for leaf event", () => {
  const tree = makeFullTree();
  const events = buildEvents(tree, "minimax");
  const leafEvent = events.find((e) => e.type === "leaf")!;
  const step = events.indexOf(leafEvent);
  const info = getRenderInfo(tree, events, step, "minimax");

  expect(info.message).toContain("Terminal");
  expect(info.message).toContain("utilidad");
});

test("getRenderInfo shows correct message for internal event", () => {
  const tree = makeFullTree();
  const events = buildEvents(tree, "minimax");
  const internalEvent = events.find((e) => e.type === "internal")!;
  const step = events.indexOf(internalEvent);
  const info = getRenderInfo(tree, events, step, "minimax");

  expect(info.message).toContain("Valor propagado");
});

test("getRenderInfo shows prune message for prune event", () => {
  const tree = makeFullTree();
  const events = buildEvents(tree, "alphabeta");
  const pruneEvent = events.find((e) => e.type === "prune")!;
  const step = events.indexOf(pruneEvent);
  const info = getRenderInfo(tree, events, step, "alphabeta");

  expect(info.message).toContain("Poda");
  expect(info.message).toContain("α ≥ β");
});

test("getRenderInfo shows alpha-beta values for enter events in alphabeta mode", () => {
  const tree = makeFullTree();
  const events = buildEvents(tree, "alphabeta");
  const info = getRenderInfo(tree, events, 0, "alphabeta");

  expect(info.showAlphaBeta).toBe(true);
  expect(info.alpha).not.toBe("-");
  expect(info.beta).not.toBe("-");
});

test("getRenderInfo hides alpha-beta for minimax mode", () => {
  const tree = makeFullTree();
  const events = buildEvents(tree, "minimax");
  const info = getRenderInfo(tree, events, 0, "minimax");

  expect(info.showAlphaBeta).toBe(false);
});

test("getRenderInfo shows step count correctly", () => {
  const tree = makeFullTree();
  const events = buildEvents(tree, "minimax");
  const info = getRenderInfo(tree, events, 0, "minimax");

  expect(info.step).toBe(1);
  expect(info.total).toBe(events.length);
});

test("getRenderInfo isDone is true at last step", () => {
  const tree = makeFullTree();
  const events = buildEvents(tree, "minimax");
  const info = getRenderInfo(tree, events, events.length - 1, "minimax");

  expect(info.isDone).toBe(true);
});

test("getRenderInfo includes decisionText when done", () => {
  const tree = makeFullTree();
  const events = buildEvents(tree, "minimax");
  const info = getRenderInfo(tree, events, events.length - 1, "minimax");

  expect(info.decisionText).toBeDefined();
  expect(info.decisionText).toContain("Valor Minimax");
  expect(info.decisionText).toContain("Mejor jugada");
  expect(info.decisionText).toContain("(1,1)");
});

test("getRenderInfo returns default values when step is out of range", () => {
  const tree = makeFullTree();
  const events = buildEvents(tree, "minimax");
  const info = getRenderInfo(tree, events, events.length + 100, "minimax");

  expect(info.state).toBe("-");
  expect(info.player).toBe("-");
  expect(info.message).toBe("");
});

test("getRenderInfo step never exceeds total", () => {
  const tree = makeFullTree();
  const events = buildEvents(tree, "minimax");
  const info = getRenderInfo(tree, events, events.length + 100, "minimax");

  expect(info.step).toBe(events.length);
});
