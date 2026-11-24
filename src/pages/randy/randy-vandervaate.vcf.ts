// Randy's vCard, built at deploy time from src/config/card.ts. vCard 3.0
// (the most widely imported version: iPhone, Android/Google Contacts,
// Outlook), CRLF line endings, lines folded at 75 octets, photo embedded
// as base64 JPEG. vercel.json serves it as text/vcard.
import type { APIRoute } from 'astro';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { card } from '@/config/card';

const esc = (v: string) => v.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/([,;])/g, '\\$1');

/** RFC 2425 folding: 75 octets per line, continuation lines start with a space. */
const fold = (line: string) => {
  const out: string[] = [];
  let rest = line;
  out.push(rest.slice(0, 75));
  rest = rest.slice(75);
  while (rest.length) {
    out.push(' ' + rest.slice(0, 74));
    rest = rest.slice(74);
  }
  return out.join('\r\n');
};

export const GET: APIRoute = () => {
  const photo = readFileSync(join(process.cwd(), 'public', card.photo.jpg)).toString('base64');
  const lines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `N:${esc(card.lastName)};${esc(card.firstName)};;;`,
    `FN:${esc(card.fullName)}`,
    `ORG:${esc(card.org)}`,
    `TITLE:${esc(card.title)}`,
    `TEL;TYPE=WORK,VOICE,PREF:${card.phone.e164}`,
    ...(card.email ? [`EMAIL;TYPE=INTERNET,WORK:${card.email}`] : []),
    `URL:${card.website.href}`,
    `NOTE:${esc(`Digital card: ${card.url}`)}`,
    `PHOTO;ENCODING=b;TYPE=JPEG:${photo}`,
    'END:VCARD',
  ];
  return new Response(lines.map(fold).join('\r\n') + '\r\n', {
    headers: { 'Content-Type': 'text/vcard; charset=utf-8' },
  });
};
