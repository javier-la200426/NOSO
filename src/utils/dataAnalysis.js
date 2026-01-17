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
// Each analysis item now includes citations array with text patterns to match in transcript
const STAGE_DEFINITIONS = [
  {
    id: 'introduction',
    name: 'Introduction',
    icon: '👋',
    description: 'Greeting and rapport building',
    startPercent: 0,      // Start of call
    endPercent: 1.4,      // ~first 1.4% of call
    score: 6,
    status: 'partial',
    analysis: {
      strengths: [
        {
          text: 'Customer addressed by first name ("Hey, Luis")',
          citations: ['Hey, Luis'],
        },
        {
          text: 'Warm, conversational tone throughout',
          citations: ['Got you all done', 'built all your equipment options'],
        },
        {
          text: 'Natural rapport building (cats discussion, work-from-home chat)',
          citations: ['work from home', 'cats', 'I know this is not like a sales call'],
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
        {
          text: 'Jumped directly into technical discussion',
          citations: ['built all your equipment options when I was out there'],
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
    startPercent: 1.4,
    endPercent: 3.8,
    score: 8,
    status: 'good',
    analysis: {
      strengths: [
        {
          text: 'Specific technical measurements shared (temperature differentials)',
          citations: ['temperature differential', 'degrees coming out', '19 degrees'],
        },
        {
          text: 'Honest about repair being temporary ("bandaid")',
          citations: ['bandaid', 'temporary'],
        },
        {
          text: 'Clear timeline expectations (1-2 months)',
          citations: ['month to two months', 'efficiency drop again'],
        },
        {
          text: 'Mentioned mold issues as additional concern',
          citations: ['mold', 'mold issues'],
        },
      ],
      gaps: [
        {
          text: "Didn't ask customer about symptoms or history",
          citations: [], // No evidence - this is a gap
        },
        {
          text: 'Assumed customer understood technical terms',
          citations: ['refrigerant', 'R32', 'inverter'],
        },
      ],
      keyQuote: "It is old... when it comes to just what to expect here in the future, I would say month to two months. I think we'll start to see the efficiency drop again. And we still have those mold issues.",
    },
  },
  {
    id: 'solution',
    name: 'Solution Explanation',
    icon: '💡',
    description: 'Explaining equipment options',
    startPercent: 3.8,
    endPercent: 44,
    score: 9,
    status: 'excellent',
    analysis: {
      strengths: [
        {
          text: 'Presented 4 comprehensive equipment options',
          citations: ['four options', 'Option one', 'option two', 'option three', 'option four'],
        },
        {
          text: 'Explained technical concepts (R32 refrigerant, inverter technology)',
          citations: ['R32', 'inverter', 'refrigerant'],
        },
        {
          text: 'Adapted in real-time to customer preferences',
          citations: ['If you want, I can build you a custom option', 'Bosch'],
        },
        {
          text: 'Used relatable analogies (mini-split comparison)',
          citations: ['mini split', 'ductless'],
        },
        {
          text: 'Honest about trade-offs (attic = less efficient but more space)',
          citations: ['attic', 'less efficient', 'garage space'],
        },
      ],
      gaps: [
        {
          text: 'Potentially overwhelming amount of information',
          citations: ['a lot of information', 'lot to take in'],
        },
        {
          text: 'Talk time heavily technician-dominated (89%)',
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
    startPercent: 44,
    endPercent: 78,
    score: 9,
    status: 'excellent',
    analysis: {
      strengths: [
        {
          text: 'Education-based selling, not pushy',
          citations: ['I\'m going to go over with you', 'let me explain', 'make sense'],
        },
        {
          text: 'Connected features to customer concerns (noise → inverter)',
          citations: ['noise', 'quiet', 'inverter', 'decibels'],
        },
        {
          text: 'Proactively addressed cost barriers with rebates/financing',
          citations: ['rebate', 'financing', 'affordable', 'monthly payment'],
        },
        {
          text: 'Successfully narrowed from 4 options to 2',
          citations: ['these two', 'not interested on the gas', 'heat pump'],
        },
        {
          text: 'Explained rebates: SVCE ($2,500), Tech ($1,500), Energy Star ($1-2K)',
          citations: ['SVCE', '2500', '1500', 'Energy Star', 'tech clean'],
        },
      ],
      gaps: [
        {
          text: 'Could have checked for understanding more frequently',
          citations: ['make sense', 'does that make sense'],
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
    startPercent: 78,
    endPercent: 83,
    score: 5,
    status: 'missed',
    analysis: {
      strengths: [
        {
          text: 'Tied maintenance to concrete benefit (warranty matching)',
          citations: ['maintenance program', 'match the manufacturer warranties', '10 years parts'],
        },
      ],
      gaps: [
        {
          text: 'Only mentioned maintenance plan ONCE, briefly',
          citations: ['maintenance program'],
        },
        {
          text: 'No explanation of what the plan includes',
          citations: [], // No evidence - this is a gap
        },
        {
          text: 'No pricing presented for maintenance plan',
          citations: [], // No evidence - this is a gap
        },
        {
          text: 'No follow-up or soft close on this offer',
          citations: [], // No evidence - this is a gap
        },
        {
          text: 'Missed opportunity given customer\'s reliability concerns',
          citations: ['reliable', 'last long', 'worry'],
        },
      ],
      keyQuote: "If you're on this maintenance program with us, we actually completely match the manufacturer warranties. It's essentially 10 years parts and 10 year manufacturer warranty.",
    },
  },
  {
    id: 'closing',
    name: 'Closing & Thank You',
    icon: '🤝',
    description: 'Wrapping up the call',
    startPercent: 83,
    endPercent: 100,
    score: 6,
    status: 'partial',
    analysis: {
      strengths: [
        {
          text: 'Secured $1,000 commitment',
          citations: ['1000', 'thousand', 'deposit'],
        },
        {
          text: 'Reduced options from 4 to 2 for clarity',
          citations: ['these two', 'narrow it down'],
        },
        {
          text: 'Referenced 3-day right to cancel as reassurance',
          citations: ['three day', 'cancel', 'right to cancel'],
        },
        {
          text: 'Promised to send cleaned-up estimates via email',
          citations: ['send', 'email', 'cleaned up'],
        },
      ],
      gaps: [
        {
          text: 'Persisted after customer initially said "no"',
          citations: ['won\'t do that today', 'talk to her', 'make a decision'],
        },
        {
          text: 'No formal thank you expressed',
          citations: [], // No evidence - this is a gap
        },
        {
          text: 'No clear follow-up timeline established',
          citations: [], // No evidence - this is a gap
        },
        {
          text: "Didn't offer to include wife in follow-up call",
          citations: ['wife', 'talk to her'],
        },
        {
          text: 'Ending felt slightly pressured rather than gracious',
          citations: ['we can just do it today', 'won\'t do that today'],
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
