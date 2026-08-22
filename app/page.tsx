const shippedProjects = [
  {
    number: "01",
    title: "Kura",
    type: "Health · CAC 2025",
    description:
      "A calorie and macro tracker that turns everyday food choices into simple, useful numbers.",
    tags: ["Product design", "Tracking", "Mobile"],
    className: "project-kura",
    visual: (
      <div className="macro-visual" aria-hidden="true">
        <div className="macro-ring"><span>72%</span><small>daily goal</small></div>
        <div className="macro-bars"><i /><i /><i /></div>
      </div>
    ),
  },
  {
    number: "02",
    title: "Wayfinder",
    type: "AI · Navigation",
    description:
      "An AI navigation tool designed to make finding the right next step feel natural, not overwhelming.",
    tags: ["AI", "UX", "Navigation"],
    className: "project-wayfinder",
    visual: (
      <div className="route-visual" aria-hidden="true">
        <span className="route-dot dot-a" /><span className="route-dot dot-b" />
        <span className="route-dot dot-c" /><span className="route-line line-a" />
        <span className="route-line line-b" /><strong>YOU</strong>
      </div>
    ),
  },
  {
    number: "03",
    title: "Refill",
    type: "Education · Community",
    description:
      "A resource-sharing app connecting teachers with supplies, so educators don’t have to pay out of pocket.",
    tags: ["Social impact", "Marketplace", "Web"],
    className: "project-refill",
    visual: (
      <div className="supply-visual" aria-hidden="true">
        <div className="supply-card"><b>12</b><span>items nearby</span></div>
        <div className="supply-card offset"><b>+</b><span>share a resource</span></div>
      </div>
    ),
  },
];

const nowBuilding = [
  {
    step: "A",
    title: "A plant pot that moves",
    label: "Robotics experiment",
    copy: "A 3D-printed pot with servo-powered TPU leaves that sway when a hand passes over its proximity sensor.",
    status: "Prototyping",
  },
  {
    step: "B",
    title: "Websites for local businesses",
    label: "New venture",
    copy: "Helping small businesses around San Jose show up online with fast, thoughtful websites that feel like them.",
    status: "Starting up",
  },
  {
    step: "C",
    title: "Quixilver 604",
    label: "Next season",
    copy: "Taking the next step from software into competitive robotics with Leland’s FRC team.",
    status: "Up next",
  },
];

export default function Home() {
  return (
    <main>
      <header className="nav-shell">
        <a className="wordmark" href="#top" aria-label="Aaditya Shah, home">
          A<span>/</span>S
        </a>
        <nav aria-label="Main navigation">
          <a href="#work">Work</a>
          <a href="#building">Building</a>
          <a href="#about">About</a>
        </nav>
        <a className="nav-cta" href="https://github.com/aShah2025" target="_blank" rel="noreferrer">
          GitHub <span aria-hidden="true">↗</span>
        </a>
      </header>

      <section className="hero" id="top">
        <div className="hero-grid" aria-hidden="true" />
        <div className="hero-kicker reveal-item">
          <span className="pulse-dot" /> San Jose, CA <span className="divider">/</span> Building now
        </div>
        <h1>
          <span className="line reveal-item">I make ideas</span>
          <span className="line outline reveal-item">work in the</span>
          <span className="line reveal-item">real world<span className="lime">.</span></span>
        </h1>
        <div className="hero-bottom">
          <p>
            I’m <strong>Aaditya Shah</strong> — a 14-year-old designer, developer, and future roboticist
            building useful things for real people.
          </p>
          <a className="circle-link" href="#work" aria-label="Explore selected work">
            <span>Explore</span><b aria-hidden="true">↓</b>
          </a>
        </div>
        <div className="hero-code" aria-hidden="true">14 / 37.3382° N / IDEAS → OBJECTS</div>
      </section>

      <section className="manifesto section-pad">
        <p className="eyebrow">The short version</p>
        <p className="manifesto-text">
          Too curious to stay in one lane. I build at the intersection of <em>software</em>,
          <em> design</em>, and <em>hardware</em> — where an idea can become something people actually use.
        </p>
      </section>

      <section className="work section-pad" id="work">
        <div className="section-heading">
          <div><p className="eyebrow">01 / Selected work</p><h2>Shipped, not shelved.</h2></div>
          <p>Three projects. Three different problems. One rule: make it useful.</p>
        </div>
        <div className="project-list">
          {shippedProjects.map((project) => (
            <article className={`project-card ${project.className}`} key={project.title}>
              <div className="project-top"><span>{project.number}</span><span>{project.type}</span></div>
              <div className="project-visual">{project.visual}</div>
              <div className="project-copy">
                <h3>{project.title}</h3>
                <p>{project.description}</p>
                <ul>{project.tags.map((tag) => <li key={tag}>{tag}</li>)}</ul>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="building section-pad" id="building">
        <div className="section-heading light">
          <div><p className="eyebrow">02 / On the bench</p><h2>What’s becoming real next.</h2></div>
          <div className="live-label"><span className="pulse-dot" /> Work in progress</div>
        </div>
        <div className="build-list">
          {nowBuilding.map((item) => (
            <article className="build-row" key={item.step}>
              <span className="build-step">{item.step}</span>
              <div><p>{item.label}</p><h3>{item.title}</h3></div>
              <p className="build-copy">{item.copy}</p>
              <span className="status">{item.status}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="about section-pad" id="about">
        <div className="about-label"><p className="eyebrow">03 / About me</p><span>(still learning)</span></div>
        <div className="about-body">
          <h2>I’m early. That’s the exciting part.</h2>
          <div className="about-copy">
            <p>
              I’m a freshman at Leland High School in San Jose. I like projects where I have to learn something
              new to finish them — whether that means designing an interface, connecting an AI model, or making
              a piece of plastic move like a leaf.
            </p>
            <p>
              Right now I’m exploring product design, web development, CAD, 3D printing, and robotics. The list
              will probably be different next year. That’s kind of the point.
            </p>
          </div>
        </div>
        <div className="tool-belt" aria-label="Skills and interests">
          {['Product design', 'Web development', 'AI integration', 'CAD + 3D printing', 'Robotics', 'Problem solving'].map((skill, index) => (
            <span key={skill}><b>0{index + 1}</b>{skill}</span>
          ))}
        </div>
      </section>

      <section className="contact section-pad">
        <p className="eyebrow">Have a problem worth building for?</p>
        <h2>Let’s make<br /><span>something useful.</span></h2>
        <a className="github-button" href="https://github.com/aShah2025" target="_blank" rel="noreferrer">
          Find me on GitHub <span aria-hidden="true">↗</span>
        </a>
        <div className="contact-orbit" aria-hidden="true"><span>A</span></div>
      </section>

      <footer>
        <a className="wordmark inverse" href="#top">A<span>/</span>S</a>
        <p>Designed &amp; built by Aaditya Shah.</p>
        <p>San Jose, California · 2026</p>
      </footer>
    </main>
  );
}
