import suggestedUsernames from "@shared/usernames.json" with { type: "json" };
import { FailureField, type InvalidInputFailure, invalidInput } from "../failures/failure";

const USERNAME_REGEX = /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/;
export const MAX_USERNAME_LENGTH = 39;
export const SUGGESTED_USERNAMES: readonly string[] = suggestedUsernames;
export const FIRST_SUGGESTED_USERNAME = SUGGESTED_USERNAMES[0];

declare const usernameBrand: unique symbol;

export type Username = string & { readonly [usernameBrand]: true };

export const isUsername = (value: unknown): value is Username =>
	typeof value === "string" && USERNAME_REGEX.test(value);

export const parseUsername = (input: string): Username | InvalidInputFailure => {
	const trimmed = input.trim();
	if (!isUsername(trimmed)) {
		return invalidInput({ field: FailureField.Username, message: "Invalid GitHub username" });
	}
	return trimmed;
};
