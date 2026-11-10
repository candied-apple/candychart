import type { FlowchartError, FlowEdge, FlowNode } from "../types/flowchart";
import { SyntaxParseError } from "./lexer";
import {
  parseExpression,
  parseForHeader,
  parseInputVarNames,
  parseOutputArgs,
  parseStatements,
} from "./parser";

export function validateNodeSyntax(node: FlowNode): string | null {
  try {
    switch (node.data.kind) {
      case "start":
      case "end":
        return null;
      case "input":
        parseInputVarNames(node.data.varName ?? "");
        return null;
      case "process": {
        const code = (node.data.code ?? "").trim();
        if (!code) {
          return "İşlem (Process) kutusu boş olamaz.";
        }
        const stmts = parseStatements(code);
        if (stmts.length === 0) {
          return "İşlem (Process) kutusunda en az bir geçerli ifade olmalıdır.";
        }
        return null;
      }
      case "decision": {
        const cond = (node.data.condition ?? "").trim();
        if (!cond) {
          return "Karar (Elmas) koşulu boş olamaz.";
        }
        parseExpression(cond, { forbidAssignment: true });
        return null;
      }
      case "for":
        parseForHeader(node.data.forHeader ?? "");
        return null;
      case "output": {
        const expr = (node.data.expression ?? "").trim();
        if (!expr) {
          return "Çıktı (Output) ifadesi boş olamaz.";
        }
        parseOutputArgs(expr);
        return null;
      }
    }
  } catch (err) {
    if (err instanceof SyntaxParseError) {
      return err.message;
    }
    return err instanceof Error ? err.message : "Bilinmeyen sözdizimi hatası.";
  }
}

export function getNodeDisplayTitle(node: FlowNode): string {
  const kindNames: Record<FlowNode["data"]["kind"], string> = {
    start: "Başlat",
    end: "Bitir",
    input: "Girdi",
    process: "İşlem",
    decision: "Karar",
    for: "For Döngüsü",
    output: "Çıktı",
  };
  const base = kindNames[node.data.kind];
  if (node.data.label && node.data.label.trim() && node.data.label.trim() !== base) {
    return `${base} (${node.data.label.trim()})`;
  }
  switch (node.data.kind) {
    case "input":
      return node.data.varName ? `${base} (${node.data.varName})` : base;
    case "process":
      return node.data.code ? `${base} (${node.data.code.split("\n")[0]?.slice(0, 22)})` : base;
    case "decision":
      return node.data.condition ? `${base} (${node.data.condition})` : base;
    case "for":
      return node.data.forHeader ? `${base} (${node.data.forHeader})` : base;
    case "output":
      return node.data.expression ? `${base} (${node.data.expression})` : base;
    default:
      return base;
  }
}

export function validateFlowchart(
  nodes: FlowNode[],
  edges: FlowEdge[],
): FlowchartError[] {
  const errors: FlowchartError[] = [];
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  const startNodes = nodes.filter((n) => n.data.kind === "start");
  const endNodes = nodes.filter((n) => n.data.kind === "end");

  if (startNodes.length === 0) {
    errors.push({
      kind: "validation",
      message: "Akış şemasında bir 'Başlat' (Oval) düğümü bulunmalıdır.",
    });
  } else if (startNodes.length > 1) {
    for (const extra of startNodes.slice(1)) {
      errors.push({
        kind: "validation",
        message: "Akış şemasında yalnızca bir adet 'Başlat' düğümü olabilir.",
        nodeId: extra.id,
        nodeLabel: getNodeDisplayTitle(extra),
      });
    }
  }

  if (endNodes.length === 0) {
    errors.push({
      kind: "validation",
      message: "Akış şemasında en az bir 'Bitir' (Oval) düğümü bulunmalıdır.",
    });
  }

  // Build adjacency map
  const outgoingMap = new Map<string, FlowEdge[]>();
  for (const edge of edges) {
    if (!nodeMap.has(edge.source) || !nodeMap.has(edge.target)) continue;
    const list = outgoingMap.get(edge.source) ?? [];
    list.push(edge);
    outgoingMap.set(edge.source, list);
  }

  const startNode = startNodes[0];
  if (!startNode) {
    return errors;
  }

  // BFS from startNode to find reachable nodes
  const visited = new Set<string>();
  const queue: string[] = [startNode.id];
  let reachesEnd = false;

  while (queue.length > 0) {
    const id = queue.shift()!;
    if (visited.has(id)) continue;
    visited.add(id);

    const node = nodeMap.get(id);
    if (!node) continue;

    if (node.data.kind === "end") {
      reachesEnd = true;
      continue;
    }

    const syntaxErr = validateNodeSyntax(node);
    if (syntaxErr) {
      errors.push({
        kind: "syntax",
        message: syntaxErr,
        nodeId: node.id,
        nodeLabel: getNodeDisplayTitle(node),
      });
    }

    const outs = outgoingMap.get(id) ?? [];

    if (node.data.kind === "decision") {
      const trueEdges = outs.filter((e) => e.sourceHandle === "true");
      const falseEdges = outs.filter((e) => e.sourceHandle === "false");
      if (trueEdges.length === 0) {
        errors.push({
          kind: "validation",
          message: "Karar (Elmas) düğümünün 'Evet' (sol) çıkış bağlantısı eksik.",
          nodeId: node.id,
          nodeLabel: getNodeDisplayTitle(node),
        });
      } else if (trueEdges.length > 1) {
        errors.push({
          kind: "validation",
          message: "Karar düğümünün 'Evet' çıkışında birden fazla bağlantı olamaz.",
          nodeId: node.id,
          nodeLabel: getNodeDisplayTitle(node),
        });
      }
      if (falseEdges.length === 0) {
        errors.push({
          kind: "validation",
          message: "Karar (Elmas) düğümünün 'Hayır' (sağ) çıkış bağlantısı eksik.",
          nodeId: node.id,
          nodeLabel: getNodeDisplayTitle(node),
        });
      } else if (falseEdges.length > 1) {
        errors.push({
          kind: "validation",
          message: "Karar düğümünün 'Hayır' çıkışında birden fazla bağlantı olamaz.",
          nodeId: node.id,
          nodeLabel: getNodeDisplayTitle(node),
        });
      }
    } else if (node.data.kind === "for") {
      const loopEdges = outs.filter((e) => e.sourceHandle === "loop");
      const exitEdges = outs.filter((e) => e.sourceHandle === "exit");
      if (loopEdges.length === 0) {
        errors.push({
          kind: "validation",
          message: "For döngüsünün 'Döngü' (alt) çıkış bağlantısı eksik.",
          nodeId: node.id,
          nodeLabel: getNodeDisplayTitle(node),
        });
      } else if (loopEdges.length > 1) {
        errors.push({
          kind: "validation",
          message: "For döngüsünün 'Döngü' çıkışında birden fazla bağlantı olamaz.",
          nodeId: node.id,
          nodeLabel: getNodeDisplayTitle(node),
        });
      }
      if (exitEdges.length === 0) {
        errors.push({
          kind: "validation",
          message: "For döngüsünün 'Bitti / Çıkış' (sağ) çıkış bağlantısı eksik.",
          nodeId: node.id,
          nodeLabel: getNodeDisplayTitle(node),
        });
      } else if (exitEdges.length > 1) {
        errors.push({
          kind: "validation",
          message: "For döngüsünün 'Bitti / Çıkış' çıkışında birden fazla bağlantı olamaz.",
          nodeId: node.id,
          nodeLabel: getNodeDisplayTitle(node),
        });
      }
    } else {
      if (outs.length === 0) {
        errors.push({
          kind: "validation",
          message: `${getNodeDisplayTitle(node)} düğümünün çıkış bağlantısı yok.`,
          nodeId: node.id,
          nodeLabel: getNodeDisplayTitle(node),
        });
      } else if (outs.length > 1) {
        errors.push({
          kind: "validation",
          message: `${getNodeDisplayTitle(node)} düğümünde birden fazla çıkış bağlantısı olamaz.`,
          nodeId: node.id,
          nodeLabel: getNodeDisplayTitle(node),
        });
      }
    }

    for (const out of outs) {
      if (!visited.has(out.target)) {
        queue.push(out.target);
      }
    }
  }

  if (endNodes.length > 0 && !reachesEnd && errors.length === 0) {
    errors.push({
      kind: "validation",
      message: "'Başlat' düğümünden hiçbir 'Bitir' düğümüne ulaşılamıyor. Akış bağlantılarınızı kontrol edin.",
    });
  }

  return errors;
}
