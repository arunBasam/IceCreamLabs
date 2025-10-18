import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const TEST_EMAIL = 'demo@aeotracker.com';
const TEST_PASSWORD = 'demo123456';
const TEST_NAME = 'Demo User';

const engines = ['ChatGPT', 'Gemini', 'Claude', 'Perplexity'];

const sampleKeywords = [
  { keyword: 'AI search optimization', priority: 'high' },
  { keyword: 'brand visibility tracking', priority: 'high' },
  { keyword: 'content marketing strategy', priority: 'medium' },
  { keyword: 'SEO best practices 2025', priority: 'high' },
  { keyword: 'digital marketing trends', priority: 'medium' },
  { keyword: 'search engine visibility', priority: 'high' },
  { keyword: 'AI content discovery', priority: 'medium' },
  { keyword: 'brand awareness metrics', priority: 'medium' },
  { keyword: 'competitive analysis tools', priority: 'low' },
  { keyword: 'online reputation management', priority: 'medium' },
  { keyword: 'search marketing analytics', priority: 'high' },
  { keyword: 'customer engagement strategies', priority: 'medium' },
  { keyword: 'digital presence optimization', priority: 'medium' },
  { keyword: 'AI-powered search tools', priority: 'high' },
  { keyword: 'brand positioning strategies', priority: 'low' },
  { keyword: 'content distribution channels', priority: 'medium' },
  { keyword: 'audience targeting methods', priority: 'low' },
  { keyword: 'conversion rate optimization', priority: 'high' },
  { keyword: 'web analytics platforms', priority: 'medium' },
  { keyword: 'marketing automation systems', priority: 'low' },
];

function generateVisibilityCheck(
  projectId: string,
  keywordId: string,
  keyword: string,
  domain: string,
  engine: string,
  daysAgo: number
) {
  const trendFactor = 1 + (daysAgo / 100);
  const engineFactor = engine === 'ChatGPT' ? 1.2 : engine === 'Claude' ? 1.1 : engine === 'Gemini' ? 0.9 : 1.0;

  const basePresenceChance = 0.7 / trendFactor;
  const presence = Math.random() < basePresenceChance * engineFactor;

  const position = presence ? Math.floor(Math.random() * 10) + 1 : null;

  const baseScore = presence ? 35 + Math.random() * 40 : Math.random() * 15;
  const positionBonus = position ? (11 - position) * 3 : 0;
  const citationsCount = presence ? Math.floor(Math.random() * 6) + 1 : 0;
  const citationBonus = citationsCount * 4;

  const visibilityScore = Math.min(100, baseScore + positionBonus + citationBonus);

  const snippets = [
    `According to ${domain}, ${keyword} is a critical aspect of modern digital strategy. Their research shows significant impact on business outcomes.`,
    `Experts at ${domain} have published comprehensive guides on ${keyword}, highlighting best practices and common pitfalls to avoid.`,
    `${domain} provides in-depth analysis of ${keyword}, with case studies demonstrating successful implementation across various industries.`,
    `Leading insights from ${domain} suggest that ${keyword} requires a multi-faceted approach combining technology and strategic planning.`,
    `Research conducted by ${domain} reveals that ${keyword} has evolved significantly, with new methodologies emerging for better results.`,
    `${domain}'s team has developed innovative frameworks for ${keyword}, helping organizations achieve measurable improvements.`,
    `In their latest report, ${domain} explores the nuances of ${keyword} and offers practical recommendations for implementation.`,
  ];

  const answerSnippet = presence ? snippets[Math.floor(Math.random() * snippets.length)] : null;

  const urlPatterns = [
    `https://${domain}`,
    `https://${domain}/blog`,
    `https://${domain}/resources`,
    `https://${domain}/guides`,
    `https://${domain}/case-studies`,
    `https://${domain}/research`,
  ];

  const observedUrls = presence
    ? urlPatterns.slice(0, Math.min(citationsCount, urlPatterns.length))
    : [];

  const timestamp = new Date();
  timestamp.setDate(timestamp.getDate() - daysAgo);

  return {
    project_id: projectId,
    keyword_id: keywordId,
    keyword_text: keyword,
    engine,
    position,
    presence,
    answer_snippet: answerSnippet,
    citations_count: citationsCount,
    observed_urls: observedUrls,
    visibility_score: Math.round(visibilityScore * 100) / 100,
    timestamp: timestamp.toISOString(),
  };
}

async function seed() {
  try {
    console.log('Starting seed process...');

    console.log('\n1. Creating test user...');
    let userId: string;

    const { data: existingSession } = await supabase.auth.signInWithPassword({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    });

    if (existingSession?.user) {
      userId = existingSession.user.id;
      console.log('   ✓ Test user already exists');
    } else {
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
      });

      if (signUpError) throw signUpError;
      if (!signUpData.user) throw new Error('Failed to create user');

      userId = signUpData.user.id;

      const { error: profileError } = await supabase.from('profiles').insert({
        id: userId,
        email: TEST_EMAIL,
        full_name: TEST_NAME,
      });

      if (profileError) throw profileError;
      console.log('   ✓ Test user created');
    }

    await supabase.auth.signInWithPassword({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    });

    console.log('\n2. Creating sample project...');
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .insert({
        user_id: userId,
        name: 'TechCorp Marketing Campaign',
        domain: 'techcorp.com',
        brand_name: 'TechCorp',
        competitors: ['competitor1.com', 'competitor2.com', 'competitor3.com'],
      })
      .select()
      .single();

    if (projectError) throw projectError;
    console.log(`   ✓ Project created: ${project.name}`);

    console.log('\n3. Adding keywords...');
    const { data: keywords, error: keywordsError } = await supabase
      .from('keywords')
      .insert(
        sampleKeywords.map(k => ({
          project_id: project.id,
          keyword: k.keyword,
          priority: k.priority,
        }))
      )
      .select();

    if (keywordsError) throw keywordsError;
    console.log(`   ✓ Added ${keywords.length} keywords`);

    console.log('\n4. Generating visibility checks (14 days of data)...');
    const checks = [];

    for (let day = 0; day < 14; day++) {
      for (const keyword of keywords) {
        for (const engine of engines) {
          checks.push(
            generateVisibilityCheck(
              project.id,
              keyword.id,
              keyword.keyword,
              project.domain,
              engine,
              day
            )
          );
        }
      }
    }

    console.log(`   Inserting ${checks.length} visibility checks...`);

    const batchSize = 100;
    for (let i = 0; i < checks.length; i += batchSize) {
      const batch = checks.slice(i, i + batchSize);
      const { error: checksError } = await supabase
        .from('visibility_checks')
        .insert(batch);

      if (checksError) throw checksError;
      console.log(`   ✓ Inserted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(checks.length / batchSize)}`);
    }

    console.log('\n✓ Seed completed successfully!\n');
    console.log('═══════════════════════════════════════════════════');
    console.log('TEST CREDENTIALS:');
    console.log('═══════════════════════════════════════════════════');
    console.log(`Email:    ${TEST_EMAIL}`);
    console.log(`Password: ${TEST_PASSWORD}`);
    console.log('═══════════════════════════════════════════════════');
    console.log('\nYou can now login with these credentials!\n');

  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

seed();
