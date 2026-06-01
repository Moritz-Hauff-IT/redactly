<script lang="ts">
  import LegalLayout from '$lib/components/LegalLayout.svelte';
  import { loc, currentLocale } from '$lib/i18n/locale.svelte.js';

  const lang = $derived(currentLocale());
  const title = $derived(loc({ de: 'Nutzungsbedingungen', en: 'Terms of Service' }));
</script>

<svelte:head>
  <title>{title} — Redactly</title>
  <meta
    name="description"
    content={loc({
      de: 'Bedingungen für die Nutzung der gehosteten Redactly-Instanz auf app.redactly.dev.',
      en: 'Terms for using the hosted Redactly instance at app.redactly.dev.',
    })}
  />
</svelte:head>

<LegalLayout {title}>
  {#if lang === 'en'}
    <p class="lang-note">
      This English version is provided for convenience. The <a href="/legal/terms">German version</a
      > is the legally binding one.
    </p>

    <p>
      These Terms of Service govern the use of the online services at <code>redactly.dev</code> and
      <code>app.redactly.dev</code> (the "Service") by the user. Provider is Moritz Hauff IT (see
      <a href="/legal/impressum">Imprint</a>).
    </p>

    <h2>1. Subject matter</h2>
    <p>
      The Service provides the <strong>Redactly</strong> tool as a browser-based web application. Redactly
      detects and masks personal data (PII) and secrets in entered text or uploaded files and offers reversible
      masking.
    </p>
    <p>
      Processing of inputs takes place exclusively in the user's browser. There is no transmission
      of inputs to the provider (see <a href="/legal/datenschutz">Privacy Policy</a>).
    </p>

    <h2>2. Conclusion of contract, no user account</h2>
    <p>
      The Service can be used without registration. By using the Service, the user accepts these
      Terms. The Service is currently free of charge. The provider reserves the right to offer
      individual functions or the entire Service for a fee in the future or to discontinue them.
    </p>

    <h2>3. Open-source licence of the source code</h2>
    <p>
      The Redactly source code is available under the <a
        href="https://github.com/moritz-hauff-it/redactly/blob/main/LICENSE"
        >Functional Source License (FSL-1.1-Apache-2.0)</a
      >. The FSL grants the right to read, modify, and use the source code for non-competing
      purposes; after two years the licence automatically converts to Apache-2.0.
    </p>
    <p>
      These Terms govern <strong>only the use of the hosted instance</strong>. The source code
      licence remains unaffected and gives the user the right to operate their own instance.
    </p>

    <h2>4. Permitted use</h2>
    <p>
      The Service may be used for any lawful masking of texts and files — in particular for
      pre-processing content before passing it to third parties (e.g. cloud LLMs).
    </p>
    <p>
      The user is solely responsible for whether the masking is sufficient in the respective
      context. In particular, Redactly does <strong>not</strong> replace any data protection assessment
      (e.g. DPIA, data processing agreement), employment-law requirements, or industry-specific confidentiality
      obligations.
    </p>

    <h2>5. Prohibited use</h2>
    <ul>
      <li>using the Service for unlawful purposes</li>
      <li>
        attempting to manipulate, overload, or impair availability (e.g. automated mass requests,
        denial-of-service)
      </li>
      <li>
        attempting to exploit vulnerabilities through reverse engineering or similar without
        informing the provider in writing in advance
      </li>
      <li>distributing malware via the Service</li>
      <li>circumventing security or access measures</li>
    </ul>
    <p>
      Responsible security reports (coordinated disclosure) are explicitly welcome — see <a
        href="https://github.com/moritz-hauff-it/redactly/blob/main/SECURITY.md"
        >SECURITY.md in the repository</a
      >.
    </p>

    <h2>6. Availability and maintenance</h2>
    <p>
      The provider strives for the highest possible availability but owes no specific availability.
      Maintenance, update, and security windows are possible without prior notice. The provider may
      modify, extend, restrict, or discontinue the Service at any time.
    </p>

    <h2>7. Warranty and liability</h2>
    <p>
      The Service is provided <strong>"as is" and without any warranty</strong>, express or implied.
      In particular, no warranty is given for:
    </p>
    <ul>
      <li>completeness of detection (false negatives are possible)</li>
      <li>correctness of restoration from an LLM response</li>
      <li>uninterrupted availability or freedom from errors</li>
      <li>suitability for a particular purpose</li>
    </ul>
    <p>
      To the extent permitted by law, the provider is liable exclusively for damages caused by
      intent or gross negligence. Liability for slight negligence is excluded — except for damages
      resulting from injury to life, body, or health, and claims under the product liability act.
    </p>
    <p>
      When using the Service as pre-processing for cloud LLMs, the final assessment of which data
      may be passed to the LLM provider is the user's sole responsibility.
    </p>

    <h2>8. Model downloads</h2>
    <p>
      When the NER or WebLLM functions are enabled, the user's browser downloads ML models directly
      from HuggingFace or an MLC CDN. The terms and privacy policies of these providers apply.
      Details in § 4 of the <a href="/legal/datenschutz">Privacy Policy</a>.
    </p>

    <h2>9. Data protection</h2>
    <p>The separate <a href="/legal/datenschutz">Privacy Policy</a> applies.</p>

    <h2>10. Changes to these Terms</h2>
    <p>
      The provider may adjust these Terms at any time. The current version is always available at
      this URL.
    </p>

    <h2>11. Applicable law and jurisdiction</h2>
    <p>
      Swiss law applies, excluding conflict-of-laws rules and the UN Convention on Contracts for the
      International Sale of Goods (CISG). Exclusive jurisdiction for all disputes is Tägerwilen,
      Switzerland, insofar as the user is an entrepreneur. For consumers domiciled in the EU,
      mandatory consumer-protection provisions of the country of domicile remain unaffected.
    </p>
    <p><em>Last updated: June 2026</em></p>
  {:else}
    <p>
      Diese Nutzungsbedingungen regeln die Nutzung der unter <code>redactly.dev</code> und
      <code>app.redactly.dev</code> bereitgestellten Online-Dienste (zusammen: der „Dienst") durch
      den Nutzer. Anbieter ist Moritz Hauff IT (siehe <a href="/legal/impressum">Impressum</a>).
    </p>

    <h2>1. Gegenstand</h2>
    <p>
      Der Dienst stellt das Werkzeug <strong>Redactly</strong> als browserbasierte Web-Anwendung bereit.
      Redactly erkennt und maskiert in eingegebenem Text bzw. hochgeladenen Dateien personenbezogene Daten
      (PII) und Secrets und stellt eine reversible Maskierung zur Verfügung.
    </p>
    <p>
      Die Verarbeitung der Eingaben erfolgt ausschliesslich im Browser des Nutzers. Es findet keine
      Übertragung der Eingaben an den Anbieter statt (siehe <a href="/legal/datenschutz"
        >Datenschutzerklärung</a
      >).
    </p>

    <h2>2. Vertragsschluss, kein Nutzerkonto</h2>
    <p>
      Der Dienst kann ohne Registrierung verwendet werden. Mit der Nutzung erkennt der Nutzer diese
      Nutzungsbedingungen an. Der Dienst ist aktuell kostenfrei. Der Anbieter behält sich vor,
      einzelne Funktionen oder den gesamten Dienst künftig kostenpflichtig anzubieten oder
      einzustellen.
    </p>

    <h2>3. Open-Source-Lizenz des Quellcodes</h2>
    <p>
      Der Quellcode von Redactly steht unter der <a
        href="https://github.com/moritz-hauff-it/redactly/blob/main/LICENSE"
        >Functional Source License (FSL-1.1-Apache-2.0)</a
      > zur Verfügung. Die FSL gewährt das Recht, den Quellcode zu lesen, zu modifizieren und für nicht-konkurrierende
      Zwecke zu nutzen; nach zwei Jahren wandelt sich die Lizenz automatisch in Apache-2.0.
    </p>
    <p>
      Diese Nutzungsbedingungen regeln <strong
        >ausschliesslich die Nutzung der gehosteten Instanz</strong
      >. Die Quellcode-Lizenz bleibt unberührt und gibt dem Nutzer insbesondere das Recht, eine
      eigene Instanz zu betreiben.
    </p>

    <h2>4. Erlaubte Nutzung</h2>
    <p>
      Der Dienst darf für jede rechtmässige Maskierung von Texten und Dateien verwendet werden —
      insbesondere zur Vorverarbeitung von Inhalten vor der Weitergabe an Dritte (z. B. Cloud-LLMs).
    </p>
    <p>
      Der Nutzer ist allein dafür verantwortlich, ob die Maskierung im jeweiligen Kontext
      ausreichend ist. Insbesondere ersetzt Redactly <strong>keine</strong> datenschutzrechtliche Prüfung
      (z. B. DSFA, Auftragsverarbeitungsvertrag), arbeitsrechtliche Vorgaben oder branchenspezifische
      Geheimhaltungspflichten.
    </p>

    <h2>5. Untersagte Nutzung</h2>
    <ul>
      <li>die Nutzung des Dienstes zu rechtswidrigen Zwecken</li>
      <li>
        Versuche, den Dienst zu manipulieren, zu überlasten oder die Verfügbarkeit für andere Nutzer
        zu beeinträchtigen (z. B. Mass-Anfragen, Denial-of-Service)
      </li>
      <li>
        Versuche, durch Reverse Engineering oder Penetration Tests Schwachstellen auszunutzen, ohne
        den Anbieter vorab schriftlich zu informieren
      </li>
      <li>die Verbreitung von Schadsoftware</li>
      <li>die Umgehung von Sicherheits- oder Zugriffsmassnahmen</li>
    </ul>
    <p>
      Verantwortliche Sicherheitsmeldungen (Coordinated Disclosure) sind ausdrücklich willkommen —
      siehe <a href="https://github.com/moritz-hauff-it/redactly/blob/main/SECURITY.md"
        >SECURITY.md im Repository</a
      >.
    </p>

    <h2>6. Verfügbarkeit und Wartung</h2>
    <p>
      Der Anbieter ist bemüht, eine möglichst hohe Verfügbarkeit zu gewährleisten, schuldet aber
      keine bestimmte Verfügbarkeit. Wartungs-, Aktualisierungs- und Sicherheitsfenster sind ohne
      Vorankündigung möglich. Der Anbieter darf den Dienst jederzeit ändern, ergänzen, einschränken
      oder einstellen.
    </p>

    <h2>7. Gewährleistung und Haftung</h2>
    <p>
      Der Dienst wird <strong>„wie besehen" und ohne jegliche Gewährleistung</strong> zur Verfügung gestellt.
      Insbesondere übernimmt der Anbieter keine Gewähr für:
    </p>
    <ul>
      <li>die Vollständigkeit der Erkennung (False Negatives sind möglich)</li>
      <li>die Korrektheit der Restauration aus einer LLM-Antwort</li>
      <li>die ununterbrochene Verfügbarkeit oder Fehlerfreiheit</li>
      <li>die Eignung für einen bestimmten Zweck</li>
    </ul>
    <p>
      Soweit gesetzlich zulässig, haftet der Anbieter ausschliesslich für Schäden aus Vorsatz oder
      grober Fahrlässigkeit. Die Haftung für leichte Fahrlässigkeit ist ausgeschlossen — ausgenommen
      sind Schäden aus der Verletzung des Lebens, des Körpers oder der Gesundheit sowie Ansprüche
      nach dem Produkthaftungsgesetz.
    </p>
    <p>
      Bei Verwendung als Vorverarbeitung für Cloud-LLMs liegt die abschliessende Prüfung, welche
      Daten an den LLM-Anbieter weitergegeben werden dürfen, allein in der Verantwortung des
      Nutzers.
    </p>

    <h2>8. Modell-Downloads</h2>
    <p>
      Bei aktivierter NER- oder WebLLM-Funktion lädt der Browser des Nutzers ML-Modelle direkt von
      HuggingFace bzw. einem MLC-CDN herunter. Es gelten die Nutzungsbedingungen und
      Datenschutzerklärungen dieser Anbieter. Details siehe § 4 der <a href="/legal/datenschutz"
        >Datenschutzerklärung</a
      >.
    </p>

    <h2>9. Datenschutz</h2>
    <p>Es gilt die separate <a href="/legal/datenschutz">Datenschutzerklärung</a>.</p>

    <h2>10. Änderungen dieser Bedingungen</h2>
    <p>
      Der Anbieter kann diese Nutzungsbedingungen jederzeit anpassen. Die jeweils aktuelle Fassung
      ist unter dieser URL abrufbar.
    </p>

    <h2>11. Anwendbares Recht und Gerichtsstand</h2>
    <p>
      Es gilt schweizerisches Recht unter Ausschluss kollisionsrechtlicher Verweisungsnormen und des
      UN-Kaufrechts (CISG). Ausschliesslicher Gerichtsstand ist Tägerwilen, Schweiz, soweit der
      Nutzer Unternehmer ist. Bei Verbrauchern mit Wohnsitz in der EU gelten zwingende
      verbraucherschützende Vorschriften des Wohnsitzstaats unberührt.
    </p>
    <p><em>Stand: Juni 2026</em></p>
  {/if}
</LegalLayout>
