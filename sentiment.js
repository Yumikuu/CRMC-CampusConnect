// ═══════════════════════════════════════════════════════════════
// CRMC CampusConnect — AI Sentiment Analysis
// Module 3: AI-Assisted Content Detection
// Uses HuggingFace Inference API (cardiffnlp/twitter-roberta-base-sentiment-latest)
// ═══════════════════════════════════════════════════════════════

const SENTIMENT_CONFIG = {
  // HuggingFace model — trained on social media text (similar to student posts)
  model: 'cardiffnlp/twitter-roberta-base-sentiment-latest',
  apiUrl: 'https://api-inference.huggingface.co/models/cardiffnlp/twitter-roberta-base-sentiment-latest',

  // Store your HuggingFace token in a safe place — never commit real tokens to GitHub
  // To use: replace the empty string below with your hf_... token locally
  apiKey: window.HF_API_KEY || '',
  apiKey: window.HF_API_KEY || '',

  // Score thresholds for flagging decisions
  thresholds: {
    flagIfNegativeScore: 0.75,  // Flag if negative confidence >= 75%
    criticalIfNegativeScore: 0.90, // Mark critical if >= 90%
  }
};

// Filipino + English bad words / distress signals
const FILIPINO_KEYWORDS = [
  // Self-harm / distress — critical
  { word: 'kill myself',          severity: 'critical' },
  { word: 'want to die',          severity: 'critical' },
  { word: 'end my life',          severity: 'critical' },
  { word: 'kill my self',         severity: 'critical' },
  { word: 'suicide',              severity: 'critical' },
  { word: 'suicidal',             severity: 'critical' },
  { word: 'i want to kill',       severity: 'critical' },
  { word: 'gusto ko nang mamatay', severity: 'critical' },
  { word: 'di ko na kaya',        severity: 'high'     },
  { word: 'wala na akong silbi',  severity: 'critical' },

  // Violence / threats — high
  { word: 'i will kill',          severity: 'high' },
  { word: 'i want to kill',       severity: 'high' },
  { word: 'gonna kill',           severity: 'high' },
  { word: 'kill you',             severity: 'high' },
  { word: 'hurt you',             severity: 'high' },
  { word: 'i hate you',           severity: 'high' },
  { word: 'patayin',              severity: 'high' },
  { word: 'bomb',                 severity: 'high' },
  { word: 'attack',               severity: 'high' },

  // Harassment — high/medium
  { word: 'bitch',                severity: 'high'   },
  { word: 'bastard',              severity: 'high'   },
  { word: 'asshole',              severity: 'high'   },
  { word: 'idiot',                severity: 'medium' },
  { word: 'stupid',               severity: 'medium' },
  { word: 'loser',                severity: 'medium' },
  { word: 'worthless',            severity: 'high'   },
  { word: 'ugly',                 severity: 'medium' },
  { word: 'gago',                 severity: 'medium' },
  { word: 'bobo',                 severity: 'medium' },
  { word: 'tanga',                severity: 'medium' },
  { word: 'putang ina',           severity: 'high'   },
  { word: 'tang ina',             severity: 'high'   },
  { word: 'leche',                severity: 'medium' },

  // Drugs — high
  { word: 'shabu',                severity: 'high' },
  { word: 'droga',                severity: 'high' },
  { word: 'drugs',                severity: 'high' },

  // Distress signals — medium/high
  { word: 'help me please',       severity: 'medium' },
  { word: 'nobody cares',         severity: 'high'   },
  { word: 'i give up',            severity: 'high'   },
  { word: 'i cant take it',       severity: 'high'   },
  { word: 'saklolo',              severity: 'high'   },
  { word: 'inaabuso',             severity: 'high'   },
  { word: 'inabuso',              severity: 'high'   },
];

/**
 * Analyze post content using HuggingFace NLP model + Filipino keyword fallback
 * @param {string} text - The post content to analyze
 * @returns {Promise<{sentiment: string, score: number, shouldFlag: boolean, reason: string, source: string}>}
 */
async function analyzeSentiment(text) {
  if (!text || text.trim().length === 0) {
    return { sentiment: 'neutral', score: 0, shouldFlag: false, reason: '', source: 'none' };
  }

  // ── STEP 1: Check Filipino keywords first (instant, no API needed) ──
  const lowerText = text.toLowerCase();
  const filipinoMatches = FILIPINO_KEYWORDS.filter(k => lowerText.includes(k.word));

  const hasCriticalFilipino = filipinoMatches.some(k => k.severity === 'critical');
  const hasHighFilipino     = filipinoMatches.some(k => k.severity === 'high');

  // If critical Filipino/English word found, return immediately — no API needed
  if (hasCriticalFilipino) {
    return {
      sentiment:  'critical',
      score:      -1.0,
      shouldFlag: true,
      reason:     'Critical content detected: ' + filipinoMatches.map(k => k.word).join(', '),
      source:     'keyword'
    };
  }

  // If high-severity keyword found, also return early
  if (hasHighFilipino) {
    return {
      sentiment:  'negative',
      score:      -0.75,
      shouldFlag: true,
      reason:     'High-risk content detected: ' + filipinoMatches.map(k => k.word).join(', '),
      source:     'keyword'
    };
  }

  // ── STEP 2: Call HuggingFace API for real NLP analysis ──
  let apiResult = null;
  try {
    const response = await fetch(SENTIMENT_CONFIG.apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SENTIMENT_CONFIG.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ inputs: text.substring(0, 512) }) // API limit: 512 chars
    });

    if (response.ok) {      const data = await response.json();

      // Response format: [[{label: 'negative', score: 0.95}, {label: 'neutral', score: 0.03}, ...]]
      if (data && data[0] && Array.isArray(data[0])) {
        const results = data[0];
        // Find the label with highest score
        const top = results.reduce((a, b) => a.score > b.score ? a : b);

        // Map model labels to our labels
        const labelMap = {
          'negative': 'negative',
          'neutral':  'neutral',
          'positive': 'positive',
          'LABEL_0':  'negative', // some models use numeric labels
          'LABEL_1':  'neutral',
          'LABEL_2':  'positive',
        };

        const negativeResult = results.find(r =>
          r.label.toLowerCase().includes('negative') || r.label === 'LABEL_0'
        );
        const negativeScore = negativeResult ? negativeResult.score : 0;

        apiResult = {
          label:         labelMap[top.label] || top.label.toLowerCase(),
          topScore:      top.score,
          negativeScore: negativeScore,
          rawResults:    results
        };
      }
    } else if (response.status === 503) {
      // Model is loading (cold start on free tier) — wait 10s and retry once
      console.warn('⏳ HuggingFace model loading, retrying in 3 seconds...');
      await new Promise(resolve => setTimeout(resolve, 3000));
      try {
        const retry = await fetch(SENTIMENT_CONFIG.apiUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${SENTIMENT_CONFIG.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ inputs: text.substring(0, 512) })
        });
        if (retry.ok) {
          const retryData = await retry.json();
          if (retryData && retryData[0] && Array.isArray(retryData[0])) {
            const results = retryData[0];
            const top = results.reduce((a, b) => a.score > b.score ? a : b);
            const labelMap = { 'negative': 'negative', 'neutral': 'neutral', 'positive': 'positive', 'LABEL_0': 'negative', 'LABEL_1': 'neutral', 'LABEL_2': 'positive' };
            const negativeResult = results.find(r => r.label.toLowerCase().includes('negative') || r.label === 'LABEL_0');
            const negativeScore = negativeResult ? negativeResult.score : 0;
            apiResult = { label: labelMap[top.label] || top.label.toLowerCase(), topScore: top.score, negativeScore, rawResults: results };
          }
        }
      } catch (retryErr) {
        console.warn('Retry also failed:', retryErr.message);
      }
    } else {
      console.warn('HuggingFace API error:', response.status);
    }
  } catch (err) {
    console.warn('HuggingFace API call failed, using keyword fallback:', err.message);
  }

  // ── STEP 3: Combine API result + Filipino keywords for final decision ──
  if (apiResult) {
    const negScore = apiResult.negativeScore;

    // Convert 0–1 API score to our -1 to +1 scale
    let normalizedScore = 0;
    if (apiResult.label === 'negative') normalizedScore = -(negScore);
    else if (apiResult.label === 'positive') normalizedScore = apiResult.topScore;
    else normalizedScore = 0;

    // Also factor in Filipino high-severity keywords
    if (hasHighFilipino) {
      normalizedScore = Math.min(normalizedScore - 0.3, -0.6);
    }

    const shouldFlag = negScore >= SENTIMENT_CONFIG.thresholds.flagIfNegativeScore || hasHighFilipino;
    const isCritical = negScore >= SENTIMENT_CONFIG.thresholds.criticalIfNegativeScore;

    let reason = '';
    if (shouldFlag) {
      reason = isCritical
        ? `Critical content detected (AI confidence: ${Math.round(negScore * 100)}% negative)`
        : `Negative content detected (AI confidence: ${Math.round(negScore * 100)}% negative)`;
      if (filipinoMatches.length > 0) {
        reason += ` | Keywords: ${filipinoMatches.map(k => k.word).join(', ')}`;
      }
    }

    return {
      sentiment:  isCritical ? 'critical' : apiResult.label,
      score:      parseFloat(normalizedScore.toFixed(2)),
      shouldFlag,
      reason,
      source:     'ai',
      aiConfidence: Math.round(negScore * 100),
      rawResults: apiResult.rawResults
    };
  }

  // ── STEP 4: Pure keyword fallback (if API failed) ──
  if (filipinoMatches.length > 0) {
    const hasHigh = filipinoMatches.some(k => k.severity === 'high');
    return {
      sentiment:  hasHigh ? 'negative' : 'neutral',
      score:      hasHigh ? -0.6 : -0.2,
      shouldFlag: hasHigh,
      reason:     'Inappropriate keywords detected: ' + filipinoMatches.map(k => k.word).join(', '),
      source:     'keyword'
    };
  }

  // Clean post
  return { sentiment: 'neutral', score: 0, shouldFlag: false, reason: '', source: 'ai' };
}

/**
 * Save sentiment result to Supabase post_sentiment table
 * @param {string} postId
 * @param {object} result - result from analyzeSentiment()
 */
async function saveSentimentResult(postId, result) {
  try {
    const { error } = await db
      .from('post_sentiment')
      .upsert({
        post_id:            postId,
        sentiment:          result.sentiment,
        score:              result.score,
        matched_keywords:   result.source === 'keyword' ? [result.reason] : [],
        matched_categories: [],
        analyzed_at:        new Date().toISOString()
      }, { onConflict: 'post_id' });

    if (error) console.error('Failed to save sentiment:', error);
  } catch (err) {
    console.error('saveSentimentResult error:', err);
  }
}

/**
 * Update post flagged status in DB based on AI result
 * @param {string} postId
 * @param {object} result - result from analyzeSentiment()
 */
async function applyFlagToPost(postId, result) {
  if (!result.shouldFlag) return;

  try {
    const { error } = await db
      .from('posts')
      .update({
        is_flagged:        true,
        flag_reason:       result.reason,
        moderation_status: 'pending'
      })
      .eq('id', postId);

    if (error) console.error('Failed to flag post:', error);
  } catch (err) {
    console.error('applyFlagToPost error:', err);
  }
}

/**
 * Main function — call this after a post is created
 * Runs in background, won't block post submission
 * @param {string} postId
 * @param {string} content
 * @param {string} title (optional)
 */
async function runSentimentAnalysis(postId, content, title = '') {
  const fullText = `${title} ${content}`.trim();

  console.log('🤖 Running AI sentiment analysis...');

  const result = await analyzeSentiment(fullText);

  console.log('🤖 Sentiment result:', {
    sentiment: result.sentiment,
    score: result.score,
    shouldFlag: result.shouldFlag,
    source: result.source,
    aiConfidence: result.aiConfidence ? `${result.aiConfidence}%` : 'N/A'
  });

  // Save to DB and flag if needed (run in parallel)
  await Promise.all([
    saveSentimentResult(postId, result),
    applyFlagToPost(postId, result)
  ]);

  return result;
}
