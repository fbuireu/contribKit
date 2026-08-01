import { network } from "@domain/failures/failure";
import { describe, expect, it, vi } from "vitest";
import { loadInitialContributions } from "./load-initial-contributions";

const calendar = {
	username: "torvalds",
	days: [{ date: "2024-06-15", level: 4, count: 16 }],
	total: 1234,
};

describe("loadInitialContributions", () => {
	it("returns the built grid on success", async () => {
		const loadContributions = vi.fn().mockResolvedValue(calendar);
		const result = await loadInitialContributions(loadContributions)({ username: "torvalds", year: 2024 });
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.data.total).toBe(1234);
			expect(result.data.days).toHaveLength(53 * 7);
		}
	});

	it("passes a repository failure through as status + message", async () => {
		const loadContributions = vi.fn().mockResolvedValue(network({ message: "github is down" }));
		const result = await loadInitialContributions(loadContributions)({ username: "torvalds" });
		expect(result).toEqual({ ok: false, kind: "Network", status: 502, message: "github is down" });
	});

	it("rejects an invalid username before calling the repository", async () => {
		const loadContributions = vi.fn();
		const result = await loadInitialContributions(loadContributions)({ username: "a b c!" });
		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.kind).toBe("InvalidInput");
		expect(loadContributions).not.toHaveBeenCalled();
	});
});
