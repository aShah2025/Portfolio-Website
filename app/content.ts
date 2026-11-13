// The facts the page shows and the on-device assistant answers from, kept in one place.

export type Project = {
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

export const featured = ["kura", "canary", "culturerisk", "formula-racer", "refill"];

export const projects: Project[] = [
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

export const awards: { year: string; title: string; note: string; kind: string; href?: string }[] = [
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
export const BUILT: Record<string, [string, string][]> = {
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

// Plain-text versions of the rest of the page, for the assistant. Keep these in step with page.tsx.
export const ABOUT = {
  bio: "Aaditya Shah is a high-school student at Leland High School in San Jose, California. He builds apps, games, websites, and AI agents, and is in the top 10% of developers on GitHub (github.com/aShah2025). Hackathon projects are on Devpost. A resume PDF is linked in the site's navigation.",
  languages: "Swift, Python, Java, JavaScript/TypeScript, HTML; learning C++.",
  tools: "Xcode, VS Code, PyCharm, Claude Code, Codex. This website was built with Claude Code.",
  life: [
    "Flying: working toward a private pilot licence. Ground school is the first step, then first solo, then the checkride; for now it's flight simulators and WingLab. The Cessna 172 on the site is his goal plane.",
    "Debate: does Policy debate (two-person team, one resolution per season) and Congressional debate (mock legislature with speeches on real bills).",
    "Kung Fu: five years, currently a red-black belt, black belt test in April 2027.",
    "Piano: six years of classical piano, Royal Conservatory (RCM) Level 9.",
  ],
  contact: "Reach him through GitHub (github.com/aShah2025) or Devpost; the resume is at /Aaditya-Shah-Resume.pdf.",
};
