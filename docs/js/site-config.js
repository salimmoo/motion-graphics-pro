/* Site settings — edit here, no other code changes needed.
   donate: Trakteer / Saweria links and an optional bank account (see below).
   qris: optional; paste the text payload of your STATIC GoPay QRIS (scan your QRIS with any QR reader app and copy the text,
         it starts with "000201..."). The donation dialog turns it into a dynamic QRIS with the chosen amount.
         Leave empty to show qrisImage instead (a picture of your QRIS), or a "segera" note when both are empty. */
window.SITE = {
  version: "2.4.2",
  updated: "November 2026",
  owner: "Salim Muhammad",
  zip: "download/motion-graphics-pro-plugin-v2.4.2.zip",   // Claude plugin ZIP (skill/tools/build_plugin.py)
  // Claude Code marketplace: /plugin marketplace add <repo>, then /plugin install <plugin>@<name>
  marketplace: { repo: "salimmoo/motion-graphics-pro", name: "salimmoo", plugin: "motion-graphics-pro" },
  // donations inside Indonesia: every provider left empty is hidden; an empty tab shows "segera hadir"
  donate: {
    trakteer: "",         // e.g. "https://trakteer.id/namakamu"
    saweria: "",          // e.g. "https://saweria.co/namakamu"
    bank: { name: "", account: "", holder: "" },   // optional transfer, e.g. { name: "BCA", account: "1234567890", holder: "Salim Muhammad" }
  },
  // optional QRIS (amount picker + QR are shown only when one of these is filled)
  qris: "",
  qrisImage: "",          // e.g. "assets/img/qris-gopay.png"
  payee: "Salim Muhammad · GoPay",
  amounts: [25000, 50000, 100000, 200000],
  minAmount: 25000,       // custom amount cannot go below this
  // donations from outside Indonesia (fill the links you use; empty ones are shown as "segera")
  intl: {
    paypal: "",           // e.g. "https://paypal.me/namakamu"
    kofi: "",             // e.g. "https://ko-fi.com/namakamu"
    bmac: "",             // e.g. "https://buymeacoffee.com/namakamu"
    sponsors: "",         // e.g. "https://github.com/sponsors/salimmoo"
  },
  repo: "https://github.com/salimmoo/motion-graphics-pro",
  // contact form in "Tentang" (all optional): web3formsKey (free at web3forms.com; your address stays hidden),
  // else email (opens the visitor's mail app with a prefilled draft), else the form shows "segera hadir".
  // The Instagram DM button appears when social.instagram is set.
  contact: {
    web3formsKey: "",     // e.g. "a1b2c3d4-...."
    email: "",            // e.g. "kamu@contoh.com" (mailto fallback only)
  },
  social: {
    instagram: "",        // e.g. "https://instagram.com/namakamu"
    tiktok: "",
    youtube: "",
  },
};
