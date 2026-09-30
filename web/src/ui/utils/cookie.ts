import { nonBlank } from "./non-blank";

export const USERNAME_COOKIE = "ck_user";
const ONE_WEEK = 60 * 60 * 24 * 7;

const USERNAME_COOKIE_VALUE = new RegExp(`(?:^|; )${USERNAME_COOKIE}=([^;]*)`);

const decoded = (raw: string): string | null => {
	try {
		return decodeURIComponent(raw);
	} catch {
		return null;
	}
};

const readFromDocument = (): string | null => {
	if (typeof document === "undefined") return null;
	const match = document.cookie.match(USERNAME_COOKIE_VALUE);
	return match ? nonBlank(decoded(match[1])) : null;
};

const writeToDocument = (username: string): void => {
	if (typeof document === "undefined") return;
	document.cookie = `${USERNAME_COOKIE}=${encodeURIComponent(username)}; max-age=${ONE_WEEK}; path=/; samesite=lax`;
};

export async function readUsernameCookie(): Promise<string | null> {
	try {
		if (globalThis.cookieStore) {
			const cookie = await cookieStore.get(USERNAME_COOKIE);
			return nonBlank(cookie?.value);
		}
	} catch {
		return null;
	}
	return readFromDocument();
}

export async function writeUsernameCookie(username: string): Promise<void> {
	try {
		if (globalThis.cookieStore) {
			await cookieStore.set({
				name: USERNAME_COOKIE,
				value: username,
				expires: Date.now() + ONE_WEEK * 1000,
				path: "/",
				sameSite: "lax",
			});
			return;
		}
	} catch {
		return;
	}
	writeToDocument(username);
}

export async function seedUsernameCookie(username: string): Promise<void> {
	if (!(await readUsernameCookie())) await writeUsernameCookie(username);
}
