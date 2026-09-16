/**
 * critics.js — The Four Evaluators
 * Prompt 5: Media Critic, Industry Critic, BL Fan Critic, Social Critic.
 * Each scores 1–5 stars. Final score = average × 20.
 */
import { getChem } from './chemistry.js'
import { GENRE_DETAILS, getRatingFit } from './productions.js'

// ─── Helpers ──────────────────────────────────────────────────────────────────
function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}
function roundStars(v) {
  return Math.max(1, Math.min(5, Math.round(v * 2) / 2))
}

// ─── Quote banks ──────────────────────────────────────────────────────────────
const QUOTES = {
  media: {
    high: [
      '"I covered their press tour for three weeks and the chemistry is absolutely real. {T} is the real deal."',
      '"The fandom was right — {A} and {B} together is lightning. {T} delivered everything it promised."',
      '"The promo chemistry carried into every frame. {CP} is not a ship, it is a fact."',
      '"Every press appearance, every behind-the-scenes clip — they are the same. {T} is authentic gold."',
    ],
    mid: [
      '"Good promo push but the on-screen chemistry was inconsistent. Peaks and valleys for {CP}."',
      '"The marketing sold it better than the show delivered, but there are moments worth talking about."',
      '"A serviceable romantic arc. {A} and {B} work in spots but lack that final click."',
    ],
    low: [
      '"The press tour felt scripted and so did the show. {CP} never convinced me."',
      '"Not sure the chemistry was ever really there. {T} leaned hard on optics."',
      '"Disappointing given the hype. {A} and {B} seem awkward together off-script."',
    ],
  },

  industry: {
    high: [
      '"A textbook execution of the slow-burn romance trope — with genuine craft behind it."',
      '"Technically immaculate. The pacing, the genre choices, the quality — all earned."',
      '"Rarely does adaptation this faithful also feel this alive. Excellent all-round work."',
      '"The schedule showed discipline. Every episode justified its existence."',
    ],
    mid: [
      '"Competent production. Hits its genre marks without exceeding them."',
      '"The craft is visible but the ambition is modest. A solid if unremarkable entry."',
      '"Some bold choices, some safe ones. The industry will take notice of the highs."',
    ],
    low: [
      '"A troubled production that shows in every scene. Structural problems throughout."',
      '"The genre mechanics are present but the execution fumbles repeatedly."',
      '"Budget and schedule constraints made their mark. Craft felt rushed."',
    ],
  },

  bl_fan: {
    high: [
      '"THE SKINSHIP. The eye contact. The hand-holding that lasted four full seconds. I am not okay."',
      '"Every scene between {A} and {B} felt electric. {T} understood the assignment."',
      '"I have rewatched the confession scene eleven times. {CP} is the ship of the decade."',
      '"The tension, the release, the payoff — I screamed at my phone for forty-five minutes."',
    ],
    mid: [
      '"There are moments — good moments — but the spark needed more oxygen."',
      '"{A} and {B} are cute together. Some scenes delivered. Others needed more courage."',
      '"A solid BL but the skinship felt restrained. The fandom wanted more, got almost enough."',
    ],
    low: [
      '"I waited all season for a payoff that never came. The romantic tension flatlined."',
      '"The chemistry on paper is there but the execution kept pulling back at the wrong moments."',
      '"Hard to ship {CP} when the show seems embarrassed by its own romance."',
    ],
  },

  social: {
    high: [
      '"Treats its queer romance with warmth and dignity. Representation done with genuine care."',
      '"The relationship is humanised, not fetishised. A model for the genre going forward."',
      '"Every creative choice respects the audience\'s intelligence and the characters\' humanity."',
      '"The story trusts its leads to be people first, symbols second. Rare and appreciated."',
    ],
    mid: [
      '"Well-intentioned. Some decisions land, others reveal blind spots worth addressing."',
      '"The representation is earnest even when it is imperfect. Room to grow."',
      '"Navigates the representation question with mixed results. Mostly thoughtful."',
    ],
    low: [
      '"Troubling choices that undercut the relationship at key moments. Needs reflection."',
      '"The fetishisation alarm rang more than once. The studio should listen to community feedback."',
      '"This is exactly the kind of content that sets the genre back. Serious concerns."',
    ],
  },
}

// ─── Fan review templates ─────────────────────────────────────────────────────
// Substitutions: {A} Lead1, {B} Lead2, {T} title, {CP} cp name, {N} score/episodes
export const FAN_REVIEWS_POSITIVE = [
  '★★★★★ I have watched ep {N} of {T} 47 times. The scene where {A} looks at {B} — I SCREAMED. {CP} forever!! 💕',
  '★★★★★ {T} just destroyed my emotional stability. {A} and {B} have MORE chemistry than most actual couples?? The {CP} era is here!!',
  '★★★★★ Just finished {T} at 3am crying. {A}\'s confession scene... I can\'t. Would absolutely ruin my sleep schedule again.',
  '★★★★★ The way {B} looks at {A} in {T}... no heterosexual explanation. None. Zero. {CP} is the ship of the year.',
  '★★★★★ I need a support group for {T} fans. The angst, the tension, the PAYOFF. {A}×{B} is undefeated.',
]

export const FAN_REVIEWS_MID = [
  '★★★☆☆ {T} was decent? {A} carried most scenes tbh. {B} had some good moments. Worth watching, won\'t rewatch.',
  '★★★☆☆ Started {T} because of the {CP} hype. Chemistry is there but some episodes dragged. {A} is adorable though.',
  '★★★☆☆ Mixed feelings about {T}. The leads are great but the writing lets them down sometimes. Moments of brilliance.',
  '★★★☆☆ {T} is fine. Not the {CP} epic I was hoping for. I see the potential — maybe next season will deliver.',
  '★★★☆☆ The fans were not lying about {A} and {B} — chemistry is real. The show itself is just okay. Still enjoyable.',
]

export const FAN_REVIEWS_NEGATIVE = [
  '★★☆☆☆ I wanted to love {T} but the {CP} chemistry felt so forced. {A} and {B} had zero tension. Disappointed.',
  '★☆☆☆☆ Three episodes in and I\'m out. {T} just isn\'t clicking. The potential was there but... no.',
  '★★☆☆☆ {T} let down the whole {CP} fandom. The source material deserved better. {A} tried their best.',
  '★☆☆☆☆ Cannot believe I waited weeks for {T} to air for this. The {A}/{B} scenes were awkward at best.',
  '★★☆☆☆ The editing in {T} ruined every tension moment. When {B} finally confessed I felt nothing. Nothing.',
]

// ─── Social media post templates ──────────────────────────────────────────────
export const SOCIAL_POSTS_POSITIVE = [
  '🔥 @BLNewsDaily: {T} finale trends WORLDWIDE. "{CP}" is the most searched ship of the month. Numbers don\'t lie.',
  '💯 @KDramaWatcher: Okay I\'m late but {T} is a MASTERPIECE. {A}\'s scene in ep {N} broke me. Everyone watch NOW.',
  '📈 @FanshipAlert: The {CP} kiss scene just hit 10M views in 24 hours. THE PEOPLE HAVE SPOKEN.',
  '🏆 @EntertainmentBuzz: Critics agree: {T} sets a new standard for BL drama. {A} and {B} are faces of a new era.',
  '📊 @StreamingNumbers: {T} breaks platform record — 2.1M households watched the finale. Congratulations to the studio!',
]

export const SOCIAL_POSTS_MID = [
  '🤔 @BLReviewer: {T} is... fine? The {CP} stans are going wild but I need more from the writing. 3/5.',
  '📺 @DramaCorner: {T} mid-season check: strong leads, shaky plot. Will it stick the landing? Jury\'s still out.',
  '📉 @StreamReports: {T} viewership steady but not spectacular. A solid if unremarkable BL entry this season.',
]

export const SOCIAL_POSTS_NEGATIVE = [
  '😤 @DisappointedFan: {T} had every ingredient and WASTED them. {A} and {B} deserve better writing. I\'m upset.',
  '🧵 @BLCritique: Let\'s talk about {T}\'s pacing problem. Ep {N} was genuinely baffling. Studio needs accountability.',
  '❌ @CancelledIt: Dropped {T} after episode 3. Not every BL drama needs to be this slow. Hard pass from me.',
  '📉 @MediaWatcher: {T} controversy continues — viewer numbers declining, social sentiment negative. Studio struggling.',
]

// ─── Template substitution ────────────────────────────────────────────────────
export function fillTemplate(tmpl, { A, B, T, CP, N }) {
  return tmpl
    .replace(/\{A\}/g, A || 'the lead')
    .replace(/\{B\}/g, B || 'their co-star')
    .replace(/\{T\}/g, T || 'this show')
    .replace(/\{CP\}/g, CP || `${A}×${B}`)
    .replace(/\{N\}/g, N ?? '1')
}

function pickReviews(score, vars) {
  const out = []
  if (score >= 70) {
    out.push(fillTemplate(pick(FAN_REVIEWS_POSITIVE), vars))
    out.push(fillTemplate(pick(FAN_REVIEWS_MID),      vars))
  } else if (score >= 45) {
    out.push(fillTemplate(pick(FAN_REVIEWS_MID),      vars))
    out.push(fillTemplate(pick(FAN_REVIEWS_POSITIVE), vars))
    out.push(fillTemplate(pick(FAN_REVIEWS_NEGATIVE), vars))
  } else {
    out.push(fillTemplate(pick(FAN_REVIEWS_NEGATIVE), vars))
    out.push(fillTemplate(pick(FAN_REVIEWS_MID),      vars))
  }
  return out
}

function pickSocial(score, vars) {
  const out = []
  if (score >= 70) {
    out.push(fillTemplate(pick(SOCIAL_POSTS_POSITIVE), vars))
    out.push(fillTemplate(pick(SOCIAL_POSTS_MID),      vars))
  } else if (score >= 45) {
    out.push(fillTemplate(pick(SOCIAL_POSTS_MID),      vars))
    out.push(fillTemplate(pick(SOCIAL_POSTS_NEGATIVE), vars))
  } else {
    out.push(fillTemplate(pick(SOCIAL_POSTS_NEGATIVE), vars))
    out.push(fillTemplate(pick(SOCIAL_POSTS_NEGATIVE), vars))
  }
  return out
}

// ─── Four critic scoring functions ────────────────────────────────────────────

/** MEDIA CRITIC — fan service & promo chemistry */
function scoreMedia(prod, castActors, chemValue, baseScore) {
  const chem    = chemValue / 100
  const base    = baseScore / 100
  const fixed   = prod.fixedCP ? 0.5 : 0
  const expectations = GENRE_DETAILS[prod.genre]?.criticExpectations ?? 1
  const expectationPenalty = (expectations - 1) * 0.1
  const storyPenalty = prod.story === 'adaptation' ? 0.15 : 0
  // Recalibrated: base has higher impact, chemistry slightly reduced, adaptation penalty applied
  const stars   = roundStars(1.2 + base * 1.8 + chem * 1.1 + fixed - expectationPenalty - storyPenalty)
  const quoteRaw = pick(stars >= 4 ? QUOTES.media.high : stars >= 3 ? QUOTES.media.mid : QUOTES.media.low)
  return {
    id: 'media', name: 'Media Critic', icon: '📰',
    role: 'Fan service & promo chemistry',
    stars,
    quote: quoteRaw,
  }
}

/** INDUSTRY CRITIC — craft & trope execution */
function scoreIndustry(prod, castActors, chemValue, baseScore) {
  const combo   = prod.comboResult?.mult ?? 1.0
  const cbBonus = combo >= 1.5 ? 0.8 : combo <= 0.6 ? -0.6 : 0.2
  const sched   = prod.schedule === '12m' ? 0.5 : prod.schedule === '6m' ? 0.2 : 0
  const bonus   = Math.min(0.8, cbBonus + sched)
  const base    = baseScore / 100
  const expectations = GENRE_DETAILS[prod.genre]?.criticExpectations ?? 1
  const expectationPenalty = (expectations - 1) * 0.1
  // Higher expectations penalty for adaptations on professional reviews
  const storyPenalty = prod.story === 'adaptation' ? 0.25 : 0
  // Recalibrated: base has higher impact, skill dominates execution
  const stars   = roundStars(1.4 + base * 2.2 + bonus - expectationPenalty - storyPenalty)
  const quoteRaw = pick(stars >= 4 ? QUOTES.industry.high : stars >= 3 ? QUOTES.industry.mid : QUOTES.industry.low)
  return {
    id: 'industry', name: 'Industry Critic', icon: '🏭',
    role: 'Craft & trope execution',
    stars,
    quote: quoteRaw,
  }
}

/** BL FAN CRITIC — skinship & romantic tension */
function scoreBLFan(prod, castActors, chemValue, baseScore) {
  const chem      = chemValue / 100
  const visualAvg = castActors.length
    ? castActors.reduce((s, a) => s + (a.skills?.visual ?? 40), 0) / castActors.length / 100
    : 0.5
  const base      = baseScore / 100
  const ratingFit = getRatingFit(prod.genre, prod.rating)
  const rBonus  = ratingFit.fanBonus
  const expectations = GENRE_DETAILS[prod.genre]?.criticExpectations ?? 1
  const expectationPenalty = (expectations - 1) * 0.1
  // Recalibrated: base quality + visual appeal + chemistry balanced nicely
  const stars   = roundStars(1.0 + base * 0.6 + chem * 1.6 + visualAvg * 1.4 + rBonus - expectationPenalty)
  const quoteRaw = pick(stars >= 4 ? QUOTES.bl_fan.high : stars >= 3 ? QUOTES.bl_fan.mid : QUOTES.bl_fan.low)
  return {
    id: 'bl_fan', name: 'BL Fan Critic', icon: '💕',
    role: 'Skinship & romantic tension',
    stars,
    quote: quoteRaw,
  }
}

/** SOCIAL CRITIC — LGBTQ+ representation & respect */
function scoreSocial(prod, castActors, chemValue, baseScore) {
  const ratingFit = getRatingFit(prod.genre, prod.rating)
  const rMod      = prod.rating === 'pg' && ['School', 'Comedy', 'Slice of Life'].includes(prod.genre) ? 0.55 : 0
  const srPenalty = ratingFit.socialBonus
  const base      = baseScore / 100
  const expectations = GENRE_DETAILS[prod.genre]?.criticExpectations ?? 1
  const expectationPenalty = (expectations - 1) * 0.1
  // Recalibrated: base has higher impact, floor set correctly
  const stars     = roundStars(1.5 + base * 1.8 + rMod + srPenalty - expectationPenalty)
  const quoteRaw  = pick(stars >= 4 ? QUOTES.social.high : stars >= 3 ? QUOTES.social.mid : QUOTES.social.low)
  return {
    id: 'social', name: 'Social Critic', icon: '🌈',
    role: 'LGBTQ+ representation & respect',
    stars,
    quote: quoteRaw,
  }
}

// ─── Main entry point ─────────────────────────────────────────────────────────
/**
 * Run all four critics and return their scores plus derived data.
 * @param {object} production
 * @param {Array}  castActors
 * @param {number} chemValue  0–100
 * @param {number} baseScore  0–100 (from calcScore)
 * @param {object} [tier]     game tier config from getGameTier() — for rep cap & distribution
 * @returns {object}
 */
export function runAllCritics(production, castActors, chemValue, baseScore, tier, genreTrends = []) {
  const critics = [
    scoreMedia   (production, castActors, chemValue, baseScore),
    scoreIndustry(production, castActors, chemValue, baseScore),
    scoreBLFan   (production, castActors, chemValue, baseScore),
    scoreSocial  (production, castActors, chemValue, baseScore),
  ]

  // Prompt 8: apply tier star bonus to shift distribution toward positive at lower tiers
  const starBonus = tier?.reviewStarBonus ?? 0
  const rawAvg = critics.reduce((s, c) => s + c.stars, 0) / critics.length
  // Add a small awards visibility / review bonus (+0.1 stars) if trending
  const trendBonus = (genreTrends ?? []).includes(production.genre) ? 0.1 : 0
  const avgStars = Math.min(5, rawAvg + starBonus + trendBonus)
  const finalScore = Math.round((avgStars / 5) * 100)

  // Rep delta per spec: (avg - 3) × 8 × rating modifier
  const ratingMod = production.rating === 'pg' ? 1.15 : production.rating === 'r' ? 0.95 : 1.0
  const rawRepDelta = Math.round((avgStars - 3) * 8 * ratingMod)
  // Prompt 8: cap rep loss per review at the tier value (negative cap)
  const repLossCap = tier?.repLossCap ?? -20
  const repDelta   = rawRepDelta < 0 ? Math.max(rawRepDelta, repLossCap) : rawRepDelta

  const awarded     = avgStars >= 4.5
  const controversy = critics.find(c => c.id === 'social')?.stars <= 2

  // Substitute vars for fan reviews / social posts
  const leads = castActors.filter(a => (production.leadIds ?? []).includes(a.id))
  const A  = leads[0]?.name ?? castActors[0]?.name ?? 'Lead A'
  const B  = leads[1]?.name ?? castActors[1]?.name ?? 'Lead B'
  const T  = production.title
  const CP = production.cpName || `${A.split(' ')[0]}×${B.split(' ')[0]}`
  const N  = production.episodesTotal ?? 1
  const vars = { A, B, T, CP, N }

  const fanReviews  = pickReviews(finalScore, vars)
  const socialPosts = pickSocial (finalScore, vars)

  return {
    critics,
    avgStars: Math.round(avgStars * 10) / 10,
    finalScore,
    repDelta,
    awarded,
    controversy,
    fanReviews,
    socialPosts,
  }
}
