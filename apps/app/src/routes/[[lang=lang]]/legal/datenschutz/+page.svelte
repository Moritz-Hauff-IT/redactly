<script lang="ts">
  import LegalLayout from '$lib/components/LegalLayout.svelte';
  import { loc, currentLocale } from '$lib/i18n/locale.svelte.js';

  const lang = $derived(currentLocale());
  const title = $derived(loc({ de: 'Datenschutzerklärung', en: 'Privacy Policy' }));
</script>

<svelte:head>
  <title>{title} — Redactly</title>
  <meta
    name="description"
    content={loc({
      de: 'Wie Redactly mit personenbezogenen Daten umgeht — Schweizer revDSG und EU-DSGVO. Eingaben verlassen den Browser nicht.',
      en: 'How Redactly handles personal data — Swiss revFADP and EU GDPR. Inputs never leave your browser.',
    })}
  />
</svelte:head>

<LegalLayout {title}>
  {#if lang === 'en'}
    <p class="lang-note">
      This English version is provided for convenience. The <a href="/legal/datenschutz"
        >German version</a
      > is the legally binding one.
    </p>

    <p>
      This declaration informs about which personal data is collected, processed, and used when
      using this web app (<code>app.redactly.dev</code>) and visiting the marketing site
      <code>redactly.dev</code>. The basis is the revised Swiss Federal Act on Data Protection
      (revFADP) and, where applicable, the EU General Data Protection Regulation (GDPR).
    </p>

    <h2>1. Data controller</h2>
    <address>
      Moritz Hauff IT<br />
      c/o Moritz Hauff<br />
      Okenfinerstrasse 2c<br />
      8274 Tägerwilen<br />
      Switzerland<br /><br />
      UID: CHE-327.341.932<br />
      Email: info@hauff-it.ch
    </address>
    <p>Further details in the <a href="/legal/impressum">Imprint</a>.</p>

    <h2>2. Principle: browser-only processing</h2>
    <p>
      Redactly is designed as a browser-based application.
      <strong
        >Inputs (text, uploaded files, detected entities, mappings) are processed exclusively
        locally in the user's browser and do not leave the browser.</strong
      > There is no server-side transmission, storage, or evaluation of user content by the provider.
    </p>
    <p>
      Masking, the mapping between original values and placeholders, and the restoration of original
      data take place entirely within the user's browser tab session. When the tab is closed, this
      data is discarded.
    </p>
    <p>
      This can be independently verified at any time — the entire source code is <a
        href="https://github.com/moritz-hauff-it/redactly">public</a
      >, and network traffic can be inspected via the browser's DevTools (Network tab).
    </p>

    <h2>3. Access data / server log files</h2>
    <p>
      In a legitimate interest to provide a secure and reliable service (Art. 6 (1) (f) GDPR), the
      hosting provider automatically logs data in server log files when this app is accessed:
    </p>
    <ul>
      <li>the IP address of the requesting device (typically shortened by the infrastructure)</li>
      <li>date and time of the request</li>
      <li>name and URL of the file accessed</li>
      <li>amount of data transferred and HTTP status code</li>
      <li>referrer URL</li>
      <li>browser, operating system, and language</li>
    </ul>
    <p>
      This data is not merged with other data sources and is deleted no later than 30 days, unless
      required longer due to a security incident.
    </p>

    <h2>4. External model CDNs (HuggingFace, MLC)</h2>
    <p>At the user's request (opt-in in the app settings), Redactly uses client-side ML models:</p>
    <ul>
      <li>
        <strong>NER model</strong> — upon first activation, the user's browser loads the model
        directly from <a href="https://huggingface.co">huggingface.co</a>. The user's IP address is
        transmitted to HuggingFace, Inc. (USA). The model is then cached locally.
      </li>
      <li>
        <strong>WebLLM model</strong> (optional, WebGPU browsers) — loaded directly from an MLC CDN or
        HuggingFace upon activation. The user's IP address is transmitted to the respective provider;
        the model is cached locally.
      </li>
    </ul>
    <p>
      Legal basis is the user's explicit consent (Art. 6 (1) (a) GDPR), granted by actively enabling
      the mode. Consent can be revoked at any time by disabling the option (effect: no further model
      requests; cached models can be deleted via the browser cache).
    </p>
    <p>
      <strong>Input content is never transmitted to these services</strong> — the models run exclusively
      locally after the one-time download.
    </p>

    <h2>5. Cookies and local storage</h2>
    <p>
      This app sets <strong>no tracking or marketing cookies</strong> and integrates no external analytics
      or advertising services. Technically necessary local storage on the user's device:
    </p>
    <table>
      <thead>
        <tr><th>Mechanism</th><th>Purpose</th><th>Content</th></tr>
      </thead>
      <tbody>
        <tr>
          <td><code>localStorage</code></td>
          <td>Remember app settings (language, "NER enabled", WebLLM mode)</td>
          <td>Boolean flags, string keys — no personal data</td>
        </tr>
        <tr>
          <td><code>Cache API</code> / <code>IndexedDB</code></td>
          <td>Cache ML model binaries (see § 4)</td>
          <td>NER / WebLLM model files</td>
        </tr>
        <tr>
          <td>Tab memory</td>
          <td>Entered text, detected entities, original→placeholder mapping</td>
          <td>Discarded when tab closes</td>
        </tr>
      </tbody>
    </table>
    <p>
      Legal basis is the legitimate interest in a functional application (Art. 6 (1) (f) GDPR) or —
      for model caches — the consent granted in § 4. Since no non-essential cookies (§ 25 TTDSG /
      ePrivacy Directive) are set, no consent banner is required. The user can delete this storage
      at any time via the browser settings.
    </p>

    <h2>6. Contact</h2>
    <p>
      When contacting us by email (info@hauff-it.ch or hello@redactly.dev), the information provided
      is stored to process the request. Legal basis is Art. 6 (1) (b) GDPR (pre-contractual /
      contractual measures) or Art. 6 (1) (f) GDPR (legitimate interest in answering inquiries).
      Data is deleted as soon as the purpose has ceased.
    </p>

    <h2>7. Data subject rights</h2>
    <p>Data subjects have, within the statutory framework, the right to:</p>
    <ul>
      <li>access (Art. 15 GDPR)</li>
      <li>rectification (Art. 16 GDPR)</li>
      <li>erasure (Art. 17 GDPR)</li>
      <li>restriction of processing (Art. 18 GDPR)</li>
      <li>data portability (Art. 20 GDPR)</li>
      <li>objection (Art. 21 GDPR)</li>
      <li>withdrawal of consent (Art. 7 (3) GDPR) — e.g. for model downloads (§ 4)</li>
    </ul>
    <p>
      Since the provider does not collect user content in normal operation, requests are limited to
      any data stored in connection with contact (§ 6). To exercise these rights, an informal email
      to info@hauff-it.ch is sufficient.
    </p>

    <h2>8. Right to lodge a complaint</h2>
    <ul>
      <li>
        <strong>Switzerland</strong>: Federal Data Protection and Information Commissioner (FDPIC),
        <a href="https://www.edoeb.admin.ch">edoeb.admin.ch</a>
      </li>
      <li>
        <strong>EU</strong>: competent data protection authority of the member state of habitual
        residence or alleged infringement (Art. 77 GDPR)
      </li>
    </ul>

    <h2>9. Changes to this policy</h2>
    <p>
      This privacy policy may be adjusted if changes to the application, the legal situation, or the
      processing practice make this necessary. The current version is always available at this URL.
    </p>
    <p><em>Last updated: June 2026</em></p>
  {:else}
    <p>
      Diese Erklärung informiert darüber, welche personenbezogenen Daten beim Besuch dieser Web-App
      (<code>app.redactly.dev</code>) sowie der Marketing-Website <code>redactly.dev</code>
      erhoben, verarbeitet und genutzt werden. Grundlage sind das revidierte Schweizer Datenschutzgesetz
      (revDSG) sowie — soweit anwendbar — die EU-Datenschutz-Grundverordnung (DSGVO).
    </p>

    <h2>1. Verantwortliche Stelle</h2>
    <address>
      Moritz Hauff IT<br />
      c/o Moritz Hauff<br />
      Okenfinerstrasse 2c<br />
      8274 Tägerwilen<br />
      Schweiz<br /><br />
      UID: CHE-327.341.932<br />
      E-Mail: info@hauff-it.ch
    </address>
    <p>Weitere Angaben siehe <a href="/legal/impressum">Impressum</a>.</p>

    <h2>2. Grundsatz: Browser-only-Verarbeitung</h2>
    <p>
      Redactly ist als browserbasierte Anwendung konzipiert.
      <strong
        >Eingaben (Texte, hochgeladene Dateien, erkannte Entitäten, Mappings) werden ausschliesslich
        lokal im Browser des Nutzers verarbeitet und verlassen den Browser nicht.</strong
      > Es existiert keine serverseitige Übermittlung, Speicherung oder Auswertung von Nutzerinhalten
      durch den Anbieter.
    </p>
    <p>
      Die Maskierung, das Mapping zwischen Originalwerten und Platzhaltern sowie die Restauration
      erfolgen ausschliesslich in der Browser-Tab-Session des Nutzers. Mit dem Schliessen des Tabs
      werden diese Daten verworfen.
    </p>
    <p>
      Dies kann jederzeit unabhängig überprüft werden — der gesamte Quellcode ist <a
        href="https://github.com/moritz-hauff-it/redactly">öffentlich</a
      >, und der Netzwerkverkehr lässt sich über die Browser-DevTools (Tab „Network")
      nachvollziehen.
    </p>

    <h2>3. Zugriffsdaten / Server-Logfiles</h2>
    <p>
      Aus berechtigtem Interesse an einer sicheren und zuverlässigen Bereitstellung (Art. 6 Abs. 1
      lit. f DSGVO) protokolliert der Hosting-Anbieter beim Zugriff Daten in Server-Logfiles:
    </p>
    <ul>
      <li>IP-Adresse des anfragenden Geräts (von der Infrastruktur typischerweise gekürzt)</li>
      <li>Datum und Uhrzeit der Anfrage</li>
      <li>Name und URL der abgerufenen Datei</li>
      <li>übertragene Datenmenge und HTTP-Statuscode</li>
      <li>Referrer-URL</li>
      <li>Browser, Betriebssystem und Sprache</li>
    </ul>
    <p>
      Diese Daten werden nicht mit anderen Datenquellen zusammengeführt und spätestens nach 30 Tagen
      gelöscht, soweit nicht aufgrund eines Sicherheitsvorfalls länger benötigt.
    </p>

    <h2>4. Externe Modell-CDNs (HuggingFace, MLC)</h2>
    <p>
      Auf Wunsch des Nutzers (Opt-in in den App-Einstellungen) nutzt Redactly clientseitige
      ML-Modelle:
    </p>
    <ul>
      <li>
        <strong>NER-Modell</strong> — beim erstmaligen Aktivieren lädt der Browser des Nutzers das
        Modell direkt von <a href="https://huggingface.co">huggingface.co</a>. Hierbei wird die
        IP-Adresse des Nutzers an HuggingFace, Inc. (USA) übermittelt. Anschliessend wird das Modell
        lokal gecacht.
      </li>
      <li>
        <strong>WebLLM-Modell</strong> (optional, WebGPU-Browser) — beim Aktivieren wird das Modell direkt
        von einem MLC-CDN bzw. HuggingFace geladen. Auch hier wird die IP-Adresse an den jeweiligen Anbieter
        übermittelt; das Modell wird lokal gecacht.
      </li>
    </ul>
    <p>
      Rechtsgrundlage ist die ausdrückliche Einwilligung des Nutzers (Art. 6 Abs. 1 lit. a DSGVO),
      die durch das aktive Aktivieren des Modus erteilt wird. Die Einwilligung kann jederzeit durch
      Deaktivieren in den Einstellungen widerrufen werden (Wirkung: keine weiteren Modell-Anfragen;
      gecachte Modelle können über den Browser-Cache gelöscht werden).
    </p>
    <p>
      <strong>Inhalte der Eingaben werden zu keinem Zeitpunkt an diese Dienste übermittelt</strong> —
      die Modelle laufen nach dem einmaligen Download ausschliesslich lokal.
    </p>

    <h2>5. Cookies und lokale Speicherung</h2>
    <p>
      Diese App setzt <strong>keine Tracking- oder Marketing-Cookies</strong> und bindet keine externen
      Analyse- oder Werbe-Dienste ein. Technisch notwendige Speicherung auf dem Endgerät:
    </p>
    <table>
      <thead>
        <tr><th>Mechanismus</th><th>Zweck</th><th>Inhalt</th></tr>
      </thead>
      <tbody>
        <tr>
          <td><code>localStorage</code></td>
          <td>App-Einstellungen merken (Sprache, „NER aktiviert", WebLLM-Modus)</td>
          <td>Boolean-Flags, String-Keys — keine personenbezogenen Daten</td>
        </tr>
        <tr>
          <td><code>Cache API</code> / <code>IndexedDB</code></td>
          <td>Cachen heruntergeladener ML-Modelle (siehe § 4)</td>
          <td>NER-/WebLLM-Modell-Binärdaten</td>
        </tr>
        <tr>
          <td>Tab-Memory</td>
          <td>Eingegebener Text, erkannte Entitäten, Original→Platzhalter-Mapping</td>
          <td>Wird beim Schliessen des Tabs verworfen</td>
        </tr>
      </tbody>
    </table>
    <p>
      Rechtsgrundlage ist das berechtigte Interesse an einer funktionsfähigen Anwendung (Art. 6 Abs.
      1 lit. f DSGVO) bzw. — für die Modell-Caches — die in § 4 erteilte Einwilligung. Da keine
      nicht-notwendigen Cookies (§ 25 TTDSG / ePrivacy-Richtlinie) gesetzt werden, ist kein
      Consent-Banner erforderlich. Der Nutzer kann die Speicherung jederzeit über
      Browser-Einstellungen löschen.
    </p>

    <h2>6. Kontaktaufnahme</h2>
    <p>
      Bei einer Kontaktaufnahme per E-Mail (info@hauff-it.ch oder hello@redactly.dev) werden die
      mitgeteilten Angaben gespeichert. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO
      (vorvertragliche/vertragliche Massnahmen) bzw. Art. 6 Abs. 1 lit. f DSGVO (berechtigtes
      Interesse an Beantwortung). Die Daten werden gelöscht, sobald der Zweck der Erhebung entfallen
      ist.
    </p>

    <h2>7. Rechte der betroffenen Personen</h2>
    <p>Betroffene Personen haben im gesetzlichen Rahmen jederzeit das Recht auf:</p>
    <ul>
      <li>Auskunft (Art. 15 DSGVO)</li>
      <li>Berichtigung (Art. 16 DSGVO)</li>
      <li>Löschung (Art. 17 DSGVO)</li>
      <li>Einschränkung der Verarbeitung (Art. 18 DSGVO)</li>
      <li>Datenübertragbarkeit (Art. 20 DSGVO)</li>
      <li>Widerspruch (Art. 21 DSGVO)</li>
      <li>Widerruf einer Einwilligung (Art. 7 Abs. 3 DSGVO) — etwa für Modell-Downloads (§ 4)</li>
    </ul>
    <p>
      Da der Anbieter im Normalbetrieb keine Nutzerinhalte erhebt, beschränken sich Anfragen auf
      etwaige bei Kontaktaufnahme (§ 6) gespeicherte Daten. Zur Geltendmachung genügt eine formlose
      E-Mail an info@hauff-it.ch.
    </p>

    <h2>8. Beschwerderecht</h2>
    <ul>
      <li>
        <strong>Schweiz</strong>: Eidgenössischer Datenschutz- und Öffentlichkeitsbeauftragter
        (EDÖB), <a href="https://www.edoeb.admin.ch">edoeb.admin.ch</a>
      </li>
      <li>
        <strong>EU</strong>: jeweils zuständige Datenschutzbehörde des Mitgliedstaats des
        gewöhnlichen Aufenthaltsorts (Art. 77 DSGVO)
      </li>
    </ul>

    <h2>9. Änderungen dieser Erklärung</h2>
    <p>
      Diese Datenschutzerklärung kann angepasst werden, sofern Änderungen der Anwendung, der
      Rechtslage oder der Verarbeitungspraxis dies erfordern. Die jeweils aktuelle Fassung ist unter
      dieser URL abrufbar.
    </p>
    <p><em>Stand: Juni 2026</em></p>
  {/if}
</LegalLayout>
