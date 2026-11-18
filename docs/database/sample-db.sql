-- High Street Gym - sample database
-- Import this file in MySQL Workbench to create and seed the database.
-- All demo accounts use the password: "password"

CREATE DATABASE IF NOT EXISTS `high-street-gym`;
USE `high-street-gym`;

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS bookings;
DROP TABLE IF EXISTS posts;
DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS activities;
DROP TABLE IF EXISTS locations;
DROP TABLE IF EXISTS users;
SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE users (
    id INT NOT NULL AUTO_INCREMENT,
    first_name VARCHAR(45) NOT NULL,
    last_name VARCHAR(45) NOT NULL,
    email VARCHAR(120) NOT NULL,
    password VARCHAR(70) NOT NULL,
    role ENUM('member','trainer','admin') NOT NULL DEFAULT 'member',
    deleted TINYINT NOT NULL DEFAULT 0,
    authentication_key VARCHAR(36) DEFAULT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY id_UNIQUE (id),
    UNIQUE KEY email_UNIQUE (email),
    UNIQUE KEY authentication_key_UNIQUE (authentication_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE activities (
    id INT NOT NULL AUTO_INCREMENT,
    name VARCHAR(60) NOT NULL,
    description VARCHAR(600) DEFAULT NULL,
    deleted TINYINT NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    UNIQUE KEY id_UNIQUE (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE locations (
    id INT NOT NULL AUTO_INCREMENT,
    name VARCHAR(60) NOT NULL,
    address VARCHAR(200) DEFAULT NULL,
    deleted TINYINT NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    UNIQUE KEY id_UNIQUE (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE sessions (
    id INT NOT NULL AUTO_INCREMENT,
    activity_id INT NOT NULL,
    location_id INT NOT NULL,
    trainer_id INT NOT NULL,
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    capacity INT NOT NULL DEFAULT 20,
    deleted TINYINT NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    UNIQUE KEY id_UNIQUE (id),
    KEY session_activity_fk (activity_id),
    KEY session_location_fk (location_id),
    KEY session_trainer_fk (trainer_id),
    CONSTRAINT session_activity_fk FOREIGN KEY (activity_id) REFERENCES activities (id),
    CONSTRAINT session_location_fk FOREIGN KEY (location_id) REFERENCES locations (id),
    CONSTRAINT session_trainer_fk FOREIGN KEY (trainer_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE bookings (
    id INT NOT NULL AUTO_INCREMENT,
    session_id INT NOT NULL,
    member_id INT NOT NULL,
    created_at DATETIME NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY id_UNIQUE (id),
    UNIQUE KEY booking_session_member_UNIQUE (session_id, member_id),
    KEY booking_session_fk (session_id),
    KEY booking_member_fk (member_id),
    CONSTRAINT booking_session_fk FOREIGN KEY (session_id) REFERENCES sessions (id) ON DELETE CASCADE,
    CONSTRAINT booking_member_fk FOREIGN KEY (member_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE posts (
    id INT NOT NULL AUTO_INCREMENT,
    member_id INT NOT NULL,
    subject VARCHAR(120) NOT NULL,
    body VARCHAR(1000) NOT NULL,
    created_at DATETIME NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY id_UNIQUE (id),
    KEY post_member_fk (member_id),
    CONSTRAINT post_member_fk FOREIGN KEY (member_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------------
-- Seed data
-- ---------------------------------------------------------------------------

INSERT INTO users (first_name, last_name, email, password, role) VALUES
    ('Grace',  'Admin',   'admin@hsgym.com',   '$2a$10$Y4KPasbXrI9o9NU9ydu1PujHtBOlF4C1nLOOBtIktT2rTiEc4xXGW', 'admin'),
    ('Liam',   'Brooks',  'liam@hsgym.com',    '$2a$10$Y4KPasbXrI9o9NU9ydu1PujHtBOlF4C1nLOOBtIktT2rTiEc4xXGW', 'trainer'),
    ('Sarah',  'Nguyen',  'sarah@hsgym.com',   '$2a$10$Y4KPasbXrI9o9NU9ydu1PujHtBOlF4C1nLOOBtIktT2rTiEc4xXGW', 'trainer'),
    ('Jack',   'Smith',   'jack@hsgym.com',    '$2a$10$Y4KPasbXrI9o9NU9ydu1PujHtBOlF4C1nLOOBtIktT2rTiEc4xXGW', 'trainer'),
    ('Emma',   'Wilson',  'emma@hsgym.com',    '$2a$10$Y4KPasbXrI9o9NU9ydu1PujHtBOlF4C1nLOOBtIktT2rTiEc4xXGW', 'trainer'),
    ('Ben',    'Taylor',  'ben@hsgym.com',     '$2a$10$Y4KPasbXrI9o9NU9ydu1PujHtBOlF4C1nLOOBtIktT2rTiEc4xXGW', 'trainer'),
    ('Chloe',  'Harris',  'chloe@hsgym.com',   '$2a$10$Y4KPasbXrI9o9NU9ydu1PujHtBOlF4C1nLOOBtIktT2rTiEc4xXGW', 'trainer'),
    ('Matt',   'Kelly',   'matt@hsgym.com',    '$2a$10$Y4KPasbXrI9o9NU9ydu1PujHtBOlF4C1nLOOBtIktT2rTiEc4xXGW', 'trainer'),
    ('Priya',  'Sharma',  'priya@hsgym.com',   '$2a$10$Y4KPasbXrI9o9NU9ydu1PujHtBOlF4C1nLOOBtIktT2rTiEc4xXGW', 'trainer'),
    ('Ava',    'Smith',   'ava@hsgym.com',     '$2a$10$Y4KPasbXrI9o9NU9ydu1PujHtBOlF4C1nLOOBtIktT2rTiEc4xXGW', 'member'),
    ('Ethan',  'Wilson',  'ethan@hsgym.com',   '$2a$10$Y4KPasbXrI9o9NU9ydu1PujHtBOlF4C1nLOOBtIktT2rTiEc4xXGW', 'member'),
    ('Mia',    'Taylor',  'mia@hsgym.com',     '$2a$10$Y4KPasbXrI9o9NU9ydu1PujHtBOlF4C1nLOOBtIktT2rTiEc4xXGW', 'member');

INSERT INTO activities (name, description) VALUES
    ('Yoga',           'A calming flow to build strength and flexibility.'),
    ('Pilates',        'Core-focused mat work for posture and control.'),
    ('Abs',            'A quick, high-intensity core blast.'),
    ('HIIT',           'High-intensity interval training for maximum burn.'),
    ('Indoor Cycling', 'A high-energy ride to the beat.'),
    ('Boxing',         'Pads, footwork and conditioning.'),
    ('Zumba',          'Dance your way to fitness.');

INSERT INTO locations (name, address) VALUES
    ('Ashgrove',      '240 Waterworks Rd, Ashgrove QLD 4060'),
    ('Brisbane City', '123 Adelaide St, Brisbane QLD 4000'),
    ('Chermside',     'Gympie Rd, Chermside QLD 4032'),
    ('Graceville',    '310 Honour Ave, Graceville QLD 4075'),
    ('Westlake',      '4 Lakeview Ave, Westlake QLD 4074');

-- Sessions for the current week.
SET @mon = DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY);

-- Eight trainers across the week; nobody is double-booked.
INSERT INTO sessions (activity_id, location_id, trainer_id, date, start_time, end_time, capacity) VALUES
    (1, 1, 2, @mon,                              '07:00:00', '08:00:00', 20),
    (4, 2, 5, @mon,                              '18:00:00', '19:00:00', 25),
    (4, 4, 4, @mon,                              '18:00:00', '19:00:00', 20),
    (2, 3, 3, DATE_ADD(@mon, INTERVAL 1 DAY),    '09:00:00', '10:00:00', 18),
    (6, 5, 6, DATE_ADD(@mon, INTERVAL 1 DAY),    '17:30:00', '18:30:00', 15),
    (5, 2, 7, DATE_ADD(@mon, INTERVAL 1 DAY),    '06:00:00', '07:00:00', 30),
    (3, 1, 8, DATE_ADD(@mon, INTERVAL 2 DAY),    '12:00:00', '12:45:00', 15),
    (7, 4, 9, DATE_ADD(@mon, INTERVAL 2 DAY),    '18:00:00', '19:00:00', 30),
    (1, 2, 2, DATE_ADD(@mon, INTERVAL 2 DAY),    '07:00:00', '08:00:00', 20),
    (4, 3, 5, DATE_ADD(@mon, INTERVAL 3 DAY),    '06:30:00', '07:30:00', 25),
    (5, 5, 4, DATE_ADD(@mon, INTERVAL 3 DAY),    '18:00:00', '19:00:00', 25),
    (2, 1, 3, DATE_ADD(@mon, INTERVAL 3 DAY),    '10:00:00', '11:00:00', 18),
    (6, 2, 6, DATE_ADD(@mon, INTERVAL 4 DAY),    '17:00:00', '18:00:00', 15),
    (7, 3, 7, DATE_ADD(@mon, INTERVAL 4 DAY),    '18:00:00', '19:00:00', 30),
    (3, 5, 8, DATE_ADD(@mon, INTERVAL 4 DAY),    '12:00:00', '12:45:00', 15),
    (1, 4, 9, DATE_ADD(@mon, INTERVAL 5 DAY),    '08:00:00', '09:00:00', 20),
    (4, 1, 2, DATE_ADD(@mon, INTERVAL 5 DAY),    '09:30:00', '10:30:00', 25),
    (7, 2, 3, DATE_ADD(@mon, INTERVAL 5 DAY),    '11:00:00', '12:00:00', 30),
    (2, 5, 4, DATE_ADD(@mon, INTERVAL 6 DAY),    '09:00:00', '10:00:00', 18),
    (1, 3, 5, DATE_ADD(@mon, INTERVAL 6 DAY),    '10:30:00', '11:30:00', 20),
    (3, 2, 6, DATE_ADD(@mon, INTERVAL 6 DAY),    '16:00:00', '16:45:00', 15);

INSERT INTO posts (member_id, subject, body, created_at) VALUES
    (10, 'First HIIT class done!', 'Survived my first HIIT class at Brisbane City. Absolutely wrecked but keen for next week.', NOW()),
    (11, 'Monday morning yoga',     'Did the 7am yoga at Ashgrove today. Good way to start the week, would recommend.', NOW()),
    (12, 'Pilates is harder than it looks', 'Who knew lying on a mat could be this hard? Core is on fire. Thanks Sarah for the class!', NOW());

INSERT INTO bookings (session_id, member_id, created_at) VALUES
    (1, 10, NOW()),
    (2, 11, NOW()),
    (5, 10, NOW());
