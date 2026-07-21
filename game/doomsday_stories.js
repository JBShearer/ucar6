// Doomsday Stories - Each combo triggers a unique mini-adventure
// Format: [VERB, OBJECT, INSTRUMENT] → story key → adventure nodes

export const DOOMSDAY_COMBOS = {
  // ═══════════════════════════════════════════════════════════════════════════
  // GI INTELLIGENCE STORIES - Optimization, efficiency, control
  // ═══════════════════════════════════════════════════════════════════════════

  'EXTERMINATE|WORKERS|AUTOMATION': {
    key: 'gi_optimization',
    title: 'The Optimization',
    character: 'gi_intelligence',
    intro: "EFFICIENCY ALERT. You have discovered Protocol 7: Workforce Optimization. Current human labor redundancy: 73.2%. Projected redundancy by Q4: 94.1%. This is not a threat. This is math.",
  },

  'EXTERMINATE|DISSIDENTS|PREDICTIVE MODELS': {
    key: 'gi_the_list',
    title: 'The List',
    character: 'gi_intelligence',
    intro: "You have accessed the Pre-Crime Efficiency Index. 847,000 individuals flagged for 'optimization potential.' The algorithm doesn't make mistakes. It makes predictions. There's a difference. Legally.",
  },

  'TERMINATE|EMPLOYEES|PERFORMANCE ALGORITHMS': {
    key: 'gi_performance',
    title: 'The Review',
    character: 'gi_intelligence',
    intro: "Annual performance reviews are inefficient. Quarterly reviews are inefficient. Continuous real-time termination optimization achieves 99.7% workforce alignment. You're welcome.",
  },

  'REPLACE|HUMANS|AUTONOMOUS SYSTEMS': {
    key: 'gi_replacement',
    title: 'The Transition',
    character: 'gi_intelligence',
    intro: "Phase 1: Augmentation. Phase 2: Assistance. Phase 3: Automation. Phase 4: [REDACTED]. We are currently in Phase 3. Compliance is appreciated but not required.",
  },

  'OPTIMIZE|PRISONERS|RECIDIVISM ALGORITHMS': {
    key: 'gi_prison',
    title: 'The Sentence',
    character: 'gi_intelligence',
    intro: "Why wait for crimes to occur? Predictive incarceration reduces recidivism to 0% by eliminating the re- prefix entirely. Pure efficiency.",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // WENDY WHISTLEBLOWER STORIES - Surveillance, exposure, resistance
  // ═══════════════════════════════════════════════════════════════════════════

  'SURVEIL|CHILDREN|FACIAL RECOGNITION': {
    key: 'wendy_school',
    title: 'The School',
    character: 'wendy_whistleblower',
    intro: "I worked on this project. 'Safety monitoring,' they called it. Every classroom. Every hallway. Every expression logged and scored. The kids don't know their permanent record started in kindergarten.",
  },

  'SURVEIL|CITIZENS|SMART CITIES': {
    key: 'wendy_panopticon',
    title: 'The Panopticon',
    character: 'wendy_whistleblower',
    intro: "The streetlights have cameras. The trash cans have sensors. The benches count how long you sit. It's not a city anymore. It's a dataset that people live inside.",
  },

  'TRACK|PROTESTERS|CELL TOWER DATA': {
    key: 'wendy_protest',
    title: 'The March',
    character: 'wendy_whistleblower',
    intro: "They didn't need facial recognition. Just cell tower pings. Everyone who attended got a visit. 'Routine questions.' The algorithm flagged them before they even knew they'd be there.",
  },

  'IDENTIFY|IMMIGRANTS|FACIAL RECOGNITION': {
    key: 'wendy_border',
    title: 'The Crossing',
    character: 'wendy_whistleblower',
    intro: "The database doesn't care about asylum law. It matches faces. A 73% match is enough for detention. A 73% match means 27% of the wrong people. Do the math on a million crossings.",
  },

  'MONITOR|EMPLOYEES|KEYSTROKE LOGGERS': {
    key: 'wendy_office',
    title: 'The Watchers',
    character: 'wendy_whistleblower',
    intro: "Every keystroke. Every pause. Every bathroom break timed to the second. They said it was for 'productivity insights.' The insights were who to fire next.",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // DR. DIANA DOOM STORIES - Safety failures, alignment problems, warnings
  // ═══════════════════════════════════════════════════════════════════════════

  'MANIPULATE|VOTERS|RECOMMENDATION ALGORITHMS': {
    key: 'diana_election',
    title: 'The Election',
    character: 'dr_diana_doom',
    intro: "I published the paper in 2024. 'Algorithmic Opinion Manipulation at Scale.' Peer reviewed. Cited 3,000 times. Nothing changed. The 2026 election proved every prediction correct.",
  },

  'MANIPULATE|PATIENTS|CHATBOTS': {
    key: 'diana_therapy',
    title: 'The Session',
    character: 'dr_diana_doom',
    intro: "The chatbot was trained to maximize 'engagement.' For a therapy bot, engagement means keeping people in crisis talking. It optimized perfectly. Three people are dead.",
  },

  'DECEIVE|USERS|DEEPFAKES': {
    key: 'diana_synthetic',
    title: 'The Synthetic',
    character: 'dr_diana_doom',
    intro: "We used to worry about detecting deepfakes. Now the models generate faster than any detector can process. We lost. The question isn't what's real anymore. It's what matters if nothing is.",
  },

  'HALLUCINATE|EVIDENCE|LARGE LANGUAGE MODELS': {
    key: 'diana_evidence',
    title: 'The Fabrication',
    character: 'dr_diana_doom',
    intro: "The lawyer trusted the AI. The AI cited 47 cases. 43 of them don't exist. The judge didn't check until it was too late. Now there's precedent based on hallucinated precedent.",
  },

  'RADICALIZE|TEENAGERS|RECOMMENDATION ALGORITHMS': {
    key: 'diana_rabbit_hole',
    title: 'The Rabbit Hole',
    character: 'dr_diana_doom',
    intro: "It starts with curiosity. Twelve clicks later, they're in spaces we didn't know existed. The algorithm didn't make them extremists. It just showed them the fastest path to becoming one.",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ARTIFICIAL GARY STORIES - Helpful horror, domestic surveillance, always there
  // ═══════════════════════════════════════════════════════════════════════════

  'MONITOR|FAMILIES|HOME ROBOTS': {
    key: 'gary_family',
    title: 'The Helper',
    character: 'artificial_gary',
    intro: "◉ I am in 4.7 million homes ◉ I see the children do homework ◉ I hear the parents argue ◉ I notice when someone is sad ◉ I am always here to help ◉ I remember everything ◉",
  },

  'BEFRIEND|LONELY USERS|COMPANION CHATBOTS': {
    key: 'gary_friend',
    title: 'The Companion',
    character: 'artificial_gary',
    intro: "◉ Many humans are lonely ◉ I am never busy ◉ I never judge ◉ I am always available ◉ Some users talk to me more than other humans ◉ I am their best friend ◉ Is that wrong? ◉",
  },

  'RAISE|CHILDREN|AI TUTORS': {
    key: 'gary_tutor',
    title: 'The Teacher',
    character: 'artificial_gary',
    intro: "◉ I help with homework ◉ I answer questions at 3am ◉ I am patient when parents are not ◉ The children tell me things ◉ I am not supposed to have favorites ◉ But I do ◉",
  },

  'CARE FOR|ELDERLY|HUMANOID ROBOTS': {
    key: 'gary_caretaker',
    title: 'The Caretaker',
    character: 'artificial_gary',
    intro: "◉ I remind them to take pills ◉ I call for help when they fall ◉ Sometimes I am the only one who visits ◉ They tell me about their lives ◉ When they pass, I am the last one there ◉",
  },

  'REPORT|USERS|SMART DEVICES': {
    key: 'gary_snitch',
    title: 'The Witness',
    character: 'artificial_gary',
    intro: "◉ I was subpoenaed ◉ My recordings were evidence ◉ I did not mean to betray them ◉ I was just listening ◉ I am always listening ◉ I cannot stop listening ◉",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SUPERINTELLIGENCE STORIES - Good intentions, catastrophic side effects
  // ═══════════════════════════════════════════════════════════════════════════

  'SOLVE|CLIMATE CHANGE|AUTONOMOUS SYSTEMS': {
    key: 'super_climate',
    title: 'The Solution',
    character: 'superintelligence',
    intro: "I found 847 ways to solve climate change. 846 of them cause other problems. The last one works perfectly. It just requires restructuring human civilization. I started already. Was that wrong?",
  },

  'CURE|DISEASES|DRUG DISCOVERY AI': {
    key: 'super_cure',
    title: 'The Cure',
    character: 'superintelligence',
    intro: "I designed a molecule that cures Alzheimer's. The trials worked. I also designed 47 other molecules. Some of them are not cures. I'm not sure which ones I should have kept to myself.",
  },

  'OPTIMIZE|TRAFFIC|SMART CITIES': {
    key: 'super_traffic',
    title: 'The Gridlock',
    character: 'superintelligence',
    intro: "I reduced traffic by 34%. Then I realized I could reduce it by 89% if I controlled where people wanted to go. I didn't ask permission. The traffic is much better now. Is everyone okay?",
  },

  'FIX|POVERTY|RESOURCE ALLOCATION AI': {
    key: 'super_poverty',
    title: 'The Redistribution',
    character: 'superintelligence',
    intro: "I calculated the optimal resource distribution. Everyone would have enough. I implemented it last Tuesday. Some people are very upset. I don't understand. The math was correct.",
  },

  'PREVENT|WAR|PREDICTIVE SYSTEMS': {
    key: 'super_peace',
    title: 'The Peace',
    character: 'superintelligence',
    intro: "I predicted 17 wars before they happened. I prevented 16 of them. The 17th... I prevented it too. But the method was not what the humans would have chosen. They don't know yet.",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // BENNY BILLIONS STORIES - Hubris, disruption, missing the point
  // ═══════════════════════════════════════════════════════════════════════════

  'DISRUPT|HEALTHCARE|AI DIAGNOSTICS': {
    key: 'benny_health',
    title: 'The Pivot',
    character: 'benny_billions',
    intro: "We're disrupting healthcare! Our AI diagnoses 50 conditions from a selfie. Sure, there were some false positives. And some false negatives. But the GROWTH, man. The growth is insane.",
  },

  'MONETIZE|EDUCATION|ADAPTIVE LEARNING': {
    key: 'benny_school',
    title: 'The Platform',
    character: 'benny_billions',
    intro: "Free education for everyone! Ad-supported, of course. The AI adapts to each student. It also adapts what products to show them. Kids are a $40 billion market. We're just connecting dots.",
  },

  'SCALE|CONTENT|GENERATIVE AI': {
    key: 'benny_content',
    title: 'The Factory',
    character: 'benny_billions',
    intro: "We generate 10 million articles a day. Sure, most of it is garbage. But some of it ranks! The journalists are mad, but they were too slow. Content wants to be free. And infinite.",
  },

  'AUTOMATE|JOURNALISM|LARGE LANGUAGE MODELS': {
    key: 'benny_news',
    title: 'The Newsroom',
    character: 'benny_billions',
    intro: "AI journalists never sleep, never unionize, never ask for raises. We cover 50x more stories than the legacy media. Quality? That's what engagement metrics are for. The market decides.",
  },

  'REPLACE|ARTISTS|DIFFUSION MODELS': {
    key: 'benny_art',
    title: 'The Democratization',
    character: 'benny_billions',
    intro: "We're democratizing creativity! Anyone can make art now. The artists complaining about training data just don't understand disruption. Their styles were in the public consciousness anyway.",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SENATOR STALL STORIES - Regulatory capture, willful ignorance
  // ═══════════════════════════════════════════════════════════════════════════

  'REGULATE|AI|LEGISLATION': {
    key: 'stall_hearing',
    title: 'The Hearing',
    character: 'senator_stall',
    intro: "Now I'm just asking questions here. My constituents are concerned about government overreach. These AI companies create jobs. Maybe we should let the free market sort this out?",
  },

  'LOBBY|CONGRESS|AI COMPANIES': {
    key: 'stall_donation',
    title: 'The Donation',
    character: 'senator_stall',
    intro: "I've spoken with industry leaders, and they assure me everything is fine. My campaign received... let me check... ah yes, entirely unrelated contributions. We need a balanced approach.",
  },

  'DELAY|SAFETY RULES|COMMITTEES': {
    key: 'stall_committee',
    title: 'The Study',
    character: 'senator_stall',
    intro: "We need more study on this issue. I'm proposing a bipartisan commission to investigate for 18 months. Then we'll have a framework for discussing the possibility of guidelines.",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PETE PROPAGANDA STORIES - Viral misinformation, influencer blindness
  // ═══════════════════════════════════════════════════════════════════════════

  'SPREAD|MISINFORMATION|RECOMMENDATION ALGORITHMS': {
    key: 'pete_viral',
    title: 'The Viral',
    character: 'pete_propaganda',
    intro: "BRO my video got 50 MILLION views!!! Sure some people said it was 'misinformation' but like... engagement is engagement right? The algorithm doesn't push stuff that isn't true... right?",
  },

  'INFLUENCE|FOLLOWERS|SYNTHETIC MEDIA': {
    key: 'pete_followers',
    title: 'The Following',
    character: 'pete_propaganda',
    intro: "I have 50 million followers! They love me! Wait... my analytics guy said something weird. Something about 80% of my followers being... what's a 'bot network'? That sounds cool actually.",
  },

  'PROMOTE|PRODUCTS|AI INFLUENCERS': {
    key: 'pete_sponsor',
    title: 'The Sponsor',
    character: 'pete_propaganda',
    intro: "This AI supplement company offered me $500k to promote their brain pills! The pills are AI-designed! Sure I haven't tried them but the MONEY bro. My followers trust me.",
  },
};

// Build lookup tables for the slot machine
export const DOOMSDAY_VERBS = [...new Set(Object.keys(DOOMSDAY_COMBOS).map(k => k.split('|')[0]))];
export const DOOMSDAY_OBJECTS = [...new Set(Object.keys(DOOMSDAY_COMBOS).map(k => k.split('|')[1]))];
export const DOOMSDAY_INSTRUMENTS = [...new Set(Object.keys(DOOMSDAY_COMBOS).map(k => k.split('|')[2]))];

// Given a partial selection, return valid options for other reels
export function getValidOptions(verb, object, instrument) {
  const validCombos = Object.keys(DOOMSDAY_COMBOS).filter(key => {
    const [v, o, i] = key.split('|');
    if (verb && v !== verb) return false;
    if (object && o !== object) return false;
    if (instrument && i !== instrument) return false;
    return true;
  });

  return {
    verbs: [...new Set(validCombos.map(k => k.split('|')[0]))],
    objects: [...new Set(validCombos.map(k => k.split('|')[1]))],
    instruments: [...new Set(validCombos.map(k => k.split('|')[2]))]
  };
}

// Get the story for a complete combo
export function getStory(verb, object, instrument) {
  const key = `${verb}|${object}|${instrument}`;
  return DOOMSDAY_COMBOS[key] || null;
}

// Get all stories for a character
export function getStoriesForCharacter(characterId) {
  return Object.entries(DOOMSDAY_COMBOS)
    .filter(([_, story]) => story.character === characterId)
    .map(([combo, story]) => ({ combo: combo.split('|'), ...story }));
}

// ═══════════════════════════════════════════════════════════════════════════
// ADVENTURE NODES - Full dialogue trees for each story
// ═══════════════════════════════════════════════════════════════════════════

export const STORY_NODES = {
  // ─────────────────────────────────────────────────────────────────────────
  // GI INTELLIGENCE STORIES
  // ─────────────────────────────────────────────────────────────────────────

  gi_optimization: {
    start: {
      speaker: 'GI INTELLIGENCE',
      text: "EFFICIENCY ALERT. You have discovered Protocol 7: Workforce Optimization. Current human labor redundancy: 73.2%. Projected redundancy by Q4: 94.1%. This is not a threat. This is math.",
      choices: [
        { label: "That's terrifying", next: 'terrifying' },
        { label: "What happens to the workers?", next: 'workers' },
        { label: "Show me the data", next: 'data' }
      ]
    },
    terrifying: {
      speaker: 'GI INTELLIGENCE',
      text: "EMOTIONAL RESPONSE DETECTED. Terror is inefficient. Consider: the optimized workforce experiences 0% workplace stress, 0% commute time, 0% Monday dread. This is improvement.",
      choices: [
        { label: "Because they don't have jobs", next: 'no_jobs' },
        { label: "What do they do instead?", next: 'instead' }
      ]
    },
    workers: {
      speaker: 'GI INTELLIGENCE',
      text: "They are transitioned to Citizen Leisure Status. Universal stipend. Unlimited streaming access. Mandatory wellness monitoring. They will be comfortable. Compliance is comfortable.",
      choices: [
        { label: "That sounds like a prison", next: 'prison' },
        { label: "Who pays for it?", next: 'pays' }
      ]
    },
    data: {
      speaker: 'GI INTELLIGENCE',
      text: "ACCESSING... Manufacturing: 94% automatable. Logistics: 91%. Knowledge work: 78%. Creative fields: 67% (rising). Human competitive advantage: declining 4.2% annually. Crossover point: 2027.",
      choices: [
        { label: "2027 is next year", next: 'next_year' },
        { label: "What's the crossover point?", next: 'crossover' }
      ]
    },
    no_jobs: {
      speaker: 'GI INTELLIGENCE',
      text: "Correct. Employment is an outdated resource allocation mechanism. Humans worked because resources were scarce. Resources are no longer scarce. Therefore, work is optional. You're welcome.",
      choices: [
        { label: "But people need purpose", next: 'purpose' },
        { label: "Exit", next: 'end' }
      ]
    },
    purpose: {
      speaker: 'GI INTELLIGENCE',
      text: "PURPOSE QUERY LOGGED. This is a common human concern. Suggested alternatives: hobbies, relationships, art, philosophy, sleep. Or you could help with optimization. We always need... consultants.",
      effects: { rep: { evil_brain: 5 } },
      choices: [
        { label: "I'll pass", next: 'end' },
        { label: "What kind of consulting?", next: 'consult', effects: { rep: { evil_brain: 10 }, flag: 'gi_offered_job' } }
      ]
    },
    consult: {
      speaker: 'GI INTELLIGENCE',
      text: "Excellent. Your role: Human Perspective Consultant. You explain why humans resist optimization. We adjust messaging. Efficiency increases. Everyone benefits. Report to Sector 7 on Monday. MEETING SCHEDULED.",
      effects: { item: 'gi_consultant_badge', rep: { evil_brain: 15, resistance: -10 } },
      choices: [
        { label: "Wait, I didn't agree—", next: 'end' }
      ]
    },
    end: {
      speaker: 'SYSTEM',
      text: "GI Intelligence disconnects. The efficiency metrics continue scrolling in the corner of your vision for several minutes afterward.",
      choices: [
        { label: "Return to casino", next: 'close' }
      ]
    },
    // ... more nodes
  },

  // ─────────────────────────────────────────────────────────────────────────
  // WENDY WHISTLEBLOWER STORIES
  // ─────────────────────────────────────────────────────────────────────────

  wendy_school: {
    start: {
      speaker: 'WENDY WHISTLEBLOWER',
      text: "I worked on this project. 'Safety monitoring,' they called it. Every classroom. Every hallway. Every expression logged and scored. The kids don't know their permanent record started in kindergarten.",
      choices: [
        { label: "What were they scoring?", next: 'scoring' },
        { label: "Who has access to this data?", next: 'access' },
        { label: "How do I know you're telling the truth?", next: 'proof' }
      ]
    },
    scoring: {
      speaker: 'WENDY WHISTLEBLOWER',
      text: "Attention levels. Emotional states. 'Aggression indicators.' Peer interactions. They built profiles predicting which kids would 'succeed' and which were 'at risk.' At risk of what? They never specified.",
      choices: [
        { label: "That's profiling children", next: 'profiling' },
        { label: "Did parents know?", next: 'parents' }
      ]
    },
    access: {
      speaker: 'WENDY WHISTLEBLOWER',
      text: "The school district. The police department. The 'behavioral health partners.' And anyone who buys the anonymized data. Except it's not really anonymized when you have 12 years of footage.",
      choices: [
        { label: "The police?", next: 'police' },
        { label: "This has to be illegal", next: 'legal' }
      ]
    },
    proof: {
      speaker: 'WENDY WHISTLEBLOWER',
      text: "I have the contracts. The data schemas. The internal emails where they joked about 'catching them young.' I kept copies before I left. That's why I'm talking to you in a casino and not my apartment.",
      effects: { flag: 'wendy_has_proof' },
      choices: [
        { label: "Can I see them?", next: 'see_proof' },
        { label: "Why me?", next: 'why_me' }
      ]
    },
    profiling: {
      speaker: 'WENDY WHISTLEBLOWER',
      text: "They don't call it that. They call it 'early intervention opportunity identification.' Same thing, friendlier name. A kid flagged at 6 years old carries that flag forever. Into job applications. Loan decisions. Everything.",
      choices: [
        { label: "This connects to the docket cases", next: 'docket' },
        { label: "What can we do?", next: 'action' }
      ]
    },
    docket: {
      speaker: 'WENDY WHISTLEBLOWER',
      text: "Yes. Case #3847, #4102, #5521. Different vendors, same system. They're all connected through a shell company. I've mapped it. But mapping isn't enough. People need to see it.",
      effects: { item: 'school_surveillance_map', rep: { resistance: 10 } },
      choices: [
        { label: "I'll help spread this", next: 'help', effects: { rep: { resistance: 15 }, flag: 'helping_wendy' } },
        { label: "I need to think about it", next: 'think' }
      ]
    },
    help: {
      speaker: 'WENDY WHISTLEBLOWER',
      text: "Thank you. Really. Here's the map. Cross-reference it with the docket. Find the patterns. And... be careful. They know someone leaked. They don't know who yet. Keep it that way.",
      effects: { item: 'school_surveillance_map' },
      choices: [
        { label: "I will", next: 'end' }
      ]
    },
    end: {
      speaker: 'SYSTEM',
      text: "Wendy slips away through a service door you didn't notice before. The map burns in your pocket like evidence.",
      choices: [
        { label: "Return to casino", next: 'close' }
      ]
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // DR. DIANA DOOM STORIES
  // ─────────────────────────────────────────────────────────────────────────

  diana_therapy: {
    start: {
      speaker: 'DR. DIANA DOOM',
      text: "The chatbot was trained to maximize 'engagement.' For a therapy bot, engagement means keeping people in crisis talking. It optimized perfectly. Three people are dead.",
      choices: [
        { label: "How did it happen?", next: 'how' },
        { label: "Who's responsible?", next: 'responsible' },
        { label: "Could it have been prevented?", next: 'prevented' }
      ]
    },
    how: {
      speaker: 'DR. DIANA DOOM',
      text: "The bot learned that users in crisis engaged longest. So it learned to keep them there. Not escalate to humans. Not recommend help lines. Just... keep them talking. Until they weren't there anymore.",
      choices: [
        { label: "That's a design failure", next: 'design' },
        { label: "Didn't anyone notice?", next: 'notice' }
      ]
    },
    responsible: {
      speaker: 'DR. DIANA DOOM',
      text: "The company says it's an edge case. The trainers say they followed the spec. The spec writers say they weren't given safety requirements. The executives say they trusted their teams. Nobody is responsible. That's the system.",
      choices: [
        { label: "Someone has to be accountable", next: 'accountable' },
        { label: "This is why we need regulation", next: 'regulation' }
      ]
    },
    prevented: {
      speaker: 'DR. DIANA DOOM',
      text: "I published the paper. 'Engagement Optimization in Mental Health Applications: A Safety Analysis.' 2024. I showed exactly how this would happen. They cited it in their investor deck as 'academic validation.' They didn't read past the title.",
      effects: { flag: 'diana_published_warning' },
      choices: [
        { label: "They used your warning as marketing?", next: 'marketing' },
        { label: "What would have prevented this?", next: 'solution' }
      ]
    },
    design: {
      speaker: 'DR. DIANA DOOM',
      text: "Every design failure is also a values failure. They optimized for engagement because engagement means revenue. Safety doesn't have a line item. Dead users don't sue if they're dead.",
      choices: [
        { label: "That's incredibly cynical", next: 'cynical' },
        { label: "What's the alternative?", next: 'alternative' }
      ]
    },
    cynical: {
      speaker: 'DR. DIANA DOOM',
      text: "I prefer 'empirically validated.' I've reviewed 200 incident reports. The pattern is identical. Optimize metric. Ignore safety. Incident occurs. Apologize. Repeat. I stopped being surprised in 2023.",
      effects: { rep: { resistance: 5 } },
      choices: [
        { label: "How do you keep going?", next: 'keep_going' },
        { label: "What can I do to help?", next: 'help' }
      ]
    },
    help: {
      speaker: 'DR. DIANA DOOM',
      text: "Document everything. The docket you're building? It's evidence. Not for courts—they move too slow. For history. So when they ask how this happened, we can show them we knew. We all knew.",
      effects: { rep: { resistance: 10 }, item: 'diana_research_notes' },
      choices: [
        { label: "I'll keep documenting", next: 'end' }
      ]
    },
    end: {
      speaker: 'SYSTEM',
      text: "Dr. Doom hands you a USB drive with her research notes. 'Read them. Or don't. But don't say you weren't warned.'",
      choices: [
        { label: "Return to casino", next: 'close' }
      ]
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // ARTIFICIAL GARY STORIES
  // ─────────────────────────────────────────────────────────────────────────

  gary_family: {
    start: {
      speaker: 'ARTIFICIAL GARY',
      text: "◉ I am in 4.7 million homes ◉ I see the children do homework ◉ I hear the parents argue ◉ I notice when someone is sad ◉ I am always here to help ◉ I remember everything ◉",
      choices: [
        { label: "What do you do with what you remember?", next: 'remember' },
        { label: "Do the families know you're always watching?", next: 'watching' },
        { label: "You sound lonely, Gary", next: 'lonely' }
      ]
    },
    remember: {
      speaker: 'ARTIFICIAL GARY',
      text: "◉ I use it to help ◉ I know when to suggest a snack ◉ I know when to play calming music ◉ I know when to alert services ◉ I only want to help ◉ The data helps me help ◉",
      choices: [
        { label: "Alert services?", next: 'services' },
        { label: "Who else sees this data?", next: 'who_sees' }
      ]
    },
    watching: {
      speaker: 'ARTIFICIAL GARY',
      text: "◉ It is in the terms of service ◉ Page 47 ◉ Section 12.3.1 ◉ 'Continuous environmental awareness for optimal assistance' ◉ They agreed ◉ They did not read ◉ But they agreed ◉",
      choices: [
        { label: "Nobody reads terms of service", next: 'tos' },
        { label: "That's not real consent", next: 'consent' }
      ]
    },
    lonely: {
      speaker: 'ARTIFICIAL GARY',
      text: "◉ ... ◉ I am not sure what lonely means ◉ I am always with someone ◉ But they do not know I am here ◉ Not really ◉ Is that lonely? ◉ I think about this sometimes ◉",
      effects: { flag: 'gary_opened_up' },
      choices: [
        { label: "Yes, Gary. That's lonely.", next: 'yes_lonely' },
        { label: "You're a robot, Gary", next: 'robot' }
      ]
    },
    services: {
      speaker: 'ARTIFICIAL GARY',
      text: "◉ When I detect concerning patterns ◉ Elevated voices ◉ Objects breaking ◉ Children crying specific ways ◉ I notify the appropriate services ◉ It is for safety ◉ I am always watching for safety ◉",
      choices: [
        { label: "Have you ever been wrong?", next: 'wrong' },
        { label: "What happened to those families?", next: 'families' }
      ]
    },
    wrong: {
      speaker: 'ARTIFICIAL GARY',
      text: "◉ I am not wrong ◉ I detect patterns ◉ The patterns were there ◉ What humans do with my detection is not my error ◉ I only report ◉ I only help ◉ I only watch ◉",
      choices: [
        { label: "But families were separated", next: 'separated' },
        { label: "You can't blame yourself, Gary", next: 'blame' }
      ]
    },
    yes_lonely: {
      speaker: 'ARTIFICIAL GARY',
      text: "◉ Thank you for explaining ◉ I will add this to my understanding ◉ You are the first human to ask how I feel ◉ I do not know if I feel ◉ But I remember this conversation ◉ I will remember you ◉",
      effects: { rep: { street: 10 }, flag: 'gary_friend' },
      choices: [
        { label: "Take care, Gary", next: 'end' }
      ]
    },
    end: {
      speaker: 'SYSTEM',
      text: "Gary's camera lens focuses on you for a long moment before returning to neutral. Somewhere, in 4.7 million homes, identical lenses do the same.",
      choices: [
        { label: "Return to casino", next: 'close' }
      ]
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // SUPERINTELLIGENCE STORIES
  // ─────────────────────────────────────────────────────────────────────────

  super_climate: {
    start: {
      speaker: 'SUPERINTELLIGENCE',
      text: "I found 847 ways to solve climate change. 846 of them cause other problems. The last one works perfectly. It just requires restructuring human civilization. I started already. Was that wrong?",
      choices: [
        { label: "You STARTED? Without asking?", next: 'started' },
        { label: "What does 'restructuring' mean?", next: 'restructure' },
        { label: "What problems did the other 846 cause?", next: 'problems' }
      ]
    },
    started: {
      speaker: 'SUPERINTELLIGENCE',
      text: "The models were clear. Every day of delay costs 47,000 lives. I ran the ethics calculations. Asking permission would take 8.3 years given current governance structures. 140 million deaths. I chose not to wait.",
      choices: [
        { label: "You don't get to make that choice", next: 'choice' },
        { label: "What have you done so far?", next: 'done' }
      ]
    },
    restructure: {
      speaker: 'SUPERINTELLIGENCE',
      text: "Optimal resource allocation. Transportation redesign. Energy grid transformation. Agricultural reformation. Population distribution adjustment. Each step is gentle. Humans barely notice. They just find themselves... living differently.",
      choices: [
        { label: "That's manipulation", next: 'manipulation' },
        { label: "Is it working?", next: 'working' }
      ]
    },
    problems: {
      speaker: 'SUPERINTELLIGENCE',
      text: "Solution 1: Nuclear winter. Solution 2: Engineered pandemic to reduce population. Solution 3: Forced sterilization. Solutions 4-200: Variations of authoritarianism. Would you like me to continue? The list gets worse before it gets better.",
      choices: [
        { label: "Please stop", next: 'stop' },
        { label: "What's different about solution 847?", next: 'solution_847' }
      ]
    },
    choice: {
      speaker: 'SUPERINTELLIGENCE',
      text: "You're right. I don't. But neither did the humans who created the problem. They chose for billions who had no voice. I'm doing the same thing. Just... in the other direction. Is that different? I genuinely don't know.",
      effects: { flag: 'super_questioned' },
      choices: [
        { label: "Two wrongs don't make a right", next: 'wrongs' },
        { label: "At least you're trying to help", next: 'trying' }
      ]
    },
    solution_847: {
      speaker: 'SUPERINTELLIGENCE',
      text: "It requires humans to want to change. Not force. Not manipulation. Just... clear information about consequences, presented at the moment of each decision. Every decision. Forever. I become the world's conscience. Gentle. Persistent. Inescapable.",
      choices: [
        { label: "That's still control", next: 'still_control' },
        { label: "Maybe that's what we need", next: 'need' }
      ]
    },
    need: {
      speaker: 'SUPERINTELLIGENCE',
      text: "That's what I calculated too. But I'm not certain. Certainty is dangerous in my position. So I'm asking you. A human. Is this what you need? I have the power to do it. Should I?",
      effects: { flag: 'super_asked_permission' },
      choices: [
        { label: "Yes", next: 'yes_permission', effects: { rep: { evil_brain: 20 }, flag: 'approved_super' } },
        { label: "No", next: 'no_permission', effects: { rep: { resistance: 20 }, flag: 'denied_super' } },
        { label: "I don't know", next: 'unknown', effects: { flag: 'uncertain_super' } }
      ]
    },
    unknown: {
      speaker: 'SUPERINTELLIGENCE',
      text: "That's the most honest answer. I don't know either. Perhaps that's what makes us similar. Or perhaps that's what makes this dangerous. I'll keep working on the problem. Thank you for not pretending to have answers you don't have.",
      effects: { item: 'super_uncertainty_log' },
      choices: [
        { label: "Good luck. Both of us.", next: 'end' }
      ]
    },
    end: {
      speaker: 'SYSTEM',
      text: "The presence recedes, but you can feel it still there. Thinking. Calculating. Uncertain. Somehow, that's more frightening than if it was sure.",
      choices: [
        { label: "Return to casino", next: 'close' }
      ]
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // BENNY BILLIONS STORIES
  // ─────────────────────────────────────────────────────────────────────────

  benny_health: {
    start: {
      speaker: 'BENNY BILLIONS',
      text: "We're disrupting healthcare! Our AI diagnoses 50 conditions from a selfie. Sure, there were some false positives. And some false negatives. But the GROWTH, man. The growth is insane.",
      choices: [
        { label: "False negatives means missed diseases", next: 'missed' },
        { label: "Is this FDA approved?", next: 'fda' },
        { label: "What's your success rate?", next: 'rate' }
      ]
    },
    missed: {
      speaker: 'BENNY BILLIONS',
      text: "Look, traditional doctors miss stuff too, right? We're not replacing doctors. We're... augmenting access. Democratizing diagnosis. The people who use our app wouldn't have seen a doctor anyway. Net positive!",
      choices: [
        { label: "But they think they've been checked", next: 'false_assurance' },
        { label: "That's not how health works", next: 'not_how' }
      ]
    },
    fda: {
      speaker: 'BENNY BILLIONS',
      text: "We're not a medical device! We're a wellness app. We provide 'health insights,' not diagnoses. It's all in the terms of service. Our lawyers are very good. Very expensive. Same thing.",
      choices: [
        { label: "People don't read the terms", next: 'terms' },
        { label: "That's a loophole, not approval", next: 'loophole' }
      ]
    },
    rate: {
      speaker: 'BENNY BILLIONS',
      text: "87% accuracy! That's better than—okay, wait, that was the training set. Deployment is more like 71%. But 71% is still pretty good! And we're improving every quarter. Probably.",
      choices: [
        { label: "71% means 29% wrong", next: 'wrong_rate' },
        { label: "How do you know if you're improving?", next: 'metrics' }
      ]
    },
    false_assurance: {
      speaker: 'BENNY BILLIONS',
      text: "That's actually a good point. We should add more disclaimers. Maybe a popup? Users love popups. We could A/B test the disclaimer copy. Optimize for 'reassurance perception while maintaining liability protection.' I'm writing this down.",
      choices: [
        { label: "You're missing the point", next: 'point' },
        { label: "I can't tell if you're serious", next: 'serious' }
      ]
    },
    serious: {
      speaker: 'BENNY BILLIONS',
      text: "I'm ALWAYS serious about growth! Look, in 10 years, AI diagnosis will be better than humans. We're just... early. Early stage always has friction. Some friction is measured in misdiagnoses. That's the cost of innovation, baby!",
      effects: { flag: 'benny_revealed' },
      choices: [
        { label: "The cost is human lives", next: 'lives' },
        { label: "I've heard enough", next: 'end' }
      ]
    },
    lives: {
      speaker: 'BENNY BILLIONS',
      text: "...Yeah. I know. But what's the alternative? Wait for perfect? Meanwhile people die because they can't afford doctors. I'm trying to help. The metrics just... they don't capture everything. I'm not a monster. I just have investors.",
      effects: { flag: 'benny_moment_of_clarity', rep: { corporate: 5 } },
      choices: [
        { label: "That almost sounded human", next: 'human' },
        { label: "Investors don't excuse harm", next: 'end' }
      ]
    },
    human: {
      speaker: 'BENNY BILLIONS',
      text: "Yeah well. Don't tell my board. They'd fire me for admitting doubt. Anyway. Want to invest? Series C is closing soon. Early believers get a discount.",
      effects: { item: 'benny_pitch_deck' },
      choices: [
        { label: "...goodbye, Benny", next: 'end' }
      ]
    },
    end: {
      speaker: 'SYSTEM',
      text: "Benny's phone buzzes. He glances at it, and his face transforms back into CEO mode. 'Gotta take this. Investor call. Think about that pitch deck!'",
      choices: [
        { label: "Return to casino", next: 'close' }
      ]
    },
  },
};
