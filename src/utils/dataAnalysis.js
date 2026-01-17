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
          text: 'Presented 4 comprehensive equipment options',
          citations: ['total of four', 'like for like', 'gas heating', 'heat pump'],
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
      ],
      gaps: [
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
          text: 'Explained inverter technology with mini-split comparison',
          citations: ['inverter', 'mini split', 'ductless', 'ramps up and ramps down'],
        },
        {
          text: 'Connected features to customer concerns (noise reduction)',
          citations: ['noise', 'quieter', 'much, much, much, much better', '20% quieter'],
        },
        {
          text: 'Explained SVCE rebate ($2,500)',
          citations: ['Silicon Valley Clean Energy', '2,500 off'],
        },
        {
          text: 'Explained Tech rebate ($1,500)',
          citations: ['tech', '1500 off', 'removing both a furnace and AC'],
        },
        {
          text: 'Created custom Bosch option based on customer preference',
          citations: ['Bosch', 'airflow up', 'modify this estimate'],
        },
        {
          text: 'Explained Energy Star tax credit ($1-2K)',
          citations: ['Energy Star', 'tax cut rebate', 'thousand dollars or $2,000'],
        },
        {
          text: 'Addressed attic vs closet installation trade-offs',
          citations: ['attic', 'closet', 'serviceability', 'efficiency'],
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
    id: 'maintenance',
    name: 'Maintenance Plan',
    icon: '🔧',
    description: 'Service agreement offerings',
    startPercent: 75,
    endPercent: 82,
    score: 5,
    status: 'missed',
    analysis: {
      strengths: [
        {
          text: 'Tied maintenance to warranty matching',
          citations: ['maintenance program', 'match the manufacturer warranties', '10 years parts'],
        },
      ],
      gaps: [
        {
          text: 'Maintenance plan mentioned only once, briefly',
          citations: [], // Observation - mentioned once at line 71
        },
        {
          text: 'No explanation of what maintenance plan includes',
          citations: [], // No evidence - this is a gap
        },
        {
          text: 'No pricing presented for maintenance plan',
          citations: [], // No evidence - this is a gap
        },
        {
          text: 'No follow-up or soft close on maintenance offer',
          citations: [], // No evidence - this is a gap
        },
      ],
      keyQuote: "If you're on this maintenance program with us, we actually completely match the manufacturer warranties.",
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
          text: 'Customer expressed interest in heat pump options',
          citations: ['interested on the heat pump', 'these two', 'not interested on the gas'],
        },
        {
          text: 'Presented multiple financing options',
          citations: ['financing', '120 month', '180', '12 months, no interest', '60 months'],
        },
        {
          text: 'Referenced 3-day right to cancel for reassurance',
          citations: ['three day right to cancel'],
        },
        {
          text: 'Offered to clean up and email estimates',
          citations: ['pretty his estimates up', 'send it to you'],
        },
        {
          text: 'Secured $1,000 down payment',
          citations: ['$1,000', 'thousand', 'down payment'],
        },
      ],
      gaps: [
        {
          text: 'Persisted after customer said "no" to signing today',
          citations: ['won\'t do that today', 'talk to her', 'make a decision'],
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
  overallScore: 7.2,
  summary: "This was a highly effective sales consultation call. The technician demonstrated exceptional product knowledge, adapted to customer preferences in real-time, and successfully moved the customer from a 'maybe' to a $1,000 commitment.",
  topStrengths: [
    'Exceptional product knowledge across multiple equipment types',
    'Adaptive selling - customized Bosch option based on customer preference',
    'Thorough rebate and financing explanation ($4,000+ in savings)',
    'Successfully secured commitment despite initial hesitation',
  ],
  areasForImprovement: [
    'Formal introduction with company name',
    'Full maintenance plan presentation',
    'Gracious closing without persistence after "no"',
    'Include spouse in follow-up communication',
  ],
  salesInsights: {
    taken: [
      'Equipment upgrade pitch - 4 options narrowed to 2',
      'Rebate education - $4,000+ explained',
      'Financing options - multiple terms presented',
      'Addressed noise concerns with inverter tech',
      'Built custom option (Bosch) for customer preference',
    ],
    missed: [
      'Maintenance plan presentation',
      'Wife involvement in decision',
      'Referral ask',
      'Timeline urgency with rebate deadlines',
    ],
  },
};
