'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

interface Project {
  id: string;
  name: string;
  domain: string;
  brand_name: string;
  competitors: string[];
}

interface Keyword {
  id: string;
  keyword: string;
  priority: string;
}

interface VisibilityStats {
  overall_score: number;
  total_checks: number;
  presence_rate: number;
  avg_position: number;
  by_engine: {
    [engine: string]: {
      score: number;
      checks: number;
      presence_rate: number;
    };
  };
  trending_7d: number;
  trending_30d: number;
}

interface Recommendation {
  type: 'warning' | 'info' | 'success';
  title: string;
  description: string;
}

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [stats, setStats] = useState<VisibilityStats | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddKeyword, setShowAddKeyword] = useState(false);
  const [newKeyword, setNewKeyword] = useState({ keyword: '', priority: 'medium' });

  useEffect(() => {
    loadProject();
    loadKeywords();
    loadStats();
  }, [projectId]);

  const loadProject = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (error) throw error;
      setProject(data);
    } catch (error) {
      console.error('Error loading project:', error);
    }
  };

  const loadKeywords = async () => {
    try {
      const { data, error } = await supabase
        .from('keywords')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setKeywords(data || []);
    } catch (error) {
      console.error('Error loading keywords:', error);
    }
  };

  const loadStats = async () => {
    try {
      const { data: checks, error } = await supabase
        .from('visibility_checks')
        .select('*')
        .eq('project_id', projectId);

      if (error) throw error;

      if (!checks || checks.length === 0) {
        setStats({
          overall_score: 0,
          total_checks: 0,
          presence_rate: 0,
          avg_position: 0,
          by_engine: {},
          trending_7d: 0,
          trending_30d: 0,
        });
        setLoading(false);
        return;
      }

      const totalChecks = checks.length;
      const presentChecks = checks.filter(c => c.presence).length;
      const avgScore = checks.reduce((sum, c) => sum + c.visibility_score, 0) / totalChecks;
      const positions = checks.filter(c => c.position).map(c => c.position);
      const avgPosition = positions.length > 0
        ? positions.reduce((sum, p) => sum + p, 0) / positions.length
        : 0;

      const byEngine: any = {};
      const engines = ['ChatGPT', 'Gemini', 'Claude', 'Perplexity'];
      engines.forEach(engine => {
        const engineChecks = checks.filter(c => c.engine === engine);
        if (engineChecks.length > 0) {
          byEngine[engine] = {
            score: engineChecks.reduce((sum, c) => sum + c.visibility_score, 0) / engineChecks.length,
            checks: engineChecks.length,
            presence_rate: (engineChecks.filter(c => c.presence).length / engineChecks.length) * 100,
          };
        }
      });

      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const recent7d = checks.filter(c => new Date(c.timestamp) >= sevenDaysAgo);
      const recent30d = checks.filter(c => new Date(c.timestamp) >= thirtyDaysAgo);

      const score7d = recent7d.length > 0
        ? recent7d.reduce((sum, c) => sum + c.visibility_score, 0) / recent7d.length
        : avgScore;
      const score30d = recent30d.length > 0
        ? recent30d.reduce((sum, c) => sum + c.visibility_score, 0) / recent30d.length
        : avgScore;

      setStats({
        overall_score: avgScore,
        total_checks: totalChecks,
        presence_rate: (presentChecks / totalChecks) * 100,
        avg_position: avgPosition,
        by_engine: byEngine,
        trending_7d: score7d - avgScore,
        trending_30d: score30d - avgScore,
      });

      generateRecommendations(byEngine, avgScore, presentChecks / totalChecks);
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateRecommendations = (byEngine: any, avgScore: number, presenceRate: number) => {
    const recs: Recommendation[] = [];

    const missingEngines = ['ChatGPT', 'Gemini', 'Claude', 'Perplexity'].filter(
      engine => !byEngine[engine] || byEngine[engine].presence_rate < 20
    );

    if (missingEngines.length > 0) {
      recs.push({
        type: 'warning',
        title: 'Low visibility on some engines',
        description: `Your brand has low or no presence on: ${missingEngines.join(', ')}. Consider optimizing content for these platforms.`,
      });
    }

    if (avgScore < 40) {
      recs.push({
        type: 'warning',
        title: 'Overall visibility needs improvement',
        description: 'Your average visibility score is below 40. Focus on creating more authoritative content and building citations.',
      });
    }

    if (presenceRate < 0.5) {
      recs.push({
        type: 'warning',
        title: 'Low presence rate',
        description: 'Your brand appears in less than 50% of tracked queries. Consider expanding keyword coverage and content depth.',
      });
    }

    Object.entries(byEngine).forEach(([engine, data]: [string, any]) => {
      if (data.presence_rate > 80) {
        recs.push({
          type: 'success',
          title: `Strong performance on ${engine}`,
          description: `You have excellent visibility on ${engine} with ${data.presence_rate.toFixed(0)}% presence rate.`,
        });
      }
    });

    if (recs.length === 0) {
      recs.push({
        type: 'info',
        title: 'Maintain your performance',
        description: 'Your visibility metrics are healthy. Continue monitoring and optimizing your content strategy.',
      });
    }

    setRecommendations(recs);
  };

  const handleAddKeyword = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase.from('keywords').insert({
        project_id: projectId,
        keyword: newKeyword.keyword,
        priority: newKeyword.priority,
      });

      if (error) throw error;

      setNewKeyword({ keyword: '', priority: 'medium' });
      setShowAddKeyword(false);
      loadKeywords();
    } catch (error) {
      console.error('Error adding keyword:', error);
    }
  };

  const runChecks = async () => {
    try {
      const response = await fetch('/api/checks/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      });

      if (!response.ok) throw new Error('Failed to run checks');

      loadStats();
    } catch (error) {
      console.error('Error running checks:', error);
    }
  };

  if (loading || !project) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/dashboard" className="text-xl font-bold text-slate-900">
              AEO Tracker
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Link
            href="/dashboard"
            className="inline-flex items-center text-sm text-slate-600 hover:text-slate-900 transition"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </Link>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">{project.name}</h1>
          <div className="flex items-center gap-4 text-sm text-slate-600">
            <span><span className="font-medium">Brand:</span> {project.brand_name}</span>
            <span><span className="font-medium">Domain:</span> {project.domain}</span>
          </div>
        </div>

        {stats && stats.total_checks > 0 && (
          <>
            <div className="grid gap-6 md:grid-cols-4 mb-8">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="text-sm font-medium text-slate-600 mb-2">Overall Score</div>
                <div className="text-3xl font-bold text-slate-900">{stats.overall_score.toFixed(1)}</div>
                <div className="text-xs text-slate-500 mt-1">out of 100</div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="text-sm font-medium text-slate-600 mb-2">Presence Rate</div>
                <div className="text-3xl font-bold text-slate-900">{stats.presence_rate.toFixed(0)}%</div>
                <div className="text-xs text-slate-500 mt-1">{stats.total_checks} checks</div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="text-sm font-medium text-slate-600 mb-2">7-Day Trend</div>
                <div className={`text-3xl font-bold ${stats.trending_7d >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {stats.trending_7d >= 0 ? '+' : ''}{stats.trending_7d.toFixed(1)}
                </div>
                <div className="text-xs text-slate-500 mt-1">score change</div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="text-sm font-medium text-slate-600 mb-2">30-Day Trend</div>
                <div className={`text-3xl font-bold ${stats.trending_30d >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {stats.trending_30d >= 0 ? '+' : ''}{stats.trending_30d.toFixed(1)}
                </div>
                <div className="text-xs text-slate-500 mt-1">score change</div>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2 mb-8">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Performance by Engine</h3>
                <div className="space-y-4">
                  {Object.entries(stats.by_engine).map(([engine, data]: [string, any]) => (
                    <div key={engine}>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-slate-700">{engine}</span>
                        <span className="text-sm font-semibold text-slate-900">{data.score.toFixed(1)}</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all"
                          style={{ width: `${data.score}%` }}
                        />
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        {data.presence_rate.toFixed(0)}% presence ({data.checks} checks)
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Recommendations</h3>
                <div className="space-y-3">
                  {recommendations.map((rec, idx) => (
                    <div
                      key={idx}
                      className={`p-4 rounded-lg border ${
                        rec.type === 'warning' ? 'bg-amber-50 border-amber-200' :
                        rec.type === 'success' ? 'bg-green-50 border-green-200' :
                        'bg-blue-50 border-blue-200'
                      }`}
                    >
                      <div className={`text-sm font-semibold mb-1 ${
                        rec.type === 'warning' ? 'text-amber-900' :
                        rec.type === 'success' ? 'text-green-900' :
                        'text-blue-900'
                      }`}>
                        {rec.title}
                      </div>
                      <div className={`text-xs ${
                        rec.type === 'warning' ? 'text-amber-700' :
                        rec.type === 'success' ? 'text-green-700' :
                        'text-blue-700'
                      }`}>
                        {rec.description}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-slate-900">Keywords</h3>
            <div className="flex gap-3">
              <button
                onClick={runChecks}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition text-sm"
              >
                Run Checks
              </button>
              <button
                onClick={() => setShowAddKeyword(!showAddKeyword)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition text-sm"
              >
                + Add Keyword
              </button>
            </div>
          </div>

          {showAddKeyword && (
            <form onSubmit={handleAddKeyword} className="mb-6 p-4 bg-slate-50 rounded-lg">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="md:col-span-2">
                  <input
                    type="text"
                    value={newKeyword.keyword}
                    onChange={(e) => setNewKeyword({ ...newKeyword, keyword: e.target.value })}
                    placeholder="Enter keyword"
                    required
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-slate-900"
                  />
                </div>
                <div className="flex gap-2">
                  <select
                    value={newKeyword.priority}
                    onChange={(e) => setNewKeyword({ ...newKeyword, priority: e.target.value })}
                    className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-slate-900"
                  >
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition"
                  >
                    Add
                  </button>
                </div>
              </div>
            </form>
          )}

          {keywords.length === 0 ? (
            <div className="text-center py-12 text-slate-600">
              No keywords yet. Add your first keyword to start tracking.
            </div>
          ) : (
            <div className="space-y-2">
              {keywords.map((keyword) => (
                <Link
                  key={keyword.id}
                  href={`/keywords/${keyword.id}`}
                  className="block p-4 border border-slate-200 rounded-lg hover:border-blue-300 hover:bg-slate-50 transition"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="font-medium text-slate-900">{keyword.keyword}</span>
                      <span className={`ml-3 text-xs px-2 py-1 rounded ${
                        keyword.priority === 'high' ? 'bg-red-100 text-red-700' :
                        keyword.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {keyword.priority}
                      </span>
                    </div>
                    <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
