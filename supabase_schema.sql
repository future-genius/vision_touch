-- =========================================================================
-- VisionTouch Enterprise Database Schema Definition
-- =========================================================================
-- Description: Run this script in your Supabase SQL Editor to initialize 
--              or reset all required tables, performance indexes, RLS policies, 
--              and seed data.
-- Version: 2.0.0
-- =========================================================================

-- ---------------------------------------------------------
-- 0. Clean Up Section (Optional / Safe Drops)
-- ---------------------------------------------------------
-- Un-comment these lines if you want a complete database reset:
-- DROP TABLE IF EXISTS landmark_dataset CASCADE;
-- DROP TABLE IF EXISTS gesture_action_map CASCADE;
-- DROP TABLE IF EXISTS actions CASCADE;
-- DROP TABLE IF EXISTS gestures CASCADE;
-- DROP FUNCTION IF EXISTS update_modified_column CASCADE;

-- ---------------------------------------------------------
-- 1. Create Common Utility Functions
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- ---------------------------------------------------------
-- 2. Create Core Tables
-- ---------------------------------------------------------

-- A. Gestures Table
CREATE TABLE IF NOT EXISTS gestures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gesture_name TEXT NOT NULL UNIQUE,
    gesture_key TEXT NOT NULL UNIQUE,
    gesture_icon TEXT DEFAULT 'Hand',
    gesture_description TEXT,
    gesture_category TEXT DEFAULT 'Navigation',
    confidence_threshold DOUBLE PRECISION DEFAULT 0.7,
    enabled_status BOOLEAN DEFAULT TRUE,
    created_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- B. Actions Table
CREATE TABLE IF NOT EXISTS actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action_name TEXT NOT NULL UNIQUE,
    action_type TEXT NOT NULL, -- 'move', 'left_click', 'right_click', 'drag', 'scroll', 'zoom', 'shortcut', 'media', 'app_launch'
    action_parameters JSONB DEFAULT '{}'::jsonb,
    execution_mode TEXT DEFAULT 'instant',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- C. Gesture Action Map (M:N Relationship Table)
CREATE TABLE IF NOT EXISTS gesture_action_map (
    gesture_id UUID REFERENCES gestures(id) ON DELETE CASCADE,
    action_id UUID REFERENCES actions(id) ON DELETE CASCADE,
    sensitivity DOUBLE PRECISION DEFAULT 1.0,
    cooldown DOUBLE PRECISION DEFAULT 0.5,
    active_status BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (gesture_id, action_id)
);

-- D. Landmark Dataset Table (For Custom AI Model Training)
CREATE TABLE IF NOT EXISTS landmark_dataset (
    dataset_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gesture_id UUID REFERENCES gestures(id) ON DELETE SET NULL,
    landmark_vectors JSONB NOT NULL, -- Array of 21 hand joints [{x, y, z}]
    sample_quality DOUBLE PRECISION DEFAULT 1.0,
    uploaded_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------
-- 3. Performance & Lookup Indexes
-- ---------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_gestures_key ON gestures(gesture_key);
CREATE INDEX IF NOT EXISTS idx_gestures_enabled ON gestures(enabled_status);
CREATE INDEX IF NOT EXISTS idx_actions_type ON actions(action_type);
CREATE INDEX IF NOT EXISTS idx_dataset_gesture_id ON landmark_dataset(gesture_id);

-- ---------------------------------------------------------
-- 4. Automated Modification Triggers
-- ---------------------------------------------------------
CREATE OR REPLACE TRIGGER update_gestures_modtime
    BEFORE UPDATE ON gestures
    FOR EACH ROW
    EXECUTE PROCEDURE update_modified_column();

CREATE OR REPLACE TRIGGER update_actions_modtime
    BEFORE UPDATE ON actions
    FOR EACH ROW
    EXECUTE PROCEDURE update_modified_column();

CREATE OR REPLACE TRIGGER update_map_modtime
    BEFORE UPDATE ON gesture_action_map
    FOR EACH ROW
    EXECUTE PROCEDURE update_modified_column();

-- ---------------------------------------------------------
-- 5. Row-Level Security (RLS) Policies
-- ---------------------------------------------------------
ALTER TABLE gestures ENABLE ROW LEVEL SECURITY;
ALTER TABLE actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE gesture_action_map ENABLE ROW LEVEL SECURITY;
ALTER TABLE landmark_dataset ENABLE ROW LEVEL SECURITY;

-- Create Open Read/Authenticated Write Policies (Standard Supabase setup)
CREATE POLICY "Allow public read-only access to gestures" ON gestures FOR SELECT USING (true);
CREATE POLICY "Allow auth/engine write access to gestures" ON gestures FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow public read-only access to actions" ON actions FOR SELECT USING (true);
CREATE POLICY "Allow auth/engine write access to actions" ON actions FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow public read-only access to mapping" ON gesture_action_map FOR SELECT USING (true);
CREATE POLICY "Allow auth/engine write access to mapping" ON gesture_action_map FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow public read-only access to datasets" ON landmark_dataset FOR SELECT USING (true);
CREATE POLICY "Allow auth/engine write access to datasets" ON landmark_dataset FOR ALL USING (true) WITH CHECK (true);

-- ---------------------------------------------------------
-- 6. Seed Data (Core Platform Configuration)
-- ---------------------------------------------------------

-- A. Seed Actions
INSERT INTO actions (action_name, action_type, action_parameters, execution_mode)
VALUES 
    ('Pointer Movement', 'move', '{}'::jsonb, 'continuous'),
    ('Trigger Mouse Click', 'left_click', '{}'::jsonb, 'instant'),
    ('Trigger Context Menu', 'right_click', '{}'::jsonb, 'instant'),
    ('Drag and Drop Action', 'drag', '{}'::jsonb, 'continuous'),
    ('Scroll Up Screen', 'scroll', '{"direction": "up", "amount": 5}'::jsonb, 'continuous'),
    ('Scroll Down Screen', 'scroll', '{"direction": "down", "amount": 5}'::jsonb, 'continuous'),
    ('Web Navigation Next', 'shortcut', '{"keys": ["alt", "right"]}'::jsonb, 'instant'),
    ('Web Navigation Back', 'shortcut', '{"keys": ["alt", "left"]}'::jsonb, 'instant'),
    ('Media Next Track', 'media', '{"command": "next"}'::jsonb, 'instant'),
    ('Media Previous Track', 'media', '{"command": "previous"}'::jsonb, 'instant'),
    ('Launch Calculator', 'app_launch', '{"app": "calc"}'::jsonb, 'instant')
ON CONFLICT (action_name) DO UPDATE 
SET action_type = EXCLUDED.action_type, 
    action_parameters = EXCLUDED.action_parameters;

-- B. Seed Gestures
-- Resolves potential unique constraints conflicts on both gesture_name and gesture_key
INSERT INTO gestures (gesture_name, gesture_key, gesture_icon, gesture_description, gesture_category, confidence_threshold, enabled_status)
VALUES
    ('Index Pointer', 'index_pointer', 'MousePointer2', 'Index finger extended up to drive cursor.', 'Cursor', 0.65, TRUE),
    ('Pinch / Click', 'pinch_click', 'MousePointerClick', 'Thumb and index fingers touching to trigger left clicks.', 'Clicks', 0.70, TRUE),
    ('Two Finger Spread', 'two_finger_spread', 'Move', 'Index and middle fingers extended to drag or move items.', 'Drag', 0.60, TRUE),
    ('Palm Open', 'palm_open', 'Hand', 'All five fingers spread open to pause or trigger idle states.', 'Navigation', 0.50, TRUE),
    ('Swipe Left / Right', 'swipe_left_right', 'ScrollText', 'A rapid horizontal swipe to move back or forward.', 'Shortcuts', 0.70, TRUE),
    -- ML-Driven Dataset Classes
    ('Pointer Movement (ML)', 'move', 'MousePointer2', 'Index extended up to drive cursor.', 'Cursor', 0.65, TRUE),
    ('Left Mouse Click (ML)', 'click', 'MousePointerClick', 'Thumb and index pinch to trigger left clicks.', 'Clicks', 0.70, TRUE),
    ('Context Menu Click (ML)', 'right_click', 'CornerDownLeft', 'Index and middle extended together to trigger right clicks.', 'Clicks', 0.70, TRUE),
    ('Continuous Scroll (ML)', 'scroll', 'ScrollText', 'Waving three extended fingers up/down to scroll.', 'Navigation', 0.65, TRUE),
    ('Drag Holding (ML)', 'fist', 'Grab', 'Fully closed fist to grab and drag items.', 'Drag', 0.60, TRUE)
ON CONFLICT (gesture_key) DO UPDATE 
SET gesture_name = EXCLUDED.gesture_name, 
    gesture_icon = EXCLUDED.gesture_icon,
    gesture_description = EXCLUDED.gesture_description;

-- C. Seed Initial Maps (M:N Links)
-- Heuristic Maps
INSERT INTO gesture_action_map (gesture_id, action_id, sensitivity, cooldown, active_status)
SELECT g.id, a.id, 1.5, 0.2, TRUE
FROM gestures g, actions a
WHERE g.gesture_key = 'index_pointer' AND a.action_name = 'Pointer Movement'
ON CONFLICT DO NOTHING;

INSERT INTO gesture_action_map (gesture_id, action_id, sensitivity, cooldown, active_status)
SELECT g.id, a.id, 1.0, 0.4, TRUE
FROM gestures g, actions a
WHERE g.gesture_key = 'pinch_click' AND a.action_name = 'Trigger Mouse Click'
ON CONFLICT DO NOTHING;

INSERT INTO gesture_action_map (gesture_id, action_id, sensitivity, cooldown, active_status)
SELECT g.id, a.id, 1.2, 0.3, TRUE
FROM gestures g, actions a
WHERE g.gesture_key = 'two_finger_spread' AND a.action_name = 'Drag and Drop Action'
ON CONFLICT DO NOTHING;

-- Seed ML Action Maps
INSERT INTO gesture_action_map (gesture_id, action_id, sensitivity, cooldown, active_status)
SELECT g.id, a.id, 1.6, 0.05, TRUE
FROM gestures g, actions a
WHERE g.gesture_key = 'move' AND a.action_name = 'Pointer Movement'
ON CONFLICT DO NOTHING;

INSERT INTO gesture_action_map (gesture_id, action_id, sensitivity, cooldown, active_status)
SELECT g.id, a.id, 1.0, 0.35, TRUE
FROM gestures g, actions a
WHERE g.gesture_key = 'click' AND a.action_name = 'Trigger Mouse Click'
ON CONFLICT DO NOTHING;

INSERT INTO gesture_action_map (gesture_id, action_id, sensitivity, cooldown, active_status)
SELECT g.id, a.id, 1.0, 0.45, TRUE
FROM gestures g, actions a
WHERE g.gesture_key = 'right_click' AND a.action_name = 'Trigger Context Menu'
ON CONFLICT DO NOTHING;

INSERT INTO gesture_action_map (gesture_id, action_id, sensitivity, cooldown, active_status)
SELECT g.id, a.id, 1.2, 0.05, TRUE
FROM gestures g, actions a
WHERE g.gesture_key = 'scroll' AND a.action_name = 'Scroll Down Screen'
ON CONFLICT DO NOTHING;

INSERT INTO gesture_action_map (gesture_id, action_id, sensitivity, cooldown, active_status)
SELECT g.id, a.id, 1.0, 0.05, TRUE
FROM gestures g, actions a
WHERE g.gesture_key = 'fist' AND a.action_name = 'Drag and Drop Action'
ON CONFLICT DO NOTHING;
