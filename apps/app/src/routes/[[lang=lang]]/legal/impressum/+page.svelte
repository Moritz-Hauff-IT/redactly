<script lang="ts">
  import LegalLayout from '$lib/components/LegalLayout.svelte';
  import { loc, currentLocale } from '$lib/i18n/locale.svelte.js';

  const lang = $derived(currentLocale());
  const title = $derived(loc({ de: 'Impressum', en: 'Imprint' }));
</script>

<svelte:head>
  <title>{title} — Redactly</title>
  <meta
    name="description"
    content={loc({
      de: 'Anbieterkennzeichnung für app.redactly.dev gemäss schweizerischem Recht und § 5 TMG.',
      en: 'Provider information for app.redactly.dev under Swiss law and § 5 TMG (Germany).',
    })}
  />
</svelte:head>

<LegalLayout {title}>
  {#if lang === 'en'}
    <p class="lang-note">
      This English version is provided for convenience. The <a href="/legal/impressum"
        >German version</a
      > is the legally binding one.
    </p>

    <p>
      Provider information for this website under Swiss law (UWG Art. 3 (1) lit. s) and § 5 of the
      German Telemediengesetz (TMG).
    </p>

    <h2>Provider & responsible party</h2>
    <address>
      Moritz Hauff IT<br />
      c/o Moritz Hauff<br />
      Okenfinerstrasse 2c<br />
      8274 Tägerwilen<br />
      Switzerland<br /><br />
      Email: info@hauff-it.ch
    </address>

    <h2>Commercial register & company details</h2>
    <p>
      Moritz Hauff IT is registered in the Swiss commercial register as a sole proprietorship. The
      owner and authorised representative is Moritz Hauff.
    </p>
    <table>
      <tbody>
        <tr><th>Company</th><td>Moritz Hauff IT</td></tr>
        <tr><th>Legal form</th><td>Sole proprietorship (Einzelunternehmen)</td></tr>
        <tr><th>Registered office</th><td>Tägerwilen, Switzerland</td></tr>
        <tr><th>UID (VAT)</th><td>CHE-327.341.932</td></tr>
        <tr><th>CH-ID</th><td>CH-440-1042910-8</td></tr>
        <tr><th>Register number (FCRO-ID)</th><td>1695695</td></tr>
        <tr><th>Owner</th><td>Moritz Hauff</td></tr>
      </tbody>
    </table>
    <p>
      Current commercial register extracts are available via <a href="https://www.zefix.ch"
        >zefix.ch</a
      > (Central Business Name Index of Switzerland).
    </p>

    <h2>Product</h2>
    <p>
      This app (<code>app.redactly.dev</code>) is the hosted instance of <strong>Redactly</strong>
      — a browser-only PII and secret masking tool. The marketing site is at
      <a href="https://redactly.dev">redactly.dev</a>. The source code is on
      <a href="https://github.com/moritz-hauff-it/redactly">GitHub</a> under the FSL-1.1-Apache-2.0 licence.
    </p>
    <p>
      Conditions for using this hosted instance are set out in the <a href="/legal/terms"
        >Terms of Service</a
      >. Data processing is described in the <a href="/legal/datenschutz">Privacy Policy</a>.
    </p>

    <h2>Liability for content</h2>
    <p>
      Content on this website has been prepared with the greatest care. However, we cannot guarantee
      accuracy, completeness, or timeliness. As a provider, we are responsible under general law for
      our own content on these pages. We are not, however, obliged to monitor transmitted or stored
      third-party information or to investigate circumstances suggesting unlawful activity.
      Liability in this respect is only possible from the moment of knowledge of a specific legal
      violation.
    </p>

    <h2>Liability for links</h2>
    <p>
      This website contains links to third-party websites (notably GitHub, HuggingFace, MLC) over
      whose content we have no influence. The respective provider or operator is always responsible
      for the content of linked pages.
    </p>

    <h2>Copyright</h2>
    <p>
      Content and works created by the provider are subject to Swiss copyright law. The Redactly
      source code is available under the FSL-1.1-Apache-2.0 licence and may be used under its terms.
    </p>

    <h2>Dispute resolution</h2>
    <p>
      The European Commission provides a platform for online dispute resolution (ODR): <a
        href="https://ec.europa.eu/consumers/odr">https://ec.europa.eu/consumers/odr</a
      >. We are not obliged and not willing to participate in dispute resolution proceedings before
      a consumer arbitration board.
    </p>
  {:else}
    <p>
      Angaben zum Anbieter dieser Website gemäss schweizerischem Recht (UWG Art. 3 Abs. 1 lit. s)
      sowie § 5 Telemediengesetz (TMG, Deutschland).
    </p>

    <h2>Anbieter & Verantwortlicher</h2>
    <address>
      Moritz Hauff IT<br />
      c/o Moritz Hauff<br />
      Okenfinerstrasse 2c<br />
      8274 Tägerwilen<br />
      Schweiz<br /><br />
      E-Mail: info@hauff-it.ch
    </address>

    <h2>Handelsregister & Unternehmensangaben</h2>
    <p>
      Moritz Hauff IT ist im schweizerischen Handelsregister als Einzelunternehmen eingetragen.
      Inhaber und vertretungsberechtigte Person ist Moritz Hauff.
    </p>
    <table>
      <tbody>
        <tr><th>Firma</th><td>Moritz Hauff IT</td></tr>
        <tr><th>Rechtsform</th><td>Einzelunternehmen</td></tr>
        <tr><th>Sitz</th><td>Tägerwilen, Schweiz</td></tr>
        <tr><th>UID</th><td>CHE-327.341.932</td></tr>
        <tr><th>CH-ID</th><td>CH-440-1042910-8</td></tr>
        <tr><th>HR-Nr. (FCRO-ID)</th><td>1695695</td></tr>
        <tr><th>Inhaber</th><td>Moritz Hauff</td></tr>
      </tbody>
    </table>
    <p>
      Aktuelle Handelsregisterauszüge sind über <a href="https://www.zefix.ch">zefix.ch</a> (Zentraler
      Firmenindex der Schweiz) abrufbar.
    </p>

    <h2>Produkt</h2>
    <p>
      Diese App (<code>app.redactly.dev</code>) ist die gehostete Instanz von
      <strong>Redactly</strong> — ein Browser-only PII- und Secret-Masking-Tool. Die
      Marketing-Website ist <a href="https://redactly.dev">redactly.dev</a>. Der Quellcode steht auf
      <a href="https://github.com/moritz-hauff-it/redactly">GitHub</a> unter der FSL-1.1-Apache-2.0-Lizenz.
    </p>
    <p>
      Die Bedingungen für die Nutzung dieser gehosteten Instanz finden sich in den <a
        href="/legal/terms">Nutzungsbedingungen</a
      >. Die Verarbeitung von Daten ist in der <a href="/legal/datenschutz">Datenschutzerklärung</a> geregelt.
    </p>

    <h2>Haftung für Inhalte</h2>
    <p>
      Die Inhalte dieser Website wurden mit grösster Sorgfalt erstellt. Für die Richtigkeit,
      Vollständigkeit und Aktualität kann jedoch keine Gewähr übernommen werden. Als Anbieter sind
      wir gemäss den allgemeinen Gesetzen für eigene Inhalte verantwortlich. Eine Haftung ist erst
      ab dem Zeitpunkt der Kenntnis einer konkreten Rechtsverletzung möglich.
    </p>

    <h2>Haftung für Links</h2>
    <p>
      Diese Website enthält Links zu externen Websites Dritter (insbesondere GitHub, HuggingFace,
      MLC), auf deren Inhalte wir keinen Einfluss haben. Für die Inhalte der verlinkten Seiten ist
      stets der jeweilige Anbieter verantwortlich.
    </p>

    <h2>Urheberrecht</h2>
    <p>
      Die durch den Anbieter erstellten Inhalte und Werke unterliegen dem schweizerischen
      Urheberrecht. Der Quellcode des Produkts Redactly steht unter der FSL-1.1-Apache-2.0-Lizenz
      und darf gemäss deren Bedingungen verwendet werden.
    </p>

    <h2>Streitschlichtung</h2>
    <p>
      Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit: <a
        href="https://ec.europa.eu/consumers/odr">https://ec.europa.eu/consumers/odr</a
      >. Wir sind nicht verpflichtet und nicht bereit, an Streitbeilegungsverfahren vor einer
      Verbraucherschlichtungsstelle teilzunehmen.
    </p>
  {/if}
</LegalLayout>
