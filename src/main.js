import "./style.css";

const app = document.getElementById("app");
const loader = document.getElementById("loader");
const loaderText = document.getElementById("loader-text");

const state = {
  ingredients: load(),
  recipes: [],
  diet: localStorage.getItem("freat.diet") || "none",
  preview: null,
  showShopping: false,
  checked: loadChecked(), // lowercased item names ticked off in the shopping list
};

// ---- persistence -----------------------------------------------------------
function load() {
  try {
    return JSON.parse(localStorage.getItem("freat.ingredients")) || [];
  } catch {
    return [];
  }
}
function loadChecked() {
  try {
    return new Set(JSON.parse(localStorage.getItem("freat.checked")) || []);
  } catch {
    return new Set();
  }
}
function save() {
  localStorage.setItem("freat.ingredients", JSON.stringify(state.ingredients));
  localStorage.setItem("freat.diet", state.diet);
  localStorage.setItem("freat.checked", JSON.stringify([...state.checked]));
}

// ---- ingredient list helpers (case-insensitive, order-preserving) ----------
function addIngredients(list) {
  const seen = new Set(state.ingredients.map((i) => i.toLowerCase()));
  for (const raw of list) {
    const name = raw.trim();
    if (name && !seen.has(name.toLowerCase())) {
      state.ingredients.push(name);
      seen.add(name.toLowerCase());
    }
  }
}

// ---- shopping list ---------------------------------------------------------
// Deduped, case-insensitive union of every recipe's `missing[]`, first casing
// kept — same dedupe shape as addIngredients(), just sourced from recipes.
function shoppingItems() {
  const seen = new Set();
  const out = [];
  for (const r of state.recipes) {
    for (const m of r.missing) {
      const name = m.trim();
      const key = name.toLowerCase();
      if (key && !seen.has(key)) {
        seen.add(key);
        out.push(name);
      }
    }
  }
  return out;
}

// ---- camera -> compressed base64 ------------------------------------------
// ponytail: phone photos are huge and often rotated; downscale + honour EXIF
// before upload to cut tokens, bytes, and sideways fridges.
async function fileToBase64(file, maxDim = 1024, quality = 0.8) {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.getContext("2d").drawImage(bitmap, 0, 0, w, h);
  const blob = await new Promise((r) => canvas.toBlob(r, "image/jpeg", quality));
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return { b64: btoa(bin), url: URL.createObjectURL(blob) };
}

// ---- api -------------------------------------------------------------------
async function api(path, body, msg) {
  loaderText.textContent = msg;
  loader.hidden = false;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 120_000); // hard ceiling so the loader can never hang forever
  try {
    const res = await fetch(path, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    // a wrong proxy / dead API server returns HTML, not JSON — catch that with a clear message
    if (!res.headers.get("content-type")?.includes("application/json")) {
      throw new Error(`The freat API didn't respond (status ${res.status}). Is the server running? (bun run dev / bun server.js)`);
    }
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "something went wrong");
    return data;
  } catch (e) {
    if (e.name === "AbortError") throw new Error("Timed out after 2 minutes — the model took too long or the server is unreachable.");
    throw e;
  } finally {
    clearTimeout(timer);
    loader.hidden = true;
  }
}

async function scan(file) {
  if (!file) return;
  const { b64, url } = await fileToBase64(file);
  state.preview = url;
  render();
  try {
    const { ingredients } = await api("/api/ingredients", { image: b64, mediaType: "image/jpeg" }, "spotting ingredients…");
    addIngredients(ingredients);
    save();
    render();
  } catch (e) {
    alert(e.message);
  }
}

async function cook() {
  try {
    const { recipes } = await api("/api/recipes", { ingredients: state.ingredients, diet: state.diet }, "cooking up ideas…");
    state.recipes = recipes;
    render();
    document.getElementById("recipes")?.scrollIntoView({ behavior: "smooth" });
  } catch (e) {
    alert(e.message);
  }
}

// ---- view ------------------------------------------------------------------
const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

function render() {
  const { ingredients, recipes, diet, preview } = state;
  app.innerHTML = `
    <section class="capture">
      <label class="camera-btn">
        <input type="file" accept="image/*" capture="environment" hidden />
        ${preview ? "📸 Scan again" : "📷 Scan your fridge"}
      </label>
      ${preview ? `<img class="preview" src="${preview}" alt="your fridge" />` : `<p class="hint">Snap your open fridge — freat figures out what's in it.</p>`}
    </section>

    ${
      ingredients.length
        ? `<section class="panel">
        <h2>In your fridge <small>${ingredients.length}</small></h2>
        <div class="chips">
          ${ingredients.map((i, idx) => `<span class="chip" data-rm="${idx}">${esc(i)}<b>×</b></span>`).join("")}
        </div>
        <form class="add">
          <input name="ing" placeholder="add something we missed…" autocomplete="off" />
          <button type="submit">add</button>
        </form>
        <div class="controls">
          <select id="diet">
            ${["none", "vegetarian", "vegan", "pescatarian", "gluten-free"]
              .map((d) => `<option value="${d}" ${d === diet ? "selected" : ""}>${d === "none" ? "any diet" : d}</option>`)
              .join("")}
          </select>
          <button class="cook">🍳 Find recipes</button>
        </div>
      </section>`
        : ""
    }

    ${
      recipes.length
        ? `<section id="recipes" class="panel">
        <div class="r-section-head">
          <h2>Make this tonight</h2>
          <button class="shop-toggle ${state.showShopping ? "open" : ""}">🛒 Shopping list${
            shoppingItems().length ? ` <small>${shoppingItems().length}</small>` : ""
          }</button>
        </div>
        ${state.showShopping ? shoppingList() : ""}
        ${recipes.map(recipeCard).join("")}
      </section>`
        : ""
    }
  `;

  // wire events (fresh each render — small DOM, simplest correct approach)
  app.querySelector(".camera-btn input").addEventListener("change", (e) => scan(e.target.files[0]));
  app.querySelector(".cook")?.addEventListener("click", cook);
  app.querySelector("#diet")?.addEventListener("change", (e) => {
    state.diet = e.target.value;
    save();
  });
  app.querySelector(".add")?.addEventListener("submit", (e) => {
    e.preventDefault();
    addIngredients(e.target.ing.value.split(","));
    e.target.reset();
    save();
    render();
  });
  app.querySelectorAll("[data-rm]").forEach((el) =>
    el.addEventListener("click", () => {
      state.ingredients.splice(Number(el.dataset.rm), 1);
      save();
      render();
    })
  );
  app.querySelector(".shop-toggle")?.addEventListener("click", () => {
    state.showShopping = !state.showShopping;
    render();
  });
  app.querySelectorAll("[data-buy]").forEach((el) =>
    el.addEventListener("change", () => {
      const key = el.dataset.buy.toLowerCase();
      el.checked ? state.checked.add(key) : state.checked.delete(key);
      save();
      render();
    })
  );
}

function shoppingList() {
  const items = shoppingItems();
  if (!items.length)
    return `<p class="hint shop-empty">Nothing to buy — these recipes use only what's in your fridge. 🎉</p>`;
  return `<div class="shopping">
    ${items
      .map((it) => {
        const done = state.checked.has(it.toLowerCase());
        return `<label class="shop-item${done ? " done" : ""}">
          <input type="checkbox" data-buy="${esc(it)}" ${done ? "checked" : ""} />
          <span>${esc(it)}</span>
        </label>`;
      })
      .join("")}
  </div>`;
}

function recipeCard(r) {
  return `<article class="recipe">
    <div class="r-head">
      <h3>${esc(r.name)}</h3>
      <span class="meta">${r.time_minutes}m · ${esc(r.difficulty)}</span>
    </div>
    <p class="desc">${esc(r.description)}</p>
    <div class="chips small">
      ${r.uses.map((u) => `<span class="chip have">${esc(u)}</span>`).join("")}
      ${r.missing.map((m) => `<span class="chip need">+ ${esc(m)}</span>`).join("")}
    </div>
    <details>
      <summary>steps</summary>
      <ol>${r.steps.map((s) => `<li>${esc(s)}</li>`).join("")}</ol>
    </details>
  </article>`;
}

render();

// PWA — register the service worker in production only. In dev it caches vite's
// module graph and serves stale assets (and confuses HMR), so we actively
// unregister any leftover worker instead.
if ("serviceWorker" in navigator) {
  if (import.meta.env.PROD) {
    window.addEventListener("load", () => navigator.serviceWorker.register("/sw.js").catch(() => {}));
  } else {
    navigator.serviceWorker.getRegistrations().then((rs) => rs.forEach((r) => r.unregister()));
    caches?.keys?.().then((ks) => ks.forEach((k) => caches.delete(k)));
  }
}
