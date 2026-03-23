CREATE TABLE work_hours (
	id SERIAL PRIMARY KEY,
	date DATE NOT NULL,
	start_time TIME NOT NULL,
	end_time TIME NOT NULL,
	slot_interval INT NOT NULL,
	CHECK (end_time > start_time)
);

CREATE TABLE appointments (
	id SERIAL PRIMARY KEY,
	start_datetime TIMESTAMP NOT NULL,
	end_datetime TIMESTAMP NOT NULL,
	customer_name VARCHAR(50) NOT NULL,
	CHECK (end_datetime > start_datetime)
);

CREATE TABLE unavailable_time_slots (
	work_hours_id INT NOT NULL,
	start_datetime TIMESTAMP NOT NULL,
	end_datetime TIMESTAMP NOT NULL,
	reason VARCHAR(50),
	PRIMARY KEY (work_hours_id, start_datetime, end_datetime),
	FOREIGN KEY (work_hours_id) REFERENCES work_hours(id),
	CHECK (end_datetime > start_datetime)
);