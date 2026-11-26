/* Lab website: everything is driven by data/site.csv (+ data/publications.json for research). */

const CSV_PATH = "data/site.csv";
const PUBS_PATH = "data/publications.json";
const IMG_DIR = "images/";

/* ---------- CSV parsing (RFC 4180: quotes, escaped quotes, commas/newlines in fields) ---------- */
function parseCSV(text) {
  const rows = [];
  let row = [], field = "", inQuotes = false;
  text = text.replace(/^﻿/, "");
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.some(f => f.trim() !== "")) rows.push(row);
      row = [];
    } else field += c;
  }
  row.push(field);
  if (row.some(f => f.trim() !== "")) rows.push(row);
  if (!rows.length) return [];
  const header = rows[0].map(h => h.trim().toLowerCase());
  return rows.slice(1).map(r => {
    const o = {};
    header.forEach((h, i) => { o[h] = (r[i] || "").trim(); });
    return o;
  });
}

/* ---------- helpers ---------- */
const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, ch =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));

const imgSrc = f => (/^(https?:)?\/\//.test(f) ? f : IMG_DIR + f);

function safeUrl(u) {
  u = (u || "").trim();
  if (/^(https?:|mailto:|tel:|#|\/|\.\/)/i.test(u)) return u;
  if (/^[\w.+-]+@[\w-]+\.[\w.-]+$/.test(u)) return "mailto:" + u;
  return u ? "https://" + u : "";
}

function youtubeId(url) {
  const m = String(url).match(/(?:youtube(?:-nocookie)?\.com\/(?:embed\/|watch\?(?:.*&)?v=|shorts\/|v\/)|youtu\.be\/)([\w-]{11})/);
  return m ? m[1] : null;
}

function initials(name) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join("");
}

const $ = id => document.getElementById(id);

/* ---------- renderers ---------- */
function renderSite(rows) {
  const site = rows.find(r => r.type === "site") || {};
  const name = site.name || "Research Lab";
  document.title = name;
  const logo = site.photo
    ? `<img src="${esc(imgSrc(site.photo))}" alt="" onerror="this.remove()">` : "";
  $("brand").innerHTML = `${logo}<span>${esc(name)}</span>`;
  $("hero-title").textContent = site.text || name;
  $("footer").innerHTML = `© ${new Date().getFullYear()} ${esc(name)}`;
}

function renderIntro(rows) {
  $("intro-text").innerHTML = rows.filter(r => r.type === "intro" && r.text)
    .map(r => `<p>${esc(r.text)}</p>`).join("");

  $("intro-links").innerHTML = rows.filter(r => r.type === "link" && r.url)
    .map((r, i) => `<a class="btn${i ? " secondary" : ""}" href="${esc(safeUrl(r.url))}"` +
      `${/^https?:/i.test(r.url) ? ' target="_blank" rel="noopener"' : ""}>${esc(r.name || r.url)}</a>`).join("");

  const img = rows.find(r => r.type === "image" && r.photo);
  if (img) {
    const fig = $("intro-image");
    fig.innerHTML = `<img src="${esc(imgSrc(img.photo))}" alt="${esc(img.name || "Lab group photo")}" onerror="this.closest('figure').hidden=true">` +
      (img.text ? `<figcaption>${esc(img.text)}</figcaption>` : "");
    fig.hidden = false;
  }

  $("videos").innerHTML = rows.filter(r => r.type === "video").map(r => {
    const id = youtubeId(r.url);
    if (!id) return "";
    return `<div class="video"><iframe loading="lazy" src="https://www.youtube-nocookie.com/embed/${id}" ` +
      `title="${esc(r.name || "YouTube video")}" allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div>`;
  }).join("");

  const press = rows.filter(r => r.type === "press" && r.url);
  if (press.length) {
    $("press").innerHTML = press.map(r =>
      `<li>${r.text ? `<span class="src">${esc(r.text)}</span>` : ""}<a href="${esc(safeUrl(r.url))}" target="_blank" rel="noopener">${esc(r.name)}</a></li>`).join("");
    $("press-wrap").hidden = false;
  }
}

function renderMembers(rows) {
  $("member-grid").innerHTML = rows.filter(r => r.type === "member").map(m => {
    const avatar = m.photo
      ? `<img class="avatar" src="${esc(imgSrc(m.photo))}" alt="${esc(m.name)}" loading="lazy" ` +
        `onerror="this.outerHTML='<div class=&quot;avatar fallback&quot;>${esc(initials(m.name))}</div>'">`
      : `<div class="avatar fallback">${esc(initials(m.name))}</div>`;
    const chips = [
      m.scholar && `<a class="chip" href="${esc(safeUrl(m.scholar))}" target="_blank" rel="noopener">Google Scholar</a>`,
      m.linkedin && `<a class="chip" href="${esc(safeUrl(m.linkedin))}" target="_blank" rel="noopener">LinkedIn</a>`
    ].filter(Boolean).join("");
    return `<article class="member">${avatar}<h3>${esc(m.name)}</h3><p class="role">${esc(m.position)}</p>` +
      `${chips ? `<div class="profiles">${chips}</div>` : ""}</article>`;
  }).join("");

  const funders = rows.filter(r => r.type === "funder" && r.photo);
  if (funders.length) {
    $("funders").innerHTML = funders.map(f => {
      const img = `<img src="${esc(imgSrc(f.photo))}" alt="${esc(f.name)}" onerror="this.replaceWith(document.createTextNode(this.alt))">`;
      return f.url ? `<a href="${esc(safeUrl(f.url))}" target="_blank" rel="noopener">${img}</a>` : img;
    }).join("");
    $("funders-wrap").hidden = false;
  }
}

function renderContact(rows) {
  $("contact-list").innerHTML = rows.filter(r => r.type === "contact").map(r => {
    const val = r.url
      ? `<a href="${esc(safeUrl(r.url))}"${/^https?:/i.test(r.url) ? ' target="_blank" rel="noopener"' : ""}>${esc(r.text || r.url)}</a>`
      : esc(r.text);
    return `<dt>${esc(r.name)}</dt><dd>${val}</dd>`;
  }).join("");
}

/* ---------- publications (data/publications.json, refreshed from Google Scholar by a GitHub Action) ---------- */
let allPubs = [];

function renderPubs(filter) {
  const q = (filter || "").toLowerCase().trim();
  const list = allPubs.filter(p =>
    !q || [p.title, p.authors, p.venue, p.year].join(" ").toLowerCase().includes(q));
  if (!list.length) {
    $("pubs").innerHTML = `<p class="muted">${allPubs.length ? "No publications match your filter." : "Publications will appear here once the Google Scholar update has run."}</p>`;
    return;
  }
  const byYear = {};
  list.forEach(p => { (byYear[p.year || "Other"] = byYear[p.year || "Other"] || []).push(p); });
  const years = Object.keys(byYear).sort((a, b) =>
    a === "Other" ? 1 : b === "Other" ? -1 : b - a);
  $("pubs").innerHTML = years.map(y =>
    `<h3 class="pub-year">${esc(y)}</h3>` + byYear[y].map(p => {
      const title = p.url
        ? `<a href="${esc(safeUrl(p.url))}" target="_blank" rel="noopener">${esc(p.title)}</a>` : esc(p.title);
      return `<div class="pub"><p class="pub-title">${title}</p>` +
        `<p class="pub-meta">${esc(p.authors || "")}${p.venue ? " · " + esc(p.venue) : ""}</p>` +
        `${p.citations ? `<div class="pub-cites">Cited by ${esc(p.citations)}</div>` : ""}</div>`;
    }).join("")
  ).join("");
}

async function loadPubs() {
  try {
    const res = await fetch(PUBS_PATH, { cache: "no-cache" });
    if (!res.ok) throw new Error(res.status);
    const data = await res.json();
    allPubs = (data.publications || []).slice();
    if (data.updated) $("pub-updated").textContent = "Last updated " + data.updated;
  } catch (e) {
    allPubs = [];
  }
  renderPubs("");
  $("pub-search").addEventListener("input", e => renderPubs(e.target.value));
}

/* ---------- nav highlighting ---------- */
function setupNav() {
  const links = [...document.querySelectorAll("#nav a")];
  const map = new Map(links.map(a => [a.getAttribute("href").slice(1), a]));
  const obs = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (en.isIntersecting) {
        links.forEach(a => a.classList.remove("active"));
        const a = map.get(en.target.id);
        if (a) a.classList.add("active");
      }
    });
  }, { rootMargin: "-40% 0px -55% 0px" });
  map.forEach((_, id) => { const s = $(id); if (s) obs.observe(s); });
}

/* ---------- boot ---------- */
async function main() {
  setupNav();
  let rows = [];
  try {
    const res = await fetch(CSV_PATH, { cache: "no-cache" });
    if (!res.ok) throw new Error(res.status);
    rows = parseCSV(await res.text());
  } catch (e) {
    $("intro-text").innerHTML = "<p>Could not load data/site.csv. If you opened this file directly, serve the folder instead (for example: <code>python3 -m http.server</code>).</p>";
  }
  rows.forEach(r => { r.type = (r.type || "").toLowerCase(); });
  renderSite(rows);
  renderIntro(rows);
  renderMembers(rows);
  renderContact(rows);
  loadPubs();
}

if (typeof module !== "undefined") {
  module.exports = { parseCSV, youtubeId, safeUrl, initials };
} else {
  main();
}
