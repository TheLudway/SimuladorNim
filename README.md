# Simulador Nim — Minimax y Poda Alfa-Beta

Interactive visualiser for the Minimax and Alpha-Beta pruning algorithms applied to the Nim [1,3] game.

## Description

This project visualises how the Minimax algorithm and Alpha-Beta pruning work on a Nim game tree. The game starts with two rows: **Row 1 = 1 stone**, **Row 2 = 3 stones**. Players alternate removing 1..N stones from a single row. The player who takes the last stone wins.

- **MAX** is the maximising player (moves first)
- **MIN** is the minimising player
- Terminal state is `[0, 0]` — the player whose turn it is has no moves and loses

The visualiser steps through each algorithm's execution, showing:
- Which node is being explored
- Current α and β bounds
- Value propagation up the tree
- Pruned branches (alpha-beta mode only)
- The optimal decision with the best move

## Install dependencies

```bash
bun install
```

## Develop

```bash
bun dev
```

## Build

```bash
bun run build
```

## Tests

```bash
bun test
```

## Architecture

Core logic is split into testable modules under `src/nim/`:

| Module | Description |
|--------|-------------|
| `types.ts` | Type definitions (`NimNode`, `SimulationEvent`, `Player`, `SimulationMode`) |
| `tree.ts` | Game-tree construction, move generation, layout, node queries |
| `minimax.ts` | Pure Minimax algorithm (no pruning) |
| `alphabeta.ts` | Alpha-beta search with event generation |
| `svg.ts` | SVG string generation and side-panel info computation |

The React component (`src/components/NimSimulator.tsx`) handles UI state, rendering, and interactive controls. It imports the logic modules and delegates all algorithm work to them.

### Running the algorithms

```ts
import { buildTree, resetNodeId, layout, allNodes } from "./nim/tree";
import { minimax } from "./nim/minimax";
import { buildEvents } from "./nim/alphabeta";
import { svgTreeWithState, getRenderInfo } from "./nim/svg";

// Build the tree for Nim [1,3]
resetNodeId();
const tree = buildTree([1, 3], "MAX", "Inicio", 0);
layout(tree);
minimax(tree); // fills node.value and node.mmChosen

// Generate simulation events
const events = buildEvents(tree, "minimax");  // or "alphabeta"

// Step through the events
const svg = svgTreeWithState(tree, events, stepIndex);
const info = getRenderInfo(tree, events, stepIndex, "alphabeta");
```

## Key result

From the initial state `[1, 3]`, MAX (first player) **wins** (minimax value = +1).
The optimal move is to **remove 2 stones from Row 2**, reaching `[1, 1]` (a position with Nim-sum 0, which is losing for the next player).
