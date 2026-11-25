/* Mis Finanzas · app personal de José. Datos en Supabase (tablas fin_*, protegidas por RLS: solo usuarios de fin_usuarios).
   La clave de abajo es la publicable (pública por diseño); la seguridad la dan las reglas de la base. */
(() => {
"use strict";
const SB_URL = "https://lsgeaonumjmjtexfjpsz.supabase.co";
const SB_KEY = "sb_publishable_Z4mUhhdIrto0LMInUA6_UQ_145LTUc5";
const sb = window.supabase.createClient(SB_URL, SB_KEY, { auth: { persistSession: true, autoRefreshToken: true, storageKey: "mis-finanzas-auth" } });

const CATS = {
  gasto: {
    personal: ["Comidas y delivery","Uber y transporte","Supermercado","Ocio y salidas","Ropa","Salud","Gimnasio y deporte","Viajes","Educación","Familia","Alquiler","Luz","Gas","Agua","Internet y teléfono","Suscripciones personales","Pago de tarjeta","Otros"],
    agencia: ["Apps y suscripciones","Publicidad propia","Equipo y sueldos","Freelancers","Comisiones bancarias","Impuestos","Equipamiento","Otros agencia"]
  },
  ingreso: { personal: ["Trabajo personal","Otros ingresos"], agencia: ["Otros ingresos agencia"] }
};
const NO_SUMA = new Set(["Pago de tarjeta"]);           // el resumen de la tarjeta no suma: sus consumos ya se cargan uno por uno
const FIJAS = new Set(["Alquiler","Luz","Gas","Agua","Internet y teléfono"]);
const MONEDAS = ["USD","EUR","ARS","MXN","COP","GBP","CLP"];
const CFG_DEF = { meta: 12500, fecha_meta: "2027-11-30", inicio: "2026-12-01", tasas: { USD: 1, EUR: 1.15, ARS: 0.0008, MXN: 0.055, COP: 0.00026, GBP: 1.3, CLP: 0.00105 } };
const MESES = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
const VISTAS = [["resumen","Resumen","home"],["movimientos","Movimientos","list"],["fijos","Pagos fijos","repeat"],["ajustes","Meta y ajustes","gear"]];

const I = {
  home: '<path d="M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01" stroke-width="2.4" stroke-linecap="round" fill="none" stroke="currentColor"/>',
  repeat: '<path d="M17 2l4 4-4 4M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4M21 13v2a3 3 0 0 1-3 3H3" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>',
  gear: '<path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm8.4-2.1.1-1.4-.1-1.4 2-1.6-2-3.4-2.4 1a8 8 0 0 0-2.4-1.4L15.2 2h-4l-.4 2.6a8 8 0 0 0-2.4 1.4l-2.4-1-2 3.4 2 1.6-.1 1.4.1 1.4-2 1.6 2 3.4 2.4-1c.7.6 1.5 1.1 2.4 1.4l.4 2.6h4l.4-2.6c.9-.3 1.7-.8 2.4-1.4l2.4 1 2-3.4z"/>',
  wallet: '<path d="M3 7a3 3 0 0 1 3-3h12v3H6a1 1 0 0 0 0 2h15v10a2 2 0 0 1-2 2H6a3 3 0 0 1-3-3zm14 7.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z"/>',
  card: '<path d="M2 7a3 3 0 0 1 3-3h14a3 3 0 0 1 3 3v1H2zm0 4h20v6a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3zm4 5h5v-2H6z"/>',
  piggy: '<path d="M19 9.5c.6-.3 1.2-.5 2-.5v3h1v4h-2.2a7.9 7.9 0 0 1-2.8 2.5V21h-3v-1.6a9 9 0 0 1-3 0V21H8v-2.5A7 7 0 0 1 4 12a7 7 0 0 1 7-7h2c2.5 0 4.7 1.3 6 3.3zM16 12a1 1 0 1 0 0-2 1 1 0 0 0 0 2ZM9 4.5a2.5 2.5 0 1 1 5 0z"/>',
  cal: '<path d="M7 2h2v2h6V2h2v2h2a2 2 0 0 1 2 2v13a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V6a2 2 0 0 1 2-2h2zM5 9v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9z"/>',
};
const svgIco = (k, s = 20) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">${I[k] || ""}</svg>`;

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmt0 = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 });
const usd = (n) => "US$ " + fmt0.format(Math.round(n || 0));
const usdC = (n) => { const a = Math.abs(n || 0); return "US$ " + (a >= 10000 ? (a / 1000).toLocaleString("es-AR", { maximumFractionDigits: 1 }) + " mil" : fmt0.format(Math.round(a))); };
const fmtNum = (n, m) => new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2 }).format(n) + " " + m;
const hoy = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const mesDe = (f) => String(f || "").slice(0, 7);
const sumaMes = (m, k) => { const [y, mo] = m.split("-").map(Number); const d = new Date(y, mo - 1 + k, 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; };
const nombreMes = (m) => { const [y, mo] = m.split("-").map(Number); return `${MESES[mo - 1]} ${y}`; };
const diasMes = (m) => { const [y, mo] = m.split("-").map(Number); return new Date(y, mo, 0).getDate(); };
const ddmm = (f) => `${String(f).slice(8, 10)}/${String(f).slice(5, 7)}`;

const st = { user: null, movs: [], crm: [], fijos: [], cfg: structuredClone(CFG_DEF), mes: mesDe(hoy()), vista: "resumen",
  tipo: "gasto", ambito: "personal", cat: null, filtro: "todos", q: "", borrando: null };

function toast(t) { const el = $("toast"); el.textContent = t; el.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => (el.hidden = true), 2800); }
const enUSD = (monto, moneda) => (Number(monto) || 0) * Number((st.cfg.tasas || {})[moneda] ?? CFG_DEF.tasas[moneda] ?? 1);
const cuenta = (x) => !NO_SUMA.has(x.categoria);
const todos = () => st.movs.concat(st.crm);
const delMes = (m) => todos().filter(x => mesDe(x.fecha) === m);

// ---------- auth ----------
async function iniciar() {
  const { data } = await sb.auth.getSession();
  if (data.session) entrar(data.session.user); else mostrarLogin();
  sb.auth.onAuthStateChange((ev, s) => { if (ev === "SIGNED_OUT") mostrarLogin(); });
}
function mostrarLogin() { $("vApp").hidden = true; $("vLogin").hidden = false; }
$("fLogin").addEventListener("submit", async (e) => {
  e.preventDefault(); $("lErr").textContent = ""; $("lBtn").disabled = true;
  const { data, error } = await sb.auth.signInWithPassword({ email: $("lEmail").value.trim(), password: $("lPass").value });
  $("lBtn").disabled = false;
  if (error) { $("lErr").textContent = "Correo o contraseña incorrectos."; return; }
  entrar(data.user);
});
async function salir() { await sb.auth.signOut(); st.movs = []; st.crm = []; st.fijos = []; mostrarLogin(); }
$("salir").onclick = salir; $("salir2").onclick = salir;

async function entrar(user) {
  st.user = user; $("vLogin").hidden = true; $("vApp").hidden = false; $("whoMail").textContent = user.email || "";
  await cargar();
}
async function cargar() {
  const desde = sumaMes(mesDe(hoy()), -14) + "-01";
  const [m, f, c, r] = await Promise.all([
    sb.from("fin_movimientos").select("*").gte("fecha", desde).order("fecha", { ascending: false }),
    sb.from("fin_fijos").select("*").order("dia"),
    sb.from("fin_config").select("*").maybeSingle(),
    sb.rpc("fin_ingresos_crm", { desde })
  ]);
  if (m.error || f.error) { toast("Tu usuario no tiene acceso a estos datos."); }
  st.movs = m.data || []; st.fijos = f.data || [];
  if (c.data) st.cfg = { ...CFG_DEF, ...c.data, tasas: { ...CFG_DEF.tasas, ...(c.data.tasas || {}) } };
  st.crm = (r.data || []).map(x => ({ id: `crm-${x.mes}-${x.moneda}`, tipo: "ingreso", ambito: "agencia", categoria: "Clientes (CRM)",
    concepto: `Cobros de clientes · ${x.facturas} facturas`, monto: Number(x.cobrado), moneda: x.moneda, fecha: `${x.mes}-01`, origen: "crm" }));
  render();
}
window.addEventListener("focus", () => { if (st.user && document.visibilityState === "visible") cargar(); });

// ---------- navegación ----------
function nav() {
  $("nav").innerHTML = VISTAS.map(([k, t, i]) => `<button data-go="${k}" ${st.vista === k ? 'aria-current="page"' : ""}><span class="ico">${svgIco(i, 16)}</span>${esc(t)}</button>`).join("");
  $("tabs").innerHTML = VISTAS.map(([k, t, i]) => `<button data-go="${k}" ${st.vista === k ? 'aria-current="page"' : ""}>${svgIco(i, 20)}${esc(t.split(" ")[0])}</button>`).join("");
  document.querySelectorAll("[data-view]").forEach(s => (s.hidden = s.dataset.view !== st.vista));
  const t = VISTAS.find(v => v[0] === st.vista)[1]; $("crumb").textContent = t; $("titulo").textContent = t;
}
document.querySelectorAll(".icon[data-i]").forEach(el => (el.innerHTML = svgIco(el.dataset.i, 22)));
$("mPrev").onclick = () => { st.mes = sumaMes(st.mes, -1); render(); };
$("mNext").onclick = () => { st.mes = sumaMes(st.mes, 1); render(); };

// ---------- cálculos ----------
function totales(m) {
  let ing = 0, gas = 0, gP = 0, gA = 0;
  for (const x of delMes(m)) {
    const v = enUSD(x.monto, x.moneda);
    if (x.tipo === "ingreso") ing += v;
    else if (cuenta(x)) { gas += v; x.ambito === "agencia" ? (gA += v) : (gP += v); }
  }
  return { ing, gas, gP, gA };
}
function proximoPago(f, ref) {
  const [y, mo, d] = ref.split("-").map(Number), dia = Math.max(1, Math.min(31, Number(f.dia) || 1));
  const mk = (yy, mm) => new Date(yy, mm - 1, Math.min(dia, new Date(yy, mm, 0).getDate()));
  const base = new Date(y, mo - 1, d);
  if (f.frecuencia === "anual") { const mm = Number(f.mes) || 1; let c = mk(y, mm); if (c < base) c = mk(y + 1, mm); return c; }
  let c = mk(y, mo); if (c < base) c = mo === 12 ? mk(y + 1, 1) : mk(y, mo + 1); return c;
}
const fijoEnMes = (f, m) => f.frecuencia !== "anual" || Number(f.mes) === Number(m.split("-")[1]);
const pagadoEnMes = (f, m) => st.movs.some(x => x.fijo_id === f.id && mesDe(x.fecha) === m);
function delta(a, b) { if (!b) return ""; const p = Math.round((a - b) / b * 100); return `<small class="${p >= 0 ? "pos" : "neg"}">${p >= 0 ? "+" : ""}${p}%</small>`; }
function deltaGasto(a, b) { if (!b) return ""; const p = Math.round((a - b) / b * 100); return `<small class="${p <= 0 ? "pos" : "neg"}">${p >= 0 ? "+" : ""}${p}%</small>`; }

// ---------- render ----------
function render() {
  nav(); $("mLbl").textContent = nombreMes(st.mes);
  if (st.vista === "resumen") renderResumen();
  if (st.vista === "movimientos") renderMovs();
  if (st.vista === "fijos") renderFijos($("tFijos"), true);
  if (st.vista === "ajustes") renderCfg();
}

function renderResumen() {
  const m = st.mes, actual = mesDe(hoy()), t = totales(m), p = totales(sumaMes(m, -1));
  $("kIng").innerHTML = esc(usd(t.ing)) + delta(t.ing, p.ing);
  $("kGas").innerHTML = esc(usd(t.gas)) + deltaGasto(t.gas, p.gas);
  const aho = t.ing - t.gas;
  $("kAho").innerHTML = `<span class="${aho >= 0 ? "" : "neg"}">${esc(usd(aho))}</span>`;
  const fm = st.fijos.filter(f => f.activo !== false && fijoEnMes(f, m));
  const pend = fm.filter(f => !pagadoEnMes(f, m)).length;
  $("kFij").innerHTML = esc(usd(fm.reduce((s, f) => s + enUSD(f.monto, f.moneda), 0))) + (fm.length ? `<small class="muted">${pend} sin pagar</small>` : "");
  $("fijMeter").style.width = fm.length ? `${Math.round((fm.length - pend) / fm.length * 100)}%` : "0%";
  const ult = [-5, -4, -3, -2, -1, 0].map(k => totales(sumaMes(m, k)));
  spark("spIng", ult.map(t => t.ing), "#01B574"); spark("spGas", ult.map(t => t.gas), "#F0475B"); spark("spAho", ult.map(t => t.ing - t.gas), "#0075FF");

  // meta
  const c = st.cfg, ini = c.inicio || CFG_DEF.inicio, fmeta = c.fecha_meta || CFG_DEF.fecha_meta, meta = Number(c.meta) || 0;
  let acum = 0; for (const x of todos()) { if ((x.fecha || "") < ini) continue; const v = enUSD(x.monto, x.moneda); x.tipo === "ingreso" ? (acum += v) : cuenta(x) && (acum -= v); }
  const pct = meta ? Math.max(0, Math.min(100, acum / meta * 100)) : 0;
  $("arc").setAttribute("stroke-dashoffset", (283 * (1 - pct / 100)).toFixed(1));
  $("metaPct").textContent = `${pct.toFixed(0)} %`;
  $("metaCenter").textContent = `${usdC(Math.max(0, acum))} de ${usdC(meta)}`;
  const mesesRest = Math.max(1, (Number(fmeta.slice(0, 4)) - Number(actual.slice(0, 4))) * 12 + Number(fmeta.slice(5, 7)) - Number(actual.slice(5, 7)) + 1);
  const porMes = Math.max(0, meta - acum) / mesesRest;
  const antes = hoy() < ini;
  $("metaSub").textContent = antes ? `Empieza el ${ini.split("-").reverse().join("/")} · ${usd(meta / mesesRest)} por mes` : `Faltan ${usd(Math.max(0, meta - acum))} · ${usd(porMes)} por mes`;
  $("helloTxt").textContent = antes
    ? `Tu meta: ${usd(meta)} para el ${fmeta.split("-").reverse().join("/")}. Este mes cargá todo para ver en qué se va la plata.`
    : (aho >= porMes ? `Vas bien: este mes te quedan ${usd(aho)}, más de los ${usd(porMes)} que necesitás.` : `Este mes te faltan ${usd(Math.max(0, porMes - aho))} para ir al ritmo de tu meta.`);

  // ritmo
  const n = diasMes(m), esAct = m === actual, dHoy = esAct ? Number(hoy().slice(8, 10)) : n;
  const prom = dHoy ? t.gas / dHoy : 0;
  $("rProm").textContent = usd(prom); $("rProy").textContent = esAct ? usd(prom * n) : usd(t.gas);
  $("ritmoSub").textContent = esAct ? `Día ${dHoy} de ${n}` : nombreMes(m);
  const tasa = t.ing > 0 ? Math.max(0, Math.min(100, aho / t.ing * 100)) : 0;
  $("ringArc").setAttribute("stroke-dashoffset", (390 * (1 - tasa / 100)).toFixed(1));
  $("ringVal").textContent = t.ing > 0 ? `${Math.round(aho / t.ing * 100)}%` : "—";

  renderEvo(m); renderDia(m); renderStats(m); renderFijos($("tFijosR"), false); renderIns(m); renderUltimos(m);
}

function spark(id, vals, color) {
  const el = $(id); if (!el) return;
  if (!vals.some(v => v)) { el.innerHTML = ""; return; }
  const W = 200, H = 38, min = Math.min(0, ...vals), max = Math.max(...vals) || 1, k = (H - 6) / ((max - min) || 1);
  const pts = vals.map((v, i) => [i * W / (vals.length - 1), H - 3 - (v - min) * k]), gid = "g" + id;
  el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${color}" stop-opacity=".22"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></linearGradient></defs>
    <path d="${curva(pts)} L${W},${H} L0,${H} Z" fill="url(#${gid})"/><path d="${curva(pts)}" fill="none" stroke="${color}" stroke-width="2" vector-effect="non-scaling-stroke" opacity=".85"/></svg>`;
}
function curva(pts) {
  if (pts.length < 2) return "";
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6], c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d;
}
function renderEvo(m) {
  const meses = Array.from({ length: 12 }, (_, i) => sumaMes(m, i - 11)), ts = meses.map(totales);
  if (!ts.some(t => t.ing || t.gas)) { $("gEvo").innerHTML = `<div class="empty">Cuando haya movimientos, acá ves la curva de ingresos y gastos.</div>`; return; }
  const W = 720, H = 300, l = 52, r = 10, top = 14, b = 30, max = Math.max(...ts.map(t => Math.max(t.ing, t.gas))) * 1.1 || 1;
  const x = (i) => l + (W - l - r) * i / 11, y = (v) => top + (H - top - b) * (1 - v / max);
  const pi = ts.map((t, i) => [x(i), y(t.ing)]), pg = ts.map((t, i) => [x(i), y(t.gas)]);
  let s = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Ingresos y gastos de los últimos 12 meses"><defs>
    <linearGradient id="aI" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0075FF" stop-opacity=".75"/><stop offset="1" stop-color="#0075FF" stop-opacity="0"/></linearGradient>
    <linearGradient id="aG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2CD9FF" stop-opacity=".55"/><stop offset="1" stop-color="#2CD9FF" stop-opacity="0"/></linearGradient></defs>`;
  for (let k = 0; k <= 4; k++) { const v = max * k / 4, yy = y(v); s += `<line x1="${l}" x2="${W - r}" y1="${yy.toFixed(1)}" y2="${yy.toFixed(1)}" stroke="rgba(20,26,60,.08)" stroke-dasharray="4 4"/><text x="${l - 8}" y="${(yy + 4).toFixed(1)}" font-size="11" text-anchor="end">${esc(fmt0.format(Math.round(v)))}</text>`; }
  const base = y(0);
  s += `<path d="${curva(pi)} L${x(11)},${base} L${x(0)},${base} Z" fill="url(#aI)"/><path d="${curva(pi)}" fill="none" stroke="#0075FF" stroke-width="3"/>`;
  s += `<path d="${curva(pg)} L${x(11)},${base} L${x(0)},${base} Z" fill="url(#aG)"/><path d="${curva(pg)}" fill="none" stroke="#2CD9FF" stroke-width="3"/>`;
  meses.forEach((mm, i) => { s += `<text x="${x(i).toFixed(1)}" y="${H - 8}" font-size="11" text-anchor="middle">${esc(MESES[Number(mm.slice(5)) - 1].slice(0, 3))}</text>`;
    s += `<circle cx="${x(i).toFixed(1)}" cy="${y(ts[i].ing).toFixed(1)}" r="9" fill="transparent"><title>${esc(nombreMes(mm))}: ingresos ${esc(usd(ts[i].ing))} · gastos ${esc(usd(ts[i].gas))}</title></circle>`; });
  s += `<circle cx="${x(11)}" cy="${y(ts[11].ing).toFixed(1)}" r="4.5" fill="#fff" stroke="#0075FF" stroke-width="2.5"/>`;
  $("gEvo").innerHTML = s + "</svg>";
  const tot = ts.reduce((a, t) => ({ i: a.i + t.ing, g: a.g + t.gas }), { i: 0, g: 0 });
  $("evoSub").innerHTML = `<span style="color:#0075FF">●</span> Ingresos ${esc(usdC(tot.i))} · <span style="color:#2CD9FF">●</span> Gastos ${esc(usdC(tot.g))} en 12 meses`;
}
function renderDia(m) {
  const n = diasMes(m), vals = Array(n).fill(0);
  for (const x of delMes(m)) if (x.tipo === "gasto" && cuenta(x)) { const d = Number(String(x.fecha).slice(8, 10)); if (d >= 1 && d <= n) vals[d - 1] += enUSD(x.monto, x.moneda); }
  const tot = vals.reduce((a, v) => a + v, 0);
  $("diaSub").innerHTML = tot ? `Gastaste <b>${esc(usd(tot))}</b> en ${esc(nombreMes(m))}` : `Sin gastos en ${esc(nombreMes(m))}`;
  const W = 520, H = 170, l = 34, b = 8, top = 10, max = Math.max(...vals) * 1.1 || 1, bw = (W - l) / n;
  let s = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Gasto por día">`;
  for (let k = 0; k <= 3; k++) { const v = max * k / 3, yy = top + (H - top - b) * (1 - k / 3); s += `<text x="${l - 6}" y="${(yy + 4).toFixed(1)}" font-size="10" text-anchor="end">${esc(fmt0.format(Math.round(v)))}</text>`; }
  vals.forEach((v, i) => { const h = (H - top - b) * v / max, xx = l + i * bw + bw / 2 - 2.5;
    s += `<rect x="${xx.toFixed(1)}" y="${(H - b - Math.max(2, h)).toFixed(1)}" width="5" height="${Math.max(2, h).toFixed(1)}" rx="2.5" fill="${v ? "#fff" : "rgba(255,255,255,.12)"}"><title>${i + 1}: ${esc(usd(v))}</title></rect>`; });
  $("gDia").innerHTML = s + "</svg>";
}
function renderStats(m) {
  const t = totales(m), cat = (k) => delMes(m).filter(x => x.tipo === "gasto" && x.categoria === k).reduce((a, x) => a + enUSD(x.monto, x.moneda), 0);
  const items = [["Personal", t.gP, "P"], ["Agencia", t.gA, "A"], ["Uber y transporte", cat("Uber y transporte"), "U"], ["Comidas y delivery", cat("Comidas y delivery"), "C"]];
  const max = Math.max(...items.map(i => i[1])) || 1;
  $("stats").innerHTML = items.map(([n, v, k]) => `<div class="stat"><div class="h"><i>${esc(k)}</i>${esc(n)}</div><b class="num">${esc(usd(v))}</b><div class="pbar"><i style="width:${(v / max * 100).toFixed(0)}%"></i></div></div>`).join("");
}
function renderFijos(tb, completo) {
  const m = st.mes, ref = m === mesDe(hoy()) ? hoy() : m + "-01", h0 = new Date(hoy() + "T00:00:00");
  const fs = st.fijos.filter(f => f.activo !== false).map(f => ({ f, p: proximoPago(f, ref) })).sort((a, b) => a.p - b.p);
  if (!completo) $("fijSub").textContent = fs.length ? `${fs.length} pagos · ${usd(fs.reduce((s, x) => s + enUSD(x.f.monto, x.f.moneda), 0))} por mes` : "Todavía no cargaste ninguno";
  const cols = completo ? 7 : 5;
  if (!fs.length) { tb.innerHTML = `<tr><td colspan="${cols}"><div class="empty">Cargá alquiler, luz, gas, tarjeta y las apps de la agencia en «Pagos fijos».</div></td></tr>`; return; }
  tb.innerHTML = (completo ? fs : fs.slice(0, 6)).map(({ f, p }) => {
    const dias = Math.round((p - h0) / 864e5), cuando = dias === 0 ? "hoy" : dias > 0 && dias <= 7 ? `en ${dias} d` : "";
    const est = !fijoEnMes(f, m) ? `<span class="chip">no toca</span>` : pagadoEnMes(f, m) ? `<span class="chip ok">pagado</span>` : `<button class="btn sm" data-pagar="${esc(f.id)}">Pagué</button>`;
    const amb = `<span class="chip ${esc(f.ambito)}">${f.ambito === "agencia" ? "Agencia" : "Personal"}</span>`;
    const prox = p.toLocaleDateString("es-AR", { day: "2-digit", month: "short" });
    const nombre = `<b>${esc(f.nombre)}</b>${f.calendar ? ` <span class="chip">en Calendar</span>` : ""}<div class="soft" style="font-size:.74rem">${esc(f.categoria)} · ${f.frecuencia === "anual" ? "anual" : "día " + esc(f.dia)}</div>`;
    if (!completo) return `<tr><td>${nombre}</td><td class="hide-m">${amb}</td><td>${esc(prox)} ${cuando ? `<span class="chip soon">${esc(cuando)}</span>` : ""}</td><td class="n num">${esc(usd(enUSD(f.monto, f.moneda)))}</td><td>${est}</td></tr>`;
    const borrar = st.borrando === "f:" + f.id ? `<button class="btn sm danger" data-del-f="${esc(f.id)}">Borrar</button> <button class="btn sm ghost" data-cancel>No</button>` : `<button class="btn sm ghost" data-ask="f:${esc(f.id)}" aria-label="Borrar">×</button>`;
    return `<tr><td>${nombre}</td><td>${amb}</td><td>${esc(prox)} ${cuando ? `<span class="chip soon">${esc(cuando)}</span>` : ""}</td><td class="n num">${esc(fmtNum(Number(f.monto), f.moneda))}</td><td class="n num">${esc(usd(enUSD(f.monto, f.moneda)))}</td><td>${est}</td><td style="white-space:nowrap">${borrar}</td></tr>`;
  }).join("");
}
function renderIns(m) {
  $("insSub").textContent = nombreMes(m);
  const prevs = [1, 2, 3].map(k => sumaMes(m, -k)), conDatos = prevs.filter(pm => delMes(pm).some(x => x.tipo === "gasto")).length;
  const cur = new Map(), avg = new Map();
  for (const x of delMes(m)) if (x.tipo === "gasto" && cuenta(x) && x.ambito === "personal" && !FIJAS.has(x.categoria)) cur.set(x.categoria, (cur.get(x.categoria) || 0) + enUSD(x.monto, x.moneda));
  for (const pm of prevs) for (const x of delMes(pm)) if (x.tipo === "gasto" && cuenta(x) && x.ambito === "personal") avg.set(x.categoria, (avg.get(x.categoria) || 0) + enUSD(x.monto, x.moneda) / Math.max(1, conDatos));
  const vars = [...cur.entries()].sort((a, b) => b[1] - a[1]), out = [];
  for (const [k, v] of vars) { const a = avg.get(k) || 0; if (conDatos && a > 0 && v > a * 1.15 && v - a > 20) out.push(`<li><span>${esc(k)}</span><span class="chip soon">+${esc(usd(v - a))} vs. tu promedio</span></li>`); }
  for (const [k, v] of vars.slice(0, 3)) if (!out.some(o => o.includes(`<span>${esc(k)}</span>`))) out.push(`<li><span>${esc(k)}</span><b class="num">${esc(usd(v))}</b></li>`);
  if (vars.length) out.push(`<li><span class="muted">Bajando un 20 % «${esc(vars[0][0])}» guardás ${esc(usd(vars[0][1] * 0.2 * 12))} al año.</span></li>`);
  $("ins").innerHTML = out.length ? out.slice(0, 5).join("") : `<li><span class="muted">Cargá Uber, comidas, súper y salidas: acá aparecen las categorías que más crecen.</span></li>`;
}
function renderUltimos(m) {
  const xs = delMes(m).sort((a, b) => (b.fecha || "").localeCompare(a.fecha || "") || String(b.creado || "").localeCompare(String(a.creado || ""))).slice(0, 6);
  $("ultimos").innerHTML = xs.length ? xs.map(x => { const ing = x.tipo === "ingreso";
    return `<li><span class="dot" style="background:${ing ? "rgba(1,181,116,.18);color:#01B574" : "rgba(0,117,255,.18);color:#4DA3FF"}">${ing ? "+" : "−"}</span>
      <div style="min-width:0"><b>${esc(x.concepto || x.categoria)}</b><span>${esc(ddmm(x.fecha))} · ${esc(x.categoria)}</span></div><b class="num ${ing ? "pos" : ""}">${ing ? "+" : "−"}${esc(usd(enUSD(x.monto, x.moneda)))}</b></li>`; }).join("")
    : `<li><span></span><span class="muted">Sin movimientos en ${esc(nombreMes(m))}.</span><span></span></li>`;
}
function renderMovs() {
  let xs = delMes(st.mes);
  if (st.filtro !== "todos") xs = xs.filter(x => x.ambito === st.filtro);
  if (st.q) { const q = st.q.toLowerCase(); xs = xs.filter(x => `${x.concepto || ""} ${x.categoria || ""}`.toLowerCase().includes(q)); }
  xs.sort((a, b) => (b.fecha || "").localeCompare(a.fecha || "") || String(b.creado || "").localeCompare(String(a.creado || "")));
  const t = totales(st.mes); $("movSub").textContent = `${xs.length} movimientos · entra ${usd(t.ing)} · sale ${usd(t.gas)}`;
  $("tMovs").innerHTML = xs.length ? xs.map(x => { const ing = x.tipo === "ingreso", crm = x.origen === "crm";
    const borrar = crm ? `<span class="chip">CRM</span>` : st.borrando === "m:" + x.id ? `<button class="btn sm danger" data-del-m="${esc(x.id)}">Borrar</button> <button class="btn sm ghost" data-cancel>No</button>` : `<button class="btn sm ghost" data-ask="m:${esc(x.id)}" aria-label="Borrar">×</button>`;
    return `<tr><td class="num">${esc(ddmm(x.fecha))}</td><td>${esc(x.concepto || x.categoria)}<div class="soft" style="font-size:.74rem">${esc(x.metodo || (crm ? "Facturas cobradas" : ""))}</div></td>
      <td><span class="chip ${esc(x.ambito)}">${esc(x.categoria)}</span>${NO_SUMA.has(x.categoria) ? ` <span class="chip">no suma</span>` : ""}</td>
      <td class="n num">${esc(fmtNum(Number(x.monto), x.moneda))}</td><td class="n num ${ing ? "pos" : ""}">${ing ? "+" : "−"}${esc(usd(enUSD(x.monto, x.moneda)))}</td><td style="white-space:nowrap">${borrar}</td></tr>`; }).join("")
    : `<tr><td colspan="6"><div class="empty">Sin movimientos en ${esc(nombreMes(st.mes))}${st.filtro !== "todos" || st.q ? " con este filtro" : ""}. Tocá «+» para cargar.</div></td></tr>`;
}
function renderCfg() {
  const c = st.cfg; $("cMeta").value = c.meta ?? ""; $("cFecha").value = c.fecha_meta || ""; $("cInicio").value = c.inicio || "";
  $("cTasas").innerHTML = MONEDAS.filter(m => m !== "USD").map(m => `<label>1 ${esc(m)} =<input id="tasa_${esc(m)}" type="number" step="any" min="0" value="${esc((c.tasas || {})[m] ?? "")}"></label>`).join("");
}

// ---------- cargar gasto / ingreso ----------
function llenar(sel, items, val) { sel.innerHTML = items.map(i => `<option value="${esc(i)}">${esc(i)}</option>`).join(""); if (val && items.includes(val)) sel.value = val; }
llenar($("mMoneda"), MONEDAS, "EUR"); llenar($("fMoneda"), MONEDAS, "EUR");
$("fMes").innerHTML = MESES.map((m, i) => `<option value="${i + 1}">${m}</option>`).join("");
const refrescarFCat = () => llenar($("fCat"), CATS.gasto[$("fAmbito").value], $("fCat").value); refrescarFCat();
$("fAmbito").onchange = refrescarFCat; $("fFrec").onchange = () => ($("fMesL").hidden = $("fFrec").value !== "anual");

function chips() {
  const lista = CATS[st.tipo][st.ambito]; if (!lista.includes(st.cat)) st.cat = lista[0];
  $("mChips").innerHTML = lista.map(c => `<button type="button" data-cat="${esc(c)}" aria-pressed="${c === st.cat}">${esc(c)}</button>`).join("");
  $("tGas").setAttribute("aria-pressed", st.tipo === "gasto"); $("tIng").setAttribute("aria-pressed", st.tipo === "ingreso");
  $("aPer").setAttribute("aria-pressed", st.ambito === "personal"); $("aAge").setAttribute("aria-pressed", st.ambito === "agencia");
  $("mGuardar").textContent = st.tipo === "gasto" ? "Guardar gasto" : "Guardar ingreso"; hint();
}
function hint() { const v = $("mMonto").value; $("mHint").textContent = v ? `= ${usd(enUSD(v, $("mMoneda").value))}${NO_SUMA.has(st.cat) ? " · el resumen de la tarjeta no suma (sus consumos ya están cargados)" : ""}` : "Se pasa solo a dólares"; }
function abrir() { $("mFecha").value = hoy(); chips(); $("sheet").hidden = false; $("sheetBg").hidden = false; setTimeout(() => $("mMonto").focus(), 50); }
function cerrar() { $("sheet").hidden = true; $("sheetBg").hidden = true; }
$("tGas").onclick = () => { st.tipo = "gasto"; chips(); }; $("tIng").onclick = () => { st.tipo = "ingreso"; chips(); };
$("aPer").onclick = () => { st.ambito = "personal"; chips(); }; $("aAge").onclick = () => { st.ambito = "agencia"; chips(); };
$("mChips").addEventListener("click", e => { const b = e.target.closest("[data-cat]"); if (b) { st.cat = b.dataset.cat; chips(); } });
["mMonto", "mMoneda"].forEach(id => $(id).addEventListener("input", hint));
$("sheetX").onclick = cerrar; $("sheetBg").onclick = cerrar;
document.addEventListener("keydown", e => { if (e.key === "Escape" && !$("sheet").hidden) cerrar(); });

$("fMov").addEventListener("submit", async (e) => {
  e.preventDefault(); const monto = Number($("mMonto").value); if (!(monto > 0)) { toast("Poné un monto mayor que cero."); return; }
  const row = { tipo: st.tipo, ambito: st.ambito, categoria: st.cat, concepto: $("mConcepto").value.trim() || null, monto, moneda: $("mMoneda").value, fecha: $("mFecha").value || hoy(), metodo: $("mMetodo").value, origen: "manual" };
  $("mGuardar").disabled = true;
  const { error } = await sb.from("fin_movimientos").insert(row);
  $("mGuardar").disabled = false;
  if (error) { toast("No se pudo guardar. Revisá la conexión."); return; }
  $("mMonto").value = ""; $("mConcepto").value = ""; cerrar(); toast(`${st.tipo === "gasto" ? "Gasto" : "Ingreso"} guardado: ${usd(enUSD(monto, row.moneda))}`);
  st.mes = mesDe(row.fecha); await cargar();
});
$("fFijo").addEventListener("submit", async (e) => {
  e.preventDefault(); const monto = Number($("fMonto").value); if (!(monto > 0)) { toast("Poné un monto mayor que cero."); return; }
  const row = { nombre: $("fNombre").value.trim(), ambito: $("fAmbito").value, categoria: $("fCat").value, monto, moneda: $("fMoneda").value, frecuencia: $("fFrec").value,
    dia: Math.max(1, Math.min(31, Number($("fDia").value) || 1)), mes: $("fFrec").value === "anual" ? Number($("fMes").value) : null, metodo: $("fMetodo").value };
  const { error } = await sb.from("fin_fijos").insert(row);
  if (error) { toast("No se pudo guardar el pago fijo."); return; }
  e.target.reset(); refrescarFCat(); $("fMesL").hidden = true; toast(`Pago fijo guardado: ${row.nombre}`); await cargar();
});
$("fCfg").addEventListener("submit", async (e) => {
  e.preventDefault(); const tasas = { USD: 1 };
  for (const m of MONEDAS) if (m !== "USD") { const v = Number($("tasa_" + m).value); tasas[m] = v > 0 ? v : st.cfg.tasas[m]; }
  const row = { user_id: st.user.id, meta: Number($("cMeta").value) || 0, fecha_meta: $("cFecha").value || CFG_DEF.fecha_meta, inicio: $("cInicio").value || CFG_DEF.inicio, tasas, actualizado: new Date().toISOString() };
  const { error } = await sb.from("fin_config").upsert(row);
  if (error) { toast("No se pudieron guardar los ajustes."); return; }
  toast("Ajustes guardados"); await cargar();
});

// ---------- clicks generales ----------
document.addEventListener("click", async (e) => {
  const b = e.target.closest("button"); if (!b) return;
  if ("add" in b.dataset) { abrir(); return; }
  if (b.dataset.go) { st.vista = b.dataset.go; st.borrando = null; render(); window.scrollTo({ top: 0 }); return; }
  if (b.dataset.f) { st.filtro = b.dataset.f; document.querySelectorAll("#segAmb button").forEach(x => x.setAttribute("aria-pressed", x === b)); renderMovs(); return; }
  if (b.dataset.ask) { st.borrando = b.dataset.ask; render(); return; }
  if ("cancel" in b.dataset) { st.borrando = null; render(); return; }
  if (b.dataset.delM) { const { error } = await sb.from("fin_movimientos").delete().eq("id", b.dataset.delM); st.borrando = null; toast(error ? "No se pudo borrar." : "Movimiento borrado"); await cargar(); return; }
  if (b.dataset.delF) { const { error } = await sb.from("fin_fijos").delete().eq("id", b.dataset.delF); st.borrando = null; toast(error ? "No se pudo borrar." : "Pago fijo borrado"); await cargar(); return; }
  if (b.dataset.pagar) {
    const f = st.fijos.find(x => x.id === b.dataset.pagar); if (!f || pagadoEnMes(f, st.mes)) return; b.disabled = true;
    const fecha = st.mes === mesDe(hoy()) ? hoy() : `${st.mes}-${String(Math.min(Number(f.dia) || 1, diasMes(st.mes))).padStart(2, "0")}`;
    const { error } = await sb.from("fin_movimientos").insert({ tipo: "gasto", ambito: f.ambito, categoria: f.categoria, concepto: f.nombre, monto: Number(f.monto), moneda: f.moneda, fecha, metodo: f.metodo, origen: "fijo", fijo_id: f.id });
    toast(error ? "No se pudo marcar." : `${f.nombre} marcado como pagado`); await cargar();
  }
});
$("busca").addEventListener("input", e => { st.q = e.target.value.trim(); renderMovs(); });

if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});

// Modo de ejemplo (#demo): datos inventados, nada se guarda. Solo para ver cómo queda.
function demo() {
  st.user = { email: "ejemplo" }; $("vLogin").hidden = true; $("vApp").hidden = false; $("whoMail").textContent = "DATOS DE EJEMPLO";
  const r = (a, b) => Math.round(a + Math.random() * (b - a)), mes0 = mesDe(hoy()); let id = 0; const add = (o) => st.movs.push({ id: "d" + id++, origen: "manual", ...o });
  for (let k = -11; k <= 0; k++) {
    const m = sumaMes(mes0, k), n = k === 0 ? Number(hoy().slice(8, 10)) : diasMes(m);
    st.crm.push({ id: "c" + k, tipo: "ingreso", ambito: "agencia", categoria: "Clientes (CRM)", concepto: "Cobros de clientes (ejemplo)", monto: 2500 + (k + 11) * 230 + r(0, 300), moneda: "EUR", fecha: m + "-01", origen: "crm" });
    add({ tipo: "gasto", ambito: "personal", categoria: "Alquiler", concepto: "Alquiler", monto: 950, moneda: "EUR", fecha: m + "-01", metodo: "Transferencia" });
    for (let d = 1; d <= n; d += r(1, 3)) {
      const f = `${m}-${String(d).padStart(2, "0")}`;
      add({ tipo: "gasto", ambito: "personal", categoria: ["Uber y transporte", "Comidas y delivery", "Supermercado", "Ocio y salidas"][r(0, 3)], concepto: "", monto: r(8, 60), moneda: "EUR", fecha: f, metodo: "Tarjeta" });
    }
    add({ tipo: "gasto", ambito: "agencia", categoria: "Apps y suscripciones", concepto: "Apps (ejemplo)", monto: r(250, 400), moneda: "USD", fecha: m + "-05", metodo: "Tarjeta" });
  }
  st.fijos = [["Alquiler", "personal", "Alquiler", 950, "EUR", 1], ["Luz", "personal", "Luz", 60, "EUR", 12], ["Claude", "agencia", "Apps y suscripciones", 200, "USD", 18], ["Make", "agencia", "Apps y suscripciones", 29, "USD", 22]]
    .map(([nombre, ambito, categoria, monto, moneda, dia], i) => ({ id: "f" + i, nombre, ambito, categoria, monto, moneda, dia, frecuencia: "mensual", activo: true }));
  st.cfg.inicio = sumaMes(mes0, -3) + "-01";
  const guardarNada = async () => toast("Modo ejemplo: no se guarda nada.");
  ["fMov", "fFijo", "fCfg"].forEach(id => $(id).addEventListener("submit", e => { e.stopImmediatePropagation(); e.preventDefault(); guardarNada(); }, true));
  render();
}
if (location.hash === "#demo") demo(); else iniciar();
})();
