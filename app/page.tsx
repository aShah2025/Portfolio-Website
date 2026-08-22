"use client";

import { useEffect, useRef, useState } from "react";

const projects = [
  {
    id: "kura",
    name: "kura",
    oneLiner: "an iOS calorie and macro tracker.",
    description: "An iOS app I made for CAC 2025 that keeps calories and macros clear, quick, and easy to check throughout the day.",
    tools: ["iOS", "product design", "health"],
    aside: "made for cac 2025",
    color: "#ff583d",
  },
  {
    id: "wayfinder",
    name: "wayfinder",
    oneLiner: "bike routes that actually listen to you.",
    description: "Google Maps does not always give cyclists enough control over the route. Wayfinder lets you describe the ride you want and add filters like “avoid highways” or “prioritize safer streets,” then uses the Valhalla routing API to build a route around those choices.",
    tools: ["iOS", "Valhalla API", "AI routing"],
    aside: "custom bike routing",
    color: "#3155ff",
  },
  {
    id: "refill",
    name: "refill",
    oneLiner: "an iOS resource network for teachers.",
    description: "An iOS app that connects teachers with nearby classroom supplies, so educators can find what they need without paying out of pocket.",
    tools: ["iOS", "community", "education"],
    aside: "resources, redistributed",
    color: "#c5ee34",
  },
];

const skillNotes: Record<string, string> = {
  web: "I build fast, thoughtful websites with details worth noticing.",
  ai: "I use AI to make products more useful, intuitive, and capable.",
  robotics: "I’m new to hardware. The robotic plant is how I want to start learning sensors, servos, and physical prototyping.",
  cad: "I design parts, prototype them, print them, and learn from every version.",
};

export default function Home() {
  const pageRef = useRef<HTMLElement>(null);
  const plantRef = useRef<HTMLDivElement>(null);
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

  useEffect(() => {
    const elements = document.querySelectorAll<HTMLElement>("[data-reveal]");
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((entry) => entry.isIntersecting && entry.target.classList.add("in-view")),
      { threshold: 0.14 },
    );
    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);

  const trackPointer = (event: React.PointerEvent<HTMLElement>) => {
    pageRef.current?.style.setProperty("--pointer-x", `${event.clientX}px`);
    pageRef.current?.style.setProperty("--pointer-y", `${event.clientY}px`);
  };

  const movePlant = (event: React.PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const wind = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    plantRef.current?.style.setProperty("--wind", wind.toFixed(2));
    plantRef.current?.style.setProperty("--wind-angle", `${(wind * 3).toFixed(1)}deg`);
    setPlantAwake(true);
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
        <h1><span className="hero-line">i turn ideas</span><br /><span className="hero-line outline-line">into real things.</span></h1>
        <div className="hero-foot">
          <p>Hey, I’m Aaditya. I build iOS apps, websites, and whatever I’m curious enough to learn next.</p>
          <a href="#work">explore my work <span>↓</span></a>
        </div>
        <div className="loose-note note-one" aria-hidden="true">freshman @ leland</div>
        <div className="loose-note note-two" aria-hidden="true">building &gt; talking</div>
      </section>

      <section className="ticker" aria-label="currently">
        <span>right now</span>
        <div><p>learning cad</p><i /> <p>prototyping a robotic plant</p><i /> <p>joining quixilver 604</p><i /> <p>starting a web studio</p></div>
      </section>

      <section className="work section" id="work">
        <div className="section-intro" data-reveal>
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
                  <div className={`app-showcase app-${project.id}`} aria-hidden="true">
                    <div className="phone phone-back">
                      <div className="dynamic-island" />
                      {index === 0 && <div className="kura-screen"><small>today</small><b>1,842</b><span>of 2,200 kcal</span><i /><ul><li>protein <em>112g</em></li><li>carbs <em>204g</em></li><li>fat <em>58g</em></li></ul></div>}
                      {index === 1 && <div className="wayfinder-screen"><small>describe your ride</small><div className="route-prompt">Safer bike route. Avoid highways.</div><div className="route-filters"><span>safer streets</span><span>no highways</span></div><div className="mini-map"><i /><i /><i /><span /></div><b>18 min</b><span>Valhalla route</span></div>}
                      {index === 2 && <div className="refill-screen"><small>nearby resources</small><b>12 items</b><ul><li><i /> notebooks <em>24</em></li><li><i /> markers <em>8</em></li><li><i /> folders <em>16</em></li></ul></div>}
                    </div>
                    <div className="phone phone-front"><div className="dynamic-island" /><span className="app-mark">{project.name.slice(0, 1)}</span><b>{project.name}</b><small>iOS app</small></div>
                    <span className="ios-label">designed for iPhone</span>
                    <small className="project-aside">{project.aside}</small>
                  </div>
                  <div className="project-info">
                    <p>{project.description}</p>
                    <ul>{project.tools.map((tool) => <li key={tool}>{tool}</li>)}</ul>
                    <span>built, tested, and still evolving.</span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="lab section" id="lab">
        <div className="lab-copy" data-reveal>
          <p className="kicker">02 / learning project</p>
          <h2>the robotic<br />plant.</h2>
          <p>A beginner robotics concept I want to build: a 3D-printed pot with flexible TPU leaves, small servos, and a proximity sensor that makes it react when someone waves nearby.</p>
          <button type="button" onClick={() => setPlantAwake((value) => !value)}>{plantAwake ? "reset sensor" : "test the sensor"}</button>
          <div className="plant-specs" aria-label="planned components"><span>concept</span><span>ToF sensor</span><span>micro servos</span><span>TPU leaves</span></div>
        </div>
        <div
          ref={plantRef}
          className={`plant-demo ${plantAwake ? "is-awake" : ""}`}
          onPointerMove={movePlant}
          onPointerEnter={() => setPlantAwake(true)}
          onPointerLeave={() => setPlantAwake(false)}
          role="img"
          aria-label="Interactive prototype of a robotic plant pot. Hover or tap the test sensor button to make its leaves sway."
          data-reveal
        >
          <span className="concept-label">concept · not built yet</span>
          <span className="sensor-zone">move here</span>
          <div className="sensor-field" aria-hidden="true"><i /><i /><i /></div>
          <div className="plant">
            <i className="leaf leaf-one" /><i className="leaf leaf-two" /><i className="leaf leaf-three" /><i className="leaf leaf-four" />
            <div className="stem" />
            <div className="pot"><span>a/s</span></div>
            <div className="servo servo-left" /><div className="servo servo-right" />
          </div>
          <div className="signal"><i /><i /><i /></div>
          <p>{plantAwake ? "proximity detected — servos moving" : "sensor idle — move your cursor nearby"}</p>
        </div>
      </section>

      <section className="about section" id="about">
        <div data-reveal>
          <p className="kicker">03 / about, briefly</p>
          <h2>just getting<br />started.</h2>
        </div>
        <div className="about-copy" data-reveal>
          <p>I’m a 14-year-old freshman at Leland High School. I like ambitious projects that push me to learn whatever the next step requires.</p>
          <p>I’m strongest in product ideas, iOS apps, and web design. I’m still a beginner at hardware, CAD, and robotics—and the plant project is how I want to start learning them.</p>
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
          <article data-reveal><span>01</span><h3>small-business websites</h3><p>Thoughtful, modern websites for local businesses ready to stand out online.</p></article>
          <article data-reveal><span>02</span><h3>quixilver 604</h3><p>Taking my next step into competitive robotics with Leland’s FRC team.</p></article>
        </div>
      </section>

      <section className="contact section">
        <p>the next idea is already in progress.</p>
        <h2>follow what<br />i build next.</h2>
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
