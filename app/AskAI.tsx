"use client";

import { useEffect, useRef, useState } from "react";
import { ABOUT, awards, BUILT, projects } from "./content";

// Everything the assistant knows, in one compact sheet. Small models stay accurate only when the answer
// is in front of them, so the sheet is the whole world and the prompt says so.
function factSheet() {
  const work = projects.map((p) => {
    const built = (BUILT[p.id] ?? []).map(([k, v]) => `${k}: ${v}`).join("; ");
    const links = (p.links ?? []).map(([k, v]) => `${k} ${v}`).join(", ");
    return `- ${p.name} (${p.tag}). ${p.description} ${built}${links ? `. Links: ${links}` : ""}`;
  }).join("\n");
  const wins = awards.map((a) => `- ${a.title} (${a.year.toLowerCase()}): ${a.note}`).join("\n");
  return `About: ${ABOUT.bio}\nLanguages: ${ABOUT.languages}\nTools: ${ABOUT.tools}\n\nProjects:\n${work}\n\nRecognition:\n${wins}\n\nOutside coding:\n${ABOUT.life.map((l) => `- ${l}`).join("\n")}\n\nContact: ${ABOUT.contact}`;
}

const SYSTEM = `You are the assistant on Aaditya Shah's portfolio website. Answer visitors' questions about Aaditya using ONLY the facts below. Refer to him as Aaditya or "he". Keep answers to two or three short sentences of plain text, no markdown. If the facts don't contain the answer, say you don't know and suggest checking his GitHub or resume. Never invent projects, awards, dates, schools, or contact details.\n\n${factSheet()}`;

const SUGGESTIONS = ["What has Aaditya built with AI?", "Which project should I look at first?", "What's he doing outside of coding?"];
const WEBLLM_MODEL = "Llama-3.2-1B-Instruct-q4f16_1-MLC";

type Msg = { role: "user" | "assistant"; content: string };
type Engine = { kind: "builtin" | "webllm"; ask: (history: Msg[], onText: (t: string) => void) => Promise<void> };
type Status = "idle" | "checking" | "offer" | "loading" | "ready" | "unsupported" | "error";

// Chrome's built-in model (Gemini Nano, via the Prompt API). Typed loosely because it is still new.
type BuiltinSession = { promptStreaming(input: string): AsyncIterable<string> & ReadableStream<string>; destroy(): void };
type BuiltinApi = {
  availability(opts?: object): Promise<"unavailable" | "downloadable" | "downloading" | "available">;
  create(opts: object): Promise<BuiltinSession>;
};
const builtinApi = () => (globalThis as unknown as { LanguageModel?: BuiltinApi }).LanguageModel;
const LANG = { expectedInputs: [{ type: "text", languages: ["en"] }], expectedOutputs: [{ type: "text", languages: ["en"] }] };

async function hasWebGPU() {
  const gpu = (navigator as unknown as { gpu?: { requestAdapter(): Promise<unknown> } }).gpu;
  try { return !!gpu && !!(await gpu.requestAdapter()); } catch { return false; }
}

const turn = (history: Msg[]) => history.slice(-6); // the fact sheet needs most of the 4k context

export default function AskAI() {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [progress, setProgress] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const engine = useRef<Engine | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const log = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  const [kind, setKind] = useState<Engine["kind"] | null>(null);

  // Work out what this browser can run the first time the panel opens.
  const prepare = () => {
    setStatus("checking");
    (async () => {
      const api = builtinApi();
      const avail = api ? await api.availability(LANG).catch(() => "unavailable" as const) : "unavailable";
      if (api && avail !== "unavailable") {
        try {
          if (avail !== "available") setProgress("Getting Chrome's built-in model ready…");
          const session = await api.create({
            ...LANG, initialPrompts: [{ role: "system", content: SYSTEM }],
            monitor(m: EventTarget) { m.addEventListener("downloadprogress", (e) => setProgress(`Downloading Chrome's built-in model… ${Math.round(((e as unknown as { loaded: number }).loaded) * 100)}%`)); },
          });
          engine.current = {
            kind: "builtin",
            // The session keeps its own history, so only the newest question is sent.
            ask: async (history, onText) => { let text = ""; for await (const chunk of session.promptStreaming(history[history.length - 1].content)) { text += chunk; onText(text); } },
          };
          setKind("builtin"); setStatus("ready"); setProgress("");
          return;
        } catch { /* fall through to WebLLM */ }
      }
      setStatus((await hasWebGPU()) ? "offer" : "unsupported");
    })();
  };

  const loadWebLLM = async () => {
    setStatus("loading"); setProgress("Starting…");
    try {
      const { CreateMLCEngine } = await import("@mlc-ai/web-llm");
      const mlc = await CreateMLCEngine(WEBLLM_MODEL, { initProgressCallback: (r) => setProgress(r.progress < 1 ? `Downloading model… ${Math.round(r.progress * 100)}%` : "Loading model onto your GPU…") });
      engine.current = {
        kind: "webllm",
        ask: async (history, onText) => {
          const stream = await mlc.chat.completions.create({ messages: [{ role: "system", content: SYSTEM }, ...turn(history)], stream: true, temperature: 0.2, max_tokens: 220 });
          let text = "";
          for await (const chunk of stream) { text += chunk.choices[0]?.delta?.content ?? ""; onText(text); }
        },
      };
      setKind("webllm"); setStatus("ready"); setProgress("");
    } catch (error) {
      console.error("Local model failed to load", error);
      setStatus("error"); setProgress("");
    }
  };

  const send = async (text: string) => {
    const q = text.trim();
    if (!q || busy || !engine.current) return;
    const history: Msg[] = [...messages, { role: "user", content: q }];
    setMessages([...history, { role: "assistant", content: "" }]); setDraft(""); setBusy(true);
    const show = (t: string) => setMessages([...history, { role: "assistant", content: t.replace(/\*\*/g, "") }]);
    try { await engine.current.ask(history, show); }
    catch (error) { console.error(error); show("Sorry, something went wrong running the model. Try again?"); }
    finally { setBusy(false); input.current?.focus(); }
  };

  useEffect(() => { log.current?.scrollTo({ top: log.current.scrollHeight }); }, [messages]);
  useEffect(() => { if (open && status === "ready") input.current?.focus(); }, [open, status]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpen(false); toggleRef.current?.focus(); } };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button ref={toggleRef} type="button" className="ask-toggle" aria-expanded={open} aria-controls="ask-panel" onClick={() => { if (!open && status === "idle") prepare(); setOpen(!open); }}>
        {open ? "Close" : <><span aria-hidden="true">✦</span> Ask about me</>}
      </button>
      {open && (
        <section id="ask-panel" className="ask" role="dialog" aria-label="Ask about Aaditya">
          <header>
            <b>Ask about Aaditya</b>
            <small>Runs on your device. Nothing you type leaves your browser.</small>
          </header>
          <div className="ask-log" ref={log} aria-live="polite">
            {messages.length === 0 && status === "ready" && (
              <div className="ask-suggest">
                {SUGGESTIONS.map((s) => <button key={s} type="button" onClick={() => send(s)}>{s}</button>)}
              </div>
            )}
            {messages.map((m, i) => <p key={i} className={`ask-msg ${m.role}`}>{m.content || <span className="ask-dots" aria-label="Thinking">···</span>}</p>)}
            {status === "checking" && <p className="ask-note">{progress || "Checking what your browser can run…"}</p>}
            {status === "offer" && (
              <div className="ask-note">
                <p>Your browser can run a small AI model (Llama 3.2 1B) right here, with no server. It&apos;s a one-time download of about 0.9 GB that your browser keeps for next time.</p>
                <button type="button" className="btn" onClick={loadWebLLM}>Download and start</button>
              </div>
            )}
            {status === "loading" && <p className="ask-note">{progress}<br /><small>Keep this tab open. The first load takes a minute or two.</small></p>}
            {status === "unsupported" && <p className="ask-note">This browser can&apos;t run a local model (it needs WebGPU, in recent Chrome, Edge or Safari). Everything the assistant knows is on this page, and the projects are on <a href="https://github.com/aShah2025" target="_blank" rel="noopener noreferrer">GitHub</a>.</p>}
            {status === "error" && <div className="ask-note"><p>The model couldn&apos;t start, possibly not enough GPU memory.</p><button type="button" className="btn btn-quiet" onClick={loadWebLLM}>Try again</button></div>}
          </div>
          <form className="ask-form" onSubmit={(e) => { e.preventDefault(); send(draft); }}>
            <input ref={input} value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={status === "ready" ? "Ask a question" : "Waiting for the model"} disabled={status !== "ready"} aria-label="Your question" maxLength={300} />
            <button type="submit" className="btn" disabled={status !== "ready" || busy || !draft.trim()}>Ask</button>
          </form>
          {status === "ready" && <p className="ask-foot">{kind === "builtin" ? "Chrome's built-in model" : "Llama 3.2 1B via WebLLM"} · small models can be wrong</p>}
        </section>
      )}
    </>
  );
}
