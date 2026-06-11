import { describe, expect, it, vi } from "vitest";
import { logServerError } from "./log-server-error";

describe("logServerError", () => {
	it("logs the 500 message with the Error message as reason", () => {
		const error = vi.fn();
		logServerError({ logger: { error }, error: new Error("kaboom"), path: "/oops" });
		expect(error).toHaveBeenCalledWith({
			message: "Unhandled server error (500)",
			context: { path: "/oops", reason: "kaboom" },
		});
	});

	it("stringifies non-Error values", () => {
		const error = vi.fn();
		logServerError({ logger: { error }, error: "boom string", path: "/x" });
		expect(error).toHaveBeenCalledWith(expect.objectContaining({ context: { path: "/x", reason: "boom string" } }));
	});

	it("falls back to 'unknown' for nullish errors", () => {
		const error = vi.fn();
		logServerError({ logger: { error }, error: undefined, path: "/y" });
		expect(error).toHaveBeenCalledWith(expect.objectContaining({ context: { path: "/y", reason: "unknown" } }));
	});
});
