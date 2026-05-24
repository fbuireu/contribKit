import { type Failure, invalidInput } from "../failures/failure";

const USERNAME_REGEX = /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/;

export interface Username {
	readonly _tag: "Username";
	readonly value: string;
}

export const parseUsername = (input: string): Username | Failure => {
	const trimmed = input.trim();
	if (!USERNAME_REGEX.test(trimmed)) {
		return invalidInput("username", "Invalid GitHub username");
	}
	return { _tag: "Username", value: trimmed };
};

export const isUsername = (value: unknown): value is Username =>
	typeof value === "object" && value !== null && (value as { _tag?: unknown })._tag === "Username";
