import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { USERNAME_COOKIE } from "../../../utils/cookie";
import { CONSENT_COOKIE_NAME, config } from "./config";

const { acceptedCategory } = vi.hoisted(() => ({ acceptedCategory: vi.fn() }));
vi.mock("vanilla-cookieconsent", () => ({ acceptedCategory }));

describe("cookie consent config", () => {
	it("names the consent cookie the inline analytics gate reads, rather than trusting the library default", () => {
		expect(config.cookie?.name).toBe(CONSENT_COOKIE_NAME);
	});

	it("marks necessary as enabled and read-only", () => {
		expect(config.categories?.necessary).toMatchObject({ enabled: true, readOnly: true });
	});

	it("declares the ga4 and betterstack analytics services", () => {
		expect(Object.keys(config.categories?.analytics?.services ?? {})).toEqual(
			expect.arrayContaining(["ga4", "betterstack"]),
		);
	});

	it("auto-clears Google and Better Stack cookies", () => {
		const names = (config.categories?.analytics?.autoClear?.cookies ?? []).map((cookie) => String(cookie.name));
		expect(names).toEqual(expect.arrayContaining(["/^_ga/", "_gid", "/^bs_/"]));
	});

	it("documents the username cookie under the name cookie.ts writes, for a week, in the necessary table", () => {
		const en = config.language.translations.en;
		if (typeof en !== "object") throw new Error("expected an inline 'en' translation object");
		const necessary = en.preferencesModal?.sections?.find((section) => section.linkedCategory === "necessary");
		const usernameCookie = necessary?.cookieTable?.body?.find((row) => row.name === USERNAME_COOKIE);
		expect(usernameCookie?.expiration).toBe("1 week");
	});
});

describe("config.onChange", () => {
	const reload = vi.fn();

	beforeEach(() => {
		acceptedCategory.mockReset();
		reload.mockClear();
		vi.stubGlobal("location", { reload });
	});

	afterEach(() => vi.unstubAllGlobals());

	interface FireParams {
		changedCategories: string[];
		changedServices?: Record<string, unknown>;
	}

	const fire = ({ changedCategories, changedServices = {} }: FireParams) =>
		config.onChange?.({ changedCategories, changedServices, cookie: {} } as never);

	it("reloads when analytics is toggled off", () => {
		acceptedCategory.mockReturnValue(false);
		fire({ changedCategories: ["analytics"] });
		expect(reload).toHaveBeenCalledOnce();
	});

	it("does not reload when analytics stays accepted", () => {
		acceptedCategory.mockReturnValue(true);
		fire({ changedCategories: ["analytics"] });
		expect(reload).not.toHaveBeenCalled();
	});

	it("ignores changes unrelated to analytics", () => {
		fire({ changedCategories: ["necessary"] });
		expect(acceptedCategory).not.toHaveBeenCalled();
		expect(reload).not.toHaveBeenCalled();
	});
});
