// Plumbline — full job descriptions for job.html.
// A role's title, pay, people needed and short summary live in data.js.
// This file adds the longer text: one block per field, plus the skills for each role.
// A new role works without a SKILLS entry: it falls back to its field's skills.
(function () {
  const AREAS = {
    General: {
      intro: 'AI assistants answer everyday questions for millions of people, and they need careful human readers to tell a good answer from a weak one.',
      tasks: ['Compare two AI answers to the same question and choose the better one.', 'Score each answer against a written rubric for accuracy, helpfulness and tone.', 'Explain your choice in a few clear sentences that a reviewer can verify.'],
      bonus: ['Experience in editing, tutoring, research or customer support.', 'Comfort checking facts against reliable sources.'],
      skills: ['Critical reading', 'Fact-checking', 'Clear writing', 'Attention to detail', 'Following a rubric']
    },
    Engineering: {
      intro: 'People increasingly rely on AI to write and explain technical work. You will decide whether that work is actually correct, safe and fit for real use.',
      tasks: ['Find technical errors in AI answers and explain why they are wrong.', 'Write or correct solutions that show what an expert answer looks like.', 'Create hard, realistic problems that expose gaps in what the model knows.'],
      bonus: ['Professional experience in the field, or a portfolio of real projects.', 'Experience mentoring others or reviewing their work.'],
      skills: ['Technical review', 'Problem solving', 'Debugging', 'Technical writing', 'Applying standards']
    },
    Science: {
      intro: 'AI models often sound confident about science even when they are wrong. You will bring the training needed to catch those mistakes and show the correct reasoning.',
      tasks: ['Check scientific claims, calculations and units against reliable sources.', 'Write step-by-step solutions to difficult problems in your field.', 'Flag invented citations, outdated findings and misleading explanations.'],
      bonus: ['Published research, lab experience or fieldwork.', 'Experience teaching or tutoring your subject.'],
      skills: ['Scientific reasoning', 'Reading research papers', 'Quantitative analysis', 'Fact-checking', 'Scientific writing']
    },
    Medicine: {
      intro: 'People ask AI about their health every day, so errors can cause real harm. You will use your clinical training to make those answers accurate and safely framed.',
      tasks: ['Check health information for accuracy against current clinical guidance.', 'Flag answers that are unsafe, overconfident or should send someone to a professional.', 'Write model answers that are correct, clear and appropriately cautious.'],
      bonus: ['Current clinical practice or a specialist qualification.', 'Experience in patient education or medical writing.'],
      skills: ['Clinical judgment', 'Evidence-based practice', 'Patient safety', 'Medical terminology', 'Plain-language writing']
    },
    Law: {
      intro: 'AI is being used to summarize and draft legal material, and small errors can change the meaning. You will test whether its legal reasoning holds up.',
      tasks: ['Review legal analysis for sound reasoning and accurate statements of law.', 'Check that cited cases, statutes and rules exist and say what is claimed.', 'Note where an answer depends on jurisdiction or needs a qualified lawyer.'],
      bonus: ['Time in legal practice, a clerkship or a law review.', 'Experience across more than one jurisdiction.'],
      skills: ['Legal research', 'Legal reasoning', 'Citation checking', 'Legal drafting', 'Issue spotting']
    },
    Finance: {
      intro: 'Finance answers have to be numerically right as well as logically sound. You will check the calculations and judgment behind what AI models produce.',
      tasks: ['Recalculate figures and check the assumptions behind them.', 'Correct errors in models, statements and financial explanations.', 'Write worked examples that show how a professional would reach the answer.'],
      bonus: ['A professional qualification such as CFA, CPA or ACCA.', 'Experience in a bank, audit firm or corporate finance team.'],
      skills: ['Financial analysis', 'Excel modeling', 'Financial statements', 'Quantitative reasoning', 'Accuracy checking']
    },
    Business: {
      intro: 'Teams use AI for plans, analysis and advice. You will judge whether its recommendations would actually work in a real organization.',
      tasks: ['Assess business advice for realism, evidence and sound reasoning.', 'Point out assumptions that would not hold up in practice.', 'Write better answers based on how the work is really done.'],
      bonus: ['Experience leading a team, project or function.', 'Work across more than one industry or market.'],
      skills: ['Business analysis', 'Strategic thinking', 'Data interpretation', 'Stakeholder communication', 'Clear writing']
    },
    Math: {
      intro: 'A mathematical answer is only right if every step is. You will work through AI reasoning line by line and write problems that genuinely challenge it.',
      tasks: ['Check proofs and calculations step by step to find the first error.', 'Write original hard problems with complete, verified solutions.', 'Explain clearly where and why a line of reasoning fails.'],
      bonus: ['Competition mathematics or research experience.', 'Experience teaching at university level.'],
      skills: ['Proof writing', 'Problem solving', 'Probability', 'Mathematical notation', 'Step-by-step verification']
    },
    Languages: {
      intro: 'AI models are much weaker in many languages than in English. As a native or fluent speaker, you will help them sound natural and keep the meaning accurate.',
      tasks: ['Compare translations with the original, checking names, numbers, dates and negation.', 'Rate fluency, grammar and whether the tone suits the situation.', 'Rewrite stiff or wrong answers the way a native speaker would say them.'],
      bonus: ['Translation, interpreting, teaching or editorial experience.', 'Knowledge of regional dialects and how the language is used online.'],
      skills: ['Translation review', 'Grammar', 'Cultural context', 'Natural writing', 'English comprehension']
    },
    Humanities: {
      intro: 'Good judgment matters most where answers are not simply right or wrong. You will assess how well AI argues, uses sources and writes in your field.',
      tasks: ['Evaluate arguments, evidence and interpretation in AI answers.', 'Check factual claims and confirm that quoted sources are real.', 'Write stronger answers that show the depth an expert expects.'],
      bonus: ['Published writing, research or professional practice.', 'Experience teaching or editing the work of others.'],
      skills: ['Critical analysis', 'Source evaluation', 'Argument writing', 'Research', 'Editing']
    }
  };

  const SKILLS = {
    'AI Evaluation Specialist': ['Critical reading', 'Fact-checking', 'Clear writing', 'Attention to detail', 'Following a rubric'],
    'Software Engineer': ['Python', 'TypeScript', 'Go', 'Rust', 'Code review', 'Algorithms', 'System design'],
    'Rust Systems Reviewer': ['Ownership & lifetimes', 'Async Rust', 'Unsafe Rust', 'Concurrency', 'Systems programming'],
    'Android Developer': ['Kotlin', 'Jetpack Compose', 'Android SDK', 'Coroutines', 'App architecture'],
    'Data Scientist': ['Python', 'SQL', 'Statistics', 'Machine learning', 'Data visualization', 'Experiment design'],
    'Cybersecurity Analyst': ['Threat modeling', 'Network security', 'Secure configuration', 'Incident response', 'Application security'],
    'Game Developer': ['Unity', 'Unreal Engine', 'Godot', 'C#', 'C++', 'Game design'],
    'PCB Tool Specialist': ['Schematic capture', 'PCB layout', 'KiCad', 'Altium Designer', 'Signal integrity'],
    'Biology Reviewer': ['Molecular biology', 'Cell biology', 'Genetics', 'Ecology', 'Lab methods'],
    'Chemistry Expert': ['Organic chemistry', 'Inorganic chemistry', 'Physical chemistry', 'Analytical chemistry', 'Lab safety'],
    'Physics Expert': ['Classical mechanics', 'Electromagnetism', 'Quantum mechanics', 'Thermodynamics', 'Mathematical derivations'],
    'Energy Professional': ['Power systems', 'Renewable energy', 'Energy markets', 'Oil & gas', 'Energy policy'],
    'Clinical Reviewer': ['Internal medicine', 'Pediatrics', 'Emergency medicine', 'Pharmacology', 'Diagnosis'],
    'Nursing Specialist': ['Patient assessment', 'Medication safety', 'Critical care', 'Community nursing', 'Care planning'],
    'Public Health Analyst': ['Epidemiology', 'Biostatistics', 'Health policy', 'Global health', 'Program evaluation'],
    'Contract Law Analyst': ['Contract drafting', 'Clause analysis', 'Commercial law', 'Risk review', 'Legal research'],
    'FP&A Analyst': ['Budgeting', 'Forecasting', 'Financial modeling', 'Variance analysis', 'Excel'],
    'Accountant': ['IFRS', 'US GAAP', 'Bookkeeping', 'Financial reporting', 'Tax basics'],
    'Economist': ['Macroeconomics', 'Microeconomics', 'Econometrics', 'Development economics', 'Policy analysis'],
    'Math Problem Writer': ['Algebra', 'Calculus', 'Number theory', 'Geometry', 'Proof writing'],
    'Statistician': ['Statistical inference', 'Experiment design', 'Regression', 'Bayesian methods', 'R'],
    'Swahili Language Expert': ['Swahili writing', 'English to Swahili translation', 'Grammar', 'Regional usage', 'Cultural context'],
    'French Language Expert': ['French writing', 'English to French translation', 'Grammar', 'Regional usage', 'Cultural context'],
    'Arabic Language Expert': ['Modern Standard Arabic', 'Arabic dialects', 'English to Arabic translation', 'Grammar', 'Cultural context'],
    'Philosophy Expert': ['Ethics', 'Logic', 'Epistemology', 'History of philosophy', 'Argument analysis'],
    'Historian': ['Source analysis', 'World history', 'African history', 'Historiography', 'Fact-checking'],
    'Creative Writing Reviewer': ['Fiction', 'Poetry', 'Screenwriting', 'Editing', 'Voice & style'],
    'Education Specialist': ['Curriculum design', 'Lesson planning', 'Assessment', 'Learning science', 'Primary & secondary teaching'],
    'Frontend Developer': ['React', 'TypeScript', 'CSS', 'Accessibility', 'Web performance'],
    'Backend Developer': ['API design', 'Node.js', 'Python', 'Java', 'SQL databases', 'Caching'],
    'DevOps & Cloud Engineer': ['AWS', 'Azure', 'Kubernetes', 'Docker', 'CI/CD', 'Terraform'],
    'Machine Learning Engineer': ['PyTorch', 'Model training', 'Model evaluation', 'MLOps', 'LLMs'],
    'Database Administrator': ['PostgreSQL', 'MySQL', 'Query tuning', 'Backup & recovery', 'Schema design'],
    'QA Test Engineer': ['Test planning', 'Test automation', 'Playwright', 'API testing', 'Bug reporting'],
    'Mechanical Engineer': ['Mechanics', 'Thermodynamics', 'Fluid mechanics', 'Machine design', 'CAD'],
    'Civil Engineer': ['Structural analysis', 'Geotechnical engineering', 'Construction management', 'Transportation', 'Building codes'],
    'Electrical Engineer': ['Circuit analysis', 'Power systems', 'Control systems', 'Signal processing', 'Embedded systems'],
    'Chemical Engineer': ['Process design', 'Reactor design', 'Mass & energy balances', 'Separation processes', 'Process safety'],
    'Aerospace Engineer': ['Aerodynamics', 'Propulsion', 'Flight mechanics', 'Aerospace structures', 'Orbital mechanics'],
    'Environmental Scientist': ['Climate science', 'Ecology', 'Pollution control', 'Environmental impact', 'GIS'],
    'Geologist': ['Mineralogy', 'Structural geology', 'Hydrogeology', 'Field mapping', 'Resource geology'],
    'Agricultural Scientist': ['Crop science', 'Soil science', 'Livestock', 'Pest management', 'Irrigation'],
    'Pharmacist': ['Pharmacology', 'Dosing', 'Drug interactions', 'Clinical pharmacy', 'Medication counseling'],
    'Psychologist': ['Clinical psychology', 'Cognitive behavioral therapy', 'Psychological assessment', 'Developmental psychology', 'Crisis-safe communication'],
    'Dentist': ['General dentistry', 'Oral surgery', 'Orthodontics', 'Periodontics', 'Preventive care'],
    'Veterinarian': ['Small animal medicine', 'Large animal medicine', 'Animal surgery', 'Veterinary pharmacology', 'Zoonotic disease'],
    'Nutritionist & Dietitian': ['Clinical nutrition', 'Sports nutrition', 'Meal planning', 'Diabetes nutrition', 'Public health nutrition'],
    'Physiotherapist': ['Musculoskeletal rehabilitation', 'Sports injuries', 'Neurological rehabilitation', 'Exercise prescription', 'Patient assessment'],
    'Criminal Law Analyst': ['Criminal procedure', 'Evidence', 'Sentencing', 'Constitutional rights', 'Legal research'],
    'Intellectual Property Specialist': ['Patents', 'Trademarks', 'Copyright', 'Licensing', 'IP litigation'],
    'Paralegal': ['Legal research', 'Document drafting', 'Case management', 'Citation checking', 'Court filing'],
    'Investment Banking Analyst': ['Valuation', 'DCF modeling', 'M&A', 'LBO modeling', 'Pitch materials'],
    'Tax Specialist': ['Corporate tax', 'Personal tax', 'VAT & sales tax', 'International tax', 'Tax planning'],
    'Financial Auditor': ['External audit', 'Internal audit', 'Internal controls', 'Risk assessment', 'IFRS'],
    'Actuary': ['Life insurance', 'General insurance', 'Pensions', 'Risk modeling', 'Probability'],
    'Marketing Strategist': ['Brand strategy', 'Digital marketing', 'Market research', 'SEO', 'Campaign analysis'],
    'Management Consultant': ['Market sizing', 'Business cases', 'Competitive analysis', 'Operating models', 'Strategy'],
    'Project Manager': ['Project planning', 'Agile & Scrum', 'Risk management', 'Budget tracking', 'Stakeholder management'],
    'Human Resources Specialist': ['Recruitment', 'Employee relations', 'Employment law basics', 'Performance management', 'HR policy'],
    'Supply Chain Analyst': ['Logistics', 'Procurement', 'Inventory management', 'Demand planning', 'Supplier management'],
    'Real Estate Analyst': ['Property valuation', 'Leasing', 'Market analysis', 'Real estate finance', 'Property law basics'],
    'Spanish Language Expert': ['Spanish writing', 'English to Spanish translation', 'Grammar', 'Regional usage', 'Cultural context'],
    'Portuguese Language Expert': ['Portuguese writing', 'English to Portuguese translation', 'Grammar', 'Regional usage', 'Cultural context'],
    'German Language Expert': ['German writing', 'English to German translation', 'Grammar', 'Formal & informal register', 'Cultural context'],
    'Mandarin Language Expert': ['Mandarin writing', 'English to Mandarin translation', 'Simplified Chinese', 'Traditional Chinese', 'Cultural context'],
    'Hindi Language Expert': ['Hindi writing', 'English to Hindi translation', 'Grammar', 'Devanagari typing', 'Cultural context'],
    'Amharic Language Expert': ['Amharic writing', 'English to Amharic translation', 'Grammar', 'Ge\'ez script typing', 'Cultural context'],
    'Yoruba Language Expert': ['Yoruba writing', 'English to Yoruba translation', 'Grammar', 'Tone marking', 'Cultural context'],
    'Hausa Language Expert': ['Hausa writing', 'English to Hausa translation', 'Grammar', 'Regional usage', 'Cultural context'],
    'Zulu Language Expert': ['Zulu writing', 'English to Zulu translation', 'Grammar', 'Regional usage', 'Cultural context'],
    'Political Scientist': ['Comparative politics', 'International relations', 'Public policy', 'Political theory', 'Survey analysis'],
    'Sociologist': ['Social theory', 'Qualitative research', 'Survey methods', 'Demography', 'Inequality studies'],
    'Journalist': ['Reporting', 'Fact-checking', 'Editing', 'Source verification', 'Headline writing'],
    'Architect': ['Building design', 'Building codes', 'Construction documents', 'Sustainable design', 'BIM & CAD'],
    'Graphic Designer': ['Typography', 'Layout', 'Branding', 'Color theory', 'Adobe & Figma'],
    'Music Theory Expert': ['Harmony', 'Counterpoint', 'Music analysis', 'Music history', 'Ear training']
  };

  window.PL_JOBS = {
    AREAS, SKILLS,
    build(r) {
      const a = AREAS[r.field] || AREAS.General;
      return {
        intro: a.intro,
        tasks: [r.work].concat(a.tasks),
        needs: [r.need, 'Education or qualification: ' + r.levels + '.', 'Clear written English, so reviewers can follow your reasoning.', 'A computer and a reliable internet connection.'],
        bonus: a.bonus,
        skills: SKILLS[r.title] || a.skills
      };
    }
  };
})();
