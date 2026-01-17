import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import './App.css';
import logoNoso from './assets/LogoNoso.jpeg';
import {
  calculateStats,
  formatTime,
  formatMinutes,
  countKeywords,
  generateCallStages,
  groupSentencesByStage,
  findCitationMatches,
  KEYWORDS,
  CALL_ASSESSMENT,
} from './utils/dataAnalysis';

function App() {
  const [sentences, setSentences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeStage, setActiveStage] = useState('introduction');
  
  // Citation navigation state
  const [activeCitations, setActiveCitations] = useState(null); // { matches: [], currentIndex: 0, itemText: '' }
  const transcriptContainerRef = useRef(null);
  const sentenceRefs = useRef({});

  // Load transcript data
  useEffect(() => {
    fetch('/sentences.json')
      .then((res) => res.json())
      .then((data) => {
        setSentences(data.sentences);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error loading transcript:', err);
        setLoading(false);
      });
  }, []);

  // Calculate stats and groupings
  const stats = useMemo(() => calculateStats(sentences), [sentences]);
  const keywords = useMemo(() => countKeywords(sentences), [sentences]);
  const stageGroups = useMemo(() => groupSentencesByStage(sentences), [sentences]);
  
  // Generate stages with dynamic timestamps from sentences data
  const callStages = useMemo(() => generateCallStages(sentences), [sentences]);
  const currentStage = useMemo(
    () => callStages.find((s) => s.id === activeStage),
    [activeStage, callStages]
  );

  // Track if initial auto-selection has been done
  const initialSelectionDone = useRef(false);
  // Track if we should skip scrolling (for initial load)
  const skipNextScroll = useRef(true);
  
  // Auto-select first strength on initial load
  useEffect(() => {
    if (!loading && sentences.length > 0 && !initialSelectionDone.current) {
      initialSelectionDone.current = true;
      // Small delay to ensure all memoized values are computed
      setTimeout(() => {
        const stage = callStages.find((s) => s.id === activeStage);
        const stageSentences = stageGroups[activeStage]?.sentences || [];
        
        if (!stage || !stageSentences.length) return;
        
        for (const item of stage.analysis.strengths) {
          const itemData = typeof item === 'string' ? { text: item, citations: [] } : item;
          if (itemData.citations.length > 0) {
            const matches = [];
            const seenIndices = new Set();
            
            stageSentences.forEach((sentence) => {
              const textLower = sentence.text.toLowerCase();
              for (const citation of itemData.citations) {
                if (textLower.includes(citation.toLowerCase()) && !seenIndices.has(sentence.start)) {
                  const globalIdx = sentences.findIndex(s => s.start === sentence.start && s.text === sentence.text);
                  if (globalIdx !== -1) {
                    matches.push({ sentenceIdx: globalIdx, sentence, matchedPattern: citation });
                    seenIndices.add(sentence.start);
                  }
                  break;
                }
              }
            });
            
            matches.sort((a, b) => a.sentenceIdx - b.sentenceIdx);
            
            if (matches.length > 0) {
              setActiveCitations({ matches, currentIndex: 0, itemText: itemData.text });
              return;
            }
          }
        }
      }, 0);
    }
  }, [loading, sentences, callStages, stageGroups, activeStage]);

  // Highlight keywords in text
  const highlightKeywords = (text) => {
    let result = text;
    Object.entries(KEYWORDS).forEach(([kw, { color }]) => {
      const regex = new RegExp(`(${kw})`, 'gi');
      result = result.replace(
        regex,
        `<span class="keyword" style="background: ${color}22; color: ${color}">$1</span>`
      );
    });
    return result;
  };

  // Handle citation button click - only search within current stage's sentences
  const handleCitationClick = useCallback((citations, itemText) => {
    const stageSentences = stageGroups[activeStage]?.sentences || [];
    
    // Find matches within stage sentences, but track global indices for highlighting
    const matches = [];
    const seenIndices = new Set();
    
    stageSentences.forEach((sentence) => {
      const textLower = sentence.text.toLowerCase();
      for (const citation of citations) {
        if (textLower.includes(citation.toLowerCase()) && !seenIndices.has(sentence.start)) {
          // Find global index by matching start time and text
          const globalIdx = sentences.findIndex(s => s.start === sentence.start && s.text === sentence.text);
          if (globalIdx !== -1) {
            matches.push({
              sentenceIdx: globalIdx,
              sentence,
              matchedPattern: citation,
            });
            seenIndices.add(sentence.start);
          }
          break;
        }
      }
    });
    
    // Sort by sentence index (chronological order)
    matches.sort((a, b) => a.sentenceIdx - b.sentenceIdx);
    
    if (matches.length === 0) {
      // No matches found
      setActiveCitations(null);
      return;
    }
    
    setActiveCitations({
      matches,
      currentIndex: 0,
      itemText,
    });
  }, [sentences, stageGroups, activeStage]);

  // Navigate between citations
  const navigateCitation = useCallback((direction) => {
    if (!activeCitations) return;
    
    const newIndex = direction === 'next'
      ? (activeCitations.currentIndex + 1) % activeCitations.matches.length
      : (activeCitations.currentIndex - 1 + activeCitations.matches.length) % activeCitations.matches.length;
    
    setActiveCitations(prev => ({
      ...prev,
      currentIndex: newIndex,
    }));
  }, [activeCitations]);

  // Close citations
  const closeCitations = useCallback(() => {
    setActiveCitations(null);
  }, []);

  // Auto-scroll to highlighted sentence within transcript container only (skip on initial page load)
  useEffect(() => {
    if (activeCitations && activeCitations.matches.length > 0) {
      // Skip scrolling on initial page load
      if (skipNextScroll.current) {
        skipNextScroll.current = false;
        return;
      }
      
      const currentMatch = activeCitations.matches[activeCitations.currentIndex];
      const sentenceEl = sentenceRefs.current[currentMatch.sentenceIdx];
      const container = transcriptContainerRef.current;
      
      if (sentenceEl && container) {
        // Calculate scroll position to center the element within the transcript container only
        const containerRect = container.getBoundingClientRect();
        const sentenceRect = sentenceEl.getBoundingClientRect();
        
        // Calculate the offset relative to the container's scroll position
        const scrollTop = container.scrollTop + (sentenceRect.top - containerRect.top) - (containerRect.height / 2) + (sentenceRect.height / 2);
        
        container.scrollTo({
          top: scrollTop,
          behavior: 'smooth',
        });
      }
    }
  }, [activeCitations]);

  // Handle stage change and auto-select first strength item
  const handleStageChange = useCallback((stageId) => {
    setActiveStage(stageId);
    
    const stage = callStages.find((s) => s.id === stageId);
    const stageSentences = stageGroups[stageId]?.sentences || [];
    
    if (!stage || !stageSentences.length) {
      setActiveCitations(null);
      return;
    }
    
    // Find the first strength item with citations that has matches in this stage
    for (const item of stage.analysis.strengths) {
      const itemData = typeof item === 'string' ? { text: item, citations: [] } : item;
      if (itemData.citations.length > 0) {
        // Compute matches directly
        const matches = [];
        const seenIndices = new Set();
        
        stageSentences.forEach((sentence) => {
          const textLower = sentence.text.toLowerCase();
          for (const citation of itemData.citations) {
            if (textLower.includes(citation.toLowerCase()) && !seenIndices.has(sentence.start)) {
              const globalIdx = sentences.findIndex(s => s.start === sentence.start && s.text === sentence.text);
              if (globalIdx !== -1) {
                matches.push({
                  sentenceIdx: globalIdx,
                  sentence,
                  matchedPattern: citation,
                });
                seenIndices.add(sentence.start);
              }
              break;
            }
          }
        });
        
        matches.sort((a, b) => a.sentenceIdx - b.sentenceIdx);
        
        if (matches.length > 0) {
          setActiveCitations({
            matches,
            currentIndex: 0,
            itemText: itemData.text,
          });
          return;
        }
      }
    }
    
    // If no strengths have matches, clear citations
    setActiveCitations(null);
  }, [callStages, stageGroups, sentences]);

  // Check if a sentence is currently highlighted as a citation
  const isSentenceHighlighted = useCallback((globalSentenceIdx) => {
    if (!activeCitations) return false;
    return activeCitations.matches.some(m => m.sentenceIdx === globalSentenceIdx);
  }, [activeCitations]);

  // Check if a sentence is the current (focused) citation
  const isSentenceCurrent = useCallback((globalSentenceIdx) => {
    if (!activeCitations) return false;
    const currentMatch = activeCitations.matches[activeCitations.currentIndex];
    return currentMatch && currentMatch.sentenceIdx === globalSentenceIdx;
  }, [activeCitations]);

  // Get global sentence index from stage sentences
  const getGlobalSentenceIndex = useCallback((localIdx) => {
    const stageSentences = stageGroups[activeStage]?.sentences || [];
    if (localIdx >= stageSentences.length) return -1;
    const sentence = stageSentences[localIdx];
    return sentences.findIndex(s => s.start === sentence.start && s.text === sentence.text);
  }, [sentences, stageGroups, activeStage]);

  if (loading) {
    return (
      <div className="loading">
        <div className="loading-spinner" />
      </div>
    );
  }

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="header-content">
          <div className="header-left">
            <div 
              className="logo" 
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              style={{ cursor: 'pointer' }}
            >
              <img src={logoNoso} alt="NOSO Logo" className="logo-icon" />
              NOSO Call Analysis
            </div>
          </div>
        </div>
      </header>

      <main className="main-content">
        {/* Overall Assessment Section */}
        <section className="summary-section">
          <div className="summary-header">
            <div>
              <h2 style={{ marginBottom: 'var(--space-2)' }}>
                📊 Overall Assessment
              </h2>
              <p>{CALL_ASSESSMENT.summary}</p>
            </div>
            <div className="summary-score">
              <span className="summary-score-value">
                {CALL_ASSESSMENT.overallScore}
              </span>
              <span className="summary-score-max">/10</span>
            </div>
          </div>

          {/* Assessment Layout - Context on left, Scores on right */}
          <div className="assessment-layout">
            {/* Left column - Context cards 2x2 */}
            <div className="call-context-grid">
              <div className="context-card">
                <h4>🔧 Prior Visit</h4>
                <div className="context-detail">
                  <span>{CALL_ASSESSMENT.callContext.priorVisit}</span> <strong>{CALL_ASSESSMENT.callContext.priorVisitNote}</strong>
                </div>
                <div className="context-detail">
                  <span>Repair Cost:</span> <strong>{CALL_ASSESSMENT.callContext.repairCost}</strong>
                </div>
                <div className="context-detail">
                  <span>Customer Concern:</span> <strong>{CALL_ASSESSMENT.callContext.customerConcern}</strong>
                </div>
              </div>
              <div className="context-card">
                <h4>🏷️ Options Presented</h4>
                <ul className="options-list">
                  {CALL_ASSESSMENT.optionsPresented.map((opt, idx) => (
                    <li key={idx} className={opt.status.includes('finalist') ? 'finalist' : opt.status.includes('rejected') ? 'rejected' : ''}>
                      <span>{opt.name}:</span>
                      <strong className="option-status">{opt.status}</strong>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="context-card">
                <h4>💰 Rebates Explained</h4>
                <ul className="rebates-list">
                  <li><span>Copper line reuse:</span> <strong>{CALL_ASSESSMENT.rebatesExplained.copperLineReuse}</strong></li>
                  <li><span>SVCE:</span> <strong>{CALL_ASSESSMENT.rebatesExplained.svce}</strong></li>
                  <li><span>TECH:</span> <strong>{CALL_ASSESSMENT.rebatesExplained.tech}</strong></li>
                  <li><span>Energy Star:</span> <strong>{CALL_ASSESSMENT.rebatesExplained.energyStar}</strong></li>
                  <li><span>Duct sealing:</span> <strong>{CALL_ASSESSMENT.rebatesExplained.ductSealingPromo}</strong></li>
                </ul>
              </div>
              <div className="context-card highlight">
                <h4>🤝 Closing Structure</h4>
                <div className="closing-detail">
                  <span>Deposit Collected:</span> <strong style={{ color: 'var(--color-success)' }}>{CALL_ASSESSMENT.closingStructure.deposit}</strong>
                </div>
                <div className="closing-detail">
                  <span>Repair Waived:</span> <strong>{CALL_ASSESSMENT.closingStructure.repairWaived}</strong>
                </div>
                <div className="closing-detail">
                  <span>Cancel Window:</span> <strong>{CALL_ASSESSMENT.closingStructure.cancellationWindow}</strong>
                </div>
                <div className="closing-detail">
                  <span>Estimates Sent:</span> <strong>{CALL_ASSESSMENT.closingStructure.estimatesSent}</strong>
                </div>
              </div>
            </div>

            {/* Right column - Scorecard */}
            <div className="scorecard">
              {callStages.map((stage) => (
                <div key={stage.id} className={`scorecard-item ${stage.status}`}>
                  <span className="scorecard-icon">{stage.icon}</span>
                  <div className="scorecard-info">
                    <div className="scorecard-name">{stage.name}</div>
                    <div className="scorecard-score">{stage.score}/10</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Stats Strip */}
          <div className="stats-strip">
            <div className="stat-pill-group">
              <span className="stat-pill">📊 {stats?.totalSentences} sentences</span>
              <span className="stat-pill">⏱️ {formatMinutes(stats?.callDuration)}min</span>
              <span
                className="stat-pill has-tooltip"
                data-tooltip="Average of all sentence confidence scores (0.0-1.0) from AssemblyAI, showing how sure the model is that the transcript is correct. Above 85% is high accuracy."
              >
                🎯 {stats?.avgConfidence}% quality
              </span>
            </div>
            <div className="talk-time-compact">
              <span className="talk-time-label">🗣️ Talk Time:</span>
              <div className="talk-time-bar-compact">
                <div
                  className="talk-time-segment speaker-a"
                  style={{ width: `${stats?.speakerAPercent}%` }}
                />
                <div
                  className="talk-time-segment speaker-b"
                  style={{ width: `${stats?.speakerBPercent}%` }}
                />
              </div>
              <span className="talk-time-values">
                <span className="speaker-a-text">Luis {stats?.speakerAPercent}%</span>
                <span className="speaker-b-text">Tech {stats?.speakerBPercent}%</span>
              </span>
            </div>
          </div>

          {/* Outcomes Strip */}
          <div className="outcomes-strip">
            <span className="strip-label">Outcomes:</span>
            <div className="outcome-badges">
              <span className="outcome-badge win">✓ Deposit $1,000</span>
              <span className="outcome-badge win">✓ Narrowed 4→2</span>
              <span className="outcome-badge win">✓ Rebates $5,800+</span>
              <span className="outcome-badge win">✓ Waived $1,900</span>
              <span className="outcome-badge miss">✗ No Maintenance Plan</span>
              <span className="outcome-badge miss">✗ No Referral Ask</span>
            </div>
          </div>
        </section>

        {/* Stage Navigation */}
        <nav className="stage-nav">
          {callStages.map((stage) => (
            <button
              key={stage.id}
              className={`stage-btn ${activeStage === stage.id ? 'active' : ''}`}
              onClick={() => handleStageChange(stage.id)}
            >
              <span>{stage.icon}</span>
              <span>{stage.name}</span>
              <span className="score">{stage.score}/10</span>
            </button>
          ))}
        </nav>

        {/* Timeline Progress Bar */}
        <div className="timeline-container">
          <div className="timeline-bar">
            {callStages.map((stage) => (
              <div
                key={stage.id}
                className={`timeline-segment ${activeStage === stage.id ? 'active' : ''}`}
                style={{
                  width: `${stage.endPercent - stage.startPercent}%`,
                  left: `${stage.startPercent}%`,
                }}
                onClick={() => handleStageChange(stage.id)}
              >
                <div className="timeline-segment-fill" />
              </div>
            ))}
          </div>
          <div className="timeline-label">
            <span>0%</span>
            <span className="timeline-current">
              {currentStage?.startPercent.toFixed(1)}% - {currentStage?.endPercent.toFixed(1)}%
            </span>
            <span>100%</span>
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="two-column">
          {/* Transcript Panel */}
          <section className="section">
            <div className="section-header">
              <h3 className="section-title">
                📝 Transcript — {currentStage?.name}
              </h3>
              <div className="section-header-right">
                {activeCitations && (
                  <div className="citation-indicator">
                    <span className="citation-count">
                      {activeCitations.currentIndex + 1} / {activeCitations.matches.length}
                    </span>
                    <button 
                      className="citation-nav-btn"
                      onClick={() => navigateCitation('prev')}
                      disabled={activeCitations.matches.length <= 1}
                      title="Previous quote"
                    >
                      ←
                    </button>
                    <button 
                      className="citation-nav-btn"
                      onClick={() => navigateCitation('next')}
                      disabled={activeCitations.matches.length <= 1}
                      title="Next quote"
                    >
                      →
                    </button>
                    <button 
                      className="citation-close-btn"
                      onClick={closeCitations}
                      title="Close citations"
                    >
                      ✕
                    </button>
                  </div>
                )}
                <span className="badge badge-teal">
                  {stageGroups[activeStage]?.sentences.length} sentences
                </span>
              </div>
            </div>
            <div className="transcript-container" ref={transcriptContainerRef}>
              {stageGroups[activeStage]?.sentences.map((sentence, idx) => {
                const globalIdx = getGlobalSentenceIndex(idx);
                const isHighlighted = isSentenceHighlighted(globalIdx);
                const isCurrent = isSentenceCurrent(globalIdx);
                
                return (
                  <div
                    key={idx}
                    ref={(el) => { sentenceRefs.current[globalIdx] = el; }}
                    className={`transcript-sentence ${isHighlighted ? 'citation-highlighted' : ''} ${
                      isCurrent ? 'citation-current' : ''
                    }`}
                  >
                    <div className="sentence-time">
                      {formatTime(sentence.start)}
                    </div>
                    <div className="sentence-content">
                      <div
                        className={`sentence-speaker speaker-${sentence.speaker.toLowerCase()}`}
                      >
                        {sentence.speaker === 'A' ? 'Customer (Luis)' : 'Technician'}
                      </div>
                      <div
                        className="sentence-text"
                        dangerouslySetInnerHTML={{
                          __html: highlightKeywords(sentence.text),
                        }}
                      />
                    </div>
                    {isHighlighted && (
                      <div className="citation-badge">
                        📌
                      </div>
                    )}
                  </div>
                );
              })}
              {stageGroups[activeStage]?.sentences.length === 0 && (
                <p style={{ padding: 'var(--space-4)', color: 'var(--text-tertiary)' }}>
                  No sentences in this stage range.
                </p>
              )}
            </div>
          </section>

          {/* Analysis Panel */}
          <section className="section">
            <div className="section-header">
              <h3 className="section-title">🔍 Analysis</h3>
            </div>
            <div className="section-body">
              <div className="analysis-panel">
                <div className="analysis-header">
                  <span className="analysis-icon">{currentStage?.icon}</span>
                  <div className="analysis-title-section">
                    <h4 className="analysis-title">{currentStage?.name}</h4>
                    <p className="analysis-subtitle">
                      {currentStage?.description}
                    </p>
                  </div>
                  <div className={`score-badge ${currentStage?.status}`}>
                    <span className="score-value">{currentStage?.score}/10</span>
                    <span className="score-label">{currentStage?.status}</span>
                  </div>
                </div>

                <div className="analysis-section">
                  <h5 className="analysis-section-title">
                    ✅ Strengths
                  </h5>
                  <ul className="analysis-list strengths">
                    {currentStage?.analysis.strengths.map((item, idx) => {
                      const itemData = typeof item === 'string' ? { text: item, citations: [] } : item;
                      // Only count matches within the current stage's sentences
                      const stageSentences = stageGroups[activeStage]?.sentences || [];
                      const matchCount = findCitationMatches(stageSentences, itemData.citations).length;
                      const isActive = activeCitations?.itemText === itemData.text;
                      const hasCitations = itemData.citations.length > 0;
                      const isClickable = hasCitations && matchCount > 0;
                      
                      return (
                        <li 
                          key={idx} 
                          className={`${isActive ? 'citation-active-item' : ''} ${isClickable ? 'clickable' : ''}`}
                          onClick={isClickable ? () => handleCitationClick(itemData.citations, itemData.text) : undefined}
                        >
                          <span className="analysis-item-text">{itemData.text}</span>
                          {hasCitations && (
                            <button
                              className={`citation-btn ${isActive ? 'active' : ''} ${matchCount === 0 ? 'no-matches' : ''}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCitationClick(itemData.citations, itemData.text);
                              }}
                              title={matchCount > 0 ? `Show ${matchCount} supporting quote(s)` : 'No matching quotes found in this stage'}
                            >
                              <span className="citation-icon">📍</span>
                              <span className="citation-match-count">{matchCount}</span>
                            </button>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>

                <div className="analysis-section">
                  <h5 className="analysis-section-title">
                    ⚠️ Areas for Improvement
                  </h5>
                  <ul className="analysis-list gaps">
                    {currentStage?.analysis.gaps.map((item, idx) => {
                      const itemData = typeof item === 'string' ? { text: item, citations: [] } : item;
                      // Only count matches within the current stage's sentences
                      const stageSentences = stageGroups[activeStage]?.sentences || [];
                      const matchCount = findCitationMatches(stageSentences, itemData.citations).length;
                      const isActive = activeCitations?.itemText === itemData.text;
                      const hasCitations = itemData.citations.length > 0;
                      const isClickable = hasCitations && matchCount > 0;
                      
                      return (
                        <li 
                          key={idx} 
                          className={`${isActive ? 'citation-active-item' : ''} ${isClickable ? 'clickable' : ''}`}
                          onClick={isClickable ? () => handleCitationClick(itemData.citations, itemData.text) : undefined}
                        >
                          <span className="analysis-item-text">{itemData.text}</span>
                          {hasCitations && (
                            <button
                              className={`citation-btn ${isActive ? 'active' : ''} ${matchCount === 0 ? 'no-matches' : ''}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCitationClick(itemData.citations, itemData.text);
                              }}
                              title={matchCount > 0 ? `Show ${matchCount} supporting quote(s)` : 'No matching quotes found in this stage'}
                            >
                              <span className="citation-icon">📍</span>
                              <span className="citation-match-count">{matchCount}</span>
                            </button>
                          )}
                          {!hasCitations && (
                            <span className="no-citation-badge" title="Gap identified by absence of evidence">
                              —
                            </span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>

                <div className="analysis-section">
                  <h5 className="analysis-section-title">
                    💬 Key Quote
                  </h5>
                  <blockquote className="quote-block">
                    "{currentStage?.analysis.keyQuote}"
                    <div className="quote-attribution">
                      — From the {currentStage?.name} stage
                    </div>
                  </blockquote>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Keywords Section */}
        <section className="section" style={{ marginBottom: 'var(--space-8)' }}>
          <div className="section-header">
            <h3 className="section-title">🏷️ Topics Discussed</h3>
          </div>
          <div className="section-body">
            <div className="keywords-grid">
              {Object.entries(keywords)
                .sort((a, b) => b[1].count - a[1].count)
                .map(([kw, data]) => (
                  <div
                    key={kw}
                    className="keyword-tag"
                    style={{
                      background: `${data.color}15`,
                      color: data.color,
                      borderColor: `${data.color}30`,
                    }}
                  >
                    <span>{kw}</span>
                    <span className="keyword-count">{data.count}×</span>
                  </div>
                ))}
            </div>
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="footer">
        <p>
          NOSO Labs • Service Call Analysis • Transcribed with{' '}
          <a
            href="https://www.assemblyai.com/"
            target="_blank"
            rel="noopener noreferrer"
          >
            AssemblyAI
          </a>{' '}
          • Built by Javier Laveaga
        </p>
      </footer>
    </div>
  );
}

export default App;
