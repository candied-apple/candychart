# CandyChart

Web-based visual flowchart builder and execution studio built with **Bun**, **React 19**, **Tailwind CSS**, and **React Flow (`@xyflow/react`)**.

## Features

- **Classic Flowchart Shapes:**
  - **Start / End (Oval)**
  - **Input (Parallelogram)** — interactive runtime prompts (`auto`, `number`, `text`, single or comma-separated variables)
  - **Process (Rectangle)** — multi-line assignments, compound operators (`+=`, `++`, `--`), arrays, and math functions
  - **Decision / If-Else (Diamond)** — conditional branching (`Evet` / `Hayır`)
  - **For Loop (Elongated Hexagon)** — supports `[ i=1; i<n; i++ ]` syntax with nested loop support
  - **Output (Wavy Document)** — prints evaluated expressions and formatted results
- **Live Validation & Error Reporting:** Catches missing links, invalid syntax, assignment inside conditions, undefined variables, division by zero, and infinite loops (10,000-step limit).
- **Interactive Runner:** Supports instant run, animated step-by-step execution, variable watch table, execution trace, JSON import/export, and built-in Turkish templates.

## Getting Started

```bash
bun install
bun dev
```

## Scripts

```bash
bun dev            # Start development server with hot reload
bun test           # Run engine & template tests
bun run typecheck  # Run TypeScript type checking (bun check)
bun run build      # Build production assets into dist/
bun start          # Serve production build
```
