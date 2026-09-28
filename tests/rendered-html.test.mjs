import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders Aaditya's portfolio and SEO metadata", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /Aaditya Shah \| Apps, Games &amp; Experiments/);
  assert.match(html, /whatever I want to learn next/);
  assert.match(html, /Wayfinder/);
  assert.match(html, /WingLab/);
  assert.match(html, /application\/ld\+json/);
  assert.match(html, /rel="canonical" href="https:\/\/aaditya-builds\.vercel\.app"/);
  assert.doesNotMatch(html, /Your site is taking shape|codex-preview/);
});

test("keeps the oversized interactive project list and recognition in source", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(page, /className="project-list"/);
  assert.match(page, /setOpenProject/);
  assert.match(page, /Congressional/);
  assert.match(page, /aria-expanded/);
  assert.match(css, /font-size: clamp\(6rem, 15\.2vw, 18rem\)/);
  assert.match(css, /prefers-reduced-motion/);
});
