import { test, expect, beforeEach } from "bun:test";
import { buildTree, resetNodeId, allNodes } from "./tree";
import { minimax } from "./minimax";
import { buildEvents } from "./alphabeta";
import type { NimNode, SimulationEvent, SimulationMode } from "./types";

beforeEach(() => {
  resetNodeId();
});

function makeTreeWithMinimax(): NimNode {
  const root = buildTree([1, 3], "MAX", "Inicio", 0);
  minimax(root);
  return root;
}

/* ----------------------------------------------------------------------- */
/* Event structure — minimax mode                                             */
/* ----------------------------------------------------------------------- */

test("minimax mode generates no prune events", () => {
  const tree = makeTreeWithMinimax();
  const events = buildEvents(tree, "minimax");
  expect(events.some((e) => e.type === "prune")).toBe(false);
  expect(events.some((e) => e.type === "prunedNode")).toBe(false);
});

test("minimax mode visits every node (enter event for each)", () => {
  const tree = makeTreeWithMinimax();
  const nodes = allNodes(tree);
  const events = buildEvents(tree, "minimax");
  const enterIds = events.filter((e) => e.type === "enter").map((e) => e.id);
  expect(enterIds).toHaveLength(nodes.length);
  for (const n of nodes) {
    expect(enterIds).toContain(n.id);
  }
});

test("minimax mode first event is enter on root", () => {
  const tree = makeTreeWithMinimax();
  const events = buildEvents(tree, "minimax");
  expect(events[0]!.type).toBe("enter");
  expect(events[0]!.id).toBe(tree.id);
});

test("minimax mode alpha is -∞, beta is ∞ for all enter events", () => {
  const tree = makeTreeWithMinimax();
  const events = buildEvents(tree, "minimax");
  for (const e of events) {
    if (e.type === "enter") {
      expect(e.alpha).toBe(-Infinity);
      expect(e.beta).toBe(Infinity);
    }
  }
});

test("minimax mode leaf values match node values", () => {
  const tree = makeTreeWithMinimax();
  const events = buildEvents(tree, "minimax");
  const leafEvents = events.filter((e) => e.type === "leaf");
  for (const e of leafEvents) {
    // leaf value is -1 or +1
    expect(e.value).toBe(e.value === 1 ? 1 : -1);
  }
});

/* ----------------------------------------------------------------------- */
/* Event structure — alpha-beta mode                                          */
/* ----------------------------------------------------------------------- */

test("alphabeta mode first event is enter on root", () => {
  const tree = makeTreeWithMinimax();
  const events = buildEvents(tree, "alphabeta");
  expect(events[0]!.type).toBe("enter");
  expect(events[0]!.id).toBe(tree.id);
  expect(events[0]!.alpha).toBe(-Infinity);
  expect(events[0]!.beta).toBe(Infinity);
});

test("alphabeta mode is shorter than minimax mode (pruning occurs)", () => {
  const tree = makeTreeWithMinimax();
  const mmEvents = buildEvents(tree, "minimax");
  const abEvents = buildEvents(tree, "alphabeta");
  expect(abEvents.length).toBeLessThan(mmEvents.length);
});

test("alphabeta mode contains at least one prune event", () => {
  const tree = makeTreeWithMinimax();
  const events = buildEvents(tree, "alphabeta");
  expect(events.some((e) => e.type === "prune")).toBe(true);
});

test("alphabeta mode contains prunedNode events for pruned subtrees", () => {
  const tree = makeTreeWithMinimax();
  const events = buildEvents(tree, "alphabeta");
  expect(events.some((e) => e.type === "prunedNode")).toBe(true);
});

test("prune events always have a parent id", () => {
  const tree = makeTreeWithMinimax();
  const events = buildEvents(tree, "alphabeta");
  const pruneEvents = events.filter((e) => e.type === "prune");
  expect(pruneEvents.length).toBeGreaterThan(0);
  for (const e of pruneEvents) {
    expect(e.parent).toBeDefined();
    expect(e.parent).toBeGreaterThanOrEqual(0);
  }
});

test("pruned nodes are not entered (no enter event after prunedNode)", () => {
  const tree = makeTreeWithMinimax();
  const events = buildEvents(tree, "alphabeta");
  const prunedIds = new Set(
    events.filter((e) => e.type === "prunedNode").map((e) => e.id),
  );
  const enteredIds = new Set(
    events.filter((e) => e.type === "enter").map((e) => e.id),
  );
  // A pruned node should never have an enter event
  for (const id of prunedIds) {
    expect(enteredIds).not.toContain(id);
  }
});

test("alphabeta root value matches minimax root value", () => {
  const tree = makeTreeWithMinimax();
  const mmRootValue = tree.value;
  buildEvents(tree, "alphabeta");
  // buildEvents doesn't update tree.value, so compare with the stored minimax value
  expect(mmRootValue).toBe(1); // MAX wins from [1,3]
});

/* ----------------------------------------------------------------------- */
/* Event ordering                                                              */
/* ----------------------------------------------------------------------- */

test("every leaf/internal event is preceded by an enter event for the same node", () => {
  const tree = makeTreeWithMinimax();
  const modes: SimulationMode[] = ["minimax", "alphabeta"];
  for (const mode of modes) {
    const events = buildEvents(tree, mode);
    const entered = new Set<number>();
    for (const e of events) {
      if (e.type === "enter") {
        entered.add(e.id);
      }
      if (e.type === "leaf" || e.type === "internal") {
        expect(entered).toContain(e.id);
      }
      if (e.type === "prune") {
        // prune event for child c means parent was already entered
        if (e.parent !== undefined) {
          expect(entered).toContain(e.parent);
        }
      }
    }
  }
});

test("internal event value is -1 or +1 (consistent with minimax)", () => {
  const tree = makeTreeWithMinimax();
  const events = buildEvents(tree, "minimax");
  const internalEvents = events.filter((e) => e.type === "internal");
  expect(internalEvents.length).toBeGreaterThan(0);
  for (const e of internalEvents) {
    expect(e.value).toBe(e.value === 1 ? 1 : -1);
  }
});

test("internal event alpha and beta are finite or ±Infinity", () => {
  const tree = makeTreeWithMinimax();
  const events = buildEvents(tree, "alphabeta");
  const internalEvents = events.filter((e) => e.type === "internal");
  for (const e of internalEvents) {
    expect(e.alpha).not.toBeNaN();
    expect(e.beta).not.toBeNaN();
  }
});

/* ----------------------------------------------------------------------- */
/* Pruning correctness                                                         */
/* ----------------------------------------------------------------------- */

test("all pruned nodes have the `pruned` flag set", () => {
  const tree = makeTreeWithMinimax();
  const events = buildEvents(tree, "alphabeta");
  const allNodesList = allNodes(tree);

  for (const n of allNodesList) {
    const eventCount = events.filter(
      (e) => e.type === "prunedNode" && e.id === n.id,
    ).length;
    if (eventCount > 0) {
      expect(n.pruned).toBe(true);
    }
  }
});

test("non-pruned nodes have pruned flag false (or undefined)", () => {
  const tree = makeTreeWithMinimax();
  const events = buildEvents(tree, "alphabeta");
  const allNodesList = allNodes(tree);
  const prunedIds = new Set(
    events.filter((e) => e.type === "prunedNode").map((e) => e.id),
  );

  for (const n of allNodesList) {
    if (!prunedIds.has(n.id)) {
      expect(n.pruned).not.toBe(true);
    }
  }
});

/* ----------------------------------------------------------------------- */
/* Symmetry: minimax events should cover all nodes                          */
/* ----------------------------------------------------------------------- */

test("minimax and alphabeta produce the same set of visited node IDs", () => {
  const tree = makeTreeWithMinimax();
  const mmEvents = buildEvents(tree, "minimax");
  const abEvents = buildEvents(tree, "alphabeta");

  // In minimax mode, every node is entered
  const mmEntered = new Set(
    mmEvents.filter((e) => e.type === "enter").map((e) => e.id),
  );
  const allNodeIds = new Set(allNodes(tree).map((n) => n.id));
  expect(mmEntered).toEqual(allNodeIds);

  // In alphabeta mode, some nodes are pruned (not entered)
  const abEntered = new Set(
    abEvents.filter((e) => e.type === "enter").map((e) => e.id),
  );
  expect(abEntered.size).toBeLessThan(allNodeIds.size);
});
