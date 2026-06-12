export const USERNAME_COOKIE = "ck_user";
const ONE_WEEK = 60 * 60 * 24 * 7;

export async function readUsernameCookie(): Promise<string | null> {
	try {
		const cookie = await cookieStore.get(USERNAME_COOKIE);
		return cookie?.value?.trim() || null;
	} catch {
		return null;
	}
}

export async function writeUsernameCookie(username: string): Promise<void> {
	try {
		await cookieStore.set({
			name: USERNAME_COOKIE,
			value: username,
			expires: Date.now() + ONE_WEEK * 1000,
			path: "/",
			sameSite: "lax",
		});
	} catch {}
}

export async function seedUsernameCookie(username: string): Promise<void> {
	if (!(await readUsernameCookie())) await writeUsernameCookie(username);
}
