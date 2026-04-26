INSERT INTO users (username, password, role) VALUES
('admin', 'admin123', 'admin'),
('controller1', 'pass123', 'controller'),
('manager1', 'pass123', 'manager'),
('ambassador1', 'pass123', 'ambassador')
ON CONFLICT (username) DO NOTHING;

INSERT INTO routes (id, code, name, mode, direction_a, direction_b, active) VALUES
('R1', 'BUS-R1', 'Central Connector', 'bus', 'Outbound', 'Inbound', TRUE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO stops (id, route_id, name, sequence, lat, lon) VALUES
('S1', 'R1', 'Alpha Stop', 1, 51.5000, -0.1000),
('S2', 'R1', 'Bravo Stop', 2, 51.5010, -0.1010),
('S3', 'R1', 'Charlie Stop', 3, 51.5020, -0.1020),
('S4', 'R1', 'Delta Stop', 4, 51.5030, -0.1030),
('S5', 'R1', 'Echo Stop', 5, 51.5040, -0.1040)
ON CONFLICT (id) DO NOTHING;

INSERT INTO buses (id, route_id, direction, type, capacity, occupancy, boarded_total, terminated_total, left_behind_total, current_stop_index, status, next_eta_min, on_break) VALUES
('BUS1', 'R1', 'Outbound', 'double_decker', 85, 40, 40, 0, 0, 0, 'in_service', 3, FALSE),
('BUS2', 'R1', 'Inbound', 'single_decker', 40, 18, 18, 0, 0, 2, 'in_service', 5, FALSE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO traffic (level, multiplier) VALUES
('moderate', 1.0);

INSERT INTO underground_stations (id, name, line, lat, lon) VALUES
('U1', 'Central Underground', 'Central Line', 51.5005, -0.1005),
('U2', 'Park Underground', 'Piccadilly Line', 51.5035, -0.1035)
ON CONFLICT (id) DO NOTHING;

INSERT INTO overground_stations (id, name, line, lat, lon) VALUES
('O1', 'West Overground', 'Mildmay Line', 51.5050, -0.1050),
('O2', 'East Overground', 'Windrush Line', 51.4985, -0.0985)
ON CONFLICT (id) DO NOTHING;

INSERT INTO local_train_timings (station_name, destination, departure, platform) VALUES
('Central Underground', 'North Terminal', '08:00', '1'),
('Park Underground', 'City Junction', '08:05', '2'),
('West Overground', 'South Cross', '08:10', '3');

INSERT INTO routes (id, code, name, mode, direction_a, direction_b, active) VALUES
('R2', 'BUS-R2', 'North Loop', 'bus', 'Northbound', 'Southbound', TRUE),
('R3', 'BUS-R3', 'River Link', 'bus', 'Eastbound', 'Westbound', TRUE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO stops (id, route_id, name, sequence, lat, lon) VALUES
('S6', 'R2', 'Foxtrot Stop', 1, 51.5060, -0.1060),
('S7', 'R2', 'Golf Stop', 2, 51.5070, -0.1070),
('S8', 'R2', 'Hotel Stop', 3, 51.5080, -0.1080),
('S9', 'R3', 'India Stop', 1, 51.5090, -0.1090),
('S10', 'R3', 'Juliet Stop', 2, 51.5100, -0.1100),
('S11', 'R3', 'Kilo Stop', 3, 51.5110, -0.1110)
ON CONFLICT (id) DO NOTHING;

INSERT INTO buses (id, route_id, direction, type, capacity, occupancy, boarded_total, terminated_total, left_behind_total, current_stop_index, status, next_eta_min, on_break) VALUES
('BUS3', 'R2', 'Northbound', 'double_decker', 85, 30, 30, 0, 0, 0, 'in_service', 4, FALSE),
('BUS4', 'R2', 'Southbound', 'single_decker', 40, 12, 12, 0, 0, 1, 'in_service', 6, FALSE),
('BUS5', 'R3', 'Eastbound', 'double_decker', 85, 55, 55, 0, 0, 0, 'in_service', 5, FALSE),
('BUS6', 'R3', 'Westbound', 'single_decker', 40, 20, 20, 0, 0, 1, 'in_service', 3, FALSE)
ON CONFLICT (id) DO NOTHING;