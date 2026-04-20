const express = require("express");
const db = require("../db");
const { auth } = require("../middleware/auth");
const { requireRole } = require("../middleware/requireRole");

const router = express.Router();

/* Text utilities */
function normalize(text = "") { return String(text).toLowerCase().trim(); }

function tokenize(text = "") {
  return normalize(text).replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(Boolean);
}

function unique(arr = []) { return [...new Set(arr)]; }

/*  Intent detection */
function detectIntent(message = "") {
  const msg = normalize(message);
  const rules = [
    { intent: "laws", keywords: ["law", "illegal", "allowed", "forbidden", "rule", "rules", "legal"] },
    { intent: "etiquette", keywords: ["etiquette", "respect", "rude", "polite", "manners", "custom", "culture"] },
    { intent: "transport", keywords: ["transport", "train", "bus", "metro", "subway", "taxi", "ferry", "travel around"] },
    { intent: "photography", keywords: ["photo", "photos", "camera", "filming", "pictures", "recording"] },
    { intent: "food", keywords: ["food", "eat", "restaurant", "meal", "dining", "tip", "tipping", "drink"] },
    { intent: "safety", keywords: ["safe", "safety", "danger", "pickpocket", "crime", "unsafe"] },
    { intent: "scams", keywords: ["scam", "tourist trap", "overcharge", "fake guide", "rip off"] },
    { intent: "weather", keywords: ["weather", "rain", "cold", "hot", "snow", "clothes", "temperature"] },
    { intent: "timing", keywords: ["best time", "when should i go", "when to visit", "timing", "season", "month"] },
    { intent: "dress_code", keywords: ["wear", "dress", "dress code", "clothes", "shoulders", "knees"] },
    { intent: "religious_sites", keywords: ["temple", "church", "mosque", "shrine", "religious site", "sacred"] },
    { intent: "nightlife", keywords: ["nightlife", "night", "bar", "club", "late", "drinks"] },
    { intent: "budget", keywords: ["budget", "cheap", "expensive", "afford", "cost", "price", "save money"] },
    { intent: "solo_travel", keywords: ["solo", "alone", "travelling alone", "traveling alone"] },
    { intent: "family_travel", keywords: ["family", "kids", "children", "baby"] },
    { intent: "emergency", keywords: ["emergency", "hospital", "police", "help", "lost passport", "ambulance"] }
  ];
  for (const rule of rules) {
    if (rule.keywords.some(k => msg.includes(k))) return rule.intent;
  }
  return "general";
}

function categoryForIntent(intent) {
  const map = {
    etiquette: ["etiquette", "culture"],
    laws: ["laws"],
    safety: ["safety"],
    scams: ["safety", "laws"],
    transport: ["transport"],
    food: ["food", "culture"],
    weather: ["weather"],
    timing: ["timing", "weather"],
    photography: ["etiquette", "culture", "laws"],
    dress_code: ["etiquette", "culture", "laws"],
    religious_sites: ["etiquette", "culture", "laws"],
    nightlife: ["safety", "culture", "laws"],
    budget: ["transport", "food", "timing", "other"],
    solo_travel: ["safety", "transport"],
    family_travel: ["safety", "food", "timing"],
    emergency: ["safety", "laws"],
    general: ["etiquette", "culture", "transport", "food", "safety", "timing", "weather", "laws"]
  };
  return map[intent] || map.general;
}

/* Confidence scoring */

function confidenceFromCounts(kbCount, insightCount, intent) {
  const total = kbCount + insightCount;
  if (total >= 4) return 0.92;
  if (total >= 3) return 0.84;
  if (total >= 2) return 0.74;
  if (total >= 1) return 0.62;
  if (intent !== "general") return 0.46;
  return 0.36;
}

function confidenceLabel(score) {
  if (score >= 0.85) return "High";
  if (score >= 0.6) return "Medium";
  return "Low";
}

/* Database helpers */

function runGet(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => { if (err) reject(err); else resolve(row); });
  });
}

function runAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => { if (err) reject(err); else resolve(rows); });
  });
}

function runWrite(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err); else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

/* Data fetchers */
async function getBookingContext(bookingId, userId) {
  return runGet(
    `SELECT
       b.id AS booking_id, b.traveller_id, b.destination_id, b.accommodation_id,
       b.check_in, b.check_out, b.guests, b.status,
       d.name AS destination_name, d.slug AS destination_slug,
       d.description, d.image_url, d.best_time, d.occasions, d.language_tips,
       c.name AS country_name,
       a.title AS accommodation_title
     FROM bookings b
     JOIN destinations d ON d.id = b.destination_id
     JOIN countries c    ON c.id = d.country_id
     LEFT JOIN accommodations a ON a.id = b.accommodation_id
     WHERE b.id = ? AND b.traveller_id = ?`,
    [bookingId, userId]
  );
}

async function getKnowledge(destinationId, intent) {
  const categories = categoryForIntent(intent);
  const placeholders = categories.map(() => "?").join(",");
  return runAll(
    `SELECT kb.id, cat.name AS category, kb.title, kb.content
     FROM knowledge_base kb
     JOIN kb_categories cat ON cat.id = kb.category_id
     WHERE kb.destination_id = ? AND cat.name IN (${placeholders})
     ORDER BY kb.updated_at DESC, kb.created_at DESC
     LIMIT 20`,
    [destinationId, ...categories]
  );
}

async function getInsights(destinationId) {
  return runAll(
    `SELECT i.id, i.title, i.content, u.full_name AS contributor
     FROM insights i
     JOIN users u ON u.id = i.community_id
     WHERE i.destination_id = ? AND i.status = 'approved'
     ORDER BY i.created_at DESC LIMIT 10`,
    [destinationId]
  );
}


async function getCulturalWarning(destinationId) {
  return runGet(
    `SELECT kb.title, kb.content, cat.name AS category
     FROM knowledge_base kb
     JOIN kb_categories cat ON cat.id = kb.category_id
     WHERE kb.destination_id = ?
       AND cat.name IN ('etiquette','laws','culture')
     ORDER BY kb.updated_at DESC
     LIMIT 1`,
    [destinationId]
  );
}


async function getRecentIntents(sessionId, limit = 4) {
  const rows = await runAll(
    `SELECT intent FROM chat_messages
     WHERE session_id = ? AND sender = 'assistant' AND intent IS NOT NULL
     ORDER BY created_at DESC, id DESC
     LIMIT ?`,
    [sessionId, limit]
  );
  return rows.map(r => r.intent).filter(Boolean);
}

/* Ranking */

function scoreRowAgainstMessage(row, message, intent) {
  const msgTokens = tokenize(message);
  const rowText = `${row.title || ""} ${row.content || ""} ${row.category || ""}`.toLowerCase();
  let score = 0;
  if (row.category && categoryForIntent(intent).includes(row.category)) score += 4;
  msgTokens.forEach(t => { if (rowText.includes(t)) score += 2; });
  if (intent !== "general" && rowText.includes(intent.replace("_", " "))) score += 3;
  if ((row.title || "").length > 0) score += 1;
  return score;
}

function rankKnowledge(rows, message, intent) {
  return [...rows]
    .map(row => ({ ...row, _score: scoreRowAgainstMessage(row, message, intent) }))
    .sort((a, b) => b._score - a._score || a.id - b.id);
}

function rankInsights(rows, message) {
  const msgTokens = tokenize(message);
  return [...rows]
    .map(row => {
      const text = `${row.title || ""} ${row.content || ""}`.toLowerCase();
      let score = 1;
      msgTokens.forEach(t => { if (text.includes(t)) score += 2; });
      return { ...row, _score: score };
    })
    .sort((a, b) => b._score - a._score || a.id - b.id);
}

/* Session management */

async function getOrCreateSession(bookingId, travellerId, destinationId) {
  const existing = await runGet(
    `SELECT * FROM chat_sessions
     WHERE booking_id = ? AND traveller_id = ?
     ORDER BY updated_at DESC LIMIT 1`,
    [bookingId, travellerId]
  );
  if (existing) return existing;

  const created = await runWrite(
    `INSERT INTO chat_sessions (booking_id, traveller_id, destination_id, title, created_at, updated_at)
     VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))`,
    [bookingId, travellerId, destinationId, "TripWise Chatbot"]
  );
  return runGet(`SELECT * FROM chat_sessions WHERE id = ?`, [created.lastID]);
}

async function saveMessage(sessionId, sender, messageText, intent = null, confidence = null, sources = null) {
  const result = await runWrite(
    `INSERT INTO chat_messages (session_id, sender, message_text, intent, confidence, sources_json, created_at)
     VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
    [sessionId, sender, messageText, intent, confidence, sources ? JSON.stringify(sources) : null]
  );
  await runWrite(`UPDATE chat_sessions SET updated_at = datetime('now') WHERE id = ?`, [sessionId]);
  return result.lastID;
}

/* Response builders */

function buildIntro(context) {
  return [
    `Welcome to your TripWise chatbot for ${context.destination_name}, ${context.country_name}.`,
    context.accommodation_title ? `Accommodation: ${context.accommodation_title}` : null,
    `Travel dates: ${context.check_in} to ${context.check_out}.`,
    `Guests: ${context.guests}.`,
    `Best time to visit: ${context.best_time || "Varies by season"}`,
    `Popular occasions: ${context.occasions || "Local seasonal events"}`,
    `Language tip: ${context.language_tips || "Learn a few polite phrases"}`,
    "",
    "You can ask about etiquette, local laws, transport, scams, safety, food, weather, photography, dress code, religious sites, budgeting, solo travel, family travel, or common tourist mistakes."
  ].filter(Boolean).join("\n");
}

function buildTripTypeAdvice(tripType) {
  if (!tripType) return [];
  const advice = {
    "Solo": ["As a solo traveller, keep your itinerary shared with someone you trust.",
      "Stay in well-reviewed accommodation and keep emergency contacts saved offline."],
    "Couple": ["Be aware that public displays of affection rules vary significantly by destination.",
      "Research romantic etiquette and any local customs around couples at religious sites."],
    "Family": ["Prioritise child-friendly transport options and avoid peak crowd times at major sites.",
      "Check whether attractions offer family pricing and accessible facilities."],
    "Friends": ["Large groups can attract more attention — stay aware of local noise and behaviour rules.",
      "Splitting up for transport in busy areas can reduce disruption to locals."],
    "Business": ["Dress conservatively and research local business card and greeting etiquette.",
      "Punctuality expectations and hierarchy in meetings vary widely across cultures."]
  };
  return advice[tripType] || [];
}

function buildContextAdvice(context, intent) {
  const notes = [];
  if (context.guests >= 4) {
    notes.push("Because this is a larger group booking, plan transport and entry timings in advance.");
  } else if (context.guests === 1) {
    notes.push("As a solo traveller, staying aware of navigation, timing, and safety cues is especially useful.");
  }
  if (context.accommodation_title) {
    notes.push(`Since you are staying at ${context.accommodation_title}, keep the address available offline for transport and emergencies.`);
  }
  if (intent === "budget") {
    notes.push("Budget questions are best answered by combining transport, food, and timing advice.");
  }
  return notes;
}

function buildFollowUps(intent) {
  const map = {
    etiquette: ["Ask what behaviour tourists should avoid", "Ask about religious site etiquette"],
    laws: ["Ask which tourist mistakes could cause fines", "Ask about photography restrictions"],
    transport: ["Ask how to get around cheaply", "Ask which transport mistakes tourists make"],
    safety: ["Ask about scams to watch for", "Ask whether crowded areas need extra caution"],
    scams: ["Ask how locals spot tourist traps", "Ask what offers to avoid"],
    food: ["Ask about dining customs", "Ask about tipping expectations"],
    photography: ["Ask where cameras may be inappropriate", "Ask about temple or sacred-site rules"],
    dress_code: ["Ask what to wear at religious sites", "Ask what clothing tourists should avoid"],
    religious_sites: ["Ask how to behave at temples or shrines", "Ask about respectful clothing"],
    weather: ["Ask what to pack", "Ask the best season for your trip"],
    timing: ["Ask what time of day is best for major attractions", "Ask which months are busiest"],
    budget: ["Ask about free attractions", "Ask about affordable local transport"],
    solo_travel: ["Ask about safety for solo travellers", "Ask about meeting other travellers"],
    family_travel: ["Ask about child-friendly attractions", "Ask about family transport options"],
    emergency: ["Ask what emergency numbers to save", "Ask about travel insurance advice"],
    general: ["Ask about etiquette", "Ask about transport", "Ask about safety"]
  };
  return map[intent] || map.general;
}


function buildSessionSummary(intents = [], destinationName = "") {
  if (!intents.length) return null;

  const unique_intents = [...new Set(intents)];
  const readable = unique_intents.map(i => i.replace(/_/g, " "));

  return [
    `Session summary for ${destinationName}:`,
    `You explored ${unique_intents.length} topic(s) in this conversation:`,
    readable.map(t => `- ${t}`).join("\n"),
    "",
    "Great job preparing for your trip! You can ask more questions anytime."
  ].join("\n");
}

/* Destination food highlights */

function getFoodHighlights(destinationName) {
  const highlights = {
    "Kyoto": { must: ["Kaiseki multi-course dining", "Yudofu tofu hotpot", "Matcha everything — tea, ice cream, wagashi sweets", "Obanzai home-style small dishes"], tip: "Look for restaurants down narrow lanes away from main temple streets for better value." },
    "Tokyo": { must: ["Ramen from a specialist ramen-ya", "Fresh sushi at Tsukiji outer market", "Yakitori skewers from an izakaya", "Tamago sando from a convenience store"], tip: "Convenience stores like 7-Eleven and Lawson have genuinely excellent food — do not overlook them." },
    "Paris": { must: ["Fresh croissant from a local boulangerie", "Steak frites at a classic bistro", "Crêpes from a street stall", "Cheese and charcuterie from a fromagerie"], tip: "Avoid restaurants on the main tourist boulevards — walk one or two streets away for better quality at lower prices." },
    "Rome": { must: ["Cacio e pepe pasta — a Roman classic", "Supplì rice croquettes as a street snack", "Artichoke alla Romana or alla Giudia", "Gelato from a gelateria with covered containers"], tip: "Eat where you see locals eating. If a restaurant has a laminated menu with photos outside, walk past it." },
    "Barcelona": { must: ["Pan con tomate — bread rubbed with tomato and olive oil", "Patatas bravas with aioli", "Fresh seafood paella near the port", "Crema catalana for dessert"], tip: "Eat lunch at a menu del día for the best value — typically three courses with a drink included." },
    "New York": { must: ["A folded New York-style pizza slice", "Everything bagel with cream cheese and lox", "Pastrami on rye from a classic deli", "Dim sum in Flushing, Queens"], tip: "Explore immigrant neighbourhoods like Flushing, Jackson Heights, and Arthur Avenue for the most authentic and affordable food." },
    "Marrakech": { must: ["Chicken or lamb tagine with preserved lemon", "Harira soup with khobz bread", "Bastilla — a sweet and savoury pastry pie", "Fresh-squeezed orange juice from the main square"], tip: "The food stalls in Jemaa el-Fna square are lively and generally good. Always confirm prices before ordering." },
    "Bangkok": { must: ["Pad Thai from a street stall", "Tom yum soup — spicy and sour", "Mango sticky rice for dessert", "Som tam green papaya salad"], tip: "Follow locals to find the best street food. Long queues at a small stall are always a good sign." },
    "Reykjavik": { must: ["Skyr with berries and granola", "Icelandic lamb soup — kjötsúpa", "Arctic char — a local freshwater fish", "Hot dog from Bæjarins Beztu Pylsur with remoulade"], tip: "Iceland is expensive to eat out. Stock up at Bónus supermarket for picnic lunches and save restaurant budgets for dinner." },
    "Siem Reap": { must: ["Fish amok — coconut fish curry steamed in banana leaf", "Lok lak — stir-fried pepper beef", "Nom banh chok — Khmer rice noodles for breakfast", "Fresh fruit shakes from market stalls"], tip: "Walk beyond Pub Street to find smaller local restaurants where the food is more authentic and the prices lower." }
  };
  return highlights[destinationName] || null;
}

/* Intent emoji map */
function intentEmoji(intent) {
  const map = {
    etiquette: "🙏", laws: "⚖️", safety: "🛡️", transport: "🚆",
    photography: "📷", food: "🍽️", weather: "🌤️", timing: "🕐",
    dress_code: "👗", religious_sites: "🏛️", nightlife: "🌙",
    budget: "💰", solo_travel: "🧳", family_travel: "👨‍👩‍👧", emergency: "🚨",
    scams: "⚠️", general: "🌍"
  };
  return map[intent] || "🌍";
}

function buildChatbotAnswer(
  context, message, intent, kbRows, insightRows,
  confidence, tripType = null, interests = null, recentIntents = []
) {
  const lines = [];
  const bestKb = kbRows.slice(0, 4);
  const bestInsights = insightRows.slice(0, 2);
  const contextAdvice = buildContextAdvice(context, intent);
  const tripAdvice = buildTripTypeAdvice(tripType);
  const followUps = buildFollowUps(intent);
  const emoji = intentEmoji(intent);

  /* Header */
  lines.push(`${emoji} ${context.destination_name}, ${context.country_name}`);
  if (recentIntents.length > 0 && recentIntents[0] !== intent) {
    const prevTopic = recentIntents[0].replace(/_/g, " ");
    lines.push(`Following on from your question about ${prevTopic} — here is what you need to know about ${intent.replace(/_/g, " ")}.`);
  }
  lines.push("");

  /* KB guidance */
  if (bestKb.length > 0) {
    lines.push("📌 What you need to know:");
    bestKb.forEach(row => lines.push(`• ${row.title}\n  ${row.content}`));
  } else {
    lines.push("📌 General guidance:");
    lines.push("• Respect local customs and posted rules at all times.");
    lines.push("• Plan transport and major visits in advance.");
    lines.push("• Keep important travel details available offline.");
  }

  /* Community insights */
  if (bestInsights.length > 0) {
    lines.push("");
    lines.push("🌍 From local community partners:");
    bestInsights.forEach(row => {
      const by = row.contributor ? ` — ${row.contributor}` : "";
      lines.push(`• ${row.title}\n  ${row.content}${by}`);
    });
  }

  /* Food highlights */
  const foodHighlights = getFoodHighlights(context.destination_name);
  if (foodHighlights && (intent === "food" || intent === "general")) {
    lines.push("");
    lines.push(`🍽️ Must-try food in ${context.destination_name}:`);
    foodHighlights.must.forEach(item => lines.push(`• ${item}`));
    lines.push(`\n💡 Local tip: ${foodHighlights.tip}`);
  }

  /* Trip type personalisation */
  if (tripAdvice.length > 0) {
    lines.push("");
    lines.push(`✈️ For your ${tripType} trip:`);
    tripAdvice.forEach(item => lines.push(`• ${item}`));
  }

  /* Interests */
  if (interests) {
    lines.push("");
    lines.push(`🎯 Based on your interests (${interests}):`);
    lines.push("• Try asking a focused question combining your interest with a topic — for example 'temple photography rules' or 'food markets to visit'.");
  }

  /* What to avoid */
  const avoidLines = [];
  if (intent === "photography") avoidLines.push("Do not assume photography is welcome in temples, with locals, or in restricted areas.");
  if (intent === "transport") avoidLines.push("Do not rely on last-minute transport planning — especially for late-night services.");
  if (intent === "safety" || intent === "scams") avoidLines.push("Do not accept unofficial offers without verifying prices and legitimacy first.");
  if (intent === "dress_code" || intent === "religious_sites") avoidLines.push("Do not ignore modest clothing requirements — entry is refused at many sites.");
  if (intent === "laws") avoidLines.push("Do not assume tourist behaviour is treated differently from local law-breaking.");
  if (intent === "food") avoidLines.push("Do not eat at tourist-trap restaurants directly outside major attractions — the food and value are almost always better a short walk away.");
  if (intent === "nightlife") avoidLines.push("Do not leave drinks unattended and always agree transport home in advance.");

  if (avoidLines.length > 0) {
    lines.push("");
    lines.push("❌ What to avoid:");
    avoidLines.forEach(item => lines.push(`• ${item}`));
  }

  /* Booking context */
  if (contextAdvice.length > 0) {
    lines.push("");
    lines.push("📋 Specific to your booking:");
    contextAdvice.forEach(item => lines.push(`• ${item}`));
  }

  /* Confidence */
  lines.push("");
  const confPct = Math.round(confidence * 100);
  const confBar = confPct >= 80 ? "🟢" : confPct >= 60 ? "🟡" : "🔴";
  lines.push(`${confBar} Confidence: ${confidenceLabel(confidence)} (${confPct}% grounded match)`);
  if (confidence < 0.5) {
    lines.push("This response draws on general guidance as I found limited destination-specific data for your exact question.");
  }

  lines.push("");
  lines.push("💬 You might also want to ask:");
  followUps.slice(0, 3).forEach(q => lines.push(`• ${q}`));

  return lines.join("\n").trim();
}

/* Routes */

// Get one cultural warning for a destination
router.get("/cultural-warning/:destinationId", auth, requireRole("traveller"), async (req, res) => {
  try {
    const destinationId = Number(req.params.destinationId);
    if (!destinationId) return res.status(400).json({ error: "Invalid destinationId" });

    const warning = await getCulturalWarning(destinationId);
    res.json({ warning: warning || null });
  } catch (err) {
    console.error("Cultural warning error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Get a summary of recent chatbot topics for a booking
router.get("/session-summary/:bookingId", auth, requireRole("traveller"), async (req, res) => {
  try {
    const bookingId = Number(req.params.bookingId);
    const context = await getBookingContext(bookingId, req.user.id);
    if (!context) return res.status(404).json({ error: "Booking not found" });

    const session = await runGet(
      `SELECT * FROM chat_sessions
       WHERE booking_id = ? AND traveller_id = ?
       ORDER BY updated_at DESC LIMIT 1`,
      [bookingId, req.user.id]
    );

    if (!session) return res.json({ summary: null, intents: [] });

    const intents = await getRecentIntents(session.id, 20);
    const summary = buildSessionSummary(intents, context.destination_name);

    res.json({ summary, intents });
  } catch (err) {
    console.error("Session summary error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Generate the first chatbot intro message for a booking
router.post("/generate", auth, requireRole("traveller"), async (req, res) => {
  try {
    const { booking_id } = req.body || {};
    if (!booking_id) return res.status(400).json({ error: "booking_id required" });

    const context = await getBookingContext(booking_id, req.user.id);
    if (!context) return res.status(404).json({ error: "Booking not found" });

    const response = buildIntro(context);
    const prompt = `Initial chatbot guidance for booking ${booking_id}`;

    await runWrite(
      `INSERT INTO chatbot_guidance (booking_id, traveller_id, destination_id, prompt, response, created_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'))`,
      [context.booking_id, req.user.id, context.destination_id, prompt, response]
    );

    const session = await getOrCreateSession(context.booking_id, req.user.id, context.destination_id);

    // Avoid saving the same intro twice
    const existingIntro = await runGet(
      `SELECT id FROM chat_messages
       WHERE session_id = ? AND sender = 'assistant' AND message_text = ? LIMIT 1`,
      [session.id, response]
    );

    if (!existingIntro) {
      await saveMessage(session.id, "assistant", response, "general", 1.0,
        { source_types: ["booking", "destination"] });
    }

    res.json({
      booking_id: context.booking_id,
      destination_id: context.destination_id,
      destination_name: context.destination_name,
      response,
      session_id: session.id
    });
  } catch (err) {
    console.error("Chatbot generate error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Chat with the TripWise chatbot
router.post("/chat", auth, requireRole("traveller"), async (req, res) => {
  try {
    const { booking_id, message, trip_type, interests } = req.body || {};

    if (!booking_id) return res.status(400).json({ error: "booking_id required" });
    if (!message || !String(message).trim()) return res.status(400).json({ error: "message is required" });

    const cleanMessage = String(message).trim();
    const context = await getBookingContext(booking_id, req.user.id);
    if (!context) return res.status(404).json({ error: "Booking not found" });

    const session = await getOrCreateSession(context.booking_id, req.user.id, context.destination_id);
    const intent = detectIntent(cleanMessage);

    const recentIntents = await getRecentIntents(session.id, 4);

    // Fetch relevant data
    const rawKbRows = await getKnowledge(context.destination_id, intent);
    const rawInsightRows = await getInsights(context.destination_id);

    // Rank results
    const kbRows = rankKnowledge(rawKbRows, cleanMessage, intent);
    const insightRows = rankInsights(rawInsightRows, cleanMessage);

    // Estimate confidence
    const confidence = confidenceFromCounts(
      kbRows.slice(0, 3).length,
      insightRows.slice(0, 2).length,
      intent
    );

    const sources = {
      source_types: ["destination", "knowledge_base", "insights"],
      knowledge_base_ids: kbRows.slice(0, 3).map(r => r.id),
      insight_ids: insightRows.slice(0, 2).map(r => r.id),
      categories_used: unique(kbRows.slice(0, 3).map(r => r.category))
    };

    // Create chatbot reply
    const reply = buildChatbotAnswer(
      context, cleanMessage, intent, kbRows, insightRows,
      confidence, trip_type || null, interests || null, recentIntents
    );

    await saveMessage(session.id, "user", cleanMessage, intent, null, null);

    // Save assistant message
    const assistantMessageId = await saveMessage(
      session.id, "assistant", reply, intent, confidence, sources
    );

    await runWrite(
      `INSERT INTO chatbot_guidance (booking_id, traveller_id, destination_id, prompt, response, created_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'))`,
      [context.booking_id, req.user.id, context.destination_id, cleanMessage, reply]
    );

    res.json({
      session_id: session.id,
      assistant_message_id: assistantMessageId,
      intent,
      confidence,
      reply,
      suggested_followups: buildFollowUps(intent)
    });
  } catch (err) {
    console.error("Chatbot chat error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Get chat history for a booking
router.get("/history/:bookingId", auth, requireRole("traveller"), async (req, res) => {
  try {
    const bookingId = Number(req.params.bookingId);
    const context = await getBookingContext(bookingId, req.user.id);
    if (!context) return res.status(404).json({ error: "Booking not found" });

    const session = await runGet(
      `SELECT * FROM chat_sessions
       WHERE booking_id = ? AND traveller_id = ?
       ORDER BY updated_at DESC LIMIT 1`,
      [bookingId, req.user.id]
    );
    if (!session) return res.json({ session: null, messages: [] });

    const messages = await runAll(
      `SELECT id, sender, message_text, intent, confidence, sources_json, created_at
       FROM chat_messages WHERE session_id = ? ORDER BY created_at ASC, id ASC`,
      [session.id]
    );

    res.json({
      session,
      messages: messages.map(m => ({
        ...m,
        sources_json: m.sources_json ? JSON.parse(m.sources_json) : null
      }))
    });
  } catch (err) {
    console.error("Chatbot history error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Save feedback for a chatbot response
router.post("/feedback", auth, requireRole("traveller"), async (req, res) => {
  try {
    const { message_id, booking_id, rating, reason } = req.body || {};

    if (!message_id) return res.status(400).json({ error: "message_id required" });
    if (![1, -1].includes(rating)) return res.status(400).json({ error: "rating must be 1 or -1" });

    // Find the chatbot message
    const message = await runGet(
      `SELECT cm.id, cm.sender, cs.traveller_id, cs.booking_id
       FROM chat_messages cm JOIN chat_sessions cs ON cs.id = cm.session_id WHERE cm.id = ?`,
      [message_id]
    );

    if (!message) return res.status(404).json({ error: "Message not found" });
    if (message.traveller_id !== req.user.id) return res.status(403).json({ error: "Forbidden" });
    if (message.sender !== "assistant") return res.status(400).json({ error: "Feedback only for chatbot messages" });

    // Save feedback
    const result = await runWrite(
      `INSERT INTO chatbot_response_feedback (message_id, traveller_id, booking_id, rating, reason, created_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'))`,
      [message_id, req.user.id, booking_id || message.booking_id || null, rating, reason || null]
    );

    res.status(201).json({ id: result.lastID, message: "Chatbot feedback saved" });
  } catch (err) {
    console.error("Chatbot feedback error:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;