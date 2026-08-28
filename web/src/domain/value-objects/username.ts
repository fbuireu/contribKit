import suggestedUsernames from "@shared/usernames.json" with { type: "json" };
import { type Failure, FailureField, invalidInput } from "../failures/failure";

const USERNAME_REGEX = /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/;
export const MAX_USERNAME_LENGTH = 39;
export const SUGGESTED_USERNAMES: readonly string[] = suggestedUsernames;
export const DEFAULT_USERNAME = SUGGESTED_USERNAMES[0];
export interface Username {
	readonly _tag: "Username";
	readonly value: string;
}

export const parseUsername = (input: string): Username | Failure => {
	const trimmed = input.trim();
	if (!USERNAME_REGEX.test(trimmed)) {
		return invalidInput({ field: FailureField.Username, message: "Invalid GitHub username" });
	}
	return { _tag: "Username", value: trimmed };
};

export const isUsername = (value: unknown): value is Username =>
	typeof value === "object" && value !== null && (value as { _tag?: unknown })._tag === "Username";
