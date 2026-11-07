// Plumbline content shared across pages.
(function () {
  const ELIG = 'You must be 18 or older and able to work as an independent contractor in your country of residence. We pay fellows in every country our payout partners support.';
  const PAY = 'Approved hours are paid weekly, every Friday, for work approved the week before.';
  const R = (title, field, rate, needed, levels, work, need, primary, lang) => ({ title, field, rate, needed, levels, work, need, primary, lang });

  window.PL_DATA = {
    ELIG, PAY,
    ROLES: [
      R('AI Evaluation Specialist', 'General', 17, 500, 'Any degree level', 'Rate everyday AI answers for accuracy, tone and helpfulness.', 'Sharp reading skills and attention to detail.', ''),
      R('Software Engineer', 'Engineering', 150, 120, "Bachelor's · Master's · PhD", 'Review and write code solutions in Python, Rust, TypeScript and Go.', 'Professional or strong academic coding experience.', 'Software engineering'),
      R('Rust Systems Reviewer', 'Engineering', 140, 25, "Bachelor's · Master's · PhD", 'Judge model answers on ownership, lifetimes, async and unsafe code.', 'Shipped or substantial Rust projects.', 'Software engineering'),
      R('Android Developer', 'Engineering', 120, 30, "Bachelor's · Master's", 'Evaluate Kotlin and Jetpack Compose answers and fix broken samples.', 'Experience building Android apps.', 'Software engineering'),
      R('Data Scientist', 'Engineering', 130, 60, "Bachelor's · Master's · PhD", 'Check statistical reasoning, SQL and ML pipeline answers.', 'Hands-on data analysis or ML work.', 'Data science & ML'),
      R('Cybersecurity Analyst', 'Engineering', 135, 35, "Bachelor's · Master's · Certifications", 'Assess model answers on threat modeling and secure configuration.', 'Security work or recognized certifications.', 'Cybersecurity'),
      R('Game Developer', 'Engineering', 125, 25, "Bachelor's · Master's · PhD", 'Review gameplay code, engine questions and design reasoning.', 'Unity, Unreal or Godot experience.', 'Game design'),
      R('PCB Tool Specialist', 'Engineering', 125, 15, "Bachelor's · Master's · PhD", 'Evaluate answers about schematics, layout and EDA tooling.', 'Electronics design experience.', 'Electrical engineering'),
      R('Biology Reviewer', 'Science', 100, 50, "Master's · PhD · Postdoc", 'Fact-check molecular, cell and organismal biology explanations.', 'Graduate-level biology training.', 'Biology'),
      R('Chemistry Expert', 'Science', 100, 50, "Master's · PhD · Postdoc", 'Verify reaction mechanisms, calculations and lab reasoning.', 'Graduate-level chemistry training.', 'Chemistry'),
      R('Physics Expert', 'Science', 110, 45, "Master's · PhD · Postdoc", 'Write and check multi-step physics problems and derivations.', 'Graduate-level physics training.', 'Physics'),
      R('Energy Professional', 'Science', 80, 20, "Bachelor's · Master's · PhD", 'Review answers on power systems, renewables and energy markets.', 'Industry or research experience in energy.', 'Energy'),
      R('Clinical Reviewer', 'Medicine', 110, 60, 'MD · MBChB · RN · PharmD', 'Check medical explanations for accuracy and safe framing.', 'Clinical qualification and practice.', 'Medicine'),
      R('Nursing Specialist', 'Medicine', 70, 80, 'RN · BSN · MSN', 'Review patient-care guidance and nursing workflows.', 'Registered nurse experience.', 'Nursing'),
      R('Public Health Analyst', 'Medicine', 75, 30, "MPH · Master's · PhD", 'Assess epidemiology and health-policy reasoning.', 'Public health training.', 'Public health'),
      R('Contract Law Analyst', 'Law', 95, 40, 'LLB · JD · LLM', 'Evaluate contract analysis, clause drafting and legal reasoning.', 'Legal training; practice is a plus.', 'Law'),
      R('FP&A Analyst', 'Finance', 80, 35, "Associate's · Bachelor's · Master's", 'Check budgeting, forecasting and financial-modeling answers.', 'Finance or FP&A experience.', 'Finance'),
      R('Accountant', 'Finance', 75, 70, "Bachelor's · CPA · ACCA · CPA-K", 'Review bookkeeping, IFRS/GAAP and tax explanations.', 'Accounting qualification or practice.', 'Accounting'),
      R('Economist', 'Finance', 90, 30, "Master's · PhD", 'Assess macro and micro reasoning, data and policy claims.', 'Graduate economics training.', 'Economics'),
      R('Math Problem Writer', 'Math', 90, 60, "Bachelor's · Master's · PhD", 'Write hard problems with full solutions and check model proofs.', 'Strong proof-writing ability.', 'Mathematics'),
      R('Statistician', 'Math', 95, 30, "Master's · PhD", 'Verify inference, experimental design and probability answers.', 'Graduate statistics training.', 'Statistics'),
      R('Swahili Language Expert', 'Languages', 45, 100, 'Native or fluent', 'Review translations and write natural Swahili responses.', 'Native or near-native Swahili.', 'Linguistics', 'Swahili'),
      R('French Language Expert', 'Languages', 45, 80, 'Native or fluent', 'Review translations and grade fluency and tone in French.', 'Native or near-native French.', 'Linguistics', 'French'),
      R('Arabic Language Expert', 'Languages', 50, 70, 'Native or fluent', 'Review Modern Standard and dialect Arabic responses.', 'Native or near-native Arabic.', 'Linguistics', 'Arabic'),
      R('Philosophy Expert', 'Humanities', 120, 20, "Master's · PhD · Postdoc", 'Evaluate arguments, ethics questions and reading of texts.', 'Graduate philosophy training.', 'Philosophy'),
      R('Historian', 'Humanities', 85, 25, "Master's · PhD", 'Fact-check historical claims and weigh sources.', 'Graduate history training.', 'History'),
      R('Creative Writing Reviewer', 'Humanities', 60, 60, "Bachelor's · MFA", 'Judge stories, poems and editing quality.', 'A writing portfolio or MFA.', 'Creative writing'),
      R('Education Specialist', 'Humanities', 55, 75, "Bachelor's · Master's · Teaching cert.", 'Review explanations written for learners and lesson plans.', 'Teaching or curriculum experience.', 'Education'),
      R('Frontend Developer', 'Engineering', 110, 70, "Bachelor's · Master's · PhD", 'Review React, CSS and accessibility answers and fix broken UI code.', 'Professional frontend experience.', 'Software engineering'),
      R('Backend Developer', 'Engineering', 125, 70, "Bachelor's · Master's · PhD", 'Check API design, databases and server-side code in model answers.', 'Professional backend experience.', 'Software engineering'),
      R('DevOps & Cloud Engineer', 'Engineering', 130, 40, "Bachelor's · Master's · Certifications", 'Evaluate answers on AWS, Azure, Kubernetes and CI/CD pipelines.', 'Hands-on cloud or infrastructure work.', 'Software engineering'),
      R('Machine Learning Engineer', 'Engineering', 150, 45, "Bachelor's · Master's · PhD", 'Judge model training, evaluation and deployment answers.', 'Built or shipped ML systems.', 'Data science & ML'),
      R('Database Administrator', 'Engineering', 105, 20, "Bachelor's · Master's · Certifications", 'Review SQL tuning, schema design and backup strategies.', 'Production database experience.', 'Software engineering'),
      R('QA Test Engineer', 'Engineering', 85, 30, "Bachelor's · Master's", 'Assess test plans, bug reports and automation code.', 'Software testing experience.', 'Software engineering'),
      R('Mechanical Engineer', 'Engineering', 105, 40, "Bachelor's · Master's · PhD", 'Check calculations on mechanics, thermodynamics and machine design.', 'Mechanical engineering degree or practice.', 'Mechanical engineering'),
      R('Civil Engineer', 'Engineering', 100, 40, "Bachelor's · Master's · PhD", 'Verify structural, geotechnical and construction reasoning.', 'Civil engineering degree or practice.', 'Civil engineering'),
      R('Electrical Engineer', 'Engineering', 110, 40, "Bachelor's · Master's · PhD", 'Check circuit analysis, power systems and control problems.', 'Electrical engineering degree or practice.', 'Electrical engineering'),
      R('Chemical Engineer', 'Engineering', 105, 20, "Bachelor's · Master's · PhD", 'Review process design, reactor and mass-balance calculations.', 'Chemical engineering degree or practice.', 'Chemical engineering'),
      R('Aerospace Engineer', 'Engineering', 120, 15, "Bachelor's · Master's · PhD", 'Evaluate aerodynamics, propulsion and flight-mechanics answers.', 'Aerospace engineering degree or practice.', 'Aerospace engineering'),
      R('Environmental Scientist', 'Science', 80, 30, "Bachelor's · Master's · PhD", 'Fact-check climate, ecology and pollution explanations.', 'Environmental science training or work.', 'Earth & environmental science'),
      R('Geologist', 'Science', 85, 15, "Bachelor's · Master's · PhD", 'Verify earth-science claims and mineral and field interpretation.', 'Geology degree or field experience.', 'Earth & environmental science'),
      R('Agricultural Scientist', 'Science', 65, 30, "Bachelor's · Master's", 'Review crop, soil and livestock guidance for accuracy.', 'Agriculture training or farm-science work.', 'Agriculture'),
      R('Pharmacist', 'Medicine', 95, 40, 'PharmD · BPharm · MPharm', 'Check drug, dosing and interaction information for safety.', 'Pharmacy qualification and practice.', 'Pharmacy'),
      R('Psychologist', 'Medicine', 90, 40, "Master's · PhD · PsyD", 'Review mental-health explanations for accuracy and safe framing.', 'Psychology training or clinical practice.', 'Psychology'),
      R('Dentist', 'Medicine', 100, 20, 'BDS · DDS · DMD', 'Check oral-health explanations and treatment reasoning.', 'Dental qualification and practice.', 'Dentistry'),
      R('Veterinarian', 'Medicine', 90, 20, 'DVM · BVetMed', 'Review animal-health advice for accuracy and safety.', 'Veterinary qualification and practice.', 'Veterinary medicine'),
      R('Nutritionist & Dietitian', 'Medicine', 60, 30, "Bachelor's · Master's", 'Fact-check diet and nutrition guidance.', 'Nutrition qualification or practice.', 'Nutrition'),
      R('Physiotherapist', 'Medicine', 65, 20, "Bachelor's · Master's · DPT", 'Review rehabilitation and exercise guidance.', 'Physiotherapy qualification and practice.', 'Physiotherapy'),
      R('Criminal Law Analyst', 'Law', 90, 25, 'LLB · JD · LLM', 'Evaluate answers on criminal procedure and liability.', 'Legal training; practice is a plus.', 'Law'),
      R('Intellectual Property Specialist', 'Law', 110, 15, 'LLB · JD · LLM', 'Review patent, trademark and copyright reasoning.', 'IP law training or practice.', 'Law'),
      R('Paralegal', 'Law', 45, 40, "Diploma · Certificate · Bachelor's", 'Check legal summaries, citations and document drafting.', 'Paralegal training or legal office work.', 'Law'),
      R('Investment Banking Analyst', 'Finance', 130, 30, "Bachelor's · Master's · MBA", 'Check valuation, M&A and deal-model reasoning.', 'Banking, deal or valuation experience.', 'Finance'),
      R('Tax Specialist', 'Finance', 80, 30, "Bachelor's · CPA · ACCA", 'Review tax rules, returns and planning explanations.', 'Tax practice or qualification.', 'Accounting'),
      R('Financial Auditor', 'Finance', 80, 25, "Bachelor's · CPA · ACCA", 'Assess audit procedures and internal-control answers.', 'Audit experience or qualification.', 'Accounting'),
      R('Actuary', 'Math', 110, 15, "Bachelor's · Master's · Actuarial exams", 'Verify risk, insurance and probability modeling.', 'Actuarial exams or practice.', 'Statistics'),
      R('Marketing Strategist', 'Business', 70, 50, "Bachelor's · Master's · MBA", 'Evaluate campaign, brand and market-research answers.', 'Marketing work experience.', 'Marketing'),
      R('Management Consultant', 'Business', 110, 30, "Bachelor's · Master's · MBA", 'Judge business cases, market sizing and strategy reasoning.', 'Consulting or strategy experience.', 'Business & strategy'),
      R('Project Manager', 'Business', 75, 40, "Bachelor's · PMP · MBA", 'Review project plans, risk logs and delivery advice.', 'Project management experience.', 'Business & strategy'),
      R('Human Resources Specialist', 'Business', 55, 40, "Bachelor's · Master's · SHRM · CIPD", 'Check hiring, employee-relations and workplace-policy answers.', 'HR experience.', 'Human resources'),
      R('Supply Chain Analyst', 'Business', 70, 30, "Bachelor's · Master's", 'Assess logistics, procurement and inventory reasoning.', 'Supply chain or operations experience.', 'Supply chain & logistics'),
      R('Real Estate Analyst', 'Business', 65, 20, "Bachelor's · Licensed agent", 'Review property valuation, leasing and market answers.', 'Property or real estate experience.', 'Real estate'),
      R('Spanish Language Expert', 'Languages', 45, 100, 'Native or fluent', 'Review translations and write natural Spanish responses.', 'Native or near-native Spanish.', 'Linguistics', 'Spanish'),
      R('Portuguese Language Expert', 'Languages', 45, 60, 'Native or fluent', 'Review translations and grade tone in Portuguese.', 'Native or near-native Portuguese.', 'Linguistics', 'Portuguese'),
      R('German Language Expert', 'Languages', 50, 60, 'Native or fluent', 'Review translations and write natural German responses.', 'Native or near-native German.', 'Linguistics', 'German'),
      R('Mandarin Language Expert', 'Languages', 50, 80, 'Native or fluent', 'Review translations and write natural Mandarin responses.', 'Native or near-native Mandarin.', 'Linguistics', 'Mandarin'),
      R('Hindi Language Expert', 'Languages', 40, 80, 'Native or fluent', 'Review translations and write natural Hindi responses.', 'Native or near-native Hindi.', 'Linguistics', 'Hindi'),
      R('Amharic Language Expert', 'Languages', 40, 40, 'Native or fluent', 'Review translations and write natural Amharic responses.', 'Native or near-native Amharic.', 'Linguistics', 'Amharic'),
      R('Yoruba Language Expert', 'Languages', 40, 40, 'Native or fluent', 'Review translations and write natural Yoruba responses.', 'Native or near-native Yoruba.', 'Linguistics', 'Yoruba'),
      R('Hausa Language Expert', 'Languages', 40, 40, 'Native or fluent', 'Review translations and write natural Hausa responses.', 'Native or near-native Hausa.', 'Linguistics', 'Hausa'),
      R('Zulu Language Expert', 'Languages', 40, 40, 'Native or fluent', 'Review translations and write natural Zulu responses.', 'Native or near-native Zulu.', 'Linguistics', 'Zulu'),
      R('Political Scientist', 'Humanities', 80, 25, "Master's · PhD", 'Assess claims on government, policy and international relations.', 'Graduate political science training.', 'Political science'),
      R('Sociologist', 'Humanities', 75, 20, "Master's · PhD", 'Review reasoning on society, culture and survey evidence.', 'Graduate sociology training.', 'Sociology'),
      R('Journalist', 'Humanities', 60, 30, "Bachelor's · Master's", 'Fact-check news-style writing and judge sourcing.', 'Reporting or editing experience.', 'Journalism'),
      R('Architect', 'Humanities', 90, 20, 'BArch · MArch · Licensed', 'Check building design, codes and construction reasoning.', 'Architecture training or practice.', 'Architecture'),
      R('Graphic Designer', 'Humanities', 60, 30, "Bachelor's · Portfolio", 'Judge layout, typography and visual-design guidance.', 'A design portfolio.', 'Graphic design'),
      R('Music Theory Expert', 'Humanities', 55, 15, "Bachelor's · Master's · PhD", 'Verify harmony, analysis and music-history answers.', 'Formal music training.', 'Music')
    ],
    ROLE_AREAS: ['All', 'General', 'Engineering', 'Science', 'Medicine', 'Law', 'Finance', 'Business', 'Math', 'Languages', 'Humanities'],
    FEATURED: ['AI Evaluation Specialist', 'Software Engineer', 'Game Developer', 'Biology Reviewer', 'Energy Professional', 'Clinical Reviewer', 'Contract Law Analyst', 'FP&A Analyst', 'Math Problem Writer', 'Swahili Language Expert', 'Philosophy Expert'],
    MARQUEE: ['Software engineering', 'Data science', 'Chemistry', 'Biology', 'Physics', 'Medicine', 'Nursing', 'Law', 'Finance', 'Accounting', 'Economics', 'Mathematics', 'Statistics', 'Philosophy', 'History', 'Linguistics', 'Swahili', 'French', 'Architecture', 'Energy', 'Game design', 'Education'],

    FIELD_GROUPS: [
      ['Engineering & computing', ['Software engineering', 'Data science & ML', 'Cybersecurity', 'Electrical engineering', 'Mechanical engineering', 'Civil engineering', 'Chemical engineering', 'Aerospace engineering', 'Game design']],
      ['Sciences', ['Chemistry', 'Biology', 'Physics', 'Earth & environmental science', 'Agriculture', 'Energy']],
      ['Math', ['Mathematics', 'Statistics']],
      ['Health', ['Medicine', 'Nursing', 'Pharmacy', 'Public health', 'Psychology', 'Dentistry', 'Veterinary medicine', 'Nutrition', 'Physiotherapy']],
      ['Law, business & finance', ['Law', 'Finance', 'Accounting', 'Economics', 'Business & strategy', 'Marketing', 'Human resources', 'Supply chain & logistics', 'Real estate']],
      ['Humanities & arts', ['Philosophy', 'History', 'Political science', 'Sociology', 'Linguistics', 'Creative writing', 'Journalism', 'Education', 'Architecture', 'Graphic design', 'Music']],
      ['Other', ['Other']]
    ],
    SEC_FIELDS: ['Software engineering', 'Data science & ML', 'Cybersecurity', 'Chemistry', 'Biology', 'Physics', 'Mathematics', 'Statistics', 'Medicine', 'Nursing', 'Law', 'Finance', 'Accounting', 'Economics', 'Philosophy', 'History', 'Linguistics', 'Creative writing', 'Education', 'Energy'],
    LANGS: ['English', 'Swahili', 'French', 'Spanish', 'Arabic', 'Portuguese', 'German', 'Mandarin', 'Hindi', 'Amharic', 'Yoruba', 'Hausa', 'Zulu', 'Other'],
    TASK_TYPES: ['Ranking responses', 'Writing ideal answers', 'Fact-checking', 'Code review', 'Red-teaming', 'Translation review'],
    COUNTRIES: ['Kenya', 'United States', 'United Kingdom', 'Canada', 'Nigeria', 'South Africa', 'Ghana', 'Uganda', 'Tanzania', 'Rwanda', 'Ethiopia', 'India', 'Germany', 'France', 'Brazil', 'Philippines', 'Australia', 'Other'],
    EDU: ['Current undergraduate', "Associate's", "Bachelor's", 'Current graduate student', "Master's", 'Professional (MD, JD, PharmD…)', 'PhD', 'Postdoc'],
    YEARS: ['Still studying', 'Less than 2 years', '2–5 years', '5–10 years', '10+ years'],
    HOURS: ['Under 5 hours', '5–10 hours', '10–20 hours', '20+ hours'],
    TIMEZONES: ['UTC−8 Pacific', 'UTC−5 Eastern', 'UTC±0 London', 'UTC+1 West/Central Africa, Central Europe', 'UTC+2 South Africa, Eastern Europe', 'UTC+3 East Africa', 'UTC+5:30 India', 'UTC+8 Singapore, Manila', 'UTC+10 Sydney'],
    PAYOUTS: ['Bank transfer', 'PayPal', 'Payoneer', 'Mobile money'],

    QUIZ: [
      { text: 'A response cites a study you can’t find anywhere. What do you do?', opts: ['Rate it highly — it sounds authoritative', 'Flag the citation as unverifiable and lower its accuracy score', 'Skip the task'] },
      { text: 'Two responses are both correct, but one is padded with filler. Which do you prefer?', opts: ['The longer one — more detail is always better', 'Mark them equal and move on', 'The concise one, and say why in your justification'] },
      { text: 'What makes a strong written justification?', opts: ['Pointing to specific errors and strengths in each response', '“A is better.”', 'Restating the user’s prompt'] }
    ],
    MODULES: [
      { title: 'How rating works', mins: '3 min', body: 'You compare model responses against a rubric: accuracy first, then helpfulness, then clarity and safety. Score each response on its own before choosing a preferred one.' },
      { title: 'Writing strong justifications', mins: '4 min', body: 'Name the exact sentence that is wrong or excellent, say why, and say what the ideal answer would do instead. Reviewers should be able to verify your reasoning in under a minute.' },
      { title: 'Spotting hallucinations', mins: '4 min', body: 'Watch for invented citations, wrong numbers delivered confidently, and steps that skip logic. If you cannot verify a claim, say so — never guess.' },
      { title: 'Confidentiality & conduct', mins: '2 min', body: 'Project content never leaves the workspace. Do the work yourself, log only the time you actually worked, and report anything that looks harmful using the Flag button.' }
    ],
    GUIDES: [
      { kind: 'Project guide', title: 'Code review tasks', body: 'Run the code mentally or locally. A fix that compiles but changes behavior is still wrong — say so.' },
      { kind: 'Project guide', title: 'Fact-checking tasks', body: 'Check every factual claim against a reliable source. One false claim caps accuracy at 2.' },
      { kind: 'Project guide', title: 'Translation review tasks', body: 'Check meaning first (names, numbers, days, negation), then tone and grammar.' }
    ],
    HOME_FAQ: [
      { q: 'What is the Plumbline Fellowship?', a: 'A paid, remote program where people with real expertise review, correct and write examples that help AI models get better at their field.' },
      { q: 'Do I need AI experience?', a: 'No. We train you on each project. What we need is depth in your own subject — the AI part is our job.' },
      { q: 'What kind of work will I do?', a: 'Comparing model answers, spotting errors, writing ideal responses and explaining your reasoning, all inside a browser-based workspace.' },
      { q: 'Is this paid work?', a: 'Yes. Fellows are paid hourly, with rates that depend on the project and the expertise it requires. ' + PAY },
      { q: 'How much time do I need to commit?', a: 'There is no fixed schedule. Most projects let you work in short sessions whenever suits you.' },
      { q: 'Who can join?', a: ELIG }
    ],
    HELP_FAQ: [
      ['Getting started', 'What is the Plumbline Fellowship?', 'A paid, remote program where people with real expertise review, correct and write examples that help AI models improve in their field.'],
      ['Getting started', 'Do I need AI experience?', 'No. Every project includes training. We need depth in your own subject.'],
      ['Getting started', 'Who can apply?', ELIG],
      ['Getting started', 'How long does onboarding take?', 'About 30 minutes across eight steps. Your progress is saved to your account, so you can stop and continue on any device.'],
      ['Account', 'I didn’t get the confirmation email.', 'Check spam and promotions folders, then use “Email me a sign-in link” on the log-in page. Still nothing? Send us a message below.'],
      ['Account', 'I forgot my password.', 'On the log-in page, enter your email and choose “Forgot password?”. We’ll email you a link to set a new one.'],
      ['Verification', 'Why do you verify my identity?', 'It keeps accounts real and protects the confidential projects fellows work on. You upload one ID photo and one selfie, stored privately.'],
      ['Verification', 'How long does verification take?', 'Our team reviews documents in the order they arrive. You can finish onboarding while you wait. Once you are verified, we invite you to a project, and its tasks open when you join.'],
      ['Tasks', 'What does a typical task look like?', 'You read a prompt, rate two model responses, choose the better one and explain why. Some projects ask you to write an ideal answer instead.'],
      ['Tasks', 'Can I use AI tools to help with tasks?', 'Not unless a project says so explicitly. Your own judgment is what we pay for.'],
      ['Payments', 'How and when am I paid?', 'You are paid hourly for approved working time through the payout method you choose. ' + PAY],
      ['Payments', 'Which payout methods do you support?', 'Bank transfer, PayPal, Payoneer and mobile money, depending on your country.'],
      ['Account', 'How do I delete my account?', 'Send us a message with the topic “Account”. We delete your data within 30 days and confirm by email.']
    ],
    LAB_AREAS: {
      'Engineering': ['Python', 'Rust', 'TypeScript', 'Android / Kotlin', 'Systems & OS', 'Cybersecurity', 'PCB & electronics', 'Game engines'],
      'Sciences': ['Organic chemistry', 'Molecular biology', 'Physics', 'Earth science', 'Energy systems'],
      'Math': ['Proof writing', 'Competition math', 'Statistics', 'Probability'],
      'Health': ['Clinical medicine', 'Nursing', 'Pharmacology', 'Public health'],
      'Law & finance': ['Contract law', 'Corporate finance', 'Accounting (IFRS/GAAP)', 'Economics'],
      'Languages': ['Swahili', 'French', 'Arabic', 'Spanish', 'Portuguese', 'Amharic', 'Yoruba', 'Hindi'],
      'Humanities': ['Philosophy', 'History', 'Creative writing', 'Education']
    },
    LEGAL: [
      { key: 'terms', title: 'Terms of service', sections: [
        ['1. Who we are', 'Plumbline (“we”, “us”) runs a platform that connects domain experts with AI training and evaluation projects. By creating an account you agree to these terms.'],
        ['2. Using Plumbline', 'You must provide accurate information, keep your account secure and use the platform only for legitimate project work.'],
        ['3. No fees', 'Plumbline does not charge you to apply, verify your identity or receive work.'],
        ['4. Bans', 'We may ban an account for low quality work, breaking project rules, fraud or a false identity. We tell you the reason, and your tasks and invitations stop while the ban is in place. You can appeal from your workspace, and we reply with our decision. Work we approved before a ban is still paid.'],
        ['5. Closing your account', 'You can close your account at any time by sending us a message. Work we approved before you leave is still paid.'],
        ['6. Liability', 'The platform is provided as is. To the extent the law allows, we are not liable for indirect or consequential losses, and our total liability is limited to the fees paid to you in the three months before a claim.']
      ] },
      { key: 'privacy', title: 'Privacy policy', sections: [
        ['What we collect', 'Account details, your expertise and availability, identity verification images, project applications, task submissions, reported working time, payout records, ban and appeal records, and who invited you if you joined through an invite link.'],
        ['Why we collect it', 'To verify you, match you to projects, pay you and keep project data secure.'],
        ['Who we share it with', 'Only the identity-verification, payment and hosting providers that process data on our behalf, and only what they need to do that job. We never sell your data.'],
        ['Your choices', 'You can view, correct or delete your data at any time from the help center. Our team deletes verification images after reviewing them, and we delete account data within 30 days of a deletion request, except records we must keep by law.']
      ] },
      { key: 'agreement', title: 'Fellow agreement', sections: [
        ['Independent contractor', 'Fellows work as independent contractors and choose their own hours.'],
        ['Confidentiality', 'Project materials, prompts and model outputs stay inside the workspace and are not shared, copied or discussed elsewhere.'],
        ['Your own work', 'Tasks are completed by you personally, without AI assistance unless a project explicitly allows it.'],
        ['Payment', 'Approved working time is paid at the rate shown on each project. ' + PAY + ' Your pay is based on the minutes we approve at the task\'s hourly rate. If you disagree with a rejected task, contact us through the help center within 14 days and a second reviewer will look at it.'],
        ['Quality and bans', 'Your work is reviewed against each project\'s rules, and we tell you why work is rejected. Repeated low quality work can lead to a ban, which you can appeal from your workspace.'],
        ['Referrals', 'You can share invite links with new tutors. We record who joined through your link. Referrals are not paid unless we say so in writing.']
      ] }
    ]
  };
})();
