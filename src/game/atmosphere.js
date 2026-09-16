import { getChem } from './chemistry.js'

// Data-driven Atmosphere Messages grouped by context
export const ATMOSPHERE_DATA = {
  genres: {
    Horror: [
      { id: 'horror_lights', text: "The horror set is kept completely pitch-black between takes to build chilling tension." },
      { id: 'horror_makeup', text: "The horror cast is laughing between takes while covered in fake blood and spooky makeup." },
      { id: 'horror_noises', text: "Unexplained thumping sounds on the spooky set are making the cast's reactions feel very real!" },
    ],
    Comedy: [
      { id: 'comedy_bloopers', text: "An ad-lib by the lead comedy actor sent the entire camera crew into a quiet laughing fit." },
      { id: 'comedy_corpse', text: "Filming is delayed by ten minutes because the comedy leads can't stop cracking up during a serious scene." },
      { id: 'comedy_slapstick', text: "The directors are trying out a physical comedy bit using ridiculous prop fruit on set." },
    ],
    Romance: [
      { id: 'romance_blush', text: "A simple romance handhold scene is filmed from three angles. The co-leads are blushing!" },
      { id: 'romance_skinship', text: "The director requests a tighter hug, and the romantic leads linger a second longer after 'Cut!'" },
      { id: 'romance_gaze', text: "The quiet romantic tension during the sunset confession scene had the entire staff holding their breath." },
    ],
    Action: [
      { id: 'action_stunt', text: "The action leads spent four hours practicing safety wire-work for a dramatic leap." },
      { id: 'action_choreography', text: "The fight choreographer is praising the action leads' synchronized martial arts movement." },
      { id: 'action_exhaust', text: "After five exhausting takes of the action chase scene, the leads share a high-five." },
    ],
    'Sci-Fi': [
      { id: 'scifi_green', text: "Acting in front of a giant green screen for hours is testing the Sci-Fi cast's imagination!" },
      { id: 'scifi_helmet', text: "The futuristic costume helmets keep fogging up, leading to hilarious visor-wiping breaks." },
    ],
    Drama: [
      { id: 'drama_tears', text: "The lead actor delivered such an intense crying scene that the drama makeup artist was crying too." },
      { id: 'drama_monologue', text: "A heavy, emotional argument scene is completed in one long, flawless drama master take." },
    ],
    Thriller: [
      { id: 'thriller_heartbeat', text: "The director uses a heavy background drone sound on set to keep the Thriller actors' hearts pounding." },
      { id: 'thriller_tension', text: "A high-stakes interrogation scene had the entire Thriller set completely silent and focused." },
    ],
    Historical: [
      { id: 'historical_robes', text: "The actors are finding the heavy historical robes challenging to navigate around modern cables." },
      { id: 'historical_set', text: "The beautifully reconstructed historical courtyard set has everyone feeling like they stepped back in time." },
    ],
    Office: [
      { id: 'office_coffee', text: "The cast is filming desk scenes, drinking real coffee, and discussing office BL dynamics." },
      { id: 'office_elevator', text: "A lingering glance in a crowded elevator scene is practiced multiple times to build tension." },
    ],
    School: [
      { id: 'school_uniform', text: "The cast members look nostalgic and charming while trying on their tailored school uniforms." },
      { id: 'school_classroom', text: "Filming classroom desk confessions brings back sweet school memories for the leads." },
    ],
    Default: [
      { id: 'def_coffee', text: "The crew sets up a warm coffee truck on set to battle the early morning chill." },
      { id: 'def_lines', text: "The cast gathers in a circle for a quick table read before the cameras start rolling." },
      { id: 'def_bloopers', text: "A minor slip-up during a walking shot ends in playful teasing from the director." },
    ]
  },
  chemistry: {
    high: [
      { id: 'chem_high_cut', text: "The leads' natural comfort is so strong that the director forgot to yell 'Cut!' during their handhold." },
      { id: 'chem_high_flirt', text: "The leads are spotted sharing a set of headphones, laughing at a video between scenes." },
      { id: 'chem_high_improv', text: "The co-leads' unscripted romantic banter is so natural it is being written into the show." },
    ],
    low: [
      { id: 'chem_low_coaches', text: "The director organizes a quick bonding game to help the leads break the ice." },
      { id: 'chem_low_rehearse', text: "The leads are seen practicing their lines with the assistant director rather than together." },
    ]
  },
  cast: {
    fixed: [
      { id: 'cast_fixed_truck', text: "Shippers sent a massive food truck celebrating the leads' return together as a Fixed CP!" },
      { id: 'cast_fixed_sync', text: "The leads' established on-screen rhythm allows them to complete three pages of dialogue in one take." },
    ],
    large: [
      { id: 'cast_large_lunch', text: "Lunch break on set looks like a chaotic cafeteria with the massive ensemble cast present." },
    ],
    rookie: [
      { id: 'cast_rookie_nervous', text: "The rookie lead actor is nervous but receives warm guidance from the experienced director." },
    ]
  },
  platform: {
    streaming: [
      { id: 'plat_stream_bts', text: "The marketing team captures a funny vertical video of the leads for a streaming teaser." },
    ],
    tv: [
      { id: 'plat_tv_censor', text: "A standards representative reviews the kiss scene block to ensure PG-13 television compliance." },
    ]
  },
  story: {
    adaptation: [
      { id: 'story_adapt_fans', text: "A leaked photo of the leads in costume is praised by fans of the original work for its accuracy." },
    ]
  }
}

/**
 * Generate a context-aware production atmosphere message.
 * @param {object} prod      - active production object
 * @param {Array}  actors    - full actors list from state
 * @returns {{ text: string, usedIds: Array }} - generated message and new list of used message IDs
 */
export function generateAtmosphereMessage(prod, actors) {
  const usedIds = Array.isArray(prod.usedAtmosphereIds) ? [...prod.usedAtmosphereIds] : []

  // Gather matching candidates
  let candidates = []

  // 1. Genre Context
  const genreList = ATMOSPHERE_DATA.genres[prod.genre] || ATMOSPHERE_DATA.genres.Default
  candidates = candidates.concat(genreList)

  // 2. Chemistry Context
  const castActors = actors.filter(a => (prod.castIds ?? []).includes(a.id))
  const leads = castActors.filter(a => (prod.leadIds ?? []).includes(a.id))
  const chemValue = leads.length >= 2
    ? getChem(leads[0], leads[1].id)
    : castActors.length >= 2
      ? getChem(castActors[0], castActors[1].id)
      : 0

  if (chemValue >= 75) {
    candidates = candidates.concat(ATMOSPHERE_DATA.chemistry.high)
  } else if (chemValue < 30 && leads.length >= 2) {
    candidates = candidates.concat(ATMOSPHERE_DATA.chemistry.low)
  }

  // 3. Fixed CP Context
  const isFixed = prod.fixedCP || false
  if (isFixed) {
    candidates = candidates.concat(ATMOSPHERE_DATA.cast.fixed)
  }

  // 4. Large Ensemble
  if ((prod.castIds ?? []).length >= 3) {
    candidates = candidates.concat(ATMOSPHERE_DATA.cast.large)
  }

  // 5. Rookie Cast
  const hasRookie = castActors.some(a => a.tier === 'Rookie')
  if (hasRookie) {
    candidates = candidates.concat(ATMOSPHERE_DATA.cast.rookie)
  }

  // 6. Platform
  if (prod.platform && ATMOSPHERE_DATA.platform[prod.platform]) {
    candidates = candidates.concat(ATMOSPHERE_DATA.platform[prod.platform])
  }

  // 7. Story Source
  if (prod.story && ATMOSPHERE_DATA.story[prod.story]) {
    candidates = candidates.concat(ATMOSPHERE_DATA.story[prod.story])
  }

  // Fallback to default atmosphere if no candidates gathered
  if (candidates.length === 0) {
    candidates = ATMOSPHERE_DATA.genres.Default
  }

  // Repeat prevention filter
  let freshCandidates = candidates.filter(c => !usedIds.includes(c.id))

  // If all messages have been used, reset the tracker to allow them again
  if (freshCandidates.length === 0) {
    usedIds.length = 0 // clear array
    freshCandidates = candidates
  }

  // Pick a random message
  const picked = freshCandidates[Math.floor(Math.random() * freshCandidates.length)]
  usedIds.push(picked.id)

  return {
    text: picked.text,
    usedIds
  }
}
