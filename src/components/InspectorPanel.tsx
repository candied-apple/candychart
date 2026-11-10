import { useEffect, useRef } from "react";
import {
  AlertTriangle,
  ArrowLeftRight,
  CheckCircle2,
  Sliders,
  Trash2,
} from "lucide-react";
import { parseForHeader } from "../engine/parser";
import { validateNodeSyntax } from "../engine/validator";
import type {
  FlowchartError,
  FlowEdge,
  FlowNode,
  FlowNodeData,
  InputValueType,
} from "../types/flowchart";

interface InspectorPanelProps {
  selectedNode: FlowNode | null;
  selectedEdge: FlowEdge | null;
  nodes: FlowNode[];
  validationErrors: FlowchartError[];
  focusTrigger: number;
  onUpdateNodeData: (nodeId: string, patch: Partial<FlowNodeData>) => void;
  onDeleteNode: (nodeId: string) => void;
  onDeleteEdge: (edgeId: string) => void;
  onSwapEdgeBranch: (edgeId: string) => void;
  onFocusNode: (nodeId: string) => void;
}

const KIND_BADGE: Record<
  FlowNodeData["kind"],
  { title: string; badgeClass: string }
> = {
  start: {
    title: "Başlat (Oval)",
    badgeClass: "bg-emerald-950/80 text-emerald-300 border-emerald-700/60",
  },
  end: {
    title: "Bitir (Oval)",
    badgeClass: "bg-rose-950/80 text-rose-300 border-rose-700/60",
  },
  input: {
    title: "Girdi / Input (Paralelkenar)",
    badgeClass: "bg-orange-950/80 text-orange-300 border-orange-700/60",
  },
  process: {
    title: "İşlem / Process (Dikdörtgen)",
    badgeClass: "bg-neutral-800 text-neutral-200 border-neutral-600",
  },
  decision: {
    title: "Karar / If-Else (Elmas)",
    badgeClass: "bg-amber-950/80 text-amber-300 border-amber-700/60",
  },
  for: {
    title: "For Döngüsü (Uzun Altıgen)",
    badgeClass: "bg-violet-950/80 text-violet-300 border-violet-700/60",
  },
  output: {
    title: "Çıktı / Output (Dalgalı Kutu)",
    badgeClass: "bg-teal-950/80 text-teal-300 border-teal-700/60",
  },
};

const INPUT_CLS =
  "w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 md:py-1.5 text-base md:text-xs text-neutral-100 placeholder:text-neutral-500 focus:border-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-500/20";

export function InspectorPanel({
  selectedNode,
  selectedEdge,
  nodes,
  validationErrors,
  focusTrigger,
  onUpdateNodeData,
  onDeleteNode,
  onDeleteEdge,
  onSwapEdgeBranch,
  onFocusNode,
}: InspectorPanelProps) {
  const primaryInputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(
    null,
  );

  useEffect(() => {
    if (focusTrigger > 0 && primaryInputRef.current) {
      primaryInputRef.current.focus();
      if ("select" in primaryInputRef.current) {
        primaryInputRef.current.select();
      }
    }
  }, [focusTrigger, selectedNode?.id]);

  if (selectedNode) {
    const kind = selectedNode.data.kind;
    const badge = KIND_BADGE[kind];
    const syntaxErr = validateNodeSyntax(selectedNode);

    let forBreakdown: { hasInit: boolean; hasCond: boolean; hasUpdate: boolean } | null =
      null;
    if (kind === "for" && !syntaxErr) {
      try {
        const parsed = parseForHeader(selectedNode.data.forHeader ?? "");
        forBreakdown = {
          hasInit: parsed.init.length > 0,
          hasCond: parsed.condition !== null,
          hasUpdate: parsed.update.length > 0,
        };
      } catch {
        forBreakdown = null;
      }
    }

    return (
      <div className="flex flex-col border-b border-neutral-800 bg-neutral-900 overflow-y-auto">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-neutral-800 bg-neutral-950/50">
          <span
            className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-bold ${badge.badgeClass}`}
          >
            {badge.title}
          </span>
          <button
            type="button"
            onClick={() => onDeleteNode(selectedNode.id)}
            title="Düğümü sil"
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-rose-400 hover:bg-rose-950/60 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Sil
          </button>
        </div>

        <div className="p-4 space-y-3 text-xs">
          {(kind === "start" || kind === "end") && (
            <div>
              <label className="block font-semibold text-neutral-300 mb-1">
                Etiket
              </label>
              <input
                ref={(el) => {
                  primaryInputRef.current = el;
                }}
                type="text"
                value={selectedNode.data.label ?? ""}
                onChange={(e) =>
                  onUpdateNodeData(selectedNode.id, { label: e.target.value })
                }
                placeholder={kind === "start" ? "Başlat" : "Bitir"}
                className={INPUT_CLS}
              />
            </div>
          )}

          {kind === "input" && (
            <>
              <div>
                <label className="block font-semibold text-neutral-300 mb-1">
                  Değişken Adı (veya virgülle çoklu)
                </label>
                <input
                  ref={(el) => {
                    primaryInputRef.current = el;
                  }}
                  type="text"
                  value={selectedNode.data.varName ?? ""}
                  onChange={(e) =>
                    onUpdateNodeData(selectedNode.id, { varName: e.target.value })
                  }
                  placeholder="ör: n veya a, b"
                  className={`${INPUT_CLS} font-mono`}
                />
              </div>
              <div>
                <label className="block font-semibold text-neutral-300 mb-1">
                  Kullanıcıya Gösterilecek Mesaj (Prompt)
                </label>
                <input
                  type="text"
                  value={selectedNode.data.prompt ?? ""}
                  onChange={(e) =>
                    onUpdateNodeData(selectedNode.id, { prompt: e.target.value })
                  }
                  placeholder="ör: Bir sayı giriniz"
                  className={INPUT_CLS}
                />
              </div>
              <div>
                <label className="block font-semibold text-neutral-300 mb-1">
                  Girdi Tipi
                </label>
                <select
                  value={selectedNode.data.valueType ?? "auto"}
                  onChange={(e) =>
                    onUpdateNodeData(selectedNode.id, {
                      valueType: e.target.value as InputValueType,
                    })
                  }
                  className={INPUT_CLS}
                >
                  <option value="auto">Otomatik (Sayı / Metin / Mantıksal)</option>
                  <option value="number">Sadece Sayı (Number)</option>
                  <option value="text">Metin (Text / String)</option>
                </select>
              </div>
            </>
          )}

          {kind === "process" && (
            <>
              <div>
                <label className="block font-semibold text-neutral-300 mb-1">
                  İşlem Başlığı (İsteğe Bağlı)
                </label>
                <input
                  type="text"
                  value={selectedNode.data.label ?? ""}
                  onChange={(e) =>
                    onUpdateNodeData(selectedNode.id, { label: e.target.value })
                  }
                  placeholder="İşlem"
                  className={INPUT_CLS}
                />
              </div>
              <div>
                <label className="block font-semibold text-neutral-300 mb-1">
                  İşlem İfadeleri (Her satıra bir işlem)
                </label>
                <textarea
                  ref={(el) => {
                    primaryInputRef.current = el;
                  }}
                  rows={4}
                  value={selectedNode.data.code ?? ""}
                  onChange={(e) =>
                    onUpdateNodeData(selectedNode.id, { code: e.target.value })
                  }
                  placeholder={"toplam = 0\nsayac += 1"}
                  spellCheck={false}
                  className={`${INPUT_CLS} py-2 font-mono text-xs`}
                />
                <p className="mt-1 text-[11px] text-neutral-400">
                  Örnekler: <code className="text-neutral-200">x = a + b</code>,{" "}
                  <code className="text-neutral-200">toplam += i</code>,{" "}
                  <code className="text-neutral-200">i++</code>,{" "}
                  <code className="text-neutral-200">sqrt(x)</code>
                </p>
              </div>
            </>
          )}

          {kind === "decision" && (
            <div>
              <label className="block font-semibold text-neutral-300 mb-1">
                Koşul İfadesi (If-Else)
              </label>
              <input
                ref={(el) => {
                  primaryInputRef.current = el;
                }}
                type="text"
                value={selectedNode.data.condition ?? ""}
                onChange={(e) =>
                  onUpdateNodeData(selectedNode.id, { condition: e.target.value })
                }
                placeholder="ör: sayi > 0 && sayi < 100"
                spellCheck={false}
                className={`${INPUT_CLS} font-mono`}
              />
              <div className="mt-2 flex flex-wrap gap-1">
                {[
                  { label: "&&", insert: " && " },
                  { label: "||", insert: " || " },
                  { label: "!", insert: "!" },
                  { label: "==", insert: " == " },
                  { label: "!=", insert: " != " },
                  { label: "<", insert: " < " },
                  { label: "<=", insert: " <= " },
                  { label: ">", insert: " > " },
                  { label: ">=", insert: " >= " },
                  { label: "()", insert: "()" },
                ].map((op) => (
                  <button
                    key={op.label}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      const el = primaryInputRef.current as HTMLInputElement | null;
                      const cur = selectedNode.data.condition ?? "";
                      const start = el?.selectionStart ?? cur.length;
                      const end = el?.selectionEnd ?? cur.length;
                      const next = cur.slice(0, start) + op.insert + cur.slice(end);
                      onUpdateNodeData(selectedNode.id, { condition: next });
                      const caret =
                        op.label === "()" ? start + 1 : start + op.insert.length;
                      requestAnimationFrame(() => {
                        el?.focus();
                        el?.setSelectionRange(caret, caret);
                      });
                    }}
                    className="rounded border border-neutral-700 bg-neutral-800 px-2 py-1 font-mono text-[11px] font-semibold text-amber-300 hover:bg-neutral-700 active:bg-neutral-600 transition-colors"
                  >
                    {op.label}
                  </button>
                ))}
              </div>
              <p className="mt-1.5 text-[11px] text-neutral-400">
                Örnek: <code className="text-neutral-200">x &gt; 0 &amp;&amp; y &lt; 10</code>,{" "}
                <code className="text-neutral-200">a == 1 || b == 2</code>,{" "}
                <code className="text-neutral-200">!(x == 0)</code>
              </p>
              <p className="mt-1 text-[11px] text-neutral-400">
                Koşul doğruysa <span className="font-bold text-emerald-400">Evet (Sol)</span>,
                yanlışsa <span className="font-bold text-rose-400">Hayır (Sağ)</span> dalından devam eder.
              </p>
            </div>
          )}

          {kind === "for" && (
            <div>
              <label className="block font-semibold text-neutral-300 mb-1">
                For Döngüsü İfadesi
              </label>
              <input
                ref={(el) => {
                  primaryInputRef.current = el;
                }}
                type="text"
                value={selectedNode.data.forHeader ?? ""}
                onChange={(e) =>
                  onUpdateNodeData(selectedNode.id, { forHeader: e.target.value })
                }
                placeholder="[ i=1; i<n; i++ ]"
                spellCheck={false}
                className={`${INPUT_CLS} font-mono`}
              />
              {forBreakdown && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <span className="rounded bg-violet-950/70 px-1.5 py-0.5 text-[10px] font-medium text-violet-300 border border-violet-700/60">
                    Başlangıç: {forBreakdown.hasInit ? "Var" : "Boş"}
                  </span>
                  <span className="rounded bg-violet-950/70 px-1.5 py-0.5 text-[10px] font-medium text-violet-300 border border-violet-700/60">
                    Koşul: {forBreakdown.hasCond ? "Var" : "Sonsuz"}
                  </span>
                  <span className="rounded bg-violet-950/70 px-1.5 py-0.5 text-[10px] font-medium text-violet-300 border border-violet-700/60">
                    Artış: {forBreakdown.hasUpdate ? "Var" : "Boş"}
                  </span>
                </div>
              )}
              <p className="mt-1.5 text-[11px] text-neutral-400 leading-relaxed">
                Döngü gövdesini alttaki <span className="font-bold text-violet-300">Döngü</span> ucundan çıkarıp
                soldaki <span className="font-bold text-violet-300">Geri</span> ucuna geri bağlayın. Çıkışı sağdaki{" "}
                <span className="font-bold text-neutral-200">Bitti</span> ucundan devam ettirin.
              </p>
            </div>
          )}

          {kind === "output" && (
            <div>
              <label className="block font-semibold text-neutral-300 mb-1">
                Yazdırılacak İfade
              </label>
              <input
                ref={(el) => {
                  primaryInputRef.current = el;
                }}
                type="text"
                value={selectedNode.data.expression ?? ""}
                onChange={(e) =>
                  onUpdateNodeData(selectedNode.id, { expression: e.target.value })
                }
                placeholder='"Sonuç:", toplam'
                spellCheck={false}
                className={`${INPUT_CLS} font-mono`}
              />
              <p className="mt-1 text-[11px] text-neutral-400">
                Örnek: <code className="text-neutral-200">toplam</code> veya{" "}
                <code className="text-neutral-200">"Sonuç =", x * 2</code>
              </p>
            </div>
          )}

          {syntaxErr && (
            <div className="flex items-start gap-2 rounded-lg border border-rose-700/60 bg-rose-950/60 px-2.5 py-2 text-[11px] text-rose-200">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-rose-400" />
              <span>{syntaxErr}</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (selectedEdge) {
    const sourceNode = nodes.find((n) => n.id === selectedEdge.source);
    const targetNode = nodes.find((n) => n.id === selectedEdge.target);
    const canSwap =
      sourceNode?.data.kind === "decision" || sourceNode?.data.kind === "for";

    return (
      <div className="flex flex-col border-b border-neutral-800 bg-neutral-900 overflow-y-auto">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-neutral-800 bg-neutral-950/50">
          <span className="text-xs font-bold text-neutral-200">
            Bağlantı (Akış Oku)
          </span>
          <button
            type="button"
            onClick={() => onDeleteEdge(selectedEdge.id)}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-rose-400 hover:bg-rose-950/60 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Sil
          </button>
        </div>
        <div className="p-4 space-y-3 text-xs">
          <div className="rounded-lg bg-neutral-800/80 border border-neutral-700 p-2.5 space-y-1">
            <div className="text-neutral-400">
              Kaynak:{" "}
              <span className="font-semibold text-neutral-100">
                {sourceNode?.data.label || selectedEdge.source}
              </span>
            </div>
            <div className="text-neutral-400">
              Hedef:{" "}
              <span className="font-semibold text-neutral-100">
                {targetNode?.data.label || selectedEdge.target}
              </span>
            </div>
            {selectedEdge.label && (
              <div className="text-neutral-400">
                Dal:{" "}
                <span className="font-bold text-white">
                  {String(selectedEdge.label)}
                </span>
              </div>
            )}
          </div>
          {canSwap && (
            <button
              type="button"
              onClick={() => onSwapEdgeBranch(selectedEdge.id)}
              className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-1.5 text-xs font-semibold text-neutral-200 hover:bg-neutral-700 transition-colors"
            >
              <ArrowLeftRight className="h-3.5 w-3.5" />
              Dalı Değiştir (
              {sourceNode?.data.kind === "decision"
                ? "Evet ↔ Hayır"
                : "Döngü ↔ Bitti"}
              )
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col border-b border-neutral-800 bg-neutral-900">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-neutral-800 bg-neutral-950/50">
        <Sliders className="h-3.5 w-3.5 text-neutral-400" />
        <span className="text-xs font-bold uppercase tracking-wider text-neutral-300">
          Özellikler & Doğrulama
        </span>
      </div>
      <div className="p-4 space-y-3 text-xs">
        <p className="text-neutral-400">
          Düzenlemek için tuvalden bir düğüme veya bağlantı okuna tıklayın.
        </p>

        {validationErrors.length === 0 ? (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-700/50 bg-emerald-950/40 px-3 py-2 text-emerald-300">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
            <span className="font-medium">
              Akış şeması geçerli, test etmeye hazır!
            </span>
          </div>
        ) : (
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 font-semibold text-rose-400">
              <AlertTriangle className="h-3.5 w-3.5" />
              {validationErrors.length} Doğrulama Sorunu
            </div>
            <div className="max-h-32 overflow-y-auto space-y-1">
              {validationErrors.map((err, idx) => (
                <button
                  key={idx}
                  type="button"
                  disabled={!err.nodeId}
                  onClick={() => err.nodeId && onFocusNode(err.nodeId)}
                  className="w-full text-left rounded-md border border-rose-800/60 bg-rose-950/50 px-2.5 py-1.5 text-[11px] text-rose-200 hover:bg-rose-900/50 disabled:cursor-default transition-colors"
                >
                  {err.nodeLabel && (
                    <span className="font-bold mr-1">[{err.nodeLabel}]</span>
                  )}
                  {err.message}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
