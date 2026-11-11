"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { pianoPlayer, PIECES } from "./pianoPlayer";

const AsciiPlane = dynamic(() => import("./AsciiPlane"), { ssr: false });


type Project = {
  id: string;
  number: string;
  name: string;
  tag: string;
  color: string;
  text: string;
  short: string;
  description: string;
  stat: string;
  features: string[];
  facts: [string, string][];
  links?: [string, string][];
};

const featured = ["kura", "canary", "culturerisk", "formula-racer", "refill"];

const projects: Project[] = [
  {
    id: "wayfinder", number: "01", name: "Wayfinder", tag: "AI / Navigation", color: "#e07a5f", text: "#16120f",
    short: "Bike routes that actually listen.",
    description: "Type how you want to ride, like avoiding hills or a busy road, and Wayfinder builds real bike routes, measures every street on them, and picks the one that fits. The AI only turns your words into settings. The routing, scoring, and explanation are my own code on Valhalla and OpenStreetMap.",
    stat: "IMPACTHACK 2026",
    features: ["Plain-English instructions and follow-ups", "Side-by-side routes with climb, busy-road miles, bike-lane %", "Avoid any street by name with automatic re-routing", "Shows its math instead of AI-written excuses"],
    facts: [["Built for", "ImpactHack 2026"], ["Stack", "Python / Gemini / Valhalla"], ["Area", "California"]],
    links: [["Live", "https://wayfinderbike.netlify.app"], ["Devpost", "https://devpost.com/software/wayfinder-wsea57"], ["Code", "https://github.com/aShah2025/Wayfinder"]],
  },
  {
    id: "culturerisk", number: "02", name: "CultureRisk", tag: "AI / Hackathon", color: "#7aa2f7", text: "#101417",
    short: "Know the audience before you greenlight.",
    description: "An autonomous research agent for film-studio executives, built on Qloo's taste graph. Give it a project and its comparable titles. It plans an investigation across four Qloo endpoints, changes course as evidence comes in, and writes a greenlight memo where every number traces back to a logged Qloo call.",
    stat: "QLOO HACKATHON",
    features: ["Plans, acts, observes, and re-plans on its own", "Memo includes a popularity-trap section", "Also available as an MCP tool for other AI agents"],
    facts: [["Built for", "Qloo Hackathon"], ["Stack", "JavaScript / Netlify"], ["License", "MIT"]],
    links: [["Code", "https://github.com/aShah2025/CultureRisk"], ["Devpost", "https://devpost.com/software/culturerisk-ai"]],
  },
  {
    id: "sum", number: "03", name: "Sum", tag: "iOS / Finance", color: "#5fb8a5", text: "#12150f",
    short: "A better budgeting app.",
    description: "Built with Rishith Chennupati because we both struggled with budgeting and saving up for things like phones or 3D printers. Sum is built around saving toward things you actually want.",
    stat: "TWO-PERSON TEAM",
    features: ["Budgeting designed for students", "Savings goals for real purchases", "Built in Swift with a co-developer"],
    facts: [["Platform", "iOS"], ["Team", "With Rishith C."], ["Language", "Swift"]],
  },
  {
    id: "kura", number: "04", name: "Kura", tag: "iOS / Health", color: "#7cc97a", text: "#14140e",
    short: "Calories and macros, without the clutter.",
    description: "An iPhone calorie and macro tracker made for the Congressional App Challenge 2025. It keeps daily calories, protein, carbs, and fat quick to log and easy to understand.",
    stat: "BUILT FOR CAC 2025",
    features: ["Daily calorie total at a glance", "Protein, carbs, and fat tracked together", "Fast logging with no clutter"],
    facts: [["Platform", "iOS / SwiftUI"], ["Built for", "CAC 2025"], ["Focus", "Simplicity"]],
    links: [["Code", "https://github.com/aShah2025/Kura"], ["Devpost", "https://devpost.com/software/kura-5itfqw"]],
  },
  {
    id: "canary", number: "10", name: "Canary", tag: "iOS / AI Health", color: "#f2d64b", text: "#14130a",
    short: "Catches sleep and mood drift before you do.",
    description: "Built with Rishith Chennupati for the Congressional App Challenge 2026. Each morning a 30-second face read lays ARKit's 3D face mesh over the front camera and tracks eyelid openness and facial movement 60 times a second. Canary combines that with resting heart rate, HRV, breathing rate and sleep from Apple Health, plus the school calendar. It compares everything against your own four-week baseline, flags drift that lasts, and models alertness through the day. It all runs on the phone, with no account and no server.",
    stat: "BUILT FOR CAC 2026",
    features: ["Morning face read: live ARKit face mesh, eyelid and expression tracking", "Heart rate, HRV, breathing rate and sleep from Apple Health and Apple Watch", "Drift detection against your own baseline, plus an alertness model", "Plans sleep around tests and deadlines from the school calendar", "Crisis-language check in English and Spanish caught 255 of 255 test phrases"],
    facts: [["Built for", "CAC 2026"], ["Tech", "SwiftUI / ARKit / HealthKit"], ["Team", "With Rishith C."]],
  },
  {
    id: "refill", number: "05", name: "Refill", tag: "iOS / Education", color: "#a98cf0", text: "#ffffff",
    short: "No teacher should pay out of their own pocket.",
    description: "A SwiftUI app for drafting classroom supply requests and helping supporters discover projects. It reads live California DonorsChoose listings through a Cloudflare Worker, parses plain-English requests with AI, and labels clearly when it is showing sample data instead of live data.",
    stat: "CLASSROOM SUPPLIES",
    features: ["Draft a supply request in plain English", "Browse California classroom projects", "Stripe test-mode checkout with verified receipts"],
    facts: [["Platform", "iOS 17+"], ["Backend", "Cloudflare Worker"], ["Data", "DonorsChoose"]],
    links: [["Code", "https://github.com/aShah2025/Refill"], ["Devpost", "https://devpost.com/software/refill-s0bd9a"]],
  },
  {
    id: "coursefit", number: "06", name: "CourseFit", tag: "Web / Scheduling", color: "#55c2d3", text: "#16130e",
    short: "Master schedules without the chaos.",
    description: "An automated master scheduling engine for schools. It captures student course selections and generates conflict-free schedules based on teacher availability and classroom capacity.",
    stat: "SCHOOL SCHEDULING",
    features: ["Collects student course selections", "Respects teacher availability", "Accounts for classroom capacity"],
    facts: [["Problem", "Manual scheduling"], ["Inputs", "Courses / teachers / rooms"], ["Output", "Conflict-free schedule"]],
    links: [["Code", "https://github.com/aShah2025/CourseFit"], ["Devpost", "https://devpost.com/software/coursefit"]],
  },
  {
    id: "turbo-lane", number: "07", name: "Turbo Lane", tag: "Game / Arcade", color: "#f0913a", text: "#14110a",
    short: "A vertical racer built for one more run.",
    description: "A fast vertical arcade game about dodging traffic, chasing a higher score, crashing, and immediately trying again.",
    stat: "PLAYABLE",
    features: ["Dodge traffic across three lanes", "Chase a higher score every run", "Crash and restart instantly"],
    facts: [["Genre", "Arcade"], ["Status", "Playable"], ["Loop", "One more run"]],
  },
  {
    id: "formula-racer", number: "08", name: "Formula Racer", tag: "Game / 3D Racing", color: "#e5534b", text: "#ffffff",
    short: "A 3D racing game in progress, built in Unity.",
    description: "A 3D racing game loosely inspired by the speed, cameras, and race-weekend energy of Formula 1 games. Still building it. Still improving the lap time.",
    stat: "IN DEVELOPMENT",
    features: ["Full 3D tracks and cars", "Cinematic racing cameras", "Race-weekend feel"],
    facts: [["Genre", "3D racing"], ["Engine", "Unity / C#"], ["Status", "In development"]],
  },
  {
    id: "winglab", number: "09", name: "WingLab", tag: "macOS / Physics", color: "#9fb6cc", text: "#101417",
    short: "An aerodynamics playground for Mac.",
    description: "Change a wing, adjust airflow and angle of attack, then compare lift, drag, and efficiency without needing an actual wind tunnel.",
    stat: "AERODYNAMICS SIM",
    features: ["Reshape a wing and see what changes", "Tune airflow and angle of attack", "Compare lift, drag, and efficiency"],
    facts: [["Platform", "macOS"], ["Topic", "Aerodynamics"], ["Outputs", "Lift / drag"]],
  },
];

const awards: { year: string; title: string; note: string; kind: string; href?: string }[] = [
  { year: "NOW", title: "Top 10% on GitHub", note: "github.com/aShah2025", kind: "RANKING", href: "https://github.com/aShah2025" },
  { year: "2026", title: "Congressional App Challenge", note: "Competing again with Canary", kind: "IN PROGRESS", href: "#canary" },
  { year: "2026", title: "ImpactHack 2026", note: "Participant. Built Wayfinder", kind: "HACKATHON", href: "#wayfinder" },
  { year: "2025", title: "Congressional Recognition", note: "Congressional App Challenge (CAC) 2025, with Kura", kind: "AWARD", href: "#kura" },
  { year: "GLOBAL", title: "Qloo Global Hackathon", note: "Participant. Built CultureRisk, an agent on Qloo's taste graph", kind: "HACKATHON", href: "#culturerisk" },
  { year: "NOW", title: "Leland Hackathon Club", note: "Exploring more", kind: "CLUB" },
  { year: "NOW", title: "Leland Motorsport Club", note: "Exploring more", kind: "CLUB" },
  { year: "7TH GRADE", title: "Spelling Bee Champion", note: "Won at Bret Harte Middle School, then placed 15th out of 140 at regionals", kind: "1ST PLACE" },
  { year: "7TH GRADE", title: "Geography Bee, 3rd Place", note: "Bret Harte Middle School", kind: "3RD PLACE" },
  { year: "6TH GRADE", title: "Spelling Bee, 3rd Place", note: "Bret Harte Middle School", kind: "3RD PLACE" },
];

// What each project is made of, read from its repo on github.com/aShah2025. Projects whose code isn't public
// only list what's already known about them.
const BUILT: Record<string, [string, string][]> = {
  wayfinder: [["Platform", "Web"], ["Type", "AI route planner"], ["Languages", "Python, JavaScript"], ["Backend", "FastAPI on Uvicorn"], ["Routing", "Valhalla (pyvalhalla) on OpenStreetMap"], ["AI", "Google Gemini turns your words into ride settings"], ["Frontend", "HTML / CSS / JS with MapLibre GL and a 3D hill preview"], ["Hosting", "Vercel, Python serverless"], ["Tests", "pytest"]],
  culturerisk: [["Platform", "Web"], ["Type", "AI research agent, also an MCP tool"], ["Language", "JavaScript (Node 20)"], ["Frontend", "Plain HTML / CSS / JS, no framework"], ["Backend", "Netlify Functions (serverless)"], ["Data", "Qloo taste-graph API through a server-side bridge"], ["Tests", "node:test, GitHub Actions CI"]],
  sum: [["Platform", "iOS"], ["Type", "Budgeting app"], ["Language", "Swift"], ["UI", "SwiftUI"], ["Data", "SwiftData, stored on the phone"], ["Charts", "Swift Charts"], ["Built in", "Xcode"]],
  kura: [["Platform", "iOS"], ["Type", "Health / nutrition app"], ["Language", "Swift"], ["UI", "SwiftUI"], ["Data", "SwiftData, stored on the phone"], ["Built in", "Xcode"]],
  canary: [["Platform", "iOS"], ["Type", "On-device health app"], ["Language", "Swift"], ["UI", "SwiftUI"], ["Sensors", "ARKit face tracking"], ["Health data", "HealthKit"], ["Code", "Private for now"]],
  refill: [["Platform", "iOS 17+"], ["Type", "Classroom-supply app for teachers and parents"], ["App", "Swift / SwiftUI"], ["Voice", "Speech + AVFoundation for spoken requests"], ["Sign-in", "Sign in with Apple"], ["Backend", "TypeScript Cloudflare Worker (Wrangler), tested with Vitest"], ["Payments", "Stripe"], ["Data", "DonorsChoose"], ["AI", "OpenRouter model parses requests"]],
  coursefit: [["Platform", "Web"], ["Type", "School scheduling engine"], ["Code", "Repo is up, code not pushed yet"]],
  "turbo-lane": [["Type", "Arcade game"], ["Status", "Playable"], ["Code", "Not on GitHub yet"]],
  "formula-racer": [["Platform", "Desktop"], ["Type", "3D racing game"], ["Engine", "Unity 6, Universal Render Pipeline"], ["Language", "C#"], ["Input", "Unity Input System"]],
  winglab: [["Platform", "macOS"], ["Type", "Aerodynamics simulator"], ["Code", "Not on GitHub yet"]],
};

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
    </>
  );
}
