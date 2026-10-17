import { test, expect } from "@playwright/test";
for (const [width, height] of [
  [1280, 720],
  [1366, 768],
  [1600, 900],
  [1920, 1080],
  [2560, 1440],
]) {
  test(`all 30 slots and controls fit ${width}x${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.goto("./");
    await expect(page.locator(".pokemon-card")).toHaveCount(30);
    const geometry = await page.evaluate(() => ({
      width: document.documentElement.scrollWidth,
      height: document.documentElement.scrollHeight,
      slots: [
        ...document.querySelectorAll(
          ".pokemon-card, .counters button, .card-content strong, .box-footer, .box-header",
        ),
      ].map((el) => {
        const r = el.getBoundingClientRect();
        return {
          top: r.top,
          bottom: r.bottom,
          left: r.left,
          right: r.right,
          width: r.width,
          height: r.height,
        };
      }),
    }));
    expect(geometry.width).toBeLessThanOrEqual(width);
    expect(geometry.height).toBeLessThanOrEqual(height);
    expect(
      geometry.slots.every(
        (r) =>
          r.top >= 0 &&
          r.bottom <= height &&
          r.left >= 0 &&
          r.right <= width &&
          r.height > 0,
      ),
    ).toBe(true);
    const clickable = await page
      .locator(".counters button:enabled")
      .evaluateAll((buttons) =>
        buttons.every((button) => {
          const r = button.getBoundingClientRect();
          return button.contains(
            document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2),
          );
        }),
      );
    expect(clickable).toBe(true);
    await page.getByRole("button", { name: "Filtros", exact: true }).click();
    await expect(page.locator(".filters")).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollHeight),
    ).toBeLessThanOrEqual(height);
    await page.getByRole("button", { name: "Filtros", exact: true }).click();
    if (width === 1280 || width === 1920)
      await page.screenshot({ path: `test-results/box-${width}.png` });
  });
}
test("encyclopedia stats, branches, versioned encounters, old route and offline chunks", async ({
  page,
  context,
}) => {
  await page.goto("./#/wiki");
  await expect(
    page.getByRole("heading", { name: "Pokédex.", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Abrir Bulbasaur", exact: true })
    .click();
  await page.getByRole("tab", { name: "Stats", exact: true }).click();
  await expect(page.locator(".stat-total")).toContainText("318");
  await page.getByRole("button", { name: "Cerrar", exact: true }).click();
  await page.getByLabel("Buscar Pokémon").fill("Eevee");
  await page.getByRole("button", { name: "Abrir Eevee", exact: true }).click();
  await page.getByRole("tab", { name: "Evolución", exact: true }).click();
  await expect(page.locator(".evolution-tree")).toContainText("Sylveon");
  await page.getByLabel("Contexto de juego").selectOption("red");
  await expect(page.locator(".evolution-tree")).not.toContainText("Sylveon");
  await expect(page.locator(".evolution-tree")).toContainText("Piedra Agua");
  await page.getByRole("button", { name: "Cerrar", exact: true }).click();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await context.setOffline(true);
  await page.reload();
  await page.getByLabel("Buscar Pokémon").fill("Pikachu");
  await page
    .getByRole("button", { name: "Abrir Pikachu", exact: true })
    .click();
  await page.getByLabel("Contexto de juego").selectOption("red");
  await page.getByRole("tab", { name: "Cómo obtener", exact: true }).click();
  await expect(page.locator(".encounter-list")).toContainText("Viridian");
  await page.getByLabel("Contexto de juego").selectOption("scarlet");
  await expect(page.getByRole("tabpanel")).toContainText(
    "Sin encuentros documentados",
  );
});

test("short landscape viewports scroll inside the box without clipping controls", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 600 });
  await page.goto("./");
  const box = page.locator(".box-viewport");
  const geometry = await box.evaluate((el) => ({
    height: document.documentElement.scrollHeight,
    scrollable: el.scrollHeight > el.clientHeight,
  }));
  expect(geometry.height).toBeLessThanOrEqual(600);
  expect(geometry.scrollable).toBe(true);
  await page
    .locator(".pokemon-card")
    .last()
    .getByRole("button", { name: /^Añadir normal/ })
    .click();
  await expect(page.locator(".box-header")).toBeInViewport();
  await expect(page.locator(".box-footer")).toBeInViewport();
});

test("regional completion ignores global ownership and keeps all slots visible", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("./");
  await page
    .getByRole("button", { name: "Añadir normal Bulbasaur", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Crear Pokédex", exact: true })
    .last()
    .click();
  await page.getByLabel("Nombre", { exact: true }).fill("Hoenn regional");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Crear Pokédex", exact: true })
    .click();
  await expect(page.locator(".completion strong")).toContainText("0 / 202");
  await expect(page.locator(".pokemon-card").first()).toContainText("Treecko");
  await page
    .getByRole("button", { name: "Registrar", exact: true })
    .first()
    .click();
  await expect(page.locator(".completion strong")).toContainText("1 / 202");
  await expect(page.locator(".completion")).toContainText("0%");
  expect(
    await page.evaluate(() => document.documentElement.scrollHeight),
  ).toBeLessThanOrEqual(720);
  const cards = await page
    .locator(".pokemon-card")
    .evaluateAll((els) => els.map((el) => el.getBoundingClientRect().bottom));
  expect(cards.every((bottom) => bottom <= 720)).toBe(true);
  await page
    .getByRole("button", { name: "Abrir Treecko", exact: true })
    .click();
  await expect(page.getByLabel("Contexto de juego")).toHaveValue("emerald");
  await expect(page.getByLabel("Contexto de juego")).toBeDisabled();
  await page.getByRole("tab", { name: "Evolución", exact: true }).click();
  await expect(page.getByRole("tabpanel")).toContainText("Nivel mínimo: 16");
  await expect(page.getByRole("tabpanel")).toContainText("Nivel mínimo: 36");
  await page.getByRole("tab", { name: "Cómo obtener", exact: true }).click();
  await expect(page.locator(".acquisition-list")).toContainText(
    "Elección de Pokémon inicial",
  );
  await expect(page.locator(".acquisition-list")).toContainText("Ruta 101");
});

test("historical tracker type filters agree with Pokémon details", async ({
  page,
}) => {
  await page.goto("./");
  await page
    .getByRole("button", { name: "Crear Pokédex", exact: true })
    .last()
    .click();
  await page.getByLabel("Nombre", { exact: true }).fill("Kanto histórico");
  await page.getByLabel("Juego", { exact: true }).selectOption("red");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Crear Pokédex", exact: true })
    .click();
  await page.getByLabel("Buscar Pokémon").fill("Clefairy");
  await expect(page.locator(".pokemon-card")).toHaveCount(1);
  await expect(page.locator(".form-label")).toHaveText("Normal");
  await page.getByRole("button", { name: "Filtros", exact: true }).click();
  await page.getByLabel("Tipo", { exact: true }).selectOption("Hada");
  await expect(page.locator(".pokemon-card")).toHaveCount(0);
  await page.getByLabel("Tipo", { exact: true }).selectOption("Normal");
  await expect(page.locator(".pokemon-card")).toHaveCount(1);
  await expect(page.locator(".empty-slot")).toHaveCount(29);
});
