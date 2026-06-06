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
