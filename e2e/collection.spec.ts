import { test, expect } from "@playwright/test";
test("collection, tracker numbering, backup, reload and offline", async ({
  page,
  context,
}) => {
  await page.goto("./");
  await page
    .getByRole("button", { name: "Añadir normal Bulbasaur", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Añadir normal Bulbasaur", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Añadir shiny Bulbasaur", exact: true })
    .click();
  await page.reload();
  const card = page.locator(".pokemon-card").first();
  await expect(card.locator(".counters")).toContainText("2");
  await expect(card.locator(".shiny-counter")).toContainText("1");
  await page
    .getByRole("button", { name: "Caja siguiente", exact: true })
    .click();
  await expect(page.locator(".box-title h2")).not.toContainText("001 – 030");
  await page
    .getByRole("button", { name: "Crear Pokédex", exact: true })
    .last()
    .click();
  await page.getByLabel("Nombre", { exact: true }).fill("Emerald — Test");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Crear Pokédex", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Emerald — Test." }),
  ).toBeVisible();
  await expect(page.locator(".pokemon-card").first()).toContainText("Treecko");
  await expect(page.locator(".pokemon-card").first()).toContainText("#001");
  await page
    .getByRole("button", { name: "Registrar", exact: true })
    .first()
    .click();
  await expect(
    page.getByRole("button", { name: "Capturado", exact: true }),
  ).toHaveCount(1);
  await page.getByRole("button", { name: "Editar ámbitos" }).click();
  await page.getByLabel("National").check();
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await page.getByLabel("Ámbito activo").selectOption("national-6");
  await expect(page.locator(".pokemon-card").first()).toContainText(
    "Bulbasaur",
  );
  await page.getByRole("button", { name: "Editar ámbitos" }).click();
  await page.getByLabel("National").uncheck();
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(
    page.getByRole("button", { name: "Capturado", exact: true }),
  ).toHaveCount(1);
  await page.getByRole("link", { name: "Ajustes", exact: true }).click();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exportar JSON" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/dexarium.*json/);
  await page
    .getByLabel("Importar copia JSON")
    .setInputFiles((await download.path())!);
  await page.getByRole("button", { name: "Confirmar fusión" }).click();
  await expect(page.getByRole("status")).toContainText("Copia importada");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await context.setOffline(true);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Ajustes y copias." }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Colección global", exact: false })
    .click();
  await expect(
    page.locator(".pokemon-card").first().locator(".counters"),
  ).toContainText("2");
  await page.screenshot({ path: "test-results/desktop.png", fullPage: true });
});
test("mobile and keyboard navigation", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("./");
  await expect(page.locator(".pokemon-card")).toHaveCount(30);
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
  const box = page.getByLabel(
    "Caja Pokémon. Usa izquierda y derecha para cambiar de caja.",
    { exact: true },
  );
  await box.focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByLabel("Seleccionar caja")).toHaveValue("1");
  await page.screenshot({ path: "test-results/mobile.png", fullPage: true });
});

test("all local sprite atlases decode, search, wiki and light theme work", async ({
  page,
}) => {
  await page.goto("./");
  const images = await page.evaluate(async () =>
    Promise.all(
      Array.from({ length: 19 }, async (_, i) => {
        const image = new Image();
        image.src = `/Dexarium/art/${i}.webp`;
        await image.decode();
        return { width: image.naturalWidth, height: image.naturalHeight };
      }),
    ),
  );
  expect(images.every((i) => i.width === 960 && i.height === 1152)).toBe(true);
  await page.getByRole("button", { name: "Cambiar tema" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.getByLabel("Buscar Pokémon").fill("spiky");
  await expect(page.locator(".pokemon-card")).toHaveCount(1);
  await expect(
    page.getByRole("button", { name: "Añadir shiny Pichu", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Abrir Pichu Spiky Eared", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText("No obtenible");
  await page.getByRole("button", { name: "Cerrar", exact: true }).click();
  await page.getByLabel("Buscar Pokémon").fill("");
  await page.getByRole("link", { name: "Pokédex", exact: true }).click();
  await page
    .getByRole("button", { name: "Abrir Bulbasaur", exact: true })
    .click();
  await page.getByRole("tab", { name: "Evolución", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("Relaciones evolutivas");
  await page.getByRole("button", { name: "Cerrar", exact: true }).click();
  await page.screenshot({ path: "test-results/light.png", fullPage: true });
});
