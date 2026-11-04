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
  /** Mega menu only: left out of the phone menu (under 48rem) to keep each
   * category short. Only for links the category's directory page (its `all`
   * link, or the Burial Insurance hub) also lists. Desktop and tablet show
   * every link. */
  phoneHidden?: boolean;
}

/** A labelled group of links inside a mega-menu panel. */
export interface NavGroup {
  heading: string;
  links: NavItem[];
}

/** A top-level category of the site header's mega menu. */
export interface MegaNavItem {
  label: string;
  /** Stable id for the panel (used for aria-controls). */
  id: string;
  groups: NavGroup[];
  /** Prominent "All ..." link at the foot of the panel. */
  all?: NavItem;
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
  /** Compact menu kept on campaign landing pages that use the site header
   * (/roku/), and the source of /search/'s "Popular guides". */
  primaryNav: NavItem[];
  /** The site header's mega menu on regular pages (Randy, November 2026). */
  megaNav: MegaNavItem[];
  /** The header's quote button beside the phone number. */
  quoteLink: NavItem;
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

/** The header logo's link target on every page (Randy, November 2026): the
 * canonical homepage, absolute. Used by src/components/HeaderLogo.astro. */
export const HOME_URL = 'https://funeralfunds.com/';
/** Accessible name of the header logo link. */
export const HOME_LINK_LABEL = 'Funeral Funds home';

export const site: SiteConfig = {
  url: 'https://funeralfunds.com',
  name: 'Funeral Funds',
  description: '',
  organizationName: 'Funeral Funds',
  locale: 'en_US',
  phoneDisplay: '888-862-9456',
  phoneE164: '+18888629456',
  email: '',
  logo: { src: '/images/logo/funeral-funds-logo.png', width: 1986, height: 433, alt: 'Funeral Funds' },
  // FF favicon (scripts/build-brand-assets.mjs; /favicon.ico is built too).
  icons: [
    { rel: 'icon', href: '/images/favicon/funeral-funds-favicon-32.png', sizes: '32x32' },
    { rel: 'icon', href: '/images/favicon/funeral-funds-favicon-192.png', sizes: '192x192' },
    { rel: 'icon', href: '/images/favicon/funeral-funds-favicon.svg', sizes: 'any' },
    { rel: 'apple-touch-icon', href: '/images/favicon/funeral-funds-favicon-180.png' },
  ],
  defaultOgImage: '',
  primaryNav: [
    { label: 'SEE PRICES NOW', href: '/free-quote/' },
    {
      label: 'RESOURCES',
      href: '#',
      children: [
        { label: 'A to Z Final Expense Companies', href: '/a-z-companies/' },
        { label: 'A to Z Health Conditions', href: '/a-z-health/' },
        { label: 'Burial Insurance Guide', href: '/burial-insurance/' },
        { label: 'First-Time Shopper Guide', href: '/final-expense-life-insurance-book/' },
        { label: 'Funeral Planning Guide', href: '/12-step-final-planning-guide/' },
        { label: 'IUL Playbook', href: '/iul-book/' },
      ],
    },
    { label: 'REVIEWS', href: '/reviews/' },
    { label: 'ABOUT', href: '/about/' },
  ],
  // Sitewide mega menu (Randy, November 2026, navigation V1.0). Only
  // published pages that build and aren't redirects: npm run verify checks
  // every link. Labels are short Title Case (destination titles unchanged).
  megaNav: [
    {
      label: 'Life Insurance',
      id: 'life-insurance',
      groups: [
        {
          heading: 'Coverage Types',
          links: [
            { label: 'Burial & Final Expense', href: '/burial-insurance/' },
            { label: 'Final Expense Whole Life', href: '/final-expense-life-insurance-complete-guide/' },
            { label: 'Term Life', href: '/term-life-insurance-guide-everyone/' },
            { label: 'Mortgage Protection', href: '/mortgage-protection-life-insurance/' },
            { label: 'Children & Grandchildren', href: '/children-grandchild-policies/' },
            { label: 'Cancer Insurance', href: '/cancer-insurance/' },
          ],
        },
        {
          heading: 'Coverage Options',
          links: [
            { label: 'First-Day Coverage', href: '/burial-insurance/with-first-day-coverage/' },
            { label: 'Guaranteed Issue', href: '/burial-insurance/guaranteed-issue-life-insurance-for-seniors/' },
            { label: 'No Waiting Period', href: '/burial-insurance/life-insurance-with-no-waiting-period/', phoneHidden: true },
            { label: 'No Medical Exam', href: '/burial-insurance/life-insurance-no-exam/', phoneHidden: true },
            { label: 'Term to Whole Life Conversion', href: '/term-life-conversion-to-whole-life/' },
          ],
        },
        {
          heading: 'Costs & Coverage Amounts',
          links: [
            { label: 'Final Expense Insurance Cost', href: '/how-much-does-final-expense-insurance-cost/' },
            { label: 'How Much Coverage Do I Need?', href: '/how-much-burial-insurance-do-i-need/', phoneHidden: true },
            { label: 'Affordable Burial Insurance', href: '/finding-affordable-burial-insurance/', phoneHidden: true },
            { label: 'Is Burial Insurance Worth It?', href: '/is-burial-insurance-worth-it/', phoneHidden: true },
          ],
        },
        {
          heading: 'Coverage by Age & Family',
          links: [
            { label: 'Seniors 50 to 85', href: '/burial-insurance/life-insurance-for-seniors/' },
            { label: 'Over 70', href: '/burial-insurance/over-70/', phoneHidden: true },
            { label: 'Over 80', href: '/burial-insurance/over-80/', phoneHidden: true },
            { label: 'For Parents', href: '/burial-insurance/parents/', phoneHidden: true },
            { label: 'For Veterans', href: '/burial-insurance/veterans/', phoneHidden: true },
          ],
        },
      ],
    },
    {
      label: 'Company Reviews',
      id: 'company-reviews',
      groups: [
        {
          heading: 'Well-Known Companies',
          links: [
            { label: 'AARP', href: '/aarp-life-insurance-review/' },
            { label: 'Colonial Penn', href: '/colonial-penn-burial-insurance-review/' },
            { label: 'Globe Life', href: '/globe-life-price-increase/' },
            { label: 'Lincoln Heritage', href: '/lincoln-heritage-funeral-advantage-review/', phoneHidden: true },
            { label: 'Mutual of Omaha', href: '/mutual-of-omaha-burial-insurance/' },
            { label: 'State Farm', href: '/state-farm/', phoneHidden: true },
            { label: 'TruStage', href: '/trustage-life-insurance-review/', phoneHidden: true },
          ],
        },
        {
          heading: 'Final Expense Companies',
          links: [
            { label: 'Aetna', href: '/aetna-burial-insurance-review/' },
            { label: 'Aflac', href: '/aflac-burial-insurance-review/' },
            { label: 'American Amicable', href: '/burial-insurance/american-amicable-life-insurance-review/', phoneHidden: true },
            { label: 'CICA Life', href: '/cica-life-burial-insurance-review/' },
            { label: 'Family Benefit Life', href: '/family-benefit-life-burial-insurance-review/', phoneHidden: true },
            { label: 'Foresters', href: '/foresters-burial-insurance-review/', phoneHidden: true },
            { label: 'Gerber Life', href: '/gerber-life-insurance-review/' },
          ],
        },
        {
          heading: 'More Reviews',
          links: [
            { label: 'Guarantee Trust Life', href: '/guarantee-trust-life-insurance-review/', phoneHidden: true },
            { label: 'Transamerica', href: '/transamerica-burial-insurance-review/', phoneHidden: true },
            { label: 'Trinity Life', href: '/trinity-life-insurance-review/', phoneHidden: true },
            { label: 'Ethos', href: '/ethos-life-insurance-review/', phoneHidden: true },
            { label: 'Primerica', href: '/primerica-life-insurance-review/', phoneHidden: true },
            { label: 'Top 10 Final Expense Companies', href: '/burial-insurance/top-10-final-expense-life-insurance-companies/', phoneHidden: true },
          ],
        },
      ],
      all: { label: 'All Company Reviews', href: '/a-z-companies/' },
    },
    {
      label: 'Health & Eligibility',
      id: 'health-eligibility',
      groups: [
        {
          heading: 'Common Health Conditions',
          links: [
            { label: 'Cancer', href: '/burial-insurance/cancer/' },
            { label: 'Diabetes', href: '/burial-insurance/diabetes/' },
            { label: 'Heart Conditions', href: '/burial-insurance/heart-conditions/' },
            { label: 'COPD', href: '/burial-insurance/copd/' },
            { label: 'Stroke & TIA', href: '/burial-insurance/stroke-tia/' },
            { label: 'High Blood Pressure', href: '/burial-insurance/high-blood-pressure/', phoneHidden: true },
          ],
        },
        {
          heading: 'More Conditions',
          links: [
            { label: 'Kidney Disease', href: '/burial-insurance/kidney-disease/', phoneHidden: true },
            { label: 'Liver Disease', href: '/burial-insurance/liver-disease/', phoneHidden: true },
            { label: 'Dementia & Alzheimer\'s', href: '/burial-insurance/dementia-alzheimers/', phoneHidden: true },
            { label: 'Mental Health Conditions', href: '/burial-insurance/mental-health-conditions/', phoneHidden: true },
            { label: 'Neurological Disorders', href: '/burial-insurance/neurological-disorders/', phoneHidden: true },
            { label: 'Smokers', href: '/burial-insurance/for-smokers/', phoneHidden: true },
          ],
        },
        {
          heading: 'Eligibility & Underwriting',
          links: [
            { label: 'Health Question Search', href: '/life-insurance-health-questions/' },
            { label: 'Pre-Existing Conditions', href: '/final-expense-life-insurance-pre-existing-conditions/' },
            { label: 'Height & Weight Guidelines', href: '/life-insurance-height-weight-guidelines/', phoneHidden: true },
            { label: 'Activities of Daily Living', href: '/burial-insurance/adl-activities-of-daily-living/', phoneHidden: true },
            { label: 'Declined for Life Insurance', href: '/declined-for-life-insurance/', phoneHidden: true },
            { label: 'Application Process', href: '/burial-insurance/burial-insurance-application-process/', phoneHidden: true },
          ],
        },
      ],
      all: { label: 'All Health Conditions', href: '/a-z-health/' },
    },
    {
      label: 'Guides & Tools',
      id: 'guides-tools',
      groups: [
        {
          heading: 'Guides',
          links: [
            { label: 'Burial Insurance Guide', href: '/burial-insurance/' },
            { label: 'First-Time Shopper Guide', href: '/final-expense-life-insurance-book/' },
            { label: 'Funeral Planning Guide', href: '/12-step-final-planning-guide/' },
            { label: 'IUL Playbook', href: '/iul-book/' },
            { label: 'Buyers Guide', href: '/buyers-guide/' },
          ],
        },
        {
          heading: 'Funeral & Cremation',
          links: [
            { label: 'Funeral Costs', href: '/how-much-does-a-funeral-cost/' },
            { label: 'Cremation Costs', href: '/cremation-cost-and-info/' },
            { label: 'Burial vs. Cremation', href: '/burial-vs-cremation/' },
            { label: 'Prepaid Funerals', href: '/prepaid-funeral/' },
            { label: 'When a Loved One Dies', href: '/what-to-do-when-a-loved-one-dies/' },
          ],
        },
        {
          heading: 'Tools',
          links: [
            { label: 'Health Question Search', href: '/life-insurance-health-questions/' },
            { label: 'Burial Insurance Calculator', href: '/burial-insurance-calculator/' },
            { label: 'Search the Site', href: '/search/' },
          ],
        },
      ],
    },
    {
      label: 'About Us',
      id: 'about-us',
      groups: [
        {
          heading: 'Funeral Funds',
          links: [
            { label: 'About Funeral Funds', href: '/about/' },
            { label: 'Meet Randy', href: '/randy-vandervaate/' },
            { label: 'Customer Reviews', href: '/reviews/' },
          ],
        },
        {
          heading: 'Trust & Contact',
          links: [
            { label: 'Licenses', href: '/licenses/' },
            { label: 'Editorial Guidelines', href: '/editorial-guidelines/' },
            { label: 'Contact Us', href: '/contact/' },
          ],
        },
      ],
    },
  ],
  quoteLink: { label: 'SEE PRICES NOW', href: '/free-quote/' },
  footer: {
    columns: [
      '<p><strong>Mailing Address</strong><br>2300 Olympia Drive #270179<br>Flower Mound, TX 75027</p>',
      '<p><strong>Phone</strong><br><a href="tel:8888629456">(888) 862-9456</a></p>',
      '<p><a href="/privacy-policy/" target="_blank" rel="noopener">Privacy Policy</a><br> <a href="/terms-of-use/" target="_blank" rel="noopener">Terms Of Use</a><br> <a href="/licenses/" target="_blank" rel="noopener">Licenses</a></p>',
    ],
    // No social-media links on the site for now (Randy, October 2026): the
    // old Funeral Funds profiles were removed and not replaced.
    social: [],
    notes: [
      '<small>Funeral Funds or funeralfunds.com is an independently operated life insurance agency licensed in most states. We specialize in locating 1st-day coverage insurance for our clients. Product and policy availability, features, and benefits may vary by state and health. </small>',
      '<small>We are not endorsed by, directly affiliated with, maintained, authorized, or sponsored by any companies mentioned within Funeral Funds or funeralfunds.com. The use of any trade name or trademark is for identification and reference purposes only and does not imply any association with the trademark holder of their product brand.</small>',
      '<small>All company names and products are the registered trademarks of their original owners and Funeral Funds or funeralfunds.com declares no affiliation, sponsorship, nor any partnerships with any registered trademarks unless otherwise stated.</small>',
      '<small>The content on this website is for general informational and educational purposes only and should not be construed as professional advice. We make no warranties or guarantees regarding the accuracy, completeness, or currency of the information provided. For guidance specific to your situation, please call us directly at 888-862-9456.</small>',
      '<small>No portion of Funeral Funds or funeralfunds.com may be copied, published, distributed, or used in any manner for any purpose without prior written authorization of Funeral Funds or www.funeralfunds.com.</small>',
      '<small>Copyright © 2026 Funeral Funds or funeralfunds.com. All Rights Reserved</small>',
    ],
  },
  cta: { heading: '', text: '' },
};

/** True only on the real production deployment — see .env.example. */
export const allowIndexing = import.meta.env.PUBLIC_ALLOW_INDEXING === 'true';
