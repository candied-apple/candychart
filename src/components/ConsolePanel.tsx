import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  AlertOctagon,
  CheckCircle2,
  CornerDownLeft,
  Crosshair,
  ListTree,
  Play,
  Terminal,
  Variable,
} from "lucide-react";
import { formatValue } from "../engine/evaluator";
import type { ExecutionState, FlowchartError } from "../types/flowchart";

interface ConsolePanelProps {
  execution: ExecutionState;
  allValidationErrors: FlowchartError[];
  onSubmitInput: (value: string) => void;
  onFocusNode: (nodeId: string) => void;
  onRun: () => void;
}

type ConsoleTab = "output" | "variables" | "trace";

const ERROR_KIND_LABEL: Record<FlowchartError["kind"], string> = {
  validation: "Doğrulama Hatası",
  syntax: "Sözdizimi Hatası",
  runtime: "Çalışma Zamanı Hatası",
  infinite_loop: "Sonsuz Döngü Hatası",
};

export function ConsolePanel({
  execution,
  allValidationErrors,
  onSubmitInput,
  onFocusNode,
  onRun,
}: ConsolePanelProps) {
  const [tab, setTab] = useState<ConsoleTab>("output");
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);
  const consoleEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (execution.status === "waiting_input") {
      setTab("output");
      setInputValue("");
      setTimeout(() => inputRef.current?.focus(), 20);
    }
  }, [execution.status, execution.pendingInput?.nodeId]);

  useEffect(() => {
    if (execution.status === "error") {
      setTab("output");
    }
  }, [execution.status]);

  useEffect(() => {
    consoleEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [execution.outputs.length, execution.status]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmitInput(inputValue);
    setInputValue("");
  };

  const variableEntries = Object.entries(execution.variables);

  const statusBadge = (() => {
    switch (execution.status) {
      case "idle":
        return {
          text: "Hazır",
          cls: "bg-neutral-800 text-neutral-300 border-neutral-700",
        };
      case "running":
        return {
          text: "Çalışıyor",
          cls: "bg-neutral-700 text-neutral-100 border-neutral-500 animate-pulse",
        };
      case "waiting_input":
        return {
          text: "Girdi Bekliyor",
          cls: "bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse",
        };
      case "paused":
        return {
          text: "Duraklatıldı",
          cls: "bg-amber-500/20 text-amber-300 border-amber-500/40",
        };
      case "completed":
        return {
          text: "Tamamlandı",
          cls: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
        };
      case "error":
        return {
          text: "Hata",
          cls: "bg-rose-500/20 text-rose-300 border-rose-500/50",
        };
    }
  })();

  return (
    <div className="flex flex-1 min-h-0 flex-col bg-neutral-950 text-neutral-100">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-neutral-800 px-3 py-2 bg-neutral-900">
        <div className="flex items-center gap-2">
          <Terminal className="h-4 w-4 text-emerald-400" />
          <span className="text-xs font-bold tracking-wide text-neutral-200">
            Program Test & Konsol
          </span>
          <span
            className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusBadge.cls}`}
          >
            {statusBadge.text}
          </span>
        </div>
        <span className="text-[11px] font-mono text-neutral-400">
          Adım: {execution.stepCount}
        </span>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-neutral-800 bg-neutral-900/60 px-2 pt-1 gap-1 text-[11px]">
        <button
          type="button"
          onClick={() => setTab("output")}
          className={`flex items-center gap-1.5 rounded-t-md px-2.5 py-1.5 font-medium transition-colors ${
            tab === "output"
              ? "bg-neutral-950 text-white border-t border-x border-neutral-800"
              : "text-neutral-400 hover:text-neutral-200"
          }`}
        >
          <Terminal className="h-3 w-3" />
          Çıktı
          {execution.outputs.length > 0 && (
            <span className="rounded bg-neutral-800 px-1 text-[10px] text-teal-300">
              {execution.outputs.length}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setTab("variables")}
          className={`flex items-center gap-1.5 rounded-t-md px-2.5 py-1.5 font-medium transition-colors ${
            tab === "variables"
              ? "bg-neutral-950 text-white border-t border-x border-neutral-800"
              : "text-neutral-400 hover:text-neutral-200"
          }`}
        >
          <Variable className="h-3 w-3" />
          Değişkenler
          {variableEntries.length > 0 && (
            <span className="rounded bg-neutral-800 px-1 text-[10px] text-neutral-300">
              {variableEntries.length}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setTab("trace")}
          className={`flex items-center gap-1.5 rounded-t-md px-2.5 py-1.5 font-medium transition-colors ${
            tab === "trace"
              ? "bg-neutral-950 text-white border-t border-x border-neutral-800"
              : "text-neutral-400 hover:text-neutral-200"
          }`}
        >
          <ListTree className="h-3 w-3" />
          İzleme
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 min-h-0 overflow-y-auto p-3 font-mono text-xs space-y-2">
        {tab === "output" && (
          <>
            {execution.status === "idle" &&
              execution.outputs.length === 0 &&
              !execution.error && (
                <div className="flex flex-col items-center justify-center py-8 text-center text-neutral-400 font-sans space-y-3">
                  <p className="text-xs max-w-[240px]">
                    Akış şemanızı test etmek için yukarıdaki{" "}
                    <strong className="text-emerald-400">Çalıştır</strong> butonuna basın.
                  </p>
                  <button
                    type="button"
                    onClick={onRun}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 transition-colors shadow-sm"
                  >
                    <Play className="h-3.5 w-3.5 fill-current" />
                    Programı Test Et
                  </button>
                </div>
              )}

            {execution.outputs.map((out) => (
              <div
                key={out.id}
                className="flex items-start gap-2 rounded bg-neutral-900 px-2.5 py-1.5 border border-neutral-800"
              >
                <span className="text-teal-400 select-none font-bold">&gt;</span>
                <span className="text-neutral-100 whitespace-pre-wrap break-words flex-1">
                  {out.text}
                </span>
              </div>
            ))}

            {/* Interactive Input Prompt */}
            {execution.status === "waiting_input" && execution.pendingInput && (
              <form
                onSubmit={handleSubmit}
                className="rounded-lg border border-amber-500/50 bg-neutral-900 p-3 space-y-2 font-sans"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-amber-300">
                    {execution.pendingInput.prompt}
                  </span>
                  <span className="rounded bg-neutral-800 px-1.5 py-0.5 font-mono text-[10px] text-orange-300 border border-neutral-700">
                    {execution.pendingInput.varNames.join(", ")}
                  </span>
                </div>
                <div className="flex gap-1.5">
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder={
                      execution.pendingInput.varNames.length > 1
                        ? `Değerleri virgülle girin (${execution.pendingInput.varNames.join(", ")})`
                        : "Değer yazıp Enter'a basın..."
                    }
                    className="flex-1 min-w-0 rounded-md border border-neutral-700 bg-neutral-950 px-2.5 py-2 md:py-1.5 font-mono text-base md:text-xs text-white placeholder:text-neutral-500 focus:border-neutral-400 focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1 rounded-md bg-neutral-200 px-3 py-2 md:py-1.5 text-xs font-semibold text-neutral-900 hover:bg-white transition-colors shrink-0"
                  >
                    Gönder
                    <CornerDownLeft className="h-3 w-3" />
                  </button>
                </div>
              </form>
            )}

            {/* Completion banner */}
            {execution.status === "completed" && (
              <div className="flex items-center gap-2 rounded-lg border border-emerald-700/50 bg-emerald-950/40 px-3 py-2 text-emerald-300 font-sans text-xs">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                <span>
                  Program hatasız tamamlandı ({execution.stepCount} adım).
                </span>
              </div>
            )}

            {/* Error display */}
            {execution.status === "error" && execution.error && (
              <div className="space-y-2 font-sans">
                <div className="rounded-lg border border-rose-500/60 bg-rose-950/60 p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-rose-300 font-bold text-xs">
                      <AlertOctagon className="h-4 w-4 shrink-0 text-rose-400" />
                      <span>{ERROR_KIND_LABEL[execution.error.kind]}</span>
                    </div>
                    {execution.error.nodeId && (
                      <button
                        type="button"
                        onClick={() => onFocusNode(execution.error!.nodeId!)}
                        className="inline-flex items-center gap-1 rounded bg-rose-900/70 px-2 py-0.5 text-[10px] font-semibold text-rose-200 hover:bg-rose-800 transition-colors"
                      >
                        <Crosshair className="h-3 w-3" />
                        Düğüme Git
                      </button>
                    )}
                  </div>
                  {execution.error.nodeLabel && (
                    <div className="text-[11px] text-rose-200/80 font-mono">
                      Düğüm: {execution.error.nodeLabel}
                    </div>
                  )}
                  <p className="text-xs text-rose-100 leading-relaxed">
                    {execution.error.message}
                  </p>
                </div>

                {allValidationErrors.length > 1 && (
                  <div className="rounded-lg border border-rose-800/50 bg-neutral-900 p-2.5 space-y-1">
                    <div className="text-[11px] font-semibold text-rose-300">
                      Diğer Doğrulama Sorunları ({allValidationErrors.length - 1}):
                    </div>
                    {allValidationErrors.slice(1).map((err, i) => (
                      <button
                        key={i}
                        type="button"
                        disabled={!err.nodeId}
                        onClick={() => err.nodeId && onFocusNode(err.nodeId)}
                        className="block w-full text-left text-[11px] text-rose-200/90 hover:text-white py-0.5 disabled:cursor-default"
                      >
                        • {err.nodeLabel ? `[${err.nodeLabel}] ` : ""}
                        {err.message}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div ref={consoleEndRef} />
          </>
        )}

        {tab === "variables" && (
          <div className="space-y-1.5">
            {variableEntries.length === 0 ? (
              <p className="text-neutral-500 font-sans py-4 text-center">
                Henüz tanımlı değişken yok.
              </p>
            ) : (
              <div className="rounded-lg border border-neutral-800 overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-neutral-900 text-[10px] uppercase text-neutral-400 font-sans border-b border-neutral-800">
                      <th className="px-2.5 py-1.5">Değişken</th>
                      <th className="px-2.5 py-1.5">Değer</th>
                    </tr>
                  </thead>
                  <tbody>
                    {variableEntries.map(([name, val]) => (
                      <tr
                        key={name}
                        className="border-b border-neutral-800/60 last:border-b-0"
                      >
                        <td className="px-2.5 py-1.5 text-neutral-200 font-semibold">
                          {name}
                        </td>
                        <td className="px-2.5 py-1.5 text-emerald-300 break-all">
                          {typeof val === "string" ? `"${val}"` : formatValue(val)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {tab === "trace" && (
          <div className="space-y-1">
            {execution.logs.length === 0 ? (
              <p className="text-neutral-500 font-sans py-4 text-center">
                Henüz çalıştırma adımı yok.
              </p>
            ) : (
              execution.logs.map((entry) => (
                <button
                  key={`${entry.step}-${entry.nodeId}`}
                  type="button"
                  onClick={() => onFocusNode(entry.nodeId)}
                  className="w-full text-left flex items-start gap-2 rounded px-2 py-1 hover:bg-neutral-900 transition-colors"
                >
                  <span className="text-neutral-500 shrink-0">#{entry.step}</span>
                  <span className="text-amber-300 shrink-0 font-semibold">
                    {entry.nodeLabel}:
                  </span>
                  <span className="text-neutral-300 break-words">{entry.detail}</span>
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
