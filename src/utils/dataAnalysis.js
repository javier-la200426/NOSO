// Data analysis utilities for call transcript

// Format milliseconds to MM:SS
export const formatTime = (ms) => {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

// Format milliseconds to minutes with decimal
export const formatMinutes = (ms) => {
  return (ms / 1000 / 60).toFixed(1);
};

// Calculate call time boundaries from sentences
export const getCallBoundaries = (sentences) => {
  if (!sentences || sentences.length === 0) return { start: 0, end: 0, duration: 0 };
  const start = sentences[0].start;
  const end = sentences[sentences.length - 1].end;
  return { start, end, duration: end - start };
};

// Calculate call statistics
export const calculateStats = (sentences) => {
  if (!sentences || sentences.length === 0) return null;
  
  const speakerA = sentences.filter(s => s.speaker === 'A');
  const speakerB = sentences.filter(s => s.speaker === 'B');
  
  const calcDuration = (items) => items.reduce((sum, s) => sum + (s.end - s.start), 0);
  
  const aTime = calcDuration(speakerA);
  const bTime = calcDuration(speakerB);
  const totalTalkTime = aTime + bTime;
  
  const confidences = sentences.map(s => s.confidence);
  const avgConfidence = confidences.reduce((a, b) => a + b, 0) / confidences.length;
  
  const { start, end, duration } = getCallBoundaries(sentences);
  
  return {
    totalSentences: sentences.length,
    speakerASentences: speakerA.length,
    speakerBSentences: speakerB.length,
    speakerATime: aTime,
    speakerBTime: bTime,
    speakerAPercent: ((aTime / totalTalkTime) * 100).toFixed(1),
    speakerBPercent: ((bTime / totalTalkTime) * 100).toFixed(1),
    callDuration: duration,
    callStart: start,
    callEnd: end,
    avgConfidence: (avgConfidence * 100).toFixed(1),
    lowConfidenceCount: sentences.filter(s => s.confidence < 0.7).length,
  };
};

// Keyword definitions with their relevance to sales/compliance
// Colors aligned with NOSO brand (no purple/pink)
export const KEYWORDS = {
  'heat pump': { category: 'product', color: '#059669' },
  'rebate': { category: 'incentive', color: '#d97706' },
  'financing': { category: 'sales', color: '#0d9488' },
  'warranty': { category: 'protection', color: '#0891b2' },
  'maintenance': { category: 'service', color: '#ea580c' },
  'efficiency': { category: 'benefit', color: '#0891b2' },
  'price': { category: 'cost', color: '#dc2626' },
  'energy star': { category: 'certification', color: '#059669' },
  'inverter': { category: 'technology', color: '#0d9488' },
};

// Count keyword mentions
export const countKeywords = (sentences) => {
  const counts = {};
  Object.keys(KEYWORDS).forEach(kw => {
    counts[kw] = {
      count: 0,
      mentions: [],
      ...KEYWORDS[kw],
    };
  });
  
  sentences.forEach((s, idx) => {
    const textLower = s.text.toLowerCase();
    Object.keys(KEYWORDS).forEach(kw => {
      if (textLower.includes(kw)) {
        counts[kw].count++;
        counts[kw].mentions.push({
          sentenceIdx: idx,
          time: s.start,
          speaker: s.speaker,
          text: s.text,
        });
      }
    });
  });
  
  return counts;
};

// Stage definitions with percentage-based boundaries (calculated from sentences data)
// Percentages represent approximate positions in the call timeline
// Each analysis item now includes citations array with EXACT text patterns from transcript
// Based on actual transcript content from Texttranscript.txt
const STAGE_DEFINITIONS = [
  {
    id: 'introduction',
    name: 'Introduction',
    icon: '👋',
    description: 'Greeting and rapport building',
    startPercent: 0,      // Start of call
    endPercent: 3.5,      // Extended to include rapport building (~first minute)
    score: 7,
    status: 'good',
    analysis: {
      strengths: [
        {
          text: 'Customer addressed by first name ("Hey, Luis")',
          citations: ['Hey, Luis'],
        },
        {
          text: 'Explained reason for delay proactively',
          citations: ['reason that took so long', 'built all your equipment options'],
        },
        {
          text: 'Asked about customer\'s day to build rapport',
          citations: ['what are you up to for the rest of the day', 'keep working'],
        },
        {
          text: 'Related personally to customer\'s work-from-home situation',
          citations: ['work from home', 'work from anywhere'],
        },
      ],
      gaps: [
        {
          text: 'No formal company introduction',
          citations: [], // No evidence - this is a gap
        },
        {
          text: 'No clear statement of purpose for the call',
          citations: [], // No evidence - this is a gap
        },
      ],
      keyQuote: "Hey, Luis. Got you all done. The reason that took so long is I just kind of also built all your equipment options when I was out there too.",
    },
  },
  {
    id: 'diagnosis',
    name: 'Problem Diagnosis',
    icon: '🔍',
    description: 'Understanding the HVAC issue',
    startPercent: 3.5,
    endPercent: 5.5,
    score: 8,
    status: 'good',
    analysis: {
      strengths: [
        {
          text: 'Shared specific temperature measurements',
          citations: ['20 degree difference', 'below freezing', '41'],
        },
        {
          text: 'Honest about repair being temporary',
          citations: ['Bandaid', 'Definitely'],
        },
        {
          text: 'Clear timeline expectations (1-2 months)',
          citations: ['month to two months', 'efficiency drop again'],
        },
        {
          text: 'Mentioned mold issues as additional concern',
          citations: ['mold issues'],
        },
        {
          text: 'Acknowledged system age honestly',
          citations: ['It is old', 'old unit'],
        },
      ],
      gaps: [
        {
          text: "Didn't ask customer about symptoms or history",
          citations: [], // No evidence - this is a gap
        },
      ],
      keyQuote: "It is old... when it comes to just what to expect here in the future, I would say month to two months. I think we'll start to see the efficiency drop again.",
    },
  },
  {
    id: 'solution',
    name: 'Solution Explanation',
    icon: '💡',
    description: 'Explaining equipment options',
    startPercent: 5.5,
    endPercent: 45,
    score: 9,
    status: 'excellent',
    analysis: {
      strengths: [
        {
          text: 'Natural rapport moment with cats discussion',
          citations: ['Who is this', 'Michelangelo', 'I love cats', 'two cats'],
        },
        {
          text: 'Presented 4 equipment options: like-for-like, gas upgrade, and 2 heat pumps',
          citations: ['total of four that I built', 'replace like for like', 'maintaining gas heating', 'two different types of heat pumps'],
        },
        {
          text: 'Explained gas phase-out context',
          citations: ['gas phase out', 'being phased out', 'California\'s goal'],
        },
        {
          text: 'Made heat pumps financially attractive',
          citations: ['rebates', 'affordable', 'quite affordable at the moment'],
        },
        {
          text: 'Detailed installation process thoroughly',
          citations: ['AC removal', 'dispose of your furnace', 'sheet metal', 'electrical'],
        },
        {
          text: 'Explained R32 refrigerant benefits',
          citations: ['R32', 'refrigerant got phased out', 'better for the environment'],
        },
        {
          text: 'Used customer\'s mini-split to explain inverter technology',
          citations: ['saw your mini split', 'mimics that technology', 'same type of inverter technology', 'ramps up and ramps down'],
        },
        {
          text: 'Explained SVCE rebate ($2,500)',
          citations: ['Silicon Valley Clean Energy', '$2,500 off towards heat pump'],
        },
        {
          text: 'Explained Tech rebate ($1,500)',
          citations: ['tech which is one that just barely got reintroduced', 'removing both a furnace and AC'],
        },
      ],
      gaps: [
        {
          text: 'Maintenance plan mentioned only once, very briefly (no pricing, no details)',
          citations: ['maintenance program', 'match the manufacturer warranties'],
        },
        {
          text: 'Very lengthy explanation may be overwhelming',
          citations: ['really lengthy section'],
        },
        {
          text: 'Talk time heavily technician-dominated',
          citations: [], // This is a calculated metric, not a quote
        },
      ],
      keyQuote: "Heat pumps actually just got introduced some more rebates. So even though those are the best possible system to install, weirdly enough, those are actually getting quite affordable at the moment.",
    },
  },
  {
    id: 'upsell',
    name: 'Upsell Attempts',
    icon: '📈',
    description: 'Presenting additional options & upgrades',
    startPercent: 45,
    endPercent: 75,
    score: 9,
    status: 'excellent',
    analysis: {
      strengths: [
        {
          text: 'Addressed attic vs closet installation trade-offs',
          citations: ['attic package', 'keep it in the closet', 'moving it to the attic', 'full closet'],
        },
        {
          text: 'Connected features to customer concerns (noise reduction)',
          citations: ['noise', 'quieter', '20% quieter', 'makes it a lot quieter'],
        },
        {
          text: 'Created custom Bosch option based on customer preference',
          citations: ['Bosch', 'highly reviewed from technicians', 'very reliable'],
        },
        {
          text: 'Explained Energy Star tax credit ($1-2K)',
          citations: ['Energy Star', 'tax cut rebate', 'qualify you for one further rebate'],
        },
      ],
      gaps: [
        {
          text: 'Could have asked more questions to understand preferences',
          citations: [], // This is a gap - observation
        },
      ],
      keyQuote: "I'm not interested on the gas... I would be interested on the heat pump. Maybe these two.",
    },
  },
  {
    id: 'decision',
    name: 'Customer Decision & Financing',
    icon: '💳',
    description: 'Customer preference and payment options',
    startPercent: 75,
    endPercent: 82,
    score: 8,
    status: 'good',
    analysis: {
      strengths: [
        {
          text: 'Customer clearly stated preference: heat pump over gas',
          citations: ['interested on the heat pump', 'not interested on the gas', 'these two'],
        },
        {
          text: 'Explained installation timeline (2-3 days for heat pump)',
          citations: ['two or three days', 'lot of work that goes into a heat pump'],
        },
        {
          text: 'Presented multiple financing options',
          citations: ['120 month', '180', '12 months, no interest', 'pay it off in 12 months'],
        },
        {
          text: 'Mentioned duct sealing promotion',
          citations: ['duct sealing', 'promotion'],
        },
      ],
      gaps: [
        {
          text: 'Maintenance plan NOT discussed in this section (only briefly mentioned earlier at 28%)',
          citations: [], // Key finding - maintenance was skipped
        },
        {
          text: 'Could have revisited maintenance plan when discussing warranties',
          citations: [], // Missed opportunity
        },
      ],
      keyQuote: "I'm not interested on the gas... I would be interested on the heat pump. Maybe these two.",
    },
  },
  {
    id: 'closing',
    name: 'Closing & Thank You',
    icon: '🤝',
    description: 'Wrapping up the call',
    startPercent: 82,
    endPercent: 100,
    score: 6,
    status: 'partial',
    analysis: {
      strengths: [
        {
          text: 'Customer confirmed value proposition (quieter, more efficient, no gas leaks)',
          citations: ['quieter and more efficient', 'not having gas leaks'],
        },
        {
          text: 'Detailed financing breakdown (60mo @ 5.99%, 12mo no interest)',
          citations: ['60 months', '5 year', '12 payments', 'no interest'],
        },
        {
          text: 'Referenced 3-day right to cancel for reassurance',
          citations: ['three day right to cancel', 'reputable'],
        },
        {
          text: 'Offered to clean up and email estimates (Bryant and Bosch)',
          citations: ['pretty his estimates up', 'send it to you', 'Bryant and the Bosch'],
        },
        {
          text: 'Secured $1,000 down payment successfully',
          citations: ['$1,000', '1,000 for today', 'MasterCard'],
        },
      ],
      gaps: [
        {
          text: 'Pushed for commitment after customer wanted to consult wife (worked, but borderline)',
          citations: ['speak with my wife', 'won\'t do that today', '$1,000 for today'],
        },
        {
          text: 'No formal thank you expressed',
          citations: [], // No evidence - this is a gap
        },
        {
          text: "Didn't offer to include wife in follow-up communication",
          citations: ['speak with my wife', 'discuss this with my wife'],
        },
      ],
      keyQuote: "No, we won't do that today. Just send me the, I'll talk to her and then we'll make a decision.",
    },
  },
];

// Find sentences matching citation patterns
export const findCitationMatches = (sentences, citations) => {
  if (!citations || citations.length === 0 || !sentences) return [];
  
  const matches = [];
  const seenIndices = new Set();
  
  sentences.forEach((sentence, idx) => {
    const textLower = sentence.text.toLowerCase();
    for (const citation of citations) {
      if (textLower.includes(citation.toLowerCase()) && !seenIndices.has(idx)) {
        matches.push({
          sentenceIdx: idx,
          sentence,
          matchedPattern: citation,
        });
        seenIndices.add(idx);
        break; // Only count each sentence once
      }
    }
  });
  
  // Sort by sentence index (chronological order)
  return matches.sort((a, b) => a.sentenceIdx - b.sentenceIdx);
};

// Generate CALL_STAGES with actual timestamps from sentences data
export const generateCallStages = (sentences) => {
  if (!sentences || sentences.length === 0) return STAGE_DEFINITIONS;
  
  const { start, duration } = getCallBoundaries(sentences);
  
  return STAGE_DEFINITIONS.map(stage => ({
    ...stage,
    startTime: Math.round(start + (duration * stage.startPercent / 100)),
    endTime: Math.round(start + (duration * stage.endPercent / 100)),
  }));
};

// Default export for backwards compatibility (uses percentage-based defaults)
export const CALL_STAGES = STAGE_DEFINITIONS.map(stage => ({
  ...stage,
  // These will be overwritten when generateCallStages is called with actual data
  startTime: 0,
  endTime: 0,
}));

// Get stage for a given timestamp
export const getStageForTime = (timestamp, stages) => {
  const stageList = stages || CALL_STAGES;
  for (const stage of stageList) {
    if (timestamp >= stage.startTime && timestamp < stage.endTime) {
      return stage;
    }
  }
  return stageList[stageList.length - 1];
};

// Group sentences by stage (dynamically calculated)
export const groupSentencesByStage = (sentences) => {
  if (!sentences || sentences.length === 0) return {};
  
  // Generate stages with actual timestamps from the sentences data
  const stages = generateCallStages(sentences);
  
  const groups = {};
  stages.forEach(stage => {
    groups[stage.id] = {
      ...stage,
      sentences: sentences.filter(s => s.start >= stage.startTime && s.start < stage.endTime),
    };
  });
  return groups;
};

// Get confidence level classification
export const getConfidenceLevel = (confidence) => {
  if (confidence >= 0.9) return { level: 'high', label: 'High', color: '#10b981' };
  if (confidence >= 0.7) return { level: 'medium', label: 'Medium', color: '#f59e0b' };
  return { level: 'low', label: 'Low', color: '#ef4444' };
};

// Overall call assessment
export const CALL_ASSESSMENT = {
  callType: 'Post-Repair Sales Consultation',
  overallScore: 7.8,
  summary: "Highly effective sales consultation following a diagnostic visit. Tech converted a $1,900 repair into a $1,000 deposit toward a ~$22k heat pump system. Customer's main concern (noise) was addressed with inverter technology and Bosch upward-venting option. Successfully secured commitment despite customer wanting to consult wife first.",
  callContext: {
    priorVisit: 'Diagnostic + refrigerant recharge ("bandaid" fix)',
    repairCost: '$1,900',
    depositCollected: '$1,000',
    repairWaived: true,
    customerConcern: 'Noise from current closet unit',
  },
  optionsPresented: [
    { name: 'Like-for-like', type: 'Gas furnace + AC', status: 'rejected' },
    { name: 'High-efficiency gas', type: 'Gas furnace + AC', status: 'rejected (most expensive)' },
    { name: 'Bryant heat pump', type: 'Heat pump', status: 'finalist (best defrost)' },
    { name: 'Bosch heat pump', type: 'Heat pump', status: 'finalist (preferred - vents upward)' },
  ],
  rebatesExplained: {
    copperLineReuse: '$1,800',
    svce: '$2,500',
    tech: '$1,500 (requires HERS test)',
    energyStar: '$1,000-$2,000 (customer handles)',
    ductSealingPromo: 'Free (included for HERS test)',
  },
  closingStructure: {
    deposit: '$1,000',
    repairWaived: '$1,900 repair becomes complimentary',
    cancellationWindow: '3-day right to cancel',
    creditWindow: '15 days to credit toward purchase',
    estimatesSent: 'Bryant and Bosch only (gas options eliminated)',
  },
  topStrengths: [
    'Exceptional product knowledge across multiple equipment types',
    'Adaptive selling - built custom Bosch option for upward airflow preference',
    'Thorough rebate education ($5,800+ in potential savings)',
    'Addressed noise concern with inverter technology',
    'Clever closing: converted hesitation into $1,000 commitment',
  ],
  areasForImprovement: [
    'No formal company introduction',
    'Maintenance plan mentioned only once (no pricing/details)',
    'Could have offered to include wife on follow-up email/call',
    'No referral ask',
  ],
  salesInsights: {
    taken: [
      'Equipment upgrade pitch - 4 options → narrowed to 2 heat pumps',
      'Rebate education - $5,800+ explained (SVCE + Tech + Energy Star + copper)',
      'Financing options - 12mo/60mo/120mo/180mo terms presented',
      'Noise concern addressed with inverter tech + grill swap option',
      'Built custom Bosch option based on airflow preference',
      'Converted $1,900 repair into deposit opportunity',
    ],
    missed: [
      'Full maintenance plan presentation',
      'Wife involvement in follow-up',
      'Referral ask',
      'Timeline urgency (rebate deadlines)',
    ],
  },
};
