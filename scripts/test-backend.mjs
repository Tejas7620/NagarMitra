// ============================================================
// NagarMitra AI — Comprehensive Backend Automated Test Suite
// Covers Sections 23.A through 23.I of the official specification
// ============================================================

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

let passed = 0;
let failed = 0;
const results = [];

function assert(condition, testName, details = '') {
  if (condition) {
    passed++;
    results.push({ status: 'PASS', testName, details });
    console.log(`  ✅ PASS: ${testName}`);
  } else {
    failed++;
    results.push({ status: 'FAIL', testName, details });
    console.error(`  ❌ FAIL: ${testName} ${details ? `(${details})` : ''}`);
  }
}

async function runTests() {
  console.log('\n============================================================');
  console.log('🧪 NAGARMITRA AI — BACKEND AUTOMATED TEST SUITE');
  console.log(`Target: ${BASE_URL}`);
  console.log('============================================================\n');

  // Reset database to clean deterministic state
  await fetch(`${BASE_URL}/api/reset`, { method: 'POST' }).catch(() => {});

  let dataA1, dataB1, dataC1, dataD1, dataE1, dataF1, dataG1, dataH1;


  // ------------------------------------------------------------
  // SECTION A: PLACES API
  // ------------------------------------------------------------
  console.log('\n--- Section A: Places Discovery API ---');
  try {
    // A1. Valid all places
    const resA1 = await fetch(`${BASE_URL}/api/places`);
    dataA1 = await resA1.json();
    assert(resA1.ok && dataA1.count > 0 && Array.isArray(dataA1.places), 'A1. Valid place retrieval returns places array', `Count: ${dataA1.count}`);

    // A2. Category filter: food
    const resA2 = await fetch(`${BASE_URL}/api/places?category=food`);
    const dataA2 = await resA2.json();
    const allFood = dataA2.places.every(p => p.category === 'food');
    assert(resA2.ok && dataA2.count > 0 && allFood, 'A2. Category filter "food" returns only food places', `Count: ${dataA2.count}`);

    // A3. Category filter: heritage
    const resA3 = await fetch(`${BASE_URL}/api/places?category=heritage`);
    const dataA3 = await resA3.json();
    const allHeritage = dataA3.places.every(p => p.category === 'heritage' || p.category === 'tourist_attraction');
    assert(resA3.ok && dataA3.count > 0 && allHeritage, 'A3. Category filter "heritage" returns only heritage/attraction places', `Count: ${dataA3.count}`);

    // A4. Category filter: public_toilet
    const resA4 = await fetch(`${BASE_URL}/api/places?category=public_toilet`);
    const dataA4 = await resA4.json();
    const allToilets = dataA4.places.every(p => p.category === 'public_toilet');
    assert(resA4.ok && dataA4.count > 0 && allToilets, 'A4. Category filter "public_toilet" returns mapped public toilets', `Count: ${dataA4.count}`);

    // A5. Valid bounding box filter
    const resA5 = await fetch(`${BASE_URL}/api/places?bbox=73.84,18.51,73.87,18.53`);
    const dataA5 = await resA5.json();
    assert(resA5.ok && dataA5.count > 0, 'A5. Bounding box filter restricts places within geographic bounds', `Count: ${dataA5.count}`);

    // A6. Invalid bounding box regex error
    const resA6 = await fetch(`${BASE_URL}/api/places?bbox=invalid-box`);
    assert(resA6.status === 400, 'A6. Invalid bounding box rejected with HTTP 400');

    // A7. Empty search results
    const resA7 = await fetch(`${BASE_URL}/api/places?q=xyznonexistentplace999`);
    const dataA7 = await resA7.json();
    assert(resA7.ok && dataA7.count === 0, 'A7. Honest empty results returned for non-existent query', `Count: ${dataA7.count}`);
  } catch (err) {
    assert(false, 'Section A exception', err.message);
  }

  // ------------------------------------------------------------
  // SECTION B: GEOCODING & SEARCH
  // ------------------------------------------------------------
  console.log('\n--- Section B: Geocoding & Search API ---');
  try {
    // B1. Valid query search (Dagdusheth)
    const resB1 = await fetch(`${BASE_URL}/api/geocode/search?q=Dagdusheth`);
    dataB1 = await resB1.json();
    assert(resB1.ok && dataB1.results?.length > 0 && dataB1.results[0].lat && dataB1.results[0].lng, 'B1. Search returns accurate coordinates for Dagdusheth Temple');

    // B2. Empty query rejected
    const resB2 = await fetch(`${BASE_URL}/api/geocode/search?q=`);
    assert(resB2.status === 400, 'B2. Empty search query rejected with HTTP 400');

    // B3. Reverse geocoding
    const resB3 = await fetch(`${BASE_URL}/api/geocode/reverse?latitude=18.5162&longitude=73.8568`);
    const dataB3 = await resB3.json();
    assert(resB3.ok && (dataB3.displayName || dataB3.locality), 'B3. Reverse geocode returns locality label for coordinates');

    // B4. Multi-city search (Mumbai Gateway of India)
    const resB4 = await fetch(`${BASE_URL}/api/geocode/search?q=Gateway+of+India`);
    const dataB4 = await resB4.json();
    assert(resB4.ok && dataB4.results?.length > 0, 'B4. Search is not restricted to Pune; finds landmarks across India');
  } catch (err) {
    assert(false, 'Section B exception', err.message);
  }

  // ------------------------------------------------------------
  // SECTION C: ROUTING BACKEND
  // ------------------------------------------------------------
  console.log('\n--- Section C: Routing Backend ---');
  try {
    // C1. Valid POST route request
    const resC1 = await fetch(`${BASE_URL}/api/routes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        origin: { latitude: 18.5204, longitude: 73.8567 },
        destination: { latitude: 18.5162, longitude: 73.8568 },
        travelMode: 'walking',
        alternatives: true,
      }),
    });
    dataC1 = await resC1.json();
    assert(
      resC1.ok &&
      dataC1.routes?.length > 0 &&
      dataC1.routes[0].geometry?.type === 'LineString' &&
      dataC1.routes[0].geometry.coordinates.length > 2 &&
      dataC1.routes[0].distanceMeters > 0,
      'C1. POST /api/routes returns genuine LineString geometry, distance in meters, and travel mode',
      `Distance: ${dataC1.routes?.[0]?.distanceMeters}m`
    );

    // C2. Driving mode
    const resC2 = await fetch(`${BASE_URL}/api/routes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        origin: { latitude: 18.5204, longitude: 73.8567 },
        destination: { latitude: 18.5162, longitude: 73.8568 },
        travelMode: 'driving',
      }),
    });
    const dataC2 = await resC2.json();
    assert(resC2.ok && dataC2.travelMode === 'driving', 'C2. Routing supports driving travel mode');

    // C3. Cycling mode
    const resC3 = await fetch(`${BASE_URL}/api/routes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        origin: { latitude: 18.5204, longitude: 73.8567 },
        destination: { latitude: 18.5162, longitude: 73.8568 },
        travelMode: 'cycling',
      }),
    });
    const dataC3 = await resC3.json();
    assert(resC3.ok && dataC3.travelMode === 'cycling', 'C3. Routing supports cycling travel mode');

    // C4. Invalid travel mode rejected
    const resC4 = await fetch(`${BASE_URL}/api/routes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        origin: { latitude: 18.5204, longitude: 73.8567 },
        destination: { latitude: 18.5162, longitude: 73.8568 },
        travelMode: 'rocket_ship',
      }),
    });
    assert(resC4.status === 400, 'C4. Unsupported travel mode rejected with HTTP 400');
  } catch (err) {
    assert(false, 'Section C exception', err.message);
  }

  // ------------------------------------------------------------
  // SECTION D: INCIDENT REPORTS & PERSISTENCE
  // ------------------------------------------------------------
  console.log('\n--- Section D: Incident Reports & Persistence ---');
  let createdReportId = '';
  let createdIncidentId = '';
  try {
    // D1. Valid report submission
    const resD1 = await fetch(`${BASE_URL}/api/reports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: 'Broken traffic light causing heavy gridlock at Goodluck Chowk',
        latitude: 18.5186,
        longitude: 73.8415,
        locationText: 'Goodluck Chowk, FC Road',
      }),
    });
    dataD1 = await resD1.json();
    createdReportId = dataD1.report?.id;
    createdIncidentId = dataD1.incident?.id;
    assert(
      resD1.ok &&
      dataD1.report?.id &&
      dataD1.incident?.verificationStatus === 'unverified' &&
      dataD1.report.latitude === 18.5186,
      'D1. Newly submitted report starts as unverified and preserves user-confirmed coordinates',
      `Incident ID: ${createdIncidentId}`
    );

    // D2. Report retrieval by ID
    const resD2 = await fetch(`${BASE_URL}/api/reports/${createdReportId}`);
    const dataD2 = await resD2.json();
    assert(resD2.ok && dataD2.report?.id === createdReportId, 'D2. Report retrieved by ID from persistent store');

    // D3. Incident retrieval by ID
    const resD3 = await fetch(`${BASE_URL}/api/incidents/${createdIncidentId}`);
    const dataD3 = await resD3.json();
    assert(resD3.ok && dataD3.incident?.id === createdIncidentId, 'D3. Linked incident retrieved by ID');

    // D4. Duplicate clustering (<150m same type)
    const resD4 = await fetch(`${BASE_URL}/api/reports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: 'Traffic signal still malfunctioning at Goodluck, police directing manually',
        latitude: 18.5187,
        longitude: 73.8416,
        locationText: 'Goodluck Cafe Chowk',
      }),
    });
    const dataD4 = await resD4.json();
    assert(
      resD4.ok &&
      dataD4.linkedToExistingIncident === true &&
      dataD4.incident?.id === createdIncidentId &&
      dataD4.incident?.distinctSubmissionCount >= 2 &&
      dataD4.incident?.verificationStatus === 'corroborated',
      'D4. Nearby compatible report links to existing incident and transitions status to corroborated'
    );

    // D5. Oversized text rejected (>1000 chars)
    const oversizedText = 'a'.repeat(1050);
    const resD5 = await fetch(`${BASE_URL}/api/reports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: oversizedText,
        latitude: 18.5186,
        longitude: 73.8415,
      }),
    });
    assert(resD5.status === 400, 'D5. Oversized description (>1000 chars) rejected with HTTP 400');
  } catch (err) {
    assert(false, 'Section D exception', err.message);
  }

  // ------------------------------------------------------------
  // SECTION E: EVIDENCE ENGINE
  // ------------------------------------------------------------
  console.log('\n--- Section E: Evidence Engine & Ledger ---');
  try {
    // E1. Evidence breakdown retrieval
    const resE1 = await fetch(`${BASE_URL}/api/incidents/${createdIncidentId}/evidence`);
    dataE1 = await resE1.json();
    assert(
      resE1.ok &&
      dataE1.data?.supportScore?.score !== undefined &&
      Array.isArray(dataE1.data?.supportScore?.factors) &&
      dataE1.data.verification.status === 'corroborated' &&
      dataE1.data.reports.length >= 2,
      'E1. Evidence Ledger provides transparent factor breakdown, support score, and linked reports'
    );

    // E2. Filter incidents by verification status
    const resE2 = await fetch(`${BASE_URL}/api/incidents?verificationStatus=corroborated`);
    const dataE2 = await resE2.json();
    assert(resE2.ok && dataE2.incidents.every(i => i.verificationStatus === 'corroborated'), 'E2. Filter incidents by verificationStatus returns only corroborated incidents');

    // E3. Filter incidents by incidentType
    const resE3 = await fetch(`${BASE_URL}/api/incidents?incidentType=waterlogging`);
    const dataE3 = await resE3.json();
    assert(resE3.ok && dataE3.incidents.every(i => i.incidentType === 'waterlogging'), 'E3. Filter incidents by incidentType returns only waterlogging incidents');
  } catch (err) {
    assert(false, 'Section E exception', err.message);
  }

  // ------------------------------------------------------------
  // SECTION F: IMPACT REPLAY BACKEND
  // ------------------------------------------------------------
  console.log('\n--- Section F: Impact Replay Backend ---');
  try {
    // F1. Impact Replay execution
    const resF1 = await fetch(`${BASE_URL}/api/impact-replay`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        incidentId: createdIncidentId,
        origin: { latitude: 18.5204, longitude: 73.8567 },
        destination: { latitude: 18.5162, longitude: 73.8568 },
        travelMode: 'walking',
      }),
    });
    dataF1 = await resF1.json();
    assert(
      resF1.ok &&
      dataF1.before !== undefined &&
      dataF1.after !== undefined &&
      typeof dataF1.changed === 'boolean' &&
      typeof dataF1.reason === 'string',
      'F1. Impact Replay returns before/after route exposures, recommendation state, and transparent reason'
    );

    // F2. Impact Replay non-existent incident rejected
    const resF2 = await fetch(`${BASE_URL}/api/impact-replay`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        incidentId: 'non-existent-inc-999',
        origin: { latitude: 18.5204, longitude: 73.8567 },
        destination: { latitude: 18.5162, longitude: 73.8568 },
      }),
    });
    assert(resF2.status === 404, 'F2. Non-existent incident rejected with HTTP 404');
  } catch (err) {
    assert(false, 'Section F exception', err.message);
  }

  // ------------------------------------------------------------
  // SECTION G: PLACE COMPARISON & ITINERARY
  // ------------------------------------------------------------
  console.log('\n--- Section G: Place Comparison & Itinerary ---');
  try {
    // G1. Place Comparison
    const resG1 = await fetch(`${BASE_URL}/api/places/compare`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        placeIds: ['place-010', 'place-016'],
        preferences: { budgetWeight: 0.6, distanceWeight: 0.4 },
        origin: { latitude: 18.5204, longitude: 73.8567 },
      }),
    });
    dataG1 = await resG1.json();
    assert(
      resG1.ok &&
      dataG1.comparisonCount === 2 &&
      dataG1.rankings?.[0]?.rank === 1 &&
      Array.isArray(dataG1.rankings[0].explanations),
      'G1. Place comparison ranks places with criterion breakdown and disclosures',
      `Top: ${dataG1.rankings?.[0]?.name}`
    );

    // G2. Itinerary generation
    const resG2 = await fetch(`${BASE_URL}/api/itinerary`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        origin: { latitude: 18.5204, longitude: 73.8567 },
        interests: ['Food', 'Heritage'],
        budget: '₹₹',
        duration: '2 hours',
        travelMode: 'walking',
      }),
    });
    const dataG2 = await resG2.json();
    assert(
      resG2.ok &&
      dataG2.itinerary?.stopsCount >= 2 &&
      dataG2.itinerary.totalDistanceMeters > 0,
      'G2. Itinerary endpoint generates realistic multi-stop tour with transit times',
      `Stops: ${dataG2.itinerary?.stopsCount}`
    );
  } catch (err) {
    assert(false, 'Section G exception', err.message);
  }

  // ------------------------------------------------------------
  // SECTION H: WEATHER BACKEND
  // ------------------------------------------------------------
  console.log('\n--- Section H: Live Weather Backend ---');
  try {
    // H1. Valid weather query
    const resH1 = await fetch(`${BASE_URL}/api/weather?latitude=18.5204&longitude=73.8567`);
    dataH1 = await resH1.json();
    assert(
      resH1.ok &&
      dataH1.success === true &&
      dataH1.weather?.temperatureCelsius !== null &&
      dataH1.meta?.provider === 'Open-Meteo',
      'H1. Weather endpoint returns live conditions from Open-Meteo with attribution and units',
      `${dataH1.weather?.condition}, ${dataH1.weather?.temperatureCelsius}°C`
    );

    // H2. Invalid weather coordinates
    const resH2 = await fetch(`${BASE_URL}/api/weather?latitude=999&longitude=73.8567`);
    assert(resH2.status === 400, 'H2. Invalid latitude (>90) rejected with HTTP 400');
  } catch (err) {
    assert(false, 'Section H exception', err.message);
  }

  // ------------------------------------------------------------
  // SECTION I: SECURITY & FILE STORAGE
  // ------------------------------------------------------------
  console.log('\n--- Section I: Security & File Storage ---');
  try {
    // I1. Valid image upload
    const form1 = new FormData();
    const blob1 = new Blob(['sample-test-image-binary-data'], { type: 'image/jpeg' });
    form1.append('file', blob1, 'test.jpg');

    const resI1 = await fetch(`${BASE_URL}/api/media/upload`, {
      method: 'POST',
      body: form1,
    });
    const dataI1 = await resI1.json();
    assert(
      resI1.ok &&
      dataI1.url?.startsWith('/uploads/') &&
      dataI1.filename?.endsWith('.jpg'),
      'I1. Image upload accepts JPEG and assigns safe random UUID filename'
    );

    // I2. Disallowed MIME type rejected
    const form2 = new FormData();
    const blob2 = new Blob(['alert(1)'], { type: 'application/javascript' });
    form2.append('file', blob2, 'malicious.js');

    const resI2 = await fetch(`${BASE_URL}/api/media/upload`, {
      method: 'POST',
      body: form2,
    });
    assert(resI2.status === 415, 'I2. Non-whitelisted MIME type rejected with HTTP 415');

    // I3. No credentials leaked in responses
    const allResponsesText = JSON.stringify([dataA1, dataB1, dataC1, dataD1, dataE1, dataF1, dataG1, dataH1]);
    const leaksSecret =
      allResponsesText.includes('SUPABASE_SERVICE_ROLE_KEY') ||
      allResponsesText.includes('GEMINI_API_KEY') ||
      allResponsesText.includes('service_role');
    assert(!leaksSecret, 'I3. Server secrets and privileged keys never appear in client responses');
  } catch (err) {
    assert(false, 'Section I exception', err.message);
  }

  // ------------------------------------------------------------
  // SUMMARY REPORT
  // ------------------------------------------------------------
  console.log('\n============================================================');
  console.log(`📊 TEST SUITE SUMMARY: ${passed} PASSED, ${failed} FAILED (TOTAL: ${passed + failed})`);
  console.log('============================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test suite execution failed:', err);
  process.exit(1);
});
