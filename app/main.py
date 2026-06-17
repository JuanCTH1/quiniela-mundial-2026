"""API + UI de la Quiniela Mundial 2026 (FastAPI)."""
import os

from fastapi import FastAPI, HTTPException
from fastapi.responses import HTMLResponse

from . import storage
from .models import PredictionIn, ResultIn, UserIn
from .scoring import points

ADMIN_TOKEN = os.getenv("ADMIN_TOKEN", "cambia-esto")

app = FastAPI(title="Quiniela Mundial 2026")


@app.on_event("startup")
def _startup() -> None:
    """Inicializa el backend de datos al arrancar."""
    storage.init()


# --------------------------------------------------------------------------- #
# API
# --------------------------------------------------------------------------- #
@app.post("/api/users")
def create_user(body: UserIn) -> dict:
    """Crea o recupera un usuario por nombre."""
    return storage.upsert_user(body.name)


@app.get("/api/matches")
def get_matches() -> list[dict]:
    """Devuelve todos los partidos."""
    return storage.list_matches()


@app.get("/api/predictions/{user_id}")
def get_predictions(user_id: int) -> list[dict]:
    """Pronósticos de un usuario."""
    return storage.user_predictions(user_id)


@app.post("/api/predictions")
def post_prediction(body: PredictionIn) -> dict:
    """Guarda/actualiza un pronóstico."""
    try:
        return storage.save_prediction(
            body.user_id, body.match_id, body.pred_home, body.pred_away
        )
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc))


@app.get("/api/leaderboard")
def leaderboard() -> list[dict]:
    """Tabla de posiciones calculada al vuelo."""
    users = {u["id"]: u["name"] for u in storage.all_users()}
    matches = {m["id"]: m for m in storage.list_matches()}
    totals: dict[int, dict] = {
        uid: {"user_id": uid, "name": name, "points": 0, "exacts": 0, "played": 0}
        for uid, name in users.items()
    }
    for p in storage.all_predictions():
        m = matches.get(p["match_id"])
        if not m or not m.get("finished"):
            continue
        pts = points(p["pred_home"], p["pred_away"], m["home_score"], m["away_score"])
        row = totals.get(p["user_id"])
        if not row:
            continue
        row["points"] += pts
        row["played"] += 1
        if pts == 5:
            row["exacts"] += 1
    table = sorted(totals.values(), key=lambda r: (-r["points"], -r["exacts"], r["name"]))
    for i, row in enumerate(table, 1):
        row["rank"] = i
    return table


@app.post("/admin/result")
def post_result(body: ResultIn, token: str = "") -> dict:
    """(Admin) Carga el resultado real de un partido. Requiere ?token=ADMIN_TOKEN."""
    if token != ADMIN_TOKEN:
        raise HTTPException(status_code=401, detail="Token de admin inválido.")
    storage.set_result(body.match_id, body.home_score, body.away_score)
    return {"ok": True, "match_id": body.match_id}


@app.get("/health")
def health() -> dict:
    """Healthcheck."""
    return {"ok": True, "backend": "supabase" if storage.USE_SUPABASE else "sqlite"}


# --------------------------------------------------------------------------- #
# UI
# --------------------------------------------------------------------------- #
@app.get("/", response_class=HTMLResponse)
def index() -> str:
    """Sirve la app web de una sola página."""
    return _PAGE


_PAGE = """<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Quiniela Mundial 2026 🏆</title>
<style>
  :root { --bg:#0b1020; --card:#151c30; --line:#26304d; --accent:#00c389; --accent2:#ff5a5f; --txt:#e9eef7; --mut:#8b97b3; }
  * { box-sizing:border-box; }
  body { margin:0; font-family:system-ui,Segoe UI,Roboto,sans-serif; background:var(--bg); color:var(--txt); }
  header { padding:18px 16px; background:linear-gradient(135deg,#00c389,#0077c2); text-align:center; }
  header h1 { margin:0; font-size:1.35rem; }
  header p { margin:4px 0 0; opacity:.9; font-size:.85rem; }
  .wrap { max-width:820px; margin:0 auto; padding:16px; }
  .card { background:var(--card); border:1px solid var(--line); border-radius:14px; padding:14px; margin-bottom:14px; }
  .row { display:flex; gap:8px; align-items:center; }
  input { background:#0e1426; border:1px solid var(--line); color:var(--txt); border-radius:9px; padding:9px 10px; font-size:1rem; }
  input[type=number] { width:52px; text-align:center; }
  button { background:var(--accent); color:#062018; border:0; border-radius:9px; padding:10px 14px; font-weight:700; cursor:pointer; }
  button.ghost { background:transparent; color:var(--accent); border:1px solid var(--accent); }
  .tabs { display:flex; gap:8px; margin-bottom:12px; }
  .tabs button { background:#0e1426; color:var(--mut); border:1px solid var(--line); }
  .tabs button.active { background:var(--accent); color:#062018; }
  .match { border-bottom:1px solid var(--line); padding:10px 0; }
  .match:last-child { border-bottom:0; }
  .teams { display:flex; align-items:center; justify-content:center; gap:8px; }
  .team { flex:1; }
  .team.home { text-align:right; }
  .team.away { text-align:left; }
  .meta { text-align:center; color:var(--mut); font-size:.72rem; margin-bottom:6px; }
  .grp { display:inline-block; background:#0e1426; border:1px solid var(--line); border-radius:6px; padding:1px 7px; font-size:.7rem; color:var(--accent); }
  .done { color:var(--accent2); font-weight:700; }
  table { width:100%; border-collapse:collapse; }
  th,td { padding:8px; text-align:left; border-bottom:1px solid var(--line); }
  th { color:var(--mut); font-size:.78rem; }
  .rank { color:var(--accent); font-weight:700; }
  .muted { color:var(--mut); font-size:.85rem; }
  .save-ok { color:var(--accent); font-size:.78rem; }
</style>
</head>
<body>
<header>
  <h1>🏆 Quiniela Mundial 2026</h1>
  <p>México · USA · Canadá — pronostica, suma puntos, presume.</p>
</header>

<div class="wrap">
  <div class="card" id="login">
    <div class="row">
      <input id="name" placeholder="Tu nombre" style="flex:1">
      <button onclick="login()">Entrar</button>
    </div>
    <p class="muted" id="who"></p>
  </div>

  <div class="tabs">
    <button class="active" id="tab-q" onclick="show('q')">Pronósticos</button>
    <button id="tab-l" onclick="show('l')">Tabla</button>
  </div>

  <div id="view-q" class="card"><p class="muted">Entra con tu nombre para pronosticar.</p></div>
  <div id="view-l" class="card" style="display:none"><p class="muted">Cargando…</p></div>
</div>

<script>
let USER = JSON.parse(localStorage.getItem("quiniela_user") || "null");
let MATCHES = [], PREDS = {};

function show(t){
  document.getElementById("view-q").style.display = t==="q" ? "block":"none";
  document.getElementById("view-l").style.display = t==="l" ? "block":"none";
  document.getElementById("tab-q").classList.toggle("active", t==="q");
  document.getElementById("tab-l").classList.toggle("active", t==="l");
  if(t==="l") loadLeaderboard();
}

async function login(){
  const name = document.getElementById("name").value.trim();
  if(name.length < 2) return alert("Nombre muy corto.");
  const r = await fetch("/api/users",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name})});
  USER = await r.json();
  localStorage.setItem("quiniela_user", JSON.stringify(USER));
  renderWho(); loadAll();
}

function renderWho(){
  document.getElementById("who").textContent = USER ? `Conectado como ${USER.name}` : "";
  if(USER) document.getElementById("name").value = USER.name;
}

async function loadAll(){
  const [m, p] = await Promise.all([
    fetch("/api/matches").then(r=>r.json()),
    USER ? fetch("/api/predictions/"+USER.id).then(r=>r.json()) : Promise.resolve([])
  ]);
  MATCHES = m;
  PREDS = {}; p.forEach(x => PREDS[x.match_id] = x);
  renderMatches();
}

function renderMatches(){
  const el = document.getElementById("view-q");
  if(!USER){ el.innerHTML = '<p class="muted">Entra con tu nombre para pronosticar.</p>'; return; }
  if(!MATCHES.length){ el.innerHTML = '<p class="muted">No hay partidos cargados todavía.</p>'; return; }
  el.innerHTML = MATCHES.map(m => {
    const pr = PREDS[m.id] || {};
    const done = m.finished;
    const score = done ? `<span class="done">${m.home_score} - ${m.away_score}</span>` : "vs";
    const date = m.kickoff ? new Date(m.kickoff).toLocaleString("es-MX",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"}) : "";
    return `<div class="match">
      <div class="meta"><span class="grp">Grupo ${m.grp||"-"}</span> · ${date} ${done?"· FINAL":""}</div>
      <div class="teams">
        <span class="team home">${m.home}</span>
        <input type="number" min="0" max="30" id="h-${m.id}" value="${pr.pred_home??""}" ${done?"disabled":""}>
        <span>${score}</span>
        <input type="number" min="0" max="30" id="a-${m.id}" value="${pr.pred_away??""}" ${done?"disabled":""}>
        <span class="team away">${m.away}</span>
        ${done?"":`<button onclick="savePred(${m.id})">✓</button>`}
      </div>
      <div class="meta save-ok" id="ok-${m.id}"></div>
    </div>`;
  }).join("");
}

async function savePred(id){
  const h = parseInt(document.getElementById("h-"+id).value);
  const a = parseInt(document.getElementById("a-"+id).value);
  if(isNaN(h)||isNaN(a)) return alert("Pon ambos marcadores.");
  const r = await fetch("/api/predictions",{method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({user_id:USER.id,match_id:id,pred_home:h,pred_away:a})});
  if(r.ok){ PREDS[id]={pred_home:h,pred_away:a}; document.getElementById("ok-"+id).textContent="Guardado ✓"; }
  else { document.getElementById("ok-"+id).textContent="Error al guardar"; }
}

async function loadLeaderboard(){
  const t = await fetch("/api/leaderboard").then(r=>r.json());
  const el = document.getElementById("view-l");
  if(!t.length){ el.innerHTML='<p class="muted">Aún no hay puntos. ¡Que empiece el balón a rodar!</p>'; return; }
  el.innerHTML = `<table><thead><tr><th>#</th><th>Jugador</th><th>Pts</th><th>Exactos</th><th>Jugados</th></tr></thead>
    <tbody>${t.map(r=>`<tr>
      <td class="rank">${r.rank}</td><td>${r.name}</td><td><b>${r.points}</b></td><td>${r.exacts}</td><td>${r.played}</td>
    </tr>`).join("")}</tbody></table>`;
}

renderWho();
loadAll();
</script>
</body>
</html>"""
