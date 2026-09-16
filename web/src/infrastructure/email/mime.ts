export interface BuildMimeMessageParams {
	from: string;
	to: string;
	replyTo: string;
	subject: string;
	text: string;
	date: Date;
	messageId: string;
}

const CRLF = "\r\n";
const BASE64_LINE = /.{1,76}/g;
const HEADER_BREAK = /[\r\n]+/g;

const withoutHeaderBreaks = (value: string): string => value.replace(HEADER_BREAK, " ");

const base64Of = (value: string): string =>
	btoa(Array.from(new TextEncoder().encode(value), (byte) => String.fromCharCode(byte)).join(""));

const encodedWord = (value: string): string => `=?UTF-8?B?${base64Of(value)}?=`;

const foldedBase64 = (value: string): string => (value.match(BASE64_LINE) ?? []).join(CRLF);

export const buildMimeMessage = ({
	from,
	to,
	replyTo,
	subject,
	text,
	date,
	messageId,
}: BuildMimeMessageParams): string => {
	const headers: readonly (readonly [string, string])[] = [
		["From", withoutHeaderBreaks(from)],
		["To", withoutHeaderBreaks(to)],
		["Reply-To", withoutHeaderBreaks(replyTo)],
		["Subject", encodedWord(withoutHeaderBreaks(subject))],
		["Date", date.toUTCString()],
		["Message-ID", withoutHeaderBreaks(messageId)],
		["MIME-Version", "1.0"],
		["Content-Type", "text/plain; charset=utf-8"],
		["Content-Transfer-Encoding", "base64"],
	];
	const head = headers.map(([name, value]) => `${name}: ${value}`).join(CRLF);

	return `${head}${CRLF}${CRLF}${foldedBase64(base64Of(text))}${CRLF}`;
};
