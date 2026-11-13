"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { pianoPlayer, PIECES } from "./pianoPlayer";
import { awards, BUILT, featured, projects } from "./content";

const AsciiPlane = dynamic(() => import("./AsciiPlane"), { ssr: false });
const AskAI = dynamic(() => import("./AskAI"), { ssr: false });


const LANGUAGES: [string, string?][] = [["Swift"], ["Python"], ["Java"], ["JavaScript"], ["HTML"], ["C++", "learning"]];

// Opens under a language or tool chip: what it is, how it works, how to start, and where I use it.
type Info = { lead: string; how: string; use: string; mine: string };
const INFO: Record<string, Info> = {
  Swift: { lead: "Apple's language for iPhone, iPad and Mac apps.", how: "Swift compiles through LLVM straight to machine code, so it's fast. It's strictly typed, and optionals force you to handle missing values, which removes a whole class of crashes. Memory is managed with automatic reference counting. SwiftUI describes screens as views that redraw when their data changes.", use: "struct Hello: View {\n  var body: some View {\n    Text(\"hi\")\n  }\n}\n// Xcode → New Project → App → ⌘R", mine: "Sum, Kura, Canary and Refill." },
  Python: { lead: "A readable general-purpose language for scripts, servers and AI.", how: "CPython compiles your code to bytecode and runs it on an interpreter, so there's no build step. Types are checked at runtime. Most of its power is the package ecosystem from pip.", use: "python3 -m venv .venv\nsource .venv/bin/activate\npip install fastapi uvicorn\npython3 app.py", mine: "Wayfinder's backend: FastAPI, Valhalla routing and Gemini." },
  Java: { lead: "A typed, object-oriented language that runs anywhere there's a JVM.", how: "javac compiles source to bytecode. The Java Virtual Machine runs it and JIT-compiles hot code to machine code. Everything lives in classes, and a garbage collector cleans up memory.", use: "// Main.java\npublic class Main {\n  public static void main(String[] a) {\n    System.out.println(\"hi\");\n  }\n}\n\njavac Main.java && java Main", mine: "Where I learned classes and objects." },
  JavaScript: { lead: "The language of the web, in the browser and on servers.", how: "Engines like V8 JIT-compile it as it runs. It's single-threaded with an event loop, so slow work (network, timers) is handled with promises and async/await instead of blocking. Node.js runs the same language on servers.", use: "// in a page\n<script src=\"app.js\"></script>\n\n// or on a server\nnode app.js", mine: "CultureRisk, Wayfinder's map, and this site (in TypeScript, which is JavaScript with types)." },
  HTML: { lead: "The structure of every web page.", how: "It's markup, not a programming language. The browser parses tags into a tree called the DOM, CSS styles that tree, and JavaScript changes it to make the page interactive.", use: "<!doctype html>\n<h1>hello</h1>\n<p>save as index.html and open it in a browser</p>", mine: "Every web project, including this one." },
  "C++": { lead: "A fast, low-level language used for games, engines and systems.", how: "It compiles ahead of time to machine code with no garbage collector, so you control memory directly. Templates generate code at compile time.", use: "// main.cpp\n#include <iostream>\nint main() { std::cout << \"hi\\n\"; }\n\nclang++ -std=c++20 main.cpp -o main && ./main", mine: "Learning it now, with practice problems so far." },
  Xcode: { lead: "Apple's IDE for building and shipping Apple apps.", how: "It compiles Swift, runs apps in the iOS Simulator or on a real phone, shows live SwiftUI previews, debugs with breakpoints, profiles with Instruments, and signs and uploads builds to the App Store.", use: "⌘R    run in the simulator\n⌘U    run tests\n⌘⇧K   clean build\n⌥⌘↩   show the preview canvas", mine: "Every iOS app I've built." },
  "VS Code": { lead: "A lightweight editor that becomes an IDE through extensions.", how: "It's built on Electron. Language servers give it autocomplete and errors for almost any language, and it has a built-in terminal, git and debugger.", use: "code .   open this folder\n⌘P       jump to a file\n⌘⇧P      command palette\n⌃`       terminal", mine: "Web projects like CultureRisk and this site." },
  PyCharm: { lead: "JetBrains' IDE made just for Python.", how: "It indexes the whole project, so autocomplete, refactoring and find-usages understand your code. It manages virtual environments and has a visual debugger and test runner.", use: "open a folder, set the interpreter to .venv\n⌃R   run\n⌃D   debug\n⇧⇧   search everything", mine: "Python work like Wayfinder's backend." },
  "Claude Code": { lead: "Anthropic's AI coding agent that works in the terminal.", how: "You describe a task in plain English. It reads the repo, plans, edits files, and runs commands like tests and builds, asking before anything risky. It works on the real project, not a copy.", use: "npm install -g @anthropic-ai/claude-code\ncd my-project\nclaude\n> add a dark mode toggle", mine: "This site." },
  Codex: { lead: "OpenAI's coding agent, in the terminal and the cloud.", how: "It reads your repo, makes changes in a sandbox, runs commands, and shows you the diff to accept. The cloud version can work on several tasks in parallel.", use: "npm install -g @openai/codex\ncd my-project\ncodex\n> fix the failing test", mine: "A second opinion on tricky bugs." },
};
const TOOLS = ["Xcode", "VS Code", "PyCharm", "Claude Code", "Codex"];

const ROLES = ["builds apps", "writes AI agents", "makes games", "argues policy", "plays piano", "wants to fly"];

// Types out each role, holds it, deletes it, and moves to the next, like someone at a terminal.
function Typer() {
  const [text, setText] = useState(ROLES[0]);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let i = 0, n = ROLES[0].length, dir = -1, id = 0;
    const tick = () => {
      const word = ROLES[i];
      n += dir;
      setText(word.slice(0, n));
      let wait = dir > 0 ? 70 : 35;
      if (dir > 0 && n >= word.length) { dir = -1; wait = 1800; }
      else if (dir < 0 && n <= 0) { dir = 1; i = (i + 1) % ROLES.length; wait = 300; }
      id = window.setTimeout(tick, wait);
    };
    id = window.setTimeout(tick, 2200);
    return () => clearTimeout(id);
  }, []);
  return <span className="typer">{text}<i aria-hidden="true" /></span>;
}

// A text progress bar: [#######---]
const bar = (done: number, of: number) => `[${"#".repeat(done)}${"-".repeat(of - done)}]`;


function PianoControls() {
  const [, rerender] = useState(0);
  useEffect(() => {
    const off = pianoPlayer.subscribe(() => rerender((n) => n + 1));
    if (!pianoPlayer.notes.length) pianoPlayer.load(PIECES[0].id);
    return () => { off(); pianoPlayer.stop(); };
  }, []);
  const p = pianoPlayer;
  return (
    <div className="piano-ctl">
      {PIECES.map((piece) => {
        const on = piece.id === p.piece.id && p.playing;
        return (
          <button key={piece.id} type="button" className={on ? "on" : ""} aria-pressed={on} onClick={() => (on ? p.stop() : p.play(piece.id, piece.id === p.piece.id ? p.offset : 0))}>
            <span>{on ? "❚❚" : "▶"}</span> {piece.composer}, {piece.title}
          </button>
        );
      })}
      <small>{p.piece.credit}. Samples: Salamander Grand Piano, CC BY 3.0.</small>
    </div>
  );
}

const NAV: [string, string][] = [["Work", "#work"], ["Skills", "#skills"], ["Life", "#life"], ["Recognition", "#recognition"], ["Contact", "#contact"]];

// A compact frosted bar that floats over the hero; on narrow screens the links fold into a menu.
function Nav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState("");
  useEffect(() => {
    // Mark the section that crosses the upper third of the screen as the current one.
    const targets = NAV.map(([, href]) => document.querySelector(href)).filter((el): el is Element => !!el);
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) setActive(`#${e.target.id}`);
    }, { rootMargin: "-30% 0px -65% 0px" });
    targets.forEach((t) => io.observe(t));
    return () => io.disconnect();
  }, []);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("scroll", onScroll); window.removeEventListener("keydown", onKey); };
  }, []);
  return (
    <header className={`nav${scrolled ? " scrolled" : ""}`}>
      <a className="brand" href="#top">aaditya shah</a>
      <button type="button" className="menu" aria-expanded={open} aria-controls="nav-links" onClick={() => setOpen((o) => !o)}>
        {open ? "Close" : "Menu"}
      </button>
      <nav id="nav-links" aria-label="Sections" className={open ? "open" : ""}>
        {NAV.map(([label, href]) => <a key={href} href={href} aria-current={active === href ? "location" : undefined} onClick={() => setOpen(false)}>{label}</a>)}
        <a className="btn" href="/Aaditya-Shah-Resume.pdf" target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)}>Resume</a>
      </nav>
    </header>
  );
}

type Item = { id: string; name: string; meta: string; body: React.ReactNode };

export default function Home() {
  const [openProject, setOpenProject] = useState<string | null>(null);
  const stunt = useRef(0);
  const focus = useRef<string | null>(null); // the open row, whose scene the plane canvas shows

  const work: Item[] = featured.map((id) => projects.find((p) => p.id === id)!).concat(projects.filter((p) => !featured.includes(p.id))).map((p) => ({
    id: p.id, name: p.name, meta: p.tag,
    body: (
      <>
        <p className="stat">{p.stat.toLowerCase()}</p>
        <p className="lead">{p.short}</p>
        <p>{p.description}</p>
        <ul>{p.features.map((f) => <li key={f}>{f}</li>)}</ul>
        <dl>{p.facts.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
        {BUILT[p.id] && (
          <div className="made">
            <p className="made-h">made of</p>
            <dl className="spec">{BUILT[p.id].map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
          </div>
        )}
        {p.links && <p className="out">{p.links.map(([label, href]) => <a key={href} href={href} target="_blank" rel="noopener noreferrer">{label}</a>)}</p>}
      </>
    ),
  }));

  const life: Item[] = [
    {
      id: "flying", name: "Flying", meta: "The goal",
      body: (
        <>
          <p className="lead">Private pilot licence, eventually.</p>
          <p>That&apos;s the plane up there. Ground school first, then the first solo, then the checkride. For now it&apos;s simulators and WingLab.</p>
          <pre className="track">{`${bar(1, 10)} ground school\n${bar(0, 10)} first solo\n${bar(0, 10)} checkride`}</pre>
        </>
      ),
    },
    {
      id: "debate", name: "Debate", meta: "Policy / Congress",
      body: (
        <>
          <p className="lead">Argue it, then build it.</p>
          <p><b>Policy</b> is two people on one resolution for a whole season: heavy research, tight evidence, fast delivery, and defending a side before flipping to attack it.</p>
          <p><b>Congress</b> is a mock legislature: speeches for and against real bills, questions from the floor, and persuading a room that doesn&apos;t have to agree with you.</p>
          <p>It&apos;s where I learned to explain a messy problem clearly, which is most of what building a useful app comes down to.</p>
        </>
      ),
    },
    {
      id: "kungfu", name: "Kung Fu", meta: "5 years",
      body: (
        <>
          <p className="lead">Red-black belt. Black belt test in April 2027.</p>
          <pre className="track">{`${bar(9, 10)} red-black belt\n${bar(0, 10)} black belt, apr 2027`}</pre>
          <p>Five years of showing up, repeating the basics, and testing for the next belt.</p>
        </>
      ),
    },
    {
      id: "piano", name: "Piano", meta: "6 years / RCM 9",
      body: (
        <>
          <p className="lead">Classical, Royal Conservatory Level 9.</p>
          <PianoControls />
        </>
      ),
    },
  ];

  // A link to a project or life row (#kura, from the recognition list or a shared URL) opens it.
  useEffect(() => {
    const ids = new Set([...projects.map((p) => p.id), "flying", "debate", "kungfu", "piano"]);
    const open = (id: string, smooth: boolean) => {
      setOpenProject(id);
      focus.current = id === "flying" ? null : id;
      // scroll once the row has expanded, so the browser isn't aiming at the old layout
      window.setTimeout(() => document.getElementById(id)?.scrollIntoView({ block: "start", behavior: smooth ? "smooth" : "instant" }), 30);
    };
    const idOf = (hash: string) => { const id = decodeURIComponent(hash.slice(1)); return ids.has(id) ? id : null; };
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element).closest?.("a[href^='#']");
      const id = a && idOf(a.getAttribute("href")!);
      if (!id) return;
      e.preventDefault();
      history.pushState(null, "", `#${id}`);
      open(id, true);
    };
    const onPop = () => { const id = idOf(location.hash); if (id) open(id, false); };
    onPop();
    document.addEventListener("click", onClick);
    window.addEventListener("popstate", onPop);
    return () => { document.removeEventListener("click", onClick); window.removeEventListener("popstate", onPop); };
  }, []);

  const toggle = (id: string) => {
    const opening = openProject !== id;
    setOpenProject(opening ? id : null);
    focus.current = opening && id !== "flying" ? id : null;
    if (opening && id === "flying") stunt.current += 1; // the plane does a barrel roll
  };

  // a row of chips; clicking one opens its notes underneath
  const chips = (names: string[], notes: Record<string, string | undefined> = {}) => {
    const open = names.find((n) => openProject === `chip-${n}`);
    const info = open ? INFO[open] : undefined;
    return (
      <>
        <ul className="langs">
          {names.map((n) => (
            <li key={n} className={notes[n] ? "learning" : ""}>
              <button type="button" aria-expanded={open === n} className={open === n ? "on" : ""} onClick={() => toggle(`chip-${n}`)}>
                {n}{notes[n] && <small> {notes[n]}</small>}
              </button>
            </li>
          ))}
        </ul>
        {open && info && (
          <div className="chip-body">
            <p className="lead">{info.lead}</p>
            <p className="made-h">how it works</p>
            <p>{info.how}</p>
            <p className="made-h">how to use it</p>
            <pre className="code">{info.use}</pre>
            <p className="made-h">where i use it</p>
            <p>{info.mine}</p>
          </div>
        )}
      </>
    );
  };

  const list = (items: Item[]) => (
    <ul className="project-list">
      {items.map((it) => {
        const isOpen = openProject === it.id;
        return (
          <li key={it.id} id={it.id} className={isOpen ? "open" : ""}>
            <button type="button" aria-expanded={isOpen} aria-controls={`${it.id}-body`} onClick={() => toggle(it.id)}>
              <span className="name">{it.name}</span>
              <span className="meta">{it.meta}</span>
              <span className="plus" aria-hidden="true" />
            </button>
            <div className="body" id={`${it.id}-body`} hidden={!isOpen}>{it.body}</div>
          </li>
        );
      })}
    </ul>
  );

  return (
    <>
    <a className="skip" href="#work">Skip to work</a>
    <Nav />
    <main>
      <AsciiPlane stunt={stunt} focus={focus} />

      <section className="intro" id="top" aria-labelledby="h-name">
        <div className="intro-copy">
          <h1 id="h-name">Aaditya Shah</h1>
          <p className="prompt"><span aria-hidden="true">&gt;</span> <Typer /></p>
          <p className="intro-lead">I build apps, games, websites, and whatever I want to learn next. Student at Leland High in San Jose, CA.</p>
          <ul className="proof" aria-label="Highlights">
            <li><a href="#kura">Congressional App Challenge recognition</a></li>
            <li><a href="https://github.com/aShah2025" target="_blank" rel="noopener noreferrer">Top 10% on GitHub</a></li>
            <li><a href="#work">{projects.length} projects</a></li>
          </ul>
          <div className="actions">
            <a className="btn" href="#work">See my work</a>
            <a className="btn btn-quiet" href="https://github.com/aShah2025" target="_blank" rel="noopener noreferrer">GitHub</a>
          </div>
        </div>
      </section>

      <div className="index" id="index">
        <section id="work" aria-labelledby="h-work">
          <h2 id="h-work">Work</h2>
          <p className="section-note">Click any project to open it.</p>
          {list(work)}
        </section>

        <section id="skills" aria-labelledby="h-lang">
          <h2 id="h-lang">Languages</h2>
          {chips(LANGUAGES.map(([n]) => n), Object.fromEntries(LANGUAGES))}
        </section>

        <section aria-labelledby="h-tools">
          <h2 id="h-tools">Tools</h2>
          {chips(TOOLS)}
        </section>

        <section id="life" aria-labelledby="h-life"><h2 id="h-life">Off the keyboard</h2>{list(life)}</section>

        <section id="recognition" aria-labelledby="h-rec">
          <h2 id="h-rec">Recognition</h2>
          <ul className="awards">
            {awards.map((a) => (
              <li key={a.title}>
                <span className="yr">{a.year.toLowerCase()}</span>
                <span>
                  {a.href
                    ? <a className="award-link" href={a.href} {...(a.href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}><b>{a.title}</b><span aria-hidden="true">{a.href.startsWith("http") ? " ↗" : " →"}</span></a>
                    : <b>{a.title}</b>}
                  <span className="note">{a.note}</span>
                </span>
                <span className="kind">{a.kind.toLowerCase()}</span>
              </li>
            ))}
          </ul>
          <p className="aside">Congressional App Challenge 2025 recognition for Kura. Competing again in 2026 with Canary.</p>
        </section>
      </div>
    </main>

    <footer className="foot" id="contact">
      <div className="foot-top">
        <div>
          <h2>Got an idea? Let&apos;s build something.</h2>
          <p>My code is on GitHub and my hackathon projects are on Devpost.</p>
        </div>
        <nav aria-label="Elsewhere" className="foot-links">
          <a href="https://github.com/aShah2025" target="_blank" rel="noopener noreferrer">GitHub</a>
          <a href="https://devpost.com/livable-stilted-0a" target="_blank" rel="noopener noreferrer">Devpost</a>
          <a href="/Aaditya-Shah-Resume.pdf" target="_blank" rel="noopener noreferrer">Resume</a>
          <a href="#top">Back to top</a>
        </nav>
      </div>
      <p className="foot-mark" aria-hidden="true">aaditya shah</p>
      <p className="foot-credit">© 2026 Aaditya Shah. The Cessna 172 above is rendered live in the browser and redrawn as ASCII.</p>
    </footer>
    <AskAI />
    </>
  );
}
