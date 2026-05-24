export type Failure =
	| { readonly kind: "NotFound"; readonly username: string }
	| { readonly kind: "InvalidInput"; readonly field: "username" | "year"; readonly message: string }
	| { readonly kind: "Network"; readonly status?: number; readonly message: string }
	| { readonly kind: "Parse"; readonly message: string };

export const notFound = (username: string): Failure => ({ kind: "NotFound", username });
export const invalidInput = (field: "username" | "year", message: string): Failure => ({
	kind: "InvalidInput",
	field,
	message,
});
export const network = (message: string, status?: number): Failure => ({ kind: "Network", status, message });
export const parse = (message: string): Failure => ({ kind: "Parse", message });
