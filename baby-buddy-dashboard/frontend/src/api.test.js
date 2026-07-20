import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { api } from "./api";

/** api.js always calls the global fetch - stub it so every test in this file
 * runs with zero real network calls (per project constraint: mocked tests only). */
beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function jsonResponse(body, { status = 200 } = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  };
}

describe("api request building", () => {
  it("GETs against the local proxy path, not a direct Baby Buddy URL", async () => {
    fetch.mockResolvedValueOnce(jsonResponse({ results: [] }));
    await api.getChildren();
    expect(fetch).toHaveBeenCalledWith("./api/baby-buddy/children/", expect.any(Object));
  });

  it("serializes query params, dropping null/empty values", async () => {
    fetch.mockResolvedValueOnce(jsonResponse({ results: [] }));
    await api.getMedication({ child: 1, limit: 30, ordering: null, extra: "" });
    const [url] = fetch.mock.calls[0];
    expect(url).toBe("./api/baby-buddy/medication/?child=1&limit=30");
  });

  it("sends POST bodies as JSON with the right method", async () => {
    fetch.mockResolvedValueOnce(jsonResponse({ id: 1 }));
    await api.createNote({ note: "hi" });
    const [url, config] = fetch.mock.calls[0];
    expect(url).toBe("./api/baby-buddy/notes/");
    expect(config.method).toBe("POST");
    expect(config.body).toBe(JSON.stringify({ note: "hi" }));
  });

  it("sends DELETE requests to the entry's own URL", async () => {
    fetch.mockResolvedValueOnce({ ok: true, status: 204 });
    await api.deleteTemperature(42);
    const [url, config] = fetch.mock.calls[0];
    expect(url).toBe("./api/baby-buddy/temperature/42/");
    expect(config.method).toBe("DELETE");
  });

  it("returns null for a 204 No Content response", async () => {
    fetch.mockResolvedValueOnce({ ok: true, status: 204 });
    await expect(api.deleteNote(1)).resolves.toBeNull();
  });

  it("throws with the status code on a non-ok response", async () => {
    fetch.mockResolvedValueOnce(jsonResponse({ detail: "not found" }, { status: 404 }));
    await expect(api.getWeight()).rejects.toThrow(/API error 404/);
  });
});
