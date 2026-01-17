import { useState, useEffect, useMemo } from 'react';
import './App.css';
import logoNoso from './assets/LogoNoso.jpeg';
import {
  calculateStats,
  formatTime,
  formatMinutes,
  countKeywords,
  generateCallStages,
  groupSentencesByStage,
  getConfidenceLevel,
  KEYWORDS,
  CALL_ASSESSMENT,
} from './utils/dataAnalysis';

function App() {
  const [sentences, setSentences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeStage, setActiveStage] = useState('introduction');
  const [activeSentence, setActiveSentence] = useState(null);

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
            <div className="logo">
              <img src={logoNoso} alt="NOSO Logo" className="logo-icon" />
              NOSO Call Analysis
            </div>
            <span className="badge badge-dark">Post-Repair Sales Consultation</span>
          </div>
          <div className="header-meta">
            <div className="meta-item">
              <span className="label">Duration:</span>
              <span className="value">{formatMinutes(stats?.callDuration)} min</span>
            </div>
            <div className="meta-item">
              <span className="label">Accuracy:</span>
              <span className="value">{stats?.avgConfidence}%</span>
            </div>
            <div className="meta-item">
              <span className="label">Score:</span>
              <span className="value" style={{ color: '#10b981' }}>
                {CALL_ASSESSMENT.overallScore}/10
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="main-content">
        {/* Stats Grid */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-label">📊 Total Sentences</div>
            <div className="stat-value">{stats?.totalSentences}</div>
            <div className="stat-detail">Analyzed from transcript</div>
          </div>

          <div className="stat-card">
            <div className="stat-label">⏱️ Call Duration</div>
            <div className="stat-value">{formatMinutes(stats?.callDuration)}</div>
            <div className="stat-detail">minutes total</div>
          </div>

          <div className="stat-card">
            <div className="stat-label">🎯 Transcription Quality</div>
            <div className="stat-value">{stats?.avgConfidence}%</div>
            <div className="stat-detail">
              {stats?.lowConfidenceCount} low-confidence segments
            </div>
          </div>

          <div className="stat-card talk-time-card">
            <div className="stat-label">🗣️ Talk Time Distribution</div>
            <div className="talk-time-bar">
              <div
                className="talk-time-segment speaker-a"
                style={{ width: `${stats?.speakerAPercent}%` }}
              />
              <div
                className="talk-time-segment speaker-b"
                style={{ width: `${stats?.speakerBPercent}%` }}
              />
            </div>
            <div className="talk-time-legend">
              <div className="legend-item">
                <div className="legend-dot speaker-a" />
                <span>Customer (Luis): {stats?.speakerAPercent}%</span>
              </div>
              <div className="legend-item">
                <div className="legend-dot speaker-b" />
                <span>Technician: {stats?.speakerBPercent}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Stage Navigation */}
        <nav className="stage-nav">
          {callStages.map((stage) => (
            <button
              key={stage.id}
              className={`stage-btn ${activeStage === stage.id ? 'active' : ''}`}
              onClick={() => setActiveStage(stage.id)}
            >
              <span>{stage.icon}</span>
              <span>{stage.name}</span>
              <span className="score">{stage.score}/10</span>
            </button>
          ))}
        </nav>

        {/* Two Column Layout */}
        <div className="two-column">
          {/* Transcript Panel */}
          <section className="section">
            <div className="section-header">
              <h3 className="section-title">
                📝 Transcript — {currentStage?.name}
              </h3>
              <span className="badge badge-teal">
                {stageGroups[activeStage]?.sentences.length} sentences
              </span>
            </div>
            <div className="transcript-container">
              {stageGroups[activeStage]?.sentences.map((sentence, idx) => {
                const conf = getConfidenceLevel(sentence.confidence);
                return (
                  <div
                    key={idx}
                    className={`transcript-sentence ${
                      activeSentence === idx ? 'active' : ''
                    } ${sentence.confidence < 0.7 ? 'low-confidence' : ''}`}
                    onClick={() => setActiveSentence(idx)}
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
                      {sentence.confidence < 0.8 && (
                        <div
                          className="confidence-indicator"
                          style={{ color: conf.color }}
                        >
                          ⚠️ {(sentence.confidence * 100).toFixed(0)}% confidence
                        </div>
                      )}
                    </div>
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
                    {currentStage?.analysis.strengths.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>

                <div className="analysis-section">
                  <h5 className="analysis-section-title">
                    ⚠️ Areas for Improvement
                  </h5>
                  <ul className="analysis-list gaps">
                    {currentStage?.analysis.gaps.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
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

        {/* Summary Section */}
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

          {/* Scorecard */}
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

          <div className="summary-content" style={{ marginTop: 'var(--space-6)' }}>
            <div className="summary-block">
              <h4 className="summary-block-title">
                ✅ Sales Opportunities Taken
              </h4>
              <ul className="summary-list">
                {CALL_ASSESSMENT.salesInsights.taken.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </div>

            <div className="summary-block">
              <h4 className="summary-block-title">
                ❌ Sales Opportunities Missed
              </h4>
              <ul className="summary-list">
                {CALL_ASSESSMENT.salesInsights.missed.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </div>

            <div className="summary-block">
              <h4 className="summary-block-title">
                💪 Top Strengths
              </h4>
              <ul className="summary-list">
                {CALL_ASSESSMENT.topStrengths.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </div>

            <div className="summary-block">
              <h4 className="summary-block-title">
                📈 Areas for Improvement
              </h4>
              <ul className="summary-list">
                {CALL_ASSESSMENT.areasForImprovement.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
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
