// Randy's digital business card (/randy/ and /randy/randy-vandervaate.vcf).
// Every value comes from facts already published on the site (CLAUDE.md,
// "Business identity"; src/config/lead.ts; src/config/phones.ts). Never
// invent contact details here.
import { lead } from './lead';
import { site } from './site';

export const card = {
  /** Permanent production URL of the card (the QR code points here). */
  url: `${site.url}/randy/`,
  vcfPath: '/randy/randy-vandervaate.vcf',
  vcfFilename: 'randy-vandervaate.vcf',
  firstName: 'Randy',
  lastName: 'VanderVaate',
  fullName: 'Randy VanderVaate',
  // Card V1.1 (Randy, November 2026): title, organization and department, exact wording.
  title: 'Owner & Licensed Life Insurance Agent',
  org: 'Funeral Funds',
  department: 'Burial, Cremation & Final Expense Insurance',
  /** Saved in the contact's notes so customers can find Randy by searching these words. */
  searchTerms: ['Life insurance', 'Burial insurance', 'Cremation insurance', 'Final expense insurance', 'Funeral insurance'],
  phone: { display: lead.phone.display, href: lead.phone.href, e164: site.phoneE164 },
  // Card V1.1 (Randy, November 2026): no email address and no text-message
  // action anywhere on the card or in its vCards (phone contact only).
  website: { display: 'FuneralFunds.com', href: `${site.url}/`, vcard: site.url },
  /** Approved headshot (the homepage portrait); the 240px JPEG is embedded in the vCard. */
  photo: { jpg: '/images/randy/randy-vandervaate-240.jpg', webp: '/images/randy/randy-vandervaate-240.webp', avif: '/images/randy/randy-vandervaate-240.avif' },
};
