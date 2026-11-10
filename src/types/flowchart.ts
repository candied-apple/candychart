import type { Edge, Node } from "@xyflow/react";

export type FlowNodeType =
  | "start"
  | "end"
  | "input"
  | "process"
  | "decision"
  | "for"
  | "output";

export type InputValueType = "auto" | "number" | "text";

export interface FlowNodeData extends Record<string, unknown> {
  kind: FlowNodeType;
  label: string;
  // Input node fields
  varName?: string;
  prompt?: string;
  valueType?: InputValueType;
  // Process node fields
  code?: string;
  // Decision node fields
  condition?: string;
  // For loop node fields (e.g. "i=1; i<n; i++" or "[ i=1; i<n; i++ ]")
  forHeader?: string;
  // Output node fields
  expression?: string;
  // Runtime / UI state injected for rendering
  isActive?: boolean;
  hasError?: boolean;
  syntaxError?: string | null;
}

export type FlowNode = Node<FlowNodeData, FlowNodeType>;
export type FlowEdge = Edge;

export type RuntimePrimitive = number | string | boolean | null | undefined;
export type RuntimeValue = RuntimePrimitive | RuntimeValue[] | Record<string, unknown>;

export interface FlowchartError {
  kind: "validation" | "syntax" | "runtime" | "infinite_loop";
  message: string;
  nodeId?: string;
  nodeLabel?: string;
}

export interface OutputEntry {
  id: string;
  text: string;
  nodeId: string;
  step: number;
}

export interface TraceEntry {
  step: number;
  nodeId: string;
  nodeKind: FlowNodeType;
  nodeLabel: string;
  detail: string;
}

export interface PendingInput {
  nodeId: string;
  varNames: string[];
  prompt: string;
  valueType: InputValueType;
}

export type ExecutionStatus =
  | "idle"
  | "running"
  | "waiting_input"
  | "paused"
  | "completed"
  | "error";

export interface ExecutionState {
  status: ExecutionStatus;
  currentNodeId: string | null;
  lastEdgeId: string | null;
  variables: Record<string, RuntimeValue>;
  forLoopStack: string[];
  stepCount: number;
  outputs: OutputEntry[];
  logs: TraceEntry[];
  pendingInput: PendingInput | null;
  error: FlowchartError | null;
}

export interface FlowchartTemplate {
  id: string;
  name: string;
  description: string;
  nodes: FlowNode[];
  edges: FlowEdge[];
}
