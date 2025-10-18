'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

interface Keyword {
  id: string;
  keyword: string;
  priority: string;
  project_id: string;
}

interface Check {
  id: string;
  engine: string;
  position: number | null;
  presence: boolean;
  answer_snippet: string;
  citations_count: number;
  observed_urls: string[];
  visibility_score: number;
  timestamp: string;
}

export default function KeywordDetailPage() {
  const params = useParams();
  const keywordId = params.id as string;

  const [keyword, setKeyword] = useState<Keyword | null>(null);
  const [checks, setChecks] = useState<Check[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEngine, setSelectedEngine] = useState<string>('all');

  useEffect(() => {
    loadKeyword();
    loadChecks();
  }, [keywordId]);

  const loadKeyword = async () => {
    try {
      const { data, error } = await supabase
        .from('keywords')
        .select('*')
        .eq('id', keywordId)
        .single();

      if (error) throw error;
      setKeyword(data);
    } catch (error) {
      console.error('Error loading keyword:', error);
    }
  };

  const loadChecks = async () => {
    try {
      const { data, error } = await supabase
        .from('visibility_checks')
        .select('*')
        .eq('keyword_id', keywordId)
        .order('timestamp', { ascending: false });

      if (error) throw error;
      setChecks(data || []);
    } catch (error) {
      console.error('Error loading checks:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !keyword) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-600">Loading...</div>
      </div>
    );
  }

  const filteredChecks = selectedEngine === 'all'
    ? checks
    : checks.filter(c => c.engine === selectedEngine);

  const engines = ['ChatGPT', 'Gemini', 'Claude', 'Perplexity'];
  const engineStats = engines.map(engine => {
    const engineChecks = checks.filter(c => c.engine === engine);
    if (engineChecks.length === 0) return { engine, score: 0, presence: 0, count: 0 };

    return {
      engine,
      score: engineChecks.reduce((sum, c) => sum + c.visibility_score, 0) / engineChecks.length,
      presence: (engineChecks.filter(c => c.presence).length / engineChecks.length) * 100,
      count: engineChecks.length,
    };
  });

  const recentChecks = checks.slice(0, 14);
  const chartData = recentChecks.reverse();

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <Link href="/dashboard" className="text-xl font-bold text-slate-900">
              AEO Tracker
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Link
            href={`/projects/${keyword.project_id}`}
            className="inline-flex items-center text-sm text-slate-600 hover:text-slate-900 transition"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Project
          </Link>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">{keyword.keyword}</h1>
          <span className={`inline-block text-xs px-3 py-1 rounded-full ${
            keyword.priority === 'high' ? 'bg-red-100 text-red-700' :
            keyword.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
            'bg-slate-100 text-slate-700'
          }`}>
            {keyword.priority} priority
          </span>
        </div>

        <div className="grid gap-6 md:grid-cols-4 mb-8">
          {engineStats.map(stat => (
            <div key={stat.engine} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="text-sm font-medium text-slate-600 mb-2">{stat.engine}</div>
              <div className="text-2xl font-bold text-slate-900 mb-1">
                {stat.score.toFixed(1)}
              </div>
              <div className="text-xs text-slate-500">
                {stat.presence.toFixed(0)}% presence ({stat.count} checks)
              </div>
            </div>
          ))}
        </div>

        {chartData.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8">
            <h3 className="text-lg font-semibold text-slate-900 mb-6">Visibility Score Over Time</h3>
            <div className="h-64 flex items-end justify-between gap-2">
              {chartData.map((check, idx) => (
                <div key={idx} className="flex-1 flex flex-col items-center">
                  <div className="w-full bg-slate-100 rounded-t relative" style={{ height: '100%' }}>
                    <div
                      className="absolute bottom-0 w-full bg-blue-500 rounded-t transition-all"
                      style={{ height: `${check.visibility_score}%` }}
                    />
                  </div>
                  <div className="text-xs text-slate-500 mt-2 -rotate-45 origin-top-left">
                    {new Date(check.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-slate-900">Check History</h3>
            <select
              value={selectedEngine}
              onChange={(e) => setSelectedEngine(e.target.value)}
              className="px-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-slate-900"
            >
              <option value="all">All Engines</option>
              <option value="ChatGPT">ChatGPT</option>
              <option value="Gemini">Gemini</option>
              <option value="Claude">Claude</option>
              <option value="Perplexity">Perplexity</option>
            </select>
          </div>

          {filteredChecks.length === 0 ? (
            <div className="text-center py-12 text-slate-600">
              No checks found for this keyword.
            </div>
          ) : (
            <div className="space-y-4">
              {filteredChecks.map((check) => (
                <div key={check.id} className="border border-slate-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-slate-900">{check.engine}</span>
                      <span className={`text-xs px-2 py-1 rounded ${
                        check.presence ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {check.presence ? 'Present' : 'Not Present'}
                      </span>
                      {check.position && (
                        <span className="text-xs text-slate-600">
                          Position: #{check.position}
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-slate-900">{check.visibility_score.toFixed(1)}</div>
                      <div className="text-xs text-slate-500">
                        {new Date(check.timestamp).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  {check.answer_snippet && (
                    <div className="mb-3">
                      <div className="text-xs font-medium text-slate-600 mb-1">Answer Snippet:</div>
                      <div className="text-sm text-slate-700 bg-slate-50 p-3 rounded">
                        {check.answer_snippet}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-4 text-xs text-slate-600">
                    <span>Citations: {check.citations_count}</span>
                    {check.observed_urls.length > 0 && (
                      <span>URLs observed: {check.observed_urls.length}</span>
                    )}
                  </div>

                  {check.observed_urls.length > 0 && (
                    <div className="mt-3">
                      <div className="text-xs font-medium text-slate-600 mb-2">Observed URLs:</div>
                      <div className="flex flex-wrap gap-2">
                        {check.observed_urls.map((url, idx) => (
                          <a
                            key={idx}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:text-blue-700 bg-blue-50 px-2 py-1 rounded"
                          >
                            {new URL(url).hostname}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
