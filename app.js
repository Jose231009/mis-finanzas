/* Mis Finanzas · app personal de José. Datos en Supabase (tablas fin_*, protegidas por RLS: solo usuarios de fin_usuarios).
   La clave de abajo es la publicable (pública por diseño); la seguridad la dan las reglas de la base. */
(() => {
"use strict";
const SB_URL = "https://lsgeaonumjmjtexfjpsz.supabase.co";
const SB_KEY = "sb_publishable_Z4mUhhdIrto0LMInUA6_UQ_145LTUc5";
const sb = window.supabase.createClient(SB_URL, SB_KEY, { auth: { persistSession: true, autoRefreshToken: true, storageKey: "mis-finanzas-auth" } });

const CATS = {
  gasto: {
    personal: ["Comidas oficina","Comidas y delivery","Uber y transporte","Supermercado","Lujos de fin de semana","Ocio y salidas","Ropa","Salud","Gimnasio y deporte","Peluquería","Viajes","Educación","Familia","Hogar","Limpieza","Alquiler","Luz","Gas","Agua","Internet y teléfono","Impuestos y tasas","Suscripciones personales","Créditos y préstamos","Pago de tarjeta","Ahorro","Otros"],
    agencia: ["Apps y suscripciones","Publicidad propia","Equipo y sueldos","Freelancers","Comisiones bancarias","Impuestos","Equipamiento","Créditos y préstamos","Otros agencia"]
  },
  ingreso: { personal: ["Sueldo","Trabajo personal","Otros ingresos"], agencia: ["Clientes fuera del CRM","Otros ingresos agencia"] }
};
const NO_SUMA = new Set(["Pago de tarjeta", "Ahorro"]); // el resumen de la tarjeta no suma (sus consumos se cargan uno por uno); el ahorro es plata que guardás, no un gasto
const FIJAS = new Set(["Alquiler","Luz","Gas","Agua","Internet y teléfono","Impuestos y tasas","Limpieza"]);
const MONEDAS = ["USD","EUR","ARS","MXN","COP","GBP","CLP"];
const TARJETAS_DEF = ["Visa", "Mastercard"];
const OTROS_PAGOS = ["Débito", "Efectivo", "Transferencia", "Bizum", "PayPal"];
const CUOTAS_OPC = [1, 2, 3, 4, 5, 6, 9, 10, 12, 18, 24];
const TIPOS_DEU = { cuotas: "Compra en cuotas", prestamo: "Préstamo o crédito", persona: "Deuda con una persona", otro: "Otra deuda" };
const CFG_DEF = { tarjetas: TARJETAS_DEF, meta: 12500, fecha_meta: "2027-11-30", inicio: "2026-12-01", tasas: { USD: 1, EUR: 1.15, ARS: 0.0008, MXN: 0.055, COP: 0.00026, GBP: 1.3, CLP: 0.00105 } };
const MESES = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
const VISTAS = [["resumen","Resumen","home"],["movimientos","Movimientos","list"],["fijos","Pagos fijos","repeat"],["deudas","Deudas","debt"],["proyeccion","Proyección","chart"],["ajustes","Topes y ajustes","gear"]];

const I = {
  home: '<path d="M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01" stroke-width="2.4" stroke-linecap="round" fill="none" stroke="currentColor"/>',
  repeat: '<path d="M17 2l4 4-4 4M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4M21 13v2a3 3 0 0 1-3 3H3" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>',
  gear: '<path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm8.4-2.1.1-1.4-.1-1.4 2-1.6-2-3.4-2.4 1a8 8 0 0 0-2.4-1.4L15.2 2h-4l-.4 2.6a8 8 0 0 0-2.4 1.4l-2.4-1-2 3.4 2 1.6-.1 1.4.1 1.4-2 1.6 2 3.4 2.4-1c.7.6 1.5 1.1 2.4 1.4l.4 2.6h4l.4-2.6c.9-.3 1.7-.8 2.4-1.4l2.4 1 2-3.4z"/>',
  wallet: '<path d="M3 7a3 3 0 0 1 3-3h12v3H6a1 1 0 0 0 0 2h15v10a2 2 0 0 1-2 2H6a3 3 0 0 1-3-3zm14 7.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z"/>',
  card: '<path d="M2 7a3 3 0 0 1 3-3h14a3 3 0 0 1 3 3v1H2zm0 4h20v6a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3zm4 5h5v-2H6z"/>',
  piggy: '<path d="M19 9.5c.6-.3 1.2-.5 2-.5v3h1v4h-2.2a7.9 7.9 0 0 1-2.8 2.5V21h-3v-1.6a9 9 0 0 1-3 0V21H8v-2.5A7 7 0 0 1 4 12a7 7 0 0 1 7-7h2c2.5 0 4.7 1.3 6 3.3zM16 12a1 1 0 1 0 0-2 1 1 0 0 0 0 2ZM9 4.5a2.5 2.5 0 1 1 5 0z"/>',
  debt: '<path fill-rule="evenodd" d="M6 2h12a1 1 0 0 1 1 1v19l-2.5-1.6L14 22l-2-1.6-2 1.6-2.5-1.6L5 22V3a1 1 0 0 1 1-1Zm3 5v2h6V7zm0 4v2h6v-2zm0 4v2h4v-2z"/>',
  chart: '<path d="M4 4v15a1 1 0 0 0 1 1h15" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M8 15l4-4.5 3 3L20 7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>',
  cal: '<path d="M7 2h2v2h6V2h2v2h2a2 2 0 0 1 2 2v13a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V6a2 2 0 0 1 2-2h2zM5 9v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9z"/>',
};
const svgIco = (k, s = 20) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">${I[k] || ""}</svg>`;

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmt0 = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 });
// Montos en pantalla: siempre en dólares; cada pago o deuda conserva su moneda original en las listas.
const SIMB = { USD: "US$", ARS: "$", EUR: "€", GBP: "£" };
const disp = () => "USD";   // José 25/11: todo en dólares en las tres vistas (los montos se cargan en su moneda y se pasan solos)
const tasaDe = (m) => Number(((typeof st !== "undefined" && st.cfg.tasas) || {})[m] ?? CFG_DEF.tasas[m] ?? 1);
const fmtMon = (n, m) => m === "EUR" ? `${fmt0.format(Math.round(n || 0))} €` : `${SIMB[m] || m} ${fmt0.format(Math.round(n || 0))}`;
const aDisp = (nUSD) => (nUSD || 0) / tasaDe(disp());                 // dólares → moneda en pantalla
const usd = (nUSD) => fmtMon(aDisp(nUSD), disp());                     // (se llama usd por historia: formatea en la moneda en pantalla)
const usdFijo = (n) => "US$ " + fmt0.format(Math.round(n || 0));
const corto = (a) => a >= 1e6 ? (a / 1e6).toLocaleString("es-AR", { maximumFractionDigits: 1 }) + " M" : a >= 1e4 ? Math.round(a / 1000).toLocaleString("es-AR") + " mil" : fmt0.format(Math.round(a));
const usdC = (nUSD) => `${SIMB[disp()] || disp()} ${corto(Math.abs(aDisp(nUSD)))}`;
const fmtNum = (n, m) => new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2 }).format(n) + " " + m;
const hoy = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const mesDe = (f) => String(f || "").slice(0, 7);
const sumaMes = (m, k) => { const [y, mo] = m.split("-").map(Number); const d = new Date(y, mo - 1 + k, 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; };
const nombreMes = (m) => { const [y, mo] = m.split("-").map(Number); return `${MESES[mo - 1]} ${y}`; };
const diasMes = (m) => { const [y, mo] = m.split("-").map(Number); return new Date(y, mo, 0).getDate(); };
const r2 = (x) => Math.round((Number(x) || 0) * 100) / 100;
const mesCorto = (f) => `${MESES[Number(String(f).slice(5, 7)) - 1].slice(0, 3)} ${String(f).slice(0, 4)}`;
const isoD = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
// suma k meses a una fecha; si se pasa el día (31 en un mes de 30), queda en el último día del mes
const addMeses = (f, k, dia) => { const [y, m, d] = String(f).split("-").map(Number), base = new Date(y, m - 1 + k, 1); return isoD(new Date(base.getFullYear(), base.getMonth(), Math.min(dia || d, new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate()))); };
// próxima fecha (desde hoy) en que cae un día de pago
const proximaFecha = (dia) => { const h = hoy(), d = Number(dia) || Number(h.slice(8, 10)); const este = addMeses(h.slice(0, 8) + "01", 0, d); return este >= h ? este : addMeses(h.slice(0, 8) + "01", 1, d); };
const metodoTxt = (x) => x.tarjeta ? `Tarjeta ${x.tarjeta}` : (x.metodo || "");
const ls = { get: (k) => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch {} } };
const ddmm = (f) => `${String(f).slice(8, 10)}/${String(f).slice(5, 7)}`;

const st = { user: null, demo: false, movs: [], crm: [], fijos: [], topes: [], inversiones: [], factur: [], ahorrando: false, deudas: [], pagosDeu: [], pagando: null, cfg: structuredClone(CFG_DEF), mes: mesDe(hoy()), vista: "resumen",
  tipo: "gasto", ambito: "personal", cat: null, libro: "todo", q: "", borrando: null, agencia: true };
// Solo los usuarios con fin_usuarios.agencia (José) ven la agencia y el CRM; el resto usa la app solo para lo personal.
function modo() {
  document.body.classList.toggle("solo-personal", !st.agencia);
  if (!st.agencia) { st.libro = "personal"; ["fAmbito", "dAmb", "tAmb"].forEach(id => { if ($(id)) $(id).value = "personal"; }); }
  const n = st.agencia ? "José" : ((st.user && st.user.user_metadata && st.user.user_metadata.nombre) || "");
  $("helloName").textContent = n; $("helloName").hidden = !n; $("helloT1").textContent = n ? "Hola de nuevo," : "¡Hola de nuevo!";
}

function toast(t, ms = 2800) { const el = $("toast"); el.textContent = t; el.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => (el.hidden = true), ms); }
const enUSD = (monto, moneda) => (Number(monto) || 0) * Number((st.cfg.tasas || {})[moneda] ?? CFG_DEF.tasas[moneda] ?? 1);
const cuenta = (x) => !NO_SUMA.has(x.categoria);
const todos = () => st.movs.concat(st.crm);
const delMes = (m) => todos().filter(x => mesDe(x.fecha) === m);
// «libro»: qué se mira. todo = todo junto · personal · agencia
const NOM_AMB = { personal: "Personal", agencia: "Agencia" };
const enLibro = (x) => st.libro === "todo" || x.ambito === st.libro;
try { const l = localStorage.getItem("mf-libro"); if (["todo", "personal", "agencia"].includes(l)) st.libro = l; } catch {}

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
async function salir() { await sb.auth.signOut(); st.movs = []; st.crm = []; st.fijos = []; st.deudas = []; st.pagosDeu = []; mostrarLogin(); }
$("salir").onclick = salir; $("salir2").onclick = salir;

async function entrar(user) {
  st.user = user; $("vLogin").hidden = true; $("vApp").hidden = false; $("whoMail").textContent = user.email || "";
  await cargar();
}
async function cargar() {
  const desde = sumaMes(mesDe(hoy()), -14) + "-01";
  const [m, f, c, r, d, pd, tp, iv, fc, va] = await Promise.all([
    sb.from("fin_movimientos").select("*").gte("fecha", desde).order("fecha", { ascending: false }),
    sb.from("fin_fijos").select("*").order("dia"),
    sb.from("fin_config").select("*").maybeSingle(),
    sb.rpc("fin_ingresos_crm", { desde }),
    sb.from("fin_deudas").select("*").order("creado"),
    sb.from("fin_movimientos").select("id,deuda_id,monto,fecha,cuota").not("deuda_id", "is", null),
    sb.from("fin_topes").select("*").order("creado"),
    sb.from("fin_inversiones").select("*").order("fecha"),
    sb.rpc("fin_facturacion_crm", { desde: sumaMes(mesDe(hoy()), -3) + "-01" }),
    sb.rpc("fin_ve_agencia")
  ]);
  if (m.error || f.error) { toast("Tu usuario no tiene acceso a estos datos."); }
  st.agencia = va.data === true; modo();
  st.movs = m.data || []; st.fijos = f.data || []; st.deudas = d.data || []; st.pagosDeu = pd.data || []; st.topes = tp.data || []; st.inversiones = iv.data || []; st.factur = fc.data || [];
  if (c.data) st.cfg = { ...CFG_DEF, ...c.data, tarjetas: Array.isArray(c.data.tarjetas) ? c.data.tarjetas : TARJETAS_DEF, tasas: { ...CFG_DEF.tasas, ...(c.data.tasas || {}) } };
  metodos();
  st.crm = (r.data || []).map(x => ({ id: `crm-${x.mes}-${x.moneda}`, tipo: "ingreso", ambito: "agencia", categoria: "Clientes (CRM)",
    concepto: `Cobros de clientes · ${x.facturas} facturas`, monto: Number(x.cobrado), moneda: x.moneda, fecha: `${x.mes}-01`, origen: "crm" }));
  render();
}
window.addEventListener("focus", () => { if (st.user && !st.demo && document.visibilityState === "visible") cargar(); });

// ---------- navegación ----------
function nav() {
  $("nav").innerHTML = VISTAS.map(([k, t, i]) => `<button data-go="${k}" ${st.vista === k ? 'aria-current="page"' : ""}><span class="ico">${svgIco(i, 16)}</span>${esc(t)}</button>`).join("");
  $("tabs").innerHTML = VISTAS.map(([k, t, i]) => `<button data-go="${k}" ${st.vista === k ? 'aria-current="page"' : ""}>${svgIco(i, 20)}${esc(t.split(" ")[0])}</button>`).join("");
  document.querySelectorAll("[data-view]").forEach(s => (s.hidden = s.dataset.view !== st.vista));
  const t = VISTAS.find(v => v[0] === st.vista)[1]; $("crumb").textContent = t;
  $("titulo").innerHTML = esc(t) + (st.libro === "todo" || !st.agencia ? "" : ` <small class="${st.libro}">${NOM_AMB[st.libro]}</small>`);
  document.querySelectorAll("#libroSeg button").forEach(b => b.setAttribute("aria-pressed", b.dataset.libro === st.libro));
  document.querySelectorAll("[data-disp]").forEach(th => (th.textContent = disp() === "ARS" ? "Pesos" : "USD"));
}
document.querySelectorAll(".icon[data-i]").forEach(el => (el.innerHTML = svgIco(el.dataset.i, 22)));
$("mPrev").onclick = () => { st.mes = sumaMes(st.mes, -1); render(); };
$("mNext").onclick = () => { st.mes = sumaMes(st.mes, 1); render(); };

// ---------- cálculos ----------
// Personal: la ganancia de la agencia (cobros − gastos de la agencia) entra como ingreso tuyo, junto con tus otros ingresos.
function totales(m, L = st.libro) {
  let iP = 0, iA = 0, gP = 0, gA = 0;
  for (const x of delMes(m)) {
    const v = enUSD(x.monto, x.moneda);
    if (x.tipo === "ingreso") x.ambito === "agencia" ? (iA += v) : (iP += v);
    else if (cuenta(x)) x.ambito === "agencia" ? (gA += v) : (gP += v);
  }
  const ganancia = iA - gA;
  const ing = L === "agencia" ? iA : L === "personal" ? iP + ganancia : iP + iA;
  const gas = L === "agencia" ? gA : L === "personal" ? gP : gP + gA;
  return { ing, gas, gP, gA, iP, iA, ganancia };
}
// Total previsto del mes: lo real + lo que falta cobrar (cobros fijos, facturas de clientes) y pagar (pagos fijos).
// Las tarjetas: el resumen estima lo que se gasta con tarjeta; si cargaste menos compras con tarjeta, se completa con la diferencia.
function previsto(m, L = st.libro) {
  const t = totales(m, L), act = mesDe(hoy());
  if (m < act) return { ...t, ingP: t.ing, gasP: t.gas, faltaIng: 0, faltaGas: 0 };
  const fijPend = (cobro, amb) => st.fijos.filter(f => f.activo !== false && esCobro(f) === cobro && f.ambito === amb && fijoEnMes(f, m) && !pagadoEnMes(f, m) && (cobro || !NO_SUMA.has(f.categoria)))
    .reduce((a, f) => a + enUSD(f.monto, f.moneda), 0);
  const tarj = (amb) => {
    const est = st.fijos.filter(f => f.activo !== false && !esCobro(f) && f.ambito === amb && f.categoria === "Pago de tarjeta" && fijoEnMes(f, m)).reduce((a, f) => a + enUSD(f.monto, f.moneda), 0);
    const reg = delMes(m).filter(x => x.tipo === "gasto" && cuenta(x) && x.ambito === amb && (x.tarjeta || /^Tarjeta/.test(x.metodo || ""))).reduce((a, x) => a + enUSD(x.monto, x.moneda), 0);
    return Math.max(0, est - reg);
  };
  const crmPend = m === act ? st.factur.filter(x => x.mes === m).reduce((a, x) => a + Math.max(0, enUSD(Number(x.facturado) - Number(x.cobrado), x.moneda)), 0) : estimadoCRM();
  const P = { ing: fijPend(true, "personal"), gas: fijPend(false, "personal") + tarj("personal") };
  const A = { ing: fijPend(true, "agencia") + crmPend, gas: fijPend(false, "agencia") + tarj("agencia") };
  const faltaIng = L === "agencia" ? A.ing : L === "personal" ? P.ing + (A.ing - A.gas) : P.ing + A.ing;
  const faltaGas = L === "agencia" ? A.gas : L === "personal" ? P.gas : P.gas + A.gas;
  return { ...t, ingP: t.ing + faltaIng, gasP: t.gas + faltaGas, faltaIng, faltaGas };
}
function proximoPago(f, ref) {
  const [y, mo, d] = ref.split("-").map(Number), dia = Math.max(1, Math.min(31, Number(f.dia) || 1));
  const mk = (yy, mm) => new Date(yy, mm - 1, Math.min(dia, new Date(yy, mm, 0).getDate()));
  const base = new Date(y, mo - 1, d);
  if (f.frecuencia === "anual") { const mm = Number(f.mes) || 1; let c = mk(y, mm); if (c < base) c = mk(y + 1, mm); return c; }
  let c = mk(y, mo); if (c < base) c = mo === 12 ? mk(y + 1, 1) : mk(y, mo + 1); return c;
}
const fijoEnMes = (f, m) => !(f.pausa_meses || []).includes(Number(m.split("-")[1])) && (f.frecuencia !== "anual" || Number(f.mes) === Number(m.split("-")[1]));
const esCobro = (f) => f.tipo === "ingreso";
const pagadoEnMes = (f, m) => st.movs.some(x => x.fijo_id === f.id && mesDe(x.fecha) === m);
function delta(a, b) { if (!b) return ""; const p = Math.round((a - b) / b * 100); return `<small class="${p >= 0 ? "pos" : "neg"}">${p >= 0 ? "+" : ""}${p}%</small>`; }
function deltaGasto(a, b) { if (!b) return ""; const p = Math.round((a - b) / b * 100); return `<small class="${p <= 0 ? "pos" : "neg"}">${p >= 0 ? "+" : ""}${p}%</small>`; }

// ---------- render ----------
function render() {
  nav(); $("mLbl").textContent = nombreMes(st.mes);
  if (st.vista === "resumen") renderResumen();
  if (st.vista === "movimientos") renderMovs();
  if (st.vista === "fijos") { renderFijos($("tCobros"), true, true); renderFijos($("tFijos"), true); }
  if (st.vista === "deudas") renderDeudasVista();
  if (st.vista === "proyeccion") renderProy();
  if (st.vista === "ajustes") renderCfg();
}

function renderResumen() {
  const m = st.mes, actual = mesDe(hoy()), t = totales(m), p = totales(sumaMes(m, -1)), L = st.libro;
  const ET = { todo: ["Ingresos del mes", "Gastos del mes", "Te queda", "Pagos fijos del mes"],
    personal: ["Ingresos personales", "Gastos personales", "Te queda", "Pagos fijos personales"],
    agencia: ["Cobros de la agencia", "Gastos de la agencia", "Ganancia de la agencia", "Pagos fijos de la agencia"] }[L];
  ["kIngT", "kGasT", "kAhoT", "kFijT"].forEach((id, i) => ($(id).textContent = ET[i]));
  $("kIngT").title = L === "personal" && st.agencia ? `Incluye ${usd(t.ganancia)} que te dejó la agencia (cobros menos gastos de la agencia)` : "";
  const pv = previsto(m), pp = previsto(sumaMes(m, -1));
  $("kIng").innerHTML = esc(usd(pv.ingP)) + delta(pv.ingP, pp.ingP);
  $("kGas").innerHTML = esc(usd(pv.gasP)) + deltaGasto(pv.gasP, pp.gasP);
  $("kIngS").textContent = pv.faltaIng > 0.5 ? `cobrado ${usd(t.ing)} · falta ${usd(pv.faltaIng)}` : pv.faltaIng < -0.5 ? `la agencia todavía tiene pagos pendientes` : m >= actual ? "todo cobrado" : "";
  $("kGasS").textContent = pv.faltaGas > 0.5 ? `pagado ${usd(t.gas)} · falta ${usd(pv.faltaGas)}` : m >= actual ? "todo pagado" : "";
  const aho = t.ing - t.gas, ahoP = pv.ingP - pv.gasP;
  $("kAho").innerHTML = `<span class="${ahoP >= 0 ? "" : "neg"}">${esc(usd(ahoP))}</span>`;
  $("kAhoS").textContent = (pv.faltaIng || pv.faltaGas) ? `hoy, con lo ya movido: ${usd(aho)}` : "";
  const fm = st.fijos.filter(f => f.activo !== false && !esCobro(f) && enLibro(f) && fijoEnMes(f, m));
  const pend = fm.filter(f => !pagadoEnMes(f, m)).length;
  $("kFij").innerHTML = esc(usd(fm.reduce((s, f) => s + enUSD(f.monto, f.moneda), 0))) + (fm.length ? `<small class="muted">${pend} sin pagar</small>` : "");
  $("fijMeter").style.width = fm.length ? `${Math.round((fm.length - pend) / fm.length * 100)}%` : "0%";
  const ult = [-5, -4, -3, -2, -1, 0].map(k => totales(sumaMes(m, k)));
  spark("spIng", ult.map(t => t.ing), "#01B574"); spark("spGas", ult.map(t => t.gas), "#F0475B"); spark("spAho", ult.map(t => t.ing - t.gas), "#C9973B");

  // meta: cuenta lo que separás de verdad cada mes (botón «Separé el ahorro»)
  const MP = metaPlan(), { ini, fmeta, meta, antes, mesesTot, porMes } = MP, acum = MP.ahorrado, h = hoy();
  const pct = meta ? Math.max(0, Math.min(100, acum / meta * 100)) : 0;
  const transcurrido = antes ? 0 : Math.min(mesesTot, MP.mesesEntre(ini, actual) + Number(h.slice(8, 10)) / diasMes(actual));
  const esperado = meta * transcurrido / mesesTot;
  $("metaFill").style.width = pct.toFixed(1) + "%"; $("metaBar").setAttribute("aria-valuenow", pct.toFixed(0));
  $("metaPct").textContent = `${pct.toFixed(0)} %`;
  $("metaAcum").textContent = usdFijo(Math.max(0, acum)); $("metaDe").textContent = `de ${usdFijo(meta)} ahorrados`;
  $("metaFin").textContent = `${usdFijo(meta)} · ${mesCorto(fmeta)}`;
  $("metaFalta").textContent = usdFijo(Math.max(0, meta - acum));
  $("metaMes").textContent = usdFijo(porMes);
  const hoyEl = $("metaHoy"); hoyEl.hidden = antes || !meta; if (meta) hoyEl.style.left = Math.min(100, esperado / meta * 100).toFixed(1) + "%";
  $("metaRitmoT").textContent = antes ? "Empieza a contar" : "Deberías tener hoy";
  $("metaRitmo").textContent = antes ? ini.split("-").reverse().join("/") : usdFijo(esperado);
  const racha = rachaAhorro(), sepMes = ahorroDelMes(actual);
  $("metaSub").innerHTML = (antes ? esc(`Empieza el ${ini.split("-").reverse().join("/")}`)
    : `Hasta el ${esc(fmeta.split("-").reverse().join("/"))} · <b class="${acum >= esperado ? "pos" : "neg"}">${acum >= esperado ? "vas adelantado" : "vas atrás"}</b>`)
    + (racha ? ` · racha de <b>${racha} ${racha === 1 ? "mes" : "meses"}</b>` : "");
  const sug = Math.ceil(porMes / 10) * 10;
  $("habV").innerHTML = sepMes > 0 ? `<b class="pos">✓ ${esc(usdFijo(sepMes))} separados</b>`
    : st.ahorrando ? `<form class="pago" id="fAhorro"><input type="number" inputmode="decimal" min="1" step="any" value="${esc(sug)}" required aria-label="Cuánto separaste, en dólares"><button class="btn sm" type="submit">Guardar</button><button class="btn sm ghost" type="button" data-cancel aria-label="Cancelar">×</button></form>`
    : `<button class="btn sm" data-ahorro>Separé el ahorro</button>`;
  $("habT").textContent = sepMes > 0 ? `Ahorro de ${MESES[Number(actual.slice(5)) - 1]}` : `Este mes separá ${usdFijo(sug)}`;
  const margen = t.iA > 0 ? Math.round(t.ganancia / t.iA * 100) : 0;
  const porCobrar = L === "agencia" ? [] : st.fijos.filter(f => f.activo !== false && esCobro(f) && f.ambito === "personal" && fijoEnMes(f, m) && !pagadoEnMes(f, m));
  const falta = porCobrar.length ? ` Falta cobrar: ${porCobrar.map(f => `${f.nombre} (${usd(enUSD(f.monto, f.moneda))})`).join(", ")}.` : "";
  $("helloTxt").textContent = L === "agencia"
    ? (t.iA ? `Este mes la agencia cobró ${usd(t.iA)} y gastó ${usd(t.gA)}: te deja ${usd(t.ganancia)} (${margen} % de margen).` : `Todavía no hay cobros de clientes este mes. La agencia lleva gastados ${usd(t.gA)}.`)
    : L === "personal" && !st.agencia
    ? `Este mes entraron ${usd(t.iP)} y gastaste ${usd(t.gP)}: te quedan ${usd(aho)}.`
    : L === "personal"
    ? `La agencia te dejó ${usd(t.ganancia)}${t.iP ? ` y entraron ${usd(t.iP)} de lo tuyo` : ""}. En lo personal gastaste ${usd(t.gP)}: te quedan ${usd(aho)}.`
    : antes
    ? `Tu meta: ${usd(meta)} para el ${fmeta.split("-").reverse().join("/")}. Este mes cargá todo para ver en qué se va la plata.`
    : (aho >= porMes ? `Vas bien: este mes te quedan ${usd(aho)}, más de los ${usdFijo(porMes)} que necesitás.` : `Este mes te faltan ${usd(Math.max(0, porMes - aho))} para ir al ritmo de tu meta.`);
  if (falta) $("helloTxt").textContent += falta;

  // ritmo
  const n = diasMes(m), esAct = m === actual, dHoy = esAct ? Number(hoy().slice(8, 10)) : n;
  const prom = dHoy ? t.gas / dHoy : 0;
  $("rProm").textContent = usd(prom); $("rProy").textContent = esAct ? usd(prom * n) : usd(t.gas);
  $("ritmoSub").textContent = esAct ? `Día ${dHoy} de ${n}` : nombreMes(m);
  const tasa = t.ing > 0 ? Math.max(0, Math.min(100, aho / t.ing * 100)) : 0;
  $("ringArc").setAttribute("stroke-dashoffset", (390 * (1 - tasa / 100)).toFixed(1));
  $("ringVal").textContent = t.ing > 0 ? `${Math.round(aho / t.ing * 100)}%` : "—";
  $("ringT1").textContent = L === "agencia" ? "Margen" : "Ahorro"; $("ringT2").textContent = L === "agencia" ? "de lo cobrado" : "de lo que entró";

  renderEvo(m); renderDia(m); renderStats(m); renderFijos($("tFijosR"), false); renderIns(m); renderUltimos(m); renderDeudas($("deuR"), $("deuSubR"), false); renderTopes();
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
  const meses = Array.from({ length: 12 }, (_, i) => sumaMes(m, i - 11)), ts = meses.map(mm => totales(mm));
  if (!ts.some(t => t.ing || t.gas)) { $("gEvo").innerHTML = `<div class="empty">Cuando haya movimientos, acá ves la curva de ingresos y gastos.</div>`; return; }
  const W = 720, H = 300, l = 52, r = 10, top = 14, b = 30, max = Math.max(...ts.map(t => Math.max(t.ing, t.gas))) * 1.1 || 1;
  const x = (i) => l + (W - l - r) * i / 11, y = (v) => top + (H - top - b) * (1 - v / max);
  const pi = ts.map((t, i) => [x(i), y(t.ing)]), pg = ts.map((t, i) => [x(i), y(t.gas)]);
  let s = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Ingresos y gastos de los últimos 12 meses"><defs>
    <linearGradient id="aI" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#D4AF6A" stop-opacity=".7"/><stop offset="1" stop-color="#D4AF6A" stop-opacity="0"/></linearGradient>
    <linearGradient id="aG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3A332B" stop-opacity=".28"/><stop offset="1" stop-color="#3A332B" stop-opacity="0"/></linearGradient></defs>`;
  for (let k = 0; k <= 4; k++) { const v = max * k / 4, yy = y(v); s += `<line x1="${l}" x2="${W - r}" y1="${yy.toFixed(1)}" y2="${yy.toFixed(1)}" stroke="rgba(20,26,60,.08)" stroke-dasharray="4 4"/><text x="${l - 8}" y="${(yy + 4).toFixed(1)}" font-size="11" text-anchor="end">${esc(corto(aDisp(v)))}</text>`; }
  const base = y(0);
  s += `<path d="${curva(pi)} L${x(11)},${base} L${x(0)},${base} Z" fill="url(#aI)"/><path d="${curva(pi)}" fill="none" stroke="#B8862F" stroke-width="3"/>`;
  s += `<path d="${curva(pg)} L${x(11)},${base} L${x(0)},${base} Z" fill="url(#aG)"/><path d="${curva(pg)}" fill="none" stroke="#2B2620" stroke-width="2.5"/>`;
  meses.forEach((mm, i) => { s += `<text x="${x(i).toFixed(1)}" y="${H - 8}" font-size="11" text-anchor="middle">${esc(MESES[Number(mm.slice(5)) - 1].slice(0, 3))}</text>`;
    s += `<circle cx="${x(i).toFixed(1)}" cy="${y(ts[i].ing).toFixed(1)}" r="9" fill="transparent"><title>${esc(nombreMes(mm))}: ingresos ${esc(usd(ts[i].ing))} · gastos ${esc(usd(ts[i].gas))}</title></circle>`; });
  s += `<circle cx="${x(11)}" cy="${y(ts[11].ing).toFixed(1)}" r="4.5" fill="#fff" stroke="#B8862F" stroke-width="2.5"/>`;
  $("gEvo").innerHTML = s + "</svg>";
  const tot = ts.reduce((a, t) => ({ i: a.i + t.ing, g: a.g + t.gas }), { i: 0, g: 0 });
  $("evoSub").innerHTML = `<span style="color:#C9973B">●</span> Ingresos ${esc(usdC(tot.i))} · <span style="color:#2B2620">●</span> Gastos ${esc(usdC(tot.g))} en 12 meses`;
}
function renderDia(m) {
  const n = diasMes(m), vals = Array(n).fill(0);
  for (const x of delMes(m)) if (x.tipo === "gasto" && cuenta(x) && enLibro(x)) { const d = Number(String(x.fecha).slice(8, 10)); if (d >= 1 && d <= n) vals[d - 1] += enUSD(x.monto, x.moneda); }
  const tot = vals.reduce((a, v) => a + v, 0);
  const quien = st.libro === "agencia" ? "La agencia gastó" : st.libro === "personal" ? "En lo personal gastaste" : "Gastaste";
  $("diaSub").innerHTML = tot ? `${quien} <b>${esc(usd(tot))}</b> en ${esc(nombreMes(m))}` : `Sin gastos en ${esc(nombreMes(m))}`;
  const W = 520, H = 170, l = 34, b = 8, top = 10, max = Math.max(...vals) * 1.1 || 1, bw = (W - l) / n;
  let s = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Gasto por día">`;
  for (let k = 0; k <= 3; k++) { const v = max * k / 3, yy = top + (H - top - b) * (1 - k / 3); s += `<text x="${l - 6}" y="${(yy + 4).toFixed(1)}" font-size="10" text-anchor="end">${esc(corto(aDisp(v)))}</text>`; }
  vals.forEach((v, i) => { const h = (H - top - b) * v / max, xx = l + i * bw + bw / 2 - 2.5;
    s += `<rect x="${xx.toFixed(1)}" y="${(H - b - Math.max(2, h)).toFixed(1)}" width="5" height="${Math.max(2, h).toFixed(1)}" rx="2.5" fill="${v ? "#E9C97F" : "rgba(240,215,155,.14)"}"><title>${i + 1}: ${esc(usd(v))}</title></rect>`; });
  $("gDia").innerHTML = s + "</svg>";
}
function renderStats(m) {
  const t = totales(m), cat = (k) => delMes(m).filter(x => x.tipo === "gasto" && x.categoria === k).reduce((a, x) => a + enUSD(x.monto, x.moneda), 0);
  let items = [["Personal", t.gP, "P"], ["Agencia", t.gA, "A"], ["Uber y transporte", cat("Uber y transporte"), "U"], ["Comidas y delivery", cat("Comidas y delivery"), "C"]];
  if (st.libro !== "todo") {
    const mapa = new Map(); for (const x of delMes(m)) if (x.tipo === "gasto" && cuenta(x) && x.ambito === st.libro) mapa.set(x.categoria, (mapa.get(x.categoria) || 0) + enUSD(x.monto, x.moneda));
    items = [...mapa.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k, v]) => [k, v, k.charAt(0).toUpperCase()]);
    if (!items.length) { $("stats").innerHTML = `<div class="hint">Sin gastos ${st.libro === "agencia" ? "de la agencia" : "personales"} en ${esc(nombreMes(m))}.</div>`; return; }
  }
  const max = Math.max(...items.map(i => i[1])) || 1;
  $("stats").innerHTML = items.map(([n, v, k]) => `<div class="stat"><div class="h"><i>${esc(k)}</i>${esc(n)}</div><b class="num">${esc(usd(v))}</b><div class="pbar"><i style="width:${(v / max * 100).toFixed(0)}%"></i></div></div>`).join("");
}
function renderFijos(tb, completo, cobros = false) {
  const m = st.mes, ref = m === mesDe(hoy()) ? hoy() : m + "-01", h0 = new Date(hoy() + "T00:00:00");
  const fs = st.fijos.filter(f => f.activo !== false && enLibro(f) && esCobro(f) === cobros).map(f => ({ f, p: proximoPago(f, ref) })).sort((a, b) => a.p - b.p || enUSD(b.f.monto, b.f.moneda) - enUSD(a.f.monto, a.f.moneda));
  if (cobros) $("cardCobros").hidden = !fs.length;
  if (!completo) $("fijSub").textContent = fs.length ? `${fs.length} pagos · ${usd(fs.reduce((s, x) => s + enUSD(x.f.monto, x.f.moneda), 0))} por mes` : "Todavía no cargaste ninguno";
  const cols = completo ? 7 : 5;
  if (!fs.length) { tb.innerHTML = `<tr><td colspan="${cols}"><div class="empty">Cargá alquiler, luz, gas, tarjeta${st.agencia ? " y las apps de la agencia" : " y tus suscripciones"} en «Pagos fijos».</div></td></tr>`; return; }
  tb.innerHTML = (completo ? fs : fs.slice(0, 6)).map(({ f, p }) => {
    const dias = Math.round((p - h0) / 864e5), cuando = dias === 0 ? "hoy" : dias > 0 && dias <= 7 ? `en ${dias} d` : "";
    const cobro = esCobro(f);
    const est = !fijoEnMes(f, m) ? `<span class="chip">no toca</span>` : pagadoEnMes(f, m) ? `<span class="chip ok">${cobro ? "cobrado" : "pagado"}</span>` : `<button class="btn sm" data-pagar="${esc(f.id)}">${cobro ? "Cobré" : "Pagué"}</button>`;
    const amb = `<span class="chip ${esc(f.ambito)}">${f.ambito === "agencia" ? "Agencia" : "Personal"}</span>`;
    const prox = p.toLocaleDateString("es-AR", { day: "2-digit", month: "short" });
    const pausa = (f.pausa_meses || []).length ? ` · sin pago en ${f.pausa_meses.map(k => MESES[k - 1]).join(" y ")}` : "";
    const nombre = `<b>${esc(f.nombre)}</b>${f.calendar ? ` <span class="chip">en Calendar</span>` : ""}<div class="soft" style="font-size:.74rem">${esc(f.categoria)} · ${f.frecuencia === "anual" ? "anual" : "día " + esc(f.dia)}${esc(pausa)}</div><div class="solo-m monto-m"><b class="num ${cobro ? "pos" : ""}">${cobro ? "+" : ""}${esc(usd(enUSD(f.monto, f.moneda)))}</b>${f.moneda !== "USD" ? ` · ${esc(fmtNum(Number(f.monto), f.moneda))}` : ""}</div>`;
    const usdTxt = `${cobro ? "+" : ""}${usd(enUSD(f.monto, f.moneda))}`;
    if (!completo) return `<tr><td>${nombre}</td><td class="hide-m">${amb}</td><td style="white-space:nowrap">${esc(prox)}${cuando ? ` <span class="chip soon hide-m">${esc(cuando)}</span>` : ""}</td><td class="n num hide-m ${cobro ? "pos" : ""}">${esc(usdTxt)}</td><td>${est}</td></tr>`;
    const borrar = st.borrando === "f:" + f.id ? `<button class="btn sm danger" data-del-f="${esc(f.id)}">Borrar</button> <button class="btn sm ghost" data-cancel>No</button>` : `<button class="btn sm ghost" data-ask="f:${esc(f.id)}" aria-label="Borrar">×</button>`;
    return `<tr><td>${nombre}</td><td class="hide-m">${amb}</td><td style="white-space:nowrap">${esc(prox)}${cuando ? ` <span class="chip soon hide-m">${esc(cuando)}</span>` : ""}</td><td class="n num hide-m">${esc(fmtNum(Number(f.monto), f.moneda))}</td><td class="n num hide-m ${cobro ? "pos" : ""}">${esc(usdTxt)}</td><td>${est}</td><td style="white-space:nowrap">${borrar}</td></tr>`;
  }).join("");
}
// ---------- meta, hábito de ahorro y proyección ----------
const mesesEntreF = (a, b) => (Number(b.slice(0, 4)) - Number(a.slice(0, 4))) * 12 + Number(b.slice(5, 7)) - Number(a.slice(5, 7));
const esAhorro = (x) => x.tipo === "gasto" && x.categoria === "Ahorro";
const ahorroDelMes = (mm) => st.movs.reduce((a, x) => a + (esAhorro(x) && mesDe(x.fecha) === mm ? enUSD(x.monto, x.moneda) : 0), 0);
function metaPlan() {
  const c = st.cfg, ini = c.inicio || CFG_DEF.inicio, fmeta = c.fecha_meta || CFG_DEF.fecha_meta, meta = Number(c.meta) || 0, h = hoy(), antes = h < ini;
  const ahorrado = st.movs.reduce((a, x) => a + (esAhorro(x) && x.fecha >= ini && x.fecha <= h ? enUSD(x.monto, x.moneda) : 0), 0);
  const mesesTot = Math.max(1, mesesEntreF(ini, fmeta) + 1), mesesRest = Math.max(1, mesesEntreF(antes ? ini : h, fmeta) + 1);
  // lo de este mes ya separado no vuelve a pedirse
  const pendMes = antes ? 0 : ahorroDelMes(mesDe(h));
  return { ini, fmeta, meta, antes, ahorrado, mesesTot, mesesRest, porMes: Math.max(0, meta - ahorrado + pendMes) / mesesRest, mesesEntre: mesesEntreF };
}
function rachaAhorro() {
  const ini = mesDe(st.cfg.inicio || CFG_DEF.inicio); let mm = mesDe(hoy()), n = 0;
  if (!(ahorroDelMes(mm) > 0)) mm = sumaMes(mm, -1);          // si este mes todavía no separaste, la racha sigue viva hasta fin de mes
  while (mm >= ini && ahorroDelMes(mm) > 0) { n++; mm = sumaMes(mm, -1); }
  return n;
}
// Clientes del CRM: promedio facturado (cobrado + por cobrar) de los últimos 3 meses, incluido el actual
function estimadoCRM() {
  const ms = [0, -1, -2].map(k => sumaMes(mesDe(hoy()), k)).map(mm => st.factur.filter(x => x.mes === mm).reduce((a, x) => a + enUSD(x.facturado, x.moneda), 0)).filter(v => v > 0);
  return ms.length ? ms.reduce((a, v) => a + v, 0) / ms.length : 0;
}
function cambiosDelMes(mm, L) {
  const out = [], ok = (amb) => L === "todo" || amb === L;
  for (const d of st.deudas) {
    if (d.activo === false || !ok(d.ambito)) continue;
    const fs = st.pagosDeu.filter(p => p.deuda_id === d.id).map(p => p.fecha).sort();
    if (!fs.length) continue;
    if (mesDe(fs[fs.length - 1]) === mm) out.push(`termina ${d.nombre}`);
    else if (mesDe(fs[0]) === mm && !Number(d.pagado_inicial) && fs[0] > hoy()) out.push(`empieza ${d.nombre}`);
  }
  for (const f of st.fijos) {
    if (f.activo === false || f.frecuencia === "anual" || !ok(f.ambito) || !(f.pausa_meses || []).length) continue;
    const ahora = fijoEnMes(f, mm), antes = fijoEnMes(f, sumaMes(mm, -1));
    if (!ahora && antes) out.push(`sin ${f.nombre.toLowerCase()}`); else if (ahora && !antes) out.push(`vuelve ${f.nombre.toLowerCase()}`);
  }
  return out;
}
function renderProy() {
  const L = st.libro, ini = st.cfg.inicio || CFG_DEF.inicio; let m0 = mesDe(hoy()); if (mesDe(ini) > m0) m0 = mesDe(ini);
  const meses = Array.from({ length: 12 }, (_, i) => sumaMes(m0, i)), crm = estimadoCRM(), fij = st.fijos.filter(f => f.activo !== false);
  // préstamos que se pagan a mano (no tienen cuotas programadas): su cuota se proyecta hasta que terminen
  const manuales = st.deudas.filter(d => d.activo !== false && d.tipo !== "cuotas" && Number(d.cuota_monto) > 0).map(d => {
    const e = estadoDeuda(d), desde = mesDe(proximaFecha(d.dia_pago)), n = e.terminada ? 0 : Math.ceil(e.resta / e.cuotaMonto - 1e-9);
    return { d, e, desde, n };
  });
  const cuotaManual = (mm, amb) => manuales.reduce((a, { d, e, desde, n }) => { if (d.ambito !== amb) return a; const k = mesesEntreF(desde, mm);
    return a + (k >= 0 && k < n ? enUSD(Math.min(e.cuotaMonto, e.resta - k * e.cuotaMonto), d.moneda) : 0); }, 0);
  const lado = (mm, amb) => ({
    ent: fij.filter(f => esCobro(f) && f.ambito === amb && fijoEnMes(f, mm)).reduce((a, f) => a + enUSD(f.monto, f.moneda), 0) + (amb === "agencia" ? crm : 0),
    sal: fij.filter(f => !esCobro(f) && f.ambito === amb && fijoEnMes(f, mm)).reduce((a, f) => a + enUSD(f.monto, f.moneda), 0)
       + st.movs.reduce((a, x) => a + (x.deuda_id && x.tipo === "gasto" && x.ambito === amb && mesDe(x.fecha) === mm ? enUSD(x.monto, x.moneda) : 0), 0)
       + cuotaManual(mm, amb) });
  const MP = metaPlan(), conMeta = L !== "agencia";
  let acum = MP.ahorrado;
  const filas = meses.map((mm, i) => {
    const P = lado(mm, "personal"), A = lado(mm, "agencia");
    const ent = L === "agencia" ? A.ent : L === "personal" ? P.ent + (A.ent - A.sal) : P.ent + A.ent;
    const sal = L === "agencia" ? A.sal : L === "personal" ? P.sal : P.sal + A.sal;
    const queda = ent - sal, plan = conMeta && mm <= mesDe(MP.fmeta) ? Math.max(0, Math.ceil(MP.porMes / 10) * 10 - (i === 0 ? ahorroDelMes(mm) : 0)) : 0;
    acum += plan;
    return { mm, ent, sal, queda, plan, libre: queda - plan, acum, notas: cambiosDelMes(mm, L) };
  });
  const prom = filas.reduce((a, f) => a + f.libre, 0) / filas.length, neg = filas.filter(f => f.libre < 0).length;
  $("proySub").textContent = !st.agencia ? "Tus cobros y pagos fijos, cuotas y deudas · tarjetas por el resumen"
    : `${L === "personal" ? "Tu sueldo más lo que te deja la agencia" : L === "agencia" ? "Agencia" : "Todo junto"} · clientes estimados en ${usdFijo(crm)} por mes (promedio facturado de los últimos 3 meses) · tarjetas por el resumen`;
  const sinFecha = st.deudas.filter(d => d.activo !== false && (L === "todo" || d.ambito === L) && d.tipo !== "cuotas" && !(Number(d.cuota_monto) > 0) && !estadoDeuda(d).terminada);
  const resumen = conMeta
    ? `Si separás <b>${esc(usdFijo(Math.ceil(MP.porMes / 10) * 10))}</b> por mes, en ${esc(mesCorto(MP.fmeta))} llegás a tu meta de <b>${esc(usdFijo(MP.meta))}</b>${MP.ahorrado ? ` (ya llevás ${esc(usdFijo(MP.ahorrado))})` : ""}. Después de separar el ahorro te quedan libres en promedio <b class="${prom >= 0 ? "pos" : "neg"}">${esc(usd(prom))}</b> por mes${neg ? ` (ojo: ${neg} ${neg === 1 ? "mes da" : "meses dan"} negativo)` : ""}.`
    : `La agencia te deja en promedio <b class="${prom >= 0 ? "pos" : "neg"}">${esc(usd(prom))}</b> por mes.`;
  $("proy").innerHTML = `<p class="proy-res">${resumen}${sinFecha.length ? ` <span class="soft">Sin fecha en la cuenta: ${esc(sinFecha.map(d => `${d.nombre} ${fmtMon(estadoDeuda(d).resta, d.moneda)}`).join(", "))}.</span>` : ""}</p>
    <div class="tbl"><table class="proy"><thead><tr><th>Mes</th><th class="n">Entra</th><th class="n">Sale</th><th class="n">Queda</th>${conMeta ? `<th class="n">Para la meta</th><th class="n">Libre</th>` : ""}<th>Qué cambia</th></tr></thead><tbody>
    ${filas.map(f => `<tr><td style="white-space:nowrap;text-transform:capitalize">${esc(mesCorto(f.mm + "-01"))}</td><td class="n num pos">${esc(usd(f.ent))}</td><td class="n num">${esc(usd(f.sal))}</td><td class="n num ${f.queda < 0 ? "neg" : ""}"><b>${esc(usd(f.queda))}</b></td>${conMeta ? `<td class="n num">${esc(usd(f.plan))}</td><td class="n num ${f.libre < 0 ? "neg" : "pos"}"><b>${esc(usd(f.libre))}</b></td>` : ""}<td class="soft" style="font-size:.76rem">${esc(f.notas.join(" · "))}</td></tr>`).join("")}
    </tbody></table></div>
    <ul class="proy-m">${filas.map(f => `<li><div class="h"><b style="text-transform:capitalize">${esc(mesCorto(f.mm + "-01"))}</b><span class="${(conMeta ? f.libre : f.queda) < 0 ? "neg" : "pos"}">${conMeta ? "Libre" : "Queda"} <b>${esc(usd(conMeta ? f.libre : f.queda))}</b></span></div>
      <div class="d">Entra ${esc(usd(f.ent))} · Sale ${esc(usd(f.sal))}${conMeta ? ` · Queda ${esc(usd(f.queda))} · Meta ${esc(usd(f.plan))}` : ""}</div>${f.notas.length ? `<div class="n">${esc(f.notas.join(" · "))}</div>` : ""}</li>`).join("")}</ul>`;
}

// ---------- créditos y deudas ----------
function estadoDeuda(d) {
  const h = hoy(), pagos = st.pagosDeu.filter(p => p.deuda_id === d.id);
  const hechos = pagos.filter(p => p.fecha <= h), futuros = pagos.filter(p => p.fecha > h).sort((a, b) => a.fecha.localeCompare(b.fecha));
  const total = Number(d.monto_total) || 0, n = Number(d.cuotas) || 0, ini = Number(d.cuotas_iniciales) || 0;
  const pagado = Math.min(total, Number(d.pagado_inicial || 0) + hechos.reduce((a, p) => a + Number(p.monto || 0), 0));
  const resta = Math.max(0, total - pagado), terminada = resta < 0.01, pct = total ? pagado / total * 100 : 0;
  const cuotaMonto = Number(d.cuota_monto) || (n ? total / n : 0);
  const cuotaAct = !n ? 0 : d.tipo === "cuotas" ? Math.max(ini, ...hechos.map(p => Number(p.cuota) || 0)) : Math.min(n, ini + hechos.length);
  let fin = null;
  if (!terminada) {
    if (d.tipo === "cuotas") fin = futuros.length ? futuros[futuros.length - 1].fecha : null;
    else if (cuotaMonto > 0) fin = addMeses(proximaFecha(d.dia_pago), Math.max(0, Math.ceil(resta / cuotaMonto - 1e-9) - 1), Number(d.dia_pago) || undefined);
  }
  return { total, n, pagado, resta, terminada, pct, cuotaMonto, cuotaAct, fin, porMes: terminada ? 0 : (d.tipo === "cuotas" ? (futuros.length ? cuotaMonto : 0) : cuotaMonto) };
}
function tileDeuda(d, e, completo) {
  const quien = d.tipo === "cuotas" ? ((st.cfg.tarjetas || []).includes(d.acreedor) ? `Tarjeta ${d.acreedor}` : (d.acreedor || "En cuotas")) : (d.acreedor || TIPOS_DEU[d.tipo] || "");
  const det = [quien, e.n ? `${e.n} cuotas de ${fmtMon(e.cuotaMonto, d.moneda)}` : "sin cuotas"].filter(Boolean).join(" · ");
  const chip = e.terminada ? `<span class="chip ok">pagada</span>` : e.n ? `<span class="chip num">cuota ${e.cuotaAct} de ${e.n}</span>` : `<span class="chip num">${Math.round(e.pct)} %</span>`;
  const pie = e.terminada ? "Terminaste de pagarla." : [e.fin ? `Terminás en ${mesCorto(e.fin)}` : "Sin fecha de fin", e.porMes ? `${fmtMon(e.porMes, d.moneda)} por mes` : ""].filter(Boolean).join(" · ");
  let acc = "";
  if (completo) {
    const borrar = st.borrando === "d:" + d.id
      ? `<span><button class="btn sm danger" data-del-d="${esc(d.id)}">${d.tipo === "cuotas" ? "Borrar compra y cuotas" : "Borrar deuda"}</button> <button class="btn sm ghost" data-cancel>No</button></span>`
      : `<button class="btn sm ghost" data-ask="d:${esc(d.id)}" aria-label="Borrar ${esc(d.nombre)}">×</button>`;
    let izq = "";
    if (!e.terminada && d.tipo === "cuotas") izq = `<span class="deu-x">Se carga sola cada mes como gasto</span>`;
    else if (!e.terminada && st.pagando === d.id) {
      const sug = r2(Math.min(e.resta, e.cuotaMonto || e.resta));
      izq = `<form class="pago" data-deu="${esc(d.id)}"><input type="number" inputmode="decimal" step="0.01" min="0.01" value="${esc(sug)}" required aria-label="Monto del pago en ${esc(d.moneda)}"><button class="btn sm" type="submit">Guardar</button><button class="btn sm ghost" type="button" data-cancel aria-label="Cancelar">×</button></form>`;
    } else if (!e.terminada) izq = `<button class="btn sm" data-pagodeu="${esc(d.id)}">Registrar pago</button>`;
    acc = `<div class="deu-a">${izq}${st.pagando === d.id ? "" : borrar}</div>`;
  }
  return `<div class="deu"><div class="deu-h"><div><b>${esc(d.nombre)}</b><small>${esc(det)}</small></div>${chip}</div>
    <div class="hbar" role="progressbar" aria-label="Pagado de ${esc(d.nombre)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(e.pct)}"><i style="width:${e.pct.toFixed(1)}%"></i></div>
    <div class="deu-f"><span>Pagaste <b class="num">${esc(fmtMon(e.pagado, d.moneda))}</b></span><span class="q">Quedan <b class="num">${esc(fmtMon(e.resta, d.moneda))}</b></span></div>
    <div class="deu-x">${esc(pie)}</div>${acc}</div>`;
}
function renderDeudas(el, subEl, completo) {
  const xs = st.deudas.filter(d => d.activo !== false && enLibro(d)).map(d => ({ d, e: estadoDeuda(d) }));
  const vivas = xs.filter(x => !x.e.terminada).sort((a, b) => enUSD(b.e.resta, b.d.moneda) - enUSD(a.e.resta, a.d.moneda));
  const listas = xs.filter(x => x.e.terminada);
  const debes = vivas.reduce((a, x) => a + enUSD(x.e.resta, x.d.moneda), 0), porMes = vivas.reduce((a, x) => a + enUSD(x.e.porMes, x.d.moneda), 0);
  const fines = vivas.map(x => x.e.fin).filter(Boolean).sort(), sinFecha = vivas.length - fines.length;
  const libre = fines.length ? mesCorto(fines[fines.length - 1]) : vivas.length ? "sin fecha" : "—";
  subEl.textContent = vivas.length ? `${vivas.length} ${vivas.length === 1 ? "activa" : "activas"}${listas.length ? ` · ${listas.length} pagada${listas.length === 1 ? "" : "s"}` : ""}` : (listas.length ? "Todo pagado" : "Nada cargado todavía");
  if (!xs.length) { el.innerHTML = `<div class="empty">¿Tenés un préstamo, una compra en cuotas o le debés plata a alguien? ${completo ? "Cargalo abajo" : "Cargalo en «Deudas»"} y ves cuánto te falta para terminar.</div>`; return; }
  const tiles = (completo ? vivas.concat(listas) : vivas.slice(0, 4)).map(x => tileDeuda(x.d, x.e, completo)).join("");
  el.innerHTML = `<div class="deu-wrap"><div class="deu-sum"><div class="big"><span>Debés en total</span><b class="num">${esc(usd(debes))}</b></div>
    <div class="mini"><div><span>Pagás por mes</span><b class="num">${esc(usd(porMes))}</b></div>${invertido() ? `<div><span>Tenés invertido</span><b class="num">${esc(usd(invertido()))}</b></div>` : ""}<div><span>Quedás libre en</span><b>${esc(libre)}</b>${sinFecha && fines.length ? `<span>+ ${sinFecha} sin fecha de fin</span>` : ""}</div></div></div>
    <div class="deu-grid">${tiles || `<div class="empty">No te queda nada por pagar.</div>`}</div></div>`;
}
const invertido = () => st.inversiones.filter(x => x.activo !== false && enLibro(x)).reduce((a, x) => a + enUSD(x.monto, x.moneda), 0);
function renderInversiones() {
  const xs = st.inversiones.filter(x => x.activo !== false);
  if (!$("iMon").options.length) llenar($("iMon"), MONEDAS, "USD");
  $("invLista").innerHTML = xs.length ? `<ul class="topes-lista">${xs.map(x => {
    const borrar = st.borrando === "i:" + x.id ? `<button class="btn sm danger" data-del-inv="${esc(x.id)}">Borrar</button> <button class="btn sm ghost" data-cancel>No</button>` : `<button class="btn sm ghost" data-ask="i:${esc(x.id)}" aria-label="Borrar ${esc(x.nombre)}">×</button>`;
    return `<li><div><b>${esc(x.nombre)}</b><div class="m">${esc(ddmm(x.fecha))}/${esc(String(x.fecha).slice(0, 4))}${x.notas ? " · " + esc(x.notas) : ""}</div></div><span style="white-space:nowrap"><b class="num">${esc(fmtMon(Number(x.monto), x.moneda))}</b> ${borrar}</span></li>`; }).join("")}</ul>`
    : `<div class="hint">Todavía no anotaste inversiones.</div>`;
}
function renderDeudasVista() {
  renderDeudas($("deuV"), $("deuSub"), true); renderInversiones();
  if (!$("dMon").options.length) { llenar($("dMon"), MONEDAS, "ARS"); formDeuda(); }
  llenar($("dTar"), st.cfg.tarjetas || TARJETAS_DEF, $("dTar").value);
}
function formDeuda() {
  const cuotas = $("dTipo").value === "cuotas", n = Number($("dCuotas").value) || 0;
  $("dTarL").hidden = !cuotas; $("dAcrL").hidden = cuotas; $("dCatL").hidden = !cuotas; $("dCuotas").required = cuotas;
  llenar($("dCat"), CATS.gasto[$("dAmb").value], $("dCat").value);
  $("dYaT").textContent = n ? "Cuotas ya pagadas" : "Ya pagaste (monto)";
  const tot = Number($("dTotal").value) || 0;
  $("dHint").textContent = (n && tot ? `${n} cuotas de ${usd(enUSD(tot / n, $("dMon").value))}. ` : "") + (cuotas ? "Las cuotas que faltan se cargan solas como gasto, una por mes." : "Si tiene interés, poné el total que vas a pagar (cuota × cantidad).");
}
["dTipo", "dCuotas", "dTotal", "dMon", "dAmb"].forEach(id => $(id).addEventListener("input", formDeuda));

// ---------- topes de gasto ----------
const enMon = (n, mo) => fmtMon(n, mo);
const deUSD = (v, mo) => v / Number((st.cfg.tasas || {})[mo] ?? CFG_DEF.tasas[mo] ?? 1);
const ORDEN_P = { semanal: 0, quincenal: 1, mensual: 2 };
const pad2 = (x) => String(x).padStart(2, "0");
const diasEntre = (a, b) => Math.round((new Date(b + "T12:00:00") - new Date(a + "T12:00:00")) / 864e5);
function periodoDe(p, ref = hoy()) {
  const [y, m, d] = ref.split("-").map(Number), ym = ref.slice(0, 7), n = diasMes(ym);
  if (p === "semanal") { // de lunes a domingo
    const dow = (new Date(y, m - 1, d).getDay() + 6) % 7, ini = isoD(new Date(y, m - 1, d - dow)), fin = isoD(new Date(y, m - 1, d - dow + 6));
    return { ini, fin, txt: `semana del ${ddmm(ini)} al ${ddmm(fin)}`, corto: "esta semana", chip: "semana" };
  }
  if (p === "quincenal") { const a = d <= 15 ? 1 : 16, b = d <= 15 ? 15 : n; return { ini: `${ym}-${pad2(a)}`, fin: `${ym}-${pad2(b)}`, txt: `${d <= 15 ? "1.ª" : "2.ª"} quincena de ${MESES[m - 1]}`, corto: "esta quincena", chip: "quincena" }; }
  return { ini: `${ym}-01`, fin: `${ym}-${pad2(n)}`, txt: nombreMes(ym), corto: "este mes", chip: "mes" };
}
// «solo el día a día» (solo para topes de todo un lado): sin alquiler y servicios, pagos fijos, cuotas viejas ni pagos de deudas
function cuentaEnTope(x, t) {
  if (x.tipo !== "gasto" || !cuenta(x) || x.ambito !== t.ambito) return false;
  if (t.categoria) return x.categoria === t.categoria;
  if (t.solo_dia_a_dia === false) return true;
  return !(FIJAS.has(x.categoria) || x.fijo_id || x.origen === "fijo" || x.origen === "deuda" || x.categoria === "Créditos y préstamos" || (x.origen === "cuota" && Number(x.cuota) > 1));
}
function estadoTope(t) {
  const P = periodoDe(t.periodo), h = hoy();
  const usdG = st.movs.reduce((a, x) => a + (x.fecha >= P.ini && x.fecha <= P.fin && cuentaEnTope(x, t) ? enUSD(x.monto, x.moneda) : 0), 0);
  const lim = Number(t.monto) || 0, g = deUSD(usdG, t.moneda), resta = lim - g, pct = lim ? g / lim * 100 : 0;
  const total = diasEntre(P.ini, P.fin) + 1, quedan = Math.max(1, diasEntre(h, P.fin) + 1), paso = (total - quedan + 1) / total * 100;
  return { P, lim, g, resta, pct, quedan, paso, cls: pct >= 100 ? "over" : pct >= 80 ? "warn" : "" };
}
const nombreTope = (t) => t.categoria || (t.ambito === "agencia" ? "Todo lo de la agencia" : "Todo lo personal");
function tileTope(t) {
  const e = estadoTope(t), mo = t.moneda;
  const pie = e.resta >= 0
    ? `Te quedan <b>${esc(enMon(e.resta, mo))}</b> · ${e.quedan === 1 ? "último día" : `${e.quedan} días`}${e.quedan > 1 ? ` · ${esc(enMon(e.resta / e.quedan, mo))} por día` : ""}`
    : `<b>Te pasaste ${esc(enMon(-e.resta, mo))}</b>${e.quedan > 1 ? ` · faltan ${e.quedan} días` : ""}`;
  return `<div class="tope ${e.cls}"><div class="tope-h"><div><b><i class="pt ${t.ambito === "agencia" ? "age" : "per"}" aria-hidden="true"></i>${esc(nombreTope(t))}</b><small>${esc(e.P.txt)}</small></div><span class="chip">${esc(e.P.chip)}</span></div>
    <div class="v num">${esc(enMon(e.g, mo))} <span>de ${esc(enMon(e.lim, mo))}</span></div>
    <div class="hbar" role="progressbar" aria-label="${esc(nombreTope(t))}, ${esc(e.P.corto)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(Math.min(100, e.pct))}"><i style="width:${Math.min(100, e.pct).toFixed(1)}%"></i><span class="hoy" style="left:${e.paso.toFixed(1)}%" title="Cuánto del período ya pasó"></span></div>
    <div class="tope-x">${pie}</div></div>`;
}
function renderTopes() {
  const ts = st.topes.filter(enLibro).sort((a, b) => ORDEN_P[a.periodo] - ORDEN_P[b.periodo] || estadoTope(b).pct - estadoTope(a).pct);
  $("topesSub").textContent = ts.length ? `Hoy ${ddmm(hoy())} · la rayita marca cuánto del período ya pasó` : "Cuánto te permitís gastar por semana, quincena o mes";
  $("topesR").innerHTML = ts.length ? `<div class="topes-grid">${ts.map(tileTope).join("")}</div>`
    : `<div class="empty">${st.topes.length ? `No tenés topes ${st.libro === "agencia" ? "de la agencia" : "personales"}.` : "Todavía no pusiste topes."} Por ejemplo: 200 € por semana en lo personal o 60 € por semana en comidas. <button class="btn sm" data-go="ajustes" style="margin-left:6px">Poner topes</button></div>`;
}
function renderTopesLista() {
  const g = new Map(); for (const t of st.topes) { const k = `${t.ambito}|${t.categoria}`; if (!g.has(k)) g.set(k, []); g.get(k).push(t); }
  if (!g.size) { $("topesLista").innerHTML = `<div class="hint">Todavía no pusiste ningún tope.</div>`; return; }
  $("topesLista").innerHTML = `<ul class="topes-lista">${[...g.entries()].map(([k, ts]) => {
    const t0 = ts[0], v = (p) => { const t = ts.find(x => x.periodo === p); return t ? enMon(t.monto, t.moneda) : "—"; };
    const borrar = st.borrando === "t:" + k ? `<button class="btn sm danger" data-del-tope="${esc(k)}">Borrar</button> <button class="btn sm ghost" data-cancel>No</button>` : `<button class="btn sm ghost" data-ask="t:${esc(k)}" aria-label="Borrar topes de ${esc(nombreTope(t0))}">×</button>`;
    return `<li><div><b><i class="pt ${t0.ambito === "agencia" ? "age" : "per"}" aria-hidden="true"></i>${esc(nombreTope(t0))}</b><div class="m">Semana <b>${esc(v("semanal"))}</b> · Quincena <b>${esc(v("quincenal"))}</b> · Mes <b>${esc(v("mensual"))}</b>${!t0.categoria && t0.solo_dia_a_dia !== false ? " · solo día a día" : ""}</div></div>
      <span style="white-space:nowrap"><button class="btn sm ghost" data-edit-tope="${esc(k)}">Editar</button> ${borrar}</span></li>`; }).join("")}</ul>`;
}
function formTope(prefill) {
  const amb = $("tAmb").value, prev = $("tCat").value;
  $("tCat").innerHTML = `<option value="">${amb === "agencia" ? "Todo lo de la agencia" : "Todo lo personal"}</option>` + CATS.gasto[amb].filter(c => !NO_SUMA.has(c)).map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join("");
  if ([...$("tCat").options].some(o => o.value === prev)) $("tCat").value = prev;
  const cat = $("tCat").value; $("tSolo").closest("label").hidden = !!cat;
  if (prefill) {
    const ex = (p) => st.topes.find(t => t.ambito === amb && t.categoria === cat && t.periodo === p);
    $("tSem").value = ex("semanal")?.monto ?? ""; $("tQui").value = ex("quincenal")?.monto ?? ""; $("tMes").value = ex("mensual")?.monto ?? "";
    const una = ex("semanal") || ex("quincenal") || ex("mensual"); if (una) { $("tMon").value = una.moneda; $("tSolo").value = una.solo_dia_a_dia === false ? "0" : "1"; }
  }
  sugerenciaTope();
}
function sugerenciaTope() {
  const t = { ambito: $("tAmb").value, categoria: $("tCat").value, solo_dia_a_dia: $("tSolo").value === "1" }, mo = $("tMon").value;
  const meses = [1, 2, 3].map(k => sumaMes(mesDe(hoy()), -k)).map(mm => st.movs.reduce((a, x) => a + (mesDe(x.fecha) === mm && cuentaEnTope(x, t) ? enUSD(x.monto, x.moneda) : 0), 0)).filter(v => v > 0);
  if (!meses.length) { $("tSug").textContent = "Cuando tengas un par de meses cargados, acá te muestro tu promedio para que elijas un tope realista."; return; }
  const prom = deUSD(meses.reduce((a, v) => a + v, 0) / meses.length, mo);
  $("tSug").textContent = `Referencia: en los últimos meses gastaste en promedio ${enMon(prom, mo)} por mes en esto (≈ ${enMon(prom / 2, mo)} por quincena y ${enMon(prom * 12 / 52, mo)} por semana).`;
}
$("tAmb").addEventListener("change", () => formTope(true)); $("tCat").addEventListener("change", () => formTope(true));
["tSolo", "tMon"].forEach(id => $(id).addEventListener("change", sugerenciaTope));
$("fTope").addEventListener("submit", async (e) => {
  e.preventDefault();
  const amb = $("tAmb").value, cat = $("tCat").value, mo = $("tMon").value, solo = cat ? true : $("tSolo").value === "1";
  const vals = { semanal: Number($("tSem").value) || 0, quincenal: Number($("tQui").value) || 0, mensual: Number($("tMes").value) || 0 };
  const poner = Object.entries(vals).filter(([, v]) => v > 0).map(([periodo, monto]) => ({ user_id: st.user.id, ambito: amb, categoria: cat, periodo, monto, moneda: mo, solo_dia_a_dia: solo }));
  const sacar = Object.keys(vals).filter(p => !(vals[p] > 0) && st.topes.some(t => t.ambito === amb && t.categoria === cat && t.periodo === p));
  if (!poner.length && !sacar.length) { toast("Poné al menos un monto."); return; }
  if (poner.length) { const { error } = await sb.from("fin_topes").upsert(poner, { onConflict: "user_id,ambito,categoria,periodo" }); if (error) { toast("No se pudieron guardar los topes."); return; } }
  if (sacar.length) await sb.from("fin_topes").delete().eq("ambito", amb).eq("categoria", cat).in("periodo", sacar);
  toast(`Topes guardados: ${amb === "agencia" ? "agencia" : "personal"} · ${cat || "todo"}`); await cargar(); formTope(true);
});
// después de cargar un gasto: cómo quedó el tope más ajustado que lo incluye
function avisoTope(row) {
  if (row.tipo !== "gasto") return "";
  const rel = st.topes.filter(t => { const P = periodoDe(t.periodo); return row.fecha >= P.ini && row.fecha <= P.fin && cuentaEnTope(row, t); }).map(t => ({ t, e: estadoTope(t) })).sort((a, b) => b.e.pct - a.e.pct);
  if (!rel.length) return "";
  const { t, e } = rel[0], quien = t.categoria ? `en ${t.categoria}` : "";
  return e.resta >= 0 ? ` · ${e.P.corto.charAt(0).toUpperCase() + e.P.corto.slice(1)} ${quien ? quien + " " : ""}te quedan ${enMon(e.resta, t.moneda)} de ${enMon(e.lim, t.moneda)}`
    : ` · Te pasaste ${enMon(-e.resta, t.moneda)} del tope de ${e.P.corto}${quien ? " " + quien : ""}`;
}

function renderIns(m) {
  $("insSub").textContent = `${nombreMes(m)} · ${st.libro === "agencia" ? "gastos de la agencia" : "gastos personales"}`;
  const prevs = [1, 2, 3].map(k => sumaMes(m, -k)), conDatos = prevs.filter(pm => delMes(pm).some(x => x.tipo === "gasto")).length;
  const cur = new Map(), avg = new Map();
  const amb = st.libro === "agencia" ? "agencia" : "personal";
  for (const x of delMes(m)) if (x.tipo === "gasto" && cuenta(x) && x.ambito === amb && !FIJAS.has(x.categoria)) cur.set(x.categoria, (cur.get(x.categoria) || 0) + enUSD(x.monto, x.moneda));
  for (const pm of prevs) for (const x of delMes(pm)) if (x.tipo === "gasto" && cuenta(x) && x.ambito === amb) avg.set(x.categoria, (avg.get(x.categoria) || 0) + enUSD(x.monto, x.moneda) / Math.max(1, conDatos));
  const vars = [...cur.entries()].sort((a, b) => b[1] - a[1]), out = [];
  for (const [k, v] of vars) { const a = avg.get(k) || 0; if (conDatos && a > 0 && v > a * 1.15 && v - a > 20) out.push(`<li><span>${esc(k)}</span><span class="chip soon">+${esc(usd(v - a))} vs. tu promedio</span></li>`); }
  for (const [k, v] of vars.slice(0, 3)) if (!out.some(o => o.includes(`<span>${esc(k)}</span>`))) out.push(`<li><span>${esc(k)}</span><b class="num">${esc(usd(v))}</b></li>`);
  if (vars.length) out.push(`<li><span class="muted">Bajando un 20 % «${esc(vars[0][0])}» guardás ${esc(usd(vars[0][1] * 0.2 * 12))} al año.</span></li>`);
  $("ins").innerHTML = out.length ? out.slice(0, 5).join("") : `<li><span class="muted">${st.libro === "agencia" ? "Cargá los gastos de la agencia" : "Cargá Uber, comidas, súper y salidas"}: acá aparecen las categorías que más crecen.</span></li>`;
}
function renderUltimos(m) {
  const xs = delMes(m).filter(enLibro).sort((a, b) => (b.fecha || "").localeCompare(a.fecha || "") || String(b.creado || "").localeCompare(String(a.creado || ""))).slice(0, 6);
  $("ultimos").innerHTML = xs.length ? xs.map(x => { const ing = x.tipo === "ingreso";
    return `<li><span class="dot" style="background:${ing ? "rgba(1,181,116,.18);color:#01B574" : "rgba(43,38,32,.1);color:#2B2620"}">${ing ? "+" : "−"}</span>
      <div style="min-width:0"><b>${esc(x.concepto || x.categoria)}</b><span><i class="pt ${x.ambito === "agencia" ? "age" : "per"}" aria-hidden="true"></i>${esc(ddmm(x.fecha))} · ${esc(x.categoria)}</span></div><b class="num ${ing ? "pos" : ""}">${ing ? "+" : "−"}${esc(usd(enUSD(x.monto, x.moneda)))}</b></li>`; }).join("")
    : `<li><span></span><span class="muted">Sin movimientos en ${esc(nombreMes(m))}.</span><span></span></li>`;
}
function renderMovs() {
  let xs = delMes(st.mes);
  xs = xs.filter(enLibro);
  if (st.q) { const q = st.q.toLowerCase(); xs = xs.filter(x => `${x.concepto || ""} ${x.categoria || ""}`.toLowerCase().includes(q)); }
  xs.sort((a, b) => (b.fecha || "").localeCompare(a.fecha || "") || String(b.creado || "").localeCompare(String(a.creado || "")));
  const t = totales(st.mes), ent = st.libro === "personal" ? t.iP : t.ing;
  $("movSub").textContent = `${xs.length} movimientos · entra ${usd(ent)} · sale ${usd(t.gas)}${st.libro === "personal" && st.agencia ? " (sin contar lo que te deja la agencia)" : ""}`;
  $("tMovs").innerHTML = xs.length ? xs.map(x => { const ing = x.tipo === "ingreso", crm = x.origen === "crm";
    const enCuotas = x.cuotas > 1 && x.deuda_id && st.deudas.some(d => d.id === x.deuda_id && d.tipo === "cuotas");
    const borrar = crm ? `<span class="chip">CRM</span>` : st.borrando === "m:" + x.id
      ? (enCuotas ? `<button class="btn sm danger" data-del-d="${esc(x.deuda_id)}">Borrar las ${esc(x.cuotas)} cuotas</button>` : `<button class="btn sm danger" data-del-m="${esc(x.id)}">Borrar</button>`) + ` <button class="btn sm ghost" data-cancel>No</button>`
      : `<button class="btn sm ghost mover" data-mover="${esc(x.id)}" title="Si lo cargaste en el lado equivocado" aria-label="Pasar a ${x.ambito === "agencia" ? "personal" : "agencia"}"><span class="hide-m">Pasar a ${x.ambito === "agencia" ? "personal" : "agencia"}</span><span class="solo-m" aria-hidden="true">⇄</span></button> <button class="btn sm ghost" data-ask="m:${esc(x.id)}" aria-label="Borrar">×</button>`;
    return `<tr><td class="num">${esc(ddmm(x.fecha))}</td><td>${esc(x.concepto || x.categoria)}<div class="soft" style="font-size:.74rem">${esc(metodoTxt(x) || (crm ? "Facturas cobradas" : ""))}<span class="solo-m">${metodoTxt(x) || crm ? " · " : ""}${esc(x.categoria)}${x.moneda !== "USD" ? " · " + esc(fmtNum(Number(x.monto), x.moneda)) : ""}</span></div></td>
      <td class="hide-m"><span class="chip ${esc(x.ambito)}">${esc(x.categoria)}</span>${NO_SUMA.has(x.categoria) ? ` <span class="chip">no suma</span>` : ""}</td>
      <td class="n num hide-m">${esc(fmtNum(Number(x.monto), x.moneda))}</td><td class="n num ${ing ? "pos" : ""}">${ing ? "+" : "−"}${esc(usd(enUSD(x.monto, x.moneda)))}</td><td style="white-space:nowrap">${borrar}</td></tr>`; }).join("")
    : `<tr><td colspan="6"><div class="empty">Sin movimientos en ${esc(nombreMes(st.mes))}${st.libro !== "todo" ? (st.libro === "agencia" ? " de la agencia" : " personales") : ""}${st.q ? " con esta búsqueda" : ""}. Tocá «+» para cargar.</div></td></tr>`;
}
function renderCfg() {
  const c = st.cfg;
  if (!$("tMon").options.length) { llenar($("tMon"), MONEDAS, "ARS"); if (st.libro === "agencia") $("tAmb").value = "agencia"; formTope(true); }
  renderTopesLista();
  $("tarList").innerHTML = (c.tarjetas || []).map(t => `<span>${esc(t)}<button type="button" data-tar-del="${esc(t)}" aria-label="Quitar ${esc(t)}">×</button></span>`).join("") || `<span class="muted">Sin tarjetas cargadas</span>`; $("cMeta").value = c.meta ?? ""; $("cFecha").value = c.fecha_meta || ""; $("cInicio").value = c.inicio || "";
  $("cTasas").innerHTML = MONEDAS.filter(m => m !== "USD").map(m => `<label>1 ${esc(m)} =<input id="tasa_${esc(m)}" type="number" step="any" min="0" value="${esc((c.tasas || {})[m] ?? "")}"></label>`).join("");
}

// ---------- cargar gasto / ingreso ----------
function llenar(sel, items, val) { sel.innerHTML = items.map(i => `<option value="${esc(i)}">${esc(i)}</option>`).join(""); if (val && items.includes(val)) sel.value = val; }
// «Cómo pagaste»: cada tarjeta por su nombre (Tarjeta Visa, Tarjeta Sra. Ana María…) y después los otros medios
function metodos() {
  const tars = st.cfg.tarjetas || TARJETAS_DEF, prev = $("mMetodo").value || ls.get("mf-metodo") || "";
  $("mMetodo").innerHTML = `<optgroup label="Tarjetas">${tars.map(t => `<option value="tar:${esc(t)}">Tarjeta ${esc(t)}</option>`).join("")}</optgroup><optgroup label="Otros">${OTROS_PAGOS.map(o => `<option value="${esc(o)}">${esc(o)}</option>`).join("")}</optgroup>`;
  if ([...$("mMetodo").options].some(o => o.value === prev)) $("mMetodo").value = prev;
  const fprev = $("fMetodo").value;
  llenar($("fMetodo"), tars.map(t => `Tarjeta ${t}`).concat(["Débito", "Domiciliación", "Transferencia", "PayPal"]), fprev);
}
$("mCuotas").innerHTML = CUOTAS_OPC.map(k => `<option value="${k}">${k === 1 ? "1 pago (sin cuotas)" : k + " cuotas"}</option>`).join("");
const tarjetaSel = () => { const v = $("mMetodo").value || ""; return v.startsWith("tar:") ? v.slice(4) : null; };
llenar($("mMoneda"), MONEDAS, "ARS"); llenar($("fMoneda"), MONEDAS, "ARS");
$("fMes").innerHTML = MESES.map((m, i) => `<option value="${i + 1}">${m}</option>`).join("");
const refrescarFCat = () => llenar($("fCat"), CATS[$("fTipo").value === "ingreso" ? "ingreso" : "gasto"][$("fAmbito").value], $("fCat").value); refrescarFCat();
$("fAmbito").onchange = refrescarFCat; $("fTipo").onchange = refrescarFCat; $("fFrec").onchange = () => ($("fMesL").hidden = $("fFrec").value !== "anual");

function chips() {
  const lista = CATS[st.tipo][st.ambito]; if (!lista.includes(st.cat)) st.cat = lista[0];
  $("mChips").innerHTML = lista.map(c => `<button type="button" data-cat="${esc(c)}" aria-pressed="${c === st.cat}">${esc(c)}</button>`).join("");
  $("tGas").setAttribute("aria-pressed", st.tipo === "gasto"); $("tIng").setAttribute("aria-pressed", st.tipo === "ingreso");
  $("aPer").setAttribute("aria-pressed", st.ambito === "personal"); $("aAge").setAttribute("aria-pressed", st.ambito === "agencia");
  hint();
}
function hint() {
  const v = $("mMonto").value, conCuotas = st.tipo === "gasto" && !!tarjetaSel(), k = conCuotas ? Number($("mCuotas").value) || 1 : 1;
  $("mCuotasRow").hidden = !conCuotas;
  $("mCuotasHint").textContent = k > 1 ? (v ? `${k} cuotas de ${usd(enUSD(v / k, $("mMoneda").value))}, una por mes` : "Poné arriba el total de la compra") : "";
  const conv = $("mMoneda").value !== disp();
  $("mHint").textContent = v ? `${conv ? `= ${usd(enUSD(v, $("mMoneda").value))}` : fmtMon(Number(v), $("mMoneda").value)}${k > 1 ? " en total" : ""}${NO_SUMA.has(st.cat) ? " · el resumen de la tarjeta no suma (sus consumos ya están cargados)" : ""}` : (k > 1 ? "Monto total de la compra" : disp() === "ARS" ? "Lo ves en pesos; si cargás en otra moneda, se pasa sola" : "Se pasa solo a dólares");
  const de = st.ambito === "agencia" ? "de la agencia" : "personal";
  $("mGuardar").textContent = st.tipo === "ingreso" ? `Guardar ingreso ${de}` : k > 1 ? `Guardar compra ${de} en ${k} cuotas` : `Guardar gasto ${de}`;
  $("sheetT").textContent = `${st.tipo === "ingreso" ? "Nuevo ingreso" : "Nuevo gasto"} ${de}`;
  $("sheet").dataset.amb = st.ambito;
}
const monedaDe = (amb) => ls.get("mf-moneda-" + amb) || (amb === "agencia" ? "USD" : "ARS");
function abrir() { $("mFecha").value = hoy(); $("mCuotas").value = "1"; st.ambito = st.libro === "agencia" ? "agencia" : "personal"; $("mMoneda").value = monedaDe(st.ambito); chips(); $("sheet").hidden = false; $("sheetBg").hidden = false; setTimeout(() => $("mMonto").focus(), 50); }
function cerrar() { $("sheet").hidden = true; $("sheetBg").hidden = true; }
$("tGas").onclick = () => { st.tipo = "gasto"; chips(); }; $("tIng").onclick = () => { st.tipo = "ingreso"; chips(); };
$("aPer").onclick = () => { st.ambito = "personal"; $("mMoneda").value = monedaDe("personal"); chips(); }; $("aAge").onclick = () => { st.ambito = "agencia"; $("mMoneda").value = monedaDe("agencia"); chips(); };
$("mMoneda").addEventListener("change", () => ls.set("mf-moneda-" + st.ambito, $("mMoneda").value));
$("mChips").addEventListener("click", e => { const b = e.target.closest("[data-cat]"); if (b) { st.cat = b.dataset.cat; chips(); } });
["mMonto", "mMoneda", "mMetodo", "mCuotas"].forEach(id => $(id).addEventListener("input", hint));
$("mMetodo").addEventListener("change", () => ls.set("mf-metodo", $("mMetodo").value));
$("sheetX").onclick = cerrar; $("sheetBg").onclick = cerrar;
document.addEventListener("keydown", e => { if (e.key === "Escape" && !$("sheet").hidden) cerrar(); });

$("fMov").addEventListener("submit", async (e) => {
  e.preventDefault(); const monto = Number($("mMonto").value); if (!(monto > 0)) { toast("Poné un monto mayor que cero."); return; }
  const tarjeta = tarjetaSel(), k = st.tipo === "gasto" && tarjeta ? Number($("mCuotas").value) || 1 : 1;
  const fecha = $("mFecha").value || hoy(), moneda = $("mMoneda").value, concepto = $("mConcepto").value.trim() || null;
  const row = { tipo: st.tipo, ambito: st.ambito, categoria: st.cat, concepto, monto, moneda, fecha, metodo: tarjeta ? "Tarjeta" : $("mMetodo").value, tarjeta, origen: "manual" };
  $("mGuardar").disabled = true;
  let error;
  if (k > 1) {
    // compra en cuotas: queda como deuda y se carga una cuota por mes (la primera en la fecha de compra)
    const nombre = concepto || st.cat, c = r2(monto / k);
    const r = await sb.from("fin_deudas").insert({ nombre, tipo: "cuotas", acreedor: tarjeta, ambito: st.ambito, categoria: st.cat, monto_total: monto, moneda, cuotas: k, cuota_monto: c, dia_pago: Number(fecha.slice(8, 10)), inicio: fecha }).select("id").single();
    error = r.error;
    if (!error) {
      const filas = Array.from({ length: k }, (_, i) => ({ ...row, concepto: `${nombre} (cuota ${i + 1}/${k})`, monto: i === k - 1 ? r2(monto - c * (k - 1)) : c, fecha: addMeses(fecha, i), origen: "cuota", deuda_id: r.data.id, cuota: i + 1, cuotas: k }));
      ({ error } = await sb.from("fin_movimientos").insert(filas));
      if (error) await sb.from("fin_deudas").delete().eq("id", r.data.id);
    }
  } else ({ error } = await sb.from("fin_movimientos").insert(row));
  $("mGuardar").disabled = false;
  if (error) { toast("No se pudo guardar. Revisá la conexión."); return; }
  $("mMonto").value = ""; $("mConcepto").value = ""; cerrar();
  const msg = k > 1 ? `Compra en ${k} cuotas guardada: ${usd(enUSD(monto / k, moneda))} por mes` : `${st.tipo === "gasto" ? "Gasto" : "Ingreso"} guardado: ${usd(enUSD(monto, moneda))}`;
  toast(msg); st.mes = mesDe(fecha); await cargar();
  const av = avisoTope({ ...row, monto: k > 1 ? monto / k : monto, cuota: k > 1 ? 1 : null, origen: k > 1 ? "cuota" : "manual" });
  if (av) toast(msg + av, 6000);
});
$("fFijo").addEventListener("submit", async (e) => {
  e.preventDefault(); const monto = Number($("fMonto").value); if (!(monto > 0)) { toast("Poné un monto mayor que cero."); return; }
  const row = { nombre: $("fNombre").value.trim(), tipo: $("fTipo").value, ambito: $("fAmbito").value, categoria: $("fCat").value, monto, moneda: $("fMoneda").value, frecuencia: $("fFrec").value,
    dia: Math.max(1, Math.min(31, Number($("fDia").value) || 1)), mes: $("fFrec").value === "anual" ? Number($("fMes").value) : null, metodo: $("fMetodo").value };
  const { error } = await sb.from("fin_fijos").insert(row);
  if (error) { toast("No se pudo guardar el pago fijo."); return; }
  e.target.reset(); refrescarFCat(); $("fMesL").hidden = true; toast(`${row.tipo === "ingreso" ? "Cobro" : "Pago"} fijo guardado: ${row.nombre}`); await cargar();
});
$("fDeu").addEventListener("submit", async (e) => {
  e.preventDefault();
  const tipo = $("dTipo").value, total = Number($("dTotal").value), n = Math.floor(Number($("dCuotas").value) || 0), ya = Number($("dYa").value) || 0, moneda = $("dMon").value;
  if (!(total > 0)) { toast("Poné el total a pagar."); return; }
  if (tipo === "cuotas" && n < 2) { toast("Poné en cuántas cuotas es la compra."); return; }
  const cuota = n ? r2(total / n) : null, iniC = n ? Math.min(n, Math.floor(ya)) : 0, pagadoIni = n ? r2(cuota * iniC) : Math.min(total, ya);
  const dia = Math.max(1, Math.min(31, Number($("dDia").value) || Number(hoy().slice(8, 10))));
  const tarjeta = tipo === "cuotas" ? $("dTar").value : null, nombre = $("dNombre").value.trim();
  const fila = { nombre, tipo, acreedor: tarjeta || $("dAcr").value.trim() || null, ambito: $("dAmb").value, categoria: tipo === "cuotas" ? $("dCat").value : "Créditos y préstamos",
    monto_total: total, moneda, cuotas: n || null, cuota_monto: cuota, pagado_inicial: pagadoIni, cuotas_iniciales: iniC, dia_pago: dia, inicio: hoy() };
  const r = await sb.from("fin_deudas").insert(fila).select("id").single();
  if (r.error) { toast("No se pudo guardar."); return; }
  if (tipo === "cuotas" && iniC < n) {
    const desde = proximaFecha(dia);
    const filas = Array.from({ length: n - iniC }, (_, i) => { const q = iniC + i + 1; return { tipo: "gasto", ambito: fila.ambito, categoria: fila.categoria, concepto: `${nombre} (cuota ${q}/${n})`,
      monto: q === n ? r2(total - cuota * (n - 1)) : cuota, moneda, fecha: addMeses(desde, i, dia), metodo: "Tarjeta", tarjeta, origen: "cuota", deuda_id: r.data.id, cuota: q, cuotas: n }; });
    const { error } = await sb.from("fin_movimientos").insert(filas);
    if (error) { await sb.from("fin_deudas").delete().eq("id", r.data.id); toast("No se pudieron cargar las cuotas."); return; }
  }
  e.target.reset(); $("dYa").value = "0"; formDeuda(); toast(`Guardada: ${nombre}`); await cargar();
});
async function guardarTarjetas(lista) {
  if (st.demo) { toast("Modo ejemplo: no se guarda nada."); return; }
  const { error } = await sb.from("fin_config").upsert({ user_id: st.user.id, tarjetas: lista });
  if (error) { toast("No se pudieron guardar las tarjetas."); return; }
  toast("Tarjetas actualizadas"); await cargar();
}
$("fTar").addEventListener("submit", (e) => {
  e.preventDefault(); const t = $("tarNueva").value.trim(); if (!t) return;
  const lista = st.cfg.tarjetas || [];
  if (lista.some(x => x.toLowerCase() === t.toLowerCase())) { toast("Esa tarjeta ya está."); return; }
  $("tarNueva").value = ""; guardarTarjetas(lista.concat(t));
});
document.addEventListener("submit", async (e) => {
  if (e.target.id === "fAhorro") {
    e.preventDefault(); if (st.demo) { toast("Modo ejemplo: no se guarda nada."); return; }
    const monto = Number(e.target.querySelector("input").value); if (!(monto > 0)) return;
    const { error } = await sb.from("fin_movimientos").insert({ tipo: "gasto", ambito: "personal", categoria: "Ahorro", concepto: "Ahorro del mes", monto, moneda: "USD", fecha: hoy(), origen: "ahorro" });
    st.ahorrando = false; toast(error ? "No se pudo guardar." : `¡Bien! Separaste ${usdFijo(monto)} este mes`); await cargar(); return;
  }
  const f = e.target.closest("form.pago"); if (!f) return; e.preventDefault();
  if (st.demo) { toast("Modo ejemplo: no se guarda nada."); return; }
  const d = st.deudas.find(x => x.id === f.dataset.deu), monto = Number(f.querySelector("input").value); if (!d || !(monto > 0)) return;
  const es = estadoDeuda(d), q = es.n ? Math.min(es.n, es.cuotaAct + 1) : null;
  f.querySelector('button[type="submit"]').disabled = true;
  const { error } = await sb.from("fin_movimientos").insert({ tipo: "gasto", ambito: d.ambito, categoria: "Créditos y préstamos", concepto: `${d.nombre} (${q ? `cuota ${q}/${es.n}` : "pago"})`,
    monto, moneda: d.moneda, fecha: hoy(), origen: "deuda", deuda_id: d.id, cuota: q, cuotas: es.n || null });
  st.pagando = null; toast(error ? "No se pudo guardar el pago." : `Pago guardado: ${usd(enUSD(monto, d.moneda))}`); await cargar();
});
$("fInv").addEventListener("submit", async (e) => {
  e.preventDefault(); const monto = Number($("iMonto").value); if (!(monto > 0)) { toast("Poné el monto."); return; }
  const { error } = await sb.from("fin_inversiones").insert({ nombre: $("iNombre").value.trim(), monto, moneda: $("iMon").value, ambito: "personal", fecha: hoy() });
  if (error) { toast("No se pudo guardar."); return; }
  e.target.reset(); llenar($("iMon"), MONEDAS, "USD"); toast("Inversión anotada"); await cargar();
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
  if (b.dataset.go) { st.vista = b.dataset.go; st.borrando = null; st.pagando = null; render(); window.scrollTo({ top: 0 }); return; }
  if (b.dataset.editTope) {
    const [amb, ...resto] = b.dataset.editTope.split("|"); $("tAmb").value = amb; formTope(false); $("tCat").value = resto.join("|"); formTope(true);
    $("fTope").scrollIntoView({ behavior: "smooth", block: "center" }); return;
  }
  if (b.dataset.delTope) {
    if (st.demo) { st.borrando = null; toast("Modo ejemplo: no se guarda nada."); render(); return; }
    const [amb, ...resto] = b.dataset.delTope.split("|");
    const { error } = await sb.from("fin_topes").delete().eq("ambito", amb).eq("categoria", resto.join("|")); st.borrando = null;
    toast(error ? "No se pudo borrar." : "Topes borrados"); await cargar(); formTope(true); return;
  }
  if (b.dataset.libro) {
    if (!st.agencia) return;
    st.libro = b.dataset.libro; ls.set("mf-libro", st.libro); st.borrando = null;
    if (st.libro !== "todo") { $("fAmbito").value = st.libro; refrescarFCat(); $("dAmb").value = st.libro; }
    render(); return;
  }
  if (b.dataset.mover) {
    if (st.demo) { toast("Modo ejemplo: no se guarda nada."); return; }
    const x = st.movs.find(y => y.id === b.dataset.mover); if (!x) return;
    const nuevo = x.ambito === "agencia" ? "personal" : "agencia"; b.disabled = true;
    // si es una cuota o un pago de deuda, se pasa la deuda entera con todas sus cuotas
    const q = sb.from("fin_movimientos").update({ ambito: nuevo });
    const { error } = await (x.deuda_id ? q.eq("deuda_id", x.deuda_id) : q.eq("id", x.id));
    if (!error && x.deuda_id) await sb.from("fin_deudas").update({ ambito: nuevo }).eq("id", x.deuda_id);
    toast(error ? "No se pudo cambiar." : `${x.concepto || x.categoria}: ahora es ${nuevo === "agencia" ? "de la agencia" : "personal"}`); await cargar(); return;
  }
  if (b.dataset.ask) { st.borrando = b.dataset.ask; render(); return; }
  if ("cancel" in b.dataset) { st.borrando = null; st.pagando = null; st.ahorrando = false; render(); return; }
  if ("ahorro" in b.dataset) { st.ahorrando = true; render(); return; }
  if (b.dataset.delInv) {
    if (st.demo) { st.borrando = null; toast("Modo ejemplo: no se guarda nada."); render(); return; }
    const { error } = await sb.from("fin_inversiones").delete().eq("id", b.dataset.delInv); st.borrando = null; toast(error ? "No se pudo borrar." : "Inversión borrada"); await cargar(); return;
  }
  if (b.dataset.pagodeu) { st.pagando = b.dataset.pagodeu; render(); return; }
  if (b.dataset.tarDel) { guardarTarjetas((st.cfg.tarjetas || []).filter(t => t !== b.dataset.tarDel)); return; }
  if (st.demo && (b.dataset.delM || b.dataset.delF || b.dataset.delD || b.dataset.pagar)) { st.borrando = null; toast("Modo ejemplo: no se guarda nada."); render(); return; }
  if (b.dataset.delD) {
    // compra en cuotas: se van también sus cuotas. Préstamos: los pagos ya hechos quedan como gastos.
    const d = st.deudas.find(x => x.id === b.dataset.delD);
    if (d && d.tipo !== "cuotas") await sb.from("fin_movimientos").update({ deuda_id: null }).eq("deuda_id", d.id);
    const { error } = await sb.from("fin_deudas").delete().eq("id", b.dataset.delD); st.borrando = null; toast(error ? "No se pudo borrar." : "Borrado"); await cargar(); return;
  }
  if (b.dataset.delM) { const { error } = await sb.from("fin_movimientos").delete().eq("id", b.dataset.delM); st.borrando = null; toast(error ? "No se pudo borrar." : "Movimiento borrado"); await cargar(); return; }
  if (b.dataset.delF) { const { error } = await sb.from("fin_fijos").delete().eq("id", b.dataset.delF); st.borrando = null; toast(error ? "No se pudo borrar." : "Pago fijo borrado"); await cargar(); return; }
  if (b.dataset.pagar) {
    const f = st.fijos.find(x => x.id === b.dataset.pagar); if (!f || pagadoEnMes(f, st.mes)) return; b.disabled = true;
    const fecha = st.mes === mesDe(hoy()) ? hoy() : `${st.mes}-${String(Math.min(Number(f.dia) || 1, diasMes(st.mes))).padStart(2, "0")}`;
    const { error } = await sb.from("fin_movimientos").insert({ tipo: esCobro(f) ? "ingreso" : "gasto", ambito: f.ambito, categoria: f.categoria, concepto: f.nombre, monto: Number(f.monto), moneda: f.moneda, fecha, metodo: f.metodo, origen: "fijo", fijo_id: f.id });
    toast(error ? "No se pudo marcar." : `${f.nombre} marcado como ${esCobro(f) ? "cobrado" : "pagado"}`); await cargar();
  }
});
$("busca").addEventListener("input", e => { st.q = e.target.value.trim(); renderMovs(); });

// Actualización automática: cuando se publica una versión nueva, la app se recarga sola (no hace falta cerrarla).
if ("serviceWorker" in navigator) {
  const habia = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.register("sw.js", { updateViaCache: "none" }).then(reg => {
    window.addEventListener("focus", () => reg.update().catch(() => {}));
    setInterval(() => reg.update().catch(() => {}), 10 * 60 * 1000);
  }).catch(() => {});
  let recargando = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => { if (habia && !recargando && $("sheet").hidden) { recargando = true; location.reload(); } });
}

// Modo de ejemplo (#demo): datos inventados, nada se guarda. Solo para ver cómo queda.
function demo() {
  st.demo = true; st.user = { email: "ejemplo" }; $("vLogin").hidden = true; $("vApp").hidden = false; $("whoMail").textContent = "DATOS DE EJEMPLO";
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
  st.fijos.push({ id: "fs", nombre: "Sueldo (ejemplo)", tipo: "ingreso", ambito: "personal", categoria: "Sueldo", monto: 7200000, moneda: "ARS", dia: 1, frecuencia: "mensual", activo: true });
  st.cfg.inicio = sumaMes(mes0, -1) + "-01";
  const ini4 = addMeses(hoy(), -4, 10);
  st.deudas = [
    { id: "dd1", nombre: "iPhone 16 Pro", tipo: "cuotas", acreedor: "Visa", ambito: "personal", categoria: "Otros", monto_total: 1440, moneda: "EUR", cuotas: 12, cuota_monto: 120, pagado_inicial: 0, cuotas_iniciales: 0, dia_pago: 10, activo: true },
    { id: "dd2", nombre: "Préstamo del banco", tipo: "prestamo", acreedor: "Banco", ambito: "personal", monto_total: 6000, moneda: "EUR", cuotas: 24, cuota_monto: 250, pagado_inicial: 2250, cuotas_iniciales: 9, dia_pago: 5, activo: true },
    { id: "dd3", nombre: "Notebook de la agencia", tipo: "cuotas", acreedor: "Mastercard", ambito: "agencia", categoria: "Equipamiento", monto_total: 900, moneda: "USD", cuotas: 6, cuota_monto: 150, pagado_inicial: 0, cuotas_iniciales: 0, dia_pago: 20, activo: true },
    { id: "dd4", nombre: "Devolver a un amigo", tipo: "persona", acreedor: "Amigo", ambito: "personal", monto_total: 800, moneda: "USD", cuotas: null, cuota_monto: null, pagado_inicial: 500, cuotas_iniciales: 0, dia_pago: 1, activo: true }];
  for (let i = 0; i < 12; i++) { const f = addMeses(ini4, i, 10); add({ tipo: "gasto", ambito: "personal", categoria: "Otros", concepto: `iPhone 16 Pro (cuota ${i + 1}/12)`, monto: 120, moneda: "EUR", fecha: f, metodo: "Tarjeta", tarjeta: "Visa", origen: "cuota", deuda_id: "dd1", cuota: i + 1, cuotas: 12 }); }
  for (let i = 0; i < 6; i++) { const f = addMeses(addMeses(hoy(), -5, 20), i, 20); add({ tipo: "gasto", ambito: "agencia", categoria: "Equipamiento", concepto: `Notebook de la agencia (cuota ${i + 1}/6)`, monto: 150, moneda: "USD", fecha: f, metodo: "Tarjeta", tarjeta: "Mastercard", origen: "cuota", deuda_id: "dd3", cuota: i + 1, cuotas: 6 }); }
  st.pagosDeu = st.movs.filter(x => x.deuda_id).map(x => ({ id: x.id, deuda_id: x.deuda_id, monto: x.monto, fecha: x.fecha, cuota: x.cuota }));
  st.inversiones = [{ id: "i1", nombre: "Inversión en otro proyecto", ambito: "personal", monto: 1000, moneda: "USD", fecha: hoy(), activo: true }];
  st.factur = [0, -1, -2].map(k => ({ mes: sumaMes(mes0, k), moneda: "EUR", facturado: 4900 + k * 60 }));
  add({ tipo: "gasto", ambito: "personal", categoria: "Ahorro", concepto: "Ahorro del mes", monto: 1050, moneda: "USD", fecha: sumaMes(mes0, -1) + "-10", origen: "ahorro" });
  st.fijos.push({ id: "fi", nombre: "Cliente fuera del CRM (ejemplo)", tipo: "ingreso", ambito: "agencia", categoria: "Clientes fuera del CRM", monto: 1000, moneda: "USD", dia: 1, frecuencia: "mensual", activo: true },
    { id: "fe", nombre: "Media buyer (ejemplo)", ambito: "agencia", categoria: "Equipo y sueldos", monto: 700, moneda: "USD", dia: 1, frecuencia: "mensual", activo: true });
  st.topes = [["personal", "", "semanal", 200, "EUR"], ["personal", "", "mensual", 800, "EUR"], ["personal", "Comidas y delivery", "semanal", 45, "EUR"], ["personal", "Uber y transporte", "quincenal", 60, "EUR"], ["agencia", "Apps y suscripciones", "mensual", 450, "USD"]]
    .map(([ambito, categoria, periodo, monto, moneda], i) => ({ id: "t" + i, ambito, categoria, periodo, monto, moneda, solo_dia_a_dia: true }));
  metodos();
  const guardarNada = async () => toast("Modo ejemplo: no se guarda nada.");
  ["fMov", "fFijo", "fCfg", "fDeu", "fTar", "fTope", "fInv"].forEach(id => $(id).addEventListener("submit", e => { e.stopImmediatePropagation(); e.preventDefault(); guardarNada(); }, true));
  // #demo-personal: cómo lo ve alguien sin agencia (solo lo personal)
  if (location.hash.startsWith("#demo-personal")) {
    const p = (x) => x.ambito !== "agencia"; st.agencia = false; st.crm = []; st.factur = [];
    st.movs = st.movs.filter(p); st.fijos = st.fijos.filter(p); st.deudas = st.deudas.filter(p); st.topes = st.topes.filter(p);
    st.pagosDeu = st.pagosDeu.filter(x => st.deudas.some(d => d.id === x.deuda_id));
  }
  modo(); render();
}
// #demo o #demo/ajustes, #demo/deudas…: datos de ejemplo abiertos en esa vista
if (location.hash.startsWith("#demo")) { const v = location.hash.split("/")[1]; if (VISTAS.some(x => x[0] === v)) st.vista = v; demo(); } else iniciar();
})();
