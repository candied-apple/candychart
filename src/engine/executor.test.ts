import { describe, expect, test } from "bun:test";
import type { FlowEdge, FlowNode } from "../types/flowchart";
import { FLOWCHART_TEMPLATES } from "../data/templates";
import {
  initializeExecution,
  runUntilPause,
  submitInputValue,
} from "./executor";
import { validateFlowchart } from "./validator";

function makeNode(
  id: string,
  kind: FlowNode["data"]["kind"],
  extra: Partial<FlowNode["data"]> = {},
): FlowNode {
  return {
    id,
    type: kind,
    position: { x: 0, y: 0 },
    data: {
      kind,
      label: kind,
      ...extra,
    },
  };
}

function makeEdge(
  id: string,
  source: string,
  target: string,
  sourceHandle?: string,
  targetHandle?: string,
): FlowEdge {
  return {
    id,
    source,
    target,
    sourceHandle,
    targetHandle,
  };
}

describe("CandyChart Flowchart Engine", () => {
  test("executes For loop [ i=1; i<n ; i++] with Input pause and resume", () => {
    const nodes: FlowNode[] = [
      makeNode("s", "start"),
      makeNode("in", "input", { varName: "n" }),
      makeNode("init", "process", { code: "toplam = 0" }),
      makeNode("loop", "for", { forHeader: "[ i=1; i<n ; i++]" }),
      makeNode("body", "process", { code: "toplam += i" }),
      makeNode("out", "output", { expression: '"Sonuç:", toplam' }),
      makeNode("e", "end"),
    ];
    const edges: FlowEdge[] = [
      makeEdge("e1", "s", "in"),
      makeEdge("e2", "in", "init"),
      makeEdge("e3", "init", "loop"),
      makeEdge("e4", "loop", "body", "loop"),
      makeEdge("e5", "body", "loop", undefined, "loop-back"),
      makeEdge("e6", "loop", "out", "exit"),
      makeEdge("e7", "out", "e"),
    ];

    const { state: initState, validationErrors } = initializeExecution(nodes, edges);
    expect(validationErrors).toEqual([]);

    const waiting = runUntilPause(initState, nodes, edges);
    expect(waiting.status).toBe("waiting_input");
    expect(waiting.pendingInput?.varNames).toEqual(["n"]);

    const resumed = submitInputValue(waiting, "5", nodes, edges);
    const done = runUntilPause(resumed, nodes, edges);
    expect(done.status).toBe("completed");
    expect(done.variables.toplam).toBe(10); // 1 + 2 + 3 + 4
    expect(done.outputs.map((o) => o.text)).toEqual(["Sonuç: 10"]);
  });

  test("executes nested For loops cleanly resetting inner loop", () => {
    const nodes: FlowNode[] = [
      makeNode("s", "start"),
      makeNode("p0", "process", { code: "sayac = 0" }),
      makeNode("f1", "for", { forHeader: "i=1; i<=3; i++" }),
      makeNode("f2", "for", { forHeader: "j=1; j<=2; j++" }),
      makeNode("p1", "process", { code: "sayac++" }),
      makeNode("out", "output", { expression: "sayac" }),
      makeNode("e", "end"),
    ];
    const edges: FlowEdge[] = [
      makeEdge("e1", "s", "p0"),
      makeEdge("e2", "p0", "f1"),
      makeEdge("e3", "f1", "f2", "loop"),
      makeEdge("e4", "f2", "p1", "loop"),
      makeEdge("e5", "p1", "f2", undefined, "in"), // also works via top handle!
      makeEdge("e6", "f2", "f1", "exit", "loop-back"),
      makeEdge("e7", "f1", "out", "exit"),
      makeEdge("e8", "out", "e"),
    ];

    const { state } = initializeExecution(nodes, edges);
    const done = runUntilPause(state, nodes, edges);
    expect(done.status).toBe("completed");
    expect(done.variables.sayac).toBe(6);
    expect(done.outputs[0]?.text).toBe("6");
  });

  test("skips For loop body when initial condition is false", () => {
    const nodes: FlowNode[] = [
      makeNode("s", "start"),
      makeNode("p0", "process", { code: "n = 0\nsonuc = 99" }),
      makeNode("f", "for", { forHeader: "i=1; i<=n; i++" }),
      makeNode("body", "process", { code: "sonuc = 0" }),
      makeNode("out", "output", { expression: "sonuc" }),
      makeNode("e", "end"),
    ];
    const edges: FlowEdge[] = [
      makeEdge("e1", "s", "p0"),
      makeEdge("e2", "p0", "f"),
      makeEdge("e3", "f", "body", "loop"),
      makeEdge("e4", "body", "f"),
      makeEdge("e5", "f", "out", "exit"),
      makeEdge("e6", "out", "e"),
    ];

    const { state } = initializeExecution(nodes, edges);
    const done = runUntilPause(state, nodes, edges);
    expect(done.status).toBe("completed");
    expect(done.variables.sonuc).toBe(99);
    expect(done.outputs[0]?.text).toBe("99");
  });

  test("handles Decision (If-Else) and Turkish variable names including 'not'", () => {
    const nodes: FlowNode[] = [
      makeNode("s", "start"),
      makeNode("in", "input", { varName: "not, öğrenci" }),
      makeNode("d", "decision", { condition: "not >= 50" }),
      makeNode("o1", "output", { expression: 'öğrenci + " Geçti"' }),
      makeNode("o2", "output", { expression: 'öğrenci + " Kaldı"' }),
      makeNode("e", "end"),
    ];
    const edges: FlowEdge[] = [
      makeEdge("e1", "s", "in"),
      makeEdge("e2", "in", "d"),
      makeEdge("e3", "d", "o1", "true"),
      makeEdge("e4", "d", "o2", "false"),
      makeEdge("e5", "o1", "e"),
      makeEdge("e6", "o2", "e"),
    ];

    const { state } = initializeExecution(nodes, edges);
    const waiting = runUntilPause(state, nodes, edges);
    const resumed = submitInputValue(waiting, "75, Ayşe", nodes, edges);
    const done = runUntilPause(resumed, nodes, edges);
    expect(done.status).toBe("completed");
    expect(done.outputs[0]?.text).toBe("Ayşe Geçti");
  });

  test("supports math functions and arrays in Process", () => {
    const nodes: FlowNode[] = [
      makeNode("s", "start"),
      makeNode("p", "process", {
        code: "dizi = [4, 9]\ndizi.push(16)\nkök = sqrt(dizi[2])",
      }),
      makeNode("out", "output", { expression: "kök" }),
      makeNode("e", "end"),
    ];
    const edges: FlowEdge[] = [
      makeEdge("e1", "s", "p"),
      makeEdge("e2", "p", "out"),
      makeEdge("e3", "out", "e"),
    ];

    const { state } = initializeExecution(nodes, edges);
    const done = runUntilPause(state, nodes, edges);
    expect(done.status).toBe("completed");
    expect(done.outputs[0]?.text).toBe("4");
  });

  test("reports validation errors for missing Start, missing End, and incomplete Decision", () => {
    const noStart: FlowNode[] = [makeNode("e", "end")];
    expect(validateFlowchart(noStart, [])[0]?.message).toContain("Başlat");

    const missingBranch: FlowNode[] = [
      makeNode("s", "start"),
      makeNode("d", "decision", { condition: "x > 0" }),
      makeNode("e", "end"),
    ];
    const errs = validateFlowchart(missingBranch, [
      makeEdge("e1", "s", "d"),
      makeEdge("e2", "d", "e", "true"),
    ]);
    expect(errs.some((er) => er.message.includes("Hayır"))).toBe(true);
  });

  test("catches assignment inside Decision as syntax error", () => {
    const nodes: FlowNode[] = [
      makeNode("s", "start"),
      makeNode("d", "decision", { condition: "x = 5" }),
      makeNode("e", "end"),
    ];
    const edges: FlowEdge[] = [
      makeEdge("e1", "s", "d"),
      makeEdge("e2", "d", "e", "true"),
      makeEdge("e3", "d", "e", "false"),
    ];
    const errs = validateFlowchart(nodes, edges);
    expect(errs[0]?.kind).toBe("syntax");
    expect(errs[0]?.message).toContain("==");
  });

  test("catches undefined variable and division by zero at runtime", () => {
    const nodes1: FlowNode[] = [
      makeNode("s", "start"),
      makeNode("p", "process", { code: "y = x + 1" }),
      makeNode("e", "end"),
    ];
    const edges1: FlowEdge[] = [makeEdge("e1", "s", "p"), makeEdge("e2", "p", "e")];
    const res1 = runUntilPause(initializeExecution(nodes1, edges1).state, nodes1, edges1);
    expect(res1.status).toBe("error");
    expect(res1.error?.kind).toBe("runtime");
    expect(res1.error?.message).toContain("Tanımsız değişken");
    expect(res1.error?.nodeId).toBe("p");

    const nodes2: FlowNode[] = [
      makeNode("s", "start"),
      makeNode("p", "process", { code: "a = 10 / 0" }),
      makeNode("e", "end"),
    ];
    const res2 = runUntilPause(initializeExecution(nodes2, edges1).state, nodes2, edges1);
    expect(res2.status).toBe("error");
    expect(res2.error?.message).toContain("Sıfıra bölme");
  });

  test("catches infinite loop cleanly", () => {
    const nodes: FlowNode[] = [
      makeNode("s", "start"),
      makeNode("f", "for", { forHeader: "i=1; i>0; i++" }),
      makeNode("p", "process", { code: "x = i" }),
      makeNode("e", "end"),
    ];
    const edges: FlowEdge[] = [
      makeEdge("e1", "s", "f"),
      makeEdge("e2", "f", "p", "loop"),
      makeEdge("e3", "p", "f"),
      makeEdge("e4", "f", "e", "exit"),
    ];
    const res = runUntilPause(initializeExecution(nodes, edges).state, nodes, edges);
    expect(res.status).toBe("error");
    expect(res.error?.kind).toBe("infinite_loop");
    expect(res.error?.message).toContain("Sonsuz döngü");
  });

  test("all built-in example templates validate and run cleanly", () => {
    const templateInputs: Record<string, { input: string; expectedOut: string }> = {
      "sum-for": { input: "5", expectedOut: "1..5 Toplamı = 15" },
      "even-odd": { input: "8", expectedOut: "8 bir ÇİFT sayıdır." },
      "factorial": { input: "5", expectedOut: "5! = 120" },
      "grade-average": { input: "70, 80", expectedOut: "Tebrikler, dersi GEÇTİNİZ!" },
    };

    for (const tpl of FLOWCHART_TEMPLATES) {
      if (tpl.id === "blank") continue;
      const { state, validationErrors } = initializeExecution(tpl.nodes, tpl.edges);
      expect(validationErrors).toEqual([]);
      let cur = runUntilPause(state, tpl.nodes, tpl.edges);
      expect(cur.status).toBe("waiting_input");
      const cfg = templateInputs[tpl.id]!;
      cur = submitInputValue(cur, cfg.input, tpl.nodes, tpl.edges);
      cur = runUntilPause(cur, tpl.nodes, tpl.edges);
      expect(cur.status).toBe("completed");
      expect(cur.outputs.some((o) => o.text.includes(cfg.expectedOut))).toBe(true);
    }
  });
});
