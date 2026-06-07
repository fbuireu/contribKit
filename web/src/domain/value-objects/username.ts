import suggestedUsernames from "@shared/usernames.json" with { type: "json" };
import { type Failure, FailureField, invalidInput } from "../failures/failure";

const USERNAME_REGEX = /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/;
export const DEFAULT_USERNAME = "torvalds";
export const SUGGESTED_USERNAMES: readonly string[] = suggestedUsernames;
export interface Username {
	readonly _tag: "Username";
	readonly value: string;
}

export const parseUsername = (input: string): Username | Failure => {
	const trimmed = input.trim();
	if (!USERNAME_REGEX.test(trimmed)) {
		return invalidInput(FailureField.Username, "Invalid GitHub username");
	}
	return { _tag: "Username", value: trimmed };
};

export const isUsername = (value: unknown): value is Username =>
	typeof value === "object" && value !== null && (value as { _tag?: unknown })._tag === "Username";
