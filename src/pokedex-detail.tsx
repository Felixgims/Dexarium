import { useEffect, useState } from "react";
import type { Form } from "./domain";
import { speciesById, baseForms, games } from "./catalog";
import {
  encyclopedia,
  contextualForms,
  evolutionFamily,
  evolutionRules,
  baseStats,
  loadEncounters,
  gameSpecies,
  formTypes,
  formExistsInGeneration,
  acquisitionMethods,
  encyclopediaForms,
  type Encounter,
} from "./encyclopedia";
import { Sprite } from "./components";
const tabs = ["Resumen", "Stats", "Evolución", "Cómo obtener", "Formas"];
export function PokedexDetail({
  form,
  gameId: initialGame = "",
  onSelect,
}: {
  form: Form;
  gameId?: string;
  onSelect: (f: Form) => void;
}) {
  const [tab, setTab] = useState("Resumen");
  const [gameId, setGameId] = useState(initialGame);
  const [encounters, setEncounters] = useState<Encounter[] | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => setGameId(initialGame), [initialGame]);
  const s = speciesById.get(form.speciesId)!;
  const data = encyclopedia.details[form.id];
  const generation = gameId ? encyclopedia.games[gameId].generation : null;
  const absent = generation !== null && s.generation > generation;
  const unverifiedForm =
    !!gameId && !contextualForms(s.id, gameId).some((f) => f.id === form.id);
  const stats = absent || unverifiedForm ? null : baseStats(form.id, gameId);
  const acquisitions = acquisitionMethods(form.id, gameId);
  const unavailable = absent || !formExistsInGeneration(form.id, gameId);
  const family = evolutionFamily(s.id, gameId);
  const selectedRules = evolutionRules(
    s.id,
    gameId,
    undefined,
    form.category === "base" ? undefined : form.id,
  );
  const chainForm = (id: string) => {
    if (id === s.id) return form;
    const parentForms = new Set(
      selectedRules.map((r) => r.fromForm).filter(Boolean),
    );
    if (id === s.evolvesFrom && parentForms.size === 1)
      return (
        encyclopediaForms.find((f) => f.id === [...parentForms][0]) ??
        baseForms.get(id)!
      );
    return baseForms.get(id)!;
  };
  const description = encyclopedia.flavor[String(s.number)];
  useEffect(() => {
    let cancelled = false;
    setEncounters(null);
    setFailed(false);
    if (gameId && data)
      loadEncounters(gameId, data.pokemon)
        .then((rows) => {
          if (!cancelled) setEncounters(rows);
        })
        .catch(() => {
          if (!cancelled) setFailed(true);
        });
    return () => {
      cancelled = true;
    };
  }, [gameId, data?.pokemon]);
  return (
    <section className="encyclopedia-detail">
      <label>
        Contexto de juego
        <select
          aria-label="Contexto de juego"
          value={gameId}
          disabled={!!initialGame}
          onChange={(e) => setGameId(e.target.value)}
        >
          <option value="">Enciclopedia general · datos actuales</option>
          {games.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
      </label>
      {!absent && !unverifiedForm && (
        <div className="type-tags">
          {formTypes(form.id, gameId).map((t) => (
            <span key={t}>{t}</span>
          ))}
        </div>
      )}
      {absent ? (
        <p className="notice">Esta especie todavía no existía en este juego.</p>
      ) : (
        gameId && (
          <p className="data-context">
            {gameSpecies(gameId, s.id)
              ? "Especie incluida en una Pokédex de este juego."
              : "Sin pertenencia documentada a una Pokédex de este juego; esto no demuestra que sea incompatible."}{" "}
            La pertenencia no garantiza encuentros ni compatibilidad de todas
            las formas.
          </p>
        )
      )}
      {unverifiedForm && (
        <p className="notice">
          No hay datos verificados de esta forma para este juego.
        </p>
      )}
      <div
        className="detail-tabs"
        role="tablist"
        aria-label="Información Pokémon"
      >
        {tabs.map((t, index) => (
          <button
            key={t}
            id={`tab-${index}`}
            role="tab"
            aria-selected={tab === t}
            aria-controls="pokedex-panel"
            tabIndex={tab === t ? 0 : -1}
            onKeyDown={(e) => {
              if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key))
                return;
              e.preventDefault();
              const next =
                e.key === "Home"
                  ? 0
                  : e.key === "End"
                    ? tabs.length - 1
                    : (index +
                        (e.key === "ArrowRight" ? 1 : -1) +
                        tabs.length) %
                      tabs.length;
              setTab(tabs[next]);
              document.getElementById(`tab-${next}`)?.focus();
            }}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>
      <div
        id="pokedex-panel"
        role="tabpanel"
        aria-labelledby={`tab-${tabs.indexOf(tab)}`}
      >
        {tab === "Resumen" && (
          <>
            <p>
              {gameId
                ? (description?.[gameId] ??
                  "Descripción no disponible para esta versión.")
                : (Object.values(description ?? {}).at(-1) ??
                  "Descripción no disponible.")}
            </p>
            <dl>
              <dt>Categoría de especie</dt>
              <dd>{data?.genus ?? "Datos no disponibles"}</dd>
              <dt>Altura</dt>
              <dd>{data ? `${data.height} m` : "Datos no disponibles"}</dd>
              <dt>Peso</dt>
              <dd>{data ? `${data.weight} kg` : "Datos no disponibles"}</dd>
              <dt>Habilidades</dt>
              <dd>
                {gameId
                  ? generation! < 3
                    ? "Este juego no utiliza habilidades."
                    : "Historial de habilidades por juego no disponible."
                  : data?.abilities.map((a, i) => (
                      <span key={i} className="ability">
                        {a.name}
                        {a.hidden ? " (oculta)" : ""}
                      </span>
                    ))}
              </dd>
              <dt>Diferencias de género</dt>
              <dd>
                {s.genderDifference
                  ? "La especie presenta diferencias visuales por género."
                  : "Sin diferencias visuales indicadas."}
              </dd>
            </dl>
          </>
        )}
        {tab === "Stats" && (
          <>
            <h3>
              Estadísticas base{" "}
              {gameId
                ? `· ${games.find((g) => g.id === gameId)?.name}`
                : "· catálogo actual"}
            </h3>
            {stats ? (
              <>
                <div className="stat-bars">
                  {[
                    "PS",
                    "Ataque",
                    "Defensa",
                    "Ataque especial",
                    "Defensa especial",
                    "Velocidad",
                  ].map((name, i) => (
                    <div key={name}>
                      <span>{name}</span>
                      <meter
                        aria-label={name}
                        min={0}
                        max={255}
                        value={stats[i]}
                      />
                      <b>{stats[i]}</b>
                    </div>
                  ))}
                </div>
                <p className="stat-total">
                  Total base <strong>{stats.reduce((a, b) => a + b, 0)}</strong>
                </p>
                <p>
                  Escala común de 0–255. No incluye IV, EV, naturaleza ni nivel.
                </p>
              </>
            ) : (
              <p>
                {generation === 1
                  ? "La primera generación usa una única estadística Especial. No se muestran las seis estadísticas modernas para evitar una comparación incorrecta."
                  : "Estadísticas verificadas no disponibles para este contexto."}
              </p>
            )}
          </>
        )}
        {tab === "Evolución" && (
          <>
            <h3>Relaciones evolutivas</h3>
            <div className="evolution-tree">
              {family.map((p) => {
                const parent = family.find((f) => f.id === p.evolvesFrom);
                const displayed = chainForm(p.id);
                const rules = parent
                  ? evolutionRules(
                      p.id,
                      gameId,
                      chainForm(parent.id).id,
                      displayed.category === "base" ? undefined : displayed.id,
                    )
                  : [];
                return (
                  <article
                    key={p.id}
                    className={p.id === s.id ? "current-evolution" : ""}
                  >
                    {parent && (
                      <div className="evolution-condition">
                        <b>
                          {parent.name} → {p.name}
                        </b>
                        {rules.length ? (
                          rules.map((r, i) => (
                            <p key={i}>
                              {r.conditions.join(" · ")}
                              {!gameId && (
                                <small>
                                  {games
                                    .filter(
                                      (g) =>
                                        encyclopedia.games[g.id]?.group ===
                                        r.group,
                                    )
                                    .map((g) => g.name)
                                    .join(" / ") ||
                                    "Regla documentada; consulta la versión del juego."}
                                </small>
                              )}
                            </p>
                          ))
                        ) : (
                          <p>Método evolutivo no disponible para este juego.</p>
                        )}
                      </div>
                    )}
                    <button onClick={() => onSelect(displayed)}>
                      <Sprite form={displayed} />
                      <span>
                        #{p.number} {p.name} {displayed.label}
                      </span>
                    </button>
                  </article>
                );
              })}
            </div>
            {family.length === 1 && (
              <p>No hay otras etapas documentadas en este contexto.</p>
            )}
            <p>
              Las ramas representan especies; las formas alternativas no son
              etapas independientes. En juegos con catálogo limitado solo se
              muestran especies con pertenencia documentada.
            </p>
          </>
        )}
        {tab === "Cómo obtener" && (
          <>
            <h3>
              Encuentros y obtención
              {gameId
                ? ` · ${encyclopedia.games[gameId].regions.join(" / ")}`
                : ""}
            </h3>
            {acquisitions.length > 0 && !unverifiedForm && (
              <div className="acquisition-list">
                {acquisitions.map((a) => (
                  <article key={`${a.method}-${a.area}`}>
                    <strong>{a.method}</strong>
                    <span>{a.area}</span>
                    <p>{a.conditions}</p>
                  </article>
                ))}
              </div>
            )}
            {!gameId ? (
              <p>
                Selecciona un juego para consultar encuentros específicos de esa
                versión.
              </p>
            ) : unavailable || unverifiedForm ? (
              <p>
                No hay encuentros verificables para esta especie o forma en este
                contexto.
              </p>
            ) : failed ? (
              <p role="alert">
                No se pudo cargar el conjunto local de encuentros. Recarga
                cuando la instalación offline haya terminado.
              </p>
            ) : encounters === null ? (
              <p>Cargando datos locales…</p>
            ) : encounters.length ? (
              <>
                <p>
                  Encuentros documentados para{" "}
                  {games.find((g) => g.id === gameId)?.name}. Las condiciones se
                  mantienen separadas. No se estiman tasas de aparición.
                </p>
                <div className="encounter-list">
                  {encounters.map((e, i) => (
                    <article key={i}>
                      <strong>{e.area}</strong>
                      <span>
                        {e.method} · Nivel {e.min}
                        {e.min !== e.max ? `–${e.max}` : ""}
                      </span>
                      {e.conditions && <small>{e.conditions}</small>}
                    </article>
                  ))}
                </div>
              </>
            ) : acquisitions.length ? (
              <p>No hay otros encuentros documentados en la fuente local.</p>
            ) : (
              <p>
                Sin encuentros documentados para esta versión. Esto no implica
                que sea imposible obtenerlo.
              </p>
            )}
            {!!gameId && !absent && !unverifiedForm && s.evolvesFrom && (
              <>
                <h3>Obtención por evolución</h3>
                {selectedRules.length ? (
                  selectedRules.map((r, i) => (
                    <p key={i}>
                      {speciesById.get(s.evolvesFrom!)?.name} → {s.name}:{" "}
                      {r.conditions.join(" · ")}
                    </p>
                  ))
                ) : (
                  <p>Método no verificado para esta versión.</p>
                )}
              </>
            )}
            <p>
              La fuente de encuentros no cubre todos los regalos, fósiles,
              crianza, intercambios internos, eventos o transferencias. No se
              deduce disponibilidad ni exclusividad a partir de datos ausentes.
            </p>
          </>
        )}
        {tab === "Formas" && (
          <>
            <h3>Formas de {s.name}</h3>
            {contextualForms(s.id, gameId).map((f) => (
              <button
                className="form-choice"
                key={f.id}
                onClick={() => onSelect(f)}
                aria-pressed={form.id === f.id}
              >
                {f.label || "Base"} ·{" "}
                {f.category === "battle"
                  ? "Transformación de combate"
                  : f.category === "regional"
                    ? "Regional"
                    : f.category === "cosmetic"
                      ? "Variante visual; consultar stats"
                      : f.category}
              </button>
            ))}
            <p>
              Normal y shiny son variantes visuales de la misma forma. Las
              transformaciones de combate se consultan en la enciclopedia sin
              añadirlas al inventario. El catálogo de formas sigue siendo
              parcial; con un juego seleccionado se ocultan las formas
              alternativas sin compatibilidad verificada.
            </p>
          </>
        )}
      </div>
      <p className="data-source">
        Datos locales de PokéAPI · revisión {encyclopedia.source.slice(0, 8)}.
        {acquisitions.length > 0 &&
          " Selección inicial: suplemento verificado de Pokémon Database."}
        Las lagunas se indican explícitamente.
      </p>
    </section>
  );
}
