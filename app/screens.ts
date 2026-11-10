// Detailed text windows for the language and tool chips: real terminals and editors that type themselves out.
// Markup: ⟦x|text⟧ colours a run of text; x is a key of TONE. Unmarked text uses the default ink.

type Line = [delay: number, markup: string, typed?: 1];
// Rectangles and rules use grid units (columns, rows) measured from the centre of each cell.
type Rect = { r0: number; r1: number; c0: number; c1: number; fill?: string; stroke?: string };
export type Screen = {
  title: string;
  cols: number;
  lines: Line[];
  boxes?: Rect[];
  hrules?: [row: number, c0: number, c1: number][];
  vrules?: [col: number, r0: number, r1: number][];
  cursor: number;
};

const TONE: Record<string, string> = {
  i: "#e6e8e3", m: "#7f8b93", b: "#82aaff", a: "#e3896a", g: "#9ece6a",
  y: "#e5c07b", p: "#c792ea", r: "#f7768e", c: "#7dcfff", w: "#ffffff",
};
const PANEL = "#161b22", BAR = "#1d232b", EDGE = "#2c343e", RULE = "#2c343e";
const ADD = "rgba(158,206,106,.13)", DEL = "rgba(247,118,142,.13)", SEL = "rgba(130,170,255,.16)", POP = "#1f2630";

// Pads a two-pane row so the right pane starts at a fixed column, whatever markup the left side holds.
const vis = (s: string) => Array.from(s.replace(/⟦\w\|([^⟧]*)⟧/g, "$1")).length;
const two = (left: string, at: number, right: string) => left + " ".repeat(Math.max(1, at - vis(left))) + right;

const claude: Screen = {
  title: "portfolio — claude", cols: 64, cursor: 30,
  boxes: [{ r0: 0, r1: 6, c0: 0, c1: 50, stroke: "#c4694b" }, { r0: 29, r1: 31, c0: 0, c1: 63, stroke: "#4a535e" },
    { r0: 16.5, r1: 21.5, c0: 6, c1: 62, fill: ADD }],
  lines: [
    [0, ""],
    [0, " ⟦a|✻⟧ Welcome to ⟦w|Claude Code⟧!"],
    [0, ""],
    [0, "   ⟦m|/help for help, /status for your current setup⟧"],
    [0, ""],
    [0, "   ⟦m|cwd: /Users/aaditya/Developer/portfolio⟧"],
    [0, ""],
    [0, ""],
    [0.6, "⟦m|>⟧ add a dark mode toggle to the nav", 1],
    [0, ""],
    [0.9, "⟦w|⏺⟧ I'll add a theme toggle. Let me look at the nav first."],
    [0, ""],
    [0.6, "⟦g|⏺⟧ ⟦w|Read⟧(app/page.tsx)"],
    [0.3, "  ⟦m|⎿  Read 431 lines (ctrl+r to expand)⟧"],
    [0, ""],
    [0.8, "⟦g|⏺⟧ ⟦w|Update⟧(app/page.tsx)"],
    [0.3, "  ⟦m|⎿⟧  Updated ⟦w|app/page.tsx⟧ with ⟦w|5⟧ additions"],
    [0.15, "       ⟦m|41⟧ ⟦g|+  const [dark, setDark] = useState(false);⟧"],
    [0.15, "       ⟦m|42⟧ ⟦g|+  useEffect(() => {⟧"],
    [0.15, "       ⟦m|43⟧ ⟦g|+    document.documentElement.dataset.theme =⟧"],
    [0.15, "       ⟦m|44⟧ ⟦g|+      dark ? \"dark\" : \"light\";⟧"],
    [0.15, "       ⟦m|45⟧ ⟦g|+  }, [dark]);⟧"],
    [0, ""],
    [0.7, "⟦g|⏺⟧ ⟦w|Bash⟧(npm test)"],
    [1.1, "  ⟦m|⎿⟧  ⟦g|✔⟧ 2 tests passed"],
    [0, ""],
    [0.7, "⟦w|⏺⟧ Added a toggle at the right end of the nav. It flips"],
    [0.1, "  data-theme on <html>, and the plane recolours itself."],
    [0, ""],
    [0, ""],
    [0, " ⟦m|>⟧ "],
    [0, ""],
    [0, "  ⟦m|? for shortcuts⟧"],
  ],
};

const codex: Screen = {
  title: "wayfinder — codex", cols: 64, cursor: 28,
  boxes: [{ r0: 0, r1: 4, c0: 0, c1: 40, stroke: "#4a535e" },
    { r0: 15.5, r1: 16.5, c0: 3, c1: 60, fill: DEL }, { r0: 16.5, r1: 18.5, c0: 3, c1: 60, fill: ADD }],
  lines: [
    [0, ""],
    [0, " ⟦w|>_ OpenAI Codex⟧"],
    [0, ""],
    [0, " ⟦m|directory:⟧ ~/Developer/wayfinder"],
    [0, ""],
    [0, ""],
    [0.6, "⟦c|›⟧ fix the failing route test", 1],
    [0, ""],
    [0.9, "⟦m|•⟧ ⟦w|Ran⟧ pytest -q"],
    [0.9, "  ⟦m|└⟧ ⟦r|F⟧⟦g|.......⟧  ⟦r|1 failed⟧, 7 passed"],
    [0.1, "    ⟦m|test_hilly_route_penalised: expected climb > 150, got 12⟧"],
    [0, ""],
    [0.7, "⟦m|•⟧ ⟦w|Explored⟧"],
    [0.3, "  ⟦m|└ Read scoring.py, routes.py⟧"],
    [0, ""],
    [0.8, "⟦m|•⟧ ⟦w|Edited⟧ scoring.py ⟦g|(+2⟧ ⟦r|-1)⟧"],
    [0.2, "    ⟦m|27⟧ ⟦r|-    climb = sum(seg.gain for seg in route)⟧"],
    [0.2, "    ⟦m|27⟧ ⟦g|+    climb = sum(max(seg.gain, 0)⟧"],
    [0.15, "    ⟦m|28⟧ ⟦g|+                for seg in route)⟧"],
    [0, ""],
    [0.7, "⟦m|•⟧ ⟦w|Ran⟧ pytest -q"],
    [1.0, "  ⟦m|└⟧ ⟦g|........⟧  ⟦g|8 passed⟧ in 0.41s"],
    [0, ""],
    [0.5, "⟦m|─ Worked for 38s ──────────────────────────────────────────⟧"],
    [0, ""],
    [0.4, "Fixed: downhill segments were cancelling out the climbs, so"],
    [0.1, "hilly routes looked flat. Only positive gain counts now."],
    [0, ""],
    [0.3, "⟦c|›⟧ "],
    [0, ""],
    [0, "  ⟦m|⏎ send   ⌃J newline   ⌃T transcript   ⌃C quit⟧"],
  ],
};

const pycharm: Screen = {
  title: "hello – main.py", cols: 72, cursor: 0,
  hrules: [[1, 0, 71], [10, 0, 71], [16, 0, 71]],
  vrules: [[24, 1, 10]],
  boxes: [{ r0: 4.5, r1: 5.5, c0: 0, c1: 23.5, fill: SEL }, { r0: 3.5, r1: 4.5, c0: 24.5, c1: 65, fill: "rgba(255,255,255,.04)" }],
  lines: [
    [0, " ⟦b|PC⟧  ⟦w|hello⟧ ⟦m|▾⟧    ⟦m|⎇⟧ main ⟦m|▾⟧                  main.py ⟦m|▾⟧  ⟦g|▶⟧  ⟦m|⏹  ⋮⟧"],
    [0, ""],
    [0, two(" ⟦m|Project ▾⟧", 25, " ⟦w|main.py⟧ ⟦m|×⟧")],
    [0, two(" ▾ ⟦w|hello⟧", 25, " ⟦m| 1⟧  ⟦a|def⟧ ⟦b|main⟧():")],
    [0, two("   ▸ ⟦y|.venv⟧", 25, " ⟦m| 2⟧      ⟦c|print⟧(⟦g|\"Hello, World!\"⟧)")],
    [0, two("     ⟦b|main.py⟧", 25, " ⟦m| 3⟧")],
    [0, two("   ▸ External Libraries", 25, " ⟦m| 4⟧")],
    [0, two("   ▸ Scratches", 25, " ⟦m| 5⟧  ⟦a|if⟧ __name__ == ⟦g|\"__main__\"⟧:")],
    [0, two("", 25, " ⟦m| 6⟧      main()")],
    [0, two("", 25, " ⟦m| 7⟧")],
    [0, ""],
    [0, " ⟦m|Run⟧   ⟦w|main⟧ ⟦m|×⟧"],
    [1.4, " ⟦m|/Users/aaditya/PycharmProjects/hello/.venv/bin/python main.py⟧"],
    [0.5, " Hello, World!"],
    [0.2, ""],
    [0.2, " ⟦m|Process finished with exit code⟧ ⟦g|0⟧"],
    [0, ""],
    [0, " ⟦m|hello › main.py            2:27   LF   UTF-8   4 spaces   Python 3.12⟧"],
  ],
};

const java: Screen = {
  title: "Main.java — zsh", cols: 70, cursor: 20,
  hrules: [[14.5, 0, 69]],
  lines: [
    [0, "⟦m|// Main.java⟧"],
    [0, "⟦p|public class⟧ ⟦y|Main⟧ {"],
    [0, "  ⟦p|record⟧ ⟦y|Plane⟧(⟦y|String⟧ tail, ⟦p|int⟧ altitude) {"],
    [0, "    ⟦y|Plane⟧ ⟦b|climb⟧(⟦p|int⟧ ft) { ⟦p|return new⟧ ⟦y|Plane⟧(tail, altitude + ft); }"],
    [0, "  }"],
    [0, ""],
    [0, "  ⟦p|public static void⟧ ⟦b|main⟧(⟦y|String⟧[] args) {"],
    [0, "    ⟦y|Plane⟧ p = ⟦p|new⟧ ⟦y|Plane⟧(⟦g|\"N172SP\"⟧, ⟦a|0⟧);"],
    [0, "    ⟦p|for⟧ (⟦p|int⟧ i = ⟦a|0⟧; i < ⟦a|3⟧; i++) {"],
    [0, "      p = p.⟦b|climb⟧(⟦a|1500⟧);"],
    [0, "      ⟦y|System⟧.out.⟦b|println⟧(p.tail() + ⟦g|\" at \"⟧ + p.altitude() + ⟦g|\" ft\"⟧);"],
    [0, "    }"],
    [0, "  }"],
    [0, "}"],
    [0, ""],
    [0, ""],
    [0.6, "⟦g|$⟧ javac Main.java && java Main", 1],
    [1.0, "N172SP at 1500 ft"],
    [0.35, "N172SP at 3000 ft"],
    [0.35, "N172SP at 4500 ft"],
    [0.2, "⟦g|$⟧ "],
  ],
};

const javascript: Screen = {
  title: "DevTools — localhost:3000", cols: 66, cursor: 22,
  hrules: [[1, 0, 65], [3, 0, 65]],
  boxes: [{ r0: 0.4, r1: 0.48, c0: 12, c1: 19, fill: TONE.b }],
  lines: [
    [0, " ⟦m|Elements⟧   ⟦w|Console⟧   ⟦m|Sources   Network   Performance   Memory⟧"],
    [0, ""],
    [0, " ⟦m|⊘   top ▾    Filter                          Default levels ▾⟧"],
    [0, ""],
    [0.5, "⟦b|›⟧ [⟦a|3⟧, ⟦a|1⟧, ⟦a|2⟧].sort()", 1],
    [0.3, "⟦m|<·⟧ ⟦m|▸⟧ (3) [⟦a|1⟧, ⟦a|2⟧, ⟦a|3⟧]"],
    [0.4, "⟦b|›⟧ ⟦p|const⟧ miles = [⟦a|6.2⟧, ⟦a|7.8⟧, ⟦a|5.1⟧]", 1],
    [0.3, "⟦m|<·⟧ ⟦m|undefined⟧"],
    [0.4, "⟦b|›⟧ miles.reduce((a, b) => a + b, ⟦a|0⟧).toFixed(⟦a|1⟧)", 1],
    [0.3, "⟦m|<·⟧ ⟦g|'19.1'⟧"],
    [0.4, "⟦b|›⟧ setTimeout(() => console.log(⟦g|'then the event loop'⟧), ⟦a|0⟧);", 1],
    [0, "  console.log(⟦g|'sync code runs first'⟧)", 1],
    [0.4, "  sync code runs first"],
    [0.1, "⟦m|<·⟧ ⟦m|undefined⟧"],
    [0.3, "  then the event loop"],
    [0.4, "⟦b|›⟧ ⟦a|0.1⟧ + ⟦a|0.2⟧", 1],
    [0.3, "⟦m|<·⟧ ⟦a|0.30000000000000004⟧"],
    [0.4, "⟦b|›⟧ ⟦p|typeof⟧ ⟦p|null⟧", 1],
    [0.3, "⟦m|<·⟧ ⟦g|'object'⟧"],
    [0.4, "⟦b|›⟧ document.querySelectorAll(⟦g|'#work .name'⟧).length", 1],
    [0.3, "⟦m|<·⟧ ⟦a|10⟧"],
    [0, ""],
    [0.2, "⟦b|›⟧ "],
  ],
};

const swift: Screen = {
  title: "kura — swift repl", cols: 66, cursor: 17,
  lines: [
    [0, "⟦g|$⟧ swift repl"],
    [0.4, "⟦m|Welcome to Swift. Type :help for assistance.⟧"],
    [0.4, "⟦m|  1>⟧ ⟦p|struct⟧ ⟦y|Meal⟧ { ⟦p|let⟧ name: ⟦y|String⟧; ⟦p|let⟧ calories: ⟦y|Int⟧ }", 1],
    [0.3, "⟦m|  2>⟧ ⟦p|let⟧ today = [⟦y|Meal⟧(name: ⟦g|\"oatmeal\"⟧, calories: ⟦a|310⟧),", 1],
    [0, "⟦m|  3.⟧              ⟦y|Meal⟧(name: ⟦g|\"rice bowl\"⟧, calories: ⟦a|640⟧)]", 1],
    [0.3, "⟦c|today⟧: [⟦y|Meal⟧] = ⟦a|2⟧ values {"],
    [0.05, "  [⟦a|0⟧] = { name = ⟦g|\"oatmeal\"⟧  calories = ⟦a|310⟧ }"],
    [0.05, "  [⟦a|1⟧] = { name = ⟦g|\"rice bowl\"⟧  calories = ⟦a|640⟧ }"],
    [0.05, "}"],
    [0.4, "⟦m|  4>⟧ today.map(\\.calories).reduce(⟦a|0⟧, +)", 1],
    [0.3, "⟦c|$R0⟧: ⟦y|Int⟧ = ⟦a|950⟧"],
    [0.4, "⟦m|  5>⟧ ⟦p|let⟧ goal: ⟦y|Int⟧? = ⟦p|nil⟧", 1],
    [0.3, "⟦c|goal⟧: ⟦y|Int⟧? = ⟦p|nil⟧"],
    [0.4, "⟦m|  6>⟧ goal ?? ⟦a|2000⟧", 1],
    [0.3, "⟦c|$R1⟧: ⟦y|Int⟧ = ⟦a|2000⟧"],
    [0.4, "⟦m|  7>⟧ ⟦g|\"\\(⟧today.count⟦g|) meals logged\"⟧", 1],
    [0.3, "⟦c|$R2⟧: ⟦y|String⟧ = ⟦g|\"2 meals logged\"⟧"],
    [0.3, "⟦m|  8>⟧ "],
  ],
};

const html: Screen = {
  title: "index.html", cols: 60, cursor: 0,
  hrules: [[11, 0, 59]],
  vrules: [[34, 12, 19.5]],
  lines: [
    [0, "⟦m| 1⟧  ⟦m|<!⟧⟦r|doctype⟧ ⟦y|html⟧⟦m|>⟧"],
    [0, "⟦m| 2⟧  ⟦m|<⟧⟦r|html⟧ ⟦y|lang⟧=⟦g|\"en\"⟧⟦m|>⟧"],
    [0, "⟦m| 3⟧    ⟦m|<⟧⟦r|head⟧⟦m|>⟧"],
    [0, "⟦m| 4⟧      ⟦m|<⟧⟦r|title⟧⟦m|>⟧Hello⟦m|</⟧⟦r|title⟧⟦m|>⟧"],
    [0, "⟦m| 5⟧    ⟦m|</⟧⟦r|head⟧⟦m|>⟧"],
    [0, "⟦m| 6⟧    ⟦m|<⟧⟦r|body⟧⟦m|>⟧"],
    [0, "⟦m| 7⟧      ⟦m|<⟧⟦r|h1⟧⟦m|>⟧Hello, world⟦m|</⟧⟦r|h1⟧⟦m|>⟧"],
    [0, "⟦m| 8⟧      ⟦m|<⟧⟦r|p⟧⟦m|>⟧Saved as index.html, opened in a browser.⟦m|</⟧⟦r|p⟧⟦m|>⟧"],
    [0, "⟦m| 9⟧      ⟦m|<⟧⟦r|button⟧⟦m|>⟧Click me⟦m|</⟧⟦r|button⟧⟦m|>⟧"],
    [0, "⟦m|10⟧    ⟦m|</⟧⟦r|body⟧⟦m|>⟧"],
    [0, "⟦m|11⟧  ⟦m|</⟧⟦r|html⟧⟦m|>⟧"],
    [0, ""],
    [0.6, two(" ⟦m|DOM⟧", 35, " ⟦m|Rendered⟧")],
    [0.3, two(" ⟦r|html⟧", 35, "")],
    [0.2, two(" ⟦m|├─⟧ ⟦r|head⟧", 35, " ⟦w|Hello, world⟧")],
    [0.2, two(" ⟦m|│  └─⟧ ⟦r|title⟧ ⟦m|\"Hello\"⟧", 35, "")],
    [0.2, two(" ⟦m|└─⟧ ⟦r|body⟧", 35, " Saved as index.html,")],
    [0.2, two(" ⟦m|   ├─⟧ ⟦r|h1⟧ ⟦m|\"Hello, world\"⟧", 35, " opened in a browser.")],
    [0.2, two(" ⟦m|   ├─⟧ ⟦r|p⟧ ⟦m|\"Saved as…\"⟧", 35, "")],
    [0.2, two(" ⟦m|   └─⟧ ⟦r|button⟧ ⟦m|\"Click me\"⟧", 35, "  ⟦w|Click me⟧")],
  ],
  boxes: [{ r0: 18.5, r1: 19.5, c0: 36, c1: 46, stroke: "#7f8b93" }],
};

const cpp: Screen = {
  title: "cpp — zsh", cols: 66, cursor: 14,
  lines: [
    [0, "⟦g|$⟧ cat main.cpp"],
    [0.3, "⟦p|#include⟧ ⟦g|<iostream>⟧"],
    [0, "⟦p|#include⟧ ⟦g|<vector>⟧"],
    [0, ""],
    [0, "⟦p|int⟧ ⟦b|main⟧() {"],
    [0, "    std::⟦y|vector⟧<⟦p|int⟧> v{⟦a|3⟧, ⟦a|1⟧, ⟦a|2⟧};"],
    [0, "    ⟦p|int⟧* p = &v[⟦a|0⟧];          ⟦m|// a raw pointer into the vector⟧"],
    [0, "    std::cout << ⟦g|\"first: \"⟧ << *p << ⟦g|\" at \"⟧ << p << ⟦g|'\\n'⟧;"],
    [0, "    v.push_back(⟦a|4⟧);              ⟦m|// may reallocate: p can dangle⟧"],
    [0, "    std::cout << ⟦g|\"size: \"⟧ << v.size() << ⟦g|'\\n'⟧;"],
    [0, "}"],
    [0.6, "⟦g|$⟧ clang++ -std=c++20 -Wall main.cpp -o main && ./main", 1],
    [1.1, "first: 3 at 0x600001f04010"],
    [0.1, "size: 4"],
    [0.2, "⟦g|$⟧ "],
  ],
};

const xcode: Screen = {
  title: "Kura — ContentView.swift", cols: 76, cursor: 0,
  hrules: [[1, 0, 75], [16, 0, 75]],
  vrules: [[24, 1, 16]],
  boxes: [{ r0: 5.5, r1: 6.5, c0: 0, c1: 23.5, fill: SEL }],
  lines: [
    [0, " ⟦g|▶⟧  ⟦m|■⟧    ⟦w|Kura⟧ ⟦m|›⟧ iPhone 16 Pro           ⟦m|Kura: Ready | Today at 9:41⟧"],
    [0, ""],
    [0, two(" ⟦m|▾⟧ ⟦b|Kura⟧", 25, " ⟦m| 1⟧  ⟦p|import⟧ SwiftUI")],
    [0, two("   ⟦m|▾⟧ ⟦b|Kura⟧", 25, " ⟦m| 2⟧")],
    [0, two("       KuraApp.swift", 25, " ⟦m| 3⟧  ⟦p|struct⟧ ⟦y|ContentView⟧: ⟦y|View⟧ {")],
    [0, two("       Meal.swift", 25, " ⟦m| 4⟧      ⟦p|@State private var⟧ calories = ⟦a|1240⟧")],
    [0, two("       ⟦w|ContentView.swift⟧", 25, " ⟦m| 5⟧      ⟦p|var⟧ body: ⟦p|some⟧ ⟦y|View⟧ {")],
    [0, two("       Assets", 25, " ⟦m| 6⟧          ⟦y|VStack⟧(spacing: ⟦a|12⟧) {")],
    [0, two("   ⟦m|▸⟧ ⟦b|KuraTests⟧", 25, " ⟦m| 7⟧              ⟦y|Text⟧(⟦g|\"Today\"⟧).font(.headline)")],
    [0, two("   ⟦m|▸⟧ Frameworks", 25, " ⟦m| 8⟧              ⟦y|Text⟧(⟦g|\"\\(⟧calories⟦g|) kcal\"⟧)")],
    [0, two("", 25, " ⟦m| 9⟧                  .font(.largeTitle.bold())")],
    [0, two("", 25, " ⟦m|10⟧              ⟦y|ProgressView⟧(value: ⟦a|0.62⟧)")],
    [0, two("", 25, " ⟦m|11⟧          }")],
    [0, two("", 25, " ⟦m|12⟧          .padding()")],
    [0, two("", 25, " ⟦m|13⟧      }")],
    [0, two("", 25, " ⟦m|14⟧  }")],
    [0, ""],
    [0.8, " ⟦m|Build⟧ Kura: Compiling ContentView.swift"],
    [0.9, " ⟦m|Build⟧ Kura: Linking Kura"],
    [0.6, " ⟦g|✓⟧ ⟦w|Build Succeeded⟧   ⟦m|0 warnings · 3.2s⟧"],
    [0.5, " ⟦m|Running Kura on iPhone 16 Pro…⟧"],
  ],
};

const vscode: Screen = {
  title: "page.tsx — portfolio", cols: 74, cursor: 0,
  hrules: [[1, 0, 73], [14, 0, 73], [19, 0, 73]],
  vrules: [[22, 1, 14]],
  boxes: [{ r0: 7.5, r1: 8.5, c0: 0, c1: 21.5, fill: SEL },
    { r0: 8.5, r1: 11.5, c0: 39, c1: 72, fill: POP, stroke: "#3b4655" }, { r0: 8.5, r1: 9.5, c0: 39, c1: 72, fill: "rgba(130,170,255,.22)" }],
  lines: [
    [0, " ⟦m|EXPLORER⟧              ⟦w|page.tsx⟧ ⟦m|×⟧   globals.css   layout.tsx"],
    [0, ""],
    [0, two(" ⟦m|▾⟧ PORTFOLIO", 23, " ⟦m| 1⟧  ⟦g|\"use client\"⟧;")],
    [0, two("   ⟦m|▸⟧ .claude", 23, " ⟦m| 2⟧  ⟦p|import⟧ { useState } ⟦p|from⟧ ⟦g|\"react\"⟧;")],
    [0, two("   ⟦m|▾⟧ app", 23, " ⟦m| 3⟧")],
    [0, two("       ⟦b|AsciiPlane.tsx⟧", 23, " ⟦m| 4⟧  ⟦p|export default function⟧ ⟦y|Home⟧() {")],
    [0, two("       ⟦c|globals.css⟧", 23, " ⟦m| 5⟧    ⟦p|const⟧ [open, setOpen] = ⟦b|useState⟧(⟦g|\"\"⟧);")],
    [0, two("       ⟦b|layout.tsx⟧", 23, " ⟦m| 6⟧    ⟦p|return⟧ (")],
    [0, two("       ⟦w|page.tsx⟧", 23, " ⟦m| 7⟧      <⟦r|button⟧ ⟦y|onClick⟧={() => ⟦b|setO⟧")],
    [0, two("   ⟦m|▸⟧ public", 23, "")],
    [0, two("     package.json", 23, "")],
    [0, two("", 23, "")],
    [0, two("", 23, " ⟦m| 8⟧      </⟦r|button⟧>")],
    [0, two("", 23, " ⟦m| 9⟧    );")],
    [0, ""],
    [0, " ⟦m|PROBLEMS   OUTPUT⟧   ⟦w|TERMINAL⟧   ⟦m|PORTS⟧"],
    [0.5, " ⟦g|$⟧ npm run dev", 1],
    [0.8, "   ⟦g|➜⟧  ⟦w|Local:⟧   ⟦c|http://localhost:3000/⟧"],
    [0, ""],
    [0, ""],
    [0, " ⟦m|⎇ master   ⊗ 0  ⚠ 0               Ln 7, Col 38   Spaces: 2   TypeScript JSX⟧"],
  ],
};
// The suggestion list is drawn over empty editor rows so it reads as a floating popup.
vscode.lines[9][1] = two(vscode.lines[9][1].trimEnd(), 40, "⟦b|⬚⟧ ⟦w|setOpen⟧    ⟦m|Dispatch<…>⟧");
vscode.lines[10][1] = two(vscode.lines[10][1].trimEnd(), 40, "⟦b|⬚⟧ setOnline");
vscode.lines[11][1] = two("", 40, "⟦b|⬚⟧ setOpacity");

export const SCREENS: Record<string, Screen> = {
  "chip-Swift": swift, "chip-Python": pycharm, "chip-Java": java, "chip-JavaScript": javascript,
  "chip-HTML": html, "chip-C++": cpp, "chip-Xcode": xcode, "chip-VS Code": vscode,
  "chip-PyCharm": pycharm, "chip-Claude Code": claude, "chip-Codex": codex,
};

type Parsed = { segs: [string, string][]; len: number; start: number; end: number }[];
const cache = new WeakMap<Screen, { rows: Parsed; done: number }>();
const TYPE_CPS = 34;
function parse(screen: Screen) {
  const hit = cache.get(screen);
  if (hit) return hit;
  let t = 0;
  const rows: Parsed = screen.lines.map(([delay, markup, typed]) => {
    const segs: [string, string][] = [];
    let last = 0;
    for (const m of markup.matchAll(/⟦(\w)\|([^⟧]*)⟧/g)) {
      if (m.index! > last) segs.push([markup.slice(last, m.index), TONE.i]);
      segs.push([m[2], TONE[m[1]] ?? TONE.i]);
      last = m.index! + m[0].length;
    }
    if (last < markup.length) segs.push([markup.slice(last), TONE.i]);
    const len = segs.reduce((n, [s]) => n + Array.from(s).length, 0);
    const start = t + delay, end = start + (typed ? len / TYPE_CPS : 0);
    t = end;
    return { segs, len, start, end };
  });
  const out = { rows, done: t };
  cache.set(screen, out);
  return out;
}

// Draws a window that fits inside the box, revealing lines over `elapsed` seconds.
export function drawScreen(c: CanvasRenderingContext2D, screen: Screen, x: number, y: number, w: number, h: number, elapsed: number, family: string) {
  const { rows, done } = parse(screen);
  c.font = `400 100px ${family}`;
  const ratio = c.measureText("M").width / 100;
  const titleH = 30, pad = 16;
  const size = Math.max(7, Math.min(14, (w - pad * 2) / (screen.cols * ratio), (h - titleH - pad * 2) / (rows.length * 1.45)));
  const cw = size * ratio, lh = size * 1.45;
  const pw = Math.min(w, screen.cols * cw + pad * 2), ph = titleH + pad * 2 + rows.length * lh;
  const px = x + (w - pw) / 2, py = y + Math.max(0, (h - ph) / 2);
  c.save();
  c.shadowColor = "rgba(20,24,30,.28)"; c.shadowBlur = 30; c.shadowOffsetY = 12;
  c.fillStyle = PANEL; c.beginPath(); c.roundRect(px, py, pw, ph, 10); c.fill();
  c.shadowColor = "transparent";
  c.fillStyle = BAR; c.beginPath(); c.roundRect(px, py, pw, titleH, [10, 10, 0, 0]); c.fill();
  c.strokeStyle = EDGE; c.lineWidth = 1; c.beginPath(); c.roundRect(px + 0.5, py + 0.5, pw - 1, ph - 1, 10); c.stroke();
  ["#ff5f57", "#febc2e", "#28c840"].forEach((col, i) => { c.fillStyle = col; c.beginPath(); c.arc(px + 16 + i * 18, py + titleH / 2, 5, 0, Math.PI * 2); c.fill(); });
  c.font = `500 12px ${family}`; c.fillStyle = TONE.m; c.textAlign = "center"; c.textBaseline = "middle";
  c.fillText(screen.title, px + pw / 2, py + titleH / 2);
  c.textAlign = "left";

  const ox = px + pad, oy = py + titleH + pad;
  const gx = (col: number) => ox + (col + 0.5) * cw, gy = (row: number) => oy + (row + 0.5) * lh;
  for (const b of screen.boxes ?? []) {
    if (elapsed < rows[Math.max(0, Math.floor(b.r0))].start) continue;
    const bx = gx(b.c0) - cw * 0.5, by = gy(b.r0), bw = gx(b.c1) - gx(b.c0), bh = gy(b.r1) - gy(b.r0);
    if (b.fill) { c.fillStyle = b.fill; c.beginPath(); c.roundRect(bx, by, bw, bh, 4); c.fill(); }
    if (b.stroke) { c.strokeStyle = b.stroke; c.lineWidth = 1.2; c.beginPath(); c.roundRect(bx, by, bw, bh, 6); c.stroke(); }
  }
  c.strokeStyle = RULE; c.lineWidth = 1;
  for (const [row, c0, c1] of screen.hrules ?? []) { c.beginPath(); c.moveTo(gx(c0) - cw * 0.5, gy(row)); c.lineTo(gx(c1) + cw * 0.5, gy(row)); c.stroke(); }
  for (const [col, r0, r1] of screen.vrules ?? []) { c.beginPath(); c.moveTo(gx(col), gy(r0)); c.lineTo(gx(col), gy(r1)); c.stroke(); }

  c.font = `400 ${size}px ${family}`; c.textBaseline = "middle";
  let caret: [number, number] | null = null;
  rows.forEach((r, i) => {
    if (elapsed < r.start) return;
    const shown = r.end > r.start && elapsed < r.end ? Math.floor((elapsed - r.start) * TYPE_CPS) : r.len;
    let col = 0;
    for (const [text, colour] of r.segs) {
      const chars = Array.from(text), take = Math.min(chars.length, shown - col);
      if (take <= 0) break;
      c.fillStyle = colour;
      // Drawing per character keeps columns aligned even when a symbol falls back to another font.
      for (let k = 0; k < take; k++) if (chars[k] !== " ") c.fillText(chars[k], ox + (col + k) * cw, gy(i));
      col += take;
    }
    if (shown < r.len) caret = [ox + col * cw, gy(i)];
  });
  if (!caret && elapsed >= done && screen.cursor > 0) caret = [ox + rows[screen.cursor].len * cw, gy(screen.cursor)];
  if (caret && (elapsed % 1.1 < 0.6 || elapsed < done)) {
    c.fillStyle = TONE.i; c.fillRect(caret[0] + 1, caret[1] - lh * 0.36, cw * 0.85, lh * 0.72);
  }
  c.restore();
}
