/* Sources officielles affichées en bas de chaque cours (ui.js, construireSources).
   Une entrée par matière (subject-id) : [libellé, adresse].
   Textes officiels seulement (Légifrance, service-public.fr, impots.gouv.fr,
   Banque de France, ACPR, AMF, EUR-Lex, CNIL, INSEE…) — jamais de nom de
   professeur ni de support de cours. */
window.M1_SOURCES = {
  'es-banque': [
    ['Légifrance — Code pénal, art. 226-13 (secret professionnel)', 'https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000006417945'],
    ['Légifrance — Code monétaire et financier, art. L312-1-1 (convention de compte)', 'https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000038614561'],
    ['service-public — Droits de succession', 'https://www.service-public.gouv.fr/particuliers/vosdroits/F14198'],
    ['Légifrance — CGI, art. 990 I (assurance vie au décès)', 'https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000038836524'],
    ['Légifrance — CGI, art. 757 B (primes versées après 70 ans)', 'https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000047288569'],
    ['service-public — Prélèvements sociaux sur les revenus du patrimoine', 'https://www.service-public.gouv.fr/particuliers/vosdroits/F2329'],
    ['Légifrance — Code des assurances, art. L113-2 (déclaration de sinistre)', 'https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000006792617'],
    ['economie.gouv.fr — Assurance emprunteur et questionnaire de santé', 'https://www.economie.gouv.fr/particuliers/gerer-mon-argent/emprunter-et-sassurer/assurance-emprunteur-questionnaire-de-sante-quand-est-ce-obligatoire'],
    ['service-public — Crédit à la consommation', 'https://www.service-public.gouv.fr/particuliers/vosdroits/F2451'],
    ['service-public — Crédit immobilier', 'https://www.service-public.gouv.fr/particuliers/vosdroits/F2436']
  ],
  'fiscalite-particulier': [
    ['service-public — Domicile fiscal', 'https://www.service-public.gouv.fr/particuliers/vosdroits/F62'],
    ['BOFiP — Domicile fiscal (BOI-IR-CHAMP-10)', 'https://bofip.impots.gouv.fr/bofip/1911-PGP.html/identifiant=BOI-IR-CHAMP-10-20160728'],
    ['impots.gouv.fr — Déclarer un enfant majeur', 'https://www.impots.gouv.fr/particulier/questions/mon-enfant-est-majeur-comment-le-declarer'],
    ['service-public — Quotient familial et nombre de parts', 'https://www.service-public.gouv.fr/particuliers/vosdroits/F35120'],
    ['BOFiP — Demi-parts supplémentaires (invalidité)', 'https://bofip.impots.gouv.fr/bofip/2136-PGP.html/identifiant=BOI-IR-LIQ-10-20-20-20-20230608'],
    ['impots.gouv.fr — Location vide : micro-foncier', 'https://www.impots.gouv.fr/particulier/location-vide-de-meubles'],
    ['Légifrance — CGI, art. 156 (déficit global)', 'https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000043662638']
  ],
  'droits-particuliers': [
    ['Légifrance — Code civil, art. 311 (période légale de conception)', 'https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000006424630'],
    ['Légifrance — Code civil, art. 112 à 132 (absence)', 'https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006070721/LEGISCTA000006117694/'],
    ['Légifrance — Code de la propriété intellectuelle, art. L123-1', 'https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000006278937'],
    ['service-public — Changer de nom de famille', 'https://www.service-public.gouv.fr/particuliers/vosdroits/F36379'],
    ['service-public — Changer de prénom', 'https://www.service-public.gouv.fr/particuliers/vosdroits/F885'],
    ['service-public — Nationalité française par mariage', 'https://www.service-public.gouv.fr/particuliers/vosdroits/F2726']
  ],
  'marche-particuliers': [
    ['economie.gouv.fr — Les livrets réglementés', 'https://www.economie.gouv.fr/particuliers/gerer-mon-argent/gerer-mon-budget-et-mon-epargne/livret-comment-ca-marche'],
    ['economie.gouv.fr — Le plan d\'épargne logement (PEL)', 'https://www.economie.gouv.fr/particuliers/gerer-mon-argent/gerer-mon-budget-et-mon-epargne/plan-epargne-logement-pel-comment-ca-marche'],
    ['economie.gouv.fr — Le plan d\'épargne en actions (PEA)', 'https://www.economie.gouv.fr/particuliers/gerer-mon-argent/gerer-mon-budget-et-mon-epargne/quest-ce-que-le-plan-depargne-en-actions-pea'],
    ['economie.gouv.fr — La fiscalité de l\'assurance vie', 'https://www.economie.gouv.fr/particuliers/gerer-mon-argent/gerer-mon-budget-et-mon-epargne/quelle-est-la-fiscalite-de-lassurance-vie'],
    ['economie.gouv.fr — Le plan d\'épargne retraite individuel', 'https://www.economie.gouv.fr/particuliers/gerer-mon-argent/gerer-mon-budget-et-mon-epargne/comment-fonctionne-le-plan-depargne-retraite-individuel'],
    ['economie.gouv.fr — Le prélèvement forfaitaire unique', 'https://www.economie.gouv.fr/particuliers/impots-et-fiscalite/gerer-mes-autres-impots-et-taxes/comment-fonctionne-le-prelevement'],
    ['DGCCRF — Délais de réflexion et de rétractation', 'https://www.economie.gouv.fr/dgccrf/les-fiches-pratiques/les-delais-de-reflexion-ou-de-retractation'],
    ['Banque de France — Taux d\'usure', 'https://www.banque-france.fr/fr/statistiques/taux-et-cours/taux-dusure-2026-q3']
  ],
  'systeme-bancaire': [
    ['economie.gouv.fr — Taux de l\'épargne réglementée au 1er février 2026', 'https://www.economie.gouv.fr/actualites/epargne-reglementee-de-nouveaux-taux-pour-le-livret-et-le-lep-au-1er-fevrier-2026'],
    ['Légifrance — Décision D-HCSF-2021-7 (crédit immobilier)', 'https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000044178669'],
    ['DGCCRF — Délais de réflexion et de rétractation', 'https://www.economie.gouv.fr/dgccrf/les-fiches-pratiques/les-delais-de-reflexion-ou-de-retractation'],
    ['EUR-Lex — Directive (UE) 2023/2225 (crédit à la consommation)', 'https://eur-lex.europa.eu/eli/dir/2023/2225/oj'],
    ['Banque de France — Le microcrédit', 'https://www.banque-france.fr/fr/a-votre-service/particuliers/connaitre-pratiques-bancaires-assurance/credit/microcredit'],
    ['EUR-Lex — Règlement (UE) 2024/1623 (CRR3)', 'https://eur-lex.europa.eu/eli/reg/2024/1623/oj'],
    ['EUR-Lex — Directive (UE) 2024/1619 (CRD VI)', 'https://eur-lex.europa.eu/eli/dir/2024/1619/oj'],
    ['economie.gouv.fr — Le prêt à taux zéro', 'https://www.economie.gouv.fr/particuliers/emprunter-et-sassurer/pret-taux-zero-ptz-tout-ce-quil-faut-savoir']
  ],
  'marketing-numerique': [
    ['EUR-Lex — Règlement (UE) 2016/679 (RGPD)', 'https://eur-lex.europa.eu/eli/reg/2016/679/oj'],
    ['CNIL — Les sanctions prononcées par la CNIL', 'https://www.cnil.fr/fr/les-sanctions-prononcees-par-la-cnil']
  ],
  'produits-derives': [
    ['BRI — Enquête triennale sur le marché des changes (2025)', 'https://www.bis.org/statistics/rpfx25_fx.htm'],
    ['Banque de France — L\'ABC de l\'économie : le taux de change', 'https://www.banque-france.fr/system/files/2024-08/taux-de-change.pdf'],
    ['Banque de France — Enquête triennale BRI 2025, résultats France', 'https://www.banque-france.fr/fr/publications-et-statistiques/outils-statistiques/espace-declarants/enquete-triennale-bri-change-derives-de-gre-gre-otc-2025'],
    ['BCE — Cours de référence de l\'euro', 'https://www.ecb.europa.eu/stats/policy_and_exchange_rates/euro_reference_exchange_rates/html/index.en.html']
  ],
  'produits-derives-2': [
    ['Banque de France — Les chambres de compensation', 'https://www.banque-france.fr/fr/publications-et-statistiques/publications/les-chambres-de-compensation'],
    ['EUR-Lex — Règlement (UE) n° 648/2012 (EMIR)', 'https://eur-lex.europa.eu/eli/reg/2012/648/oj/fra'],
    ['AMF — Dossier EMIR', 'https://www.amf-france.org/fr/actualites-publications/dossiers-thematiques/emir'],
    ['EUR-Lex — Directive 2014/65/UE (MiFID II), annexe I, section C', 'https://eur-lex.europa.eu/eli/dir/2014/65/oj/fra']
  ],
  'etudes-marche': [
    ['Insee — Peut-on se fier aux sondages empiriques ? (méthode des quotas)', 'https://www.insee.fr/fr/information/7722109'],
    ['CNIL — L\'anonymisation de données personnelles', 'https://www.cnil.fr/lanonymisation-de-donnees-personnelles']
  ]
};
