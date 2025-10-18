/*
  # AEO Tracker Database Schema
  
  ## Overview
  This migration creates the complete database schema for an AI-Search Visibility (AEO) tracking application.
  The system allows users to track how their websites appear in AI search engine results across multiple platforms.

  ## New Tables
  
  ### 1. `profiles`
  User profile information linked to auth.users
  - `id` (uuid, primary key) - References auth.users.id
  - `email` (text) - User email address
  - `full_name` (text) - User's full name
  - `created_at` (timestamptz) - Account creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp
  
  ### 2. `projects`
  Tracking projects for websites/brands
  - `id` (uuid, primary key) - Unique project identifier
  - `user_id` (uuid, foreign key) - Owner of the project
  - `name` (text) - Project name
  - `domain` (text) - Primary domain being tracked
  - `brand_name` (text) - Brand name
  - `competitors` (text array) - List of competitor domains
  - `created_at` (timestamptz) - Project creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp
  
  ### 3. `keywords`
  Keywords to track for each project
  - `id` (uuid, primary key) - Unique keyword identifier
  - `project_id` (uuid, foreign key) - Associated project
  - `keyword` (text) - Search keyword/query
  - `priority` (text) - Keyword priority (high/medium/low)
  - `created_at` (timestamptz) - Keyword addition timestamp
  
  ### 4. `visibility_checks`
  Individual visibility check results per engine/keyword
  - `id` (uuid, primary key) - Unique check identifier
  - `project_id` (uuid, foreign key) - Associated project
  - `keyword_id` (uuid, foreign key) - Associated keyword
  - `engine` (text) - AI search engine (ChatGPT, Gemini, Claude, Perplexity)
  - `keyword_text` (text) - Keyword being checked (denormalized)
  - `position` (integer) - Position in results (null if not present)
  - `presence` (boolean) - Whether brand was mentioned
  - `answer_snippet` (text) - Excerpt from AI response
  - `citations_count` (integer) - Number of citations
  - `observed_urls` (text array) - URLs mentioned in response
  - `visibility_score` (numeric) - Calculated visibility score (0-100)
  - `timestamp` (timestamptz) - When check was performed
  - `created_at` (timestamptz) - Record creation timestamp

  ## Security
  
  ### Row Level Security (RLS)
  All tables have RLS enabled with policies ensuring:
  - Users can only access their own data
  - Each user's projects, keywords, and checks are isolated
  - Authenticated access required for all operations
  
  ### Policies by Table
  
  #### profiles
  - SELECT: Users can view their own profile
  - INSERT: Users can create their own profile
  - UPDATE: Users can update their own profile
  
  #### projects
  - SELECT: Users can view their own projects
  - INSERT: Users can create projects for themselves
  - UPDATE: Users can update their own projects
  - DELETE: Users can delete their own projects
  
  #### keywords
  - SELECT: Users can view keywords for their projects
  - INSERT: Users can add keywords to their projects
  - UPDATE: Users can update keywords in their projects
  - DELETE: Users can delete keywords from their projects
  
  #### visibility_checks
  - SELECT: Users can view checks for their projects
  - INSERT: Users can create checks for their projects
  - DELETE: Users can delete checks for their projects

  ## Indexes
  - Projects: indexed on user_id for fast user lookups
  - Keywords: indexed on project_id for fast project queries
  - Visibility checks: indexed on project_id, keyword_id, and timestamp for efficient queries
  - Composite index on (project_id, timestamp) for trend analysis

  ## Important Notes
  1. All tables use UUID primary keys for security and scalability
  2. Timestamps use timestamptz for timezone awareness
  3. Default values prevent null errors and ensure data consistency
  4. Foreign key constraints maintain referential integrity
  5. RLS policies are restrictive by default - only explicit grants allowed
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create projects table
CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  domain text NOT NULL,
  brand_name text NOT NULL,
  competitors text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create keywords table
CREATE TABLE IF NOT EXISTS keywords (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  keyword text NOT NULL,
  priority text DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Create visibility_checks table
CREATE TABLE IF NOT EXISTS visibility_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  keyword_id uuid NOT NULL REFERENCES keywords(id) ON DELETE CASCADE,
  engine text NOT NULL CHECK (engine IN ('ChatGPT', 'Gemini', 'Claude', 'Perplexity')),
  keyword_text text NOT NULL,
  position integer,
  presence boolean DEFAULT false NOT NULL,
  answer_snippet text,
  citations_count integer DEFAULT 0 NOT NULL,
  observed_urls text[] DEFAULT '{}',
  visibility_score numeric(5,2) DEFAULT 0 NOT NULL CHECK (visibility_score >= 0 AND visibility_score <= 100),
  timestamp timestamptz DEFAULT now() NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_keywords_project_id ON keywords(project_id);
CREATE INDEX IF NOT EXISTS idx_visibility_checks_project_id ON visibility_checks(project_id);
CREATE INDEX IF NOT EXISTS idx_visibility_checks_keyword_id ON visibility_checks(keyword_id);
CREATE INDEX IF NOT EXISTS idx_visibility_checks_timestamp ON visibility_checks(timestamp);
CREATE INDEX IF NOT EXISTS idx_visibility_checks_project_timestamp ON visibility_checks(project_id, timestamp);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE visibility_checks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can create own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- RLS Policies for projects
CREATE POLICY "Users can view own projects"
  ON projects FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own projects"
  ON projects FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own projects"
  ON projects FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own projects"
  ON projects FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for keywords
CREATE POLICY "Users can view keywords for own projects"
  ON keywords FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = keywords.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create keywords for own projects"
  ON keywords FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = keywords.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update keywords for own projects"
  ON keywords FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = keywords.project_id
      AND projects.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = keywords.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete keywords from own projects"
  ON keywords FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = keywords.project_id
      AND projects.user_id = auth.uid()
    )
  );

-- RLS Policies for visibility_checks
CREATE POLICY "Users can view checks for own projects"
  ON visibility_checks FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = visibility_checks.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create checks for own projects"
  ON visibility_checks FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = visibility_checks.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete checks from own projects"
  ON visibility_checks FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = visibility_checks.project_id
      AND projects.user_id = auth.uid()
    )
  );