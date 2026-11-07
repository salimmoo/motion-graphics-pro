/* Gate themes: picker (bottom-right of the gate) + origami switch (Gate.morph).
   A theme exists when tools/build_assets.py found assets/src/themes/<key>/ and wrote LAYOUT.themes[key];
   its images live in assets/img/gate/<key>/. Themes in the catalogue without assets are listed greyed ("segera").
   Adding a theme = drop arch/gates/trees/padlock/leaves .png into assets/src/themes/<key>/ and rerun the build. */
window.GateThemes = (() => {
  const CAT = [
    ["yunani", "Yunani", "Pilar & marmer klasik"],
    ["timur", "Timur Tengah", "Iwan & arabesk"],
    ["romawi", "Romawi", "Lengkung kemenangan"],
    ["persia", "Persia", "Ubin pirus & muqarnas"],
    ["mesir", "Mesir", "Pilon & hieroglif"],
    ["china", "China", "Gerbang istana merah"],
    ["jepang", "Jepang", "Karamon & sakura"],
  ];
  const DEF = "timur", STORE = "gate-theme";
  const T = (window.LAYOUT && window.LAYOUT.themes) || {};
    // catalogue + any extra folder the build found (name from its optional theme.json)
  const list = CAT.map(([key, name, sub]) => ({ key, name, sub, ok: !!T[key] }));
  Object.keys(T).forEach((key) => {
    if (list.some((t) => t.key === key)) return;
    const m = T[key].meta || {};
    list.push({ key, name: m.name || key[0].toUpperCase() + key.slice(1), sub: m.sub || "", ok: true });
  });
  const base = (k) => `assets/img/gate/${k}/`;
  const get = (k) => list.find((t) => t.key === k);

  const pick = document.getElementById("themePick"), btn = document.getElementById("themeBtn"), ul = document.getElementById("themeList");
  const nameEl = document.getElementById("themeName"), btnSw = btn && btn.querySelector(".theme-sw");
  const stage = document.getElementById("gate");
  let cur = null, busy = false;

  const store = { get() { try { return localStorage.getItem(STORE); } catch (e) { return null; } }, set(v) { try { localStorage.setItem(STORE, v); } catch (e) {} } };
  const swatch = (el, t) => {
    const L = t.ok && T[t.key];
    el.classList.toggle("none", !L);
    el.style.setProperty("--sw", (L && L.swatch) || "transparent");
    el.style.backgroundImage = L ? `url("${base(t.key)}thumb.webp")` : "";
  };

  /* ---------------- picker (button + listbox, keyboard accessible) ---------------- */
  function render() {
    ul.innerHTML = list.map((t, i) => `<li class="theme-opt" role="option" id="theme-o-${t.key}" data-key="${t.key}" tabindex="-1" aria-selected="${t.key === cur}"${t.ok ? "" : ' aria-disabled="true"'}>`
      + `<span class="theme-sw" aria-hidden="true"></span><span class="nm">${t.name}${t.sub ? `<small>${t.sub}</small>` : ""}</span>${t.ok ? "" : "<em>segera</em>"}</li>`).join("");
    ul.querySelectorAll(".theme-opt").forEach((li) => swatch(li.querySelector(".theme-sw"), get(li.dataset.key)));
  }
  const opts = () => [...ul.querySelectorAll('.theme-opt:not([aria-disabled="true"])')];
  function openList(focusLast) {
    if (!ul.hidden) return;
    render(); ul.hidden = false; ul.classList.remove("in"); void ul.offsetWidth; ul.classList.add("in");
    btn.setAttribute("aria-expanded", "true");
    const o = opts(), sel = o.find((li) => li.dataset.key === cur);
    (sel || (focusLast ? o[o.length - 1] : o[0]))?.focus();
  }
  function closeList(refocus) {
    if (ul.hidden) return;
    ul.hidden = true; btn.setAttribute("aria-expanded", "false");
    if (refocus) btn.focus();
  }
  function choose(li) {
    if (!li || li.getAttribute("aria-disabled") === "true") return;
    closeList(true); switchTo(li.dataset.key);
  }
  if (btn) {
    btn.addEventListener("click", () => (ul.hidden ? openList() : closeList()));
    btn.addEventListener("keydown", (e) => {
      if (e.key === "ArrowUp" || e.key === "ArrowDown") { e.preventDefault(); openList(e.key === "ArrowUp"); }
    });
    ul.addEventListener("click", (e) => choose(e.target.closest(".theme-opt")));
    ul.addEventListener("keydown", (e) => {
      const o = opts(), i = o.indexOf(document.activeElement);
      if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); o[(i + (e.key === "ArrowDown" ? 1 : -1) + o.length) % o.length].focus(); }
      else if (e.key === "Home" || e.key === "End") { e.preventDefault(); o[e.key === "Home" ? 0 : o.length - 1].focus(); }
      else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); choose(document.activeElement.closest(".theme-opt")); }
      else if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); closeList(true); }
      else if (e.key === "Tab") closeList(false);
    });
    document.addEventListener("pointerdown", (e) => { if (!pick.contains(e.target)) closeList(false); });
  }
  btn && btn.querySelector(".lbl i")?.remove();   // names only: "Yunani", "Timur Tengah", ...
  function label() {
    const t = get(cur); if (!t || !btn) return;
    nameEl.textContent = t.name; swatch(btnSw, t);
    btn.setAttribute("aria-label", `Tema gerbang: ${t.name}. Ganti tema`);
  }

  /* ---------------- origami switch (Gate.morph: old set folds away, new set unfolds upward) ---------------- */
  const preload = (k) => {
    const L = T[k], names = ["arch", "gate-l", "gate-r", "padlock", "trees", "thumb", ...(L.leaves || []).map((_, i) => `leaf-${i}`)];
    const all = Promise.all(names.map((n) => new Promise((res) => { const im = new Image(); im.onload = im.onerror = () => res(); im.src = window.Gate && Gate.partUrl ? Gate.partUrl(base(k), n) : `${base(k)}${n}.webp`; im.decode && im.decode().then(res, res); })));
    return Promise.race([all, new Promise((res) => setTimeout(res, 3500))]);
  };
  function apply(k) { cur = k; window.Gate && Gate.applyTheme(k, T[k], base(k)); label(); }

  async function switchTo(k) {
    const t = get(k);
    if (!t || !t.ok || k === cur || busy || document.body.classList.contains("portal")) return;
    busy = true; store.set(k);
    await preload(k);
    if (document.body.classList.contains("portal")) { busy = false; return; }
    cur = k; label();
    await Gate.morph(k, T[k], base(k));
    busy = false;
  }

  // initial theme: stored choice, else Timur Tengah, else whatever was built
  const first = [store.get(), DEF, ...list.map((t) => t.key)].find((k) => k && T[k]);
  if (first) apply(first);
  return { list, switchTo, get current() { return cur; } };
})();
