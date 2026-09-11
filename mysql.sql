CREATE DATABASE IF NOT EXISTS buzz
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
USE buzz;

CREATE TABLE IF NOT EXISTS sites (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    location VARCHAR(255) NULL,
    wasp_close_threshold DECIMAL(5,4) NOT NULL DEFAULT 0.7000,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS detection_events (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    analysis_id VARCHAR(64) NOT NULL UNIQUE,
    site_id INT NULL,
    analysis_type ENUM('live', 'test', 'simulation') NOT NULL DEFAULT 'live',
    original_file_name VARCHAR(255) NULL,
    file_path VARCHAR(500) NULL,
    expected_label ENUM('wasp', 'non_wasp') NULL,
    prediction ENUM('wasp', 'non_wasp') NOT NULL,
    is_correct BOOLEAN NULL,
    sample_rate INT NULL,
    duration DECIMAL(8,3) NULL,
    confidence DECIMAL(7,6) NULL,
    wasp_probability DECIMAL(7,6) NULL,
    non_wasp_probability DECIMAL(7,6) NULL,
    model_name VARCHAR(100) NULL,
    source VARCHAR(50) NULL,
    detected_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_detection_site FOREIGN KEY (site_id) REFERENCES sites(id),
    INDEX idx_detection_site_time (site_id, detected_at),
    INDEX idx_detection_type_time (analysis_type, detected_at),
    INDEX idx_detection_prediction (prediction)
);

CREATE TABLE IF NOT EXISTS analysis_graph_data (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    detection_event_id BIGINT NOT NULL UNIQUE,
    waveform JSON NULL,
    fft JSON NULL,
    spectrogram JSON NULL,
    mfcc JSON NULL,
    CONSTRAINT fk_graph_detection
      FOREIGN KEY (detection_event_id) REFERENCES detection_events(id)
      ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS gate_status (
    site_id INT PRIMARY KEY,
    status ENUM('open', 'closed') NOT NULL DEFAULT 'open',
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_gate_status_site
      FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS gate_events (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    site_id INT NOT NULL,
    detection_event_id BIGINT NULL,
    action ENUM('open', 'close') NOT NULL,
    trigger_type ENUM('auto', 'manual') NOT NULL,
    result ENUM('success', 'rejected') NOT NULL,
    reason ENUM('wasp_detected', 'manual_request', 'wasp_detection_active') NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_gate_site FOREIGN KEY (site_id) REFERENCES sites(id),
    CONSTRAINT fk_gate_detection
      FOREIGN KEY (detection_event_id) REFERENCES detection_events(id) ON DELETE SET NULL,
    INDEX idx_gate_site_time (site_id, created_at)
);

INSERT INTO sites (id, name, location, wasp_close_threshold) VALUES
  (1, '사업장 1', '천안 양봉장 1', 0.7000),
  (2, '사업장 2', '천안 양봉장 2', 0.7000),
  (3, '사업장 3', '천안 양봉장 3', 0.7000)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  location = VALUES(location),
  wasp_close_threshold = VALUES(wasp_close_threshold);

INSERT INTO gate_status (site_id, status) VALUES
  (1, 'open'), (2, 'open'), (3, 'open')
ON DUPLICATE KEY UPDATE status = status;

CREATE TABLE IF NOT EXISTS file_test_runs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    test_id VARCHAR(64) NOT NULL UNIQUE,
    site_id INT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    tested_at DATETIME NOT NULL,
    total_duration DECIMAL(10,3) NOT NULL,
    max_confidence DECIMAL(7,6) NOT NULL,
    final_result ENUM('wasp','non_wasp') NOT NULL,
    result_json JSON NOT NULL,
    INDEX idx_file_test_time (tested_at),
    INDEX idx_file_test_site (site_id, tested_at)
);
