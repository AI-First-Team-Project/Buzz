CREATE TABLE sites (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    location VARCHAR(255) NULL,
    wasp_close_threshold FLOAT NOT NULL DEFAULT 0.8
);

CREATE TABLE detection_events (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,

    analysis_id VARCHAR(64) NOT NULL UNIQUE,
    site_id INT NOT NULL,

    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NULL,
    sample_rate INT NULL,
    duration FLOAT NULL,

    prediction ENUM(
        'wasp',
        'non_wasp'
    ) NOT NULL,

    confidence FLOAT NULL,

    wasp_probability FLOAT NULL,
    non_wasp_probability FLOAT NULL,

    model_name VARCHAR(100) NULL,
    source VARCHAR(50) NULL,

    audio_time FLOAT NULL,
    inference_time FLOAT NULL,
    visualization_time FLOAT NULL,
    total_time FLOAT NULL,

    detected_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_detection_site
        FOREIGN KEY (site_id)
        REFERENCES sites(id)
);

CREATE TABLE analysis_graph_data (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,

    detection_event_id BIGINT NOT NULL,

    waveform JSON NULL,
    fft JSON NULL,
    spectrogram JSON NULL,
    mfcc JSON NULL,

    CONSTRAINT fk_graph_detection
        FOREIGN KEY (detection_event_id)
        REFERENCES detection_events(id)
        ON DELETE CASCADE
);

CREATE TABLE gate_status (
    site_id INT PRIMARY KEY,

    status ENUM(
        'open',
        'closed'
    ) NOT NULL DEFAULT 'open',

    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_gate_status_site
        FOREIGN KEY (site_id)
        REFERENCES sites(id)
);

CREATE TABLE gate_events (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,

    site_id INT NOT NULL,
    detection_event_id BIGINT NULL,

    action ENUM(
        'open',
        'close'
    ) NOT NULL,

    trigger_type ENUM(
        'auto',
        'manual'
    ) NOT NULL,

    result ENUM(
        'success',
        'rejected'
    ) NOT NULL,

    reason ENUM(
        'wasp_detected',
        'manual_request',
        'wasp_detection_active'
    ) NOT NULL,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_gate_site
        FOREIGN KEY (site_id)
        REFERENCES sites(id),

    CONSTRAINT fk_gate_detection
        FOREIGN KEY (detection_event_id)
        REFERENCES detection_events(id)
        ON DELETE SET NULL
);