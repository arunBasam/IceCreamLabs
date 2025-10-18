import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const engines = ['ChatGPT', 'Gemini', 'Claude', 'Perplexity'];

function simulateVisibilityCheck(keyword: string, engine: string, domain: string) {
  const basePresence = Math.random() > 0.3;
  const presence = basePresence;

  const position = presence ? Math.floor(Math.random() * 10) + 1 : null;

  const baseScore = presence ? 30 + Math.random() * 50 : Math.random() * 20;
  const positionBonus = position ? (11 - position) * 3 : 0;
  const citationsCount = presence ? Math.floor(Math.random() * 5) + 1 : 0;
  const citationBonus = citationsCount * 5;

  const visibilityScore = Math.min(100, baseScore + positionBonus + citationBonus);

  const snippets = [
    `According to ${domain}, ${keyword} involves several key considerations...`,
    `Experts at ${domain} suggest that ${keyword} requires careful planning...`,
    `Research from ${domain} indicates that ${keyword} can significantly impact...`,
    `${domain} provides comprehensive insights on ${keyword}, noting that...`,
    `When it comes to ${keyword}, ${domain} recommends the following approach...`
  ];

  const answerSnippet = presence ? snippets[Math.floor(Math.random() * snippets.length)] : null;

  const observedUrls = presence
    ? [`https://${domain}`, `https://${domain}/blog`, `https://${domain}/resources`].slice(0, citationsCount)
    : [];

  return {
    engine,
    position,
    presence,
    answer_snippet: answerSnippet,
    citations_count: citationsCount,
    observed_urls: observedUrls,
    visibility_score: Math.round(visibilityScore * 100) / 100,
    timestamp: new Date().toISOString(),
  };
}

export async function POST(request: NextRequest) {
  try {
    const { projectId } = await request.json();

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID required' }, { status: 400 });
    }

    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('domain')
      .eq('id', projectId)
      .maybeSingle();

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const { data: keywords, error: keywordsError } = await supabase
      .from('keywords')
      .select('*')
      .eq('project_id', projectId);

    if (keywordsError || !keywords || keywords.length === 0) {
      return NextResponse.json({ error: 'No keywords found' }, { status: 404 });
    }

    const checks = [];
    for (const keyword of keywords) {
      for (const engine of engines) {
        const checkData = simulateVisibilityCheck(keyword.keyword, engine, project.domain);

        checks.push({
          project_id: projectId,
          keyword_id: keyword.id,
          keyword_text: keyword.keyword,
          ...checkData,
        });
      }
    }

    const { error: insertError } = await supabase
      .from('visibility_checks')
      .insert(checks);

    if (insertError) {
      throw insertError;
    }

    return NextResponse.json({ success: true, count: checks.length });
  } catch (error: any) {
    console.error('Error running checks:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
