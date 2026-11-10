import type {
  ExecutionState,
  FlowchartError,
  FlowEdge,
  FlowNode,
  InputValueType,
  RuntimeValue,
} from "../types/flowchart";
import { evalExpr, execStatements, formatValue, RuntimeEvalError } from "./evaluator";
import { SyntaxParseError } from "./lexer";
import {
  parseExpression,
  parseForHeader,
  parseInputVarNames,
  parseOutputArgs,
  parseStatements,
} from "./parser";
import { getNodeDisplayTitle, validateFlowchart } from "./validator";

export const MAX_EXECUTION_STEPS = 10_000;

function cloneVariables(vars: Record<string, RuntimeValue>): Record<string, RuntimeValue> {
  const copy: Record<string, RuntimeValue> = {};
  for (const [k, v] of Object.entries(vars)) {
    copy[k] = Array.isArray(v) ? [...v] : v;
  }
  return copy;
}

function findOutgoing(
  nodeId: string,
  edges: FlowEdge[],
  sourceHandle?: string,
): FlowEdge | undefined {
  return edges.find((e) => {
    if (e.source !== nodeId) return false;
    if (sourceHandle !== undefined) {
      return e.sourceHandle === sourceHandle;
    }
    return true;
  });
}

function parseInputToken(raw: string, valueType: InputValueType): RuntimeValue {
  const trimmed = raw.trim();
  if (valueType === "text") {
    return raw;
  }
  if (valueType === "number") {
    if (!trimmed) {
      throw new RuntimeEvalError("Sayısal girdi boş bırakılamaz.");
    }
    const num = Number(trimmed);
    if (!Number.isFinite(num)) {
      throw new RuntimeEvalError(`Geçersiz sayısal girdi: '${trimmed}' geçerli bir sayı değil.`);
    }
    return num;
  }
  // auto
  if (!trimmed) {
    throw new RuntimeEvalError("Girdi değeri boş bırakılamaz.");
  }
  if (/^-?(?:\d+\.?\d*|\.\d+)$/.test(trimmed)) {
    const num = Number(trimmed);
    if (Number.isFinite(num)) return num;
  }
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  return trimmed;
}

export function createIdleExecutionState(): ExecutionState {
  return {
    status: "idle",
    currentNodeId: null,
    lastEdgeId: null,
    variables: {},
    forLoopStack: [],
    stepCount: 0,
    outputs: [],
    logs: [],
    pendingInput: null,
    error: null,
  };
}

export function initializeExecution(
  nodes: FlowNode[],
  edges: FlowEdge[],
): { state: ExecutionState; validationErrors: FlowchartError[] } {
  const validationErrors = validateFlowchart(nodes, edges);
  if (validationErrors.length > 0) {
    const first = validationErrors[0]!;
    return {
      validationErrors,
      state: {
        ...createIdleExecutionState(),
        status: "error",
        currentNodeId: first.nodeId ?? null,
        error: first,
      },
    };
  }

  const startNode = nodes.find((n) => n.data.kind === "start")!;
  return {
    validationErrors: [],
    state: {
      ...createIdleExecutionState(),
      status: "paused",
      currentNodeId: startNode.id,
    },
  };
}

export function stepExecution(
  state: ExecutionState,
  nodes: FlowNode[],
  edges: FlowEdge[],
): ExecutionState {
  if (
    state.status === "completed" ||
    state.status === "error" ||
    state.status === "waiting_input" ||
    state.status === "idle"
  ) {
    return state;
  }

  if (!state.currentNodeId) {
    return {
      ...state,
      status: "error",
      error: {
        kind: "runtime",
        message: "Çalıştırılacak aktif düğüm bulunamadı.",
      },
    };
  }

  if (state.stepCount >= MAX_EXECUTION_STEPS) {
    const stuckNode = nodes.find((n) => n.id === state.currentNodeId);
    return {
      ...state,
      status: "error",
      error: {
        kind: "infinite_loop",
        message: `Sonsuz döngü tespit edildi (${MAX_EXECUTION_STEPS.toLocaleString("tr-TR")} adım sınırı aşıldı). Döngü koşulunu veya artış ifadesini kontrol edin.`,
        nodeId: state.currentNodeId,
        nodeLabel: stuckNode ? getNodeDisplayTitle(stuckNode) : undefined,
      },
    };
  }

  const node = nodes.find((n) => n.id === state.currentNodeId);
  if (!node) {
    return {
      ...state,
      status: "error",
      error: {
        kind: "runtime",
        message: "Akış düğümü bulunamadı (silinmiş olabilir).",
        nodeId: state.currentNodeId,
      },
    };
  }

  const nextStep = state.stepCount + 1;
  const vars = cloneVariables(state.variables);
  const stack = [...state.forLoopStack];
  const outputs = [...state.outputs];
  const logs = [...state.logs];
  const title = getNodeDisplayTitle(node);

  try {
    switch (node.data.kind) {
      case "start": {
        const edge = findOutgoing(node.id, edges);
        if (!edge) {
          throw new RuntimeEvalError("'Başlat' düğümünün çıkış bağlantısı eksik.");
        }
        logs.push({
          step: nextStep,
          nodeId: node.id,
          nodeKind: "start",
          nodeLabel: title,
          detail: "Program başlatıldı",
        });
        return {
          ...state,
          status: "paused",
          currentNodeId: edge.target,
          lastEdgeId: edge.id,
          stepCount: nextStep,
          variables: vars,
          forLoopStack: stack,
          outputs,
          logs,
        };
      }

      case "end": {
        logs.push({
          step: nextStep,
          nodeId: node.id,
          nodeKind: "end",
          nodeLabel: title,
          detail: "Program başarıyla sonlandı",
        });
        return {
          ...state,
          status: "completed",
          currentNodeId: null,
          lastEdgeId: null,
          stepCount: nextStep,
          variables: vars,
          forLoopStack: stack,
          outputs,
          logs,
        };
      }

      case "input": {
        const varNames = parseInputVarNames(node.data.varName ?? "");
        const prompt =
          (node.data.prompt ?? "").trim() ||
          `${varNames.join(", ")} değerini giriniz`;
        const valueType: InputValueType = node.data.valueType ?? "auto";
        return {
          ...state,
          status: "waiting_input",
          stepCount: state.stepCount,
          variables: vars,
          forLoopStack: stack,
          outputs,
          logs,
          pendingInput: {
            nodeId: node.id,
            varNames,
            prompt,
            valueType,
          },
        };
      }

      case "process": {
        const code = (node.data.code ?? "").trim();
        if (!code) {
          throw new SyntaxParseError("İşlem (Process) kutusu boş olamaz.");
        }
        const stmts = parseStatements(code);
        execStatements(stmts, vars);

        const edge = findOutgoing(node.id, edges);
        if (!edge) {
          throw new RuntimeEvalError(`${title} düğümünün çıkış bağlantısı eksik.`);
        }
        logs.push({
          step: nextStep,
          nodeId: node.id,
          nodeKind: "process",
          nodeLabel: title,
          detail: code.replace(/\s*\n\s*/g, "; "),
        });
        return {
          ...state,
          status: "paused",
          currentNodeId: edge.target,
          lastEdgeId: edge.id,
          stepCount: nextStep,
          variables: vars,
          forLoopStack: stack,
          outputs,
          logs,
        };
      }

      case "decision": {
        const condRaw = (node.data.condition ?? "").trim();
        if (!condRaw) {
          throw new SyntaxParseError("Karar (Elmas) koşulu boş olamaz.");
        }
        const expr = parseExpression(condRaw, { forbidAssignment: true });
        const result = Boolean(evalExpr(expr, vars));
        const branchHandle = result ? "true" : "false";
        const edge = findOutgoing(node.id, edges, branchHandle);
        if (!edge) {
          throw new RuntimeEvalError(
            `Karar düğümünün '${result ? "Evet" : "Hayır"}' çıkış bağlantısı eksik.`,
          );
        }
        logs.push({
          step: nextStep,
          nodeId: node.id,
          nodeKind: "decision",
          nodeLabel: title,
          detail: `${condRaw} → ${result ? "Evet (Doğru)" : "Hayır (Yanlış)"}`,
        });
        return {
          ...state,
          status: "paused",
          currentNodeId: edge.target,
          lastEdgeId: edge.id,
          stepCount: nextStep,
          variables: vars,
          forLoopStack: stack,
          outputs,
          logs,
        };
      }

      case "for": {
        const headerRaw = (node.data.forHeader ?? "").trim();
        const parsed = parseForHeader(headerRaw);
        const existingIdx = stack.lastIndexOf(node.id);
        const isReturning = existingIdx !== -1;

        if (isReturning) {
          // Pop any inner loop frames that may have been jumped out of
          stack.splice(existingIdx + 1);
          execStatements(parsed.update, vars);
        } else {
          execStatements(parsed.init, vars);
        }

        const condPassed = parsed.condition
          ? Boolean(evalExpr(parsed.condition, vars))
          : true;

        if (condPassed) {
          if (!isReturning) {
            stack.push(node.id);
          }
          const loopEdge = findOutgoing(node.id, edges, "loop");
          if (!loopEdge) {
            throw new RuntimeEvalError("For döngüsünün 'Döngü' çıkış bağlantısı eksik.");
          }
          logs.push({
            step: nextStep,
            nodeId: node.id,
            nodeKind: "for",
            nodeLabel: title,
            detail: `${isReturning ? "Sonraki adım" : "Başlangıç"} → Koşul sağlandı (Döngüye devam)`,
          });
          return {
            ...state,
            status: "paused",
            currentNodeId: loopEdge.target,
            lastEdgeId: loopEdge.id,
            stepCount: nextStep,
            variables: vars,
            forLoopStack: stack,
            outputs,
            logs,
          };
        } else {
          if (isReturning) {
            stack.pop();
          }
          const exitEdge = findOutgoing(node.id, edges, "exit");
          if (!exitEdge) {
            throw new RuntimeEvalError("For döngüsünün 'Bitti / Çıkış' bağlantısı eksik.");
          }
          logs.push({
            step: nextStep,
            nodeId: node.id,
            nodeKind: "for",
            nodeLabel: title,
            detail: "Koşul sağlanmadı → Döngüden çıkıldı",
          });
          return {
            ...state,
            status: "paused",
            currentNodeId: exitEdge.target,
            lastEdgeId: exitEdge.id,
            stepCount: nextStep,
            variables: vars,
            forLoopStack: stack,
            outputs,
            logs,
          };
        }
      }

      case "output": {
        const exprRaw = (node.data.expression ?? "").trim();
        if (!exprRaw) {
          throw new SyntaxParseError("Çıktı (Output) ifadesi boş olamaz.");
        }
        const argExprs = parseOutputArgs(exprRaw);
        const text = argExprs.map((a) => formatValue(evalExpr(a, vars))).join(" ");
        const edge = findOutgoing(node.id, edges);
        if (!edge) {
          throw new RuntimeEvalError(`${title} düğümünün çıkış bağlantısı eksik.`);
        }
        outputs.push({
          id: `${nextStep}-${node.id}`,
          text,
          nodeId: node.id,
          step: nextStep,
        });
        logs.push({
          step: nextStep,
          nodeId: node.id,
          nodeKind: "output",
          nodeLabel: title,
          detail: `Çıktı: ${text}`,
        });
        return {
          ...state,
          status: "paused",
          currentNodeId: edge.target,
          lastEdgeId: edge.id,
          stepCount: nextStep,
          variables: vars,
          forLoopStack: stack,
          outputs,
          logs,
        };
      }
    }
  } catch (err) {
    const kind: FlowchartError["kind"] =
      err instanceof SyntaxParseError ? "syntax" : "runtime";
    const message =
      err instanceof Error ? err.message : "Beklenmeyen bir çalışma hatası oluştu.";
    return {
      ...state,
      status: "error",
      stepCount: nextStep,
      variables: vars,
      forLoopStack: stack,
      outputs,
      logs,
      error: {
        kind,
        message,
        nodeId: node.id,
        nodeLabel: title,
      },
    };
  }
}

export function submitInputValue(
  state: ExecutionState,
  rawInput: string,
  nodes: FlowNode[],
  edges: FlowEdge[],
): ExecutionState {
  if (state.status !== "waiting_input" || !state.pendingInput) {
    return state;
  }

  const { nodeId, varNames, valueType } = state.pendingInput;
  const node = nodes.find((n) => n.id === nodeId);
  const title = node ? getNodeDisplayTitle(node) : "Girdi";
  const nextStep = state.stepCount + 1;
  const vars = cloneVariables(state.variables);
  const logs = [...state.logs];

  try {
    let rawParts: string[];
    if (varNames.length === 1) {
      rawParts = [rawInput];
    } else {
      rawParts = rawInput.includes(",")
        ? rawInput.split(",")
        : rawInput.trim().split(/\s+/);
      if (rawParts.length !== varNames.length) {
        throw new RuntimeEvalError(
          `${varNames.length} adet değer bekleniyor (${varNames.join(", ")}), ancak ${rawParts.length} adet girildi.`,
        );
      }
    }

    const assignedPairs: string[] = [];
    for (let i = 0; i < varNames.length; i++) {
      const name = varNames[i]!;
      const parsedVal = parseInputToken(rawParts[i] ?? "", valueType);
      vars[name] = parsedVal;
      assignedPairs.push(`${name} = ${formatValue(parsedVal)}`);
    }

    const edge = findOutgoing(nodeId, edges);
    if (!edge) {
      throw new RuntimeEvalError(`${title} düğümünün çıkış bağlantısı eksik.`);
    }

    logs.push({
      step: nextStep,
      nodeId,
      nodeKind: "input",
      nodeLabel: title,
      detail: `Girdi alındı: ${assignedPairs.join(", ")}`,
    });

    return {
      ...state,
      status: "paused",
      currentNodeId: edge.target,
      lastEdgeId: edge.id,
      stepCount: nextStep,
      variables: vars,
      logs,
      pendingInput: null,
    };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Girdi işlenirken hata oluştu.";
    return {
      ...state,
      status: "error",
      pendingInput: null,
      error: {
        kind: "runtime",
        message,
        nodeId,
        nodeLabel: title,
      },
    };
  }
}

export function runUntilPause(
  initialState: ExecutionState,
  nodes: FlowNode[],
  edges: FlowEdge[],
): ExecutionState {
  let current = initialState;
  while (current.status === "running" || current.status === "paused") {
    current = stepExecution(current, nodes, edges);
  }
  return current;
}
