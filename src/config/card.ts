// Randy's digital business card (/randy/ and /randy/randy-vandervaate.vcf).
// Every value comes from facts already published on the site (CLAUDE.md,
// "Business identity"; src/config/lead.ts; src/config/phones.ts). Never
// invent contact details here.
import { lead } from './lead';
import { SMS_NUMBER } from './phones';
import { site } from './site';

export const card = {
  /** Permanent production URL of the card (the QR code points here). */
  url: `${site.url}/randy/`,
  vcfPath: '/randy/randy-vandervaate.vcf',
  vcfFilename: 'randy-vandervaate.vcf',
  firstName: 'Randy',
  lastName: 'VanderVaate',
  fullName: 'Randy VanderVaate',
  title: 'Owner and Licensed Agent',
  org: 'Funeral Funds',
  phone: { display: lead.phone.display, href: lead.phone.href, e164: site.phoneE164 },
  /** Text-only line (SMS-capable, toll-free verified); never shown as a calling number. */
  sms: SMS_NUMBER ? { href: `sms:+1${SMS_NUMBER}` } : null,
  /** Approved by Randy for this card only (November 2026). The rest of the
   * site still publishes no email address. */
  email: 'randy@funeralfunds.com' as string | null,
  website: { display: 'FuneralFunds.com', href: `${site.url}/` },
  address: { street: '2300 Olympia Drive #270179', city: 'Flower Mound', region: 'TX', postal: '75027', country: 'USA' },
  /** Approved headshot (the homepage portrait); the 240px JPEG is embedded in the vCard. */
  photo: { jpg: '/images/randy/randy-vandervaate-240.jpg', webp: '/images/randy/randy-vandervaate-240.webp', avif: '/images/randy/randy-vandervaate-240.avif' },
};
