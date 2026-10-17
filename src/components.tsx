import React, { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { games, dexes, speciesById, formById } from "./catalog";
import type { Form, Tracker, Specimen } from "./domain";
import { validateTrackerName } from "./tracker-names";
import { PokedexDetail } from "./pokedex-detail";
import { contextualForms, encyclopediaForms } from "./encyclopedia";
export function Sprite({
  form,
  shiny = false,
  large = false,
}: {
  form: Form;
  shiny?: boolean;
  large?: boolean;
}) {
  const a = shiny ? form.shinyArt : form.art;
  return a ? (
    <span
      role="img"
      aria-label={`${speciesById.get(form.speciesId)?.name} ${form.label}${shiny ? " shiny" : ""}`}
      className={`sprite ${large ? "large" : ""}`}
      style={{
        backgroundImage: `url(${import.meta.env.BASE_URL}art/${a.sheet}.webp)`,
        backgroundPosition: `calc(-${a.index % 10} * var(--sprite-size, 96px)) calc(-${Math.floor(a.index / 10)} * var(--sprite-size, 96px))`,
      }}
    />
  ) : (
    <span className="no-art" title="Sprite pendiente de incorporar">
      ?
    </span>
  );
}
export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current!;
    d.showModal();
    return () => d.close();
  }, []);
  return (
    <dialog
      ref={ref}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <header>
        <h2>{title}</h2>
        <button aria-label="Cerrar" onClick={onClose}>
          <X size={20} />
        </button>
      </header>
      {children}
    </dialog>
  );
}
export function TrackerEditor({
  initial,
  onClose,
  onSave,
  trackers,
}: {
  trackers: Tracker[];
  initial: Tracker | null;
  onClose: () => void;
  onSave: (t: Tracker) => void;
}) {
  const [name, setName] = useState(initial?.name ?? ""),
    [gameId, setGameId] = useState(initial?.gameId ?? "emerald"),
    [scopeIds, setScopeIds] = useState(
      initial?.scopeIds ??
        games.find((g) => g.id === "emerald")!.scopes.slice(0, 1),
    ),
    [description, setDescription] = useState(initial?.description ?? ""),
    [theme, setTheme] = useState(initial?.theme ?? "#a5e7a0");
  const game = games.find((g) => g.id === gameId)!;
  const nameError = validateTrackerName(name, trackers, initial?.id);
  return (
    <Modal
      title={initial ? "Editar Pokédex" : "Una nueva aventura"}
      onClose={onClose}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!nameError && scopeIds.length)
            onSave({
              id: initial?.id ?? crypto.randomUUID(),
              name: name.trim(),
              gameId,
              scopeIds,
              description,
              theme,
            });
        }}
      >
        <p>Crea un registro independiente para cada partida o desafío.</p>
        <label>
          Nombre
          <input
            autoFocus
            required
            maxLength={80}
            placeholder="Emerald — Living Dex"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        {nameError && name.trim() && <p role="alert">{nameError}</p>}
        <label>
          Juego
          <select
            aria-label="Juego"
            disabled={!!initial}
            value={gameId}
            onChange={(e) => {
              setGameId(e.target.value);
              setScopeIds(
                games.find((g) => g.id === e.target.value)!.scopes.slice(0, 1),
              );
            }}
          >
            {games.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </label>
        <fieldset>
          <legend>Pokédexes visibles</legend>
          {game.scopes.map((id) => (
            <label className="checkbox" key={id}>
              <input
                type="checkbox"
                checked={scopeIds.includes(id)}
                onChange={(e) =>
                  setScopeIds((old) =>
                    e.target.checked
                      ? [...old, id]
                      : old.filter((x) => x !== id),
                  )
                }
              />
              {dexes.find((d) => d.id === id)?.name}
              <small>
                {dexes.find((d) => d.id === id)?.entries.length} especies
              </small>
            </label>
          ))}
        </fieldset>
        <p>
          Ocultar un ámbito conserva todas sus capturas. Debe quedar al menos
          uno visible.
        </p>
        <label>
          Descripción
          <textarea
            maxLength={1000}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
        <label>
          Color
          <input
            type="color"
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
          />
        </label>
        <button type="button" onClick={onClose}>Cancelar</button>
        <button className="primary" disabled={!!nameError || !scopeIds.length}>
          {initial ? "Guardar cambios" : "Crear Pokédex"}
        </button>
      </form>
    </Modal>
  );
}
export function Detail({
  form,
  tracker,
  specimens,
  onClose,
  onSelect,
  onLink,
}: {
  form: Form;
  tracker?: Tracker;
  specimens: Specimen[];
  onClose: () => void;
  onSelect: (f: Form) => void;
  onLink: (id: string) => void;
}) {
  const s = speciesById.get(form.speciesId)!;
  const family = contextualForms(s.id, tracker?.gameId ?? "");
  const numbers = dexes
    .filter((d) => !d.id.startsWith("national-"))
    .flatMap((d) => {
      const e = d.entries.find((e) => e.speciesId === s.id);
      return e ? [{ name: d.name, n: e.number }] : [];
    });
  return (
    <Modal
      title={`${s.name} · #${String(s.number).padStart(3, "0")}`}
      onClose={onClose}
    >
      <div className="detail-art">
        <Sprite form={form} large />
        <Sprite form={form} shiny large />
      </div>
      <label>
        Forma
        <select
          value={form.id}
          onChange={(e) =>
            onSelect(encyclopediaForms.find((f) => f.id === e.target.value)!)
          }
        >
          {family.map((f) => (
            <option key={f.id} value={f.id}>
              {f.label || "Base"}
            </option>
          ))}
        </select>
      </label>
      <dl>
        <dt>Nombre español</dt>
        <dd>{s.es}</dd>
        <dt>Generación</dt>
        <dd>{s.generation}</dd>
        <dt>Shiny</dt>
        <dd>
          {form.shiny === "available"
            ? "Disponible"
            : form.shiny === "locked"
              ? "No obtenible"
              : "Pendiente de verificar"}
        </dd>
        <dt>Clasificación</dt>
        <dd>
          {form.category} · {form.storage}
        </dd>
        <dt>Diferencias por género</dt>
        <dd>
          {s.genderDifference
            ? "Sí; desglose visual pendiente"
            : "No indicadas por la fuente"}
        </dd>
        <dt>Género</dt>
        <dd>
          {s.genderRate === -1
            ? "Sin género"
            : `${s.genderRate * 12.5}% hembra`}
        </dd>
        {form.gameRestrictions.length > 0 && (
          <>
            <dt>Restricción de forma</dt>
            <dd>{form.gameRestrictions.join(", ")}</dd>
          </>
        )}
      </dl>
      <PokedexDetail form={form} gameId={tracker?.gameId} onSelect={onSelect} />
      <details>
        <summary>Numeración por Pokédex</summary>
        <div className="dex-numbers">
          {numbers
            .filter(
              (d) =>
                !tracker ||
                dexes.some(
                  (def) =>
                    tracker.scopeIds.includes(def.id) && def.name === d.name,
                ),
            )
            .map((d) => (
              <span key={d.name}>
                {d.name}
                <b>#{d.n}</b>
              </span>
            ))}
        </div>
      </details>
      {tracker && (
        <>
          <h3>Vincular un ejemplar existente</h3>
          <p>
            Registra la especie en esta partida y enlaza el ejemplar sin
            duplicarlo.
          </p>
          {specimens
            .filter((p) => formById.get(p.formId)?.speciesId === s.id)
            .map((p) => (
              <button key={p.id} onClick={() => onLink(p.id)}>
                {p.shiny ? "✧ Shiny" : "◈ Normal"} · {p.id.slice(0, 8)} →{" "}
                {tracker.name}
              </button>
            ))}
          {!specimens.some(
            (p) => formById.get(p.formId)?.speciesId === s.id,
          ) && <p>Primero añade un ejemplar a la colección global.</p>}
        </>
      )}
    </Modal>
  );
}
