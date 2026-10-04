// Single source of truth for site-wide identity, navigation, and footer
// content. Header, footer, SEO fallbacks, and llms.txt read from here.
//
// Values below were taken from the live fexguy.com site (October 2026).
// Never invent business facts: change them only with information Randy
// provides. Fields left empty render nothing.

export interface NavItem {
  label: string;
  href: string;
  children?: NavItem[];
}

export interface SiteConfig {
  /** Canonical origin, no trailing slash. Also set in astro.config.mjs. */
  url: string;
  name: string;
  /** Default meta description for pages that don't set their own. */
  description: string;
  organizationName: string;
  locale: string;
  /** The website phone number (888-862-9456 — the only number presented as a
   * FEXGuy contact number). Click-to-call links always use
   * `lead.phone.href` (tel:8888629456) from src/config/lead.ts. */
  phoneDisplay: string;
  /** E.164 form, for structured data only. */
  phoneE164: string;
  email: string;
  logo: { src: string; width: number; height: number; alt: string };
  icons: { rel: string; href: string; sizes?: string }[];
  /** Default social-share image, path under /public. */
  defaultOgImage: string;
  primaryNav: NavItem[];
  footer: {
    /** Footer columns as HTML (copied from the live site). */
    columns: string[];
    social: { label: string; href: string }[];
    /** Disclaimer/copyright paragraphs as HTML (copied from the live site). */
    notes: string[];
  };
  /** Default call-to-action band. Renders nothing until `heading` is set. */
  cta: { heading: string; text: string; link?: NavItem };
}

const uploads = '/wp-content/uploads';

export const site: SiteConfig = {
  url: 'https://fexguy.com',
  name: 'Final Expense Guy',
  description: '',
  organizationName: 'Final Expense Guy',
  locale: 'en_US',
  phoneDisplay: '888-862-9456',
  phoneE164: '+18888629456',
  email: '',
  logo: { src: `${uploads}/2026/09/FINAL-EXPENSE-GUY-LOGO-340-X-250.png`, width: 2034, height: 250, alt: 'Final Expense Guy' },
  icons: [
    { rel: 'icon', href: `${uploads}/2026/05/cropped-FEX-GUY-FAVICON-BLUE-WHITE-512-512-32x32.png`, sizes: '32x32' },
    { rel: 'icon', href: `${uploads}/2026/05/cropped-FEX-GUY-FAVICON-BLUE-WHITE-512-512-192x192.png`, sizes: '192x192' },
    { rel: 'apple-touch-icon', href: `${uploads}/2026/05/cropped-FEX-GUY-FAVICON-BLUE-WHITE-512-512-180x180.png` },
  ],
  defaultOgImage: '',
  primaryNav: [
    { label: '★FREE FINAL EXPENSE QUOTE★', href: '/free-quote/' },
    {
      label: 'RESOURCES',
      href: '#',
      children: [
        { label: 'A TO Z FINAL EXPENSE LIFE INSURANCE COMPANIES', href: '/a-z-companies/' },
        { label: 'A TO Z HEALTH CONDITIONS ACCEPTED', href: '/a-z-health/' },
        { label: 'BURIAL INSURANCE COMPLETE GUIDE', href: '/burial-insurance/' },
        { label: 'Final Expense Life Insurance Shopper • 1st-Time Shopper Guide', href: '/final-expense-life-insurance-book/' },
        { label: 'FUNERAL PLANNING GUIDE', href: '/12-step-final-planning-guide/' },
        { label: 'IUL Playbook: How It Works, What It Promises, & What It Delivers', href: '/iul-book/' },
      ],
    },
    { label: 'ABOUT', href: '/about/' },
  ],
  footer: {
    columns: [
      '<p><strong>Mailing Address</strong><br>PO Box 270179<br>Flower Mound, TX 75027<br> (Dallas, TX Area)</p>',
      '<p><strong>Office Hours</strong><br>Monday-Friday<br>9:00 AM-5:00 PM CTL</p>',
      '<p><strong>Phone</strong><br>(888) 862-9456</p>',
      '<p><a href="/privacy-policy/" target="_blank" rel="noopener">Privacy Policy</a><br> <a href="/terms-of-use/" target="_blank" rel="noopener">Terms Of Use</a><br> <a href="/licenses/" target="_blank" rel="noopener">Licenses</a></p>',
    ],
    social: [
      { label: 'LinkedIn', href: 'https://www.linkedin.com/company/funeral-funds/' },
      { label: 'Facebook', href: 'https://www.facebook.com/funeralfunds' },
      { label: 'YouTube', href: 'https://www.youtube.com/c/FuneralFunds' },
    ],
    notes: [
      '<small>Final Expense Guy or fexguy.com is an independently operated life insurance agency licensed to operate in all 50 states. We specialize in locating 1st-day coverage insurance for our clients. Product and policy availability, features, and benefits may vary by state and health. </small>',
      '<small>We are not endorsed by, directly affiliated with, maintained, authorized, or sponsored by any companies mentioned within Final Expense Guy or fexguy.com. The use of any trade name or trademark is for identification and reference purposes only and does not imply any association with the trademark holder of their product brand.</small>',
      '<small>All company names and products are the registered trademarks of their original owners and Final Expense Guy or fexguy.com declares no affiliation, sponsorship, nor any partnerships with any registered trademarks unless otherwise stated.</small>',
      'The content on this website is for general informational and educational purposes only and should not be construed as professional advice. We make no warranties or guarantees regarding the accuracy, completeness, or currency of the information provided. For guidance specific to your situation, please call us directly at 888-862-9456.',
      '<small>No portion of Final Expense Guy or fexguy.com may be copied, published, distributed, or used in any manner for any purpose without prior written authorization of Final Expense Guy or www.fexguy.com.</small>',
      '<small>Copyright © 2026 Final Expense Guy or fexguy.com – All Rights Reserved</small>',
    ],
  },
  cta: { heading: '', text: '' },
};

/** True only on the real production deployment — see .env.example. */
export const allowIndexing = import.meta.env.PUBLIC_ALLOW_INDEXING === 'true';
