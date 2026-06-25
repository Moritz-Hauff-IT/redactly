import { describe, expect, it } from 'vitest';
import { GazetteerNameDetector } from './gazetteer.js';

const det = new GazetteerNameDetector();
const names = (t: string) => det.detect(t).map((e) => e.text);

describe('GazetteerNameDetector', () => {
  it('detects a first+last name in prose', () => {
    expect(names('Der Vertrag wurde von Anna Schmidt geprüft.')).toContain('Anna Schmidt');
  });

  it('emits PERSON with the right category and offsets', () => {
    const text = 'Kontakt: Max Mustermann.';
    const [e] = det.detect(text);
    expect(e).toMatchObject({ type: 'PERSON', category: 'person', text: 'Max Mustermann' });
    expect(text.slice(e!.start, e!.end)).toBe('Max Mustermann');
  });

  it('handles a noble particle (von / van)', () => {
    expect(names('Werk von Ludwig van Beethoven')).toContain('Ludwig van Beethoven');
  });

  it('raises confidence when the surname is also known', () => {
    const known = det.detect('Anna Müller')[0]!; // Müller is in the surname list
    const unknown = det.detect('Anna Xancliffe')[0]!;
    expect(known.confidence).toBeGreaterThan(unknown.confidence);
  });

  it('does not fire on a lone first name (left to the salutation regex)', () => {
    expect(names('Hallo Anna, wie geht es dir?')).toEqual([]);
  });

  it('does not fire on capitalized non-names', () => {
    expect(names('The Quick Brown Fox')).toEqual([]);
  });

  it('skips ambiguous first+first sequences', () => {
    // "Anna Maria" — both are first names; too ambiguous to claim as one person.
    expect(names('Anna Maria kommt später.')).toEqual([]);
  });

  it('detects French, Italian and English names too', () => {
    expect(names('Le contrat de Jean Dubois')).toContain('Jean Dubois');
    expect(names('Firmato da Giuseppe Rossi')).toContain('Giuseppe Rossi');
    expect(names('Signed by John Smith')).toContain('John Smith');
  });
});
