import { Handle, Position, type NodeProps, type NodeTypes } from "@xyflow/react";
import { AlertCircle, Flag, Play } from "lucide-react";
import type { FlowNode, FlowNodeData } from "../../types/flowchart";

function StatusRings({
  selected,
  isActive,
  hasError,
  syntaxError,
}: {
  selected?: boolean;
  isActive?: boolean;
  hasError?: boolean;
  syntaxError?: string | null;
}) {
  return (
    <>
      {isActive && (
        <div
          className="pointer-events-none absolute -inset-2 rounded-2xl border-2 border-emerald-400 bg-emerald-400/10 shadow-[0_0_22px_rgba(52,211,153,0.45)] animate-pulse"
          aria-hidden="true"
        />
      )}
      {hasError && (
        <div
          className="pointer-events-none absolute -inset-2 rounded-2xl border-2 border-rose-500 bg-rose-500/10 shadow-[0_0_22px_rgba(244,63,94,0.45)]"
          aria-hidden="true"
        />
      )}
      {selected && !isActive && !hasError && (
        <div
          className="pointer-events-none absolute -inset-1.5 rounded-2xl border-2 border-neutral-300/80 shadow-[0_0_0_3px_rgba(255,255,255,0.12)]"
          aria-hidden="true"
        />
      )}
      {(syntaxError || hasError) && (
        <div
          title={syntaxError || "Bu düğümde hata var"}
          className="absolute -top-2.5 -right-2.5 z-20 flex h-5 w-5 items-center justify-center rounded-full bg-rose-600 text-white shadow-md ring-2 ring-neutral-900"
        >
          <AlertCircle className="h-3.5 w-3.5" />
        </div>
      )}
    </>
  );
}

const BASE_HANDLE =
  "!w-3 !h-3 !border-2 !border-neutral-900 !shadow-sm transition-transform hover:!scale-125";

function StartNode({ data, selected }: NodeProps<FlowNode>) {
  return (
    <div className="relative flex h-[56px] w-[144px] items-center justify-center select-none">
      <StatusRings
        selected={selected}
        isActive={data.isActive}
        hasError={data.hasError}
        syntaxError={data.syntaxError}
      />
      <svg
        viewBox="0 0 144 56"
        className="absolute inset-0 h-full w-full drop-shadow-md"
      >
        <rect
          x="2"
          y="2"
          width="140"
          height="52"
          rx="26"
          ry="26"
          fill="#16251f"
          stroke="#10b981"
          strokeWidth="2.5"
        />
      </svg>
      <div className="relative z-10 flex items-center gap-1.5 text-emerald-200 font-bold text-sm">
        <Play className="h-3.5 w-3.5 fill-emerald-400 text-emerald-400" />
        <span className="truncate max-w-[96px]">{data.label || "Başlat"}</span>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className={`${BASE_HANDLE} !bg-emerald-400`}
      />
    </div>
  );
}

function EndNode({ data, selected }: NodeProps<FlowNode>) {
  return (
    <div className="relative flex h-[56px] w-[144px] items-center justify-center select-none">
      <StatusRings
        selected={selected}
        isActive={data.isActive}
        hasError={data.hasError}
        syntaxError={data.syntaxError}
      />
      <svg
        viewBox="0 0 144 56"
        className="absolute inset-0 h-full w-full drop-shadow-md"
      >
        <rect
          x="2"
          y="2"
          width="140"
          height="52"
          rx="26"
          ry="26"
          fill="#27161a"
          stroke="#f43f5e"
          strokeWidth="2.5"
        />
      </svg>
      <div className="relative z-10 flex items-center gap-1.5 text-rose-200 font-bold text-sm">
        <Flag className="h-3.5 w-3.5 text-rose-400" />
        <span className="truncate max-w-[96px]">{data.label || "Bitir"}</span>
      </div>
      <Handle
        type="target"
        position={Position.Top}
        className={`${BASE_HANDLE} !bg-rose-400`}
      />
    </div>
  );
}

function InputNode({ data, selected }: NodeProps<FlowNode>) {
  const vars = (data.varName ?? "").trim() || "x";
  return (
    <div className="relative flex h-[68px] w-[196px] items-center justify-center select-none">
      <StatusRings
        selected={selected}
        isActive={data.isActive}
        hasError={data.hasError}
        syntaxError={data.syntaxError}
      />
      <svg
        viewBox="0 0 196 68"
        className="absolute inset-0 h-full w-full drop-shadow-md"
      >
        <polygon
          points="22,2 193,2 174,66 3,66"
          fill="#261d17"
          stroke="#fb923c"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
      </svg>
      <div className="relative z-10 flex flex-col items-center justify-center px-7 text-center">
        <span className="text-[10px] font-bold uppercase tracking-wider text-orange-400">
          Girdi (Input)
        </span>
        <span className="font-mono text-xs font-semibold text-neutral-100 truncate max-w-[136px]">
          {vars}
        </span>
      </div>
      <Handle
        type="target"
        position={Position.Top}
        className={`${BASE_HANDLE} !bg-orange-400`}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className={`${BASE_HANDLE} !bg-orange-400`}
      />
    </div>
  );
}

function ProcessNode({ data, selected }: NodeProps<FlowNode>) {
  const code = (data.code ?? "").trim() || "x = 0";
  const lines = code.split("\n").slice(0, 4);
  const hasMore = code.split("\n").length > 4;

  return (
    <div className="relative min-h-[68px] w-[184px] rounded-lg border-[2.5px] border-neutral-400 bg-neutral-800 shadow-md select-none">
      <StatusRings
        selected={selected}
        isActive={data.isActive}
        hasError={data.hasError}
        syntaxError={data.syntaxError}
      />
      <div className="rounded-t-[5px] bg-neutral-700/70 px-2.5 py-0.5 border-b border-neutral-600/80 flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-200">
          İşlem (Process)
        </span>
        {data.label && data.label !== "İşlem" && (
          <span className="text-[10px] text-neutral-400 truncate max-w-[72px]">
            {data.label}
          </span>
        )}
      </div>
      <div className="px-2.5 py-2 font-mono text-xs text-neutral-100 space-y-0.5 text-center">
        {lines.map((line, idx) => (
          <div key={idx} className="truncate">
            {line}
          </div>
        ))}
        {hasMore && <div className="text-[10px] text-neutral-400">...</div>}
      </div>
      <Handle
        type="target"
        position={Position.Top}
        className={`${BASE_HANDLE} !bg-neutral-300`}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className={`${BASE_HANDLE} !bg-neutral-300`}
      />
    </div>
  );
}

function DecisionNode({ data, selected }: NodeProps<FlowNode>) {
  const cond = (data.condition ?? "").trim() || "x > 0";
  return (
    <div className="relative flex h-[112px] w-[204px] items-center justify-center select-none">
      <StatusRings
        selected={selected}
        isActive={data.isActive}
        hasError={data.hasError}
        syntaxError={data.syntaxError}
      />
      <svg
        viewBox="0 0 204 112"
        className="absolute inset-0 h-full w-full drop-shadow-md"
      >
        <polygon
          points="102,3 201,56 102,109 3,56"
          fill="#262015"
          stroke="#f59e0b"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
      </svg>
      <div className="relative z-10 flex flex-col items-center justify-center px-9 text-center">
        <span className="text-[9px] font-bold uppercase tracking-wider text-amber-400">
          Karar (If-Else)
        </span>
        <span className="font-mono text-xs font-semibold text-neutral-100 line-clamp-2 max-w-[118px] break-all">
          {cond}
        </span>
      </div>

      <Handle
        id="in"
        type="target"
        position={Position.Top}
        className={`${BASE_HANDLE} !bg-amber-400`}
      />

      <Handle
        id="true"
        type="source"
        position={Position.Left}
        className={`${BASE_HANDLE} !bg-emerald-400`}
      />
      <span className="pointer-events-none absolute -left-9 top-1/2 -translate-y-1/2 rounded bg-emerald-950/90 px-1.5 py-0.5 text-[10px] font-bold text-emerald-300 shadow-xs border border-emerald-700/70">
        Evet
      </span>

      <Handle
        id="false"
        type="source"
        position={Position.Right}
        className={`${BASE_HANDLE} !bg-rose-400`}
      />
      <span className="pointer-events-none absolute -right-10 top-1/2 -translate-y-1/2 rounded bg-rose-950/90 px-1.5 py-0.5 text-[10px] font-bold text-rose-300 shadow-xs border border-rose-700/70">
        Hayır
      </span>
    </div>
  );
}

function ForNode({ data, selected }: NodeProps<FlowNode>) {
  const header = (data.forHeader ?? "").trim() || "[ i=1; i<n; i++ ]";
  return (
    <div className="relative flex h-[76px] w-[248px] items-center justify-center select-none">
      <StatusRings
        selected={selected}
        isActive={data.isActive}
        hasError={data.hasError}
        syntaxError={data.syntaxError}
      />
      <svg
        viewBox="0 0 248 76"
        className="absolute inset-0 h-full w-full drop-shadow-md"
      >
        <polygon
          points="24,3 224,3 245,38 224,73 24,73 3,38"
          fill="#221b2b"
          stroke="#a78bfa"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
      </svg>
      <div className="relative z-10 flex flex-col items-center justify-center px-8 text-center">
        <span className="text-[9px] font-bold uppercase tracking-wider text-violet-300">
          For Döngüsü
        </span>
        <span className="font-mono text-xs font-semibold text-neutral-100 truncate max-w-[186px]">
          {header}
        </span>
      </div>

      <Handle
        id="in"
        type="target"
        position={Position.Top}
        className={`${BASE_HANDLE} !bg-violet-400`}
      />

      <Handle
        id="loop-back"
        type="target"
        position={Position.Left}
        className={`${BASE_HANDLE} !bg-violet-300`}
      />
      <span className="pointer-events-none absolute -left-8 top-1/2 -translate-y-1/2 rounded bg-violet-950/90 px-1 py-0.5 text-[9px] font-bold text-violet-300 border border-violet-700/70">
        Geri
      </span>

      <Handle
        id="loop"
        type="source"
        position={Position.Bottom}
        className={`${BASE_HANDLE} !bg-violet-400`}
      />
      <span className="pointer-events-none absolute left-1/2 -bottom-6 -translate-x-1/2 rounded bg-violet-950/90 px-1.5 py-0.5 text-[10px] font-bold text-violet-300 border border-violet-700/70 whitespace-nowrap">
        Döngü
      </span>

      <Handle
        id="exit"
        type="source"
        position={Position.Right}
        className={`${BASE_HANDLE} !bg-neutral-400`}
      />
      <span className="pointer-events-none absolute -right-10 top-1/2 -translate-y-1/2 rounded bg-neutral-800 px-1.5 py-0.5 text-[10px] font-bold text-neutral-300 border border-neutral-600">
        Bitti
      </span>
    </div>
  );
}

function OutputNode({ data, selected }: NodeProps<FlowNode>) {
  const expr = (data.expression ?? "").trim() || '"Sonuç"';
  return (
    <div className="relative flex h-[72px] w-[196px] items-center justify-center select-none">
      <StatusRings
        selected={selected}
        isActive={data.isActive}
        hasError={data.hasError}
        syntaxError={data.syntaxError}
      />
      <svg
        viewBox="0 0 196 72"
        className="absolute inset-0 h-full w-full drop-shadow-md"
      >
        <path
          d="M 4,3 L 192,3 L 192,54 Q 145,42 98,56 Q 51,70 4,56 Z"
          fill="#162524"
          stroke="#2dd4bf"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
      </svg>
      <div className="relative z-10 flex flex-col items-center justify-center px-4 pb-2.5 text-center">
        <span className="text-[10px] font-bold uppercase tracking-wider text-teal-300">
          Çıktı (Output)
        </span>
        <span className="font-mono text-xs font-semibold text-neutral-100 truncate max-w-[162px]">
          {expr}
        </span>
      </div>
      <Handle
        type="target"
        position={Position.Top}
        style={{ top: 0 }}
        className={`${BASE_HANDLE} !bg-teal-400`}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ bottom: 13 }}
        className={`${BASE_HANDLE} !bg-teal-400`}
      />
    </div>
  );
}

export const FLOW_NODE_TYPES: NodeTypes = {
  start: StartNode,
  end: EndNode,
  input: InputNode,
  process: ProcessNode,
  decision: DecisionNode,
  for: ForNode,
  output: OutputNode,
};

export function createDefaultNodeData(kind: FlowNodeData["kind"]): FlowNodeData {
  switch (kind) {
    case "start":
      return { kind: "start", label: "Başlat" };
    case "end":
      return { kind: "end", label: "Bitir" };
    case "input":
      return {
        kind: "input",
        label: "Girdi",
        varName: "n",
        prompt: "Bir değer giriniz",
        valueType: "auto",
      };
    case "process":
      return {
        kind: "process",
        label: "İşlem",
        code: "toplam = 0",
      };
    case "decision":
      return {
        kind: "decision",
        label: "Karar",
        condition: "x > 0",
      };
    case "for":
      return {
        kind: "for",
        label: "For Döngüsü",
        forHeader: "[ i=1; i<n; i++ ]",
      };
    case "output":
      return {
        kind: "output",
        label: "Çıktı",
        expression: "toplam",
      };
  }
}
