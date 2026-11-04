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
    links: [["Live", "https://wayfinderbike.netlify.app"], ["Devpost", "https://devpost.com/software/wayfinder-wsea57"], ["iOS code", "https://github.com/aShah2025/Wayfinder"]],
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
    short: "A 3D racing game in progress.",
    description: "A 3D racing game loosely inspired by the speed, cameras, and race-weekend energy of Formula 1 games. Still building it. Still improving the lap time.",
    stat: "IN DEVELOPMENT",
    features: ["Full 3D tracks and cars", "Cinematic racing cameras", "Race-weekend feel"],
    facts: [["Genre", "3D racing"], ["Status", "In development"], ["Inspired by", "F1 games"]],
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

const awards = [
  { year: "NOW", title: "Top 10% on GitHub", note: "github.com/aShah2025", kind: "RANKING", href: "https://github.com/aShah2025", code: true },
  { year: "2026", title: "Congressional App Challenge", note: "Competing again with Canary", kind: "IN PROGRESS", href: "#canary" , code: true },
  { year: "2026", title: "ImpactHack 2026", note: "Participant. Built Wayfinder", kind: "HACKATHON", href: "#wayfinder" , code: true },
  { year: "2025", title: "Congressional Recognition", note: "Congressional App Challenge (CAC) 2025, with Kura", kind: "AWARD", href: "#kura" , code: true },
  { year: "GLOBAL", title: "Qloo Global Hackathon", note: "Participant. Built CultureRisk, an agent on Qloo's taste graph", kind: "HACKATHON", href: "#culturerisk" , code: true },
  { year: "NOW", title: "Leland Hackathon Club", note: "Exploring more", kind: "CLUB", href: "#recognition" , code: true },
  { year: "NOW", title: "Leland Motorsport Club", note: "Exploring more", kind: "CLUB", href: "#awards" },
  { year: "7TH GRADE", title: "Spelling Bee Champion", note: "Won at Bret Harte Middle School, then placed 15th out of 140 at regionals", kind: "1ST PLACE", href: "#awards" },
  { year: "7TH GRADE", title: "Geography Bee, 3rd Place", note: "Bret Harte Middle School", kind: "3RD PLACE", href: "#awards" },
  { year: "6TH GRADE", title: "Spelling Bee, 3rd Place", note: "Bret Harte Middle School", kind: "3RD PLACE", href: "#awards" },
];

const LANGUAGES: [string, string?][] = [["Swift"], ["Python"], ["Java"], ["JavaScript"], ["HTML"], ["C++", "learning"]];
const MACHINE: [string, string][] = [["model", "MacBook Pro"], ["chip", "M5 Pro"], ["memory", "24 GB"], ["storage", "1 TB SSD"], ["finish", "Space Black"]];
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

function useTheme() {
  const toggle = () => {
    const root = document.documentElement;
    const dark = root.dataset.theme ? root.dataset.theme === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
    root.dataset.theme = dark ? "light" : "dark";
    try { localStorage.setItem("theme", root.dataset.theme); } catch { /* private mode: the choice just isn't remembered */ }
  };
  return toggle;
}

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

type Item = { id: string; name: string; meta: string; body: React.ReactNode };

export default function Home() {
  const [openProject, setOpenProject] = useState<string | null>(null);
  const stunt = useRef(0);
  const focus = useRef<string | null>(null); // the open row, whose scene the plane canvas shows
  const toggleTheme = useTheme();

  const work: Item[] = featured.map((id) => projects.find((p) => p.id === id)!).concat(projects.filter((p) => !featured.includes(p.id))).map((p) => ({
    id: p.id, name: p.name, meta: p.tag,
    body: (
      <>
        <p className="lead">{p.short}</p>
        <p>{p.description}</p>
        <ul>{p.features.map((f) => <li key={f}>{f}</li>)}</ul>
        <dl>{p.facts.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
        {p.links && <p className="out">{p.links.map(([label, href]) => <a key={href} href={href} target="_blank" rel="noreferrer">{label} ↗</a>)}</p>}
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

  const list = (items: Item[]) => (
    <ul className="project-list">
      {items.map((it) => {
        const isOpen = openProject === it.id;
        return (
          <li key={it.id} id={it.id} className={isOpen ? "open" : ""}>
            <button type="button" aria-expanded={isOpen} aria-controls={`${it.id}-body`} onClick={() => toggle(it.id)}>
              <span className="dash" aria-hidden="true">—</span>
              <span className="name">{it.name}</span>
              <span className="meta">{it.meta}</span>
            </button>
            <div className="body" id={`${it.id}-body`} hidden={!isOpen}>{it.body}</div>
          </li>
        );
      })}
    </ul>
  );

  return (
    <main>
      <AsciiPlane stunt={stunt} focus={focus} />

      <section className="intro" id="top">
        <h1>aaditya shah</h1>
        <p className="prompt"><span aria-hidden="true">&gt;</span> <Typer /></p>
        <a className="hint" href="#index">scroll <span aria-hidden="true">↓</span></a>
      </section>

      <div className="index" id="index">
        <header className="who">
          <h2>aaditya</h2>
          <p className="prompt"><span aria-hidden="true">&gt;</span> student / builder<i aria-hidden="true" /></p>
          <p className="where"><span aria-hidden="true">-=≡&gt;</span> Leland High, San Jose, CA</p>
          <p className="intro-copy">I build apps, games, websites, and whatever I want to learn next. Click anything below to open it.</p>
        </header>

        <section aria-labelledby="h-work"><h3 id="h-work">work</h3>{list(work)}</section>

        <section aria-labelledby="h-lang">
          <h3 id="h-lang">languages</h3>
          <ul className="langs">
            {LANGUAGES.map(([name, note]) => <li key={name} className={note ? "learning" : ""}>{name}{note && <small> {note}</small>}</li>)}
          </ul>
        </section>

        <section aria-labelledby="h-setup">
          <h3 id="h-setup">setup</h3>
          <dl className="spec">{MACHINE.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
          <ul className="langs">{TOOLS.map((t) => <li key={t}>{t}</li>)}</ul>
        </section>
        <section aria-labelledby="h-life"><h3 id="h-life">off the keyboard</h3>{list(life)}</section>

        <section aria-labelledby="h-rec">
          <h3 id="h-rec">recognition</h3>
          <ul className="awards">
            {awards.map((a) => (
              <li key={a.title}>
                <span className="yr">{a.year.toLowerCase()}</span>
                <span><b>{a.title}</b> <span className="note">{a.note}</span></span>
              </li>
            ))}
          </ul>
          <p className="aside">Congressional App Challenge 2025 recognition for Kura. Competing again in 2026 with Canary.</p>
        </section>

        <section aria-labelledby="h-hi">
          <h3 id="h-hi">get in touch</h3>
          <p>Got an idea? Let&apos;s build something. My code is on GitHub and my hackathon projects are on Devpost.</p>
        </section>

        <footer className="links">
          <a href="https://github.com/aShah2025" target="_blank" rel="noreferrer">GitHub ↗</a>
          <a href="https://devpost.com/livable-stilted-0a" target="_blank" rel="noreferrer">Devpost ↗</a>
          <a href="#top">Top ↑</a>
          <button type="button" onClick={toggleTheme} aria-label="Toggle dark mode">☾</button>
          <span>© 2026</span>
        </footer>
      </div>
    </main>
  );
}
