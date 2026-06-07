import { describe, expect, it } from "vitest";
import { PLAY_STORE_URL } from "./app-links";

describe("app-links", () => {
	it("points to the ContribKit Play Store listing", () => {
		expect(PLAY_STORE_URL).toBe("https://play.google.com/store/apps/details?id=com.fbuireu.contribkit");
	});
});
