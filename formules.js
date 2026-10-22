/* ════════════════════════════════════════════════════════════
   formules.js — le « i » : rappel des formules (7.5.0)
   · une fiche par matière : Forward (Produits Dérivés I) et
     Futures (Produits Dérivés II), avec un onglet pour passer de
     l'une à l'autre
   · les équations sont écrites en MathML (natif dans Chrome,
     Safari et Firefox, aucune bibliothèque)
   · notations reprises des leçons : produits_derives.html et
     produits_derives_2.html. Toute formule changée dans une leçon
     doit l'être ici aussi.
   Usage : M1Formules.bouton(sid) renvoie le petit bouton rond ;
   tout élément [data-fx="<matière>"] ouvre la fiche au clic.
   Sur les pages de ces deux cours, le bouton est posé tout seul :
   dans le cadre photo, sur chaque mini-quiz et sur chaque question
   du test final.
   7.6.0 — bouton « Aide » : chaque formule a un identifiant (id) ;
   une question de calcul porte aide:{f:[ids], t:'explication'}.
   M1Formules.boutonAide(aide) renvoie la pilule « Aide » : la fiche
   s'ouvre sur la bonne formule, en vert, avec « Pourquoi cette
   formule ? ». Onglet « Quelle formule ? » : guide en questions.
   Jamais dans BeQuick (bequick.html ne charge pas ce fichier).
   ════════════════════════════════════════════════════════════ */
(function(){
  /* ---------- petits constructeurs MathML ---------- */
  const mi = s => '<mi>'+s+'</mi>', mn = s => '<mn>'+s+'</mn>', mo = s => '<mo>'+s+'</mo>',
        mt = s => '<mtext>'+s+'</mtext>', sp = '<mspace width="0.8em"></mspace>';
  const row = (...a) => '<mrow>'+a.join('')+'</mrow>';
  const frac = (a, b) => '<mfrac>'+row(a)+row(b)+'</mfrac>';
  const sub = (b, s) => '<msub>'+b+row(s)+'</msub>';
  const sup = (b, s) => '<msup>'+b+row(s)+'</msup>';
  const subsup = (b, s, p) => '<msubsup>'+b+row(s)+row(p)+'</msubsup>';
  const par = (...a) => row(mo('('), ...a, mo(')'));
  const M = (...a) => '<math display="block">'+row(...a)+'</math>';
  const X = mo('×'), EG = mo('='), MOINS = mo('−'), PLUS = mo('+');
  const n12 = frac(mi('n'), mn('12'));
  const taux = (r) => par(mn('1'), PLUS, r, X, n12);
  const F0 = sub(mi('F'), mn('0')), Ft = sub(mi('F'), mi('t')), S0 = sub(mi('S'), mn('0')), St = sub(mi('S'), mi('t'));

  /* ---------- FICHE 1 : Forward et marché des changes ---------- */
  const AB = s => sub(mi('S'), mt('A/B'));
  const fAB = sub(mi('f'), mt('A/B'));
  const cAB = (x) => sup(par(mt('A/B')), mt(x));
  const FORWARD = {
    onglet:'Forward', titre:'Forward et marché des changes', sid:'produits-derives',
    blocs:[
      {h:'Lire un cours', f:[
        {id:'fwd-cours', t:'Le cours A/B', eq:M(mn('1'), mi('A'), EG, AB(), mi('B')),
         ou:'S<sub>A/B</sub> = nombre d’unités de la monnaie B échangées contre <b>une</b> unité de A (A est la devise cotée, au numérateur).',
         ex:'GBP/USD = 1,6317 : 1 GBP = 1,6317 USD.'},
        {id:'fwd-inverse', t:'Passer d’une cotation à l’autre', eq:[M(sup(par(mt('B/A')), mt('A')), EG, frac(mn('1'), cAB('V'))), M(sup(par(mt('B/A')), mt('V')), EG, frac(mn('1'), cAB('A')))],
         ou:'A = cours acheteur (bid), V = cours vendeur (ask) de la banque. En inversant, l’acheteur devient l’inverse du vendeur. Sans fourchette : (B/A) = 1 ÷ (A/B).',
         ex:'EUR/USD = 1,0850 − 1,0855 donne USD/EUR = 1 ÷ 1,0855 − 1 ÷ 1,0850 = 0,9212 − 0,9217.'},
        {id:'fwd-spread', t:'Le spread', eq:M(mt('spread (%)'), EG, frac(row(mi('V'), MOINS, mi('A')), mi('A')), X, mn('100')),
         ou:'V = cours vendeur, A = cours acheteur : la marge de la banque, rapportée au cours acheteur (convention du cours).',
         ex:'(1,0855 − 1,0850) ÷ 1,0850 × 100 = 0,046 %.'}
      ]},
      {h:'Cours croisés', f:[
        {id:'fwd-croise-chaine', t:'Par une monnaie pivot C (en chaîne)', eq:[M(sup(par(mt('A/B')), mt('A')), EG, sup(par(mt('A/C')), mt('A')), X, sup(par(mt('C/B')), mt('A'))), M(sup(par(mt('A/B')), mt('V')), EG, sup(par(mt('A/C')), mt('V')), X, sup(par(mt('C/B')), mt('V')))],
         ou:'C = monnaie intermédiaire (pivot). Sans fourchette : (A/B) = (A/C) × (C/B).',
         ex:'EUR/USD = 1,0850 et USD/JPY = 150,20 : EUR/JPY = 1,0850 × 150,20 = 162,97.'},
        {id:'fwd-croise-division', t:'Les deux devises cotées contre le pivot (division)', eq:[M(sup(par(mt('A/B')), mt('A')), EG, frac(sup(par(mt('A/C')), mt('A')), sup(par(mt('B/C')), mt('V')))), M(sup(par(mt('A/B')), mt('V')), EG, frac(sup(par(mt('A/C')), mt('V')), sup(par(mt('B/C')), mt('A'))))],
         ou:'Acheteur et vendeur se croisent au dénominateur.',
         ex:'EUR/USD = 1,0850 et GBP/USD = 1,2700 : EUR/GBP = 1,0850 ÷ 1,2700 = 0,8543.'}
      ]},
      {h:'Le cours à terme', f:[
        {id:'fwd-report', t:'Report ou déport', eq:[['si f &gt; S : report', M(fAB, EG, AB(), PLUS, mt('points de report'))], ['si f &lt; S : déport', M(fAB, EG, AB(), MOINS, mt('points de déport'))]],
         ou:'f<sub>A/B</sub> = cours à terme, S<sub>A/B</sub> = cours au comptant ; report et déport se disent de la devise A par rapport à B.',
         ex:'GBP/USD comptant 1,6312, à 1 mois 1,6317 : la livre est en report de 5 points.'},
        {id:'fwd-taux-report', t:'Taux de report ou de déport annualisé', eq:[['durée en jours', M(mt('taux'), EG, frac(row(fAB, MOINS, AB()), AB()), X, frac(mn('360'), mi('t')), X, mn('100'))], ['durée en mois', M(mt('taux'), EG, frac(row(fAB, MOINS, AB()), AB()), X, frac(mn('12'), mi('n')), X, mn('100'))]],
         ou:'t = durée en jours, n = durée en mois. Positif en report, négatif en déport.',
         ex:'(1,6317 − 1,6312) ÷ 1,6312 × 12/1 × 100 = +0,37 % par an (report).'},
        {id:'fwd-points-swap', t:'Coter en points de swap', eq:[['report : on additionne', M(sup(mt('PS'), mt('A')), mo('&lt;'), sup(mt('PS'), mt('V')))], ['déport : on soustrait', M(sup(mt('PS'), mt('A')), mo('&gt;'), sup(mt('PS'), mt('V')))]],
         ou:'PS<sup>A</sup> et PS<sup>V</sup> = points de terme annoncés côté acheteur et côté vendeur ; la fourchette s’élargit avec l’échéance.'},
        {id:'fwd-eurodevises', t:'Lire une cotation de taux (eurodevises)', eq:M(mt('cotation'), EG, sub(mi('r'), mt('emprunteur')), sp, mo('−'), sp, sub(mi('r'), mt('prêteur'))),
         ou:'Le premier taux est celui auquel la banque emprunte, le second celui auquel elle prête (taux annuels). Partie entière + fraction, souvent en seizièmes ou trente-deuxièmes : 5/16 = 0,3125. L’écart est le spread de taux de la banque.',
         ex:'Eurodollar à 1 mois : 1 3/4 − 1 7/8 : la banque emprunte à 1,75 % et prête à 1,875 %, spread de 1/8 %.'},
        {id:'fwd-terme-acheteur', t:'Cours à terme acheteur (vente à terme de A)', eq:M(subsup(mi('f'), mt('A/B'), mt('A')), EG, subsup(mi('S'), mt('A/B'), mt('A')), X, frac(taux(subsup(mi('r'), mi('B'), mt('emprunteur'))), taux(subsup(mi('r'), mi('A'), mt('prêteur'))))),
         ou:'n = durée en mois, taux annuels. Fabrication : emprunt en A, vente de A au comptant contre B, prêt en B. Sert à l’exportateur (créancier en devises).',
         ex:'EUR/USD acheteur 1,0850, USD emprunteur 4 %, EUR prêteur 3 %, 3 mois : 1,0850 × (1 + 4 % × 3/12) ÷ (1 + 3 % × 3/12) = 1,0877, soit un report de 27 points.'},
        {id:'fwd-terme-vendeur', t:'Cours à terme vendeur (achat à terme de A)', eq:M(subsup(mi('f'), mt('A/B'), mt('V')), EG, subsup(mi('S'), mt('A/B'), mt('V')), X, frac(taux(subsup(mi('r'), mi('B'), mt('prêteur'))), taux(subsup(mi('r'), mi('A'), mt('emprunteur'))))),
         ou:'Miroir du cours acheteur : emprunt en B, achat de A au comptant, prêt en A. Sert à l’importateur (débiteur en devises).'},
        {id:'fwd-ps-acheteurs', t:'Points de swap acheteurs', eq:M(sup(mt('PS'), mt('A')), EG, subsup(mi('S'), mt('A/B'), mt('A')), X, frac(row(subsup(mi('r'), mi('B'), mt('emp')), MOINS, subsup(mi('r'), mi('A'), mt('prêt'))), row(mn('1'), PLUS, subsup(mi('r'), mi('A'), mt('prêt')), X, n12)), X, n12),
         ou:'Taux sur A supérieur au taux sur B : déport de A. Taux sur A inférieur : report.'}
      ]},
      {h:'Le risque de change', f:[
        {id:'fwd-position', t:'Position de change', eq:M(mt('PC'), EG, mt('créances'), MOINS, mt('dettes')),
         ou:'Créances et dettes dans une même devise, pour une même échéance. PC &gt; 0 : position longue, on craint la baisse de la devise (l’exportateur vend à terme). PC &lt; 0 : position courte, on craint sa hausse (l’importateur achète à terme).',
         ex:'Créances 500 000 USD, dettes 320 000 USD : PC = +180 000 USD.'}
      ]}
    ]
  };

  /* ---------- FICHE 2 : Futures ---------- */
  const D = mi('D'), T = mi('T'), N = mi('N'), Q = mi('Q');
  const SOLDE = s => sub(mt('Solde'), s);
  const FUTURES = {
    onglet:'Futures', titre:'Futures sur devises', sid:'produits-derives-2',
    blocs:[
      {h:'Lire un contrat', f:[
        {id:'fut-tick', t:'Tick en valeur', eq:M(sub(mi('V'), mt('tick')), EG, mt('tick'), X, T),
         ou:'tick = plus petite variation du cours (en USD par unité de devise) ; T = taille d’un contrat. Résultat en USD, par contrat.',
         ex:'0,0002 × 62 500 GBP = 12,5 USD.'},
        {id:'fut-resultat', t:'Résultat d’une position', eq:[M(mi('R'), EG, par(sub(mi('F'), mt('vente')), MOINS, sub(mi('F'), mt('achat'))), X, T, X, N), M(mi('R'), EG, mt('nombre de ticks'), X, sub(mi('V'), mt('tick')), X, N)],
         ou:'N = nombre de contrats. L’acheteur gagne si le cours monte, le vendeur s’il baisse.',
         ex:'(1,0910 − 1,0850) × 125 000 × 3 = +2 250 USD.'}
      ]},
      {h:'Le système de marges', f:[
        {id:'fut-deposit', t:'Deposit = perte maximale d’une journée', eq:M(D, EG, mi('L'), X, sub(mi('V'), mt('tick')), X, N),
         ou:'L = limite de variation quotidienne, en ticks.',
         ex:'50 × 12,5 × 15 = 9 375 USD.'},
        {id:'fut-maintenance', t:'Marge de maintenance', eq:M(mi('M'), EG, mi('p'), X, D),
         ou:'p = pourcentage fixé par la chambre (80 %, 75 %…). C’est le plancher du compte.',
         ex:'80 % × 9 375 = 7 500 USD.'},
        {id:'fut-resultat-jour', t:'Résultat du jour', eq:[['acheteur', M(sub(mi('R'), mi('t')), EG, par(Ft, MOINS, sub(mi('F'), row(mi('t'), MOINS, mn('1')))), X, T, X, N)], ['vendeur', M(sub(mi('R'), mi('t')), EG, par(sub(mi('F'), row(mi('t'), MOINS, mn('1'))), MOINS, Ft), X, T, X, N)]],
         ou:'F<sub>t</sub> = cours de compensation du soir ; le premier jour, F<sub>t−1</sub> est le cours d’ouverture de la position.',
         ex:'Vente de 5 contrats à 1,1500, compensation à 1,1540 : (1,1500 − 1,1540) × 625 000 = −2 500 USD.'},
        {id:'fut-solde', t:'Solde du compte de marge', eq:M(SOLDE(mi('t')), EG, SOLDE(row(mi('t'), MOINS, mn('1'))), PLUS, sub(mi('R'), mi('t')), PLUS, sub(mt('Appel'), row(mi('t'), MOINS, mn('1')))),
         ou:'Le premier soir, le solde de départ est le deposit D. Les gains restent sur le compte, sauf retrait.',
         ex:'15 000 − 2 500 = 12 500 USD.'},
        {id:'fut-appel-marge', t:'Appel de marge', eq:[['si le solde passe sous la maintenance', M(SOLDE(mi('t')), mo('&lt;'), mi('M'), sp, mo('⟹'), sp, sub(mt('Appel'), mi('t')), EG, D, MOINS, SOLDE(mi('t')))]],
         ou:'Sinon, pas d’appel. L’appel ramène le compte au <b>deposit</b>, pas à la maintenance.',
         ex:'Solde 8 125 &lt; 11 250 : appel = 15 000 − 8 125 = 6 875 USD.'}
      ]},
      {h:'Couvrir le risque de change', f:[
        {id:'fut-sens', t:'Sens de la position', regle:'<table class="fx-tab"><tr><th>Ce que l’on craint</th><th>Futures</th></tr>'+
          '<tr><td>Hausse du cours du contrat (dette dans la devise du contrat, ou Européen qui encaisse des USD)</td><td><b>Acheter</b></td></tr>'+
          '<tr><td>Baisse du cours du contrat (créance dans la devise du contrat, ou Européen qui paie des USD)</td><td><b>Vendre</b></td></tr></table>',
         ou:'Le contrat EUR/USD est coté en USD pour 1 EUR. On prend la position qui gagne quand la position physique perd.'},
        {id:'fut-nb-volumes', t:'Nombre de contrats : correspondance des volumes', eq:[M(N, EG, frac(Q, T)), ['montant en USD, contrat en EUR', M(N, EG, frac(sub(Q, mt('USD')), row(F0, X, T)))]],
         ou:'Q = montant à couvrir, dans la devise du contrat (converti au cours F<sub>0</sub> sinon). On arrondit à l’entier le plus proche.',
         ex:'2 500 000 ÷ (1,0850 × 125 000) = 18,43, soit 18 contrats.'},
        {id:'fut-nb-variance', t:'Nombre de contrats : variance minimale', eq:[M(sup(mi('h'), mo('*')), EG, frac(row(mi('Cov'), par(mi('S'), mo(','), mi('F'))), row(mi('V'), par(mi('F')))), EG, frac(sub(mi('σ'), row(mi('S'), mo(','), mi('F'))), subsup(mi('σ'), mi('F'), mn('2')))), M(sup(N, mo('*')), EG, sup(mi('h'), mo('*')), X, frac(Q, T))],
         ou:'Cov(S, F) = covariance des variations du spot et du Future ; V(F) = variance des variations du Future. h* &gt; 1 : plus de contrats que par les volumes.',
         ex:'h* = 0,000085 ÷ 0,0001 = 0,85 ; N* = 0,85 × 2 000 000 ÷ 62 500 = 27,2, soit 27 contrats.'},
        {id:'fut-resultat-futures', t:'Résultat Futures', eq:[['acheteur', M(sub(mi('R'), mi('F')), EG, N, X, T, X, par(Ft, MOINS, F0))], ['vendeur', M(sub(mi('R'), mi('F')), EG, N, X, T, X, par(F0, MOINS, Ft))]],
         ou:'F<sub>0</sub> = cours à l’ouverture, F<sub>t</sub> = cours à la liquidation. Résultat en USD.',
         ex:'Vendeur de 4 contrats : 4 × 125 000 × (1,1040 − 1,0850) = +9 500 USD.'},
        {id:'fut-resultat-physique', t:'Résultat physique', eq:[['entreprise américaine, créance en EUR (en USD)', M(sub(mi('R'), mi('P')), EG, Q, X, par(St, MOINS, S0))], ['entreprise européenne, créance en USD (en EUR)', M(sub(mi('R'), mi('P')), EG, frac(sub(Q, mt('USD')), St), MOINS, frac(sub(Q, mt('USD')), S0))]],
         ou:'Q = montant à encaisser (pour une dette, le signe s’inverse) ; S<sub>0</sub>, S<sub>t</sub> = cours au comptant au départ et le jour du paiement.',
         ex:'500 000 EUR × (1,0800 − 1,1000) = −10 000 USD.'},
        {id:'fut-resultat-global', t:'Résultat global', eq:[M(sub(mi('R'), mi('G')), EG, sub(mi('R'), mi('P')), PLUS, sub(mi('R'), mi('F'))), ['entreprise européenne (en EUR)', M(sub(mi('R'), mi('G')), EG, sub(mi('R'), mi('P')), PLUS, frac(sub(mi('R'), mi('F')), St))]],
         ou:'Les deux résultats dans la monnaie nationale : le gain des Futures (en USD) est converti au spot du jour de liquidation.',
         ex:'−10 000 + 9 500 = −500 USD.'}
      ]},
      {h:'Base et évaluation', f:[
        {id:'fut-base', t:'La base', eq:[M(mi('b'), EG, mi('S'), MOINS, mi('F')), ['couverture vendeuse', M(sub(mi('R'), mi('G')), EG, Q, X, par(sub(mi('b'), mi('t')), MOINS, sub(mi('b'), mn('0'))))], ['couverture acheteuse', M(sub(mi('R'), mi('G')), EG, MOINS, Q, X, par(sub(mi('b'), mi('t')), MOINS, sub(mi('b'), mn('0'))))]],
         ou:'Avec des volumes égaux (N × T = Q). La base est nulle à l’échéance ; on liquide avant (E &gt; t) : c’est le risque de base.',
         ex:'b<sub>0</sub> = 1,1000 − 1,1040 = −0,0040 ; b<sub>t</sub> = 1,0800 − 1,0850 = −0,0050 ; 500 000 × (−0,0010) = −500 USD.'},
        {id:'fut-parite', t:'Cours à terme théorique (parité des taux)', eq:M(sub(mi('f'), mt('EUR/USD')), EG, sub(mi('S'), mt('EUR/USD')), X, frac(taux(sub(mi('i'), mt('USD'))), taux(sub(mi('i'), mt('EUR'))))),
         ou:'n = mois jusqu’à l’échéance du Future (n = E − t), taux annuels simples. Le taux de la monnaie de cotation (USD) est au numérateur.',
         ex:'1,25 × (1 + 2,25 % × 6/12) ÷ (1 + 3,5 % × 6/12) = 1,2423.'},
        {id:'fut-comparer', t:'Comparer F et f', eq:[['surévalué : on vend le Future', M(mi('F'), mo('&gt;'), mi('f'))], ['sous-évalué : on achète le Future', M(mi('F'), mo('&lt;'), mi('f'))], ['gain sans risque par contrat', M(mt('gain'), EG, T, X, row(mo('|'), mi('F'), MOINS, mi('f'), mo('|')))]],
         ou:'F = cours coté du Future ; f = cours théorique. On fait l’opération inverse à terme de façon synthétique (emprunt, change au comptant, placement).',
         ex:'F = 1,2500 &gt; f = 1,242322 : 125 000 × 0,007678 = 959,77 USD par contrat.'}
      ]},
      {h:'Spéculation', f:[
        {id:'fut-levier', t:'Effet de levier', eq:M(mt('Levier'), EG, frac(row(N, X, T, X, F0), D)),
         ou:'N × T × F<sub>0</sub> = valeur notionnelle de la position, en USD ; D = deposit total.',
         ex:'4 × 125 000 × 1,1000 ÷ 16 000 = 34,4.'}
      ]}
    ]
  };

  const FICHES = {'produits-derives':FORWARD, 'produits-derives-2':FUTURES};
  const ORDRE = ['produits-derives', 'produits-derives-2', 'guide'];

  /* 7.6.0 : chaque formule a un identifiant stable (fwd-…, fut-…) */
  const INDEX = {};
  Object.keys(FICHES).forEach(sid=>FICHES[sid].blocs.forEach(b=>b.f.forEach(f=>{ if(f.id) INDEX[f.id] = {sid, f}; })));

  /* ---------- onglet « Quelle formule ? » : petit guide en questions ----------
     r = réponses : [condition éventuelle, identifiant de formule] */
  const GUIDE = [
    {h:'Forward et marché des changes', sid:'produits-derives', q:[
      {q:'Tu dois retourner une cotation (passer de A/B à B/A) ?', r:[['', 'fwd-inverse']]},
      {q:'On te demande la marge de la banque, un spread ?', r:[['en points : seulement V − A ; en % : diviser par A', 'fwd-spread']]},
      {q:'Un cours croisé entre deux devises ?', r:[['les deux cours s’enchaînent par le pivot (A/C puis C/B)', 'fwd-croise-chaine'], ['les deux devises sont cotées contre le même pivot (A/C et B/C)', 'fwd-croise-division']]},
      {q:'Des points de report ou de déport ?', r:[['à partir du comptant et du cours à terme', 'fwd-report'], ['en taux annualisé (%)', 'fwd-taux-report']]},
      {q:'Un cours à terme, et l’énoncé donne des points de swap ?', r:[['', 'fwd-points-swap']]},
      {q:'Un cours à terme, et l’énoncé donne des taux d’intérêt ?', r:[['exportateur, la banque achète la devise à terme', 'fwd-terme-acheteur'], ['importateur, la banque vend la devise à terme', 'fwd-terme-vendeur'], ['seulement les points de swap', 'fwd-ps-acheteurs']]},
      {q:'Lire une cotation de taux (« 2 5/16 − 2 7/16 ») ?', r:[['', 'fwd-eurodevises']]},
      {q:'Savoir ce que l’entreprise risque (position longue ou courte) ?', r:[['', 'fwd-position']]}
    ]},
    {h:'Futures sur devises', sid:'produits-derives-2', q:[
      {q:'Ce que vaut un tick, ou un nombre de ticks ?', r:[['', 'fut-tick']]},
      {q:'Le gain ou la perte d’une position ouverte puis fermée ?', r:[['à partir des cours, ou des ticks', 'fut-resultat']]},
      {q:'Le deposit à verser ?', r:[['', 'fut-deposit']]},
      {q:'Un appel de marge ?', r:[['1. le résultat du jour', 'fut-resultat-jour'], ['2. le nouveau solde', 'fut-solde'], ['3. le seuil (maintenance)', 'fut-maintenance'], ['4. l’appel, qui ramène au deposit', 'fut-appel-marge']]},
      {q:'Le sens de la couverture (acheter ou vendre) ?', r:[['', 'fut-sens']]},
      {q:'Un nombre de contrats ?', r:[['l’énoncé ne donne que le montant : volumes', 'fut-nb-volumes'], ['il donne Cov et V (ou σS,F et σ²F), ou « averse au risque » : variance', 'fut-nb-variance']]},
      {q:'Le résultat d’une couverture ?', r:[['sur la position physique', 'fut-resultat-physique'], ['sur les Futures', 'fut-resultat-futures'], ['au total', 'fut-resultat-global']]},
      {q:'La base, ou le résultat par la base ?', r:[['', 'fut-base']]},
      {q:'Un cours à terme théorique ?', r:[['', 'fut-parite']]},
      {q:'Un arbitrage entre le Future coté et le cours théorique ?', r:[['', 'fut-comparer']]},
      {q:'Un effet de levier ?', r:[['', 'fut-levier']]}
    ]}
  ];

  /* espaces insécables : « 125 000 » ou « 6,25 USD » ne se coupent pas en fin de ligne */
  const insec = t => t.replace(/(\d) (?=\d{3}\b)/g, '$1 ').replace(/(\d) (USD|EUR|GBP|%)/g, '$1 $2');
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  /* ---------- la fenêtre ---------- */
  let fond = null, retour = null, actif = null;
  let marque = null;   /* {sid, ids, t} : formule(s) à mettre en vert ; null = fiche neutre */
  function dessinerGuide(){
    return '<p class="fx-guide-intro">Pars de ce que l’énoncé te demande : chaque réponse ouvre la formule et la met en vert.</p>'+
      GUIDE.map(g=>'<section class="fx-bloc" data-sid="'+g.sid+'"><h3>'+g.h+'</h3><ul class="fx-guide">'+g.q.map(x=>
        '<li><p class="fx-gq">'+x.q+'</p><div class="fx-gr">'+x.r.map(r=>{
          const f = INDEX[r[1]]; if(!f) return '';
          return '<button type="button" class="fx-lien" data-fx-va="'+r[1]+'"'+(r[0] ? ' aria-label="'+esc(r[0])+' : '+esc(f.f.t)+'"' : '')+'>'+
            (r[0] ? '<span class="fx-cond">'+r[0]+'</span>' : '')+'<span class="fx-cible"><span aria-hidden="true">→ </span>'+f.f.t+'</span></button>';
        }).join('')+'</div></li>').join('')+'</ul></section>').join('');
  }
  function dessinerFiche(sid){
    const guide = sid === 'guide', F = guide ? null : FICHES[sid]; actif = sid;
    if(!guide) fond.querySelector('.fx-fiche').setAttribute('data-sid', sid);
    fond.querySelector('#fx-titre').textContent = guide ? 'Quelle formule utiliser ?' : F.titre;
    fond.querySelectorAll('[role="tab"]').forEach(b=>{
      const on = b.dataset.onglet === sid;
      b.setAttribute('aria-selected', on ? 'true' : 'false'); b.tabIndex = on ? 0 : -1;
    });
    const corps = fond.querySelector('.fx-corps');
    corps.setAttribute('aria-labelledby', 'fx-tab-'+sid);
    corps.innerHTML = guide ? dessinerGuide() : F.blocs.map(b=>'<section class="fx-bloc"><h3>'+b.h+'</h3>'+b.f.map(f=>
      '<article class="fx-f"'+(f.id ? ' id="fx-f-'+f.id+'"' : '')+'><h4>'+f.t+'</h4>'+
      (Array.isArray(f.eq) ? f.eq : f.eq ? [f.eq] : []).map(e=>Array.isArray(e)
        ? '<div class="fx-eq"><span class="fx-lab">'+e[0]+'</span>'+e[1]+'</div>' : '<div class="fx-eq">'+e+'</div>').join('')+(f.regle || '')+
      (f.ou ? '<p class="fx-ou"><b>où :</b> '+insec(f.ou)+'</p>' : '')+
      (f.ex ? '<p class="fx-ex"><b>Exemple :</b> '+insec(f.ex)+'</p>' : '')+
      '</article>').join('')+'</section>').join('');
    corps.scrollTop = 0;
    return guide ? null : appliquerMarque(sid);
  }
  /* met en vert la ou les formules de « marque », pose l'encadré « Pourquoi cette formule ? »
     au-dessus de la première, et fait défiler jusqu'à elle. Renvoie l'élément à focaliser. */
  function appliquerMarque(sid){
    if(!marque || marque.sid !== sid) return null;
    const corps = fond.querySelector('.fx-corps');
    const els = marque.ids.map(id=>corps.querySelector('#fx-f-'+id)).filter(Boolean);
    if(!els.length) return null;
    els.forEach(el=>{
      el.classList.add('fx-vert');
      el.querySelector('h4').insertAdjacentHTML('afterbegin', '<span class="fx-badge">✓ À utiliser</span>');
    });
    let cible = els[0];
    if(marque.t){
      els[0].insertAdjacentHTML('beforebegin', '<div class="fx-pourquoi" id="fx-pourquoi" tabindex="-1">'+
        '<p class="fx-pq-t">Pourquoi cette formule ?</p><p class="fx-pq-x">'+insec(esc(marque.t))+'</p></div>');
      cible = corps.querySelector('#fx-pourquoi');
    } else cible.tabIndex = -1;
    const defiler = ()=>{ corps.scrollTop += cible.getBoundingClientRect().top - corps.getBoundingClientRect().top - 8; };
    defiler(); requestAnimationFrame(defiler);   /* une fois les équations MathML mises en page */
    return cible;
  }
  function construire(){
    fond = document.createElement('div');
    fond.className = 'fx-fond'; fond.hidden = true;
    fond.innerHTML =
      '<div class="fx-fiche" role="dialog" aria-modal="true" aria-labelledby="fx-titre">'+
        '<div class="fx-haut"><div><div class="fx-kick">Rappel des formules</div><h2 id="fx-titre"></h2></div>'+
          '<button type="button" class="fx-fermer" aria-label="Fermer le rappel des formules">✕</button></div>'+
        '<div class="fx-onglets" role="tablist" aria-label="Choisir la fiche">'+
          ORDRE.map(s=>'<button type="button" role="tab" id="fx-tab-'+s+'" data-onglet="'+s+'" aria-controls="fx-corps">'+(s === 'guide' ? 'Quelle formule ?' : FICHES[s].onglet)+'</button>').join('')+
        '</div>'+
        '<div class="fx-corps" id="fx-corps" role="tabpanel" tabindex="0"></div>'+
      '</div>';
    fond.addEventListener('click', e=>{
      if(e.target === fond){ fermer(); return; }
      const l = e.target.closest && e.target.closest('[data-fx-va]');
      if(l && INDEX[l.dataset.fxVa]){             /* lien du guide : la formule passe en vert dans son onglet */
        marque = {sid:INDEX[l.dataset.fxVa].sid, ids:[l.dataset.fxVa], t:null};
        const c = dessinerFiche(marque.sid); if(c) c.focus({preventScroll:true});
      }
    });
    fond.querySelector('.fx-fermer').addEventListener('click', fermer);
    fond.querySelectorAll('[role="tab"]').forEach(b=>b.addEventListener('click', ()=>dessinerFiche(b.dataset.onglet)));
    fond.querySelector('.fx-onglets').addEventListener('keydown', e=>{
      if(e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      e.preventDefault();
      const i = ORDRE.indexOf(actif), j = (i + (e.key === 'ArrowRight' ? 1 : -1) + ORDRE.length) % ORDRE.length;
      dessinerFiche(ORDRE[j]); fond.querySelector('#fx-tab-'+ORDRE[j]).focus();
    });
    fond.addEventListener('keydown', e=>{
      if(e.key === 'Escape'){ e.preventDefault(); e.stopPropagation(); fermer(); return; }
      if(e.key !== 'Tab') return;
      const f = [...fond.querySelectorAll('button, [tabindex="0"]')].filter(x=>!x.disabled && x.tabIndex >= 0 && x.offsetParent !== null);
      if(!f.length) return;
      const pr = f[0], de = f[f.length-1];
      const ici = document.activeElement;
      if(!f.includes(ici)){ e.preventDefault(); (e.shiftKey ? de : pr).focus(); }   /* encadré « Pourquoi » ou formule en vert */
      else if(e.shiftKey && ici === pr){ e.preventDefault(); de.focus(); }
      else if(!e.shiftKey && ici === de){ e.preventDefault(); pr.focus(); }
    });
    document.body.appendChild(fond);
  }
  function ouvrir(sid, declencheur, aide){
    if(!FICHES[sid]) return;
    if(!fond) construire();
    retour = declencheur || document.activeElement;
    marque = aide || null;
    fond.hidden = false;
    document.documentElement.classList.add('fx-ouvert');
    const c = dessinerFiche(sid);
    (c || fond.querySelector('.fx-fermer')).focus({preventScroll:true});
  }
  function fermer(){
    if(!fond || fond.hidden) return;
    marque = null;                                 /* la surbrillance part avec la fiche */
    fond.querySelectorAll('.fx-vert').forEach(el=>el.classList.remove('fx-vert'));
    fond.hidden = true;
    document.documentElement.classList.remove('fx-ouvert');
    if(retour && retour.focus && document.contains(retour)) retour.focus();
    retour = null;
  }
  function bouton(sid){
    if(!FICHES[sid]) return '';
    return '<button type="button" class="fx-i" data-fx="'+sid+'" data-sid="'+sid+'" aria-label="Rappel des formules" title="Rappel des formules"><span aria-hidden="true">i</span></button>';
  }
  /* ---------- bouton « Aide » (7.6.0) : questions de calcul seulement ----------
     aide = {f:['fut-nb-volumes', …], t:'pourquoi cette formule, première étape'} */
  const AIDES = [];
  function aideValide(a){ return !!(a && Array.isArray(a.f) && a.f.length && a.f.every(id=>INDEX[id]) && INDEX[a.f[0]]); }
  function boutonAide(a){
    if(!aideValide(a)) return '';
    AIDES.push(a);
    const sid = INDEX[a.f[0]].sid;
    return '<button type="button" class="fx-aide" data-fx-aide="'+(AIDES.length-1)+'" data-sid="'+sid+'" aria-label="Aide : quelle formule ?" title="Aide : quelle formule ?">'+
      '<span class="fx-aide-q" aria-hidden="true">?</span><span>Aide</span><span class="fx-aide-plus"> : quelle formule ?</span></button>';
  }
  function ouvrirAide(a, declencheur){
    if(!aideValide(a)) return;
    const sid = INDEX[a.f[0]].sid;
    ouvrir(sid, declencheur, {sid, ids:a.f.filter(id=>INDEX[id].sid === sid), t:a.t || ''});
    document.dispatchEvent(new CustomEvent('m1-aide', {detail:a}));
  }
  document.addEventListener('click', e=>{
    const t = e.target.closest ? e.target : null; if(!t) return;
    const a = t.closest('[data-fx-aide]');
    if(a){ e.preventDefault(); ouvrirAide(AIDES[+a.dataset.fxAide], a); return; }
    const b = t.closest('[data-fx]');
    if(b){ e.preventDefault(); ouvrir(b.dataset.fx, b); }
  });

  /* ---------- pose automatique sur les pages des deux cours ---------- */
  function questionTest(h){
    const box = h.closest('.test-q'), i = box ? parseInt(String(box.id).replace('tq', ''), 10) : NaN;
    let T = null; try { T = TEST; } catch(err){ return null; }   /* const TEST de la page */
    return Array.isArray(T) && T[i] ? T[i] : null;
  }
  function decorer(sid){
    document.querySelectorAll('.quiz .qhead:not(.fx-ligne)').forEach(h=>{
      h.classList.add('fx-ligne'); h.insertAdjacentHTML('beforeend', bouton(sid));
    });
    document.querySelectorAll('.test-q .tq-head').forEach(h=>{
      if(h.querySelector('.fx-i')) return;
      const g = document.createElement('span'); g.className = 'fx-groupe';
      const c = h.querySelector('.tq-chap'); if(c) g.appendChild(c);
      g.insertAdjacentHTML('beforeend', bouton(sid));
      const q = questionTest(h);
      if(q && q.type === 'num' && q.aide) g.insertAdjacentHTML('beforeend', boutonAide(q.aide));
      h.appendChild(g);
    });
    const haut = document.querySelector('.ds-cadre .haut > span');
    if(haut && !haut.querySelector('.fx-pil'))
      haut.insertAdjacentHTML('afterbegin', '<button type="button" class="ds-pil verre fx-pil" data-fx="'+sid+'" aria-label="Rappel des formules" title="Rappel des formules"><span class="fx-rond" aria-hidden="true">i</span><span class="txt">Formules</span></button>');
  }
  function demarrer(){
    const sid = document.documentElement.getAttribute('subject-id');
    if(!FICHES[sid]) return;
    decorer(sid);
    setTimeout(()=>decorer(sid), 0);          /* après ui.js, qui construit le cadre photo */
    setTimeout(()=>decorer(sid), 400);
    const t = document.getElementById('testQuestions');
    if(t) new MutationObserver(()=>decorer(sid)).observe(t, {childList:true});
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', demarrer);
  else demarrer();

  window.M1Formules = {ouvrir, fermer, bouton, boutonAide, ouvrirAide, aideValide, a: sid => !!FICHES[sid], FICHES, INDEX, GUIDE};
})();
