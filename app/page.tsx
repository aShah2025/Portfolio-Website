"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { pianoPlayer, PIECES } from "./pianoPlayer";

const Viewer = dynamic(() => import("./Viewer"), { ssr: false });

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
  },
  {
    id: "culturerisk", number: "02", name: "CultureRisk", tag: "AI / Hackathon", color: "#7aa2f7", text: "#101417",
    short: "Know the audience before you greenlight.",
    description: "An autonomous research agent for film-studio executives, built on Qloo's taste graph. Give it a project and its comparable titles. It plans an investigation across four Qloo endpoints, changes course as evidence comes in, and writes a greenlight memo where every number traces back to a logged Qloo call.",
    stat: "QLOO HACKATHON",
    features: ["Plans, acts, observes, and re-plans on its own", "Memo includes a popularity-trap section", "Also available as an MCP tool for other AI agents"],
    facts: [["Built for", "Qloo Hackathon"], ["Stack", "JavaScript / Netlify"], ["License", "MIT"]],
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
  },
  {
    id: "coursefit", number: "06", name: "CourseFit", tag: "Web / Scheduling", color: "#55c2d3", text: "#16130e",
    short: "Master schedules without the chaos.",
    description: "An automated master scheduling engine for schools. It captures student course selections and generates conflict-free schedules based on teacher availability and classroom capacity.",
    stat: "SCHOOL SCHEDULING",
    features: ["Collects student course selections", "Respects teacher availability", "Accounts for classroom capacity"],
    facts: [["Problem", "Manual scheduling"], ["Inputs", "Courses / teachers / rooms"], ["Output", "Conflict-free schedule"]],
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
  { year: "2026", title: "Congressional App Challenge", note: "Competing again with Canary", kind: "IN PROGRESS", href: "#canary" , code: true },
  { year: "2026", title: "ImpactHack 2026", note: "Participant. Built Wayfinder", kind: "HACKATHON", href: "#wayfinder" , code: true },
  { year: "2025", title: "Congressional Recognition", note: "Congressional App Challenge (CAC) 2025, with Kura", kind: "AWARD", href: "#kura" , code: true },
  { year: "GLOBAL", title: "Qloo Global Hackathon", note: "Participant. Built CultureRisk, an agent on Qloo's taste graph", kind: "HACKATHON", href: "#culturerisk" , code: true },
  { year: "NOW", title: "Driver's License", note: "Working toward it", kind: "IN PROGRESS", href: "#awards" },
  { year: "GOAL", title: "Private Pilot Licence", note: "The long-term goal", kind: "IN PROGRESS", href: "#goal" },
  { year: "NOW", title: "Leland Hackathon Club", note: "Exploring more", kind: "CLUB", href: "#recognition" , code: true },
  { year: "NOW", title: "Leland Motorsport Club", note: "Exploring more", kind: "CLUB", href: "#awards" },
  { year: "7TH GRADE", title: "Spelling Bee Champion", note: "Won at Bret Harte Middle School, then placed 15th out of 140 at regionals", kind: "1ST PLACE", href: "#awards" },
  { year: "7TH GRADE", title: "Geography Bee, 3rd Place", note: "Bret Harte Middle School", kind: "3RD PLACE", href: "#awards" },
  { year: "6TH GRADE", title: "Spelling Bee, 3rd Place", note: "Bret Harte Middle School", kind: "3RD PLACE", href: "#awards" },
];

function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>("[data-reveal]");
    if (!("IntersectionObserver" in window)) {
      els.forEach((el) => el.classList.add("in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }),
      { threshold: 0.18, rootMargin: "0px 0px -6% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}

// Headlines arrive as random symbols that settle into the real letters from left to right, the same glyphs
// the 3D scenes are drawn with. Text inside [data-noscramble] (the count-ups) is left alone.
const SCRAMBLE = "/?<>%*#@+=:;";
function useScramble() {
  useEffect(() => {
    if (!("IntersectionObserver" in window) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const els = Array.from(document.querySelectorAll<HTMLElement>("[data-scramble]"));
    const raf: number[] = [];
    const run = (el: HTMLElement) => {
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      const nodes: [Text, string][] = [];
      while (walker.nextNode()) { const t = walker.currentNode as Text; if (t.data.trim() && !t.parentElement?.closest("[data-noscramble]")) nodes.push([t, t.data]); }
      const total = nodes.reduce((n, [, s]) => n + s.length, 0);
      const t0 = performance.now(), dur = Math.min(1500, 450 + total * 30);
      const step = (now: number) => {
        const k = (now - t0) / dur;
        let i = 0;
        for (const [node, orig] of nodes) node.data = Array.from(orig, (ch) => (ch === " " || i++ / total < k ? ch : SCRAMBLE[(Math.random() * SCRAMBLE.length) | 0])).join("");
        if (k < 1) raf.push(requestAnimationFrame(step));
        else nodes.forEach(([n, o]) => { n.data = o; });
      };
      raf.push(requestAnimationFrame(step));
    };
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) { io.unobserve(e.target); run(e.target as HTMLElement); } }),
      { threshold: 0.3 },
    );
    els.forEach((el) => { if (!el.hasAttribute("aria-label")) el.setAttribute("aria-label", el.innerText.replace(/\s+/g, " ").trim()); io.observe(el); });
    return () => { io.disconnect(); raf.forEach(cancelAnimationFrame); };
  }, []);
}

function useScrollProgress(ref: React.RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      ref.current?.style.setProperty("--p", String(max > 0 ? window.scrollY / max : 0));
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { window.removeEventListener("scroll", onScroll); if (raf) cancelAnimationFrame(raf); };
  }, [ref]);
}

function usePin(ref: React.RefObject<HTMLElement | null>, onP?: (p: number, el: HTMLElement) => void) {
  const prog = useRef(0);
  const cb = useRef(onP);
  useEffect(() => { cb.current = onP; });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const stages = Array.from(el.querySelectorAll<HTMLElement>("[data-in]"));
    let raf = 0;
    const tick = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      const max = r.height - window.innerHeight;
      const p = Math.min(1, Math.max(0, max > 0 ? -r.top / max : 0));
      prog.current = p;
      for (const st of stages) {
        const a = Number(st.dataset.in), b = Number(st.dataset.out);
        const o = Math.min(1, Math.max(0, (p - a) / 0.05)) * Math.min(1, Math.max(0, (b - p) / 0.05));
        st.style.opacity = String(o);
        st.style.transform = `translateY(${(1 - o) * 26}px)`;
      }
      cb.current?.(p, el);
    };
    const on = () => { if (!raf) raf = requestAnimationFrame(tick); };
    tick();
    window.addEventListener("scroll", on, { passive: true });
    window.addEventListener("resize", on);
    return () => { window.removeEventListener("scroll", on); window.removeEventListener("resize", on); if (raf) cancelAnimationFrame(raf); };
  }, [ref]);
  return prog;
}

const alt01 = (p: number) => {
  const sm = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  return sm(0.14, 0.4, p) * (1 - sm(0.72, 0.94, p));
};

function flightHud(p: number, el: HTMLElement) {
  const alt = el.querySelector<HTMLElement>("[data-alt]");
  if (alt) alt.textContent = Math.round(alt01(p) * 3500).toLocaleString("en-US");
  const hdg = el.querySelector<HTMLElement>("[data-hdg]");
  if (hdg) hdg.textContent = String(Math.round(((270 + Math.sin(p * 5) * 25 + p * 20) % 360 + 360) % 360)).padStart(3, "0");
  el.querySelectorAll<HTMLElement>("[data-cp]").forEach((c) => c.classList.toggle("on", p >= Number(c.dataset.cp)));
  const bar = el.querySelector<HTMLElement>("[data-bar]");
  if (bar) bar.style.transform = `scaleX(${p})`;
}

function statementWords(p: number, el: HTMLElement) {
  const words = el.querySelectorAll<HTMLElement>("[data-w]");
  words.forEach((w, i) => {
    const o = Math.min(1, Math.max(0, (p - (i / words.length) * 0.8 - 0.04) / 0.07));
    w.style.opacity = String(0.16 + 0.84 * o);
  });
}

function CountUp({ to }: { to: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!("IntersectionObserver" in window) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) { el.textContent = String(to); return; }
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      const t0 = performance.now();
      const step = (t: number) => { const k = Math.min(1, (t - t0) / 1600); el.textContent = String(Math.round(to * (1 - (1 - k) ** 3))); if (k < 1) requestAnimationFrame(step); };
      requestAnimationFrame(step);
    }, { threshold: 0.5 });
    io.observe(el);
    return () => io.disconnect();
  }, [to]);
  return <span ref={ref} data-noscramble>{to}</span>;
}

function Art({ id }: { id: string }) {
  const common = { viewBox: "0 0 800 400", preserveAspectRatio: "xMidYMid slice", fill: "none", stroke: "currentColor", strokeWidth: 3, strokeLinecap: "round", strokeLinejoin: "round" } as const;
  switch (id) {
    case "wayfinder":
      return (
        <svg {...common}>
          <g opacity=".22" strokeWidth="1.5">{Array.from({ length: 17 }, (_, i) => <path key={`v${i}`} d={`M${i * 50} 0V400`} />)}{Array.from({ length: 9 }, (_, i) => <path key={`h${i}`} d={`M0 ${i * 50}H800`} />)}</g>
          <path d="M-20 330 C120 300 160 200 300 220 S480 340 560 230 S700 80 830 110" strokeWidth="14" opacity=".15" />
          <path className="draw" pathLength="1" d="M-20 330 C120 300 160 200 300 220 S480 340 560 230 S700 80 830 110" strokeWidth="9" />
          <circle cx="40" cy="322" r="14" fill="currentColor" />
          <g className="pin"><circle cx="700" cy="96" r="26" fill="var(--project-color)" strokeWidth="6" /><circle cx="700" cy="96" r="9" fill="currentColor" /></g>
        </svg>
      );
    case "kura":
      return (
        <svg {...common}>
          {[0, 1, 2].map((i) => {
            const h = [260, 180, 220][i];
            const x = 120 + i * 220;
            return <g key={i} className="bar" style={{ ["--d" as string]: `${i * 0.15}s` }}><rect x={x} y={360 - h} width="160" height={h} strokeWidth="3" /><rect className="bar-fill" x={x} y={360 - h} width="160" height={h} fill="var(--project-color)" stroke="none" /></g>;
          })}
          <path d="M60 360H760" strokeWidth="4" />
          <circle className="ring" cx="690" cy="110" r="64" strokeWidth="14" opacity=".25" />
          <circle className="ring-arc" cx="690" cy="110" r="64" strokeWidth="14" pathLength="1" />
        </svg>
      );
    case "canary":
      return (
        <svg {...common}>
          <rect x="40" y="170" width="720" height="90" rx="45" fill="var(--project-color)" stroke="none" opacity=".14" />
          <path d="M40 215H760" strokeWidth="1.5" strokeDasharray="6 10" opacity=".5" />
          <path className="draw" pathLength="1" d="M40 220 C100 190 140 240 200 212 S300 186 360 222 S460 238 520 205 S600 250 640 290 S700 330 740 320" strokeWidth="7" />
          <circle className="flag" cx="740" cy="320" r="16" fill="var(--project-color)" strokeWidth="5" />
          <path transform="translate(590 0)" d="M120 70a34 34 0 1 0 40 44a28 28 0 1 1 -40 -44z" fill="var(--project-color)" stroke="none" />
          {[0, 1, 2, 3, 4, 5, 6].map((i) => <rect key={i} x={200 + i * 64} y="80" width="40" height="40" rx="8" fill={i === 3 || i === 4 ? "var(--project-color)" : "none"} strokeWidth="2.5" opacity={i === 3 || i === 4 ? 1 : 0.5} />)}
        </svg>
      );
    case "refill":
      return (
        <svg {...common}>
          <g opacity=".25" strokeWidth="1.5"><circle cx="400" cy="200" r="90" /><circle cx="400" cy="200" r="170" /><circle cx="400" cy="200" r="250" /></g>
          <g className="links" strokeWidth="2.5" strokeDasharray="6 10"><path d="M400 200 160 90" /><path d="M400 200 650 110" /><path d="M400 200 190 320" /><path d="M400 200 640 310" /></g>
          <g className="node" style={{ ["--d" as string]: "0s" }}><circle cx="400" cy="200" r="34" fill="currentColor" /></g>
          {[[160, 90], [650, 110], [190, 320], [640, 310]].map(([x, y], i) => (
            <g className="node" key={i} style={{ ["--d" as string]: `${0.2 + i * 0.15}s` }}><circle cx={x} cy={y} r="24" fill="var(--project-color)" strokeWidth="5" /><circle cx={x} cy={y} r="7" fill="currentColor" /></g>
          ))}
          <circle className="pulse" cx="400" cy="200" r="34" strokeWidth="4" />
        </svg>
      );
    case "turbo-lane":
      return (
        <svg {...common}>
          <g opacity=".5" strokeWidth="3"><path d="M270 0V400M530 0V400" strokeDasharray="30 28" className="dashes" /><path d="M120 0V400M680 0V400" strokeWidth="6" /></g>
          {[[155, 40], [330, 120], [600, 20], [440, 250]].map(([x, y], i) => (
            <g key={i} className="car" style={{ ["--d" as string]: `${-i * 0.9}s`, ["--s" as string]: `${3 + (i % 2) * 0.6}s` }}><rect x={x} y={y} width="70" height="120" rx="14" fill="var(--project-color)" strokeWidth="5" /><rect x={x + 12} y={y + 24} width="46" height="28" rx="6" fill="currentColor" /></g>
          ))}
          <g className="player"><rect x="365" y="270" width="70" height="120" rx="14" fill="currentColor" /><rect x="377" y="294" width="46" height="28" rx="6" fill="var(--project-color)" stroke="none" /></g>
        </svg>
      );
    case "formula-racer":
      return (
        <svg {...common}>
          <path d="M120 300 C90 190 190 90 330 110 C440 126 470 220 570 190 C690 154 740 190 700 290 C670 360 540 350 440 330 C330 308 170 400 120 300Z" strokeWidth="26" opacity=".18" />
          <path d="M120 300 C90 190 190 90 330 110 C440 126 470 220 570 190 C690 154 740 190 700 290 C670 360 540 350 440 330 C330 308 170 400 120 300Z" strokeWidth="3" strokeDasharray="4 12" />
          <path id="track" d="M120 300 C90 190 190 90 330 110 C440 126 470 220 570 190 C690 154 740 190 700 290 C670 360 540 350 440 330 C330 308 170 400 120 300Z" strokeWidth="0" />
          <circle r="14" fill="currentColor"><animateMotion dur="4.5s" repeatCount="indefinite" rotate="auto"><mpath href="#track" /></animateMotion></circle>
          <circle r="10" fill="var(--project-color)" strokeWidth="4"><animateMotion dur="4.5s" begin="-1.3s" repeatCount="indefinite"><mpath href="#track" /></animateMotion></circle>
          <path d="M120 270V330" strokeWidth="8" />
        </svg>
      );
    case "winglab":
      return (
        <svg {...common}>
          {[70, 120, 170, 230, 280, 330].map((y, i) => (
            <path key={y} className="flow" style={{ ["--d" as string]: `${-i * 0.35}s` }} d={`M-40 ${y} C200 ${y} 300 ${y < 200 ? y - 40 : y + 40} 420 ${y < 200 ? y - 34 : y + 34} S650 ${y} 840 ${y}`} strokeWidth="3" strokeDasharray="22 16" />
          ))}
          <g className="wing"><path d="M250 205 C320 150 480 160 560 200 C480 232 330 244 250 205Z" fill="var(--project-color)" strokeWidth="6" /><path d="M250 205H560" strokeWidth="2" opacity=".5" /></g>
          <path d="M400 150V70M385 88 400 66 415 88" strokeWidth="5" className="lift" />
        </svg>
      );
    case "culturerisk":
      return (
        <svg {...common}>
          <g className="links" strokeWidth="2" strokeDasharray="5 9"><path d="M400 200 170 110M400 200 640 90M400 200 150 310M400 200 660 300M170 110 150 310M640 90 660 300" /></g>
          {[[400, 200, 40], [170, 110, 22], [640, 90, 26], [150, 310, 20], [660, 300, 24]].map(([x, y, r], i) => (
            <g className="node" key={i} style={{ ["--d" as string]: `${i * 0.2}s` }}><circle cx={x} cy={y} r={r} fill={i === 0 ? "currentColor" : "var(--project-color)"} strokeWidth="4" /></g>
          ))}
          <circle className="pulse" cx="400" cy="200" r="40" strokeWidth="3" />
        </svg>
      );
    case "sum":
      return (
        <svg {...common}>
          <path d="M60 340H760" strokeWidth="3" opacity=".4" />
          {[0, 1, 2, 3, 4].map((i) => <rect key={i} className="coin" x={110 + i * 130} y={330 - i * 38} width="70" height={i * 38 + 10} rx="6" fill="var(--project-color)" stroke="none" style={{ ["--d" as string]: `${i * 0.12}s` }} />)}
          <path className="draw" pathLength="1" d="M145 312 C210 302 230 282 275 274 S360 244 405 236 S490 207 535 198 S620 168 665 160" strokeWidth="5" />
          {[0, 1, 2, 3, 4].map((i) => <circle key={i} cx={145 + i * 130} cy={312 - i * 38} r="9" fill="var(--paper)" strokeWidth="4" />)}
        </svg>
      );
    case "coursefit":
      return (
        <svg {...common}>
          {Array.from({ length: 5 }, (_, c) => Array.from({ length: 5 }, (_, r) => {
            const on = (c * 3 + r * 2) % 5 !== 0;
            return <rect key={`${c}${r}`} className={on ? "slot" : "slot off"} x={90 + c * 130} y={50 + r * 62} width="112" height="48" rx="6" fill={on ? "currentColor" : "none"} strokeWidth="2.5" style={{ ["--d" as string]: `${(c + r) * 0.1}s` }} />;
          }))}
        </svg>
      );
    default:
      return null;
  }
}

const sections: [string, string][] = [["about", "About"], ["work", "Work"], ["debate", "Debate"], ["kungfu", "Kung Fu"], ["piano", "Piano"], ["awards", "Awards"], ["goal", "Goal"]];

// The piano starts sounding when its section scrolls into view (once the visitor has interacted with the page,
// which browsers require for audio) and pauses when it leaves. Pausing it by hand keeps it paused.
function usePiano() {
  const [, rerender] = useState(0);
  const userPaused = useRef(false);
  useEffect(() => {
    const off = pianoPlayer.subscribe(() => rerender((n) => n + 1));
    if (!pianoPlayer.notes.length) pianoPlayer.load(PIECES[0].id);
    const el = document.getElementById("piano");
    const io = el && new IntersectionObserver(([e]) => {
      const active = (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation?.hasBeenActive;
      if (e.isIntersecting && active && !userPaused.current && !pianoPlayer.playing) pianoPlayer.play(pianoPlayer.piece.id, pianoPlayer.offset);
      if (!e.isIntersecting) pianoPlayer.stop();
    }, { threshold: 0.45 });
    if (el && io) io.observe(el);
    return () => { off(); io?.disconnect(); pianoPlayer.stop(); };
  }, []);
  const toggle = () => {
    if (pianoPlayer.playing) { userPaused.current = true; pianoPlayer.stop(); }
    else { userPaused.current = false; pianoPlayer.play(pianoPlayer.piece.id, pianoPlayer.offset); }
  };
  const choose = (id: string) => { userPaused.current = false; pianoPlayer.play(id, 0); };
  return { player: pianoPlayer, toggle, choose };
}

function PianoProgress() {
  const bar = useRef<HTMLSpanElement>(null), label = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    let raf = 0;
    const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
    const loop = () => {
      const t = pianoPlayer.position() ?? pianoPlayer.offset, d = pianoPlayer.duration || 1;
      if (bar.current) bar.current.style.transform = `scaleX(${Math.min(1, t / d)})`;
      if (label.current) label.current.textContent = `${fmt(t)} / ${fmt(pianoPlayer.duration)}`;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);
  return <div className="pp-progress"><i><span ref={bar} /></i><span ref={label}>0:00</span></div>;
}

function useActiveSection() {
  const [active, setActive] = useState("");
  useEffect(() => {
    const on = () => {
      let cur = "";
      for (const [id] of sections) { const el = document.getElementById(id); if (el && el.getBoundingClientRect().top < window.innerHeight * 0.4) cur = id; }
      setActive(cur);
    };
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  return active;
}

export default function Home() {
  const [openProject, setOpenProject] = useState<string | null>(featured[0]);
  const progress = useRef<HTMLDivElement>(null);
  const nav = useRef<HTMLElement>(null);
  const macRef = useRef<HTMLElement>(null);
  const stRef = useRef<HTMLElement>(null);
  const flightRef = useRef<HTMLElement>(null);
  useReveal();
  useScramble();
  const active = useActiveSection();
  const { player, toggle, choose } = usePiano();
  useScrollProgress(progress);
  const macP = usePin(macRef);
  usePin(stRef, statementWords);
  const flightP = usePin(flightRef, flightHud);
  useEffect(() => {
    const on = () => nav.current?.classList.toggle("scrolled", window.scrollY > 60);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  return (
    <main>
      <div className="progress" ref={progress} aria-hidden="true" />
      <nav className="topbar" aria-label="Main navigation" ref={nav}>
        <a className="nav-name" href="#top">AS</a>
        <div className="nav-links">
          {sections.map(([id, name]) => <a key={id} href={`#${id}`} className={active === id ? "on" : ""}>{name}</a>)}
          <a href="https://github.com/aShah2025" target="_blank" rel="noreferrer">GitHub ↗</a>
        </div>
      </nav>

      <section className="hero" id="top">
        <div className="hero-meta"><span>HIGH-SCHOOL STUDENT</span><span>LELAND HIGH · SAN JOSE, CA</span><span>PORTFOLIO / 2026</span></div>
        <h1 aria-label="Aaditya Shah"><span><em>Aaditya</em></span><span><em>Shah<i>.</i></em></span></h1>
        <div className="hero-bottom">
          <p>I build apps, games, websites,<br />and whatever I want to learn next.</p>
          <a href="#work">See the work <span>↓</span></a>
        </div>
        <div className="hero-scene"><Viewer kind="desk" label="Interactive 3D render of a MacBook with a small solar system floating beside it" /></div>
      </section>


      <section className="pin pin-mac" ref={macRef} aria-label="Scroll story: a laptop opening">
        <div className="pin-sticky">
          <Viewer kind="mac" progress={macP} label="3D MacBook that opens as you scroll while the camera orbits around it" />
          <div className="pin-text">
            <p className="stage" data-in="-0.1" data-out="0.24">Hi, I&apos;m Aaditya.</p>
            <p className="stage" data-in="0.3" data-out="0.56">Student at Leland High.</p>
            <p className="stage" data-in="0.64" data-out="1.1">I build apps, agents, and games.</p>
          </div>
          <span className="scroll-hint" aria-hidden="true">Scroll</span>
        </div>
      </section>

      <section className="statement" ref={stRef}>
        <div className="pin-sticky">
          <p>{"I build apps, AI agents, and games. I argue policy and Congress. I train kung fu. I play piano. And I'm working toward my driver's licence, then my pilot's licence.".split(" ").map((w, i) => <span key={i} data-w>{w} </span>)}</p>
        </div>
      </section>

      <section className="about" id="about">
        <div className="about-kicker">01 / ABOUT</div>
        <div className="about-title" data-reveal><span>Leland</span><span>High,</span><span>San Jose.</span></div>
        <div className="about-copy" data-reveal>
          <p>I&apos;m in high school at Leland, and went to Bret Harte Middle School before that. I&apos;m strongest at product ideas, iOS apps, games, and web design.</p>
          <p>Outside of school I debate policy and Congress, train kung fu, and play piano. I&apos;m also in the Leland Hackathon Club and Leland Motorsport Club.</p>
        </div>
      </section>

      <section className="work" id="work">
        <header className="section-head" data-reveal>
          <span>02 / SELECTED WORK</span>
          <h2>Things I&apos;ve<br />built so far.</h2>
          <p>The five I&apos;m proudest of, across iOS, AI agents, and games. Open any one for what it does and how it works.</p>
        </header>

        <div className="project-list">
          {featured.map((id) => projects.find((p) => p.id === id)!).map((project, i) => {
            const isOpen = openProject === project.id;
            return (
              <article className={`project ${isOpen ? "open" : ""}`} id={project.id} key={project.id} style={{ "--project-color": project.color } as React.CSSProperties}>
                <button className="project-trigger" type="button" aria-expanded={isOpen} aria-controls={`${project.id}-details`} onClick={() => setOpenProject(isOpen ? null : project.id)}>
                  <span className="project-number">{String(i + 1).padStart(2, "0")}</span>
                  <span className="project-title">{project.name}</span>
                  <span className="project-tag">{project.tag}</span>
                  <span className="project-toggle" aria-hidden="true">{isOpen ? "−" : "+"}</span>
                </button>
                <div className="project-details" id={`${project.id}-details`}>
                  <div className="project-inner">
                    <div className="project-copy">
                      <p>{project.short}</p>
                      <div>
                        <p>{project.description}</p>
                        <ul className="project-features">{project.features.map((f) => <li key={f}>{f}</li>)}</ul>
                      </div>
                    </div>
                    <dl className="project-facts">{project.facts.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
                    <div className={`project-art art-${project.id}`} aria-hidden="true"><span>{project.stat}</span><Art id={project.id} /></div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
        <div className="also-built" data-reveal>
          <span>Also built</span>
          <ul>{projects.filter((p) => !featured.includes(p.id)).map((p) => <li key={p.id}><b>{p.name}</b> {p.short}</li>)}</ul>
        </div>
      </section>

      <section className="recognition" id="recognition">
        <div className="recognition-label">03 / RECOGNITION &amp; HACKATHONS</div>
        <div className="seal" aria-hidden="true"><svg viewBox="0 0 200 200"><defs><path id="circ" d="M100 100 m-78 0 a78 78 0 1 1 156 0 a78 78 0 1 1 -156 0" /></defs><text><textPath href="#circ">CONGRESSIONAL APP CHALLENGE ✦ 2025 ✦ 2026 ✦</textPath></text></svg><b>CAC</b></div>
        <p data-reveal>Congressional</p><p data-reveal>recognition<span>.</span></p>
        <div className="recognition-footer"><span>Recognized in the Congressional App Challenge 2025 for Kura. Competing again in 2026 with Canary.</span><span>2025 / 2026</span></div>
        <ul className="award-list code-awards">
          {awards.filter((a) => a.code).map((a, i) => (
            <li className="award" key={a.title} data-reveal style={{ "--i": i } as React.CSSProperties}>
              <a href={a.href}><span className="award-year">{a.year}</span><span className="award-title">{a.title}</span><span className="award-note">{a.note}</span><span className="award-kind">{a.kind}</span></a>
            </li>
          ))}
        </ul>
      </section>

      <section className="debate" id="debate">
        <header className="debate-head" data-reveal><span>04 / DEBATE</span><h2>Argue it,<br />then build it.</h2></header>
        <div className="debate-grid">
          <article data-reveal>
            <h3>Policy debate</h3>
            <p>A two-person event built around one resolution for the whole season. It rewards heavy research, tight evidence, fast delivery, and the ability to defend a position and then flip and attack it.</p>
            <ul><li>Constructive speeches and rebuttals</li><li>Cross-examination under pressure</li><li>Evidence-driven case writing</li></ul>
          </article>
          <article data-reveal>
            <h3>Congress</h3>
            <p>A mock legislature. Every round you work through real bills and resolutions: giving speeches for or against, answering questions from other legislators, and persuading a room that does not have to agree with you.</p>
            <ul><li>Speeches on proposed legislation</li><li>Questioning and floor debate</li><li>Writing and sponsoring legislation</li></ul>
          </article>
        </div>
        <p className="debate-line" data-reveal>Debate is where I learned to explain a messy problem clearly, which is most of what building a useful app comes down to.</p>
      </section>

      <section className="kungfu" id="kungfu">
        <header className="kf-head" data-reveal><span>05 / KUNG FU</span><h2><CountUp to={5} /> years<br />on the mat.</h2></header>
        <div className="kf-stats">
          <div data-reveal><b>5 years</b><span>Training</span></div>
          <div data-reveal><b>Red-black belt</b><span>Current rank</span></div>
          <div data-reveal><b>April 2027</b><span>Black belt test, expected</span></div>
        </div>
        <div className="kf-track" data-reveal aria-label="Progress toward black belt">
          <i><u /></i>
          <ol>
            <li><b>5 years ago</b><span>Started training</span></li>
            <li className="here"><b>Now</b><span>Red-black belt</span></li>
            <li><b>April 2027</b><span>Black belt test</span></li>
          </ol>
        </div>
        <p className="kf-copy" data-reveal>Five years of showing up, repeating the basics, and testing for the next belt. The black belt test is the next milestone.</p>
      </section>

      <section className="piano" id="piano">
        <div className="piano-copy">
          <header className="kf-head piano-head" data-reveal><span>06 / PIANO</span><h2><CountUp to={6} /> years<br />at the keys.</h2></header>
          <div className="kf-stats piano-stats">
            <div data-reveal><b>Classical</b><span>Focus</span></div>
            <div data-reveal><b>RCM Level 9</b><span>Royal Conservatory</span></div>
          </div>
        </div>
        <figure className="render piano-render" data-reveal>
          <Viewer kind="piano" label="Dot-outline 3D render of a grand piano playing the opening of the Moonlight Sonata's third movement. Drag to rotate." />
          <figcaption className="piano-play">
            <div className="pp-now">
              <button type="button" className="pp-toggle" aria-pressed={player.playing} aria-label={player.playing ? "Pause" : "Play with sound"} onClick={toggle}>{player.playing ? "❚❚" : "▶"}</button>
              <div><b>{player.piece.composer}</b><span>{player.piece.title}</span></div>
            </div>
            <PianoProgress />
            <ol className="pp-list">
              {PIECES.map((p) => <li key={p.id}><button type="button" className={p.id === player.piece.id ? "on" : ""} onClick={() => choose(p.id)}><b>{p.composer}</b> {p.title}</button></li>)}
            </ol>
            <small>{player.piece.credit}. Piano samples: Salamander Grand Piano, CC BY 3.0.</small>
          </figcaption>
        </figure>
      </section>

      <section className="awards" id="awards">
        <header className="awards-head" data-reveal>
          <span>07 / AWARDS &amp; ACTIVITIES</span>
          <h2>Beyond<br />the code.</h2>
        </header>
        <ul className="award-list">
          {awards.filter((a) => !a.code).map((a, i) => (
            <li className="award" key={a.title} data-reveal style={{ "--i": i } as React.CSSProperties}>
              <a href={a.href}>
                <span className="award-year">{a.year}</span>
                <span className="award-title">{a.title}</span>
                <span className="award-note">{a.note}</span>
                <span className="award-kind">{a.kind}</span>
              </a>
            </li>
          ))}
        </ul>
      </section>

      <section className="pin pin-flight" id="goal" ref={flightRef} aria-label="Scroll story: working toward a private pilot licence">
        <div className="pin-sticky">
          <Viewer kind="flight" progress={flightP} label="3D single-engine airplane flying over terrain as you scroll" />
          <div className="pin-text">
            <p className="stage kicker" data-in="-0.1" data-out="0.2"><small>08 / THE GOAL</small>Private pilot licence.</p>
            <p className="stage" data-in="0.24" data-out="0.46">Ground school first.</p>
            <p className="stage" data-in="0.5" data-out="0.72">Then the first solo.</p>
            <p className="stage" data-in="0.76" data-out="1.1">Then the checkride.</p>
          </div>
          <p className="credit">Map: © OpenStreetMap contributors (ODbL), AWS Terrain Tiles</p>
          <div className="hud" aria-hidden="true">
            <div><span>ALT</span><b data-alt>0</b><span>FT</span></div>
            <div><span>HDG</span><b data-hdg>270</b></div>
            <ol><li data-cp="0.05">Ground school</li><li data-cp="0.45">First solo</li><li data-cp="0.8">Checkride</li></ol>
            <i><u data-bar /></i>
          </div>
        </div>
      </section>

      <footer className="footer">
        <p>GOT AN IDEA?</p><h2 data-reveal>Let&apos;s build<br />something.</h2>
        <div><span>AADITYA SHAH / 2026</span><a href="https://github.com/aShah2025" target="_blank" rel="noreferrer">GITHUB ↗</a><a href="#top">BACK TO TOP ↑</a></div>
      </footer>
    </main>
  );
}
