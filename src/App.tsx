import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  addEdge,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Connection,
  type OnSelectionChangeParams,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  ArrowLeftRight,
  LayoutGrid,
  Pencil,
  Shapes,
  Sliders,
  Terminal,
  Trash2,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
} from "react";
import { ConsolePanel } from "./components/ConsolePanel";
import { InspectorPanel } from "./components/InspectorPanel";
import { PaletteSidebar } from "./components/PaletteSidebar";
import { Toolbar } from "./components/Toolbar";
import {
  FLOW_NODE_TYPES,
  createDefaultNodeData,
} from "./components/nodes/FlowShapes";
import { FLOWCHART_TEMPLATES, makeStyledEdge } from "./data/templates";
import {
  createIdleExecutionState,
  initializeExecution,
  runUntilPause,
  stepExecution,
  submitInputValue,
} from "./engine/executor";
import { validateFlowchart, validateNodeSyntax } from "./engine/validator";
import "./index.css";
import type {
  ExecutionState,
  FlowEdge,
  FlowNode,
  FlowNodeData,
  FlowNodeType,
  FlowchartError,
  FlowchartTemplate,
} from "./types/flowchart";

const INITIAL_TEMPLATE = FLOWCHART_TEMPLATES[0]!;

const MINIMAP_COLORS: Record<FlowNodeType, string> = {
  start: "#10b981",
  end: "#f43f5e",
  input: "#fb923c",
  process: "#a3a3a3",
  decision: "#f59e0b",
  for: "#a78bfa",
  output: "#2dd4bf",
};

function FlowchartStudio() {
  const reactFlow = useReactFlow<FlowNode, FlowEdge>();
  const [nodes, setNodes, onNodesChange] = useNodesState<FlowNode>(
    INITIAL_TEMPLATE.nodes,
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState<FlowEdge>(
    INITIAL_TEMPLATE.edges,
  );

  const [activeTemplateId, setActiveTemplateId] = useState<string>(
    INITIAL_TEMPLATE.id,
  );
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [focusTrigger, setFocusTrigger] = useState(0);

  const [execution, setExecution] = useState<ExecutionState>(
    createIdleExecutionState,
  );
  const [runErrors, setRunErrors] = useState<FlowchartError[]>([]);
  const [animatedRun, setAnimatedRun] = useState(false);
  const [mobilePanel, setMobilePanel] = useState<
    "canvas" | "palette" | "inspector" | "console"
  >("canvas");
  const [isClickConnecting, setIsClickConnecting] = useState(false);

  const nodeCounterRef = useRef(100);
  const staggerRef = useRef(0);
  const canvasWrapperRef = useRef<HTMLDivElement | null>(null);
  const lastNodeTapRef = useRef<{ id: string; time: number } | null>(null);

  const liveValidationErrors = useMemo(
    () => validateFlowchart(nodes, edges),
    [nodes, edges],
  );

  const displayNodes = useMemo<FlowNode[]>(() => {
    return nodes.map((node) => {
      const syntaxError = validateNodeSyntax(node);
      const isActive =
        execution.currentNodeId === node.id &&
        execution.status !== "idle" &&
        execution.status !== "error" &&
        execution.status !== "completed";
      const hasError =
        execution.status === "error" && execution.error?.nodeId === node.id;

      return {
        ...node,
        data: {
          ...node.data,
          syntaxError,
          isActive,
          hasError,
        },
      };
    });
  }, [nodes, execution.currentNodeId, execution.status, execution.error?.nodeId]);

  const displayEdges = useMemo<FlowEdge[]>(() => {
    return edges.map((edge) => {
      const isLast =
        execution.lastEdgeId === edge.id &&
        execution.status !== "idle" &&
        execution.status !== "completed";
      return {
        ...edge,
        animated: isLast,
      };
    });
  }, [edges, execution.lastEdgeId, execution.status]);

  const selectedNode = useMemo(
    () => nodes.find((n) => n.id === selectedNodeId) ?? null,
    [nodes, selectedNodeId],
  );
  const selectedEdge = useMemo(
    () => edges.find((e) => e.id === selectedEdgeId) ?? null,
    [edges, selectedEdgeId],
  );

  // Animated execution loop
  useEffect(() => {
    if (execution.status !== "running") return;

    const timer = window.setTimeout(() => {
      setExecution((prev) => {
        if (prev.status !== "running") return prev;
        const next = stepExecution(prev, nodes, edges);
        if (next.status === "paused") {
          return { ...next, status: "running" };
        }
        return next;
      });
    }, 260);

    return () => window.clearTimeout(timer);
  }, [execution, nodes, edges]);

  useEffect(() => {
    if (execution.status === "waiting_input" || execution.status === "error") {
      setMobilePanel("console");
    }
  }, [execution.status]);

  const resetExecution = useCallback(() => {
    setExecution(createIdleExecutionState());
    setRunErrors([]);
  }, []);

  const handleRun = useCallback(() => {
    setMobilePanel("console");
    let baseState = execution;
    if (
      baseState.status === "idle" ||
      baseState.status === "completed" ||
      baseState.status === "error"
    ) {
      const init = initializeExecution(nodes, edges);
      setRunErrors(init.validationErrors);
      if (init.state.status === "error") {
        setExecution(init.state);
        if (init.state.error?.nodeId) {
          setSelectedNodeId(init.state.error.nodeId);
        }
        return;
      }
      baseState = init.state;
    }

    if (animatedRun) {
      setExecution({ ...baseState, status: "running" });
    } else {
      const finalState = runUntilPause(
        { ...baseState, status: "running" },
        nodes,
        edges,
      );
      setExecution(finalState);
      if (finalState.status === "error" && finalState.error?.nodeId) {
        setSelectedNodeId(finalState.error.nodeId);
      }
    }
  }, [execution, nodes, edges, animatedRun]);

  const handleStep = useCallback(() => {
    if (
      execution.status === "idle" ||
      execution.status === "completed" ||
      execution.status === "error"
    ) {
      const init = initializeExecution(nodes, edges);
      setRunErrors(init.validationErrors);
      if (init.state.status === "error") {
        setExecution(init.state);
        setMobilePanel("console");
        if (init.state.error?.nodeId) {
          setSelectedNodeId(init.state.error.nodeId);
        }
        return;
      }
      const stepped = stepExecution(init.state, nodes, edges);
      setExecution(stepped);
      if (stepped.status === "waiting_input" || stepped.status === "error") {
        setMobilePanel("console");
      }
      return;
    }

    const stepped = stepExecution(execution, nodes, edges);
    setExecution(stepped);
    if (stepped.status === "waiting_input" || stepped.status === "error") {
      setMobilePanel("console");
    }
    if (stepped.status === "error" && stepped.error?.nodeId) {
      setSelectedNodeId(stepped.error.nodeId);
    }
  }, [execution, nodes, edges]);

  const handleSubmitInput = useCallback(
    (rawValue: string) => {
      const resumed = submitInputValue(execution, rawValue, nodes, edges);
      if (resumed.status === "error") {
        setExecution(resumed);
        if (resumed.error?.nodeId) {
          setSelectedNodeId(resumed.error.nodeId);
        }
        return;
      }

      if (animatedRun) {
        setExecution({ ...resumed, status: "running" });
      } else {
        const nextState = runUntilPause(
          { ...resumed, status: "running" },
          nodes,
          edges,
        );
        setExecution(nextState);
        if (nextState.status === "error" && nextState.error?.nodeId) {
          setSelectedNodeId(nextState.error.nodeId);
        }
      }
    },
    [execution, nodes, edges, animatedRun],
  );

  const handleConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return;
      if (connection.source === connection.target) return;

      const edgeId = `e-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const newEdge = makeStyledEdge({
        id: edgeId,
        source: connection.source,
        target: connection.target,
        sourceHandle: connection.sourceHandle ?? undefined,
        targetHandle: connection.targetHandle ?? undefined,
      });

      setEdges((eds) => {
        // Replace existing edge from the exact same source handle so branches stay clean
        const filtered = eds.filter(
          (e) =>
            !(
              e.source === connection.source &&
              (e.sourceHandle ?? null) === (connection.sourceHandle ?? null)
            ),
        );
        return addEdge(newEdge, filtered);
      });
      if (execution.status !== "idle") {
        resetExecution();
      }
    },
    [setEdges, execution.status, resetExecution],
  );

  const addNodeAtPosition = useCallback(
    (kind: FlowNodeType, position: { x: number; y: number }) => {
      nodeCounterRef.current += 1;
      const id = `node-${nodeCounterRef.current}`;
      const snapped = {
        x: Math.round(position.x / 16) * 16,
        y: Math.round(position.y / 16) * 16,
      };
      const newNode: FlowNode = {
        id,
        type: kind,
        position: snapped,
        data: createDefaultNodeData(kind),
      };
      setNodes((nds) => nds.concat(newNode));
      setSelectedNodeId(id);
      setSelectedEdgeId(null);
      if (execution.status !== "idle") {
        resetExecution();
      }
    },
    [setNodes, execution.status, resetExecution],
  );

  const handleQuickAddNode = useCallback(
    (kind: FlowNodeType) => {
      const rect = canvasWrapperRef.current?.getBoundingClientRect();
      const offset = (staggerRef.current % 5) * 28;
      staggerRef.current += 1;
      const center = rect
        ? reactFlow.screenToFlowPosition({
            x: rect.left + rect.width / 2 - 80 + offset,
            y: rect.top + rect.height / 2 - 40 + offset,
          })
        : { x: 240 + offset, y: 200 + offset };

      addNodeAtPosition(kind, center);
      setMobilePanel("canvas");
    },
    [reactFlow, addNodeAtPosition],
  );

  const handleDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const handleDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      const kind = event.dataTransfer.getData(
        "application/candychart-node",
      ) as FlowNodeType;
      if (!kind) return;

      const pos = reactFlow.screenToFlowPosition({
        x: event.clientX - 90,
        y: event.clientY - 32,
      });
      addNodeAtPosition(kind, pos);
    },
    [reactFlow, addNodeAtPosition],
  );

  const handleSelectionChange = useCallback(
    ({ nodes: selNodes, edges: selEdges }: OnSelectionChangeParams) => {
      if (selNodes.length > 0) {
        setSelectedNodeId(selNodes[0]!.id);
        setSelectedEdgeId(null);
      } else if (selEdges.length > 0) {
        setSelectedEdgeId(selEdges[0]!.id);
        setSelectedNodeId(null);
      } else {
        setSelectedNodeId(null);
        setSelectedEdgeId(null);
      }
    },
    [],
  );

  const handleUpdateNodeData = useCallback(
    (nodeId: string, patch: Partial<FlowNodeData>) => {
      setNodes((nds) =>
        nds.map((n) =>
          n.id === nodeId ? { ...n, data: { ...n.data, ...patch } } : n,
        ),
      );
      if (execution.status !== "idle") {
        resetExecution();
      }
    },
    [setNodes, execution.status, resetExecution],
  );

  const handleDeleteNode = useCallback(
    (nodeId: string) => {
      setNodes((nds) => nds.filter((n) => n.id !== nodeId));
      setEdges((eds) =>
        eds.filter((e) => e.source !== nodeId && e.target !== nodeId),
      );
      setSelectedNodeId(null);
      resetExecution();
    },
    [setNodes, setEdges, resetExecution],
  );

  const handleDeleteEdge = useCallback(
    (edgeId: string) => {
      setEdges((eds) => eds.filter((e) => e.id !== edgeId));
      setSelectedEdgeId(null);
      resetExecution();
    },
    [setEdges, resetExecution],
  );

  const handleSwapEdgeBranch = useCallback(
    (edgeId: string) => {
      setEdges((eds) => {
        const target = eds.find((e) => e.id === edgeId);
        if (!target) return eds;
        const srcNode = nodes.find((n) => n.id === target.source);
        if (!srcNode) return eds;

        let nextHandle = target.sourceHandle;
        if (srcNode.data.kind === "decision") {
          nextHandle = target.sourceHandle === "true" ? "false" : "true";
        } else if (srcNode.data.kind === "for") {
          nextHandle = target.sourceHandle === "loop" ? "exit" : "loop";
        } else {
          return eds;
        }

        const otherEdge = eds.find(
          (e) =>
            e.id !== edgeId &&
            e.source === target.source &&
            e.sourceHandle === nextHandle,
        );

        return eds.map((e) => {
          if (e.id === edgeId) {
            return makeStyledEdge({
              id: e.id,
              source: e.source,
              target: e.target,
              sourceHandle: nextHandle ?? undefined,
              targetHandle: e.targetHandle ?? undefined,
            });
          }
          if (otherEdge && e.id === otherEdge.id) {
            return makeStyledEdge({
              id: e.id,
              source: e.source,
              target: e.target,
              sourceHandle: target.sourceHandle ?? undefined,
              targetHandle: e.targetHandle ?? undefined,
            });
          }
          return e;
        });
      });
      resetExecution();
    },
    [setEdges, nodes, resetExecution],
  );

  const handleFocusNode = useCallback(
    (nodeId: string) => {
      const node = nodes.find((n) => n.id === nodeId);
      if (!node) return;
      setSelectedNodeId(nodeId);
      setSelectedEdgeId(null);
      setNodes((nds) =>
        nds.map((n) => ({ ...n, selected: n.id === nodeId })),
      );
      reactFlow.setCenter(node.position.x + 90, node.position.y + 40, {
        zoom: 1,
        duration: 350,
      });
      setFocusTrigger((c) => c + 1);
      setMobilePanel("canvas");
    },
    [nodes, reactFlow, setNodes],
  );

  const handleSelectTemplate = useCallback(
    (tpl: FlowchartTemplate) => {
      setNodes(tpl.nodes);
      setEdges(tpl.edges);
      setActiveTemplateId(tpl.id);
      setSelectedNodeId(null);
      setSelectedEdgeId(null);
      resetExecution();
      setTimeout(() => {
        reactFlow.fitView({ padding: 0.2, duration: 300 });
      }, 40);
    },
    [setNodes, setEdges, resetExecution, reactFlow],
  );

  const handleExportJson = useCallback(() => {
    const payload = JSON.stringify({ nodes, edges }, null, 2);
    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "candychart-akis-semasi.json";
    a.click();
    URL.revokeObjectURL(url);
  }, [nodes, edges]);

  const handleImportJson = useCallback(
    (jsonText: string) => {
      try {
        const parsed = JSON.parse(jsonText) as {
          nodes?: FlowNode[];
          edges?: FlowEdge[];
        };
        if (!Array.isArray(parsed.nodes) || !Array.isArray(parsed.edges)) {
          throw new Error("Geçersiz JSON formatı: nodes ve edges dizileri bulunamadı.");
        }
        setNodes(parsed.nodes);
        setEdges(
          parsed.edges.map((e) =>
            makeStyledEdge({
              id: e.id,
              source: e.source,
              target: e.target,
              sourceHandle: e.sourceHandle ?? undefined,
              targetHandle: e.targetHandle ?? undefined,
            }),
          ),
        );
        setActiveTemplateId("");
        resetExecution();
        setTimeout(() => reactFlow.fitView({ padding: 0.2, duration: 300 }), 40);
      } catch (err) {
        setExecution({
          ...createIdleExecutionState(),
          status: "error",
          error: {
            kind: "validation",
            message:
              err instanceof Error
                ? `JSON yüklenemedi: ${err.message}`
                : "JSON dosyası okunamadı.",
          },
        });
      }
    },
    [setNodes, setEdges, resetExecution, reactFlow],
  );

  const selectedEdgeCanSwap = useMemo(() => {
    if (!selectedEdge) return false;
    const src = nodes.find((n) => n.id === selectedEdge.source);
    return src?.data.kind === "decision" || src?.data.kind === "for";
  }, [selectedEdge, nodes]);

  return (
    <div className="flex h-dvh w-screen flex-col overflow-hidden bg-neutral-950">
      <Toolbar
        activeTemplateId={activeTemplateId}
        status={execution.status}
        animatedRun={animatedRun}
        errorCount={liveValidationErrors.length}
        onSelectTemplate={handleSelectTemplate}
        onToggleAnimatedRun={() => setAnimatedRun((v) => !v)}
        onRun={handleRun}
        onStep={handleStep}
        onReset={resetExecution}
        onFitView={() => reactFlow.fitView({ padding: 0.2, duration: 300 })}
        onExportJson={handleExportJson}
        onImportJson={handleImportJson}
      />

      <div className="relative flex flex-1 min-h-0 overflow-hidden">
        {/* Desktop Left Sidebar */}
        <aside className="hidden lg:flex w-60 xl:w-64 shrink-0 border-r border-neutral-800 h-full">
          <PaletteSidebar onAddNode={handleQuickAddNode} />
        </aside>

        {/* Center Flowchart Canvas */}
        <main
          ref={canvasWrapperRef}
          className="relative flex-1 min-w-0 h-full bg-[#141414]"
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <ReactFlow<FlowNode, FlowEdge>
            nodes={displayNodes}
            edges={displayEdges}
            nodeTypes={FLOW_NODE_TYPES}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={handleConnect}
            onClickConnectStart={() => setIsClickConnecting(true)}
            onClickConnectEnd={() => setIsClickConnecting(false)}
            onPaneClick={() => setIsClickConnecting(false)}
            onSelectionChange={handleSelectionChange}
            onNodeClick={(_, node) => {
              const now = Date.now();
              const prev = lastNodeTapRef.current;
              if (prev && prev.id === node.id && now - prev.time < 320) {
                lastNodeTapRef.current = null;
                setSelectedNodeId(node.id);
                setSelectedEdgeId(null);
                setFocusTrigger((c) => c + 1);
                setMobilePanel("inspector");
              } else {
                lastNodeTapRef.current = { id: node.id, time: now };
              }
            }}
            onNodeDoubleClick={(_, node) => {
              setSelectedNodeId(node.id);
              setSelectedEdgeId(null);
              setFocusTrigger((c) => c + 1);
              setMobilePanel("inspector");
            }}
            nodeDragThreshold={8}
            connectionDragThreshold={6}
            connectionRadius={38}
            connectOnClick
            panOnDrag
            zoomOnPinch
            zoomOnDoubleClick={false}
            snapToGrid
            snapGrid={[16, 16]}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            deleteKeyCode={["Backspace", "Delete"]}
            selectionKeyCode={null}
            multiSelectionKeyCode={null}
            zoomActivationKeyCode={null}
            panActivationKeyCode={null}
            defaultEdgeOptions={{
              type: "smoothstep",
              interactionWidth: 36,
            }}
            proOptions={{ hideAttribution: true }}
          >
            <Background
              variant={BackgroundVariant.Dots}
              gap={16}
              size={1.2}
              color="#303030"
            />
            <Controls className="!shadow-md !border !border-neutral-700 !rounded-lg overflow-hidden" />
            <MiniMap
              pannable
              zoomable
              nodeColor={(n) =>
                MINIMAP_COLORS[(n.data as FlowNodeData).kind] ?? "#737373"
              }
              className="hidden sm:block !border !border-neutral-700 !rounded-lg !shadow-md"
            />
          </ReactFlow>

          {isClickConnecting && (
            <div className="pointer-events-none absolute top-3 left-1/2 -translate-x-1/2 z-20 max-w-[90%] rounded-full border border-amber-500/60 bg-neutral-900/95 px-3.5 py-1.5 text-center text-[11px] font-semibold text-amber-300 shadow-lg">
              Hedef bağlantı noktasına dokunun (İptal: boşluğa dokunun)
            </div>
          )}

          {/* Touch-friendly Floating Quick Actions on Mobile/Tablet */}
          {mobilePanel === "canvas" && (selectedNode || selectedEdge) && (
            <div className="lg:hidden absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 rounded-full border border-neutral-700 bg-neutral-900/95 px-2.5 py-1.5 shadow-xl backdrop-blur-sm">
              {selectedNode && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setFocusTrigger((c) => c + 1);
                      setMobilePanel("inspector");
                    }}
                    className="inline-flex items-center gap-1.5 rounded-full bg-neutral-800 px-3 py-1 text-xs font-semibold text-neutral-100 hover:bg-neutral-700"
                  >
                    <Pencil className="h-3.5 w-3.5 text-amber-400" />
                    Düzenle
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteNode(selectedNode.id)}
                    className="inline-flex items-center gap-1 rounded-full bg-rose-950/80 px-3 py-1 text-xs font-semibold text-rose-300 hover:bg-rose-900/80"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Sil
                  </button>
                </>
              )}
              {selectedEdge && (
                <>
                  {selectedEdgeCanSwap && (
                    <button
                      type="button"
                      onClick={() => handleSwapEdgeBranch(selectedEdge.id)}
                      className="inline-flex items-center gap-1.5 rounded-full bg-neutral-800 px-3 py-1 text-xs font-semibold text-neutral-100 hover:bg-neutral-700"
                    >
                      <ArrowLeftRight className="h-3.5 w-3.5 text-amber-400" />
                      Dalı Değiştir
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDeleteEdge(selectedEdge.id)}
                    className="inline-flex items-center gap-1 rounded-full bg-rose-950/80 px-3 py-1 text-xs font-semibold text-rose-300 hover:bg-rose-900/80"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Bağlantıyı Sil
                  </button>
                </>
              )}
            </div>
          )}
        </main>

        {/* Desktop Right Sidebar: Inspector + Test Console */}
        <aside className="hidden lg:flex w-80 xl:w-96 shrink-0 border-l border-neutral-800 bg-neutral-900 flex-col h-full min-h-0">
          <InspectorPanel
            selectedNode={selectedNode}
            selectedEdge={selectedEdge}
            nodes={nodes}
            validationErrors={liveValidationErrors}
            focusTrigger={focusTrigger}
            onUpdateNodeData={handleUpdateNodeData}
            onDeleteNode={handleDeleteNode}
            onDeleteEdge={handleDeleteEdge}
            onSwapEdgeBranch={handleSwapEdgeBranch}
            onFocusNode={handleFocusNode}
          />
          <ConsolePanel
            execution={execution}
            allValidationErrors={runErrors}
            onSubmitInput={handleSubmitInput}
            onFocusNode={handleFocusNode}
            onRun={handleRun}
          />
        </aside>

        {/* Mobile & Tablet Overlay Panels (< lg) */}
        {mobilePanel !== "canvas" && (
          <div className="lg:hidden absolute inset-0 z-30 flex">
            <div
              className="absolute inset-0 bg-black/55 backdrop-blur-[1px]"
              onClick={() => setMobilePanel("canvas")}
            />

            {mobilePanel === "palette" && (
              <div className="relative z-10 w-72 max-w-[85vw] h-full border-r border-neutral-800 bg-neutral-900 shadow-2xl">
                <PaletteSidebar
                  onAddNode={handleQuickAddNode}
                  onClose={() => setMobilePanel("canvas")}
                />
              </div>
            )}

            {(mobilePanel === "inspector" || mobilePanel === "console") && (
              <div className="relative z-10 mt-auto md:mt-0 md:ml-auto w-full md:w-96 md:max-w-[85vw] h-[64dvh] md:h-full rounded-t-2xl md:rounded-none border-t md:border-t-0 md:border-l border-neutral-700 bg-neutral-900 shadow-2xl flex flex-col overflow-hidden">
                <div className="flex items-center justify-between border-b border-neutral-800 bg-neutral-950/70 px-3 py-2 shrink-0">
                  <div className="flex items-center gap-1 rounded-lg bg-neutral-900 p-0.5 border border-neutral-800">
                    <button
                      type="button"
                      onClick={() => setMobilePanel("inspector")}
                      className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                        mobilePanel === "inspector"
                          ? "bg-neutral-700 text-white"
                          : "text-neutral-400 hover:text-neutral-200"
                      }`}
                    >
                      <Sliders className="h-3.5 w-3.5" />
                      Özellikler
                    </button>
                    <button
                      type="button"
                      onClick={() => setMobilePanel("console")}
                      className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                        mobilePanel === "console"
                          ? "bg-neutral-700 text-white"
                          : "text-neutral-400 hover:text-neutral-200"
                      }`}
                    >
                      <Terminal className="h-3.5 w-3.5" />
                      Konsol
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMobilePanel("canvas")}
                    aria-label="Paneli kapat"
                    className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-800 hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {mobilePanel === "inspector" ? (
                  <div className="flex-1 min-h-0 overflow-y-auto">
                    <InspectorPanel
                      selectedNode={selectedNode}
                      selectedEdge={selectedEdge}
                      nodes={nodes}
                      validationErrors={liveValidationErrors}
                      focusTrigger={focusTrigger}
                      onUpdateNodeData={handleUpdateNodeData}
                      onDeleteNode={handleDeleteNode}
                      onDeleteEdge={handleDeleteEdge}
                      onSwapEdgeBranch={handleSwapEdgeBranch}
                      onFocusNode={handleFocusNode}
                    />
                  </div>
                ) : (
                  <ConsolePanel
                    execution={execution}
                    allValidationErrors={runErrors}
                    onSubmitInput={handleSubmitInput}
                    onFocusNode={handleFocusNode}
                    onRun={handleRun}
                  />
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Mobile & Tablet Bottom Navigation Bar (< lg) */}
      <nav
        aria-label="Mobil panel gezintisi"
        className="lg:hidden shrink-0 border-t border-neutral-800 bg-neutral-900 grid grid-cols-4 pb-[env(safe-area-inset-bottom)] select-none z-30"
      >
        <button
          type="button"
          onClick={() => setMobilePanel("canvas")}
          className={`flex flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium transition-colors ${
            mobilePanel === "canvas"
              ? "text-white bg-neutral-800/70"
              : "text-neutral-400 hover:text-neutral-200"
          }`}
        >
          <LayoutGrid className="h-4 w-4" />
          <span>Tuval</span>
        </button>

        <button
          type="button"
          onClick={() =>
            setMobilePanel((p) => (p === "palette" ? "canvas" : "palette"))
          }
          className={`flex flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium transition-colors ${
            mobilePanel === "palette"
              ? "text-white bg-neutral-800/70"
              : "text-neutral-400 hover:text-neutral-200"
          }`}
        >
          <Shapes className="h-4 w-4" />
          <span>Şekiller</span>
        </button>

        <button
          type="button"
          onClick={() =>
            setMobilePanel((p) => (p === "inspector" ? "canvas" : "inspector"))
          }
          className={`relative flex flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium transition-colors ${
            mobilePanel === "inspector"
              ? "text-white bg-neutral-800/70"
              : "text-neutral-400 hover:text-neutral-200"
          }`}
        >
          <Sliders className="h-4 w-4" />
          <span>Özellikler</span>
          {(selectedNode || selectedEdge || liveValidationErrors.length > 0) && (
            <span
              className={`absolute top-1.5 right-1/4 h-2 w-2 rounded-full ${
                liveValidationErrors.length > 0 ? "bg-rose-500" : "bg-amber-400"
              }`}
            />
          )}
        </button>

        <button
          type="button"
          onClick={() =>
            setMobilePanel((p) => (p === "console" ? "canvas" : "console"))
          }
          className={`relative flex flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium transition-colors ${
            mobilePanel === "console"
              ? "text-white bg-neutral-800/70"
              : "text-neutral-400 hover:text-neutral-200"
          }`}
        >
          <Terminal className="h-4 w-4" />
          <span>Konsol</span>
          {(execution.status === "waiting_input" ||
            execution.status === "error" ||
            execution.outputs.length > 0) && (
            <span
              className={`absolute top-1.5 right-1/4 h-2 w-2 rounded-full ${
                execution.status === "error"
                  ? "bg-rose-500"
                  : execution.status === "waiting_input"
                    ? "bg-amber-400 animate-pulse"
                    : "bg-emerald-400"
              }`}
            />
          )}
        </button>
      </nav>
    </div>
  );
}

export function App() {
  return (
    <ReactFlowProvider>
      <FlowchartStudio />
    </ReactFlowProvider>
  );
}

export default App;
