/* Curated visa knowledge for tools/build-visa-pages.mjs.
 * Rules for this file: no fees, processing times or investment amounts (they change often and are not verified here);
 * country-specific statements only where they are structural (Schengen / GCC membership, region) or attributed and dated;
 * every official link is checked by tools/check-visa-links.mjs before it is published (only links that answer are used). */

export const SCHENGEN = new Set('AT BE BG HR CZ DK EE FI FR DE GR HU IS IT LV LI LT LU MT NL NO PL PT RO SK SI ES SE CH'.split(' '));
export const GCC = new Set('AE SA QA KW BH OM'.split(' '));
const REGION_CODES = {
  'Gulf (GCC)': 'AE SA QA KW BH OM',
  'Middle East': 'IR IQ JO LB SY YE PS IL TR',
  'Schengen Europe': [...SCHENGEN].join(' '),
  'Rest of Europe': 'GB IE CY AL AD BA BY MD ME MK RS UA XK MC SM VA RU',
  'Caucasus & Central Asia': 'GE AM AZ KZ KG TJ TM UZ',
  'South Asia': 'AF BD BT IN MV NP LK',
  'East Asia': 'CN JP KR KP MN TW HK MO',
  'Southeast Asia': 'BN KH ID LA MY MM PH SG TH TL VN',
  'North America': 'US CA MX',
  'Caribbean': 'AG BS BB DM DO GD HT JM KN LC VC TT CU',
  'Central & South America': 'BZ CR SV GT HN NI PA AR BO BR CL CO EC GY PY PE SR UY VE',
  'Oceania': 'AU NZ FJ KI MH FM NR PW PG WS SB TO TV VU',
  'Africa': 'DZ AO BJ BW BF BI CV CM CF TD KM CG CD CI DJ EG GQ ER SZ ET GA GM GH GN GW KE LS LR LY MG MW ML MR MU MA MZ NA NE NG RW ST SN SC SL SO ZA SS SD TZ TG TN UG ZM ZW'
};
export const REGION = {};
for (const [r, codes] of Object.entries(REGION_CODES)) for (const c of codes.split(' ')) if (!REGION[c]) REGION[c] = r;
export const REGIONS = Object.keys(REGION_CODES);

/* Friendlier names than Intl.DisplayNames where the official short name differs. */
export const NAME_OVERRIDES = {TR: 'Türkiye', CI: 'Côte d’Ivoire', CD: 'DR Congo', CG: 'Republic of the Congo', MM: 'Myanmar', KP: 'North Korea', KR: 'South Korea', PS: 'Palestine', VA: 'Vatican City', XK: 'Kosovo', CZ: 'Czechia', SZ: 'Eswatini', TL: 'Timor-Leste', FM: 'Micronesia', HK: 'Hong Kong', MO: 'Macao', MK: 'North Macedonia', US: 'United States', GB: 'United Kingdom', AE: 'United Arab Emirates'};

/* Official government visa / immigration portals (candidates; only links that pass tools/check-visa-links.mjs are published). */
export const PORTALS = {
  AE: 'https://u.ae/en/information-and-services/visa-and-emirates-id', SA: 'https://visa.mofa.gov.sa/', OM: 'https://evisa.rop.gov.om/', BH: 'https://www.evisa.gov.bh/',
  QA: 'https://portal.moi.gov.qa/', KW: 'https://www.moi.gov.kw/', TR: 'https://www.evisa.gov.tr/', GB: 'https://www.gov.uk/check-uk-visa',
  US: 'https://travel.state.gov/content/travel/en/us-visas.html', CA: 'https://www.canada.ca/en/immigration-refugees-citizenship/services/visit-canada.html',
  AU: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-finder', NZ: 'https://www.immigration.govt.nz/', IE: 'https://www.irishimmigration.ie/',
  MY: 'https://malaysiavisa.imi.gov.my/', TH: 'https://www.thaievisa.go.th/', AZ: 'https://evisa.gov.az/', LK: 'https://www.eta.gov.lk/', KE: 'https://www.etakenya.go.ke/',
  EG: 'https://visa2egypt.gov.eg/', KR: 'https://www.visa.go.kr/', SG: 'https://www.ica.gov.sg/', ID: 'https://evisa.imigrasi.go.id/', VN: 'https://evisa.gov.vn/',
  GE: 'https://www.evisa.gov.ge/', UZ: 'https://e-visa.gov.uz/', AM: 'https://evisa.mfa.am/', RU: 'https://evisa.kdmid.ru/', JP: 'https://www.mofa.go.jp/j_info/visit/visa/index.html',
  ZA: 'https://www.dha.gov.za/', KH: 'https://www.evisa.gov.kh/', ET: 'https://www.evisa.gov.et/', TZ: 'https://visa.immigration.go.tz/', UG: 'https://visas.immigration.go.ug/',
  RW: 'https://www.migration.gov.rw/', BD: 'https://www.visa.gov.bd/', NP: 'https://nepaliport.immigration.gov.np/', KG: 'https://www.evisa.e-gov.kg/', TJ: 'https://www.evisa.tj/',
  KZ: 'https://www.vmp.gov.kz/', MA: 'https://www.acces-maroc.ma/', BR: 'https://www.gov.br/mre/en', CN: 'https://www.visaforchina.cn/', MV: 'https://imuga.immigration.gov.mv/'
};
export const SCHENGEN_INFO = 'https://home-affairs.ec.europa.eu/policies/schengen_en';
export const PK_BEOE = 'https://beoe.gov.pk/';
export const NUSUK = 'https://www.nusuk.sa/';

/* Investment routes known to us. Status words are deliberately conservative; amounts are never stated. kind: 'residence' | 'citizenship'. */
export const INVESTMENT = {
  AE: [{kind: 'residence', name: 'UAE Golden Visa (long-term residence)', note: 'Long-term renewable residence for investors, entrepreneurs, skilled professionals and other eligible groups.', status: 'open', url: 'https://u.ae/en/information-and-services/visa-and-emirates-id/residence-visas/golden-visa'}],
  SA: [{kind: 'residence', name: 'Saudi Premium Residency', note: 'Residence programme with several tracks, including investor and real-estate owner tracks.', status: 'open'}],
  BH: [{kind: 'residence', name: 'Bahrain Golden Residency Visa', note: 'Long-term residence for eligible property owners, investors and professionals.', status: 'open'}],
  OM: [{kind: 'residence', name: 'Oman investor residency', note: 'Long-term residence linked to investment in Oman.', status: 'verify'}],
  QA: [{kind: 'residence', name: 'Qatar residence for property owners and investors', note: 'Residence linked to qualifying property ownership or investment.', status: 'verify'}],
  TR: [{kind: 'citizenship', name: 'Turkish citizenship by investment', note: 'Citizenship through qualifying investment such as real estate or deposits, with a holding period.', status: 'open'},
       {kind: 'residence', name: 'Türkiye residence permit through property', note: 'Short-term residence permit for property owners.', status: 'verify'}],
  US: [{kind: 'residence', name: 'EB-5 Immigrant Investor Program (permanent residence)', note: 'Green card through investment in a US commercial enterprise that creates jobs.', status: 'open', url: 'https://www.uscis.gov/working-in-the-united-states/permanent-workers/eb-5-immigrant-investor-program'}],
  CA: [{kind: 'residence', name: 'Start-up Visa Program (permanent residence)', note: 'Permanent residence for founders supported by a designated Canadian organisation. Intake limits change; check before applying.', status: 'verify', url: 'https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/start-visa.html'}],
  GB: [{kind: 'residence', name: 'Tier 1 (Investor) visa', note: 'Closed to new applicants in February 2022. Business routes such as the Innovator Founder visa are separate and require an endorsed business idea.', status: 'closed'}],
  IE: [{kind: 'residence', name: 'Immigrant Investor Programme (IIP)', note: 'Closed to new applications in February 2023.', status: 'closed'}],
  AU: [{kind: 'residence', name: 'Business Innovation and Investment Program', note: 'Closed to new applications in 2024. Check the current skilled and business visa options with the Department of Home Affairs.', status: 'closed'}],
  NZ: [{kind: 'residence', name: 'Active Investor Plus visa', note: 'Residence for investors who make qualifying investments in New Zealand.', status: 'open', url: 'https://www.immigration.govt.nz/'}],
  PT: [{kind: 'residence', name: 'Portugal Golden Visa (ARI)', note: 'Residence by investment. The real-estate route was removed in 2023; other routes such as investment funds remain. Check the current list.', status: 'verify'}],
  GR: [{kind: 'residence', name: 'Greece Golden Visa', note: 'Residence permit through real estate or other qualifying investment; thresholds were raised in 2024 and differ by area.', status: 'open'}],
  ES: [{kind: 'residence', name: 'Spain investor residence (golden visa)', note: 'Abolished in 2025.', status: 'closed'}],
  MT: [{kind: 'residence', name: 'Malta Permanent Residence Programme (MPRP)', note: 'Permanent residence through investment and contribution.', status: 'open'},
       {kind: 'citizenship', name: 'Malta citizenship for exceptional services by direct investment', note: 'The EU Court of Justice ruled in April 2025 that this scheme breaches EU law. Treat it as unavailable and check Malta\'s official sources.', status: 'closed'}],
  CY: [{kind: 'residence', name: 'Cyprus permanent residence by investment', note: 'Permanent residence through qualifying investment. The citizenship-by-investment scheme closed in 2020.', status: 'verify'}],
  HU: [{kind: 'residence', name: 'Hungary Guest Investor residence', note: 'Residence through qualifying investment, introduced in 2024.', status: 'verify'}],
  IT: [{kind: 'residence', name: 'Italy Investor Visa', note: 'Two-year renewable residence for qualifying investments or donations in Italy.', status: 'open'}],
  LV: [{kind: 'residence', name: 'Latvia residence through investment', note: 'Temporary residence through business, property or other qualifying investment.', status: 'verify'}],
  ME: [{kind: 'citizenship', name: 'Montenegro citizenship by investment', note: 'Closed at the end of 2022.', status: 'closed'}],
  TH: [{kind: 'residence', name: 'Thailand Long-Term Resident (LTR) visa and Thailand Privilege', note: 'Long-stay visas for wealthy individuals, retirees, remote workers and professionals.', status: 'open'}],
  MY: [{kind: 'residence', name: 'Malaysia My Second Home (MM2H)', note: 'Long-stay social visit pass; the programme was revised in 2024 with tiered requirements.', status: 'verify'}],
  PA: [{kind: 'residence', name: 'Panama Qualified Investor residence', note: 'Permanent residence through qualifying investment.', status: 'verify'}],
  CR: [{kind: 'residence', name: 'Costa Rica investor residency', note: 'Temporary residence for qualifying investors.', status: 'verify'}],
  MU: [{kind: 'residence', name: 'Mauritius residence through investment', note: 'Residence permits for investors and property buyers in approved schemes.', status: 'verify'}],
  DM: [{kind: 'citizenship', name: 'Dominica Citizenship by Investment', note: 'Citizenship through a government fund contribution or approved real estate, after due diligence.', status: 'open', url: 'https://cbiu.gov.dm/'}],
  KN: [{kind: 'citizenship', name: 'St Kitts and Nevis Citizenship by Investment', note: 'One of the oldest programmes; contribution or approved investment options, with due diligence.', status: 'open', url: 'https://ciu.gov.kn/'}],
  AG: [{kind: 'citizenship', name: 'Antigua and Barbuda Citizenship by Investment', note: 'Fund contribution, real estate or business options, with due diligence and a residence requirement.', status: 'open', url: 'https://cip.gov.ag/'}],
  GD: [{kind: 'citizenship', name: 'Grenada Citizenship by Investment', note: 'Fund contribution or approved real estate, with due diligence.', status: 'open'}],
  LC: [{kind: 'citizenship', name: 'Saint Lucia Citizenship by Investment', note: 'Fund, real estate, enterprise project or bond options, with due diligence.', status: 'open'}],
  VU: [{kind: 'citizenship', name: 'Vanuatu Development Support Program', note: 'Citizenship through a government contribution. Several countries have reviewed visa-free access for Vanuatu passports; check the current position.', status: 'verify'}],
  EG: [{kind: 'citizenship', name: 'Egypt citizenship by investment', note: 'Citizenship through qualifying deposits, property or investment.', status: 'verify'}],
  NR: [{kind: 'citizenship', name: 'Nauru Economic and Climate Resilience Citizenship', note: 'Programme launched in 2024.', status: 'verify'}],
  JO: [{kind: 'citizenship', name: 'Jordan citizenship by investment', note: 'Citizenship through qualifying investment, deposits or securities.', status: 'verify'}]
};

/* Visa types covered on every country page and as stand-alone guides. */
export const TYPES = [
  {slug: 'visit-visa', short: 'Visit / tourist visa', icon: 'plane', kw: 'visit visa', blurb: 'Tourism, visiting family or friends, short trips.'},
  {slug: 'business-visa', short: 'Business visa', icon: 'brief', kw: 'business visa', blurb: 'Meetings, conferences, trade fairs. No paid work.'},
  {slug: 'work-visa', short: 'Work visa', icon: 'tool', kw: 'work visa', blurb: 'Employment with a sponsoring employer.'},
  {slug: 'study-visa', short: 'Study visa', icon: 'cap', kw: 'student visa', blurb: 'Admission to a recognised college or university.'},
  {slug: 'family-visa', short: 'Family visa', icon: 'home', kw: 'family visa', blurb: 'Joining a spouse, parent or child who lives there.'},
  {slug: 'transit-visa', short: 'Transit visa', icon: 'route', kw: 'transit visa', blurb: 'Changing flights or passing through.'},
  {slug: 'residence-by-investment', short: 'Residence by investment', icon: 'key', kw: 'residence by investment', blurb: 'Golden visas and investor residence permits.'},
  {slug: 'citizenship-by-investment', short: 'Citizenship by investment', icon: 'flag', kw: 'citizenship by investment', blurb: 'A second passport through approved investment.'},
  {slug: 'permanent-residence', short: 'Permanent residence (PR)', icon: 'shield', kw: 'permanent residence', blurb: 'Long-term settlement routes and how PR works.'}
];

/* Evergreen guides (general process, accurate for most countries; country specifics stay on country pages). */
export const GUIDES = {
  'visit-visa': {
    title: 'Visit visa guide: how to apply for a tourist or family visit visa',
    h1: 'Visit and tourist visa: complete step-by-step guide',
    intro: 'A visit visa lets you travel for tourism, to see family or friends, or for a short private trip. You cannot work on it. Most refusals come from weak evidence of funds or of your reasons to return home, so this guide focuses on what decides the outcome.',
    steps: [
      ['Check what your passport needs', 'Look up the destination: visa-free, visa on arrival, e-visa, electronic travel authorisation, or an embassy visa. Always confirm on the official government portal before booking.'],
      ['Check your passport', 'Most countries want at least six months of validity beyond your return date and blank visa pages. Renew first if you are close.'],
      ['Plan the trip on paper', 'Decide dates, cities and where you will stay. Keep refundable hotel bookings and a flight reservation rather than paid tickets until the visa is issued.'],
      ['Collect your documents', 'Use the checklist below. Every document should tell the same story: who you are, why you are going, who pays and why you will come back.'],
      ['Apply on the official channel', 'Apply on the government e-visa portal, through the embassy, or at the official visa application centre. Book the appointment early in peak season.'],
      ['Give biometrics and attend any interview', 'Bring originals of everything you uploaded. Answer briefly and honestly; your answers must match your documents.'],
      ['Track, collect and check the visa', 'When the visa arrives, check names, passport number, dates, number of entries and permitted length of stay before you travel.']
    ],
    docs: ['Passport valid for six months or more, with blank pages, plus copies of old passports and visas', 'Recent photographs to the destination\'s size and background rules', 'Completed application form and fee receipt', 'Bank statements (often the last six months) with a balance that fits the trip', 'Employment letter with leave approval, or business registration and tax returns if self-employed', 'Hotel booking or the host\'s invitation letter and a copy of their ID or residence permit', 'Return or onward flight reservation and a day-by-day itinerary', 'Travel medical insurance covering the whole stay (mandatory for Schengen countries)', 'Family Registration Certificate (FRC) from NADRA when family members travel together', 'Polio vaccination certificate, required for travellers leaving Pakistan'],
    tips: ['Explain any large recent deposit in your bank account; unexplained funds are a common reason for refusal.', 'Show ties to Pakistan: a job, a business, property, family or studies you will return to.', 'Never submit fake bookings, bank letters or invitations. A finding of deception can lead to a long ban.', 'A previous refusal must be declared. Fix the reason before you apply again.'],
    faq: [['Can I work on a visit visa?', 'No. Visit visas do not allow paid work. Working without permission can lead to removal and a ban.'], ['How much bank balance do I need?', 'Most countries do not publish one fixed figure. Your funds should comfortably cover flights, accommodation and daily costs for the whole stay, and be consistent with your income.'], ['Can a visit visa be converted to a work visa?', 'Usually not from inside the country. Most countries require you to apply for a work visa from home. A few allow a change of status; check the official rules.'], ['How early should I apply?', 'As early as the destination allows. Many embassies accept applications months ahead, and appointments fill quickly in summer and around holidays.']]
  },
  'business-visa': {
    title: 'Business visa guide: meetings, conferences and trade fairs',
    h1: 'Business visa: how to apply for meetings, conferences and trade fairs',
    intro: 'A business visa covers short business activities such as meetings, negotiations, conferences, trade fairs and site visits. It does not allow you to be employed or paid by an organisation in the destination country.',
    steps: [['Confirm the activity is allowed', 'Meetings, conferences and negotiations are usually allowed. Hands-on work, installation or being paid locally usually needs a work visa.'], ['Get an invitation letter', 'From the host company or event organiser, on letterhead, with dates, purpose, who pays and contact details.'], ['Prepare company documents', 'Your employer\'s letter, company registration, tax registration and evidence of the business relationship.'], ['Apply on the official channel', 'E-visa portal, embassy or official visa centre, depending on the country.'], ['Attend biometrics or interview', 'Be ready to explain the business purpose in plain words.'], ['Travel within the permitted dates', 'Keep the invitation and company letter with you at the border.']],
    docs: ['Passport valid for six months or more', 'Invitation letter from the host company or event', 'Employer\'s cover letter confirming your job, salary and the trip\'s purpose', 'Company registration and tax documents (if you own the business)', 'Bank statements and evidence of who pays for the trip', 'Conference registration or trade fair badge, if relevant', 'Travel insurance and accommodation details'],
    tips: ['Keep the purpose consistent across the invitation, the cover letter and the form.', 'A history of business trips and returns strengthens later applications.', 'If you will train staff, install equipment or be paid locally, ask whether you need a work permit instead.'],
    faq: [['Can I sign contracts on a business visa?', 'Usually yes; negotiating and signing contracts is a typical business-visitor activity. Check the destination\'s list of permitted activities.'], ['Can my company pay me while I travel?', 'Yes, if your salary is paid by your employer at home. Being paid by a company in the destination usually needs a work visa.']]
  },
  'work-visa': {
    title: 'Work visa guide: job offer, sponsorship and Pakistan protector process',
    h1: 'Work visa: from job offer to departure, step by step',
    intro: 'A work visa lets you take paid employment abroad, nearly always with a sponsoring employer. For Pakistani workers the process has two parts: the destination country\'s visa and work permit, and Pakistan\'s emigration clearance before you fly.',
    steps: [['Get a genuine job offer', 'From a real employer, with a written contract that states salary, hours, duties, accommodation and contract length. Verify the employer independently.'], ['Employer starts sponsorship', 'Most countries need the employer to obtain a work permit, labour approval or sponsorship certificate before your visa.'], ['Prepare and attest documents', 'Educational degrees are usually attested by HEC and the Ministry of Foreign Affairs, and by the destination\'s embassy when required. Get a police character certificate.'], ['Medical examination', 'Many countries require a medical test at an approved centre. Gulf countries use GCC-approved medical centres booked through the Wafid (formerly GAMCA) system.'], ['Apply for the visa', 'Online, at the embassy or at the official visa centre, using the employer\'s approval.'], ['Pakistan emigration clearance', 'Before departure, register and obtain protector clearance with the Bureau of Emigration & Overseas Employment, usually through a licensed Overseas Employment Promoter.'], ['Arrive and complete residence formalities', 'Get your residence card or permit, register as required and keep copies of your contract.']],
    docs: ['Passport valid for at least the contract length plus six months', 'Signed employment contract or offer letter', 'Employer\'s work permit, labour approval or sponsorship reference', 'Attested degrees, diplomas and experience letters', 'Police character certificate', 'Medical fitness certificate from an approved centre', 'Photographs, CNIC copy and completed forms', 'Protector clearance from the Bureau of Emigration & Overseas Employment (Pakistan)'],
    tips: ['Never pay for a job offer to an unlicensed agent. Licensed Overseas Employment Promoters are listed by the Bureau of Emigration & Overseas Employment.', 'A real employer does not ask you to travel on a visit visa and "convert" it later.', 'Keep your passport. In most countries it is illegal for an employer to hold it.', 'Read the contract before you sign and keep a copy at home.'],
    faq: [['Do I need protector clearance?', 'Pakistani workers going abroad for employment normally need registration and protector clearance with the Bureau of Emigration & Overseas Employment before departure.'], ['Can I find a job after arriving on a visit visa?', 'In most countries working on a visit visa is illegal. Look for jobs from Pakistan through licensed promoters or official job portals.'], ['How long does a work visa take?', 'It depends on the employer\'s approvals, document attestation and medical checks. Plan for several weeks to a few months.']]
  },
  'study-visa': {
    title: 'Study visa guide: admission, funds, language tests and interview',
    h1: 'Student visa: admission to arrival, step by step',
    intro: 'A study visa lets you enrol in a recognised institution abroad. The key decisions are made on your admission, your ability to pay tuition and living costs, your English or local-language level and your genuine intention to study.',
    steps: [['Choose a recognised institution', 'Check the institution is licensed to admit international students in that country.'], ['Meet the language requirement', 'Take the test the institution and the visa rules accept, such as IELTS, PTE or TOEFL.'], ['Get your admission', 'Receive the offer and any official acceptance document the visa needs.'], ['Prove funds', 'Show tuition and living costs for the period the country requires, held in an acceptable way.'], ['Apply for the visa', 'Online or at the official visa centre; give biometrics and attend an interview if asked.'], ['Prepare for arrival', 'Arrange accommodation, health insurance and registration with the institution and local authorities.']],
    docs: ['Passport', 'Offer or acceptance letter and fee receipt', 'Academic transcripts and degrees (attested where required)', 'Language test results', 'Bank statements, scholarship or sponsor letters', 'Statement of purpose explaining your study plan', 'Health insurance and medical certificate if required', 'Tuberculosis test where the country requires it'],
    tips: ['Explain clearly how the course fits your past studies and future plans in Pakistan or abroad.', 'Funds should be genuine and explainable; sudden large deposits raise questions.', 'Check work-while-studying rules; they are strict and limited in most countries.'],
    faq: [['Can I work while studying?', 'Many countries allow limited part-time work during term. Rules and hours differ; follow your visa conditions exactly.'], ['Can my family come with me?', 'Some countries allow dependants for certain courses only. Check the current rules before applying.']]
  },
  'family-visa': {
    title: 'Family visa guide: joining a spouse, parent or child abroad',
    h1: 'Family visa: joining a spouse, parent or child abroad',
    intro: 'A family visa lets you join a close relative who lives in the destination country, usually a citizen or legal resident who sponsors you. The sponsor\'s status, income and housing and proof of the relationship decide most cases.',
    steps: [['Check the sponsor is eligible', 'The family member must hold a status that allows sponsorship, and often meet income and housing rules.'], ['Prove the relationship', 'Marriage and birth certificates, registered with NADRA and attested where required.'], ['Sponsor prepares documents', 'Residence permit, employment and salary evidence, tenancy or property documents.'], ['Apply on the official channel', 'Some countries start with the sponsor\'s application inside the country; others start with yours at the embassy.'], ['Biometrics, interview and medicals', 'Couples may be interviewed separately about their relationship.'], ['Arrive and register', 'Complete residence registration within the time allowed.']],
    docs: ['Passport and photographs', 'Marriage certificate (NADRA-issued, attested) or birth certificates', 'Family Registration Certificate (FRC) from NADRA', 'Sponsor\'s passport and residence permit', 'Sponsor\'s employment letter, salary slips and bank statements', 'Tenancy agreement or property ownership documents', 'Language test results where required', 'Medical certificate where required'],
    tips: ['Keep photos, messages and travel records that show a genuine relationship for spouse visas.', 'Make sure names and dates match across every document; small spelling differences cause delays.'],
    faq: [['Can my parents visit on a family visa?', 'Short visits by parents usually use a visit visa. Long-term family visas for parents are limited in many countries.'], ['Does my sponsor need a minimum salary?', 'Many countries set an income or salary threshold for sponsors. Check the current figure on the official portal.']]
  },
  'transit-visa': {
    title: 'Transit visa guide: do you need a visa to change flights?',
    h1: 'Transit visa: when you need one to change flights',
    intro: 'Whether you need a transit visa depends on your passport, the airport, whether you leave the international transit area and whether your bags are checked through. Some countries require an airport transit visa even if you never leave the airport.',
    steps: [['Check your route', 'Note every airport where you change planes and whether you change airports or terminals.'], ['Check each country\'s transit rule', 'Look up the rule for your passport at each connecting airport on the official portal or with your airline.'], ['Check baggage', 'If you must collect and re-check bags, you usually pass immigration and may need a visa.'], ['Apply if required', 'Transit visas are applied for like short visit visas, with your onward ticket as the main document.']],
    docs: ['Passport valid for six months or more', 'Confirmed onward ticket', 'Visa for your final destination', 'Completed transit visa form and photographs, if a visa is required'],
    tips: ['Book connections on a single ticket so bags are checked through.', 'Some countries offer visa-free transit for travellers holding a valid visa for the US, UK, Schengen or Canada; confirm before you fly.'],
    faq: [['Will the airline check my transit visa?', 'Yes. Airlines can refuse boarding if you do not have the documents required for every leg.']]
  },
  'residence-by-investment': {
    title: 'Residence by investment (golden visa) guide: how it works',
    h1: 'Residence by investment: golden visas explained',
    intro: 'Residence-by-investment programmes, often called golden visas, give you the right to live in a country in return for a qualifying investment such as property, a business, government bonds or an investment fund. Residence is not citizenship: you keep your passport, and citizenship usually requires years of residence later.',
    steps: [['Decide what you need', 'Right to live, visa-free travel in a region, education for children, or a path to permanent residence or citizenship. Programmes differ widely.'], ['Shortlist programmes and check status', 'Programmes open, change and close often. Confirm the current rules on the government\'s official site.'], ['Check the source of your funds', 'Every programme runs due diligence. You must document where the investment money came from.'], ['Choose a licensed adviser and lawyer', 'Use advisers authorised by the programme where that applies. Never pay cash to an unverified agent.'], ['Make the investment and apply', 'Usually in that order or in parallel; follow the official sequence.'], ['Biometrics, approval and renewal', 'Keep the investment for the required period and meet any minimum stay rules to renew.']],
    docs: ['Passport and civil documents for every family member', 'Police clearance certificates', 'Source-of-funds evidence: tax returns, sale deeds, business accounts, bank records', 'Investment documents (title deed, fund certificate, company registration)', 'Health insurance', 'Proof of address'],
    tips: ['Several well-known programmes have closed or changed since 2022 (for example the UK investor visa, Ireland\'s IIP, Spain\'s golden visa and the real-estate route in Portugal). Never rely on an old article.', 'Ask whether the residence leads to permanent residence or citizenship, and after how many years.', 'Count every cost: government fees, due diligence, legal fees, taxes and the cost of holding the investment.'],
    faq: [['Is residence by investment the same as citizenship?', 'No. It gives you residence. Citizenship, where available, usually needs years of residence, language and integration tests.'], ['Can my family be included?', 'Most programmes allow a spouse and dependent children, and some allow parents. Each person passes due diligence.']]
  },
  'citizenship-by-investment': {
    title: 'Citizenship by investment guide: second passport programmes explained',
    h1: 'Citizenship by investment: how second-passport programmes work',
    intro: 'Citizenship-by-investment programmes grant citizenship, and a passport, to people who make an approved economic contribution, usually a government fund donation or approved real estate. The best-known programmes are in the Caribbean. Due diligence is strict and rules change often.',
    steps: [['Confirm dual citizenship is possible for you', 'Pakistan allows dual nationality with a list of countries; check the current position with the Directorate General of Immigration & Passports and NADRA before applying.'], ['Compare programmes', 'Look at visa-free access, total cost, processing route, residence rules and family inclusion. Check status on the official government site.'], ['Use an authorised agent', 'Most programmes accept applications only through licensed agents. Verify the agent on the government list.'], ['Pass due diligence', 'Background checks on you and your family, including the source of your funds.'], ['Make the contribution or investment', 'Normally after approval in principle, following the official sequence.'], ['Take the oath and get your passport', 'Some programmes require an interview or a short visit.']],
    docs: ['Passports, birth and marriage certificates for every applicant', 'Police clearance certificates', 'Detailed source-of-funds and source-of-wealth evidence', 'Medical certificates', 'Professional reference and bank reference letters'],
    tips: ['Visa-free access lists for some second passports have been reduced by other countries. Check the current list before you invest.', 'Beware of discounted offers below the official minimum; they can lead to revocation.', 'An EU court ruling in April 2025 found Malta\'s investor citizenship scheme incompatible with EU law; EU citizenship by investment is not a realistic route today.'],
    faq: [['Do I have to live in the country?', 'Most Caribbean programmes do not require long residence, but some require a short visit or an interview.'], ['Will I lose my Pakistani citizenship?', 'Pakistan permits dual nationality with specific countries. Check the current list with the Directorate General of Immigration & Passports before you apply.']]
  },
  'permanent-residence': {
    title: 'Permanent residence (PR) guide: routes to settle abroad',
    h1: 'Permanent residence: routes to settle abroad',
    intro: 'Permanent residence lets you live and work in a country without a time limit, while keeping your citizenship. Routes are usually skilled migration, family, long-term work, study followed by work, business or investment.',
    steps: [['Find your route', 'Skilled points systems, employer-sponsored PR, family sponsorship, long residence or investment.'], ['Check eligibility in detail', 'Age, education, experience, language level and, for some routes, occupation lists.'], ['Get documents assessed', 'Credential or skills assessments, language tests and police certificates.'], ['Submit the application or expression of interest', 'Points-based systems invite the highest-ranked candidates.'], ['Medical and security checks', 'For you and every family member.'], ['Land and keep the status', 'Meet the residence obligation so you do not lose PR.']],
    docs: ['Passport and civil documents', 'Educational credential assessment', 'Language test results', 'Employment reference letters', 'Police certificates from every country of long stay', 'Medical examinations', 'Proof of funds where required'],
    tips: ['Points, quotas and occupation lists change several times a year; follow the official portal.', 'Be wary of anyone guaranteeing PR or a job for a fee.'],
    faq: [['Is PR the same as citizenship?', 'No. PR lets you live and work permanently; citizenship usually needs further years of residence and a separate application.'], ['Can PR be lost?', 'Yes. Most countries require you to live there for a minimum period, and serious crimes can lead to loss of status.']]
  }
};
