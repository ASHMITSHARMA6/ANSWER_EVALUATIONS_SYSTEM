/**
 * test-rag.js — End-to-end test for the RAG service.
 * Runs directly against the service (no HTTP) so it works even before
 * the server is restarted.
 *
 * Usage:  cd backend && node test-rag.js
 */

require('dotenv').config();

const vectorDbService = require('./src/services/vectorDbService');
const ragService = require('./src/services/ragService');

async function main() {
  console.log('═══════════════════════════════════════════════');
  console.log('  RAG End-to-End Test');
  console.log('═══════════════════════════════════════════════\n');

  // 1. Initialize vector DB (loads persisted data)
  vectorDbService.initializeVectorDB();
  const stats = vectorDbService.getStats();
  console.log('[1/4] Vector DB loaded — material chunks:', stats.material.size,
    ' answer chunks:', stats.answers.size, '\n');

  if (stats.material.size === 0) {
    console.log('⚠  No material in vector DB. Upload study material first, then re-run.');
    process.exit(0);
  }

  // 2. Retrieval-only test
  const testQuery = 'What is RAG and why does it matter?';
  console.log('[2/4] Retrieval test — query: "' + testQuery + '"');
  const retrieved = await ragService.retrieveContext(testQuery, 3);
  retrieved.forEach((r, i) => {
    console.log('  [' + (i + 1) + '] score=' + r.score.toFixed(4) +
      '  source=' + r.source + '  section=' + r.section);
    console.log('      ' + r.text.slice(0, 120).replace(/\n/g, ' ') + '…\n');
  });

  // 3. Full RAG Q&A
  console.log('[3/4] Full RAG Q&A — calling LLM with retrieved context…');
  const start = Date.now();
  const result = await ragService.query(testQuery, { topK: 3, mode: 'qa', debug: true });
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);

  console.log('\n─── ANSWER (' + elapsed + 's, model=' + result.model + ') ───');
  console.log(result.answer);
  console.log('\n─── SOURCES USED ───');
  result.sources.forEach((s) => {
    console.log('  [' + s.id + '] ' + s.source + ' — ' + s.section + '  (score ' + s.score + ')');
  });

  // 4. RAG Evaluate test
  console.log('\n[4/4] RAG Evaluate test — evaluating a sample student answer…');
  const evalResult = await ragService.evaluateWithRAG(
    'RAG combines a model with external data sources to give better answers.',
    'Explain Retrieval-Augmented Generation.',
    3
  );
  console.log('  Score:   ' + evalResult.score + '/100');
  console.log('  Matched: ' + (evalResult.matchedConcepts || []).join(', '));
  console.log('  Missing: ' + (evalResult.missingConcepts || []).join(', '));
  console.log('  Feedback: ' + (evalResult.feedback || '').slice(0, 200));

  console.log('\n═══════════════════════════════════════════════');
  console.log('  ✅  All RAG tests completed successfully');
  console.log('═══════════════════════════════════════════════');

  process.exit(0);
}

main().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
