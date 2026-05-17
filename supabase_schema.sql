-- VisionTouch Enterprise Database Schema Definition
-- Run this in your Supabase SQL Editor to create all the required tables and initial seed data.

-- 1. Create Gestures Table
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
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create Actions Table
CREATE TABLE IF NOT EXISTS actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action_name TEXT NOT NULL UNIQUE,
    action_type TEXT NOT NULL, -- 'move', 'left_click', 'right_click', 'drag', 'scroll', 'zoom', 'shortcut', 'media', 'app_launch'
    action_parameters JSONB DEFAULT '{}'::jsonb,
    execution_mode TEXT DEFAULT 'instant'
);

-- 3. Create Gesture Action Map
CREATE TABLE IF NOT EXISTS gesture_action_map (
    gesture_id UUID REFERENCES gestures(id) ON DELETE CASCADE,
    action_id UUID REFERENCES actions(id) ON DELETE CASCADE,
    sensitivity DOUBLE PRECISION DEFAULT 1.0,
    cooldown DOUBLE PRECISION DEFAULT 0.5,
    active_status BOOLEAN DEFAULT TRUE,
    PRIMARY KEY (gesture_id, action_id)
);

-- 4. Create Landmark Dataset Table
CREATE TABLE IF NOT EXISTS landmark_dataset (
    dataset_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gesture_id UUID REFERENCES gestures(id) ON DELETE SET NULL,
    landmark_vectors JSONB NOT NULL, -- Array of 21 hand joints [{x, y, z}]
    sample_quality DOUBLE PRECISION DEFAULT 1.0,
    uploaded_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Seed Core Actions
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

-- 6. Seed Core Gestures
INSERT INTO gestures (gesture_name, gesture_key, gesture_icon, gesture_description, gesture_category, confidence_threshold, enabled_status)
VALUES
    ('Index Pointer', 'index_pointer', 'MousePointer2', 'Index finger extended up to drive cursor.', 'Cursor', 0.65, TRUE),
    ('Pinch / Click', 'pinch_click', 'MousePointerClick', 'Thumb and index fingers touching to trigger left clicks.', 'Clicks', 0.70, TRUE),
    ('Two Finger Spread', 'two_finger_spread', 'Move', 'Index and middle fingers extended to drag or move items.', 'Drag', 0.60, TRUE),
    ('Palm Open', 'palm_open', 'Hand', 'All five fingers spread open to pause or trigger idle states.', 'Navigation', 0.50, TRUE),
    ('Swipe Left / Right', 'swipe_left_right', 'ScrollText', 'A rapid horizontal swipe to move back or forward.', 'Shortcuts', 0.70, TRUE)
ON CONFLICT (gesture_name) DO UPDATE 
SET gesture_key = EXCLUDED.gesture_key, 
    gesture_icon = EXCLUDED.gesture_icon,
    gesture_description = EXCLUDED.gesture_description;

-- 7. Seed Initial Maps (Index Pointer -> Pointer Movement, Pinch/Click -> Trigger Mouse Click, Two Finger Spread -> Drag and Drop Action)
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
