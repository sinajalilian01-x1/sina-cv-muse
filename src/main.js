import "./style.css";

const year = document.getElementById("year");
if (year) year.textContent = String(new Date().getFullYear());

const root = document.documentElement;
const themeBtn = document.querySelector(".theme");
const menuBtn = document.querySelector(".menu");
const nav = document.getElementById("site-nav");
const header = document.querySelector(".nav");
const themeMeta = document.querySelector('meta[name="theme-color"]');
const email = "hello@sinaj.design";

function systemTheme() {
  return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function applyTheme(mode) {
  const dark = mode === "dark";
  if (dark) root.setAttribute("data-theme", "dark");
  else root.removeAttribute("data-theme");
  if (themeBtn) {
    themeBtn.setAttribute("aria-label", dark ? "Switch to day mode" : "Switch to night mode");
    themeBtn.title = dark ? "Day mode" : "Night mode";
  }
  if (themeMeta) themeMeta.setAttribute("content", dark ? "#000000" : "#F7F8F6");
}

const saved = localStorage.getItem("sina-cv-theme");
applyTheme(saved === "dark" || saved === "light" ? saved : systemTheme());

themeBtn?.addEventListener("click", () => {
  const next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
  localStorage.setItem("sina-cv-theme", next);
  applyTheme(next);
});

function closeNav() {
  document.body.classList.remove("nav-open");
  menuBtn?.setAttribute("aria-expanded", "false");
  menuBtn?.setAttribute("aria-label", "Open menu");
}

menuBtn?.addEventListener("click", () => {
  const open = !document.body.classList.contains("nav-open");
  document.body.classList.toggle("nav-open", open);
  menuBtn.setAttribute("aria-expanded", open ? "true" : "false");
  menuBtn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
});

nav?.querySelectorAll('a[href^="#"]').forEach((a) => {
  a.addEventListener("click", closeNav);
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeNav();
});

function onScroll() {
  header?.classList.toggle("is-scrolled", window.scrollY > 8);
}
onScroll();
window.addEventListener("scroll", onScroll, { passive: true });

const links = [...(nav?.querySelectorAll('a[href^="#"]') || [])];
const sections = links
  .map((a) => document.querySelector(a.getAttribute("href")))
  .filter(Boolean);

if (sections.length && "IntersectionObserver" in window) {
  const map = Object.fromEntries(links.map((a) => [a.getAttribute("href").slice(1), a]));
  const io = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((e) => e.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!visible) return;
      links.forEach((a) => a.removeAttribute("aria-current"));
      map[visible.target.id]?.setAttribute("aria-current", "page");
    },
    { rootMargin: "-40% 0px -50% 0px", threshold: [0.1, 0.3, 0.5] }
  );
  sections.forEach((s) => io.observe(s));
}

const copyBtn = document.getElementById("copy-email");
const copyStatus = document.getElementById("copy-status");
copyBtn?.addEventListener("click", async () => {
  const say = (msg) => {
    if (copyStatus) {
      copyStatus.hidden = false;
      copyStatus.textContent = msg;
    }
  };
  try {
    await navigator.clipboard.writeText(email);
    copyBtn.textContent = "Copied";
    say(email + " copied.");
  } catch {
    say(email);
  }
  setTimeout(() => {
    copyBtn.textContent = "Copy address";
  }, 1800);
});

const form = document.getElementById("contact-form");
const formStatus = document.getElementById("form-status");
form?.addEventListener("submit", (e) => {
  e.preventDefault();
  const data = new FormData(form);
  const name = String(data.get("name") || "").trim();
  const from = String(data.get("email") || "").trim();
  const message = String(data.get("message") || "").trim();
  const body = `Name: ${name}\nEmail: ${from}\n\n${message}`;
  window.location.href =
    "mailto:" +
    email +
    "?subject=" +
    encodeURIComponent("Project inquiry from " + name) +
    "&body=" +
    encodeURIComponent(body);
  if (formStatus) {
    formStatus.hidden = false;
    formStatus.textContent =
      "Your email app should open with this note. If it does not, write directly to " +
      email +
      ".";
  }
});

// Live 3D room hero (Three.js, Muse Swarm engine kit). Loaded after first paint.
const roomEl = document.getElementById("room");
if (roomEl) {
  const start = () =>
    import("./hero/room.js")
      .then(({ mountRoom }) => mountRoom({ container: roomEl, chip: document.getElementById("room-chip") }))
      .catch((err) => {
        console.warn("3D room unavailable", err);
        roomEl.classList.add("no-webgl");
      });
  if (document.readyState === "complete") start();
  else window.addEventListener("load", start, { once: true });
}
