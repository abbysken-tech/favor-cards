/* Favor Cards: web app. Data lives in Supabase; see README.md for setup. */
{
const CFG = window.FAVOR_CONFIG || {};
const NAMES = { A: CFG.PARTNER_A || "Partner A", B: CFG.PARTNER_B || "Partner B" };
const other = u => (u === "A" ? "B" : "A");
const configured = CFG.SUPABASE_URL && /^https:\/\//.test(CFG.SUPABASE_URL) && CFG.SUPABASE_ANON_KEY && !/PASTE_/.test(CFG.SUPABASE_ANON_KEY);

const DESIGNS = [
  { id: "sweet",    name: "Sweetheart", emoji: "💖", bg: "linear-gradient(135deg,#ff8fab,#ff5c8a 60%,#ff9e7a)", ink: "#fff", frame: "2px solid rgba(255,255,255,.75)" },
  { id: "ticket",   name: "Movie",      emoji: "🍿", bg: "linear-gradient(135deg,#b3122e,#e2373f 55%,#f5a623)", ink: "#fff", frame: "2px dashed rgba(255,235,180,.9)" },
  { id: "sunrise",  name: "Sunrise",    emoji: "☀️", bg: "linear-gradient(135deg,#ffe08a,#ffb56b 60%,#ff8e6e)", ink: "#3a1d0b", frame: "3px dotted rgba(90,40,10,.45)" },
  { id: "ocean",    name: "Ocean",      emoji: "🌊", bg: "linear-gradient(135deg,#2bc0e4,#2a7de1 60%,#3a4fd8)", ink: "#fff", frame: "4px double rgba(255,255,255,.7)" },
  { id: "garden",   name: "Garden",     emoji: "🌷", bg: "linear-gradient(135deg,#c8f5c0,#8fdcae 55%,#6cc7b5)", ink: "#13352a", frame: "2px solid rgba(20,70,50,.35)" },
  { id: "midnight", name: "Midnight",   emoji: "🌙", bg: "linear-gradient(135deg,#2b2e6e,#5b3f99 60%,#a35fc0)", ink: "#fff", frame: "2px dashed rgba(255,255,255,.6)" },
  { id: "candy",    name: "Candy",      emoji: "🍬", bg: "repeating-linear-gradient(45deg,#ffd6ec 0 16px,#ffc2e0 16px 32px)", ink: "#5a1840", frame: "3px dotted rgba(160,40,110,.55)" },
  { id: "cozy",     name: "Cozy",       emoji: "☕", bg: "linear-gradient(135deg,#f3e2cc,#e1c3a0 60%,#c89c74)", ink: "#3b2414", frame: "4px double rgba(80,45,20,.45)" }
];
const designOf = id => DESIGNS.find(d => d.id === id) || DESIGNS[0];

const TEMPLATES = [
  ["Quality time", "ticket", [["Movie night", "You pick the film, no complaints."], ["Stay-in date night", "I plan a whole date night at home."], ["Picnic", "I pack the basket, you pick the spot."], ["Phones-away day", "A full day together with our phones put away."], ["Game night", "Your choice of game, I'm all in."]]],
  ["Pampering", "sweet", [["Foot massage", "A relaxing foot massage, whenever you want it."], ["Back massage", "A back and shoulder massage, no time limit."], ["Breakfast in bed", "Breakfast in bed, made just how you like it."], ["Favourite meal", "I cook your favourite meal."], ["Spa night", "A spa night at home, all set up by me."]]],
  ["Favors", "garden", [["Chores day", "I do your chores for a day."], ["A ride anywhere", "One ride to anywhere you need."], ["Errand run", "I run one errand for you."], ["Study support", "I help you study or quiz you."], ["Bag carrier", "I carry all the bags on our next shopping trip."]]],
  ["Power cards", "midnight", [["Win an argument", "You win one argument, instantly."], ["Pick where we eat", "You choose where we eat."], ["TV remote", "You control the TV remote all evening."], ["Veto", "Veto one plan, no questions asked."], ["Cancel a chore", "Cancel one chore of yours."], ["Forgive me", "A 'forgive me' card. Use wisely."]]],
  ["Sweet gestures", "cozy", [["Handwritten letter", "A real letter on paper, just for you."], ["Voice note", "A voice note from me, whenever you need one."], ["Surprise gift", "A surprise gift, up to an agreed budget."], ["Always pick up", "One call I will always answer."], ["Hug on demand", "A hug, any time, anywhere."]]]
];

/* ---------- helpers ---------- */
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const ymd = d => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
const todayStr = () => ymd(new Date());
const fmtDate = s => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }); };
const rel = t => { const s = (Date.now() - t) / 1000; if (s < 60) return "just now"; if (s < 3600) return Math.floor(s / 60) + "m ago"; if (s < 86400) return Math.floor(s / 3600) + "h ago"; if (s < 7 * 86400) return Math.floor(s / 86400) + "d ago"; return new Date(t).toLocaleDateString(undefined, { day: "numeric", month: "short" }); };
const left = c => c.limit - c.usesRedeemed;
const isExpired = c => !!c.expiry && c.expiry < todayStr() && left(c) > 0;
const clampLimit = v => Math.min(99, Math.max(1, parseInt(v, 10) || 1));
const isUser = v => v === "A" || v === "B";
const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const isStandalone = () => window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
const pushSupported = () => "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

const STATUS = {
  draft: ["Draft", "c-draft"], unused: ["Unused", "c-unused"], asked: ["Asked", "c-asked"],
  partly: ["Partly used", "c-partly"], usedup: ["Used up", "c-usedup"], expired: ["Expired", "c-expired"]
};
function status(c) {
  if (!c.sentAt) return "draft";
  if (left(c) <= 0) return "usedup";
  if (isExpired(c)) return "expired";
  if (c.askPending) return "asked";
  if (c.usesRedeemed > 0) return "partly";
  return "unused";
}

/* ---------- state ---------- */
const S = { user: null, role: null, phase: configured ? "loading" : "config", online: true, gateMsg: "",
  screen: "home", params: {}, form: null, cards: [], notifs: [], members: {},
  newIds: new Set(), openLogs: new Set(), pushState: "unknown" };
const loaded = { data: false };
let sb = null, channel = null;
const pendingSeen = new Set();
let toastedIds = new Set();
try { toastedIds = new Set(JSON.parse(localStorage.getItem("favor-cards-toasted") || "[]")); } catch (e) {}
const saveToasted = () => { try { localStorage.setItem("favor-cards-toasted", JSON.stringify([...toastedIds].slice(-400))); } catch (e) {} };

const byId = id => S.cards.find(c => c.id === id);
const LOG_IC = { sent: "📤", asked: "🙋", redeemed: "✅" };

function normCard(r) {
  const limit = clampLimit(r.lim);
  return {
    id: String(r.id), title: String(r.title || ""), message: String(r.message || ""), limit,
    expiry: typeof r.expiry === "string" && /^\d{4}-\d{2}-\d{2}$/.test(r.expiry) ? r.expiry : "",
    design: String(r.design || ""), creator: r.creator === "B" ? "B" : "A",
    recipient: isUser(r.recipient) ? r.recipient : null, sentAt: r.sent_at ? Date.parse(r.sent_at) : null,
    usesRedeemed: Math.max(0, Math.min(limit, Number(r.uses_redeemed) || 0)), askPending: !!r.ask_pending,
    log: Array.isArray(r.log) ? r.log.filter(e => e && LOG_IC[e.type]).map(e => ({ type: e.type, by: e.by === "B" ? "B" : "A", at: Number(e.at) || 0, left: e.left == null ? null : Number(e.left) })) : [],
    seen: { A: !!(r.seen && r.seen.A), B: !!(r.seen && r.seen.B) }, createdAt: Date.parse(r.created_at) || 0
  };
}
function normNotif(r) {
  return { id: String(r.id), to: r.to_slot === "B" ? "B" : "A", type: ["received", "asked", "redeemed"].includes(r.type) ? r.type : "received",
    cardId: String(r.card_id || ""), at: Date.parse(r.created_at) || 0, read: !!r.read, text: String(r.text || "") };
}

/* ---------- counts ---------- */
const sentAttn = u => S.cards.filter(c => c.creator === u && status(c) === "asked").length;
const recvNew = u => S.cards.filter(c => c.recipient === u && c.sentAt && !c.seen[u]).length;
const unread = u => S.notifs.filter(n => n.to === u && !n.read).length;
const mySaved = u => S.cards.filter(c => c.creator === u && !c.sentAt).sort((a, b) => b.createdAt - a.createdAt);
const mySent = u => S.cards.filter(c => c.creator === u && c.sentAt).sort((a, b) => b.sentAt - a.sentAt);
const myRecv = u => S.cards.filter(c => c.recipient === u && c.sentAt).sort((a, b) => b.sentAt - a.sentAt);

/* ---------- ticket ---------- */
function logLabel(e) {
  if (e.type === "sent") return `Sent by ${esc(NAMES[e.by])}`;
  if (e.type === "asked") return `${esc(NAMES[e.by])} asked for it`;
  return `Redeemed by ${esc(NAMES[e.by])}` + (e.left != null ? ` · ${e.left} left` : "");
}
function ticket(c, ctx, opt = {}) {
  const d = designOf(c.design), st = status(c), [stLabel, stCls] = STATUS[st], L = left(c), id = esc(c.id);
  let who = `From <b>${esc(NAMES[c.creator])}</b>`;
  if (ctx === "sent") who += ` <span class="muted">→ to</span> <b>${esc(NAMES[c.recipient])}</b>`;
  const dots = c.limit <= 12 ? `<span class="dots">${Array.from({ length: c.limit }, (_, i) => `<i class="${i < c.usesRedeemed ? "u" : ""}"></i>`).join("")}</span>` : "";
  const stamp = c.usesRedeemed > 0 ? `<div class="stamp">REDEEMED${c.limit > 1 ? `<span>${c.usesRedeemed} of ${c.limit}</span>` : ""}</div>` : "";
  const expiry = c.expiry ? `<div class="row"><span class="muted">${st === "expired" ? "Expired" : "Expires"}</span><span>${fmtDate(c.expiry)}</span></div>` : "";

  let askbar = "", acts = "";
  if (ctx === "sent" && st === "asked") askbar = `<div class="askbar">🙋 ${esc(NAMES[c.recipient])} is asking for this favor</div>`;
  if (ctx === "saved") acts = `
    <button class="btn pri" data-act="send" data-id="${id}">Send 💌</button>
    <button class="btn" data-act="reuse" data-id="${id}">Reuse</button>
    <button class="btn" data-act="edit" data-id="${id}">Edit</button>
    <button class="btn warn" data-act="del" data-id="${id}">Delete</button>`;
  if (ctx === "sent") {
    if (L > 0 && st !== "expired") acts += `<button class="btn ${st === "asked" ? "pulse" : "pri"}" data-act="redeem" data-id="${id}">${st === "asked" ? "Done it — Redeem" : "Redeem"}</button>`;
    else acts += `<span class="note">${st === "usedup" ? "All uses redeemed" : "Expired — can’t be redeemed"}</span>`;
    acts += `<button class="btn" data-act="reuse" data-id="${id}">Reuse</button>`;
  }
  if (ctx === "received") {
    if (st === "usedup") acts = `<span class="note">All used up 💚</span>`;
    else if (st === "expired") acts = `<span class="note">This card has expired</span>`;
    else if (c.askPending) acts = `<button class="btn" disabled>Waiting for ${esc(NAMES[c.creator])}…</button>`;
    else acts = `<button class="btn pri" data-act="ask" data-id="${id}">🙋 Ask for it</button>`;
  }
  const open = opt.openLog || S.openLogs.has(c.id);
  const log = ctx !== "preview" && ctx !== "saved" ? `
    <details class="log" data-log="${id}"${open ? " open" : ""}><summary>Activity (${c.log.length})</summary>
      <ul>${c.log.slice().reverse().map(e => `<li><span>${LOG_IC[e.type]}</span><span>${logLabel(e)}</span><time>${rel(e.at)}</time></li>`).join("")}</ul>
    </details>` : "";

  return `<article class="ticket${ctx === "sent" && st === "asked" ? " asked" : ""}" id="card-${id}">
    ${opt.isNew ? `<span class="newtag">NEW</span>` : ""}
    <div class="face${st === "expired" ? " expired" : ""}${c.usesRedeemed > 0 ? " stamped" : ""}" style="background:${d.bg};color:${d.ink}">
      <div class="frame" style="border:${d.frame}"></div>
      <div class="ftop"><span class="emoji">${d.emoji}</span><span class="chip ${stCls}">${stLabel}</span></div>
      <h3>${esc(c.title)}</h3>
      <p>${esc(c.message)}</p>
      ${stamp}
    </div>
    <div class="tear"></div>
    <div class="stub">
      <div class="row"><span class="who">${who}</span></div>
      <div class="row"><span class="uses">${L} of ${c.limit} left</span>${dots}</div>
      ${expiry}
    </div>
    ${askbar}
    ${acts ? `<div class="acts">${acts}</div>` : ""}
    ${log}
  </article>`;
}

/* ---------- screens ---------- */
const TITLES = { home: "Favor Cards", create: "Create card", saved: "Saved", sent: "Sent", received: "Received", notifs: "Notifications" };
const empty = (ic, t, btn) => `<div class="empty"><span class="ic">${ic}</span>${t}${btn || ""}</div>`;

function pushTip() {
  if (S.pushState === "on") return "";
  if (isIOS && !isStandalone()) return `<button class="on-tip" data-act="installHelp"><span>📲</span><span><b>Add to Home Screen</b> to get notifications: tap Share, then “Add to Home Screen”, and open Favor Cards from there.</span></button>`;
  if (!pushSupported()) return "";
  if (S.pushState === "denied") return `<button data-act="go" data-to="home"><span>🔕</span><span>Notifications are blocked for this app. Turn them on in your phone’s settings.</span></button>`;
  return `<button class="on-tip" data-act="enablePush"><span>🔔</span><span><b>Turn on notifications</b> so you know when a card arrives, is asked for, or redeemed.</span></button>`;
}

const SCREENS = {
  home() {
    const u = S.role, p = other(u), sa = sentAttn(u), rn = recvNew(u);
    const waiting = S.cards.filter(c => c.recipient === u && status(c) === "asked").length;
    const attn = [];
    const tip = pushTip(); if (tip) attn.push(tip);
    if (!S.members[p]) attn.push(`<button data-act="go" data-to="home"><span>🔗</span><span><b>${esc(NAMES[p])}</b> hasn’t joined yet. Send them this app’s link so they can sign in.</span></button>`);
    if (sa) attn.push(`<button data-act="go" data-to="sent"><span>🙋</span><span><b>${esc(NAMES[p])}</b> is asking for ${sa} favor${sa > 1 ? "s" : ""}. Redeem when done.</span></button>`);
    if (rn) attn.push(`<button data-act="go" data-to="received"><span>📬</span><span>${rn} new card${rn > 1 ? "s" : ""} from <b>${esc(NAMES[p])}</b></span></button>`);
    if (waiting) attn.push(`<button data-act="go" data-to="received"><span>⏳</span><span>Waiting on ${esc(NAMES[p])} for ${waiting} favor${waiting > 1 ? "s" : ""}</span></button>`);
    const b = n => n ? `<span class="badge">${n}</span>` : "";
    const ns = mySaved(u).length;
    return `
      <div class="hello"><h2>Hi, ${esc(NAMES[u])} 👋</h2><p>What favor are we trading today?</p></div>
      <div class="grid4">
        <button class="bigbtn b-create" data-act="newCard"><span class="ic">✨</span><span><b>Create Card</b><small>Make a new favor</small></span></button>
        <button class="bigbtn b-saved" data-act="go" data-to="saved"><span class="ic">🗂️</span><span><b>Saved</b><small>${ns} draft${ns === 1 ? "" : "s"}</small></span></button>
        <button class="bigbtn b-sent" data-act="go" data-to="sent">${b(sa)}<span class="ic">📤</span><span><b>Sent</b><small>${mySent(u).length} to ${esc(NAMES[p])}</small></span></button>
        <button class="bigbtn b-recv" data-act="go" data-to="received">${b(rn)}<span class="ic">📥</span><span><b>Received</b><small>${myRecv(u).length} from ${esc(NAMES[p])}</small></span></button>
      </div>
      ${attn.length ? `<div class="attn">${attn.join("")}</div>` : ""}
      <div class="foot"><button class="ghost" data-act="signOut">Sign out</button></div>`;
  },
  saved() {
    const list = mySaved(S.role);
    return `<div class="sh"><p>Drafts only you can see. Send when ready.</p></div>
      <div class="list">${list.length ? list.map(c => ticket(c, "saved")).join("") : empty("🗂️", "<div>No drafts yet.</div>", `<div style="margin-top:12px"><button class="btn pri" data-act="newCard">Create a card</button></div>`)}</div>`;
  },
  sent() {
    const list = mySent(S.role), f = S.params.focus;
    return `<div class="sh"><p>Cards you gave ${esc(NAMES[other(S.role)])}. You redeem them once you’ve done the favor.</p></div>
      <div class="list">${list.length ? list.map(c => ticket(c, "sent", { openLog: c.id === f })).join("") : empty("📤", "Nothing sent yet.")}</div>`;
  },
  received() {
    const u = S.role, list = myRecv(u), f = S.params.focus;
    list.forEach(c => { if (!c.seen[u]) S.newIds.add(c.id); });
    return `<div class="sh"><p>Cards from ${esc(NAMES[other(u)])}. Tap Ask when you want one.</p></div>
      <div class="list">${list.length ? list.map(c => ticket(c, "received", { isNew: S.newIds.has(c.id), openLog: c.id === f })).join("") : empty("📥", "No cards received yet.")}</div>`;
  },
  notifs() {
    const list = S.notifs.filter(n => n.to === S.role).sort((a, b) => b.at - a.at);
    const IC = { received: "📬", asked: "🙋", redeemed: "✅" };
    return `<div class="sh"><p>${unread(S.role)} unread</p>${list.some(n => !n.read) ? `<button class="ghost" data-act="readAll">Mark all read</button>` : ""}</div>
      <div class="nlist">${list.length ? list.map(n => `<button class="nitem${n.read ? "" : " unread"}" data-act="openNotif" data-id="${esc(n.id)}"><span class="ic">${IC[n.type]}</span><span>${esc(n.text)}<small>${rel(n.at)}</small></span></button>`).join("") : empty("🔔", "No notifications yet.")}</div>`;
  },
  create() {
    const f = S.form, e = f.errors || {};
    return `
      <div class="preview" id="preview">${ticket(previewCard(), "preview")}</div>
      ${f.mode === "edit" ? "" : `<details class="tpl"><summary>✨ Start from a template</summary><div class="tplbody">${TEMPLATES.map(([cat, dz, items], ci) => `<h4>${cat}</h4><div class="chips">${items.map((it, ii) => `<button data-act="tpl" data-c="${ci}" data-i="${ii}">${esc(it[0])}</button>`).join("")}</div>`).join("")}</div></details>`}
      <form id="cform" novalidate>
        <div class="field"><label for="f-title">Title <em>*</em></label>
          <input class="inp" id="f-title" name="title" maxlength="40" placeholder="e.g. Movie night" value="${esc(f.title)}">
          <div class="err" id="e-title">${e.title || ""}</div></div>
        <div class="field"><label for="f-message">What the favor is <em>*</em></label>
          <textarea class="inp" id="f-message" name="message" maxlength="140" placeholder="e.g. You pick the movie, no complaints.">${esc(f.message)}</textarea>
          <div class="err" id="e-message">${e.message || ""}</div></div>
        <div class="field"><label for="f-limit">Number of uses <em>*</em> <span class="hint">1 to 99</span></label>
          <div class="stepper"><button type="button" data-act="step" data-d="-1" aria-label="Fewer uses">−</button>
          <input class="inp" id="f-limit" name="limit" type="number" inputmode="numeric" min="1" max="99" value="${f.limit}">
          <button type="button" data-act="step" data-d="1" aria-label="More uses">+</button></div>
          <div class="err" id="e-limit">${e.limit || ""}</div></div>
        <div class="field"><label for="f-expiry">Expiry date <span class="hint">optional</span></label>
          <div class="rowi"><input class="inp" id="f-expiry" name="expiry" type="date" min="${todayStr()}" value="${esc(f.expiry)}">
          <button type="button" class="btn" style="flex:0 0 auto" data-act="clearExp">Clear</button></div>
          <div class="err" id="e-expiry">${e.expiry || ""}</div></div>
        <div class="field"><label>Design</label>
          <div class="designs">${DESIGNS.map(d => `<button type="button" class="dz${d.id === f.design ? " on" : ""}" data-act="design" data-d="${d.id}" style="background:${d.bg};color:${d.ink}" aria-label="${d.name}">${d.emoji}<span>${d.name}</span></button>`).join("")}</div></div>
        <div class="formacts">
          <button type="button" class="btn" data-act="cancel">Cancel</button>
          <button type="submit" class="btn pri" id="saveBtn">${f.mode === "edit" ? "Save changes" : "Save"}</button>
        </div>
      </form>`;
  }
};

function previewCard() {
  const f = S.form;
  return { id: "preview", title: f.title.trim() || "Card title", message: f.message.trim() || "What the favor is…", limit: clampLimit(f.limit), expiry: f.expiry, design: f.design, creator: S.role, usesRedeemed: 0, askPending: false, log: [], sentAt: null };
}

/* ---------- render ---------- */
const $ = id => document.getElementById(id);
function renderChrome() {
  const u = S.role, n = unread(u);
  $("whoami").textContent = NAMES[u];
  $("sync").textContent = S.online ? "● Live" : "⚠︎ Offline";
  $("head").innerHTML = `${S.screen !== "home" ? `<button class="iconbtn" data-act="back" aria-label="Back">‹</button>` : `<span style="width:6px"></span>`}
    <h1>${TITLES[S.screen]}</h1>
    <button class="iconbtn" data-act="go" data-to="notifs" aria-label="Notifications">🔔${n ? `<span class="badge">${n}</span>` : ""}</button>`;
  const sa = sentAttn(u), rn = recvNew(u);
  const tabs = [["home", "🏠", "Home", 0], ["create", "✨", "Create", 0], ["saved", "🗂️", "Saved", 0], ["sent", "📤", "Sent", sa], ["received", "📥", "Received", rn]];
  $("tabs").innerHTML = tabs.map(([k, ic, l, b]) => `<button class="${S.screen === k ? "on" : ""}" data-act="${k === "create" ? "newCard" : "go"}" data-to="${k}"><span class="ic">${ic}</span>${l}${b ? `<span class="badge">${b}</span>` : ""}</button>`).join("");
  if ("setAppBadge" in navigator) { const total = n; (total ? navigator.setAppBadge(total) : navigator.clearAppBadge()).catch(() => {}); }
}
function render(scrollTop) {
  if (S.phase !== "app") return renderGate();
  $("gate").classList.add("off");
  renderChrome();
  $("main").innerHTML = SCREENS[S.screen]();
  const f = S.params.focus;
  if (f) {
    S.params.focus = null;
    const el = $("card-" + f);
    if (el) requestAnimationFrame(() => { el.scrollIntoView({ behavior: "smooth", block: "center" }); el.classList.add("flash"); });
  } else if (scrollTop) window.scrollTo(0, 0);
  if (S.screen === "received") queueMicrotask(markSeen);
}
function refresh() {
  if (S.phase !== "app") return renderGate();
  if (S.screen === "create") renderChrome(); else render(false);
}
function go(screen, params = {}) {
  S.screen = screen; S.params = params;
  if (screen === "received") S.newIds = new Set();
  render(true);
}

function renderGate() {
  const g = $("gate"); g.classList.remove("off");
  const P = S.phase;
  if (P === "config") {
    g.innerHTML = `<div style="font-size:54px">🛠️</div><h2>Almost ready</h2><p>Add your Supabase project URL and key to <b>config.js</b>, then reload. The README explains where to find them.</p>`;
  } else if (P === "loading") {
    g.innerHTML = `<div style="font-size:54px">💌</div><h2>Opening your cards…</h2><p>${esc(S.gateMsg || "One moment.")}</p>`;
  } else if (P === "signin") {
    g.innerHTML = `<div style="font-size:54px">💌</div><h2>Our Favor Cards</h2><p>Sign in with the email and password set up for you.</p>
      <form class="signin" id="signinForm" novalidate>
        <label for="si-email">Email</label><input class="inp" id="si-email" type="email" autocomplete="username" inputmode="email" required>
        <label for="si-pass">Password</label><input class="inp" id="si-pass" type="password" autocomplete="current-password" required>
        <div class="gerr" id="si-err">${esc(S.gateMsg)}</div>
        <button class="btn pri" type="submit" id="si-btn">Sign in</button>
      </form>`;
  } else if (P === "claim") {
    const slot = k => `<button data-act="claim" data-slot="${k}"${S.members[k] ? " disabled" : ""}>I’m ${esc(NAMES[k])}${S.members[k] ? "<small>Already taken</small>" : ""}</button>`;
    g.innerHTML = `<div style="font-size:54px">💌</div><h2>Who are you?</h2>
      <p>You only choose once. After that, this account always opens your own cards.</p>
      <div class="claim">${slot("A")}${slot("B")}</div><button class="linkbtn" data-act="signOut">Sign out</button>`;
  } else if (P === "locked") {
    g.innerHTML = `<div style="font-size:54px">🔒</div><h2>This space is private</h2>
      <p>Favor Cards is shared by two people, and both places are already taken.</p><button class="linkbtn" data-act="signOut">Sign out</button>`;
  } else {
    g.innerHTML = `<div style="font-size:54px">⚠️</div><h2>Something went wrong</h2><p>${esc(S.gateMsg || "Close the app and open it again.")}</p><button class="btn pri" data-act="reload">Try again</button>`;
  }
}

/* ---------- toast + modal ---------- */
function toast(text, notif) {
  const t = document.createElement("button");
  t.className = "toast"; t.textContent = text;
  if (notif) t.onclick = () => openNotif(notif.id);
  $("toasts").appendChild(t);
  while ($("toasts").children.length > 3) $("toasts").firstChild.remove();
  setTimeout(() => t.remove(), 3800);
}
let modalCb = null, modalBusy = false;
function ask({ title, body, ok, cls = "pri" }, cb) {
  $("sheet").innerHTML = `<h3>${title}</h3><p>${body}</p><div class="formacts"><button class="btn" data-act="mNo">Cancel</button><button class="btn ${cls}" data-act="mYes">${ok}</button></div>`;
  modalCb = cb; modalBusy = false; $("modal").classList.add("on");
  setTimeout(() => $("sheet").querySelector("[data-act=mYes]").focus(), 30);
}
function closeModal() { $("modal").classList.remove("on"); modalCb = null; }

/* ---------- data ---------- */
const errMsg = e => (e && (e.message || e.error_description)) || "Something went wrong.";
async function run(fn) {
  try { const r = await fn(); if (r && r.error) throw r.error; return { ok: true, data: r && r.data }; }
  catch (e) { toast(navigator.onLine ? errMsg(e) : "You’re offline — try again when connected."); return { ok: false }; }
}
let reloadTimer = null;
const scheduleReload = () => { clearTimeout(reloadTimer); reloadTimer = setTimeout(loadAll, 250); };

async function loadMembers() {
  const { data, error } = await sb.from("members").select("slot,user_id");
  if (error) throw error;
  const m = {}; (data || []).forEach(r => { if (isUser(r.slot)) m[r.slot] = r.user_id; });
  S.members = m;
}
async function loadAll() {
  if (!sb || !S.user) return;
  try {
    await loadMembers();
    S.role = ["A", "B"].find(k => S.members[k] === S.user.id) || null;
    if (!S.role) { S.phase = S.members.A && S.members.B ? "locked" : "claim"; renderGate(); return; }
    const [cards, notifs] = await Promise.all([
      sb.from("cards").select("*"),
      sb.from("notifs").select("*").eq("to_slot", S.role).order("created_at", { ascending: false }).limit(200)
    ]);
    if (cards.error) throw cards.error; if (notifs.error) throw notifs.error;
    S.cards = cards.data.map(normCard); S.notifs = notifs.data.map(normNotif);
    S.online = true;
    const first = S.phase !== "app"; S.phase = "app"; loaded.data = true;
    if (first) { go(S.screen); handleHash(); syncPush(); } else refresh();
    toastNew();
  } catch (e) {
    S.online = false;
    if (S.phase === "app") refresh(); else { S.phase = "error"; S.gateMsg = navigator.onLine ? errMsg(e) : "You’re offline. Connect and try again."; renderGate(); }
  }
}
function subscribeLive() {
  if (channel) return;
  channel = sb.channel("favor-cards")
    .on("postgres_changes", { event: "*", schema: "public", table: "cards" }, scheduleReload)
    .on("postgres_changes", { event: "*", schema: "public", table: "notifs" }, scheduleReload)
    .on("postgres_changes", { event: "*", schema: "public", table: "members" }, scheduleReload)
    .subscribe(st => { if (st === "SUBSCRIBED") scheduleReload(); });
}
function markSeen() {
  const u = S.role;
  myRecv(u).filter(c => !c.seen[u] && !pendingSeen.has(c.id)).forEach(c => {
    pendingSeen.add(c.id);
    sb.rpc("mark_seen", { p_id: c.id }).then(r => { if (r.error) pendingSeen.delete(c.id); });
  });
}
function toastNew() {
  if (S.phase !== "app") return;
  const fresh = S.notifs.filter(n => n.to === S.role && !n.read && !toastedIds.has(n.id)).sort((a, b) => b.at - a.at);
  if (!fresh.length) return;
  fresh.slice(0, 3).forEach((n, i) => setTimeout(() => toast("🔔 " + n.text, n), i * 250));
  if (fresh.length > 3) setTimeout(() => toast(`🔔 +${fresh.length - 3} more in notifications`), 800);
  fresh.forEach(n => toastedIds.add(n.id)); saveToasted();
}
/* Fire the phone push for a notification this person just caused. */
function pushFor(notifId) {
  if (!notifId) return;
  sb.functions.invoke("push", { body: { notif_id: notifId } }).catch(() => {});
}

/* ---------- push subscription ---------- */
function b64ToBytes(b64) {
  const pad = "=".repeat((4 - b64.length % 4) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, c => c.charCodeAt(0));
}
async function saveSub(sub) {
  const j = sub.toJSON();
  const r = await sb.from("push_subs").upsert({ endpoint: j.endpoint, user_id: S.user.id, slot: S.role, subscription: j }, { onConflict: "endpoint" });
  if (r.error) throw r.error;
}
async function syncPush() {
  if (!pushSupported()) { S.pushState = "unsupported"; return; }
  if (Notification.permission === "denied") { S.pushState = "denied"; refresh(); return; }
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub && Notification.permission === "granted") { await saveSub(sub); S.pushState = "on"; }
    else S.pushState = "off";
  } catch (e) { S.pushState = "off"; }
  refresh();
}
async function enablePush() {
  if (!pushSupported()) { toast("This browser can’t receive notifications."); return; }
  if (!CFG.VAPID_PUBLIC_KEY) { toast("Push key missing in config.js."); return; }
  try {
    const perm = await Notification.requestPermission();
    if (perm !== "granted") { S.pushState = perm === "denied" ? "denied" : "off"; refresh(); return; }
    const reg = await navigator.serviceWorker.ready;
    const sub = (await reg.pushManager.getSubscription()) ||
      await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(CFG.VAPID_PUBLIC_KEY) });
    await saveSub(sub);
    S.pushState = "on"; toast("Notifications are on 🔔"); refresh();
  } catch (e) { toast("Couldn’t turn on notifications: " + errMsg(e)); }
}

/* ---------- actions ---------- */
function openNotif(id) {
  const n = S.notifs.find(x => x.id === id); if (!n || n.to !== S.role) return;
  if (!n.read) sb.rpc("mark_read", { p_ids: [n.id] }).then(scheduleReload);
  go(n.type === "asked" ? "sent" : "received", { focus: n.cardId });
}
function handleHash() {
  const m = /^#notif-([\w-]+)$/.exec(location.hash);
  if (!m) return;
  history.replaceState(null, "", location.pathname + location.search);
  openNotif(m[1]);
}
function blankForm(returnTo) { return { mode: "new", id: null, title: "", message: "", limit: 1, expiry: "", design: "sweet", returnTo: returnTo || "home", errors: {} }; }
function formFrom(c, mode, returnTo) {
  return { mode, id: mode === "edit" ? c.id : null, title: c.title, message: c.message, limit: c.limit, expiry: c.expiry && c.expiry >= todayStr() ? c.expiry : "", design: c.design, returnTo, errors: {} };
}
function updatePreview() { const p = $("preview"); if (p) p.innerHTML = ticket(previewCard(), "preview"); }

let saving = false;
async function saveForm() {
  if (saving) return;
  const f = S.form, errors = {};
  const title = f.title.trim(), message = f.message.trim(), lim = Number(f.limit);
  if (!title) errors.title = "Give your card a title.";
  if (!message) errors.message = "Say what the favor is.";
  if (!Number.isInteger(lim) || lim < 1 || lim > 99) errors.limit = "Choose a whole number from 1 to 99.";
  if (f.expiry && f.expiry < todayStr()) errors.expiry = "Expiry can’t be in the past.";
  ["title", "message", "limit", "expiry"].forEach(k => { const el = $("e-" + k); if (el) el.textContent = errors[k] || ""; });
  if (Object.keys(errors).length) { const first = $("f-" + Object.keys(errors)[0]); if (first) first.focus(); return; }
  saving = true; const btn = $("saveBtn"); if (btn) { btn.disabled = true; btn.textContent = "Saving…"; }
  const row = { title, message, lim, expiry: f.expiry || null, design: f.design };
  const r = f.mode === "edit"
    ? await run(() => sb.from("cards").update(row).eq("id", f.id).select("id").single())
    : await run(() => sb.from("cards").insert({ ...row, creator: S.role }).select("id").single());
  saving = false;
  if (!r.ok) { if (btn) { btn.disabled = false; btn.textContent = f.mode === "edit" ? "Save changes" : "Save"; } return; }
  toast(f.mode === "edit" ? "Draft updated ✓" : "Saved to your drafts ✓");
  S.form = null; await loadAll(); go("saved", { focus: r.data && r.data.id });
}

const ACT = {
  claim: async el => {
    const slot = el.dataset.slot; if (!isUser(slot) || S.members[slot]) return;
    el.disabled = true;
    const r = await run(() => sb.rpc("claim_slot", { p_slot: slot, p_name: NAMES[slot] }));
    if (r.ok) loadAll(); else { el.disabled = false; loadAll(); }
  },
  signOut: async () => {
    try {
      if (pushSupported() && S.user) {
        const reg = await navigator.serviceWorker.getRegistration();
        const sub = reg && await reg.pushManager.getSubscription();
        if (sub) { await sb.from("push_subs").delete().eq("endpoint", sub.endpoint); await sub.unsubscribe(); }
      }
    } catch (e) {}
    await sb.auth.signOut();
  },
  reload: () => location.reload(),
  installHelp: () => ask({ title: "Add to Home Screen", body: "In Safari, tap the Share button, then “Add to Home Screen”. Open Favor Cards from the new icon, sign in, and turn on notifications.", ok: "Got it" }, () => {}),
  enablePush: () => enablePush(),
  go: el => go(el.dataset.to),
  back: () => { if (S.screen === "create") { const r = S.form?.returnTo || "home"; S.form = null; go(r); } else go("home"); },
  newCard: () => { S.form = blankForm(S.screen === "create" ? "home" : S.screen); go("create"); },
  cancel: () => ACT.back(),
  reuse: el => { const c = byId(el.dataset.id); if (!c || c.creator !== S.role) return; S.form = formFrom(c, "new", S.screen); go("create"); toast("Copied into a new draft — edit, then Save"); },
  edit: el => { const c = byId(el.dataset.id); if (!c || c.sentAt || c.creator !== S.role) return; S.form = formFrom(c, "edit", "saved"); go("create"); },
  del: el => { const c = byId(el.dataset.id); if (!c || c.sentAt || c.creator !== S.role) return;
    ask({ title: "Delete this draft?", body: `“${esc(c.title)}” will be removed.`, ok: "Delete", cls: "warn" }, async () => {
      const r = await run(() => sb.from("cards").delete().eq("id", c.id));
      if (r.ok) { toast("Draft deleted"); loadAll(); } }); },
  send: el => { const c = byId(el.dataset.id), p = other(S.role); if (!c || c.sentAt || c.creator !== S.role) return;
    if (c.expiry && c.expiry < todayStr()) { toast("Its expiry date has passed — edit it first."); return; }
    ask({ title: `Send to ${esc(NAMES[p])}?`, body: `“${esc(c.title)}” · ${c.limit} use${c.limit > 1 ? "s" : ""}. Once sent, it can’t be edited.`, ok: "Send 💌" }, async () => {
      const r = await run(() => sb.rpc("send_card", { p_id: c.id }));
      if (r.ok) { pushFor(r.data); toast(`Sent to ${NAMES[p]} 💌`); await loadAll(); go("sent", { focus: c.id }); }
    }); },
  ask: async el => { const c = byId(el.dataset.id);
    if (!c || c.recipient !== S.role || c.askPending || left(c) <= 0 || isExpired(c)) return;
    el.disabled = true;
    const r = await run(() => sb.rpc("ask_card", { p_id: c.id }));
    if (r.ok) { pushFor(r.data); toast(`Asked! ${NAMES[c.creator]} has been notified.`); loadAll(); } else el.disabled = false; },
  redeem: el => { const c = byId(el.dataset.id);
    if (!c || c.creator !== S.role || !c.sentAt || left(c) <= 0 || isExpired(c)) return;
    ask({ title: "Mark one use redeemed?", body: `Only do this once you’ve carried out “${esc(c.title)}”. ${left(c) - 1} of ${c.limit} will be left.`, ok: "Redeem ✓" }, async () => {
      const r = await run(() => sb.rpc("redeem_card", { p_id: c.id }));
      if (r.ok) { pushFor(r.data); const rem = left(c) - 1; toast(rem ? `Redeemed · ${rem} left` : "Redeemed · card used up 💚"); loadAll(); }
    }); },
  openNotif: el => openNotif(el.dataset.id),
  readAll: async () => { const ids = S.notifs.filter(n => n.to === S.role && !n.read).map(n => n.id); if (ids.length) { await run(() => sb.rpc("mark_read", { p_ids: ids })); loadAll(); } },
  tpl: el => { const [, dz, items] = TEMPLATES[+el.dataset.c], it = items[+el.dataset.i];
    Object.assign(S.form, { title: it[0], message: it[1], design: dz });
    $("f-title").value = it[0]; $("f-message").value = it[1];
    document.querySelectorAll(".dz").forEach(b => b.classList.toggle("on", b.dataset.d === dz));
    el.closest("details").open = false; updatePreview(); },
  design: el => { S.form.design = el.dataset.d; document.querySelectorAll(".dz").forEach(b => b.classList.toggle("on", b === el)); updatePreview(); },
  step: el => { const v = clampLimit((parseInt(S.form.limit, 10) || 1) + Number(el.dataset.d)); S.form.limit = v; $("f-limit").value = v; updatePreview(); },
  clearExp: () => { S.form.expiry = ""; $("f-expiry").value = ""; updatePreview(); },
  mYes: async () => { if (modalBusy) return; modalBusy = true; const cb = modalCb; closeModal(); if (cb) await cb(); },
  mNo: () => closeModal()
};

document.addEventListener("click", e => {
  const el = e.target.closest("[data-act]");
  if (el && ACT[el.dataset.act]) { e.preventDefault(); if (el.disabled) return; ACT[el.dataset.act](el); }
  else if (e.target === $("modal")) closeModal();
});
document.addEventListener("toggle", e => {
  const d = e.target; if (!d.dataset || !d.dataset.log) return;
  if (d.open) S.openLogs.add(d.dataset.log); else S.openLogs.delete(d.dataset.log);
}, true);
document.addEventListener("keydown", e => { if (e.key === "Escape" && $("modal").classList.contains("on")) closeModal(); });
document.addEventListener("input", e => {
  if (!S.form || !e.target.name) return;
  S.form[e.target.name] = e.target.value;
  const er = $("e-" + e.target.name); if (er) er.textContent = "";
  updatePreview();
});
document.addEventListener("change", e => {
  if (S.form && e.target.name === "limit") { const v = clampLimit(e.target.value); S.form.limit = v; e.target.value = v; updatePreview(); }
});
document.addEventListener("submit", async e => {
  e.preventDefault();
  if (e.target.id === "signinForm") {
    const email = $("si-email").value.trim(), password = $("si-pass").value, btn = $("si-btn");
    if (!email || !password) { $("si-err").textContent = "Enter your email and password."; return; }
    btn.disabled = true; btn.textContent = "Signing in…";
    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) { $("si-err").textContent = /invalid/i.test(error.message) ? "That email and password don’t match." : error.message; btn.disabled = false; btn.textContent = "Sign in"; }
    return;
  }
  if (S.form) saveForm();
});
window.addEventListener("hashchange", () => { if (S.phase === "app") handleHash(); });
window.addEventListener("online", () => { S.online = true; scheduleReload(); });
window.addEventListener("offline", () => { S.online = false; refresh(); });
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible" && S.user) scheduleReload(); });

/* ---------- start ---------- */
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js").catch(() => {});
  navigator.serviceWorker.addEventListener("message", e => {
    if (e.data && e.data.type === "open") { const u = new URL(e.data.url); location.hash = u.hash; }
  });
}
renderGate();
if (configured) {
  if (!window.supabase || !window.supabase.createClient) { S.phase = "error"; S.gateMsg = "The app didn’t load fully. Check your connection and try again."; renderGate(); }
  else {
    sb = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY, { auth: { persistSession: true, autoRefreshToken: true } });
    sb.auth.onAuthStateChange((event, session) => {
      const uid = session && session.user ? session.user.id : null;
      if (!uid) {
        S.user = null; S.role = null; S.cards = []; S.notifs = []; S.phase = "signin"; S.gateMsg = ""; S.screen = "home"; S.form = null; $("toasts").innerHTML = "";
        if (channel) { sb.removeChannel(channel); channel = null; }
        renderGate(); return;
      }
      const changed = !S.user || S.user.id !== uid;
      S.user = session.user;
      if (changed) { S.phase = "loading"; S.gateMsg = ""; renderGate(); setTimeout(() => { loadAll(); subscribeLive(); }, 0); }
    });
  }
}
}
