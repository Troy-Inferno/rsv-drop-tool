/**
 * Curated blocklist of known disposable / burner / throwaway email domains.
 *
 * Source: deduplicated, manually curated list. Covers the highest-volume
 * services that flight attendants might encounter in the wild (mailinator
 * + clones, guerrillamail family, yopmail, tempmail variants, anonbox,
 * 10minutemail family, etc.).
 *
 * Domains are stored in lowercase and matched case-insensitively. We
 * compare the host portion exactly (no subdomain inheritance) because some
 * of these services serve mail at multiple subdomains under their own
 * apex; if we ever need to also block `*.mailinator.com`, add a
 * `endsWith` pass below.
 */

const RAW_DOMAINS = `
mailinator.com
mailinator.net
mailinator2.com
mailinator2.net
mailinator.org
binkmail.com
suremail.info
spamherelots.com
chammy.info
discardmail.com
discardmail.de
fakeinbox.com
fakemailgenerator.com
10minutemail.com
10minutemail.net
10minutemail.org
10minutemail.us
10minutemail.de
10minutemail.co.uk
20minutemail.com
30minutemail.com
guerrillamail.com
guerrillamail.net
guerrillamail.org
guerrillamail.biz
guerrillamail.info
guerrillamail.de
sharklasers.com
grr.la
spam4.me
yopmail.com
yopmail.net
yopmail.fr
yopmail.org
tempmail.com
temp-mail.org
temp-mail.io
tempmail.net
tempmailo.com
tempmail.plus
tempinbox.com
temp-mailbox.com
tmail.com
maildrop.cc
trashmail.com
trashmail.net
trashmail.de
trashmail.io
dispostable.com
mintemail.com
mohmal.com
mailcatch.com
getairmail.com
getnada.com
nada.email
throwaway.email
throwawaymail.com
mytemp.email
emailondeck.com
emailfake.com
emailtemporanea.net
inboxbear.com
inboxalias.com
inboxkitten.com
spambox.us
spambog.com
spamgourmet.com
spam.la
mailnesia.com
mailmoat.com
gettempmail.com
e4ward.com
deadaddress.com
incognitomail.com
incognitomail.org
incognitomail.net
mailexpire.com
33mail.com
anonymbox.com
anonbox.net
proxymail.eu
crazymailing.com
selfdestructingmail.com
spam.su
trbvm.com
dropmail.me
trbvn.com
tempr.email
mailtothis.com
luxusmail.org
moakt.com
moakt.cc
moakt.ws
mailto.plus
fexbox.org
fexbox.ru
inboxhub.net
cock.li
firemailbox.club
ttirv.org
emltmp.com
tmpmail.org
tmpmail.net
mvrht.com
notmailinator.com
veryrealemail.com
maildim.com
`;

/** Normalised set of disposable apex domains (lowercase, no spaces). */
const DISPOSABLE_DOMAINS: ReadonlySet<string> = new Set(
  RAW_DOMAINS
    .split(/\s+/)
    .map((d) => d.trim().toLowerCase())
    .filter((d) => d.length > 0),
);

/**
 * Returns true if the given email address's domain is on the disposable
 * blocklist. Comparison is case-insensitive on the domain.
 *
 * Also matches subdomains: `foo.mailinator.com` is blocked because
 * `mailinator.com` is in the list. This is intentional — most providers
 * route many subdomains to the same temp-mail backend.
 */
export function isDisposableEmail(email: string): boolean {
  const at = email.lastIndexOf("@");
  if (at < 0 || at === email.length - 1) return false;
  const domain = email.slice(at + 1).toLowerCase().trim();
  if (DISPOSABLE_DOMAINS.has(domain)) return true;
  // Subdomain match: foo.mailinator.com → check mailinator.com
  for (const blocked of DISPOSABLE_DOMAINS) {
    if (domain.endsWith("." + blocked)) return true;
  }
  return false;
}

/** Exposed for tests / debugging. Don't import this into UI code. */
export const _DISPOSABLE_DOMAINS_FOR_TEST = DISPOSABLE_DOMAINS;
