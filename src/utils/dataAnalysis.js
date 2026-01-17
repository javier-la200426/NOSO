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
    score: 8,
    status: 'good',
    analysis: {
      strengths: [
        {
          text: 'Customer addressed by first name ("Hey, Luis")',
          citations: ['Hey, Luis'],
        },
        {
          text: 'Context-appropriate greeting for follow-up visit (no awkward re-introduction)',
          citations: ['Got you all done'],
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
        {
          text: 'Shared specific temperature measurements from diagnosis',
          citations: ['below freezing temperature at 41', '20 degree difference'],
        },
      ],
      gaps: [
        {
          text: 'Could have briefly recapped what was done during the service visit',
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
          citations: [], // Observation, not a specific quote
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
      keyQuote: "I can build a form of inverter that does do that... The brand is Bosch. Very highly reviewed from technicians... they're very reliable.",
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
          text: 'Maintenance plan NOT discussed in this section (only briefly mentioned earlier at time 9:17)',
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
    score: 5,
    status: 'partial',
    analysis: {
      strengths: [
        {
          text: 'Customer confirmed value proposition (quieter, more efficient, no gas leaks)',
          citations: ['quieter and more efficient', 'not having gas leaks'],
        },
        {
          text: 'Detailed financing breakdown',
          citations: ['60 months', '5 year', '12 payments', 'no interest'],
        },
        {
          text: 'Offered to clean up and email estimates (Bryant and Bosch)',
          citations: ['pretty his estimates up', 'send it to you', 'Bryant and the Bosch'],
        },
        {
          text: 'Offered 15-day credit window for repair payment toward replacement',
          citations: ['within 15 days I will completely credit that back'],
        },
        {
          text: 'Professional handling of customer\'s deferral',
          citations: ['Absolutely'],
        },
      ],
      gaps: [
        {
          text: 'Failed to secure commitment - customer explicitly declined',
          citations: ['No, we won\'t do that today', 'speak with my wife'],
        },
        {
          text: 'No deposit obtained (repair payment only, not commitment)',
          citations: ['won\'t do that today', 'Just send me'],
        },
        {
          text: 'No follow-up meeting scheduled with customer + wife',
          citations: ['speak with my wife', 'discuss this with my wife'],
        },
        {
          text: 'No formal thank you expressed',
          citations: [], // No evidence - this is a gap
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
  callType: {
    primary: 'Follow-up sales consultation after repair visit',
    description: 'Originally a diagnostic/repair visit that evolved into an equipment replacement consultation for heat pump installation.',
  },
  overallScore: 7.2,
  summary: "Strong sales consultation that generated genuine interest but no commitment. Tech attempted to convert the repair into a deposit, but customer declined: 'No, we won't do that today.' Customer paid for the repair only and will discuss options with wife. Tech narrowed choices to 2 heat pumps (Bryant & Bosch) and will email estimates.",
  callContext: {
    priorVisit: 'Diagnostic + refrigerant recharge:',
    priorVisitNote: '"bandaid" fix',
    repairPayment: '~$1,009 (collected for repair)',
    repairPaymentNote: 'Customer paid for repair; tech offered 15-day credit toward replacement if signed',
    depositCollected: false,
    commitmentObtained: false,
    customerConcern: 'Noise from current closet unit',
  },
  optionsPresented: [
    { name: 'Like-for-like', type: 'Gas furnace + AC', status: 'rejected' },
    { name: 'High-efficiency gas', type: 'Gas furnace + AC', status: 'rejected (most expensive)' },
    { name: 'Bryant heat pump', type: 'Heat pump', status: 'finalist (best defrost)' },
    { name: 'Bosch heat pump', type: 'Heat pump', status: 'finalist (preferred - vents upward)' },
  ],
  verifiedPricing: {
    note: 'Exact prices shown on screen, not verbalized. Pricing inferred from financing discussion:',
    estimatedSystemPrice: '~$26,422',
    evidence: [
      { line: 223, quote: '"$18,000 down... remaining balance of $8,422"', calc: '$18,000 + $8,422 = $26,422' },
      { line: 219, quote: '"A little bit over $2,000/month" for 12 payments', calc: '~$24,000+ (no-interest path)' },
      { line: 209, quote: '"5 year 335"', calc: '$335 × 60 = $20,100 (includes 5.99% interest)' },
    ],
    monthlyPayment: '$335/mo for 60 months @ 5.99%',
  },
  rebatesExplained: {
    copperLineReuse: '$1,800',
    svce: '$2,500',
    tech: '$1,500 (requires HERS test)',
    energyStar: '$1,000-$2,000 (customer handles)',
    ductSealingPromo: 'Free (included for HERS test)',
  },
  closingStructure: {
    repairPayment: '~$1,009 (diagnostic + refrigerant recharge)',
    commitment: 'None - customer explicitly declined ("No, we won\'t do that today")',
    creditOffer: 'Tech offered 15-day window to credit repair toward replacement',
    nextStep: 'Estimates emailed (Bryant & Bosch); customer to discuss with wife',
    contractSigned: false,
  },
  topStrengths: [
    'Exceptional product knowledge across multiple equipment types',
    'Adaptive selling - built custom Bosch option for upward airflow preference',
    'Thorough rebate education ($5,800+ in potential savings)',
    'Addressed noise concern with inverter technology',
    'Successfully narrowed 4 options to 2 customer-preferred heat pumps',
    'Professional handling of customer\'s deferral',
  ],
  areasForImprovement: [
    'Failed to secure commitment or deposit',
    'Customer declined "waive repair for deposit" offer',
    'No follow-up meeting scheduled with customer + wife',
    'Could have offered to include wife on a call',
    'No formal company introduction',
    'Maintenance plan mentioned only once (no pricing/details)',
    'No referral ask',
  ],
  salesInsights: {
    taken: [
      'Equipment upgrade pitch - 4 options → narrowed to 2 heat pumps',
      'Rebate education - $5,800+ explained (SVCE + Tech + Energy Star + copper)',
      'Financing options - 12mo/60mo/120mo/180mo terms presented',
      'Noise concern addressed with inverter tech + grill swap option',
      'Built custom Bosch option based on airflow preference',
      'Offered 15-day credit window for repair payment',
    ],
    missed: [
      'Closing the sale - customer explicitly declined commitment',
      'Scheduling follow-up meeting with customer + wife',
      'Full maintenance plan presentation',
      'Timeline urgency (rebate deadlines)',
      'Referral ask',
    ],
  },
};
