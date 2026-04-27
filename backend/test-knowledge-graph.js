require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./src/config/db');
const knowledgeGraphService = require('./src/services/knowledgeGraphService');

async function main() {
  await connectDB();

  const testId = process.env.KG_TEST_ID;
  if (!testId) {
    console.log('KG_TEST_ID not set. Set it to a Test _id to inspect KG data.');
    await mongoose.connection.close();
    return;
  }

  const summary = await knowledgeGraphService.getGraphSummary({ testId });
  console.log('Knowledge Graph Summary:', {
    nodes: summary.nodeCount,
    edges: summary.edgeCount,
    topConcepts: summary.topConcepts.map((c) => c.name)
  });

  if (summary.topConcepts.length > 0) {
    const first = summary.topConcepts[0];
    const related = await knowledgeGraphService.getRelatedConcepts({
      testId,
      concept: first.name,
      limit: 5
    });
    console.log(`Related concepts for "${first.name}":`, related.map((c) => c.name));
  }

  await mongoose.connection.close();
}

main().catch(async (err) => {
  console.error('KG test failed:', err.message);
  await mongoose.connection.close();
  process.exit(1);
});
