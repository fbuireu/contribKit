export const USERNAME_COOKIE = "ck_user";
const ONE_WEEK = 60 * 60 * 24 * 7;

const USERNAME_COOKIE_VALUE = new RegExp(`(?:^|; )${USERNAME_COOKIE}=([^;]*)`);

const readFromDocument = (): string | null => {
	if (typeof document === "undefined") return null;
	const match = document.cookie.match(USERNAME_COOKIE_VALUE);
	return match ? decodeURIComponent(match[1]).trim() || null : null;
};

const writeToDocument = (username: string): void => {
	if (typeof document === "undefined") return;
	document.cookie = `${USERNAME_COOKIE}=${encodeURIComponent(username)}; max-age=${ONE_WEEK}; path=/; samesite=lax`;
};

export async function readUsernameCookie(): Promise<string | null> {
	try {
		if (globalThis.cookieStore) {
			const cookie = await cookieStore.get(USERNAME_COOKIE);
			return cookie?.value?.trim() || null;
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
