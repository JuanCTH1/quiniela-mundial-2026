# 🏆 Quiniela Mundial 2026

Sistema de quiniela para la Copa del Mundo **México · USA · Canadá 2026**.
Los participantes pronostican el marcador de cada partido, suman puntos según el acierto
y compiten en una tabla de posiciones.

48 selecciones · 12 grupos · porra clásica con marcador exacto.

---

## Stack

- **Backend**: FastAPI (Python 3.10+)
- **Base de datos**: SQLite (cero configuración, archivo local `quiniela.db`)
- **Frontend**: HTML + JS vanilla servido por el propio FastAPI (sin build step)

## Reglas de puntuación

| Acierto | Puntos |
|---|---|
| Marcador exacto (3-1 y pones 3-1) | **5** |
| Resultado correcto (gana/empata/pierde el equipo correcto) | **3** |
| Fallo total | **0** |

Configurable en [`app/scoring.py`](app/scoring.py).

---

## Arrancar en local

```bash
python -m venv .venv
# Windows
.venv\Scripts\activate
# Linux/Mac
source .venv/bin/activate

pip install -r requirements.txt
python -m app.seed        # carga grupos y partidos del Mundial
uvicorn app.main:app --reload
```

Abrir http://localhost:8000

## Flujo de uso

1. **Registrarte** con un nombre (sin contraseñas, es una porra entre amigos).
2. **Pronosticar** el marcador de los partidos que aún no empiezan.
3. El admin **carga el resultado real** de cada partido jugado (`POST /admin/result`).
4. La **tabla de posiciones** se actualiza sola con los puntos.

## Endpoints principales

| Método | Ruta | Qué hace |
|---|---|---|
| `GET` | `/` | UI web |
| `POST` | `/api/users` | Crear/recuperar usuario por nombre |
| `GET` | `/api/matches` | Lista de partidos |
| `POST` | `/api/predictions` | Guardar pronóstico |
| `GET` | `/api/leaderboard` | Tabla de posiciones |
| `POST` | `/admin/result` | (Admin) Cargar resultado real |

---

## Estructura

```
quiniela-mundial-2026/
├── app/
│   ├── main.py        # FastAPI + UI embebida
│   ├── db.py          # conexión y esquema SQLite
│   ├── models.py      # Pydantic schemas
│   ├── scoring.py     # reglas de puntos
│   ├── seed.py        # carga grupos y partidos
│   └── data/
│       └── groups.py  # 48 selecciones en 12 grupos
├── requirements.txt
└── README.md
```
