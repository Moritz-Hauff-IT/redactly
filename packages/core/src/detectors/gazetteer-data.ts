/**
 * Curated DACH name gazetteer (lowercased) for GazetteerNameDetector.
 *
 * Not exhaustive — a high-signal core of common German/Swiss/Austrian first
 * names and surnames. The detector only fires on "first + capitalized word",
 * so the first-name list drives recall while the surname list only raises
 * confidence. Kept deliberately free of words that double as common nouns.
 */

// prettier-ignore
const FIRST = [
  // male
  'alexander','andreas','anton','armin','arndt','bastian','benedikt','benjamin','bernd','bernhard',
  'christian','christoph','daniel','david','dennis','dieter','dirk','dominik','elias','emil',
  'fabian','felix','florian','frank','franz','friedrich','georg','gerhard','günter','hannes',
  'hans','heiko','heinrich','helmut','henrik','holger','jakob','jan','jens','joachim',
  'johann','johannes','jonas','jörg','josef','jürgen','kai','karl','klaus','konrad',
  'lars','leon','ludwig','lukas','manfred','marcel','marco','markus','martin','matthias','max','maximilian',
  'beat','urs','finn','ben','theo','erik','mats','linus','nico','til',
  'michael','moritz','niklas','noah','oliver','oskar','patrick','paul','peter','philipp',
  'rainer','ralf','raphael','reinhard','robert','rolf','rudolf','sebastian','siegfried','simon',
  'stefan','stephan','sven','thomas','thorsten','tim','tobias','udo','ulrich','uwe',
  'valentin','viktor','volker','werner','wilhelm','wolfgang',
  // female
  'alexandra','andrea','angelika','anja','anna','annika','antonia','barbara','beate','birgit',
  'brigitte','carla','carolin','christa','christiane','christina','claudia','cornelia','daniela','doris',
  'elena','elisabeth','elke','emilia','emma','erika','eva','franziska','frauke','gabriele',
  'gisela','hanna','heike','helena','ingrid','jana','janina','johanna','julia','jutta',
  'karin','karolina','katharina','katrin','kerstin','klara','laura','lea','lena','lisa',
  'magdalena','manuela','maria','marie','marlene','martina','melanie','monika','nadine','nina',
  'petra','pia','renate','sabine','sandra','sarah','silke','sofia','sophie','stefanie',
  'susanne','tanja','theresa','ursula','ute','vanessa','vera','verena','wiebke',
];

// prettier-ignore
const LAST = [
  'müller','mueller','schmidt','schmid','schneider','fischer','weber','meyer','wagner','becker',
  'schulz','hoffmann','schäfer','schaefer','koch','bauer','richter','klein','wolf','schröder',
  'schroeder','neumann','schwarz','zimmermann','braun','krüger','krueger','hofmann','hartmann','lange',
  'schmitt','werner','schmitz','krause','meier','lehmann','huber','mayer','herrmann','köhler',
  'koehler','walter','könig','koenig','keller','brandt','schreiber','graf','frank','roth',
  'beck','lorenz','baumann','franke','albrecht','winkler','vogel','sommer','winter','kraus',
  'brunner','steiner','moser','gerber','widmer','bachmann','frei','suter','kaufmann','stettler',
  'gruber','wagner','pichler','steinberger','baumgartner','egger','fuchs','berger','lang','wimmer',
];

export const FIRST_NAMES: ReadonlySet<string> = new Set(FIRST);
export const SURNAMES: ReadonlySet<string> = new Set(LAST);
