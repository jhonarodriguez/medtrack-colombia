import { chromium, type Browser, type BrowserContext, type Page } from "playwright";

const TIMEOUT = parseInt(process.env.PLAYWRIGHT_TIMEOUT ?? "20000");

let browser: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (!browser || !browser.isConnected()) {
    browser = await chromium.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
      ],
    });
  }
  return browser;
}

export async function closeBrowser(): Promise<void> {
  if (browser?.isConnected()) {
    await browser.close();
    browser = null;
  }
}

async function newContext(): Promise<BrowserContext> {
  const b = await getBrowser();
  return b.newContext({
    locale: "es-CO",
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    extraHTTPHeaders: {
      "Accept-Language": "es-CO,es;q=0.9",
    },
  });
}

export interface ScrapedProduct {
  nombre: string;
  presentacion?: string;
  precio: number;
  disponible: boolean;
  urlProducto?: string;
  laboratorio?: string;
}

// ─── Función principal de scraping ───────────────────────────────────────────

/**
 * Navega a una URL, espera a que cargue y extrae datos usando la función
 * `extractFn` que se ejecuta en el contexto de la página.
 */
export async function scrapeWithPlaywright<T>(
  url: string,
  extractFn: (page: Page) => Promise<T>,
  options: {
    waitForSelector?: string;
    waitForTimeout?: number;
  } = {}
): Promise<T> {
  const ctx = await newContext();
  const page = await ctx.newPage();

  try {
    await page.route("**/*.{png,jpg,jpeg,gif,svg,woff,woff2,ttf,css}", (route) =>
      route.abort()
    );
    await page.route("**/{analytics,tracking,ads,gtm}**", (route) =>
      route.abort()
    );

    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: TIMEOUT,
    });

    if (options.waitForSelector) {
      await page.waitForSelector(options.waitForSelector, {
        timeout: TIMEOUT,
      });
    } else if (options.waitForTimeout) {
      await page.waitForTimeout(options.waitForTimeout);
    }

    return await extractFn(page);
  } finally {
    await page.close();
    await ctx.close();
  }
}
