'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

interface Project {
  id: string;
  name: string;
  domain: string;
  brand_name: string;
  created_at: string;
}

export default function DashboardPage() {
  const { user, loading: authLoading, signOut } = useAuth();
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      loadProjects();
    }
  }, [user]);

  const loadProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error('Error loading projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  if (authLoading || loading) {
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
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-8">
              <h1 className="text-xl font-bold text-slate-900">AEO Tracker</h1>
              <Link
                href="/dashboard"
                className="text-slate-600 hover:text-slate-900 transition"
              >
                Dashboard
              </Link>
            </div>
            <button
              onClick={handleSignOut}
              className="text-sm text-slate-600 hover:text-slate-900 transition"
            >
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">
            Your Projects
          </h2>
          <p className="text-slate-600">
            Manage and track AI search visibility for your brands
          </p>
        </div>

        {projects.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
            <div className="max-w-md mx-auto">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                No projects yet
              </h3>
              <p className="text-slate-600 mb-6">
                Create your first project to start tracking AI search visibility
              </p>
              <Link
                href="/projects/new"
                className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition"
              >
                Create Project
              </Link>
            </div>
          </div>
        ) : (
          <div>
            <div className="mb-4 flex justify-end">
              <Link
                href="/projects/new"
                className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition text-sm"
              >
                + New Project
              </Link>
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {projects.map((project) => (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}`}
                  className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition"
                >
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">
                    {project.name}
                  </h3>
                  <div className="space-y-1 text-sm">
                    <p className="text-slate-600">
                      <span className="font-medium">Brand:</span> {project.brand_name}
                    </p>
                    <p className="text-slate-600">
                      <span className="font-medium">Domain:</span> {project.domain}
                    </p>
                  </div>
                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <span className="text-xs text-slate-500">
                      Created {new Date(project.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
