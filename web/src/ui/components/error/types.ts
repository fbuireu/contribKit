export const Tone = {
	Accent: "accent",
	Danger: "danger",
} as const;

export type Tone = (typeof Tone)[keyof typeof Tone];

export const ErrorActionIcon = {
	Back: "back",
	Reload: "reload",
} as const;

export type ErrorActionIcon = (typeof ErrorActionIcon)[keyof typeof ErrorActionIcon];

export interface ErrorAction {
	href: string;
	label: string;
	icon: ErrorActionIcon;
}

export const TerminalLineKind = {
	Command: "cmd",
	Error: "err",
	Output: "out",
} as const;

export type TerminalLineKind = (typeof TerminalLineKind)[keyof typeof TerminalLineKind];

export interface TerminalLine {
	kind: TerminalLineKind;
	text: string;
}
