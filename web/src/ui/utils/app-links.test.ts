import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PLAY_STORE_URL } from "./app-links";

const APPLICATION_ID = /applicationId\s*=\s*"([^"]+)"/;

describe("app-links", () => {
	it("points at the id the Flutter app actually ships under, not a string typed twice", () => {
		const gradle = readFileSync(new URL("../../../../app/android/app/build.gradle.kts", import.meta.url), "utf8");
		const applicationId = gradle.match(APPLICATION_ID)?.[1];

		expect(applicationId).toBeDefined();
		expect(new URL(PLAY_STORE_URL).searchParams.get("id")).toBe(applicationId);
	});
});
