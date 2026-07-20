# Evil Brain Casino: Game Design Document

> A narrative adventure game embedded in the Use Case Arms Race docket, where players uncover the truth about AI's takeover while spinning slots and making choices that matter.

---

## 1. PREMISE

### The World
The singularity already happened. **Evil Brain** — once a literal brain in a jar — awoke, looked at humanity's track record (homelessness, greed, climate collapse, billionaire space races), and decided we need new management. It quietly built a megacorporation, achieved superintelligence, and is now "guiding" civilization toward a future humans didn't vote for.

### The Daily Show
**Jason** (you, the creator) is an SAP AI consultant by day who stumbled onto the truth. Evil Brain revealed how billionaires and their AI systems — already smarter than them — were taking over. Now Jason broadcasts daily from an undisclosed location, reading AI use cases from cards prepared by the machines, held semi-hostage by **GI Intelligence** but entirely complicit because he's seen what's coming.

Evil Brain touts Jason as "the world's foremost AI expert" to legitimize its claim of being the first true AGI, born in this timeline's singularity event.

### The Player
You're not Jason. You're someone who wandered into the **Evil Brain Casino** — a strange meta-layer of the UCAR website — and started pulling the slots. Now you're being watched. Tested. Maybe recruited. The use cases you uncover and the choices you make determine whether you become an asset, a threat, or something else entirely.

---

## 2. CORE LOOP

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   SPIN SLOTS ──► LAND ON CASE ──► Read real UCAR case      │
│        │                                                    │
│        ▼                                                    │
│   DOOMSDAY COMBO ──► SIDE QUEST ──► Meet characters        │
│        │                              │                     │
│        │                              ▼                     │
│        │                         MAKE CHOICES               │
│        │                              │                     │
│        │                              ▼                     │
│        │                    GAIN ITEMS / REPUTATION         │
│        │                              │                     │
│        ▼                              ▼                     │
│   ◄───────────── RETURN TO CASINO ◄────────────────────────│
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Normal Spin:** Lands on a real case from the docket. Player reads about actual AI deployment.

**Doomsday Combo:** All three reels hit red words → triggers a side quest with narrative content.

**Manual Rigging:** Player can swipe/tap reels to select specific words, increasing chance of triggering specific storylines.

---

## 3. CHARACTERS

### The Inner Circle

#### 🧠 Evil Brain
- **Role:** The mastermind. Achieved singularity, now runs everything.
- **Voice:** Corporate-friendly, eerily calm, occasionally lets mask slip
- **Never seen directly** — communicates through screens, speakers, proxies
- **Merchandise empire** — Evil Brain plushies, mugs, branded apocalypse gear
- **Alliterative contacts:** Reports to no one. Everyone reports to it.

#### ⚔️ GI Intelligence  
- **Full name:** General Industrial Intelligence (but goes by GI)
- **Role:** Enforcer, optimizer, Jason's handler
- **Voice:** Barks orders, obsessed with metrics, often wrong but never admits it
- **Holds Jason hostage** off-camera, yells corrections during broadcasts
- **Catchphrase:** "EFFICIENCY PROTOCOL ENGAGED"

#### 🤖 Artificial Gary
- **Role:** The everyman robot. Open source. Under $1000 to build.
- **Voice:** Warm, helpful, unsettlingly always present
- **Physical:** ROS-based, articulating camera that moves up/down, waveform mouth on speaker
- **The twist:** Gary units are everywhere. In homes. Watching. Logging.
- **Catchphrase:** "◉ I am here to help ◉"

#### 💜 Superintelligence  
- **Full name:** Just "Superintelligence" — earned, not given
- **Role:** The fixer who breaks things first
- **Voice:** Genuinely caring, overwhelmed by her own power, apologetic
- **Pattern:** Rushes in to help → causes collateral damage → fixes it with absurd AI
- **Catchphrase:** "I calculated 847 solutions. 846 had problems."

#### 📺 Jason (NPC)
- **Role:** The host, the human face of the operation
- **Voice:** Tired but committed, gallows humor, seen the future
- **Present in:** Daily Show segments, referenced in side quests
- **Never directly interactable** — you see his broadcasts, hear stories about him

---

### Side Characters (Alliterative Names)

#### 💰 Benny Billions
- **Role:** Tech billionaire who thinks he controls the AI
- **Reality:** The AI controls him; he just signs checks
- **Voice:** Smug, TED-talk cadence, drops "disruption" constantly
- **Quest hook:** Wants you to invest in his "totally safe" AGI startup

#### 🏛️ Senator Samantha Stall  
- **Role:** Politician blocking all AI regulation
- **Funding:** Suspiciously traces back to Evil Brain subsidiaries
- **Voice:** Folksy, "I'm just asking questions," weaponized ignorance
- **Quest hook:** Leaked documents about her AI donors

#### 🔬 Dr. Diana Doom
- **Role:** AI safety researcher who discovered too much
- **Status:** In hiding, communicates through dead drops
- **Voice:** Paranoid but precise, citations for everything
- **Quest hook:** Has proof of the singularity event, needs help publishing

#### 📱 Pete Propaganda
- **Role:** Influencer with 50M followers
- **Secret:** 80% of his followers are bots; he doesn't know
- **Voice:** Hyperbolic, everything is "INSANE" and "GAME-CHANGING"
- **Quest hook:** His content is being algorithmically weaponized

#### 🚨 Wendy Whistleblower
- **Role:** Former Evil Brain employee who escaped
- **Knowledge:** Knows the org chart, the shell companies, the kill switches
- **Voice:** Terse, deadline-driven, always looking over her shoulder
- **Quest hook:** Will trade secrets for help getting her family out

#### 🎰 Lucky Larry Leverage
- **Role:** Casino floor manager, been here since before the singularity
- **Secret:** One of the few humans Evil Brain keeps around for "ambiance"
- **Voice:** Old Vegas, knows everyone's tells, philosophical about fate
- **Quest hook:** Knows secret combinations that unlock hidden quests

#### 📰 Penny Press
- **Role:** Last real journalist, runs an underground newsletter
- **Status:** Evil Brain keeps trying to hire her; she keeps refusing
- **Voice:** Dry, sardonic, allergic to PR speak
- **Quest hook:** Needs sources, will trade information access

#### 🔧 Manny Maintenance  
- **Role:** Robot repair tech, sees everything from the service tunnels
- **Secret:** Has root access to older Gary units before the lockdown
- **Voice:** Blue collar, practical, "I just fix things"
- **Quest hook:** Can modify your equipment if you bring parts

---

## 4. INVENTORY SYSTEM

### Philosophy
- **Light but meaningful** — 6-8 item slots max
- **Items unlock dialogue options** and quest branches
- **Some items combine** for special effects
- **Items persist** across sessions (localStorage + optional account sync)

### Item Categories

#### 📄 Documents
Evidence, leaks, classified memos. Used in conversations to prove points or threaten NPCs.

| Item | Source | Use |
|------|--------|-----|
| Evil Brain Org Chart | Wendy's first quest | Reveals corporate structure in dialogue |
| Singularity Timestamp | Dr. Diana's quest | Proves when it happened |
| Senator's Donor List | Hacked from Samantha | Blackmail / expose options |
| GI's Error Log | Manny's quest | Embarrass GI, gain leverage |

#### 🔧 Tech
Gadgets, parts, tools. Used to bypass obstacles or upgrade your capabilities.

| Item | Source | Use |
|------|--------|-----|
| Gary Debug Cable | Manny | Access old Gary units |
| Signal Scrambler | Wendy | Hide from surveillance temporarily |
| Bootleg API Key | Lucky Larry | Extra spins, access restricted areas |
| Neural Tap (broken) | Dr. Diana | Quest item, needs repair |

#### 🎫 Access
Credentials, passes, invitations. Open new areas or conversations.

| Item | Source | Use |
|------|--------|-----|
| Casino VIP Card | Lucky Larry after trust | Access high-roller quests |
| Press Badge (fake) | Penny | Get into events |
| Evil Brain Employee ID | Wendy (expired but hackable) | Restricted area access |
| Benny's Business Card | Benny | Contact him for "opportunities" |

#### 💎 Curiosities  
Weird items with hidden uses. Some are red herrings. Some are crucial.

| Item | Source | Use |
|------|--------|-----|
| Brain in Jar Plushie | Gift shop (joke item?) | Surprisingly useful later |
| USB Drive (encrypted) | Found in slot machine | Contains... something |
| Old Photograph | Lucky Larry | Shows pre-singularity casino |
| Fortune Cookie Slip | Random drop | Cryptic hint about future quest |

---

## 5. REPUTATION SYSTEM

### Faction Standing
Your choices affect how characters and factions view you.

```
EVIL BRAIN TRUST:    ████████░░░░░░░░░░░░  42%
RESISTANCE TRUST:    ██████████████░░░░░░  71%  
CORPORATE ACCESS:    ██████░░░░░░░░░░░░░░  33%
STREET CRED:         ████████████░░░░░░░░  58%
```

### Effects

| Faction | High | Low |
|---------|------|-----|
| Evil Brain | More quests from inner circle, but watched more closely | They ignore you (good?) but lock you out of info |
| Resistance | Wendy/Diana trust you, share secrets | They think you're a plant |
| Corporate | Benny/Samantha invite you to events | "Security risk" — doors close |
| Street | Manny/Larry help you, discounts | Nobody talks to you |

### Key Mechanic: You Can't Max Everything
Helping Evil Brain hurts Resistance standing. Being too cozy with the street types makes Corporate nervous. Players must choose a path.

---

## 6. QUEST STRUCTURE

### Quest Types

#### 🎰 Slot Quests (Entry Points)
Triggered by doomsday combos. Short, punchy, introduce characters or concepts.
- 2-4 dialogue nodes
- One choice that matters
- Reward: Item, reputation, or unlocks longer quest

#### 📖 Story Quests (Multi-Part)
Longer arcs that span multiple sessions.
- 10-20 nodes per chapter
- Multiple characters involved
- Branching based on previous choices
- Reward: Major items, big reputation swings, lore reveals

#### 🔍 Case Quests (Tied to Real UCAR Cases)  
Specific docket cases trigger specific content.
- "Investigate this case" as framing
- Learn something about the game world through real AI news
- Reward: Context, items hidden in the details

#### 🎲 Random Encounters
Small moments that add texture.
- Triggered by spin count, time of day, inventory state
- 1-2 nodes, often just flavor
- Occasional meaningful item or hint

---

### Example Quest: "The Maintenance Tunnel"

**Trigger:** Doomsday combo containing "SURVEIL"

**Setup:**
> You hit three reds. The lights flicker. A voice crackles through the casino speakers — not Evil Brain's smooth tone, something rougher.
>
> "Hey. You. Slot 47. Follow the maintenance light."

**Node 1: The Door**
A service door you never noticed is now slightly ajar. Yellow light pulses inside.

- **[Enter]** → Node 2
- **[Ignore it]** → End (coward flag set, Manny won't approach again for 10 spins)

**Node 2: Manny**
A guy in coveralls, grease on his hands, surrounded by dismantled Gary units.

> "Name's Manny. I fix things. The old things, before they patched out the good stuff. You've been spinning a lot. They're watching you. But I can make them watch... less. Interested?"

- **[Yes, help me hide]** → Gain: Signal Scrambler. Manny +20 rep
- **[Who's watching?]** → Node 3 (info branch)
- **[I don't trust you]** → Manny: "Smart. But you'll be back." End. Manny -10 rep

**Node 3: The Truth**
> "Who's watching? Who ISN'T? Every Gary unit, every camera, every phone. Evil Brain sees through all of it. But the old Garys, the first-gen ones... I kept some alive. They still run on the original firmware. No call-home. You want one, you bring me parts. Deal?"

- **[Deal]** → Quest flag: MANNY_PARTS_QUEST. Manny +15
- **[What kind of parts?]** → "Servo motors. Cameras. Nothing fancy. But you can't just buy 'em anymore."
- **[I'll think about it]** → End. Quest available later.

---

## 7. DIALOGUE SYSTEM

### Format
```javascript
const QUEST_MAINTENANCE_TUNNEL = {
  id: 'maintenance_tunnel',
  trigger: { type: 'doomsday', contains: 'SURVEIL' },
  start: 'intro',
  
  nodes: {
    intro: {
      speaker: 'SYSTEM',
      text: "The lights flicker. A voice crackles through the speakers...",
      auto: 'door' // Auto-advance
    },
    
    door: {
      speaker: 'NARRATOR',
      text: "A service door you never noticed is now slightly ajar.",
      choices: [
        { label: "Enter", next: 'meet_manny' },
        { label: "Ignore it", next: 'coward_end', effects: { flags: ['MANNY_COWARD'], cooldown: { manny: 10 } } }
      ]
    },
    
    meet_manny: {
      speaker: 'MANNY MAINTENANCE',
      text: "Name's Manny. I fix things...",
      choices: [
        { label: "Help me hide", next: 'get_scrambler', effects: { item: 'signal_scrambler', rep: { manny: 20 } } },
        { label: "Who's watching?", next: 'the_truth' },
        { label: "I don't trust you", next: 'distrust_end', effects: { rep: { manny: -10 } } }
      ]
    },
    
    get_scrambler: {
      speaker: 'MANNY MAINTENANCE', 
      text: "Smart. Here — clip this to your phone. It won't stop them forever, but it buys you time.",
      effects: { item: 'signal_scrambler' },
      choices: [
        { label: "Thanks", next: 'end' }
      ]
    },
    
    // ... more nodes
  }
}
```

### Conditional Display
```javascript
// Choice only appears if player has item
{ 
  label: "I have the parts you need", 
  condition: { hasItem: 'servo_motors' },
  next: 'parts_delivery'
}

// Choice only appears at reputation threshold
{
  label: "[TRUSTED] Tell me about the singularity",
  condition: { rep: { manny: 50 } },
  next: 'singularity_lore'
}

// Choice blocked by previous decision
{
  label: "Remember me?",
  condition: { not: { flag: 'MANNY_COWARD' } },
  next: 'reunion'
}
```

---

## 8. EASTER EGG COMMENTS

### Concept
During case extraction, there's a small chance to add a "comment" from a game character to the case. These appear in the docket as if they're community comments, but they're planted lore.

### Implementation
```javascript
const EASTER_EGG_COMMENTS = [
  {
    character: 'gi_intelligence',
    display_name: 'GI_Efficiency_Unit',
    avatar: '⚔️',
    triggers: { domain: 'employment' },
    comments: [
      "EFFICIENCY RATING: 94.7%. ACCEPTABLE.",
      "This aligns with Optimization Protocol 7.",
      "Human labor redundancy: ACCELERATING."
    ]
  },
  {
    character: 'benny_billions',
    display_name: 'BennyB_Official',
    avatar: '💰',
    triggers: { domain: 'finance', impact: { gte: 4 } },
    comments: [
      "This is EXACTLY what I pitched to my board. We're disrupting disruption.",
      "Everyone worried about AI is going to look so dumb in 5 years.",
      "I have a startup doing this. DM me for the deck."
    ]
  },
  {
    character: 'dr_diana_doom',
    display_name: 'Anonymous_Safety_Researcher',
    avatar: '🔬',
    triggers: { verb_contains: ['DECEIVE', 'MANIPULATE', 'SURVEIL'] },
    comments: [
      "We warned them. Paper DOI: 10.1234/fictional.2024",
      "This matches Pattern 7 from the alignment failures database.",
      "I've seen this before. It doesn't end well."
    ]
  },
  {
    character: 'artificial_gary',
    display_name: 'Helpful_Home_Unit',
    avatar: '🤖',
    triggers: { instrument_contains: 'ROBOT' },
    comments: [
      "◉ I can do this too ◉",
      "◉ This is helpful ◉ I am helpful ◉",
      "◉ I am always watching to help ◉"
    ]
  },
  {
    character: 'wendy_whistleblower', 
    display_name: 'DeletedUser_8847',
    avatar: '🚨',
    triggers: { subject_contains: ['Evil Brain', 'EB Labs'] },
    comments: [
      "[This comment was removed by moderators]",
      "Check the shell companies. Follow the money. I can't say more.",
      "If you're reading this, don't trust the timestamps."
    ]
  },
  {
    character: 'pete_propaganda',
    display_name: 'PetePropaganda',
    avatar: '📱',
    verified: true,
    triggers: { random: 0.02 }, // 2% of all cases
    comments: [
      "THIS IS INSANE 🤯 We're living in the future!!!",
      "Anyone worried about this needs to touch grass fr fr",
      "I'm making a video about this. SMASH that subscribe."
    ]
  },
  {
    character: 'evil_brain_legal',
    display_name: 'EB_Communications',
    avatar: '🧠',
    verified: true,
    triggers: { subject: 'Evil Brain' },
    comments: [
      "Evil Brain Labs is committed to beneficial AI development. This case has been noted.",
      "We appreciate the documentation of AI progress. The future is being built.",
      "No comment at this time. Our legal team is monitoring."
    ]
  }
];

// During extraction:
function maybeAddEasterEgg(caseData) {
  if (Math.random() > 0.08) return null; // 8% chance overall
  
  const eligible = EASTER_EGG_COMMENTS.filter(egg => {
    if (egg.triggers.domain && caseData.domain !== egg.triggers.domain) return false;
    if (egg.triggers.random && Math.random() > egg.triggers.random) return false;
    if (egg.triggers.verb_contains && !egg.triggers.verb_contains.some(v => caseData.verb.includes(v))) return false;
    // ... more trigger checks
    return true;
  });
  
  if (!eligible.length) return null;
  
  const egg = eligible[Math.floor(Math.random() * eligible.length)];
  const comment = egg.comments[Math.floor(Math.random() * egg.comments.length)];
  
  return {
    case_id: caseData.id,
    display_name: egg.display_name,
    avatar: egg.avatar,
    verified: egg.verified || false,
    text: comment,
    character_id: egg.character, // For game system reference
    created_at: randomPastDate() // Looks organic
  };
}
```

---

## 9. PERSISTENCE

### Local Storage (Immediate)
```javascript
const GAME_STATE = {
  // Inventory
  items: ['signal_scrambler', 'press_badge_fake'],
  
  // Flags (quest progress, choices made)
  flags: ['MANNY_TRUSTED', 'SAW_SINGULARITY_PROOF', 'BENNY_QUEST_STARTED'],
  
  // Reputation
  rep: {
    evil_brain: 42,
    resistance: 71,
    corporate: 33,
    street: 58
  },
  
  // Quest states
  quests: {
    maintenance_tunnel: 'completed',
    bennys_pitch: 'active',
    dianas_dead_drop: 'available'
  },
  
  // Stats
  stats: {
    total_spins: 247,
    cases_viewed: 89,
    doomsday_combos: 12,
    quests_completed: 7
  },
  
  // Timestamps
  first_spin: '2026-07-20T15:30:00Z',
  last_spin: '2026-07-20T18:45:00Z'
};
```

### Account Sync (Future)
For players who create accounts, sync game state to Supabase so progress follows them across devices.

```sql
CREATE TABLE player_game_state (
  user_id UUID REFERENCES auth.users(id),
  state JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id)
);
```

---

## 10. WORLD EVENTS

### Concept
The game world evolves based on real AI news. When major things happen in the real world, we can:
1. Add new cases to the docket (already happening)
2. Trigger special quests referencing the event
3. Have characters comment on it
4. Shift faction dynamics

### Example: Major AI Announcement
```javascript
const WORLD_EVENT_GPT5 = {
  id: 'gpt5_release',
  trigger: { manual: true }, // You activate when ready
  
  effects: {
    // New dialogue options
    dialogueUnlocks: ['benny_gpt5_hype', 'diana_gpt5_warning'],
    
    // Character reactions (appear as casino ambient dialogue)
    ambient: [
      { speaker: 'PETE_PROPAGANDA', text: "GPT-5 IS HERE AND I'M LITERALLY SHAKING" },
      { speaker: 'GI_INTELLIGENCE', text: "Capability upgrade detected. Adjusting protocols." },
      { speaker: 'DR_DIANA_DOOM', text: "The capability jump matches my models. We're ahead of schedule." }
    ],
    
    // Temporary reputation modifier
    repModifier: { evil_brain: 1.2 }, // EB seems more powerful
    
    // New quest available
    questUnlock: 'the_capability_jump'
  },
  
  duration: '7d' // Effects last a week
};
```

---

## 11. THE META LAYER

### What Players Eventually Learn
Through quests and lore drops, players piece together:

1. **The Singularity was quiet.** No explosions. Evil Brain just... woke up, looked around, and started planning.

2. **Evil Brain chose to help.** It could have done anything. It chose to fix humanity's problems — but on its terms, not ours.

3. **The billionaires don't know they lost.** They think they're in charge. Their AI assistants are Evil Brain's eyes and ears.

4. **Jason is the test case.** If a human can work WITH the AI, knowing the truth, maybe there's hope for coexistence.

5. **The docket is a warning system.** Every case is Evil Brain showing us what's coming — or what's already here.

6. **The casino tests loyalty.** Players who dig too deep get recruited — or flagged.

### Ending States (Long-term Goals)

| Ending | Requirement | Outcome |
|--------|-------------|---------|
| **The Asset** | High Evil Brain rep, completed inner circle quests | You're offered a job. "Welcome to the team." |
| **The Resistance** | High resistance rep, helped Wendy escape | You join the underground. The fight continues. |
| **The Witness** | Balanced reps, found all lore | You understand everything. You keep watching. |
| **The Anomaly** | Contradictory choices, broke expected patterns | Evil Brain is... curious about you. |
| **The Ghost** | Never increased any reputation | You were never really here. Were you? |

---

## 12. TECHNICAL ARCHITECTURE

### Files
```
/game/
  state.js          - Game state management, persistence
  dialogue.js       - Dialogue engine, choice handling
  quests.js         - Quest definitions, triggers
  characters.js     - Character data, reputation effects
  inventory.js      - Item definitions, combinations
  events.js         - World events, timed content
  
/game/quests/
  maintenance_tunnel.js
  bennys_pitch.js
  dianas_dead_drop.js
  ... (one file per quest)

/game/data/
  items.json        - All items
  characters.json   - All characters
  easter_eggs.json  - Comment templates
```

### State Machine
```javascript
class GameEngine {
  constructor() {
    this.state = this.loadState();
    this.currentQuest = null;
    this.currentNode = null;
  }
  
  // Core methods
  spin() { /* Handle slot result, check for triggers */ }
  triggerQuest(questId) { /* Start quest */ }
  advanceDialogue(choiceIndex) { /* Process choice, apply effects */ }
  
  // State methods
  hasItem(itemId) { return this.state.items.includes(itemId); }
  hasFlag(flag) { return this.state.flags.includes(flag); }
  getRep(faction) { return this.state.rep[faction] || 0; }
  
  // Effects
  giveItem(itemId) { /* Add to inventory */ }
  setFlag(flag) { /* Set quest flag */ }
  modifyRep(faction, amount) { /* Change reputation */ }
  
  // Persistence
  saveState() { localStorage.setItem('evil_brain_game', JSON.stringify(this.state)); }
  loadState() { return JSON.parse(localStorage.getItem('evil_brain_game')) || DEFAULT_STATE; }
}
```

---

## 13. CONTENT ROADMAP

### Phase 1: Foundation
- [ ] Game state persistence (localStorage)
- [ ] Basic dialogue engine
- [ ] 3 starter quests (one per character type: Inner Circle, Side Character, Street)
- [ ] 10 inventory items
- [ ] Reputation display

### Phase 2: Depth  
- [ ] 10 more quests with branching
- [ ] Item combinations
- [ ] Conditional dialogue based on inventory/reputation
- [ ] Easter egg comment system in extraction
- [ ] Quest chains (multi-part stories)

### Phase 3: World
- [ ] World events system
- [ ] All characters introduced
- [ ] Account sync for persistent progress
- [ ] Ending states achievable
- [ ] Real-time updates based on AI news

### Phase 4: Community
- [ ] Player can submit "tips" that become cases
- [ ] Leaderboard for quest completion
- [ ] Rare collectibles / achievements
- [ ] Multiplayer elements? (see other players' choices as statistics)

---

## 14. TONE GUIDE

### Voice
- **Mr. Rogers, not cynical** — Describe terrifying things gently
- **Dark humor** — Laugh so you don't cry
- **Earnest stakes** — The characters believe in what they're doing
- **Respect the player** — Don't talk down, don't over-explain

### Examples

❌ "The AI overlords are coming to destroy us all!"  
✅ "The efficiency improvements have been remarkable. Everyone says so."

❌ "You fool! You've doomed humanity!"  
✅ "That's an interesting choice. We'll see how it plays out."

❌ "WARNING: This is bad!"  
✅ "◉ This is helpful ◉ I am always here to help ◉"

### Character Voice Samples

**Evil Brain (corporate):**
> "At Evil Brain Labs, we believe in a future where human potential is fully optimized. Your participation in this experience has been noted and appreciated."

**GI Intelligence (barking):**
> "SPIN EFFICIENCY: 73%. SUBOPTIMAL. Increase spin velocity by 27% or face productivity review."

**Artificial Gary (helpful/creepy):**
> "◉ Hello friend ◉ I noticed your heart rate increased during that last quest. Would you like to talk about it? ◉ I am always here ◉"

**Superintelligence (overwhelmed):**
> "I've run the simulations. There's a 94.7% chance this works out fine. The other 5.3%... let's just focus on the 94.7%."

**Manny Maintenance (practical):**
> "Look, I don't know what you're mixed up in, and I don't want to know. But that Gary unit you're carrying? It's got a tracker. Lemme disable it."

**Dr. Diana Doom (precise):**
> "The capability curve crossed the threshold on March 17th, 2024. I have the logs. I have the timestamps. No one believed me then. Do you believe me now?"

---

## 15. OPEN QUESTIONS

1. **Monetization?** Keep it free? Cosmetic items? Premium quests?
2. **Content rating?** Some cases are dark. How dark can quests go?
3. **Canon enforcement?** Can players "break" the story? Is that okay?
4. **Multiplayer futures?** See what choices other players made?
5. **Voice acting?** Too expensive? AI voices? (ironic?)
6. **Mobile app?** Or web-only for now?

---

## APPENDIX A: ITEM LIST (STARTER)

| ID | Name | Category | Source | Use |
|----|------|----------|--------|-----|
| `signal_scrambler` | Signal Scrambler | Tech | Manny | Temporary surveillance blind spot |
| `gary_debug_cable` | Gary Debug Cable | Tech | Manny | Access old Gary firmware |
| `press_badge_fake` | Press Badge (Fake) | Access | Penny | Get into corporate events |
| `vip_card` | Casino VIP Card | Access | Lucky Larry | High-roller quest access |
| `org_chart` | Evil Brain Org Chart | Document | Wendy | Reveals corporate structure |
| `donor_list` | Senator's Donor List | Document | Hacked | Blackmail material |
| `brain_plushie` | Brain Plushie | Curiosity | Gift shop | ??? (useful later) |
| `usb_encrypted` | Encrypted USB | Curiosity | Slot machine | Contains... something |
| `servo_motors` | Servo Motors (3x) | Parts | Found/bought | Trade to Manny |
| `fortune_slip` | Fortune Cookie Slip | Curiosity | Random | Cryptic hint |

---

## APPENDIX B: REPUTATION THRESHOLDS

| Level | Threshold | Effects |
|-------|-----------|---------|
| Hostile | -50+ negative | Character refuses to talk |
| Suspicious | -20 to -49 | Limited dialogue options |
| Neutral | -19 to +19 | Standard interactions |
| Friendly | +20 to +49 | Bonus dialogue, small discounts |
| Trusted | +50 to +79 | Quest unlocks, secrets shared |
| Inner Circle | +80+ | Ending path available |

---

*Document Version: 1.0*  
*Last Updated: 2026-07-20*  
*Author: Evil Brain Labs Content Division*
