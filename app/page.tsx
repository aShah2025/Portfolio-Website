"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const projects = [
  {
    id: "wayfinder",
    index: "01",
    name: "Wayfinder",
    group: "main projects",
    status: "prototype",
    platform: "iOS · Valhalla API",
    accent: "#4f7cff",
    visual: "route",
    description:
      "Bike routes that listen to actual instructions, because ‘avoid highways’ should not be a complicated request.",
    detail:
      "Describe the ride you want, add filters like safer streets or no highways, and Wayfinder builds the route around those choices.",
  },
  {
    id: "kura",
    index: "02",
    name: "Kura",
    group: "main projects",
    status: "built",
    platform: "iOS · CAC 2025",
    accent: "#ff6a4d",
    visual: "health",
    description:
      "A calorie and macro tracker for iPhone. It does the math so I do not have to keep reopening Calculator.",
    detail:
      "I made Kura for CAC 2025 to keep daily calories, protein, carbs, and fat quick to log and easy to read.",
  },
  {
    id: "refill",
    index: "03",
    name: "Refill",
    group: "main projects",
    status: "built",
    platform: "iOS · education",
    accent: "#d7ff45",
    visual: "resources",
    description:
      "Gets extra classroom supplies to teachers who need them, because teachers buying basics themselves makes no sense.",
    detail:
      "Refill is a nearby resource network where educators can list, find, and share classroom supplies instead of paying out of pocket.",
  },
  {
    id: "turbo-lane",
    index: "04",
    name: "Turbo Lane",
    group: "games",
    status: "playable",
    platform: "arcade racer",
    accent: "#ffd33d",
    visual: "arcade",
    description:
      "A vertical arcade racer for short runs and bad decisions at high speed.",
    detail:
      "Dodge traffic, chase a higher score, crash, and get straight back into another run.",
  },
  {
    id: "formula-racer",
    index: "05",
    name: "Formula Racer",
    group: "games",
    status: "building",
    platform: "3D racing game",
    accent: "#ff5148",
    visual: "racing",
    description:
      "A 3D racing game I am building. The lap time is not good yet.",
    detail:
      "It is loosely inspired by the speed, cameras, and race-weekend energy of the F1 games.",
  },
  {
    id: "winglab",
    index: "06",
    name: "WingLab",
    group: "experiments",
    status: "built",
    platform: "macOS · physics",
    accent: "#66d8ff",
    visual: "airflow",
    description:
      "A Mac aerodynamics sandbox for changing a wing and immediately finding out what that did.",
    detail:
      "Adjust airflow and angle of attack, then compare lift, drag, and efficiency without needing a wind tunnel.",
  },
  {
    id: "robotic-plant",
    index: "07",
    name: "Robotic Plant",
    group: "experiments",
    status: "concept",
    platform: "hardware learning project",
    accent: "#85ff63",
    visual: "sensor",
    description:
      "A plant pot that sways when you wave at it. I am still learning hardware, which is kind of the point.",
    detail:
      "The plan is a 3D-printed pot, flexible TPU leaves, small servos, and a proximity sensor that turns a hand wave into motion.",
  },
] as const;

type Project = (typeof projects)[number];

const menuGroups = [
  { label: "main projects", ids: ["wayfinder", "kura", "refill"] },
  { label: "games + experiments", ids: ["turbo-lane", "formula-racer", "winglab", "robotic-plant"] },
] as const;

function ProjectVisual({ project }: { project: Project }) {
  if (project.visual === "route") {
    return (
      <div className="route-map visual-inner">
        <span className="route-line route-a" /><span className="route-line route-b" /><span className="route-line route-c" />
        <i className="route-node node-a" /><i className="route-node node-b" /><i className="route-node node-c" />
        <b>START</b><b>SAFER STREETS</b><b>18 MIN</b>
      </div>
    );
  }

  if (project.visual === "health") {
    return (
      <div className="health-grid visual-inner">
        <span><small>CALORIES</small><b>1,842</b><i style={{ "--fill": "74%" } as React.CSSProperties} /></span>
        <span><small>PROTEIN</small><b>112g</b><i style={{ "--fill": "62%" } as React.CSSProperties} /></span>
        <span><small>CARBS</small><b>204g</b><i style={{ "--fill": "81%" } as React.CSSProperties} /></span>
      </div>
    );
  }

  if (project.visual === "resources") {
    return (
      <div className="resource-stack visual-inner">
        <span><i>24</i><b>notebooks</b><small>1.2 mi</small></span>
        <span><i>08</i><b>markers</b><small>0.7 mi</small></span>
        <span><i>16</i><b>folders</b><small>2.0 mi</small></span>
      </div>
    );
  }

  if (project.visual === "arcade") {
    return (
      <div className="arcade-field visual-inner">
        <div className="score"><small>SCORE</small><b>08,420</b></div>
        <div className="road"><i /><i /><i /><span className="player" /><span className="traffic t-one" /><span className="traffic t-two" /></div>
        <strong>x4</strong>
      </div>
    );
  }

  if (project.visual === "racing") {
    return (
      <div className="telemetry visual-inner">
        <span className="speed"><b>287</b><small>KM/H</small></span>
        <div className="track"><i /><i /><i /></div>
        <span className="lap">LAP 03 / 12</span><span className="drs">DRS</span>
      </div>
    );
  }

  if (project.visual === "airflow") {
    return (
      <div className="airflow visual-inner">
        <div className="flow-lines"><i /><i /><i /><i /><i /></div>
        <div className="airfoil" />
        <span><small>CL</small><b>1.14</b></span><span><small>CD</small><b>0.032</b></span><span><small>L/D</small><b>35.6</b></span>
      </div>
    );
  }

  return (
    <div className="sensor-diagram visual-inner">
      <div className="sensor-rings"><i /><i /><i /></div>
      <span className="sensor-input">HAND<br />INPUT</span>
      <span className="sensor-arrow">→</span>
      <span className="sensor-logic">ToF<br />SENSOR</span>
      <span className="sensor-arrow">→</span>
      <span className="sensor-output">SERVO<br />MOTION</span>
    </div>
  );
}

export default function Home() {
  const [activeView, setActiveView] = useState("wayfinder");
  const [soundOn, setSoundOn] = useState(false);
  const mainRef = useRef<HTMLElement>(null);
  const audioRef = useRef<{ context: AudioContext; gain: GainNode; oscillators: OscillatorNode[] } | null>(null);

  const activeProject = projects.find((project) => project.id === activeView);
  const sequence = useMemo(() => [...projects.map((project) => project.id), "about", "recognition"], []);

  useEffect(() => () => {
    audioRef.current?.context.close();
  }, []);

  const playClick = (position: number) => {
    const context = audioRef.current?.context;
    if (!context) return;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = 220 + position * 18;
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.045, context.currentTime + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.16);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.18);
  };

  const chooseView = (id: string) => {
    setActiveView(id);
    if (soundOn) playClick(Math.max(0, sequence.indexOf(id)));
  };

  const toggleSound = async () => {
    if (audioRef.current) {
      const { context, gain } = audioRef.current;
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.18);
      window.setTimeout(() => context.close(), 220);
      audioRef.current = null;
      setSoundOn(false);
      return;
    }

    const context = new AudioContext();
    const gain = context.createGain();
    const filter = context.createBiquadFilter();
    const oscillators = [48, 72].map((frequency, index) => {
      const oscillator = context.createOscillator();
      oscillator.type = index === 0 ? "sine" : "triangle";
      oscillator.frequency.value = frequency;
      oscillator.detune.value = index === 0 ? -4 : 5;
      oscillator.connect(filter);
      oscillator.start();
      return oscillator;
    });
    filter.type = "lowpass";
    filter.frequency.value = 230;
    gain.gain.value = 0.0001;
    filter.connect(gain).connect(context.destination);
    gain.gain.exponentialRampToValueAtTime(0.028, context.currentTime + 0.6);
    audioRef.current = { context, gain, oscillators };
    setSoundOn(true);
  };

  const movePointer = (event: React.PointerEvent<HTMLElement>) => {
    const x = event.clientX / window.innerWidth;
    const y = event.clientY / window.innerHeight;
    mainRef.current?.style.setProperty("--mx", `${x * 100}%`);
    mainRef.current?.style.setProperty("--my", `${y * 100}%`);
  };

  const currentIndex = sequence.indexOf(activeView);
  const step = (direction: number) => {
    const next = (currentIndex + direction + sequence.length) % sequence.length;
    chooseView(sequence[next]);
  };

  return (
    <main
      ref={mainRef}
      className="experience"
      onPointerMove={movePointer}
      style={{ "--accent": activeProject?.accent ?? "#4f7cff" } as React.CSSProperties}
    >
      <div className="signal-field" aria-hidden="true"><i /><i /><i /><i /></div>

      <aside className="index-panel">
        <button className="identity" type="button" onClick={() => chooseView("wayfinder")}>
          <span>Aaditya</span><b>Shah</b>
        </button>
        <p className="intro">High-school student in San Jose. I make apps, games, and the occasional weird experiment.</p>

        <nav aria-label="Portfolio index">
          {menuGroups.map((group) => (
            <div className="menu-group" key={group.label}>
              <p>{group.label}</p>
              {group.ids.map((id) => {
                const project = projects.find((item) => item.id === id)!;
                return (
                  <button
                    key={project.id}
                    className={activeView === project.id ? "active" : ""}
                    type="button"
                    onClick={() => chooseView(project.id)}
                    aria-pressed={activeView === project.id}
                  >
                    <span>{project.index}</span><b>{project.name}</b><i />
                  </button>
                );
              })}
            </div>
          ))}
          <div className="menu-group compact">
            <p>profile</p>
            <button className={activeView === "about" ? "active" : ""} type="button" onClick={() => chooseView("about")} aria-pressed={activeView === "about"}><span>08</span><b>About</b><i /></button>
            <button className={activeView === "recognition" ? "active" : ""} type="button" onClick={() => chooseView("recognition")} aria-pressed={activeView === "recognition"}><span>09</span><b>Recognition</b><i /></button>
          </div>
        </nav>

        <div className="panel-footer">
          <a href="https://github.com/aShah2025" target="_blank" rel="noreferrer">GitHub ↗</a>
          <button className="sound-toggle" type="button" onClick={toggleSound} aria-pressed={soundOn}>
            <span className={soundOn ? "playing" : ""}><i /><i /><i /></span> sound {soundOn ? "on" : "off"}
          </button>
        </div>
      </aside>

      <section className="stage" aria-live="polite">
        <header className="stage-header">
          <span>A/S — PORTFOLIO 2026</span>
          <span>{activeProject ? `${activeProject.status} / ${activeProject.platform}` : activeView}</span>
        </header>

        {activeProject ? (
          <article className="project-scene" key={activeProject.id}>
            <div className="scene-copy">
              <p className="scene-number">{activeProject.index} / {activeProject.group}</p>
              <h1>{activeProject.name}</h1>
              <p className="project-lede">{activeProject.description}</p>
              <p className="project-detail">{activeProject.detail}</p>
            </div>
            <div className="project-visual" aria-hidden="true">
              <span className="visual-label">LIVE MODEL / {activeProject.visual}</span>
              <ProjectVisual project={activeProject} />
            </div>
          </article>
        ) : activeView === "recognition" ? (
          <article className="profile-scene recognition-scene" key="recognition">
            <p className="scene-number">09 / recognition</p>
            <h1>Congressional<br /><em>recognition.</em></h1>
            <div className="recognition-card">
              <span>01</span><b>Congressional recognition</b><small>A milestone I am proud of.</small>
            </div>
          </article>
        ) : (
          <article className="profile-scene" key="about">
            <p className="scene-number">08 / about</p>
            <h1>Still learning.<br /><em>Still building.</em></h1>
            <div className="about-grid">
              <p>I am a high-school student in San Jose. I am strongest at product ideas, iOS apps, games, and web design.</p>
              <p>Hardware, CAD, and robotics are newer territory. The robotic plant is there because learning in public is more interesting than pretending I already know everything.</p>
              <div><span>FOCUS</span><b>useful software</b></div>
              <div><span>NEXT</span><b>better physical builds</b></div>
            </div>
          </article>
        )}

        <footer className="stage-controls">
          <button type="button" onClick={() => step(-1)} aria-label="Previous item">← <span>previous</span></button>
          <div><i className={soundOn ? "live" : ""} /><span>{soundOn ? "soundscape running" : "soundscape optional"}</span></div>
          <button type="button" onClick={() => step(1)} aria-label="Next item"><span>next</span> →</button>
        </footer>
      </section>
    </main>
  );
}
