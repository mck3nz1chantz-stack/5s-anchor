-- 5S Anchor — PostgreSQL schema v1
-- Compatible with Supabase (RLS included) or self-hosted Postgres.
-- Timestamps: timestamptz (ISO-8601). IDs: uuid.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
CREATE TYPE user_role AS ENUM ('operator', 'supervisor', 'manager', 'admin');
CREATE TYPE red_tag_category AS ENUM ('discard', 'relocate', 'unsure');
CREATE TYPE red_tag_color AS ENUM ('red', 'yellow', 'green');
CREATE TYPE red_tag_status AS ENUM ('draft', 'open', 'in_review', 'dispositioned', 'closed', 'void');
CREATE TYPE action_status AS ENUM ('open', 'in_progress', 'blocked', 'done', 'void');
CREATE TYPE audit_status AS ENUM ('scheduled', 'in_progress', 'submitted', 'reviewed', 'void');
CREATE TYPE schedule_kind AS ENUM ('daily_shine', 'weekly_audit', 'custom');
CREATE TYPE photo_kind AS ENUM ('red_tag', 'audit_item', 'before', 'after', 'action_proof', 'visual_standard');
CREATE TYPE area_type AS ENUM (
  'machine_cell', 'assembly_line', 'warehouse', 'maintenance_shop', 'shipping', 'other'
);
CREATE TYPE pillar AS ENUM ('sort', 'set', 'shine', 'standardize', 'sustain', 'safety');
CREATE TYPE scoring_mode AS ENUM ('points_0_20', 'maturity_1_5');

-- ---------------------------------------------------------------------------
-- Core org structure
-- ---------------------------------------------------------------------------
CREATE TABLE plants (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code          text NOT NULL UNIQUE,
  name          text NOT NULL,
  timezone      text NOT NULL DEFAULT 'America/Detroit',
  settings      jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  deleted_at    timestamptz
);

CREATE TABLE areas (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plant_id      uuid NOT NULL REFERENCES plants(id),
  code          text NOT NULL,
  name          text NOT NULL,
  area_type     area_type NOT NULL DEFAULT 'other',
  parent_id     uuid REFERENCES areas(id),
  map_meta      jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  deleted_at    timestamptz,
  UNIQUE (plant_id, code)
);

-- Zones are walkable audit units inside an area (cell side A, rack row, etc.)
CREATE TABLE zones (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  area_id       uuid NOT NULL REFERENCES areas(id),
  code          text NOT NULL,
  name          text NOT NULL,
  sort_order    int NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  deleted_at    timestamptz,
  UNIQUE (area_id, code)
);

CREATE TABLE equipment (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plant_id      uuid NOT NULL REFERENCES plants(id),
  area_id       uuid REFERENCES areas(id),
  zone_id       uuid REFERENCES zones(id),
  asset_tag     text NOT NULL,
  name          text NOT NULL,
  external_ref  text, -- Ignition path / MES id
  meta          jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  deleted_at    timestamptz,
  UNIQUE (plant_id, asset_tag)
);

CREATE TABLE users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plant_id      uuid NOT NULL REFERENCES plants(id),
  email         text,
  display_name  text NOT NULL,
  role          user_role NOT NULL DEFAULT 'operator',
  pin_hash      text, -- optional shop-floor PIN login
  auth_subject  text, -- external IdP / Supabase auth uid
  is_active     boolean NOT NULL DEFAULT true,
  badge_meta    jsonb NOT NULL DEFAULT '{}'::jsonb, -- streaks, badges
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  deleted_at    timestamptz
);

CREATE UNIQUE INDEX users_plant_email_uq ON users(plant_id, email) WHERE email IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX users_auth_subject_idx ON users(auth_subject) WHERE auth_subject IS NOT NULL;

CREATE TABLE user_area_access (
  user_id   uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  area_id   uuid NOT NULL REFERENCES areas(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, area_id)
);

-- ---------------------------------------------------------------------------
-- Photos (metadata; binary in object store or local blob ref)
-- ---------------------------------------------------------------------------
CREATE TABLE photos (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plant_id      uuid NOT NULL REFERENCES plants(id),
  kind          photo_kind NOT NULL,
  storage_key   text,           -- remote key once uploaded
  local_blob_id text,           -- client-side id before upload
  mime_type     text NOT NULL DEFAULT 'image/jpeg',
  width         int,
  height        int,
  captured_at   timestamptz NOT NULL DEFAULT now(),
  captured_by   uuid REFERENCES users(id),
  meta          jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX photos_plant_idx ON photos(plant_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- Red tags (Sort)
-- ---------------------------------------------------------------------------
CREATE TABLE red_tags (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plant_id        uuid NOT NULL REFERENCES plants(id),
  area_id         uuid NOT NULL REFERENCES areas(id),
  zone_id         uuid REFERENCES zones(id),
  equipment_id    uuid REFERENCES equipment(id),
  tag_number      text NOT NULL,
  category        red_tag_category NOT NULL,
  color           red_tag_color NOT NULL DEFAULT 'red',
  status          red_tag_status NOT NULL DEFAULT 'draft',
  reason          text NOT NULL,
  location_note   text,
  photo_id        uuid REFERENCES photos(id),
  created_by      uuid NOT NULL REFERENCES users(id),
  assigned_to     uuid REFERENCES users(id),
  disposition     text,
  disposition_at  timestamptz,
  closed_at       timestamptz,
  client_mutation_id text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  deleted_at      timestamptz,
  UNIQUE (plant_id, tag_number)
);

CREATE INDEX red_tags_status_idx ON red_tags(plant_id, status) WHERE deleted_at IS NULL;
CREATE INDEX red_tags_area_idx ON red_tags(area_id, status) WHERE deleted_at IS NULL;

CREATE TABLE red_tag_events (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  red_tag_id    uuid NOT NULL REFERENCES red_tags(id) ON DELETE CASCADE,
  from_status   red_tag_status,
  to_status     red_tag_status NOT NULL,
  actor_id      uuid REFERENCES users(id),
  note          text,
  payload       jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX red_tag_events_tag_idx ON red_tag_events(red_tag_id, created_at);

-- ---------------------------------------------------------------------------
-- Checklists & audits
-- ---------------------------------------------------------------------------
CREATE TABLE checklist_templates (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plant_id        uuid NOT NULL REFERENCES plants(id),
  name            text NOT NULL,
  area_type       area_type,
  include_safety  boolean NOT NULL DEFAULT false, -- 6S
  scoring_mode    scoring_mode NOT NULL DEFAULT 'points_0_20',
  version         int NOT NULL DEFAULT 1,
  is_active       boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE checklist_items (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id     uuid NOT NULL REFERENCES checklist_templates(id) ON DELETE CASCADE,
  pillar          pillar NOT NULL,
  prompt          text NOT NULL,
  guidance        text,
  max_points      numeric(6,2) NOT NULL DEFAULT 20,
  sort_order      int NOT NULL DEFAULT 0,
  requires_photo  boolean NOT NULL DEFAULT false
);

CREATE INDEX checklist_items_template_idx ON checklist_items(template_id, sort_order);

CREATE TABLE audits (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plant_id        uuid NOT NULL REFERENCES plants(id),
  area_id         uuid NOT NULL REFERENCES areas(id),
  zone_id         uuid REFERENCES zones(id),
  template_id     uuid NOT NULL REFERENCES checklist_templates(id),
  status          audit_status NOT NULL DEFAULT 'in_progress',
  auditor_id      uuid NOT NULL REFERENCES users(id),
  started_at      timestamptz NOT NULL DEFAULT now(),
  submitted_at    timestamptz,
  reviewed_at     timestamptz,
  overall_score   numeric(8,2),
  max_score       numeric(8,2),
  score_pct       numeric(6,2),
  pillar_scores   jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes           text,
  client_mutation_id text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  deleted_at      timestamptz
);

CREATE INDEX audits_area_time_idx ON audits(area_id, started_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX audits_plant_time_idx ON audits(plant_id, started_at DESC) WHERE deleted_at IS NULL;

CREATE TABLE audit_item_scores (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id        uuid NOT NULL REFERENCES audits(id) ON DELETE CASCADE,
  checklist_item_id uuid NOT NULL REFERENCES checklist_items(id),
  pillar          pillar NOT NULL,
  score           numeric(6,2) NOT NULL,
  max_points      numeric(6,2) NOT NULL,
  finding         text,
  photo_before_id uuid REFERENCES photos(id),
  photo_after_id  uuid REFERENCES photos(id),
  UNIQUE (audit_id, checklist_item_id)
);

-- Denormalized snapshots for dashboards + Ignition pull
CREATE TABLE score_snapshots (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plant_id        uuid NOT NULL REFERENCES plants(id),
  area_id         uuid NOT NULL REFERENCES areas(id),
  zone_id         uuid REFERENCES zones(id),
  audit_id        uuid REFERENCES audits(id),
  score_pct       numeric(6,2) NOT NULL,
  overall_score   numeric(8,2) NOT NULL,
  max_score       numeric(8,2) NOT NULL,
  pillar_scores   jsonb NOT NULL DEFAULT '{}'::jsonb,
  recorded_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX score_snapshots_area_time_idx ON score_snapshots(area_id, recorded_at DESC);
CREATE INDEX score_snapshots_plant_time_idx ON score_snapshots(plant_id, recorded_at DESC);

-- ---------------------------------------------------------------------------
-- Corrective actions / Kaizen
-- ---------------------------------------------------------------------------
CREATE TABLE corrective_actions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plant_id        uuid NOT NULL REFERENCES plants(id),
  area_id         uuid NOT NULL REFERENCES areas(id),
  audit_id        uuid REFERENCES audits(id),
  audit_item_id   uuid REFERENCES audit_item_scores(id),
  red_tag_id      uuid REFERENCES red_tags(id),
  title           text NOT NULL,
  description     text,
  status          action_status NOT NULL DEFAULT 'open',
  owner_id        uuid REFERENCES users(id),
  due_at          timestamptz,
  closed_at       timestamptz,
  proof_photo_id  uuid REFERENCES photos(id),
  created_by      uuid NOT NULL REFERENCES users(id),
  client_mutation_id text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  deleted_at      timestamptz
);

CREATE INDEX ca_status_idx ON corrective_actions(plant_id, status) WHERE deleted_at IS NULL;
CREATE INDEX ca_owner_idx ON corrective_actions(owner_id, status) WHERE deleted_at IS NULL;

CREATE TABLE corrective_action_events (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action_id     uuid NOT NULL REFERENCES corrective_actions(id) ON DELETE CASCADE,
  from_status   action_status,
  to_status     action_status NOT NULL,
  actor_id      uuid REFERENCES users(id),
  note          text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Visual standards library
-- ---------------------------------------------------------------------------
CREATE TABLE visual_standards (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plant_id        uuid NOT NULL REFERENCES plants(id),
  area_id         uuid NOT NULL REFERENCES areas(id),
  zone_id         uuid REFERENCES zones(id),
  pillar          pillar,
  title           text NOT NULL,
  description     text,
  photo_id        uuid REFERENCES photos(id),
  is_active       boolean NOT NULL DEFAULT true,
  created_by      uuid REFERENCES users(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX visual_standards_area_idx ON visual_standards(area_id) WHERE is_active;

-- ---------------------------------------------------------------------------
-- Schedules & notifications
-- ---------------------------------------------------------------------------
CREATE TABLE schedules (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plant_id        uuid NOT NULL REFERENCES plants(id),
  area_id         uuid NOT NULL REFERENCES areas(id),
  zone_id         uuid REFERENCES zones(id),
  kind            schedule_kind NOT NULL,
  title           text NOT NULL,
  cron_expr       text, -- e.g. '0 6 * * 1-5' or app-level rrule
  template_id     uuid REFERENCES checklist_templates(id),
  assignee_role   user_role,
  assignee_id     uuid REFERENCES users(id),
  is_active       boolean NOT NULL DEFAULT true,
  meta            jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE schedule_occurrences (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id     uuid NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
  due_at          timestamptz NOT NULL,
  completed_at    timestamptz,
  audit_id        uuid REFERENCES audits(id),
  status          text NOT NULL DEFAULT 'pending'
);

CREATE TABLE notifications (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plant_id        uuid NOT NULL REFERENCES plants(id),
  user_id         uuid NOT NULL REFERENCES users(id),
  title           text NOT NULL,
  body            text,
  link_path       text,
  read_at         timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX notifications_user_idx ON notifications(user_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- Generic event log (audit trail + Ignition-friendly stream)
-- ---------------------------------------------------------------------------
CREATE TABLE event_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plant_id        uuid NOT NULL REFERENCES plants(id),
  entity_type     text NOT NULL,
  entity_id       uuid NOT NULL,
  event_type      text NOT NULL,
  actor_id        uuid REFERENCES users(id),
  payload         jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX event_log_plant_time_idx ON event_log(plant_id, created_at DESC);
CREATE INDEX event_log_entity_idx ON event_log(entity_type, entity_id);

-- ---------------------------------------------------------------------------
-- Sync outbox (server-side optional; clients also keep local outbox)
-- ---------------------------------------------------------------------------
CREATE TABLE sync_mutations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_mutation_id text NOT NULL UNIQUE,
  plant_id        uuid NOT NULL REFERENCES plants(id),
  user_id         uuid REFERENCES users(id),
  entity_type     text NOT NULL,
  payload         jsonb NOT NULL,
  applied_at      timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- updated_at trigger helper
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER plants_updated BEFORE UPDATE ON plants
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER areas_updated BEFORE UPDATE ON areas
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER zones_updated BEFORE UPDATE ON zones
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER red_tags_updated BEFORE UPDATE ON red_tags
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER audits_updated BEFORE UPDATE ON audits
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER ca_updated BEFORE UPDATE ON corrective_actions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Note: On pure Postgres without Supabase, use EXECUTE PROCEDURE set_updated_at()
-- if your version uses PROCEDURE naming; Supabase PG15 uses EXECUTE FUNCTION.

-- ---------------------------------------------------------------------------
-- Supabase RLS (enable when using Supabase Auth + JWT claims)
-- Expect JWT claim: plant_id, role, sub mapped to users.auth_subject
-- Helper: app.current_user_id() set via request — simplify for template:
-- ---------------------------------------------------------------------------

ALTER TABLE plants ENABLE ROW LEVEL SECURITY;
ALTER TABLE areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE red_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_item_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE corrective_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE visual_standards ENABLE ROW LEVEL SECURITY;
ALTER TABLE score_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_log ENABLE ROW LEVEL SECURITY;

-- Example policies (adjust to auth.uid() mapping via users.auth_subject):
-- For MVP demos, service role bypasses RLS; tighten before multi-tenant.

CREATE POLICY plants_select_member ON plants FOR SELECT
  USING (
    id IN (SELECT plant_id FROM users WHERE auth_subject = auth.uid()::text AND deleted_at IS NULL)
  );

CREATE POLICY red_tags_select_plant ON red_tags FOR SELECT
  USING (
    plant_id IN (SELECT plant_id FROM users WHERE auth_subject = auth.uid()::text AND deleted_at IS NULL)
  );

CREATE POLICY red_tags_insert_operator ON red_tags FOR INSERT
  WITH CHECK (
    plant_id IN (
      SELECT plant_id FROM users
      WHERE auth_subject = auth.uid()::text
        AND role IN ('operator','supervisor','manager','admin')
        AND deleted_at IS NULL
    )
  );

CREATE POLICY audits_select_plant ON audits FOR SELECT
  USING (
    plant_id IN (SELECT plant_id FROM users WHERE auth_subject = auth.uid()::text AND deleted_at IS NULL)
  );

CREATE POLICY audits_insert_roles ON audits FOR INSERT
  WITH CHECK (
    plant_id IN (
      SELECT plant_id FROM users
      WHERE auth_subject = auth.uid()::text
        AND role IN ('operator','supervisor','manager','admin')
        AND deleted_at IS NULL
    )
  );

CREATE POLICY ca_select_plant ON corrective_actions FOR SELECT
  USING (
    plant_id IN (SELECT plant_id FROM users WHERE auth_subject = auth.uid()::text AND deleted_at IS NULL)
  );

CREATE POLICY notifications_own ON notifications FOR SELECT
  USING (
    user_id IN (SELECT id FROM users WHERE auth_subject = auth.uid()::text)
  );

-- Managers/admins export & config policies would be added similarly.
