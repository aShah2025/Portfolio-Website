"use client";

import { useEffect, useRef, useState } from "react";

const projects = [
  {
    id: "kura",
    name: "kura",
    oneLiner: "calories, minus the spreadsheet energy.",
    description: "A simple calorie and macro tracker I made for CAC 2025. It keeps the useful numbers visible without making food feel like homework.",
    tools: ["product", "frontend", "health"],
    aside: "made for cac 2025",
    color: "#ff583d",
  },
  {
    id: "wayfinder",
    name: "wayfinder",
    oneLiner: "an ai that helps you figure out where to go.",
    description: "A navigation tool that uses AI to turn an unclear destination into a useful next step. Less tab-switching, more actually getting there.",
    tools: ["ai", "ux", "navigation"],
    aside: "built to reduce friction",
    color: "#3155ff",
  },
  {
    id: "refill",
    name: "refill",
    oneLiner: "teachers need supplies. someone nearby has them.",
    description: "A resource-sharing app that connects teachers with classroom supplies, because educators should not have to keep paying out of pocket.",
    tools: ["community", "web", "education"],
    aside: "resources, redistributed",
    color: "#c5ee34",
  },
];

const skillNotes: Record<string, string> = {
  web: "i make websites that feel like someone cared.",
  ai: "i use ai when it solves the problem — not just to say i used ai.",
  hardware: "sensors, servos, wires, and eventually fewer loose screws.",
  cad: "if it needs to exist in real life, i’ll probably try to print it.",
};

export default function Home() {
  const pageRef = useRef<HTMLElement>(null);
  const [openProject, setOpenProject] = useState<string | null>(null);
  const [skill, setSkill] = useState("web");
  const [plantAwake, setPlantAwake] = useState(false);
  const [time, setTime] = useState("");

  useEffect(() => {
    const updateTime = () => setTime(new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/Los_Angeles" }).format(new Date()));
    updateTime();
    const timer = window.setInterval(updateTime, 30000);
    return () => window.clearInterval(timer);
  }, []);

  const trackPointer = (event: React.PointerEvent<HTMLElement>) => {
    pageRef.current?.style.setProperty("--pointer-x", `${event.clientX}px`);
    pageRef.current?.style.setProperty("--pointer-y", `${event.clientY}px`);
  };

  return (
    <main ref={pageRef} onPointerMove={trackPointer}>
      <div className="cursor-glow" aria-hidden="true" />

      <header className="nav">
        <a className="logo" href="#top">aaditya<span>.</span></a>
        <nav aria-label="main navigation">
          <a href="#work">work</a>
          <a href="#lab">lab</a>
          <a href="#about">about</a>
        </nav>
        <a className="github-link" href="https://github.com/aShah2025" target="_blank" rel="noreferrer">github ↗</a>
      </header>

      <section className="hero" id="top">
        <div className="hero-meta">
          <span>14 · san jose</span>
          <span className="available"><i /> currently making something</span>
        </div>
        <h1>i make stuff.<br /><span>sometimes it works.</span></h1>
        <div className="hero-foot">
          <p>hey, i’m aaditya. i build apps, websites, and increasingly unnecessary robots.</p>
          <a href="#work">see the stuff <span>↓</span></a>
        </div>
        <div className="loose-note note-one" aria-hidden="true">freshman @ leland</div>
        <div className="loose-note note-two" aria-hidden="true">probably debugging</div>
      </section>

      <section className="ticker" aria-label="currently">
        <span>right now</span>
        <div><p>learning cad</p><i /> <p>building a weird plant</p><i /> <p>joining quixilver 604</p><i /> <p>starting a tiny web studio</p></div>
      </section>

      <section className="work section" id="work">
        <div className="section-intro">
          <p className="kicker">01 / things that exist</p>
          <h2>some work.</h2>
          <p className="aside-copy">click one. there’s more under the surface.</p>
        </div>

        <div className="project-stack">
          {projects.map((project, index) => {
            const isOpen = openProject === project.id;
            return (
              <article className={`project ${isOpen ? "is-open" : ""}`} key={project.id} style={{ "--project-color": project.color } as React.CSSProperties}>
                <button type="button" onClick={() => setOpenProject(isOpen ? null : project.id)} aria-expanded={isOpen} aria-controls={`${project.id}-details`}>
                  <span className="project-number">0{index + 1}</span>
                  <span className="project-title"><b>{project.name}</b><em>{project.oneLiner}</em></span>
                  <span className="project-action">{isOpen ? "close" : "open"} <i>{isOpen ? "−" : "+"}</i></span>
                </button>
                <div className="project-details" id={`${project.id}-details`} aria-hidden={!isOpen}>
                  <div className="project-poster" aria-hidden="true">
                    <span>{project.name.slice(0, 1)}</span>
                    <div className={`poster-shape shape-${index + 1}`} />
                    <small>{project.aside}</small>
                  </div>
                  <div className="project-info">
                    <p>{project.description}</p>
                    <ul>{project.tools.map((tool) => <li key={tool}>{tool}</li>)}</ul>
                    <span>still improving it, obviously.</span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="lab section" id="lab">
        <div className="lab-copy">
          <p className="kicker">02 / currently overengineering</p>
          <h2>the plant<br />pot thing.</h2>
          <p>A 3D-printed pot. Servo-powered TPU leaves. A proximity sensor. Wave your hand and it sways like there’s wind.</p>
          <button type="button" onClick={() => setPlantAwake((value) => !value)}>{plantAwake ? "okay, calm down" : "test the sensor"}</button>
        </div>
        <div
          className={`plant-demo ${plantAwake ? "is-awake" : ""}`}
          onPointerEnter={() => setPlantAwake(true)}
          onPointerLeave={() => setPlantAwake(false)}
          role="img"
          aria-label="Interactive prototype of a robotic plant pot. Hover or tap the test sensor button to make its leaves sway."
        >
          <span className="sensor-zone">wave here</span>
          <div className="plant">
            <i className="leaf leaf-one" /><i className="leaf leaf-two" /><i className="leaf leaf-three" /><i className="leaf leaf-four" />
            <div className="stem" />
            <div className="pot"><span>a/s</span></div>
            <div className="servo servo-left" /><div className="servo servo-right" />
          </div>
          <div className="signal"><i /><i /><i /></div>
          <p>{plantAwake ? "proximity detected — deploying breeze" : "sensor idle"}</p>
        </div>
      </section>

      <section className="about section" id="about">
        <div>
          <p className="kicker">03 / about, briefly</p>
          <h2>i’m early.<br />that’s useful.</h2>
        </div>
        <div className="about-copy">
          <p>I’m a freshman at Leland High School. I like projects that force me to learn whatever I don’t know yet.</p>
          <p>Right now that’s product design, web development, AI, CAD, 3D printing, and robotics. Ask again in a year.</p>
          <div className="skill-switcher" role="group" aria-label="skills">
            {Object.keys(skillNotes).map((item) => (
              <button key={item} className={skill === item ? "active" : ""} onClick={() => setSkill(item)} type="button">{item}</button>
            ))}
          </div>
          <p className="skill-note" aria-live="polite">{skillNotes[skill]}</p>
        </div>
      </section>

      <section className="next section">
        <p className="kicker">also in progress</p>
        <div className="next-grid">
          <article><span>01</span><h3>small-business websites</h3><p>good sites for local people who are busy running actual businesses.</p></article>
          <article><span>02</span><h3>quixilver 604</h3><p>moving from “i should get into robotics” to actually doing it.</p></article>
        </div>
      </section>

      <section className="contact section">
        <p>anyway, that’s the site.</p>
        <h2>want to see<br />what i build next?</h2>
        <a href="https://github.com/aShah2025" target="_blank" rel="noreferrer">github.com/aShah2025 <span>↗</span></a>
      </section>

      <footer>
        <p>aaditya shah</p>
        <p>san jose · {time || "local time"}</p>
        <a href="#top">back up ↑</a>
      </footer>
    </main>
  );
}
