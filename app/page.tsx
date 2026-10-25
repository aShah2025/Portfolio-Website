"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";

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

const projects: Project[] = [
  {
    id: "wayfinder", number: "01", name: "Wayfinder", tag: "AI / Navigation", color: "#c98a6e", text: "#16120f",
    short: "Bike routes that actually listen.",
    description: "Type how you want to ride, like avoiding hills or a busy road, and Wayfinder builds real bike routes, measures every street on them, and picks the one that fits. The AI only turns your words into settings. The routing, scoring, and explanation are my own code on Valhalla and OpenStreetMap.",
    stat: "IMPACTHACK 2026",
    features: ["Plain-English instructions and follow-ups", "Side-by-side routes with climb, busy-road miles, bike-lane %", "Avoid any street by name with automatic re-routing", "Shows its math instead of AI-written excuses"],
    facts: [["Built for", "ImpactHack 2026"], ["Stack", "Python / Gemini / Valhalla"], ["Area", "California"]],
  },
  {
    id: "culturerisk", number: "02", name: "CultureRisk", tag: "AI / Hackathon", color: "#9aa7ad", text: "#101417",
    short: "Know the audience before you greenlight.",
    description: "An autonomous research agent for film-studio executives, built on Qloo's taste graph. Give it a project and its comparable titles. It plans an investigation across four Qloo endpoints, changes course as evidence comes in, and writes a greenlight memo where every number traces back to a logged Qloo call.",
    stat: "QLOO HACKATHON",
    features: ["Plans, acts, observes, and re-plans on its own", "Memo includes a popularity-trap section", "Also available as an MCP tool for other AI agents"],
    facts: [["Built for", "Qloo Hackathon"], ["Stack", "JavaScript / Netlify"], ["License", "MIT"]],
  },
  {
    id: "sum", number: "03", name: "Sum", tag: "iOS / Finance", color: "#a8b39a", text: "#12150f",
    short: "A better budgeting app.",
    description: "Built with Rishith Chennupati because we both struggled with budgeting and saving up for things like phones or 3D printers. Sum is built around saving toward things you actually want.",
    stat: "TWO-PERSON TEAM",
    features: ["Budgeting designed for students", "Savings goals for real purchases", "Built in Swift with a co-developer"],
    facts: [["Platform", "iOS"], ["Team", "With Rishith C."], ["Language", "Swift"]],
  },
  {
    id: "kura", number: "04", name: "Kura", tag: "iOS / Health", color: "#b9b79a", text: "#14140e",
    short: "Calories and macros, without the clutter.",
    description: "An iPhone calorie and macro tracker made for the Congressional App Challenge 2025. It keeps daily calories, protein, carbs, and fat quick to log and easy to understand.",
    stat: "BUILT FOR CAC 2025",
    features: ["Daily calorie total at a glance", "Protein, carbs, and fat tracked together", "Fast logging with no clutter"],
    facts: [["Platform", "iOS / SwiftUI"], ["Built for", "CAC 2025"], ["Focus", "Simplicity"]],
  },
  {
    id: "refill", number: "05", name: "Refill", tag: "iOS / Education", color: "#8f8ba3", text: "#ffffff",
    short: "No teacher should pay out of their own pocket.",
    description: "A SwiftUI app for drafting classroom supply requests and helping supporters discover projects. It reads live California DonorsChoose listings through a Cloudflare Worker, parses plain-English requests with AI, and labels clearly when it is showing sample data instead of live data.",
    stat: "CLASSROOM SUPPLIES",
    features: ["Draft a supply request in plain English", "Browse California classroom projects", "Stripe test-mode checkout with verified receipts"],
    facts: [["Platform", "iOS 17+"], ["Backend", "Cloudflare Worker"], ["Data", "DonorsChoose"]],
  },
  {
    id: "coursefit", number: "06", name: "CourseFit", tag: "Web / Scheduling", color: "#b3a58f", text: "#16130e",
    short: "Master schedules without the chaos.",
    description: "An automated master scheduling engine for schools. It captures student course selections and generates conflict-free schedules based on teacher availability and classroom capacity.",
    stat: "SCHOOL SCHEDULING",
    features: ["Collects student course selections", "Respects teacher availability", "Accounts for classroom capacity"],
    facts: [["Problem", "Manual scheduling"], ["Inputs", "Courses / teachers / rooms"], ["Output", "Conflict-free schedule"]],
  },
  {
    id: "turbo-lane", number: "07", name: "Turbo Lane", tag: "Game / Arcade", color: "#c4b27a", text: "#14110a",
    short: "A vertical racer built for one more run.",
    description: "A fast vertical arcade game about dodging traffic, chasing a higher score, crashing, and immediately trying again.",
    stat: "PLAYABLE",
    features: ["Dodge traffic across three lanes", "Chase a higher score every run", "Crash and restart instantly"],
    facts: [["Genre", "Arcade"], ["Status", "Playable"], ["Loop", "One more run"]],
  },
  {
    id: "formula-racer", number: "08", name: "Formula Racer", tag: "Game / 3D Racing", color: "#7d93a8", text: "#ffffff",
    short: "A 3D racing game in progress.",
    description: "A 3D racing game loosely inspired by the speed, cameras, and race-weekend energy of Formula 1 games. Still building it. Still improving the lap time.",
    stat: "IN DEVELOPMENT",
    features: ["Full 3D tracks and cars", "Cinematic racing cameras", "Race-weekend feel"],
    facts: [["Genre", "3D racing"], ["Status", "In development"], ["Inspired by", "F1 games"]],
  },
  {
    id: "winglab", number: "09", name: "WingLab", tag: "macOS / Physics", color: "#c3ccd0", text: "#101417",
    short: "An aerodynamics playground for Mac.",
    description: "Change a wing, adjust airflow and angle of attack, then compare lift, drag, and efficiency without needing an actual wind tunnel.",
    stat: "AERODYNAMICS SIM",
    features: ["Reshape a wing and see what changes", "Tune airflow and angle of attack", "Compare lift, drag, and efficiency"],
    facts: [["Platform", "macOS"], ["Topic", "Aerodynamics"], ["Outputs", "Lift / drag"]],
  },
];

const awards = [
  { year: "2026", title: "Congressional App Challenge", note: "Competing again", kind: "IN PROGRESS", href: "#recognition" },
  { year: "2026", title: "ImpactHack 2026", note: "Participant. Built Wayfinder", kind: "HACKATHON", href: "#wayfinder" },
  { year: "2025", title: "Congressional Recognition", note: "Congressional App Challenge (CAC) 2025", kind: "AWARD", href: "#recognition" },
  { year: "GLOBAL", title: "Qloo Global Hackathon", note: "Participant. Built CultureRisk, an agent on Qloo's taste graph", kind: "HACKATHON", href: "#culturerisk" },
  { year: "ONGOING", title: "Policy Debate & Congress", note: "Competitive debater in two events", kind: "ACTIVITY", href: "#awards" },
  { year: "NOW", title: "Kung Fu Red Belt", note: "Testing for black belt, expected April 2027", kind: "MARTIAL ARTS", href: "#awards" },
  { year: "NOW", title: "Leland Hackathon Club", note: "Exploring more", kind: "CLUB", href: "#awards" },
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
            return <g key={i} className="bar" style={{ ["--d" as string]: `${i * 0.15}s` }}><rect x={x} y={360 - h} width="160" height={h} strokeWidth="3" /><rect className="bar-fill" x={x} y={360 - h} width="160" height={h} fill="currentColor" /></g>;
          })}
          <path d="M60 360H760" strokeWidth="4" />
          <circle className="ring" cx="690" cy="110" r="64" strokeWidth="14" opacity=".25" />
          <circle className="ring-arc" cx="690" cy="110" r="64" strokeWidth="14" pathLength="1" />
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
          <path d="M60 340H760" strokeWidth="4" />
          <path className="draw" pathLength="1" d="M70 300 C170 290 220 250 300 255 S430 190 520 170 S660 90 740 70" strokeWidth="9" />
          {[0, 1, 2, 3, 4].map((i) => <rect key={i} className="coin" x={110 + i * 130} y={330 - i * 38} width="70" height={i * 38 + 10} fill="var(--project-color)" strokeWidth="3" style={{ ["--d" as string]: `${i * 0.12}s` }} />)}
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

export default function Home() {
  const [openProject, setOpenProject] = useState<string | null>("wayfinder");
  const progress = useRef<HTMLDivElement>(null);
  useReveal();
  useScrollProgress(progress);

  return (
    <main>
      <div className="progress" ref={progress} aria-hidden="true" />
      <nav className="topbar" aria-label="Main navigation">
        <a className="nav-name" href="#top">AS</a>
        <div className="nav-links">
          <a href="#work">Work</a>
          <a href="#about">About</a>
          <a href="#debate">Debate</a>
          <a href="#recognition">Recognition</a>
          <a href="#awards">Awards</a>
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
        <div className="hero-orbit" aria-hidden="true"><i /><i /><b>AS</b></div>
      </section>

      <div className="ticker" aria-hidden="true"><div>IOS APPS <i>✦</i> POLICY DEBATE <i>✦</i> KUNG FU <i>✦</i> 3D PRINTING <i>✦</i> RACING GAMES <i>✦</i> CONGRESSIONAL APP CHALLENGE <i>✦</i> WEB DESIGN <i>✦</i> QLOO HACKATHON <i>✦</i> IOS APPS <i>✦</i> POLICY DEBATE <i>✦</i> KUNG FU <i>✦</i> 3D PRINTING <i>✦</i> RACING GAMES <i>✦</i> CONGRESSIONAL APP CHALLENGE <i>✦</i> WEB DESIGN <i>✦</i> QLOO HACKATHON <i>✦</i></div></div>

      <section className="work" id="work">
        <header className="section-head" data-reveal>
          <span>01 / SELECTED WORK</span>
          <h2>Things I&apos;ve<br />built so far.</h2>
          <p>Nine projects across iOS, AI agents, web, and games. Open any one for what it does and how it works.</p>
        </header>

        <div className="project-list">
          {projects.map((project) => {
            const isOpen = openProject === project.id;
            return (
              <article className={`project ${isOpen ? "open" : ""}`} id={project.id} key={project.id} data-reveal style={{ "--project-color": project.color, "--project-text": project.text } as React.CSSProperties}>
                <button className="project-trigger" type="button" aria-expanded={isOpen} aria-controls={`${project.id}-details`} onClick={() => setOpenProject(isOpen ? null : project.id)}>
                  <span className="project-number">{project.number}</span>
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
      </section>

      <section className="lab" id="lab">
        <header className="lab-head" data-reveal><span>02 / RENDERS</span><h2>On the<br />bench.</h2></header>
        <div className="lab-grid">
          <figure className="render wide" data-reveal>
            <Viewer kind="printer" label="Interactive 3D render of an open-frame 3D printer printing a vase" />
            <figcaption><b>Open-frame printer, mid-print</b><span>Modeled in three.js. The nozzle follows the real tool path: the bed slides, the head sweeps, and the gantry climbs as the vase grows. Drag to orbit.</span></figcaption>
          </figure>
          <figure className="render" data-reveal>
            <Viewer kind="wing" label="Interactive 3D render of a wing in airflow" />
            <figcaption><b>Wing in airflow</b><span>The idea behind WingLab: a cambered airfoil with endplates and particles bending around it.</span></figcaption>
          </figure>
          <div className="render note" data-reveal>
            <p>Why a printer?</p>
            <span>I&apos;m newer to hardware and CAD. Rendering the machines I&apos;m learning to use is how I figure out how they actually work.</span>
          </div>
        </div>
      </section>

      <section className="about" id="about">
        <div className="about-kicker">03 / ABOUT</div>
        <div className="about-title" data-reveal><span>I&apos;m</span><span>still</span><span>learning.</span></div>
        <div className="about-copy" data-reveal>
          <p>I&apos;m a student at Leland High School in San Jose, and I went to Bret Harte Middle School before that. I&apos;m strongest at product ideas, iOS apps, games, and web design.</p>
          <p>Outside of code I debate policy and congress, train kung fu (red belt now, black belt test expected April 2027), and I&apos;m exploring the Leland Hackathon Club and Leland Motorsport Club, which is where I learn to take a messy problem and argue for a clear solution. I would rather show what I&apos;m learning than pretend I already know everything.</p>
        </div>
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

      <section className="recognition" id="recognition">
        <div className="recognition-label">05 / RECOGNITION</div>
        <div className="seal" aria-hidden="true"><svg viewBox="0 0 200 200"><defs><path id="circ" d="M100 100 m-78 0 a78 78 0 1 1 156 0 a78 78 0 1 1 -156 0" /></defs><text><textPath href="#circ">CONGRESSIONAL APP CHALLENGE ✦ 2025 ✦ 2026 ✦</textPath></text></svg><b>CAC</b></div>
        <p data-reveal>Congressional</p><p data-reveal>recognition<span>.</span></p>
        <div className="recognition-footer"><span>Congressional App Challenge 2025 recognition. Competing again in 2026.</span><span>2025 / 2026</span></div>
      </section>

      <section className="awards" id="awards">
        <header className="awards-head" data-reveal>
          <span>06 / AWARDS &amp; ACTIVITIES</span>
          <h2>Beyond<br />the code.</h2>
        </header>
        <ul className="award-list">
          {awards.map((a, i) => (
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

      <footer className="footer">
        <p>GOT AN IDEA?</p><h2 data-reveal>Let&apos;s build<br />something.</h2>
        <div><span>AADITYA SHAH / 2026</span><a href="https://github.com/aShah2025" target="_blank" rel="noreferrer">GITHUB ↗</a><a href="#top">BACK TO TOP ↑</a></div>
      </footer>
    </main>
  );
}
