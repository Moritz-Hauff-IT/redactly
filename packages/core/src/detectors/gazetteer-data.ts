/**
 * Curated multilingual name gazetteer (lowercased) for GazetteerNameDetector.
 *
 * Core is German/Swiss/Austrian, extended with French and Italian (the other
 * Swiss national languages) and common English names. Not exhaustive — a
 * high-signal set. The detector only fires on "first + capitalized word", so
 * the first-name list drives recall while the surname list only raises
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

// prettier-ignore
const FIRST_FR = [
  'jean','pierre','michel','andré','philippe','alain','jacques','bernard','daniel','marcel',
  'claude','françois','olivier','laurent','nicolas','thierry','sébastien','julien','christophe','vincent',
  'marie','jeanne','françoise','monique','catherine','nathalie','isabelle','sylvie','sophie','julie',
  'camille','chloé','manon','léa','emma','sarah','aurélie','céline','émilie','margaux',
];

// prettier-ignore
const FIRST_IT = [
  'giuseppe','giovanni','antonio','marco','francesco','luca','matteo','andrea','alessandro','lorenzo',
  'stefano','roberto','paolo','riccardo','davide','simone','fabio','giacomo','pietro','salvatore',
  'maria','anna','giulia','francesca','chiara','sara','laura','elena','valentina','martina',
  'alessia','federica','silvia','paola','roberta','elisa','gloria','beatrice','aurora',
];

// prettier-ignore
const FIRST_EN = [
  'james','john','robert','william','richard','joseph','thomas','charles','christopher','matthew',
  'andrew','joshua','george','edward','brian','ronald','kevin','jason','jeffrey','gary',
  'mary','patricia','jennifer','linda','elizabeth','barbara','susan','jessica','margaret','dorothy',
  'emily','olivia','sophia','isabella','grace','hannah','samantha','rachel','victoria','natalie',
];

// prettier-ignore
const LAST_FR = [
  'martin','bernard','dubois','thomas','robert','petit','durand','leroy','moreau','simon',
  'laurent','lefebvre','michel','garcia','david','bertrand','roux','vincent','fournier','morel',
  'girard','andré','mercier','blanc','rousseau','lambert','bonnet','dumont','rey','perret',
];

// prettier-ignore
const LAST_IT = [
  'rossi','russo','ferrari','esposito','bianchi','romano','colombo','ricci','marino','greco',
  'bruno','gallo','conti','deluca','costa','giordano','mancini','rizzo','lombardi','moretti',
  'barbieri','fontana','santoro','marini','bianco','rinaldi','caruso','ferrara','galli','martini',
];

// prettier-ignore
const LAST_EN = [
  'smith','johnson','williams','brown','jones','garcia','miller','davis','wilson','anderson',
  'taylor','thomas','moore','jackson','martin','thompson','white','harris','clark','lewis',
  'robinson','walker','young','allen','king','wright','scott','green','baker','hill',
];

export const FIRST_NAMES: ReadonlySet<string> = new Set([
  ...FIRST,
  ...FIRST_FR,
  ...FIRST_IT,
  ...FIRST_EN,
]);
export const SURNAMES: ReadonlySet<string> = new Set([...LAST, ...LAST_FR, ...LAST_IT, ...LAST_EN]);
