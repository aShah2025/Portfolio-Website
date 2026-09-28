"use client";

import { useState } from "react";

const projects = [
  { id: "wayfinder", number: "01", name: "Wayfinder", tag: "iOS / Navigation", color: "#ff5c35", text: "#0b0b0b", short: "Bike routes that actually listen.", description: "Google Maps does not always give cyclists the safest route. Wayfinder lets you describe the ride you want, add filters like safer streets or avoiding highways, and builds the route with the Valhalla API.", stat: "CUSTOM ROUTING" },
  { id: "kura", number: "02", name: "Kura", tag: "iOS / Health", color: "#a7ff4f", text: "#0b0b0b", short: "Calories and macros, without the clutter.", description: "An iPhone calorie and macro tracker made for CAC 2025. It keeps daily calories, protein, carbs, and fat quick to log and easy to understand.", stat: "BUILT FOR CAC 2025" },
  { id: "refill", number: "03", name: "Refill", tag: "iOS / Education", color: "#7c67ff", text: "#ffffff", short: "Classroom supplies, shared nearby.", description: "An iOS resource network where educators can list, find, and share extra classroom supplies—because teachers should not have to buy every basic themselves.", stat: "LOCAL RESOURCE NETWORK" },
  { id: "turbo-lane", number: "04", name: "Turbo Lane", tag: "Game / Arcade", color: "#ffd83d", text: "#0b0b0b", short: "A vertical racer built for one more run.", description: "A fast vertical arcade game about dodging traffic, chasing a higher score, crashing, and immediately trying again.", stat: "PLAYABLE" },
  { id: "formula-racer", number: "05", name: "Formula Racer", tag: "Game / 3D Racing", color: "#248cff", text: "#ffffff", short: "A 3D racing game in progress.", description: "A 3D racing game loosely inspired by the speed, cameras, and race-weekend energy of Formula 1 games. Still building it. Still improving the lap time.", stat: "IN DEVELOPMENT" },
  { id: "winglab", number: "06", name: "WingLab", tag: "macOS / Physics", color: "#d8f1ff", text: "#0b0b0b", short: "An aerodynamics playground for Mac.", description: "Change a wing, adjust airflow and angle of attack, then compare lift, drag, and efficiency without needing an actual wind tunnel.", stat: "AERODYNAMICS SIM" },
  { id: "robotic-plant", number: "07", name: "Robotic Plant", tag: "Hardware / Learning", color: "#ff86b7", text: "#0b0b0b", short: "A plant that notices when you wave.", description: "A learning project using a 3D-printed pot, flexible TPU leaves, small servos, and a proximity sensor. I am newer to hardware, which is exactly why I want to build it.", stat: "CONCEPT / PROTOTYPE" },
] as const;

export default function Home() {
  const [openProject, setOpenProject] = useState<string | null>("wayfinder");

  return (
    <main>
      <nav className="topbar" aria-label="Main navigation">
        <a className="nav-name" href="#top">AS</a>
        <div className="nav-links">
          <a href="#work">Work</a>
          <a href="#about">About</a>
          <a href="#recognition">Recognition</a>
          <a href="https://github.com/aShah2025" target="_blank" rel="noreferrer">GitHub ↗</a>
        </div>
      </nav>

      <section className="hero" id="top">
        <div className="hero-meta"><span>HIGH-SCHOOL STUDENT</span><span>SAN JOSE, CA</span><span>PORTFOLIO / 2026</span></div>
        <h1 aria-label="Aaditya Shah"><span>Aaditya</span><span>Shah<i>.</i></span></h1>
        <div className="hero-bottom">
          <p>I build apps, games, websites,<br />and whatever I want to learn next.</p>
          <a href="#work">See the work <span>↓</span></a>
        </div>
        <div className="hero-orbit" aria-hidden="true"><i /><i /><b>AS</b></div>
      </section>

      <div className="ticker" aria-hidden="true"><div>IOS APPS <i>✦</i> RACING GAMES <i>✦</i> WEB DESIGN <i>✦</i> EXPERIMENTS <i>✦</i> IOS APPS <i>✦</i> RACING GAMES <i>✦</i> WEB DESIGN <i>✦</i> EXPERIMENTS <i>✦</i></div></div>

      <section className="work" id="work">
        <header className="section-head">
          <span>01 / SELECTED WORK</span>
          <h2>Things I&apos;ve<br />made so far.</h2>
          <p>Click any project. They are supposed to be big.</p>
        </header>

        <div className="project-list">
          {projects.map((project) => {
            const isOpen = openProject === project.id;
            return (
              <article className={`project ${isOpen ? "open" : ""}`} id={project.id} key={project.id} style={{ "--project-color": project.color, "--project-text": project.text } as React.CSSProperties}>
                <button className="project-trigger" type="button" aria-expanded={isOpen} aria-controls={`${project.id}-details`} onClick={() => setOpenProject(isOpen ? null : project.id)}>
                  <span className="project-number">{project.number}</span>
                  <span className="project-title">{project.name}</span>
                  <span className="project-tag">{project.tag}</span>
                  <span className="project-toggle" aria-hidden="true">{isOpen ? "−" : "+"}</span>
                </button>
                <div className="project-details" id={`${project.id}-details`}>
                  <div className="project-copy"><p>{project.short}</p><p>{project.description}</p></div>
                  <div className={`project-art art-${project.id}`} aria-hidden="true"><span>{project.stat}</span><i /><i /><i /></div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="about" id="about">
        <div className="about-kicker">02 / ABOUT</div>
        <div className="about-title"><span>I&apos;m</span><span>still</span><span>learning.</span></div>
        <div className="about-copy">
          <p>I&apos;m a high-school student in San Jose. I&apos;m strongest at product ideas, iOS apps, games, and web design.</p>
          <p>Hardware, CAD, and robotics are newer territory. I would rather show what I&apos;m learning than pretend I already know everything.</p>
        </div>
      </section>

      <section className="recognition" id="recognition">
        <div className="recognition-label">03 / RECOGNITION</div>
        <p>Congressional</p><p>recognition<span>.</span></p>
        <div className="recognition-footer"><span>A milestone I&apos;m proud of.</span><span>01 / 01</span></div>
      </section>

      <footer className="footer">
        <p>GOT AN IDEA?</p><h2>Let&apos;s build<br />something.</h2>
        <div><span>AADITYA SHAH / 2026</span><a href="https://github.com/aShah2025" target="_blank" rel="noreferrer">GITHUB ↗</a><a href="#top">BACK TO TOP ↑</a></div>
      </footer>
    </main>
  );
}
