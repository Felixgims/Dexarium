import React, { useEffect, useRef, useState, useMemo } from "react";
import { createRoot } from "react-dom/client";
import {
  HashRouter,
  NavLink,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { registerSW } from "virtual:pwa-register";
import {
  Boxes,
  BookOpen,
  Plus,
  Search,
  Settings,
  ChartNoAxesCombined,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  X,
  Download,
  Upload,
  Sun,
  Moon,
  Check,
  HardDrive,
  ArrowUpRight,
  SlidersHorizontal,
} from "lucide-react";
import {
  species,
  forms,
  games,
  dexes,
  speciesById,
  baseForms,
  formById,
} from "./catalog";
import {
  db,
  changeCount,
  setCaught,
  deleteTracker,
  exportBackup,
} from "./storage";
import { validateBackup, importBackup } from "./backup";
import {
  completion,
  percent,
  pageEntries,
  boxLabel,
  type Form,
  type Species,
  type Tracker,
  type Preferences,
  type Backup,
  type Specimen,
} from "./domain";
import "./style.css";
import { Sprite, Modal, TrackerEditor, Detail } from "./components";
const defaults: Preferences = {
  id: "preferences",
  theme: "dark",
  sprite: "normal",
};
function App() {
  const location = useLocation(),
    navigate = useNavigate();
  const route = location.pathname.split("/").filter(Boolean);
  const view = route[0] || "collection";
  const specimens = useLiveQuery(() => db.specimens.toArray(), []) ?? [];
  const trackers = useLiveQuery(() => db.trackers.toArray(), []) ?? [];
  const progress = useLiveQuery(() => db.progress.toArray(), []) ?? [];
  const prefs =
    useLiveQuery(() => db.preferences.get("preferences"), []) ?? defaults;
  const [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [ready, setReady] = useState(false),
    [update, setUpdate] = useState<null | (() => void)>(null);
  const [create, setCreate] = useState(false),
    [editing, setEditing] = useState<Tracker | null>(null),
    [detail, setDetail] = useState<Form | null>(null);
  const [search, setSearch] = useState(""),
    [filter, setFilter] = useState("all"),
    [type, setType] = useState("all"),
    [gen, setGen] = useState("all"),
    [category, setCategory] = useState("all"),
    [gameFilter, setGameFilter] = useState("all");
  const viewportRef = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(0),
    [direction, setDirection] = useState(1),
    [showFilters, setShowFilters] = useState(false),
    [shinySelected, setShinySelected] = useState<Set<string>>(new Set());
  const [pendingBackup, setPendingBackup] = useState<Backup | null>(null),
    [importMode, setImportMode] = useState<"merge" | "replace">("merge");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const wheel = useRef(0),
    touch = useRef<{ x: number; y: number } | null>(null);
  const run = async (fn: () => Promise<unknown>) => {
    try {
      await fn();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "No se pudo guardar el cambio.",
      );
    }
  };
  useEffect(() => {
    const updateSW = registerSW({
      onOfflineReady() {
        setReady(true);
      },
      onNeedRefresh() {
        setUpdate(() => () => void updateSW(true));
      },
      onRegisterError(e) {
        setError(`No se pudo preparar el modo offline: ${String(e)}`);
      },
    });
    void navigator.serviceWorker?.ready.then(() => setReady(true));
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = prefs.theme;
  }, [prefs.theme]);
  useEffect(() => {
    setPage(0);
    setDetail(null);
  }, [view, route[1], search, filter, type, gen, category, gameFilter]);
  const stats = completion(specimens, forms),
    activeTracker = trackers.find((t) => t.id === route[1]);
  const [scope, setScope] = useState("");
  useEffect(() => {
    setScope(activeTracker?.scopeIds[0] ?? "");
    setPage(0);
  }, [activeTracker?.id, activeTracker?.scopeIds.join(",")]);
  const activeDex = dexes.find((d) => d.id === scope);
  const trackerProgress = progress.filter(
    (p) => p.trackerId === activeTracker?.id && p.state === "caught",
  );
  const caught = new Set(trackerProgress.map((p) => p.speciesId));
  const countMap = useMemo(() => {
    const map = new Map<string, { normal: number; shiny: number }>();
    for (const s of specimens) {
      const c = map.get(s.formId) ?? { normal: 0, shiny: 0 };
      c[s.shiny ? "shiny" : "normal"]++;
      map.set(s.formId, c);
    }
    return map;
  }, [specimens]);
  const ownedSpecies = new Set(
    specimens.map((s) => formById.get(s.formId)?.speciesId),
  );
  const title =
    view === "collection"
      ? "Colección global"
      : view === "national"
        ? "Pokédex Nacional"
        : view === "tracker"
          ? (activeTracker?.name ?? "Pokédex no encontrada")
          : view === "wiki"
            ? "Enciclopedia Pokémon"
            : view === "stats"
              ? "Tu colección, en cifras"
              : "Ajustes y copias";
  const allowedSpecies = useMemo(() => {
    if (gameFilter === "all") return null;
    const game = games.find((g) => g.id === gameFilter);
    return new Set(
      dexes
        .filter((d) => game?.scopes.includes(d.id))
        .flatMap((d) => d.entries.map((e) => e.speciesId)),
    );
  }, [gameFilter]);
  const rows = useMemo(() => {
    const raw =
      view === "tracker"
        ? (activeDex?.entries ?? []).map((e) => ({
            form: baseForms.get(e.speciesId)!,
            number: e.number,
          }))
        : view === "collection"
          ? forms.map((f) => ({ form: f, number: f.order }))
          : species.map((s) => ({
              form: baseForms.get(s.id)!,
              number: s.number,
            }));
    return raw.filter(({ form: f, number }) => {
      if (!f) return false;
      const s = speciesById.get(f.speciesId)!;
      const c = countMap.get(f.id) ?? { normal: 0, shiny: 0 };
      const owned =
        view === "tracker"
          ? caught.has(s.id)
          : view === "collection"
            ? c.normal + c.shiny > 0
            : ownedSpecies.has(s.id);
      const q = search.toLowerCase().trim();
      return (
        (!q ||
          `${s.name} ${s.es} ${f.label} ${s.number} ${String(s.number).padStart(3, "0")} ${number}`
            .toLowerCase()
            .includes(q)) &&
        (gen === "all" || s.generation === Number(gen)) &&
        (type === "all" || f.types.includes(type)) &&
        (category === "all" || f.category === category) &&
        (!allowedSpecies || allowedSpecies.has(s.id)) &&
        (filter === "all" ||
          (filter === "owned" && owned) ||
          (filter === "missing" && !owned) ||
          (filter === "shiny-owned" && c.shiny > 0) ||
          (filter === "shiny-missing" &&
            f.shiny === "available" &&
            c.shiny === 0) ||
          (filter === "shiny-locked" && f.shiny === "locked"))
      );
    });
  }, [
    view,
    activeDex,
    search,
    gen,
    type,
    category,
    allowedSpecies,
    filter,
    countMap,
    specimens,
    progress,
    activeTracker?.id,
  ]);
  const pages = Math.max(1, Math.ceil(rows.length / 30)),
    current = Math.min(page, pages - 1),
    box = pageEntries(rows, current);
  const isBrowser = ["collection", "national", "tracker", "wiki"].includes(
    view,
  );
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const handle = (e: WheelEvent) => {
      if (e.ctrlKey) return;
      e.preventDefault();
      if (
        Math.max(Math.abs(e.deltaX), Math.abs(e.deltaY)) < 12 ||
        Date.now() - wheel.current < 550
      )
        return;
      wheel.current = Date.now();
      const delta =
        (Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY) > 0
          ? 1
          : -1;
      setDirection(delta);
      setPage((p) => Math.max(0, Math.min(pages - 1, p + delta)));
    };
    el.addEventListener("wheel", handle, { passive: false });
    return () => el.removeEventListener("wheel", handle);
  }, [pages, isBrowser]);
  const move = (delta: number) => {
    setDirection(delta);
    setPage((p) => Math.max(0, Math.min(pages - 1, p + delta)));
  };
  const overall =
    view === "tracker"
      ? percent(
          (activeDex?.entries ?? []).filter((e) => caught.has(e.speciesId))
            .length,
          activeDex?.entries.length ?? 0,
        )
      : view === "collection"
        ? percent(stats.forms, forms.length)
        : percent(stats.species, species.length);
  const boxOwned = box.filter(({ form: f }) =>
    view === "tracker"
      ? caught.has(f.speciesId)
      : view === "collection"
        ? countMap.has(f.id)
        : ownedSpecies.has(f.speciesId),
  ).length;
  const savePrefs = (change: Partial<Preferences>) =>
    run(() => db.preferences.put({ ...prefs, ...change }));
  const toggleShiny = (id: string) =>
    setShinySelected((old) => {
      const next = new Set(old);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  async function backup() {
    const b = await exportBackup(db);
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(b, null, 2)], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `dexarium-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <div className="app">
      <aside className="sidebar">
        <NavLink to="/collection" className="brand">
          <img src={`${import.meta.env.BASE_URL}icon.svg`} alt="" />
          DEXARIUM<span>COLLECTION TERMINAL</span>
        </NavLink>
        <div className="nav-label">TU ESPACIO</div>
        <nav>
          <NavLink to="/collection">
            <Boxes size={19} />
            Colección global<span className="tiny">{stats.forms}</span>
          </NavLink>
          <NavLink to="/national">
            <BookOpen size={19} />
            Pokédex Nacional
          </NavLink>
          <div className="nav-label dex-label">
            MIS POKÉDEXES
            <button aria-label="Crear Pokédex" onClick={() => setCreate(true)}>
              <Plus size={17} />
            </button>
          </div>
          {trackers.map((t) => (
            <NavLink
              className="tracker-link"
              key={t.id}
              to={`/tracker/${t.id}`}
            >
              <span className="dot" style={{ background: t.theme }} />
              {t.name}
            </NavLink>
          ))}
          {!trackers.length && (
            <p className="empty-nav">
              Cada aventura merece
              <br />
              su propia Pokédex.
            </p>
          )}
          <button className="create-nav" onClick={() => setCreate(true)}>
            <Plus size={16} />
            Nueva Pokédex
          </button>
          <div className="nav-label">EXPLORAR</div>
          <NavLink to="/wiki">
            <BookOpen size={19} />
            Pokémon Wiki
          </NavLink>
          <NavLink to="/stats">
            <ChartNoAxesCombined size={19} />
            Estadísticas
          </NavLink>
          <NavLink to="/settings">
            <Settings size={19} />
            Ajustes
          </NavLink>
        </nav>
        <div className="local-status">
          <HardDrive size={17} />
          <div>
            Guardado en este dispositivo
            <small>
              {ready
                ? "Aplicación preparada offline"
                : "Preparando caché offline…"}
            </small>
          </div>
          <span className="status-dot" />
        </div>
        <p className="version">DEXARIUM / FOUNDATION 0.1</p>
      </aside>
      <main>
        <header className="topbar">
          <span>
            <span className="breadcrumb">Mi espacio / </span>
            {title}
          </span>
          <div>
            <span className="local-pill">LOCAL FIRST</span>
            <button
              aria-label="Cambiar tema"
              onClick={() =>
                savePrefs({ theme: prefs.theme === "dark" ? "light" : "dark" })
              }
            >
              {prefs.theme === "dark" ? <Sun size={19} /> : <Moon size={19} />}
            </button>
            <button
              aria-label="Abrir ajustes"
              onClick={() => navigate("/settings")}
            >
              <Settings size={19} />
            </button>
          </div>
        </header>
        <div className="workspace">
          <section className="page-heading">
            <div>
              <div className="eyebrow">TU AVENTURA, BIEN ORGANIZADA</div>
              <h1>
                {title}
                <span className="heading-dot">.</span>
              </h1>
              <p>
                {view === "tracker"
                  ? "Progreso de partida independiente de tu inventario global."
                  : view === "collection"
                    ? "Un lugar para cada forma. Una historia para cada captura."
                    : "Explora, registra y descubre tu próxima captura."}
              </p>
            </div>
            <button className="primary" onClick={() => setCreate(true)}>
              <Plus size={18} />
              Crear Pokédex
            </button>
          </section>
          {error && (
            <div role="alert" className="alert">
              {error}
              <button onClick={() => setError("")}>Cerrar</button>
            </div>
          )}
          {notice && (
            <div role="status" className="notice">
              {notice}
              <button onClick={() => setNotice("")}>Cerrar</button>
            </div>
          )}
          {update && (
            <div className="notice">
              Hay una actualización disponible. Tu colección se conserva.
              <button onClick={update}>Actualizar</button>
            </div>
          )}
          <section className="summary">
            <div className="completion">
              <span className="stat-label">
                {view === "collection"
                  ? "FORMAS REGISTRADAS"
                  : "ESPECIES REGISTRADAS"}
              </span>
              <strong>
                {view === "tracker"
                  ? (activeDex?.entries ?? []).filter((e) =>
                      caught.has(e.speciesId),
                    ).length
                  : view === "collection"
                    ? stats.forms
                    : stats.species}
                <small>
                  {" "}
                  /{" "}
                  {view === "tracker"
                    ? (activeDex?.entries.length ?? 0)
                    : view === "collection"
                      ? forms.length
                      : species.length}
                </small>
              </strong>
              <div className="progress-track">
                <i style={{ width: `${overall}%` }} />
              </div>
              <small>
                {overall}% ·{" "}
                {view === "tracker" ? "ámbito activo" : "catálogo incluido"}
              </small>
            </div>
            <div>
              <span className="stat-label">EJEMPLARES NORMALES</span>
              <strong>
                {stats.normal.toLocaleString()}
                <span className="stat-icon">◈</span>
              </strong>
              <small>En tu colección global</small>
            </div>
            <div>
              <span className="stat-label">EJEMPLARES SHINY</span>
              <strong className="gold">
                {stats.shiny.toLocaleString()}
                <Sparkles size={24} />
              </strong>
              <small>Un brillo diferente</small>
            </div>
            <div>
              <span className="stat-label">MIS POKÉDEXES</span>
              <strong>
                {String(trackers.length).padStart(2, "0")}
                <Boxes size={24} />
              </strong>
              <small>Historias independientes</small>
            </div>
          </section>
          {isBrowser && (
            <>
              <div className="toolbar">
                <div className="tabs">
                  <button
                    className={filter === "all" ? "selected" : ""}
                    onClick={() => setFilter("all")}
                  >
                    Todos{" "}
                    <span>
                      {view === "collection"
                        ? forms.length
                        : view === "tracker"
                          ? activeDex?.entries.length
                          : species.length}
                    </span>
                  </button>
                  <button
                    className={filter === "owned" ? "selected" : ""}
                    onClick={() => setFilter("owned")}
                  >
                    Registrados
                  </button>
                  <button
                    className={filter === "missing" ? "selected" : ""}
                    onClick={() => setFilter("missing")}
                  >
                    Pendientes
                  </button>
                </div>
                <div className="search-wrap">
                  <Search size={17} />
                  <input
                    aria-label="Buscar Pokémon"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Nombre, número o forma…"
                  />
                </div>
                <button
                  className={showFilters ? "selected" : ""}
                  onClick={() => setShowFilters(!showFilters)}
                  aria-expanded={showFilters}
                >
                  <SlidersHorizontal size={17} />
                  Filtros
                </button>
              </div>
              {showFilters && (
                <section className="filters">
                  <label>
                    Estado
                    <select
                      value={filter}
                      onChange={(e) => setFilter(e.target.value)}
                    >
                      {[
                        ["all", "Todos"],
                        ["owned", "Registrados"],
                        ["missing", "Pendientes"],
                        ["shiny-owned", "Shiny registrados"],
                        ["shiny-missing", "Shiny pendientes"],
                        ["shiny-locked", "Shiny bloqueados"],
                      ].map(([v, n]) => (
                        <option key={v} value={v}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Generación
                    <select
                      value={gen}
                      onChange={(e) => setGen(e.target.value)}
                    >
                      <option value="all">Todas</option>
                      {[...new Set(species.map((s) => s.generation))].map(
                        (n) => (
                          <option key={n}>{n}</option>
                        ),
                      )}
                    </select>
                  </label>
                  <label>
                    Tipo
                    <select
                      value={type}
                      onChange={(e) => setType(e.target.value)}
                    >
                      <option value="all">Todos</option>
                      {[...new Set(forms.flatMap((f) => f.types))]
                        .sort()
                        .map((t) => (
                          <option key={t}>{t}</option>
                        ))}
                    </select>
                  </label>
                  <label>
                    Forma
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                    >
                      <option value="all">Todas</option>
                      {["base", "regional", "cosmetic", "event"].map((t) => (
                        <option key={t}>{t}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Incluido en Pokédex de
                    <select
                      value={gameFilter}
                      onChange={(e) => setGameFilter(e.target.value)}
                    >
                      <option value="all">Todos los juegos</option>
                      {games.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    onClick={() => {
                      setSearch("");
                      setFilter("all");
                      setType("all");
                      setGen("all");
                      setCategory("all");
                      setGameFilter("all");
                    }}
                  >
                    Limpiar
                  </button>
                </section>
              )}
              {view === "tracker" && activeTracker && (
                <section className="tracker-tools">
                  <span>
                    {games.find((g) => g.id === activeTracker.gameId)?.name} ·{" "}
                    {activeTracker.description}
                  </span>
                  <select
                    aria-label="Ámbito activo"
                    value={scope}
                    onChange={(e) => {
                      setScope(e.target.value);
                      setPage(0);
                    }}
                  >
                    {activeTracker.scopeIds.map((id) => (
                      <option key={id} value={id}>
                        {dexes.find((d) => d.id === id)?.name}
                      </option>
                    ))}
                  </select>
                  <button onClick={() => setEditing(activeTracker)}>
                    Editar ámbitos
                  </button>
                  <button onClick={() => setDeleteId(activeTracker.id)}>
                    Eliminar
                  </button>
                </section>
              )}
              <section className="pc">
                <header className="box-header">
                  <div className="box-title">
                    <span className="box-icon">
                      <Boxes size={22} />
                    </span>
                    <div>
                      <small>
                        {search || filter !== "all"
                          ? "RESULTADOS FILTRADOS"
                          : "SISTEMA DE ALMACENAMIENTO"}{" "}
                        · CAJA {String(current + 1).padStart(2, "0")}
                      </small>
                      <h2>
                        {boxLabel(box.map((e) => e.number))}
                        <span>
                          {boxOwned}/{box.length} ·{" "}
                          {percent(boxOwned, box.length)}%
                        </span>
                      </h2>
                    </div>
                  </div>
                  <div className="box-arrows">
                    <button
                      aria-label="Caja anterior"
                      disabled={current === 0}
                      onClick={() => move(-1)}
                    >
                      <ChevronLeft size={20} />
                    </button>
                    <select
                      aria-label="Seleccionar caja"
                      value={current}
                      onChange={(e) => setPage(Number(e.target.value))}
                    >
                      {Array.from({ length: pages }, (_, i) => (
                        <option key={i} value={i}>
                          Caja {i + 1} / {pages}
                        </option>
                      ))}
                    </select>
                    <button
                      aria-label="Caja siguiente"
                      disabled={current === pages - 1}
                      onClick={() => move(1)}
                    >
                      <ChevronRight size={20} />
                    </button>
                  </div>
                </header>
                <div
                  ref={viewportRef}
                  className="box-viewport"
                  tabIndex={0}
                  aria-label="Caja Pokémon. Usa izquierda y derecha para cambiar de caja."
                  onKeyDown={(e) => {
                    if (
                      e.target === e.currentTarget &&
                      ["ArrowLeft", "ArrowRight"].includes(e.key)
                    ) {
                      e.preventDefault();
                      move(e.key === "ArrowRight" ? 1 : -1);
                    }
                  }}
                  onTouchStart={(e) => {
                    touch.current = {
                      x: e.touches[0].clientX,
                      y: e.touches[0].clientY,
                    };
                  }}
                  onTouchEnd={(e) => {
                    if (touch.current) {
                      const dx = e.changedTouches[0].clientX - touch.current.x,
                        dy = e.changedTouches[0].clientY - touch.current.y;
                      if (
                        Math.abs(dx) > 60 &&
                        Math.abs(dx) > Math.abs(dy) * 1.5
                      )
                        move(dx < 0 ? 1 : -1);
                      touch.current = null;
                    }
                  }}
                >
                  <div
                    className="box-grid"
                    key={`${current}-${view}-${scope}`}
                    style={{ "--direction": direction } as React.CSSProperties}
                  >
                    {box.map(({ form: f, number }) => {
                      const s = speciesById.get(f.speciesId)!;
                      const c = countMap.get(f.id) ?? { normal: 0, shiny: 0 };
                      const shiny =
                        c.shiny > 0 &&
                        (prefs.sprite === "shiny" ||
                          (prefs.sprite === "automatic" &&
                            shinySelected.has(f.id)));
                      const owned =
                        view === "tracker"
                          ? caught.has(s.id)
                          : view === "collection"
                            ? c.normal + c.shiny > 0
                            : ownedSpecies.has(s.id);
                      return (
                        <article
                          key={f.id}
                          className={`pokemon-card ${owned ? "owned" : ""} ${detail?.id === f.id ? "active-card" : ""}`}
                        >
                          <div className="card-top">
                            <span>#{String(number).padStart(3, "0")}</span>
                            <button
                              title="Seleccionar visualización shiny (no cambia la cantidad)"
                              aria-label={`Seleccionar shiny de ${s.name}`}
                              aria-pressed={shinySelected.has(f.id)}
                              className={shinySelected.has(f.id) ? "gold" : ""}
                              onClick={() => {
                                toggleShiny(f.id);
                                void savePrefs({ sprite: "automatic" });
                              }}
                            >
                              <Sparkles size={15} />
                            </button>
                          </div>
                          <button
                            className="card-content"
                            onClick={() => setDetail(f)}
                            aria-label={`Abrir ${s.name}${f.label ? " " + f.label : ""}`}
                          >
                            <Sprite form={f} shiny={shiny} />
                            <strong>{s.name}</strong>
                            <span className="form-label">
                              {f.label || f.types.join(" · ")}
                            </span>
                          </button>
                          {view === "tracker" ? (
                            <button
                              className={`capture ${caught.has(s.id) ? "captured" : ""}`}
                              onClick={() =>
                                run(() =>
                                  setCaught(
                                    db,
                                    activeTracker!.id,
                                    s.id,
                                    !caught.has(s.id),
                                  ),
                                )
                              }
                            >
                              {caught.has(s.id) ? (
                                <Check size={14} />
                              ) : (
                                <Plus size={14} />
                              )}{" "}
                              {caught.has(s.id) ? "Capturado" : "Registrar"}
                            </button>
                          ) : view === "wiki" ? (
                            <button
                              className="wiki-open"
                              onClick={() => setDetail(f)}
                            >
                              Ver ficha <ArrowUpRight size={13} />
                            </button>
                          ) : (
                            <div className="counters">
                              {[false, true].map((isShiny) => {
                                const n = isShiny ? c.shiny : c.normal;
                                const locked =
                                  isShiny && f.shiny !== "available";
                                return (
                                  <div
                                    key={String(isShiny)}
                                    className={isShiny ? "shiny-counter" : ""}
                                    title={
                                      locked
                                        ? f.shiny === "locked"
                                          ? "Shiny no obtenible"
                                          : "Disponibilidad shiny pendiente de verificar"
                                        : isShiny
                                          ? "Ejemplares shiny"
                                          : "Ejemplares normales"
                                    }
                                  >
                                    <button
                                      aria-label={`Quitar ${isShiny ? "shiny" : "normal"} ${s.name}`}
                                      disabled={n === 0}
                                      onClick={() =>
                                        run(() =>
                                          changeCount(db, f, isShiny, -1),
                                        )
                                      }
                                    >
                                      −
                                    </button>
                                    <span>
                                      {isShiny ? "✧" : "◈"} {n}
                                    </span>
                                    <button
                                      aria-label={`Añadir ${isShiny ? "shiny" : "normal"} ${s.name}`}
                                      disabled={locked}
                                      onClick={() =>
                                        run(() =>
                                          changeCount(db, f, isShiny, 1),
                                        )
                                      }
                                    >
                                      +
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </article>
                      );
                    })}
                    {Array.from({ length: 30 - box.length }, (_, i) => (
                      <div key={`empty-${i}`} className="empty-slot">
                        <span>+</span>
                      </div>
                    ))}
                  </div>
                </div>
                <footer className="box-footer">
                  <span>
                    <span className="status-dot" /> {rows.length} entradas ·{" "}
                    {box.length} de 30 espacios
                  </span>
                  <div className="box-dots">
                    {Array.from({ length: Math.min(pages, 9) }, (_, i) => {
                      const n =
                        Math.max(0, Math.min(pages - 9, current - 4)) + i;
                      return (
                        <button
                          key={n}
                          className={n === current ? "active" : ""}
                          aria-label={`Ir a caja ${n + 1}`}
                          onClick={() => setPage(n)}
                        />
                      );
                    })}
                  </div>
                  <span>
                    ← →{" "}
                    <span className="desktop-hint">
                      Flechas, rueda o desliza
                    </span>
                  </span>
                </footer>
              </section>
              <p className="coverage-note">
                Catálogo inicial: {species.length} especies · {forms.length}{" "}
                formas seleccionadas. Cobertura de formas y disponibilidad shiny
                aún en revisión. <NavLink to="/settings">Ver alcance</NavLink>
              </p>
            </>
          )}
          {view === "stats" && (
            <section className="stats-grid">
              {[
                [
                  "Especies",
                  stats.species,
                  species.length,
                  "Al menos un ejemplar de cualquier forma.",
                ],
                [
                  "Formas",
                  stats.forms,
                  forms.length,
                  "Al menos un ejemplar normal o shiny de cada forma incluida.",
                ],
                [
                  "Shiny",
                  stats.shinyForms,
                  forms.filter((f) => f.shiny === "available").length,
                  "Formas con disponibilidad shiny confirmada.",
                ],
                [
                  "Ejemplares",
                  stats.total,
                  null,
                  "Cada ejemplar cuenta una vez; las copias no aumentan la completitud.",
                ],
              ].map(([name, value, total, description]) => (
                <article className="panel" key={String(name)}>
                  <h2>{name}</h2>
                  <strong className="big-number">
                    {value}
                    {total !== null && <small> / {total}</small>}
                  </strong>
                  <p>{description}</p>
                  {total !== null && (
                    <progress value={Number(value)} max={Number(total)} />
                  )}
                </article>
              ))}
              {trackers.map((t) => {
                const ids = new Set(
                  dexes
                    .filter((d) => t.scopeIds.includes(d.id))
                    .flatMap((d) => d.entries.map((e) => e.speciesId)),
                );
                const n = progress.filter(
                  (p) =>
                    p.trackerId === t.id &&
                    p.state === "caught" &&
                    ids.has(p.speciesId),
                ).length;
                return (
                  <article className="panel" key={t.id}>
                    <h2>{t.name}</h2>
                    <strong className="big-number">
                      {percent(n, ids.size)}%
                    </strong>
                    <p>
                      {n} / {ids.size} especies únicas en ámbitos visibles.
                    </p>
                  </article>
                );
              })}
            </section>
          )}
          {view === "settings" && (
            <section className="settings-grid">
              <article className="panel">
                <h2>Tu terminal</h2>
                <label>
                  Apariencia
                  <select
                    value={prefs.theme}
                    onChange={(e) =>
                      savePrefs({
                        theme: e.target.value as Preferences["theme"],
                      })
                    }
                  >
                    <option value="dark">Oscuro</option>
                    <option value="light">Claro</option>
                  </select>
                </label>
                <label>
                  Sprites
                  <select
                    value={prefs.sprite}
                    onChange={(e) =>
                      savePrefs({
                        sprite: e.target.value as Preferences["sprite"],
                      })
                    }
                  >
                    <option value="normal">Normal preferido</option>
                    <option value="shiny">Shiny si lo tengo</option>
                    <option value="automatic">
                      Según la estrella de cada tarjeta
                    </option>
                  </select>
                </label>
                <p>
                  La estrella solo selecciona la visualización. Los contadores
                  añaden y retiran ejemplares.
                </p>
              </article>
              <article className="panel">
                <h2>Copias de seguridad</h2>
                <p>
                  Tu colección reside en este navegador. Exporta una copia antes
                  de borrar sus datos o cambiar de dispositivo.
                </p>
                <button className="primary" onClick={() => run(backup)}>
                  <Download size={17} />
                  Exportar JSON
                </button>
                <label className="file-button">
                  <Upload size={17} />
                  Importar JSON
                  <input
                    aria-label="Importar copia JSON"
                    type="file"
                    accept=".json,application/json"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f)
                        void run(async () => {
                          if (f.size > 20_000_000)
                            throw new Error(
                              "Copia demasiado grande (máximo 20 MB).",
                            );
                          setPendingBackup(
                            validateBackup(JSON.parse(await f.text())),
                          );
                        });
                      e.target.value = "";
                    }}
                  />
                </label>
                <button
                  onClick={() =>
                    run(async () => {
                      const ok = await navigator.storage?.persist();
                      setNotice(
                        ok
                          ? "Almacenamiento persistente concedido."
                          : "El navegador no ha concedido almacenamiento persistente. Conserva copias externas.",
                      );
                    })
                  }
                >
                  Solicitar almacenamiento persistente
                </button>
              </article>
              <article className="panel wide">
                <h2>Alcance de esta versión</h2>
                <p>
                  Incluye especies de PokéAPI y formas base, regionales, Unown,
                  Deoxys, Burmy/Wormadam, Rotom, Deerling/Sawsbuck y Pichu
                  picoreja. No se afirma cobertura completa de formas ni
                  diferencias visuales por género. Las transformaciones de
                  batalla quedan fuera del inventario.
                </p>
                <p>
                  Las numeraciones regionales proceden de PokéAPI. La inclusión
                  en una Pokédex no demuestra dónde se captura una especie, ni
                  su compatibilidad con todas las formas. La Wiki muestra
                  pertenencia a Pokédex, no ubicaciones inventadas.
                </p>
                <p>
                  Disponibilidad shiny: confirmada para las formas base
                  incluidas de generaciones I–IV y sus familias seleccionadas;
                  Pichu picoreja está bloqueado. El resto permanece pendiente de
                  auditoría y no admite nuevas altas shiny. Las copias conservan
                  ejemplares previamente registrados salvo formas explícitamente
                  bloqueadas.
                </p>
                <p>
                  Datos:{" "}
                  <a
                    href="https://pokeapi.co/"
                    target="_blank"
                    rel="noreferrer"
                  >
                    PokéAPI
                  </a>
                  . Sprites: PokeAPI/sprites y sus colaboradores. Pokémon
                  pertenece a sus titulares. Proyecto no oficial.
                </p>
              </article>
            </section>
          )}
        </div>
      </main>
      {(create || editing) && (
        <TrackerEditor
          initial={editing}
          onClose={() => {
            setCreate(false);
            setEditing(null);
          }}
          onSave={(t) =>
            run(async () => {
              await db.trackers.put(t);
              setCreate(false);
              setEditing(null);
              navigate(`/tracker/${t.id}`);
            })
          }
        />
      )}
      {detail && (
        <Detail
          form={detail}
          specimens={specimens}
          tracker={activeTracker}
          onClose={() => setDetail(null)}
          onSelect={setDetail}
          onLink={(id) =>
            run(async () => {
              if (!activeTracker) return;
              const key = `${activeTracker.id}/${detail.speciesId}`;
              await db.transaction("rw", db.progress, async () => {
                const p = await db.progress.get(key);
                await db.progress.put({
                  id: key,
                  trackerId: activeTracker.id,
                  speciesId: detail.speciesId,
                  state: "caught",
                  specimenIds: [...new Set([...(p?.specimenIds ?? []), id])],
                });
              });
            })
          }
        />
      )}
      {pendingBackup && (
        <Modal title="Restaurar copia" onClose={() => setPendingBackup(null)}>
          <p>
            {pendingBackup.specimens.length} ejemplares ·{" "}
            {pendingBackup.trackers.length} Pokédexes. Validación completada.
          </p>
          <label>
            Modo
            <select
              value={importMode}
              onChange={(e) =>
                setImportMode(e.target.value as "merge" | "replace")
              }
            >
              <option value="merge">
                Fusionar por ID; rechazar conflictos
              </option>
              <option value="replace">
                Reemplazar todos los datos locales
              </option>
            </select>
          </label>
          {importMode === "replace" && (
            <p className="danger">
              Se eliminarán los datos actuales y se sustituirán por la copia.
              Exporta una copia antes de continuar.
            </p>
          )}
          <button onClick={() => run(backup)}>Exportar datos actuales</button>
          <button
            className="primary"
            onClick={() =>
              run(async () => {
                await importBackup(db, pendingBackup, importMode);
                setPendingBackup(null);
                setNotice("Copia importada correctamente.");
              })
            }
          >
            Confirmar {importMode === "replace" ? "reemplazo" : "fusión"}
          </button>
        </Modal>
      )}
      {deleteId && (
        <Modal title="Eliminar Pokédex" onClose={() => setDeleteId(null)}>
          <p>
            Se eliminará este tracker y su progreso. Los ejemplares de la
            colección global se conservan.
          </p>
          <button
            className="danger"
            onClick={() =>
              run(async () => {
                await deleteTracker(db, deleteId);
                setDeleteId(null);
                navigate("/collection");
              })
            }
          >
            Confirmar eliminación
          </button>
        </Modal>
      )}
    </div>
  );
}
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>,
);
