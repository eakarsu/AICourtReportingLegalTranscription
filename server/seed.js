require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { Client } = require('pg');
const bcrypt = require('bcryptjs');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const log = (msg) => console.log(`[seed] ${msg}`);

function requireDemoPassword() {
  const password = process.env.DEMO_PASSWORD || process.env.SEED_DEMO_PASSWORD || process.env.DEMO_SEED_PASSWORD || '';
  if (password.length < 12 || password.length > 1024) throw new Error('DEMO_PASSWORD must contain 12-1024 characters');
  return password;
}

async function run() {
  // -------------------------------------------------------------------
  // 1. Ensure database & role exist (connect to default "postgres" db)
  // -------------------------------------------------------------------
  const adminConn = process.env.DATABASE_URL
    ? process.env.DATABASE_URL.replace(/\/[^/]+$/, '/postgres')
    : 'postgres://localhost:5432/postgres';

  const dbName = (process.env.DATABASE_URL || '').match(/\/([^/?]+)(\?|$)/)?.[1] || 'court_reporting';

  const admin = new Client({ connectionString: adminConn });
  try {
    await admin.connect();
    log('Connected to postgres database.');

    const dbCheck = await admin.query(
      "SELECT 1 FROM pg_database WHERE datname = $1", [dbName]
    );
    if (dbCheck.rowCount === 0) {
      await admin.query(`CREATE DATABASE "${dbName}"`);
      log(`Created database "${dbName}".`);
    } else {
      log(`Database "${dbName}" already exists.`);
    }
  } catch (err) {
    console.error('Warning during DB/role setup:', err.message);
  } finally {
    await admin.end();
  }

  // -------------------------------------------------------------------
  // 2. Connect to the target database
  // -------------------------------------------------------------------
  const client = new Client({ connectionString: process.env.DATABASE_URL || `postgres://localhost:5432/${dbName}` });
  await client.connect();
  log('Connected to target database.');

  try {
    // -----------------------------------------------------------------
    // 3. Drop all tables
    // -----------------------------------------------------------------
    log('Dropping existing tables...');
    await client.query(`
      DROP TABLE IF EXISTS
        travel_expenses, rush_fees, payments, invoices, transcript_archive,
        contacts, courts, deliveries, exhibits, video_syncs,
        realtime_connections, certifications, equipment, proofreaders,
        scopists, billing, transcripts, cases, jobs, reporters, clients,
        users
      CASCADE;
    `);
    log('All tables dropped.');

    // -----------------------------------------------------------------
    // 4. Create tables
    // -----------------------------------------------------------------
    log('Creating tables...');

    await client.query(`
      CREATE TABLE users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL CHECK (role IN ('admin','reporter','scopist','proofreader')),
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE clients (
        id SERIAL PRIMARY KEY,
        firm_name VARCHAR(255) NOT NULL,
        contact_name VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        phone VARCHAR(50),
        address TEXT,
        billing_address TEXT,
        payment_terms VARCHAR(100),
        account_status VARCHAR(50) DEFAULT 'active',
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE reporters (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        phone VARCHAR(50),
        certification VARCHAR(50),
        availability_status VARCHAR(50) DEFAULT 'available',
        hourly_rate NUMERIC(10,2),
        specialization VARCHAR(255),
        years_experience INTEGER,
        address TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE scopists (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        phone VARCHAR(50),
        specialization VARCHAR(255),
        rate_per_page NUMERIC(10,2),
        availability_status VARCHAR(50) DEFAULT 'available',
        turnaround_days INTEGER,
        experience_years INTEGER,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE proofreaders (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        phone VARCHAR(50),
        specialization VARCHAR(255),
        rate_per_page NUMERIC(10,2),
        availability_status VARCHAR(50) DEFAULT 'available',
        turnaround_days INTEGER,
        accuracy_rating NUMERIC(5,2),
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE cases (
        id SERIAL PRIMARY KEY,
        case_number VARCHAR(100) NOT NULL,
        case_name VARCHAR(500) NOT NULL,
        court VARCHAR(255),
        jurisdiction VARCHAR(255),
        case_type VARCHAR(100),
        client_id INTEGER REFERENCES clients(id),
        status VARCHAR(50) DEFAULT 'open',
        filing_date DATE,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE jobs (
        id SERIAL PRIMARY KEY,
        case_name VARCHAR(500),
        case_number VARCHAR(100),
        job_type VARCHAR(50) NOT NULL CHECK (job_type IN ('deposition','hearing','trial')),
        date_scheduled DATE,
        time_scheduled TIME,
        location VARCHAR(500),
        status VARCHAR(50) DEFAULT 'scheduled' CHECK (status IN ('scheduled','in_progress','completed','cancelled')),
        court_reporter_id INTEGER REFERENCES reporters(id),
        client_id INTEGER REFERENCES clients(id),
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE transcripts (
        id SERIAL PRIMARY KEY,
        job_id INTEGER REFERENCES jobs(id),
        case_id INTEGER REFERENCES cases(id),
        status VARCHAR(50) DEFAULT 'rough' CHECK (status IN ('rough','edited','final','certified')),
        page_count INTEGER,
        reporter_id INTEGER REFERENCES reporters(id),
        scopist_id INTEGER REFERENCES scopists(id),
        proofreader_id INTEGER REFERENCES proofreaders(id),
        due_date DATE,
        completed_date DATE,
        file_path VARCHAR(500),
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE billing (
        id SERIAL PRIMARY KEY,
        client_id INTEGER REFERENCES clients(id),
        job_id INTEGER REFERENCES jobs(id),
        transcript_id INTEGER REFERENCES transcripts(id),
        page_rate NUMERIC(10,2),
        page_count INTEGER,
        base_amount NUMERIC(10,2),
        rush_fee NUMERIC(10,2) DEFAULT 0,
        expedite_fee NUMERIC(10,2) DEFAULT 0,
        total_amount NUMERIC(10,2),
        status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending','sent','paid','overdue')),
        due_date DATE,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE deliveries (
        id SERIAL PRIMARY KEY,
        transcript_id INTEGER REFERENCES transcripts(id),
        client_id INTEGER REFERENCES clients(id),
        delivery_type VARCHAR(50) CHECK (delivery_type IN ('electronic','paper','both')),
        delivery_status VARCHAR(50) DEFAULT 'pending',
        tracking_number VARCHAR(100),
        delivery_date DATE,
        recipient_name VARCHAR(255),
        recipient_email VARCHAR(255),
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE exhibits (
        id SERIAL PRIMARY KEY,
        job_id INTEGER REFERENCES jobs(id),
        exhibit_number VARCHAR(50),
        description TEXT,
        exhibit_type VARCHAR(100),
        file_path VARCHAR(500),
        status VARCHAR(50) DEFAULT 'marked',
        marked_by VARCHAR(255),
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE video_syncs (
        id SERIAL PRIMARY KEY,
        job_id INTEGER REFERENCES jobs(id),
        transcript_id INTEGER REFERENCES transcripts(id),
        video_file VARCHAR(500),
        sync_status VARCHAR(50) DEFAULT 'pending',
        start_timecode VARCHAR(50),
        end_timecode VARCHAR(50),
        duration VARCHAR(50),
        technician VARCHAR(255),
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE realtime_connections (
        id SERIAL PRIMARY KEY,
        job_id INTEGER REFERENCES jobs(id),
        reporter_id INTEGER REFERENCES reporters(id),
        connection_type VARCHAR(50) CHECK (connection_type IN ('internet','direct')),
        ip_address VARCHAR(50),
        port INTEGER,
        status VARCHAR(50) DEFAULT 'inactive' CHECK (status IN ('active','inactive','standby')),
        client_name VARCHAR(255),
        software VARCHAR(255),
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE equipment (
        id SERIAL PRIMARY KEY,
        equipment_type VARCHAR(50) CHECK (equipment_type IN ('stenograph','audio','video')),
        brand VARCHAR(255),
        model VARCHAR(255),
        serial_number VARCHAR(255),
        assigned_to INTEGER REFERENCES reporters(id),
        status VARCHAR(50) DEFAULT 'available' CHECK (status IN ('available','in_use','maintenance','retired')),
        purchase_date DATE,
        last_maintenance DATE,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE certifications (
        id SERIAL PRIMARY KEY,
        reporter_id INTEGER REFERENCES reporters(id),
        certification_type VARCHAR(50) CHECK (certification_type IN ('RPR','RMR','CRR','CLVS')),
        issue_date DATE,
        expiry_date DATE,
        ce_credits_required INTEGER,
        ce_credits_completed INTEGER,
        status VARCHAR(50) DEFAULT 'active',
        issuing_body VARCHAR(255),
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE courts (
        id SERIAL PRIMARY KEY,
        court_name VARCHAR(500) NOT NULL,
        court_type VARCHAR(100),
        address TEXT,
        city VARCHAR(255),
        state VARCHAR(50),
        zip VARCHAR(20),
        phone VARCHAR(50),
        clerk_name VARCHAR(255),
        clerk_phone VARCHAR(50),
        department VARCHAR(100),
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE contacts (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        contact_type VARCHAR(50) CHECK (contact_type IN ('attorney','witness','expert','paralegal')),
        firm VARCHAR(255),
        email VARCHAR(255),
        phone VARCHAR(50),
        address TEXT,
        bar_number VARCHAR(100),
        specialty VARCHAR(255),
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE invoices (
        id SERIAL PRIMARY KEY,
        invoice_number VARCHAR(100) UNIQUE NOT NULL,
        client_id INTEGER REFERENCES clients(id),
        billing_id INTEGER REFERENCES billing(id),
        amount NUMERIC(10,2),
        tax NUMERIC(10,2) DEFAULT 0,
        total NUMERIC(10,2),
        status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft','sent','paid','overdue','cancelled')),
        issue_date DATE,
        due_date DATE,
        paid_date DATE,
        narrative TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE payments (
        id SERIAL PRIMARY KEY,
        invoice_id INTEGER REFERENCES invoices(id),
        client_id INTEGER REFERENCES clients(id),
        amount NUMERIC(10,2),
        payment_method VARCHAR(50),
        payment_date DATE,
        reference_number VARCHAR(100),
        status VARCHAR(50) DEFAULT 'completed',
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE transcript_archive (
        id SERIAL PRIMARY KEY,
        transcript_id INTEGER REFERENCES transcripts(id),
        case_number VARCHAR(100),
        case_name VARCHAR(500),
        archived_date DATE,
        storage_location VARCHAR(500),
        retention_until DATE,
        access_level VARCHAR(50),
        file_size BIGINT,
        checksum VARCHAR(255),
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE travel_expenses (
        id SERIAL PRIMARY KEY,
        job_id INTEGER REFERENCES jobs(id),
        reporter_id INTEGER REFERENCES reporters(id),
        expense_type VARCHAR(50) CHECK (expense_type IN ('mileage','airfare','hotel','meals','parking')),
        amount NUMERIC(10,2),
        date_incurred DATE,
        description TEXT,
        receipt_path VARCHAR(500),
        status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending','approved','reimbursed')),
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE rush_fees (
        id SERIAL PRIMARY KEY,
        job_id INTEGER REFERENCES jobs(id),
        transcript_id INTEGER REFERENCES transcripts(id),
        fee_type VARCHAR(50) CHECK (fee_type IN ('rush','expedite','daily_copy','realtime')),
        multiplier NUMERIC(5,2),
        base_amount NUMERIC(10,2),
        fee_amount NUMERIC(10,2),
        requested_by VARCHAR(255),
        approved_by VARCHAR(255),
        status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    log('All tables created.');

    // -----------------------------------------------------------------
    // 5. Seed data
    // -----------------------------------------------------------------
    log('Seeding data...');

    const passwordHash = await bcrypt.hash(requireDemoPassword(), 10);

    // ---- users (22 rows) ----
    log('  Seeding users...');
    await client.query(`
      INSERT INTO users (email, password_hash, name, role) VALUES
        ('admin@courtreport.com', $1, 'Margaret Sullivan', 'admin'),
        ('jthompson@courtreport.com', $1, 'James Thompson', 'admin'),
        ('swilliams@courtreport.com', $1, 'Sandra Williams', 'reporter'),
        ('dgarcia@courtreport.com', $1, 'David Garcia', 'reporter'),
        ('lmartinez@courtreport.com', $1, 'Linda Martinez', 'reporter'),
        ('rjohnson@courtreport.com', $1, 'Robert Johnson', 'reporter'),
        ('klee@courtreport.com', $1, 'Karen Lee', 'reporter'),
        ('mbrown@courtreport.com', $1, 'Michael Brown', 'reporter'),
        ('pclark@courtreport.com', $1, 'Patricia Clark', 'scopist'),
        ('jwhite@courtreport.com', $1, 'Jennifer White', 'scopist'),
        ('tharris@courtreport.com', $1, 'Thomas Harris', 'scopist'),
        ('nturner@courtreport.com', $1, 'Nancy Turner', 'scopist'),
        ('awalker@courtreport.com', $1, 'Amanda Walker', 'scopist'),
        ('chill@courtreport.com', $1, 'Christine Hill', 'proofreader'),
        ('bking@courtreport.com', $1, 'Barbara King', 'proofreader'),
        ('gwright@courtreport.com', $1, 'George Wright', 'proofreader'),
        ('elopez@courtreport.com', $1, 'Elizabeth Lopez', 'proofreader'),
        ('fscott@courtreport.com', $1, 'Frank Scott', 'proofreader'),
        ('hadams@courtreport.com', $1, 'Helen Adams', 'reporter'),
        ('jnelson@courtreport.com', $1, 'Joseph Nelson', 'reporter'),
        ('mcarter@courtreport.com', $1, 'Mary Carter', 'scopist'),
        ('wmitchell@courtreport.com', $1, 'William Mitchell', 'admin');
    `, [passwordHash]);

    // ---- clients (18 rows) ----
    log('  Seeding clients...');
    await client.query(`
      INSERT INTO clients (firm_name, contact_name, email, phone, address, billing_address, payment_terms, account_status, notes) VALUES
        ('Baker McKenzie LLP', 'Richard Hale', 'rhale@bakermckenzie.com', '(312) 555-0101', '300 E Randolph St, Chicago, IL 60601', '300 E Randolph St, Chicago, IL 60601', 'Net 30', 'active', 'Top-tier international firm'),
        ('Kirkland & Ellis LLP', 'Susan Pratt', 'spratt@kirkland.com', '(312) 555-0202', '601 Lexington Ave, New York, NY 10022', '601 Lexington Ave, New York, NY 10022', 'Net 30', 'active', 'Major litigation practice'),
        ('Latham & Watkins LLP', 'Daniel Cho', 'dcho@lw.com', '(213) 555-0303', '355 S Grand Ave, Los Angeles, CA 90071', '355 S Grand Ave, Los Angeles, CA 90071', 'Net 45', 'active', 'Frequent deposition work'),
        ('Skadden Arps Slate Meagher & Flom', 'Catherine Byrd', 'cbyrd@skadden.com', '(212) 555-0404', '4 Times Square, New York, NY 10036', '4 Times Square, New York, NY 10036', 'Net 30', 'active', 'High volume client'),
        ('Jones Day', 'Michael Dunn', 'mdunn@jonesday.com', '(216) 555-0505', '901 Lakeside Ave, Cleveland, OH 44114', '901 Lakeside Ave, Cleveland, OH 44114', 'Net 30', 'active', NULL),
        ('Sidley Austin LLP', 'Laura Mendez', 'lmendez@sidley.com', '(312) 555-0606', '1 S Dearborn St, Chicago, IL 60603', '1 S Dearborn St, Chicago, IL 60603', 'Net 45', 'active', 'Prefers electronic delivery'),
        ('White & Case LLP', 'Peter Huang', 'phuang@whitecase.com', '(212) 555-0707', '1221 Avenue of the Americas, New York, NY 10020', '1221 Avenue of the Americas, New York, NY 10020', 'Net 30', 'active', NULL),
        ('Morgan Lewis & Bockius', 'Janet Freeman', 'jfreeman@morganlewis.com', '(215) 555-0808', '1701 Market St, Philadelphia, PA 19103', '1701 Market St, Philadelphia, PA 19103', 'Net 30', 'active', 'Insurance defense specialty'),
        ('Gibson Dunn & Crutcher', 'Robert Steele', 'rsteele@gibsondunn.com', '(213) 555-0909', '333 S Grand Ave, Los Angeles, CA 90071', '333 S Grand Ave, Los Angeles, CA 90071', 'Net 30', 'active', 'Requires certified copies'),
        ('Weil Gotshal & Manges', 'Emily Chang', 'echang@weil.com', '(212) 555-1010', '767 Fifth Ave, New York, NY 10153', '767 Fifth Ave, New York, NY 10153', 'Net 30', 'active', NULL),
        ('DLA Piper', 'Mark Swanson', 'mswanson@dlapiper.com', '(312) 555-1111', '444 W Lake St, Chicago, IL 60606', '444 W Lake St, Chicago, IL 60606', 'Net 45', 'active', 'Multi-office firm'),
        ('Hogan Lovells', 'Sarah Quinn', 'squinn@hoganlovells.com', '(202) 555-1212', '555 13th St NW, Washington, DC 20004', '555 13th St NW, Washington, DC 20004', 'Net 30', 'active', NULL),
        ('Norton Rose Fulbright', 'Kevin Marsh', 'kmarsh@nortonrosefulbright.com', '(713) 555-1313', '1301 McKinney St, Houston, TX 77010', '1301 McKinney St, Houston, TX 77010', 'Net 30', 'active', 'Energy sector litigation'),
        ('Quinn Emanuel Urquhart', 'Diane Frost', 'dfrost@quinnemanuel.com', '(213) 555-1414', '865 S Figueroa St, Los Angeles, CA 90017', '865 S Figueroa St, Los Angeles, CA 90017', 'Net 30', 'active', 'Trial-focused firm'),
        ('Greenberg Traurig LLP', 'Anthony Reeves', 'areeves@gtlaw.com', '(305) 555-1515', '333 SE 2nd Ave, Miami, FL 33131', '333 SE 2nd Ave, Miami, FL 33131', 'Net 45', 'active', NULL),
        ('Sullivan & Cromwell LLP', 'Elizabeth Doyle', 'edoyle@sullcrom.com', '(212) 555-1616', '125 Broad St, New York, NY 10004', '125 Broad St, New York, NY 10004', 'Net 30', 'active', 'Premium billing rates accepted'),
        ('Covington & Burling LLP', 'Howard Pham', 'hpham@cov.com', '(202) 555-1717', '850 10th St NW, Washington, DC 20001', '850 10th St NW, Washington, DC 20001', 'Net 30', 'active', NULL),
        ('Paul Weiss Rifkind Wharton', 'Monica Hart', 'mhart@paulweiss.com', '(212) 555-1818', '1285 Avenue of the Americas, New York, NY 10019', '1285 Avenue of the Americas, New York, NY 10019', 'Net 30', 'active', 'Appellate and trial work');
    `);

    // ---- reporters (16 rows) ----
    log('  Seeding reporters...');
    await client.query(`
      INSERT INTO reporters (name, email, phone, certification, availability_status, hourly_rate, specialization, years_experience, address) VALUES
        ('Sandra Williams', 'swilliams@courtreport.com', '(312) 555-2001', 'RPR', 'available', 85.00, 'Medical malpractice', 12, '450 N Michigan Ave, Chicago, IL 60611'),
        ('David Garcia', 'dgarcia@courtreport.com', '(213) 555-2002', 'RMR', 'available', 95.00, 'Intellectual property', 18, '1000 Wilshire Blvd, Los Angeles, CA 90017'),
        ('Linda Martinez', 'lmartinez@courtreport.com', '(212) 555-2003', 'CRR', 'available', 110.00, 'Realtime reporting', 22, '100 Church St, New York, NY 10007'),
        ('Robert Johnson', 'rjohnson@courtreport.com', '(713) 555-2004', 'RPR', 'available', 80.00, 'Oil & gas litigation', 8, '1200 Smith St, Houston, TX 77002'),
        ('Karen Lee', 'klee@courtreport.com', '(415) 555-2005', 'RMR', 'busy', 100.00, 'Securities litigation', 15, '600 Montgomery St, San Francisco, CA 94111'),
        ('Michael Brown', 'mbrown@courtreport.com', '(305) 555-2006', 'RPR', 'available', 82.00, 'Personal injury', 10, '200 S Biscayne Blvd, Miami, FL 33131'),
        ('Helen Adams', 'hadams@courtreport.com', '(202) 555-2007', 'CRR', 'available', 115.00, 'Congressional hearings', 25, '701 Pennsylvania Ave NW, Washington, DC 20004'),
        ('Joseph Nelson', 'jnelson@courtreport.com', '(312) 555-2008', 'RPR', 'busy', 78.00, 'Family law', 6, '77 W Wacker Dr, Chicago, IL 60601'),
        ('Catherine Reese', 'creese@courtreport.com', '(214) 555-2009', 'RMR', 'available', 92.00, 'Employment law', 14, '2200 Ross Ave, Dallas, TX 75201'),
        ('Andrew Patel', 'apatel@courtreport.com', '(617) 555-2010', 'RPR', 'available', 88.00, 'Environmental law', 11, '100 Federal St, Boston, MA 02110'),
        ('Rebecca Torres', 'rtorres@courtreport.com', '(602) 555-2011', 'CRR', 'available', 105.00, 'Criminal trials', 20, '201 W Washington St, Phoenix, AZ 85003'),
        ('Steven Kim', 'skim@courtreport.com', '(404) 555-2012', 'RPR', 'unavailable', 76.00, 'Workers compensation', 5, '100 Peachtree St NW, Atlanta, GA 30303'),
        ('Diana Morales', 'dmorales@courtreport.com', '(312) 555-2013', 'RMR', 'available', 98.00, 'Product liability', 16, '233 S Wacker Dr, Chicago, IL 60606'),
        ('Paul Wagner', 'pwagner@courtreport.com', '(215) 555-2014', 'RPR', 'available', 84.00, 'Construction law', 9, '1500 Market St, Philadelphia, PA 19102'),
        ('Michelle Lawson', 'mlawson@courtreport.com', '(303) 555-2015', 'CRR', 'available', 108.00, 'Class action', 19, '1700 Lincoln St, Denver, CO 80203'),
        ('Brian Foster', 'bfoster@courtreport.com', '(206) 555-2016', 'RPR', 'available', 80.00, 'Immigration hearings', 7, '1000 2nd Ave, Seattle, WA 98104');
    `);

    // ---- scopists (16 rows) ----
    log('  Seeding scopists...');
    await client.query(`
      INSERT INTO scopists (name, email, phone, specialization, rate_per_page, availability_status, turnaround_days, experience_years, notes) VALUES
        ('Patricia Clark', 'pclark@courtreport.com', '(312) 555-3001', 'Medical terminology', 1.25, 'available', 3, 10, 'Excellent medical vocabulary'),
        ('Jennifer White', 'jwhite@courtreport.com', '(212) 555-3002', 'Legal terminology', 1.15, 'available', 4, 8, 'Fast turnaround'),
        ('Thomas Harris', 'tharris@courtreport.com', '(713) 555-3003', 'Technical/engineering', 1.35, 'available', 3, 12, 'Engineering background'),
        ('Nancy Turner', 'nturner@courtreport.com', '(415) 555-3004', 'Financial/securities', 1.30, 'busy', 5, 9, 'CPA background'),
        ('Amanda Walker', 'awalker@courtreport.com', '(305) 555-3005', 'General litigation', 1.10, 'available', 4, 6, NULL),
        ('Mary Carter', 'mcarter@courtreport.com', '(202) 555-3006', 'Government proceedings', 1.20, 'available', 3, 11, 'Former government reporter'),
        ('Lisa Nguyen', 'lnguyen@courtreport.com', '(617) 555-3007', 'Patent litigation', 1.40, 'available', 3, 14, 'Science degree'),
        ('Rachel Evans', 'revans@courtreport.com', '(312) 555-3008', 'Criminal law', 1.15, 'available', 4, 7, NULL),
        ('Dorothy Grant', 'dgrant@courtreport.com', '(214) 555-3009', 'Real estate law', 1.10, 'available', 5, 5, 'New but reliable'),
        ('Karen Phillips', 'kphillips@courtreport.com', '(404) 555-3010', 'Employment law', 1.20, 'busy', 4, 8, NULL),
        ('Debra Collins', 'dcollins@courtreport.com', '(602) 555-3011', 'Insurance defense', 1.25, 'available', 3, 10, 'Very detail-oriented'),
        ('Angela Stewart', 'astewart@courtreport.com', '(303) 555-3012', 'Environmental law', 1.30, 'available', 4, 9, NULL),
        ('Ruth Morgan', 'rmorgan@courtreport.com', '(206) 555-3013', 'Immigration law', 1.15, 'available', 5, 6, 'Bilingual English/Spanish'),
        ('Carolyn Brooks', 'cbrooks@courtreport.com', '(215) 555-3014', 'Construction disputes', 1.20, 'available', 3, 11, NULL),
        ('Janet Foster', 'jfoster@courtreport.com', '(312) 555-3015', 'Product liability', 1.35, 'unavailable', 4, 13, 'On leave until Feb 2025'),
        ('Shirley Reynolds', 'sreynolds@courtreport.com', '(713) 555-3016', 'Oil & gas terminology', 1.30, 'available', 3, 10, 'Houston-based specialist');
    `);

    // ---- proofreaders (16 rows) ----
    log('  Seeding proofreaders...');
    await client.query(`
      INSERT INTO proofreaders (name, email, phone, specialization, rate_per_page, availability_status, turnaround_days, accuracy_rating, notes) VALUES
        ('Christine Hill', 'chill@courtreport.com', '(312) 555-4001', 'Medical transcripts', 0.85, 'available', 2, 99.20, 'Top-rated proofreader'),
        ('Barbara King', 'bking@courtreport.com', '(212) 555-4002', 'Legal proceedings', 0.80, 'available', 3, 98.50, NULL),
        ('George Wright', 'gwright@courtreport.com', '(213) 555-4003', 'Technical depositions', 0.90, 'available', 2, 99.00, 'Former court reporter'),
        ('Elizabeth Lopez', 'elopez@courtreport.com', '(713) 555-4004', 'General litigation', 0.75, 'available', 3, 97.80, NULL),
        ('Frank Scott', 'fscott@courtreport.com', '(415) 555-4005', 'Securities/financial', 0.88, 'busy', 2, 98.90, 'Financial background'),
        ('Virginia Reed', 'vreed@courtreport.com', '(305) 555-4006', 'Personal injury', 0.78, 'available', 3, 97.50, NULL),
        ('Arthur Cook', 'acook@courtreport.com', '(202) 555-4007', 'Government hearings', 0.82, 'available', 2, 98.60, NULL),
        ('Marie Bell', 'mbell@courtreport.com', '(617) 555-4008', 'Patent cases', 0.92, 'available', 3, 99.10, 'PhD in Linguistics'),
        ('Eugene Howard', 'ehoward@courtreport.com', '(214) 555-4009', 'Family law', 0.75, 'available', 4, 97.00, NULL),
        ('Gloria Ward', 'gward@courtreport.com', '(404) 555-4010', 'Employment law', 0.80, 'available', 3, 98.30, NULL),
        ('Ralph Torres', 'rtorres@courtreport.com', '(602) 555-4011', 'Criminal trials', 0.85, 'available', 2, 98.70, '20 years experience'),
        ('Alice Murphy', 'amurphy@courtreport.com', '(303) 555-4012', 'Environmental law', 0.82, 'available', 3, 97.90, NULL),
        ('Roy Bailey', 'rbailey@courtreport.com', '(206) 555-4013', 'General', 0.72, 'available', 4, 96.80, 'Part-time'),
        ('Dorothy Rivera', 'drivera@courtreport.com', '(215) 555-4014', 'Construction disputes', 0.80, 'available', 3, 98.10, NULL),
        ('Henry Cox', 'hcox@courtreport.com', '(312) 555-4015', 'Product liability', 0.88, 'unavailable', 2, 99.30, 'Highest accuracy'),
        ('Betty Diaz', 'bdiaz@courtreport.com', '(713) 555-4016', 'Oil & gas', 0.83, 'available', 3, 98.00, NULL);
    `);

    // ---- cases (18 rows) ----
    log('  Seeding cases...');
    await client.query(`
      INSERT INTO cases (case_number, case_name, court, jurisdiction, case_type, client_id, status, filing_date, notes) VALUES
        ('2024-CV-01234', 'Henderson v. Memorial Hospital', 'Cook County Circuit Court', 'Illinois', 'Medical malpractice', 1, 'open', '2024-01-15', 'Surgical negligence claim'),
        ('2024-CV-02345', 'TechCorp Inc. v. InnovateSoft LLC', 'US District Court SDNY', 'New York', 'Intellectual property', 2, 'open', '2024-02-20', 'Patent infringement - software'),
        ('2024-CV-03456', 'Ramirez v. Pacific Gas & Electric', 'LA Superior Court', 'California', 'Environmental', 3, 'open', '2024-03-10', 'Toxic exposure class action'),
        ('2024-CV-04567', 'State v. Marcus Webb', 'Criminal Court of NY', 'New York', 'Criminal', 4, 'open', '2024-04-05', 'Securities fraud prosecution'),
        ('2024-CV-05678', 'Walker v. AutoMakers Inc.', 'US District Court ND Ohio', 'Ohio', 'Product liability', 5, 'open', '2024-05-12', 'Vehicle defect class action'),
        ('2024-CV-06789', 'Donovan v. National Insurance Co.', 'Cook County Circuit Court', 'Illinois', 'Insurance dispute', 6, 'discovery', '2024-06-01', 'Bad faith insurance denial'),
        ('2024-CV-07890', 'Chen v. GlobalBank Corp.', 'US District Court SDNY', 'New York', 'Securities', 7, 'open', '2024-03-22', 'Securities fraud class action'),
        ('2024-CV-08901', 'Phillips v. Mercy Health Systems', 'US District Court ED PA', 'Pennsylvania', 'Employment', 8, 'open', '2024-07-15', 'Wrongful termination ADA claim'),
        ('2024-CV-09012', 'Apex Energy v. GreenFuture LLC', 'Harris County District Court', 'Texas', 'Contract dispute', 13, 'open', '2024-08-01', 'Breach of supply agreement'),
        ('2024-CV-10123', 'Rodriguez v. City of Los Angeles', 'LA Superior Court', 'California', 'Civil rights', 9, 'open', '2024-04-18', 'Excessive force complaint'),
        ('2024-CV-11234', 'Blackstone Holdings v. Meridian Partners', 'US District Court SDNY', 'New York', 'Commercial', 10, 'open', '2024-09-05', 'Partnership dissolution dispute'),
        ('2024-CV-12345', 'Morrison v. BuildRight Construction', 'Cook County Circuit Court', 'Illinois', 'Construction', 11, 'discovery', '2024-05-30', 'Defective construction claim'),
        ('2024-CV-13456', 'United States v. Opioid Distributors', 'US District Court DDC', 'District of Columbia', 'Federal', 12, 'open', '2024-01-08', 'MDL opioid litigation'),
        ('2024-CV-14567', 'Thornton v. Big Pharma Inc.', 'US District Court SD TX', 'Texas', 'Product liability', 13, 'open', '2024-10-12', 'Pharmaceutical side effects'),
        ('2025-CV-00123', 'Estate of Williams v. Sunrise Care', 'Miami-Dade Circuit Court', 'Florida', 'Wrongful death', 15, 'open', '2025-01-10', 'Nursing home negligence'),
        ('2025-CV-00456', 'Sullivan & Co. v. Digital Platforms Inc.', 'US District Court SDNY', 'New York', 'Antitrust', 16, 'open', '2025-01-22', 'Anti-competitive practices'),
        ('2025-CV-00789', 'Patel v. Immigration Services', 'US Immigration Court', 'Virginia', 'Immigration', 17, 'open', '2025-02-05', 'Asylum proceedings'),
        ('2025-CV-01012', 'Harper v. Westfield Unified School Dist.', 'US District Court ND CA', 'California', 'Civil rights', 18, 'open', '2025-02-15', 'First Amendment claim');
    `);

    // ---- jobs (20 rows) ----
    log('  Seeding jobs...');
    await client.query(`
      INSERT INTO jobs (case_name, case_number, job_type, date_scheduled, time_scheduled, location, status, court_reporter_id, client_id, notes) VALUES
        ('Henderson v. Memorial Hospital', '2024-CV-01234', 'deposition', '2024-06-10', '09:00', 'Baker McKenzie, 300 E Randolph St, Chicago, IL', 'completed', 1, 1, 'Deposition of Dr. Alan Reed, treating physician'),
        ('TechCorp v. InnovateSoft', '2024-CV-02345', 'deposition', '2024-07-15', '10:00', 'Kirkland & Ellis, 601 Lexington Ave, New York', 'completed', 3, 2, 'Deposition of CTO Marcus Wells'),
        ('Ramirez v. Pacific Gas & Electric', '2024-CV-03456', 'hearing', '2024-08-20', '09:30', 'LA Superior Court, Dept 12', 'completed', 2, 3, 'Motion to certify class'),
        ('State v. Marcus Webb', '2024-CV-04567', 'trial', '2024-09-05', '09:00', 'Criminal Court of NY, Part 42', 'completed', 3, 4, 'Day 1 of trial proceedings'),
        ('State v. Marcus Webb', '2024-CV-04567', 'trial', '2024-09-06', '09:00', 'Criminal Court of NY, Part 42', 'completed', 3, 4, 'Day 2 of trial proceedings'),
        ('Walker v. AutoMakers', '2024-CV-05678', 'deposition', '2024-09-18', '10:00', 'Jones Day, 901 Lakeside Ave, Cleveland', 'completed', 4, 5, 'Deposition of lead engineer'),
        ('Donovan v. National Insurance', '2024-CV-06789', 'deposition', '2024-10-02', '09:00', 'Sidley Austin, 1 S Dearborn St, Chicago', 'completed', 1, 6, 'Claims adjuster deposition'),
        ('Chen v. GlobalBank', '2024-CV-07890', 'hearing', '2024-10-15', '14:00', 'US District Court SDNY, Courtroom 14B', 'completed', 3, 7, 'Preliminary injunction hearing'),
        ('Phillips v. Mercy Health', '2024-CV-08901', 'deposition', '2024-10-28', '09:30', 'Morgan Lewis, 1701 Market St, Philadelphia', 'completed', 14, 8, 'HR Director deposition'),
        ('Apex Energy v. GreenFuture', '2024-CV-09012', 'deposition', '2024-11-05', '10:00', 'Norton Rose Fulbright, 1301 McKinney St, Houston', 'completed', 4, 13, 'Expert witness deposition - geologist'),
        ('Rodriguez v. City of LA', '2024-CV-10123', 'hearing', '2024-11-15', '09:00', 'LA Superior Court, Dept 8', 'completed', 2, 9, 'Summary judgment motion'),
        ('Morrison v. BuildRight', '2024-CV-12345', 'deposition', '2024-12-03', '09:30', 'DLA Piper, 444 W Lake St, Chicago', 'completed', 13, 11, 'General contractor deposition'),
        ('US v. Opioid Distributors', '2024-CV-13456', 'hearing', '2024-12-18', '10:00', 'US District Court DDC, Courtroom 3', 'completed', 7, 12, 'MDL status conference'),
        ('Thornton v. Big Pharma', '2024-CV-14567', 'deposition', '2025-01-08', '09:00', 'Norton Rose Fulbright, Houston', 'completed', 4, 13, 'Plaintiff deposition'),
        ('Estate of Williams v. Sunrise', '2025-CV-00123', 'deposition', '2025-02-10', '10:00', 'Greenberg Traurig, 333 SE 2nd Ave, Miami', 'completed', 6, 15, 'Facility administrator deposition'),
        ('Sullivan v. Digital Platforms', '2025-CV-00456', 'hearing', '2025-02-25', '09:30', 'US District Court SDNY, Courtroom 21A', 'in_progress', 3, 16, 'Class certification hearing'),
        ('Patel v. Immigration Services', '2025-CV-00789', 'hearing', '2025-03-05', '08:30', 'US Immigration Court, Arlington, VA', 'scheduled', 7, 17, 'Asylum merit hearing'),
        ('Harper v. Westfield USD', '2025-CV-01012', 'deposition', '2025-03-18', '09:00', 'Paul Weiss, 1285 Avenue of the Americas, NY', 'scheduled', 5, 18, 'Superintendent deposition'),
        ('Henderson v. Memorial Hospital', '2024-CV-01234', 'deposition', '2025-03-25', '10:00', 'Baker McKenzie, Chicago', 'scheduled', 1, 1, 'Expert witness deposition - Dr. Li'),
        ('Blackstone v. Meridian', '2024-CV-11234', 'trial', '2025-04-07', '09:00', 'US District Court SDNY, Courtroom 9C', 'scheduled', 3, 10, 'Trial - Day 1');
    `);

    // ---- transcripts (18 rows, referencing valid IDs) ----
    log('  Seeding transcripts...');
    await client.query(`
      INSERT INTO transcripts (job_id, case_id, status, page_count, reporter_id, scopist_id, proofreader_id, due_date, completed_date, file_path) VALUES
        (1, 1, 'certified', 187, 1, 1, 1, '2024-06-24', '2024-06-20', '/transcripts/2024/henderson_v_memorial_dep_reed.pdf'),
        (2, 2, 'certified', 234, 3, 7, 3, '2024-07-29', '2024-07-26', '/transcripts/2024/techcorp_v_innovatesoft_dep_wells.pdf'),
        (3, 3, 'certified', 96, 2, 3, 2, '2024-09-03', '2024-08-30', '/transcripts/2024/ramirez_v_pge_hearing.pdf'),
        (4, 4, 'certified', 312, 3, 2, 1, '2024-09-12', '2024-09-10', '/transcripts/2024/state_v_webb_trial_day1.pdf'),
        (5, 4, 'certified', 298, 3, 2, 1, '2024-09-13', '2024-09-11', '/transcripts/2024/state_v_webb_trial_day2.pdf'),
        (6, 5, 'certified', 156, 4, 3, 4, '2024-10-02', '2024-09-28', '/transcripts/2024/walker_v_automakers_dep.pdf'),
        (7, 6, 'certified', 143, 1, 1, 1, '2024-10-16', '2024-10-14', '/transcripts/2024/donovan_v_national_ins_dep.pdf'),
        (8, 7, 'certified', 78, 3, 7, 3, '2024-10-22', '2024-10-20', '/transcripts/2024/chen_v_globalbank_hearing.pdf'),
        (9, 8, 'final', 198, 14, 14, 14, '2024-11-11', '2024-11-08', '/transcripts/2024/phillips_v_mercy_dep.pdf'),
        (10, 9, 'final', 165, 4, 16, 4, '2024-11-19', '2024-11-15', '/transcripts/2024/apex_v_greenfuture_dep.pdf'),
        (11, 10, 'certified', 88, 2, 3, 3, '2024-11-29', '2024-11-25', '/transcripts/2024/rodriguez_v_la_hearing.pdf'),
        (12, 12, 'edited', 172, 13, 11, 11, '2024-12-17', '2024-12-14', '/transcripts/2024/morrison_v_buildright_dep.pdf'),
        (13, 13, 'certified', 54, 7, 6, 7, '2025-01-02', '2024-12-28', '/transcripts/2024/us_v_opioid_hearing.pdf'),
        (14, 14, 'edited', 201, 4, 16, 16, '2025-01-22', NULL, '/transcripts/2025/thornton_v_bigpharma_dep.pdf'),
        (15, 15, 'rough', 178, 6, NULL, NULL, '2025-02-24', NULL, '/transcripts/2025/williams_v_sunrise_dep.pdf'),
        (16, 16, 'rough', NULL, 3, NULL, NULL, '2025-03-11', NULL, NULL),
        (1, 1, 'certified', 145, 1, 1, 1, '2024-07-08', '2024-07-05', '/transcripts/2024/henderson_v_memorial_dep_nurse.pdf'),
        (12, 12, 'rough', 168, 13, NULL, NULL, '2024-12-20', NULL, '/transcripts/2024/morrison_v_buildright_dep2.pdf');
    `);

    // ---- billing (18 rows) ----
    log('  Seeding billing...');
    await client.query(`
      INSERT INTO billing (client_id, job_id, transcript_id, page_rate, page_count, base_amount, rush_fee, expedite_fee, total_amount, status, due_date) VALUES
        (1, 1, 1, 6.50, 187, 1215.50, 0, 0, 1215.50, 'paid', '2024-07-20'),
        (2, 2, 2, 7.00, 234, 1638.00, 0, 0, 1638.00, 'paid', '2024-08-28'),
        (3, 3, 3, 6.50, 96, 624.00, 0, 0, 624.00, 'paid', '2024-10-03'),
        (4, 4, 4, 7.50, 312, 2340.00, 500.00, 0, 2840.00, 'paid', '2024-10-05'),
        (4, 5, 5, 7.50, 298, 2235.00, 500.00, 0, 2735.00, 'paid', '2024-10-06'),
        (5, 6, 6, 6.50, 156, 1014.00, 0, 0, 1014.00, 'paid', '2024-10-30'),
        (6, 7, 7, 6.50, 143, 929.50, 0, 0, 929.50, 'paid', '2024-11-16'),
        (7, 8, 8, 7.00, 78, 546.00, 200.00, 0, 746.00, 'paid', '2024-11-15'),
        (8, 9, 9, 6.50, 198, 1287.00, 0, 0, 1287.00, 'paid', '2024-12-11'),
        (13, 10, 10, 6.50, 165, 1072.50, 0, 0, 1072.50, 'paid', '2024-12-05'),
        (9, 11, 11, 7.00, 88, 616.00, 0, 0, 616.00, 'paid', '2024-12-29'),
        (11, 12, 12, 6.50, 172, 1118.00, 0, 150.00, 1268.00, 'sent', '2025-01-17'),
        (12, 13, 13, 7.00, 54, 378.00, 0, 0, 378.00, 'paid', '2025-02-01'),
        (13, 14, 14, 6.50, 201, 1306.50, 0, 0, 1306.50, 'pending', '2025-02-22'),
        (15, 15, 15, 6.50, 178, 1157.00, 300.00, 0, 1457.00, 'pending', '2025-03-10'),
        (16, 16, 16, 7.00, 0, 0, 0, 0, 0, 'pending', '2025-04-11'),
        (1, 19, 17, 6.50, 145, 942.50, 0, 0, 942.50, 'paid', '2024-08-08'),
        (10, 20, NULL, 7.50, 0, 0, 0, 0, 0, 'pending', '2025-05-07');
    `);

    // ---- deliveries (17 rows) ----
    log('  Seeding deliveries...');
    await client.query(`
      INSERT INTO deliveries (transcript_id, client_id, delivery_type, delivery_status, tracking_number, delivery_date, recipient_name, recipient_email, notes) VALUES
        (1, 1, 'electronic', 'delivered', NULL, '2024-06-21', 'Richard Hale', 'rhale@bakermckenzie.com', 'Emailed certified PDF'),
        (2, 2, 'both', 'delivered', '1Z999AA10123456784', '2024-07-27', 'Susan Pratt', 'spratt@kirkland.com', 'E-copy and bound original'),
        (3, 3, 'electronic', 'delivered', NULL, '2024-08-31', 'Daniel Cho', 'dcho@lw.com', 'Secure link delivery'),
        (4, 4, 'both', 'delivered', '1Z999AA10234567891', '2024-09-11', 'Catherine Byrd', 'cbyrd@skadden.com', 'Daily copy - rush delivery'),
        (5, 4, 'both', 'delivered', '1Z999AA10234567892', '2024-09-12', 'Catherine Byrd', 'cbyrd@skadden.com', 'Daily copy - rush delivery'),
        (6, 5, 'electronic', 'delivered', NULL, '2024-09-29', 'Michael Dunn', 'mdunn@jonesday.com', NULL),
        (7, 6, 'electronic', 'delivered', NULL, '2024-10-15', 'Laura Mendez', 'lmendez@sidley.com', NULL),
        (8, 7, 'electronic', 'delivered', NULL, '2024-10-21', 'Peter Huang', 'phuang@whitecase.com', 'Expedited electronic delivery'),
        (9, 8, 'paper', 'delivered', '1Z999AA10345678901', '2024-11-10', 'Janet Freeman', 'jfreeman@morganlewis.com', 'Original + 3 copies'),
        (10, 13, 'electronic', 'delivered', NULL, '2024-11-16', 'Kevin Marsh', 'kmarsh@nortonrosefulbright.com', NULL),
        (11, 9, 'electronic', 'delivered', NULL, '2024-11-26', 'Robert Steele', 'rsteele@gibsondunn.com', NULL),
        (12, 11, 'electronic', 'pending', NULL, NULL, 'Mark Swanson', 'mswanson@dlapiper.com', 'Awaiting final edits'),
        (13, 12, 'electronic', 'delivered', NULL, '2024-12-29', 'Sarah Quinn', 'squinn@hoganlovells.com', NULL),
        (14, 13, 'electronic', 'pending', NULL, NULL, 'Kevin Marsh', 'kmarsh@nortonrosefulbright.com', 'Transcript still in editing'),
        (15, 15, 'both', 'pending', NULL, NULL, 'Anthony Reeves', 'areeves@gtlaw.com', 'Will ship when certified'),
        (17, 1, 'electronic', 'delivered', NULL, '2024-07-06', 'Richard Hale', 'rhale@bakermckenzie.com', NULL),
        (1, 1, 'paper', 'delivered', '1Z999AA10456789012', '2024-06-25', 'Richard Hale', 'rhale@bakermckenzie.com', 'Certified hard copy for filing');
    `);

    // ---- exhibits (18 rows) ----
    log('  Seeding exhibits...');
    await client.query(`
      INSERT INTO exhibits (job_id, exhibit_number, description, exhibit_type, file_path, status, marked_by) VALUES
        (1, 'Exhibit A', 'Medical records - patient Henderson', 'Document', '/exhibits/2024/henderson_exA.pdf', 'admitted', 'Atty. Richard Hale'),
        (1, 'Exhibit B', 'Surgical consent form', 'Document', '/exhibits/2024/henderson_exB.pdf', 'admitted', 'Atty. Richard Hale'),
        (1, 'Exhibit C', 'Post-operative photographs', 'Photograph', '/exhibits/2024/henderson_exC.pdf', 'admitted', 'Atty. Richard Hale'),
        (2, 'Exhibit 1', 'Source code comparison report', 'Document', '/exhibits/2024/techcorp_ex1.pdf', 'admitted', 'Atty. Susan Pratt'),
        (2, 'Exhibit 2', 'Patent application US10234567', 'Document', '/exhibits/2024/techcorp_ex2.pdf', 'admitted', 'Atty. Susan Pratt'),
        (4, 'Peoples Exhibit 1', 'Bank transaction records', 'Document', '/exhibits/2024/webb_pex1.pdf', 'admitted', 'ADA Martha Brennan'),
        (4, 'Peoples Exhibit 2', 'Wire transfer confirmations', 'Document', '/exhibits/2024/webb_pex2.pdf', 'admitted', 'ADA Martha Brennan'),
        (4, 'Peoples Exhibit 3', 'Email correspondence', 'Document', '/exhibits/2024/webb_pex3.pdf', 'admitted', 'ADA Martha Brennan'),
        (4, 'Defense Exhibit A', 'Compliance training certificates', 'Document', '/exhibits/2024/webb_dexA.pdf', 'admitted', 'Atty. Catherine Byrd'),
        (6, 'Exhibit 1', 'Vehicle crash test data', 'Document', '/exhibits/2024/walker_ex1.pdf', 'admitted', 'Atty. Michael Dunn'),
        (6, 'Exhibit 2', 'Engineering design specifications', 'Document', '/exhibits/2024/walker_ex2.pdf', 'admitted', 'Atty. Michael Dunn'),
        (9, 'Exhibit A', 'Employment agreement', 'Document', '/exhibits/2024/phillips_exA.pdf', 'marked', 'Atty. Janet Freeman'),
        (9, 'Exhibit B', 'Performance review 2023', 'Document', '/exhibits/2024/phillips_exB.pdf', 'marked', 'Atty. Janet Freeman'),
        (9, 'Exhibit C', 'ADA accommodation request', 'Document', '/exhibits/2024/phillips_exC.pdf', 'marked', 'Atty. Janet Freeman'),
        (10, 'Exhibit 1', 'Supply agreement dated 2022-03-15', 'Document', '/exhibits/2024/apex_ex1.pdf', 'admitted', 'Atty. Kevin Marsh'),
        (12, 'Exhibit A', 'Construction contract', 'Document', '/exhibits/2024/morrison_exA.pdf', 'marked', 'Atty. Mark Swanson'),
        (12, 'Exhibit B', 'Building inspection report', 'Document', '/exhibits/2024/morrison_exB.pdf', 'marked', 'Atty. Mark Swanson'),
        (14, 'Exhibit 1', 'FDA adverse event report', 'Document', '/exhibits/2025/thornton_ex1.pdf', 'marked', 'Atty. Kevin Marsh');
    `);

    // ---- video_syncs (16 rows) ----
    log('  Seeding video_syncs...');
    await client.query(`
      INSERT INTO video_syncs (job_id, transcript_id, video_file, sync_status, start_timecode, end_timecode, duration, technician, notes) VALUES
        (1, 1, '/video/2024/henderson_dep_reed.mp4', 'completed', '00:00:00:00', '04:12:35:15', '04:12:35', 'Carlos Rivera', 'Four-camera setup'),
        (2, 2, '/video/2024/techcorp_dep_wells.mp4', 'completed', '00:00:00:00', '05:45:22:10', '05:45:22', 'Carlos Rivera', 'Remote deposition via Zoom'),
        (4, 4, '/video/2024/webb_trial_day1.mp4', 'completed', '00:00:00:00', '06:30:10:00', '06:30:10', 'Mike Chen', 'Courtroom fixed cameras'),
        (5, 5, '/video/2024/webb_trial_day2.mp4', 'completed', '00:00:00:00', '06:15:45:20', '06:15:45', 'Mike Chen', 'Courtroom fixed cameras'),
        (6, 6, '/video/2024/walker_dep_engineer.mp4', 'completed', '00:00:00:00', '03:28:17:05', '03:28:17', 'Sarah Johnson', NULL),
        (7, 7, '/video/2024/donovan_dep.mp4', 'completed', '00:00:00:00', '03:05:42:18', '03:05:42', 'Carlos Rivera', NULL),
        (8, 8, '/video/2024/chen_hearing.mp4', 'completed', '00:00:00:00', '01:45:30:00', '01:45:30', 'Mike Chen', 'Audio only backup also recorded'),
        (9, 9, '/video/2024/phillips_dep.mp4', 'completed', '00:00:00:00', '04:30:15:12', '04:30:15', 'Sarah Johnson', NULL),
        (10, 10, '/video/2024/apex_dep_geologist.mp4', 'completed', '00:00:00:00', '03:48:20:00', '03:48:20', 'Carlos Rivera', 'Exhibit display picture-in-picture'),
        (11, 11, '/video/2024/rodriguez_hearing.mp4', 'completed', '00:00:00:00', '02:10:05:15', '02:10:05', 'Mike Chen', NULL),
        (12, 12, '/video/2024/morrison_dep.mp4', 'syncing', '00:00:00:00', '03:55:40:00', '03:55:40', 'Sarah Johnson', 'Audio sync offset correction needed'),
        (13, 13, '/video/2024/opioid_hearing.mp4', 'completed', '00:00:00:00', '01:15:22:08', '01:15:22', 'Mike Chen', NULL),
        (14, 14, '/video/2025/thornton_dep.mp4', 'syncing', '00:00:00:00', '04:42:18:20', '04:42:18', 'Carlos Rivera', 'Pending transcript edit completion'),
        (15, 15, '/video/2025/williams_dep.mp4', 'pending', '00:00:00:00', '04:05:30:00', '04:05:30', 'Sarah Johnson', 'Awaiting rough transcript'),
        (1, 17, '/video/2024/henderson_dep_nurse.mp4', 'completed', '00:00:00:00', '03:15:10:05', '03:15:10', 'Carlos Rivera', NULL),
        (3, 3, '/video/2024/ramirez_hearing.mp4', 'completed', '00:00:00:00', '02:22:45:10', '02:22:45', 'Mike Chen', 'Courtroom recording');
    `);

    // ---- realtime_connections (16 rows) ----
    log('  Seeding realtime_connections...');
    await client.query(`
      INSERT INTO realtime_connections (job_id, reporter_id, connection_type, ip_address, port, status, client_name, software, notes) VALUES
        (4, 3, 'internet', '192.168.1.100', 3000, 'inactive', 'Skadden Arps - Catherine Byrd', 'LiveNote', 'Day 1 trial realtime feed'),
        (5, 3, 'internet', '192.168.1.100', 3000, 'inactive', 'Skadden Arps - Catherine Byrd', 'LiveNote', 'Day 2 trial realtime feed'),
        (8, 3, 'internet', '10.0.0.50', 3001, 'inactive', 'White & Case - Peter Huang', 'CaseViewNet', 'Hearing realtime'),
        (3, 2, 'direct', '10.0.0.25', 2500, 'inactive', 'Latham & Watkins - Daniel Cho', 'Bridge Mobile', 'Direct courtroom connection'),
        (11, 2, 'internet', '172.16.0.10', 3000, 'inactive', 'Gibson Dunn - Robert Steele', 'LiveNote', NULL),
        (13, 7, 'internet', '192.168.2.50', 3000, 'inactive', 'Hogan Lovells - Sarah Quinn', 'CaseViewNet', 'MDL proceedings'),
        (16, 3, 'internet', '10.0.1.100', 3000, 'active', 'Sullivan & Cromwell - Elizabeth Doyle', 'LiveNote', 'Class cert hearing in progress'),
        (17, 7, 'internet', '172.16.1.25', 3001, 'standby', 'Covington - Howard Pham', 'CaseViewNet', 'Scheduled for March 5'),
        (20, 3, 'internet', '10.0.2.50', 3000, 'standby', 'Weil Gotshal - Emily Chang', 'LiveNote', 'Trial scheduled April'),
        (1, 1, 'direct', '10.0.0.15', 2500, 'inactive', 'Baker McKenzie - Richard Hale', 'StenoConnect', 'Deposition realtime feed'),
        (2, 3, 'internet', '192.168.1.105', 3000, 'inactive', 'Kirkland & Ellis - Susan Pratt', 'LiveNote', 'Remote deposition'),
        (7, 1, 'direct', '10.0.0.20', 2500, 'inactive', 'Sidley Austin - Laura Mendez', 'StenoConnect', NULL),
        (9, 14, 'internet', '172.16.0.30', 3000, 'inactive', 'Morgan Lewis - Janet Freeman', 'CaseViewNet', NULL),
        (10, 4, 'internet', '192.168.3.10', 3001, 'inactive', 'Norton Rose - Kevin Marsh', 'Bridge Mobile', NULL),
        (14, 4, 'internet', '192.168.3.15', 3001, 'inactive', 'Norton Rose - Kevin Marsh', 'Bridge Mobile', 'Expert witness deposition'),
        (15, 6, 'internet', '10.0.3.50', 3000, 'inactive', 'Greenberg Traurig - Anthony Reeves', 'LiveNote', NULL);
    `);

    // ---- equipment (18 rows) ----
    log('  Seeding equipment...');
    await client.query(`
      INSERT INTO equipment (equipment_type, brand, model, serial_number, assigned_to, status, purchase_date, last_maintenance, notes) VALUES
        ('stenograph', 'Stenograph', 'Luminex II', 'LUM2-20220145', 1, 'in_use', '2022-01-15', '2024-10-01', 'Primary writer for S. Williams'),
        ('stenograph', 'Stenograph', 'Luminex II', 'LUM2-20220287', 3, 'in_use', '2022-02-20', '2024-09-15', 'Primary writer for L. Martinez'),
        ('stenograph', 'Stenograph', 'Mira A3', 'MIRA-20230512', 2, 'in_use', '2023-05-10', '2024-11-20', 'Primary writer for D. Garcia'),
        ('stenograph', 'Stenograph', 'Luminex II', 'LUM2-20210098', 4, 'in_use', '2021-06-01', '2024-08-12', 'Primary writer for R. Johnson'),
        ('stenograph', 'Stenograph', 'Mira A3', 'MIRA-20240102', 5, 'in_use', '2024-01-05', '2024-12-01', 'Primary writer for K. Lee'),
        ('stenograph', 'Stenograph', 'Wave', 'WAVE-20200334', NULL, 'available', '2020-03-15', '2024-06-15', 'Backup steno machine'),
        ('stenograph', 'ProCAT', 'Flash', 'PCF-20190567', 6, 'in_use', '2019-08-20', '2024-07-20', 'Primary writer for M. Brown'),
        ('stenograph', 'Stenograph', 'Luminex II', 'LUM2-20230890', 7, 'in_use', '2023-09-01', '2024-11-05', 'Primary writer for H. Adams'),
        ('audio', 'Marantz', 'PMD661 MKIII', 'MAR-20230156', 1, 'in_use', '2023-03-10', '2024-09-30', 'Backup audio recorder'),
        ('audio', 'Marantz', 'PMD661 MKIII', 'MAR-20230157', 3, 'in_use', '2023-03-10', '2024-09-30', 'Backup audio recorder'),
        ('audio', 'Zoom', 'H6 Black', 'ZH6-20240023', NULL, 'available', '2024-02-01', NULL, 'Six-track portable recorder'),
        ('video', 'Sony', 'PXW-Z90V', 'SNY-20220478', NULL, 'available', '2022-04-15', '2024-10-15', 'Primary video camera'),
        ('video', 'Sony', 'PXW-Z90V', 'SNY-20220479', NULL, 'in_use', '2022-04-15', '2024-10-15', 'Secondary video camera'),
        ('video', 'Canon', 'XA55', 'CAN-20230234', NULL, 'available', '2023-06-20', '2024-08-20', 'Portable video unit'),
        ('audio', 'Jabra', 'PanaCast 50', 'JAB-20240089', NULL, 'available', '2024-06-01', NULL, 'Conference room mic/camera'),
        ('stenograph', 'Stenograph', 'Luminex II', 'LUM2-20180045', NULL, 'retired', '2018-01-20', '2023-12-01', 'Retired - donated to school'),
        ('stenograph', 'Stenograph', 'Mira A3', 'MIRA-20240356', 13, 'in_use', '2024-04-15', '2024-12-10', 'Primary writer for D. Morales'),
        ('audio', 'Marantz', 'PMD661 MKIII', 'MAR-20240201', 14, 'in_use', '2024-02-01', NULL, 'Assigned to P. Wagner');
    `);

    // ---- certifications (18 rows) ----
    log('  Seeding certifications...');
    await client.query(`
      INSERT INTO certifications (reporter_id, certification_type, issue_date, expiry_date, ce_credits_required, ce_credits_completed, status, issuing_body, notes) VALUES
        (1, 'RPR', '2014-06-15', '2025-06-15', 30, 30, 'active', 'NCRA', NULL),
        (2, 'RMR', '2010-03-20', '2025-03-20', 30, 28, 'active', 'NCRA', 'Renewal pending'),
        (3, 'CRR', '2008-09-10', '2025-09-10', 30, 30, 'active', 'NCRA', NULL),
        (3, 'RMR', '2005-05-15', '2025-05-15', 30, 30, 'active', 'NCRA', NULL),
        (4, 'RPR', '2018-02-28', '2025-02-28', 30, 24, 'active', 'NCRA', 'Needs 6 CE credits'),
        (5, 'RMR', '2012-07-12', '2025-07-12', 30, 30, 'active', 'NCRA', NULL),
        (6, 'RPR', '2016-11-05', '2025-11-05', 30, 18, 'active', 'NCRA', NULL),
        (7, 'CRR', '2004-04-22', '2025-04-22', 30, 30, 'active', 'NCRA', 'Longest-tenured reporter'),
        (7, 'CLVS', '2010-08-15', '2025-08-15', 20, 20, 'active', 'NCRA', 'Legal video specialist'),
        (9, 'RMR', '2013-01-10', '2025-01-10', 30, 30, 'active', 'NCRA', NULL),
        (10, 'RPR', '2015-10-20', '2025-10-20', 30, 22, 'active', 'NCRA', NULL),
        (11, 'CRR', '2007-06-30', '2025-06-30', 30, 30, 'active', 'NCRA', NULL),
        (13, 'RMR', '2011-12-15', '2025-12-15', 30, 30, 'active', 'NCRA', NULL),
        (14, 'RPR', '2017-08-22', '2025-08-22', 30, 15, 'active', 'NCRA', 'Behind on CE credits'),
        (15, 'CRR', '2009-03-18', '2025-03-18', 30, 30, 'active', 'NCRA', NULL),
        (15, 'CLVS', '2012-11-01', '2025-11-01', 20, 20, 'active', 'NCRA', NULL),
        (8, 'RPR', '2020-05-10', '2025-05-10', 30, 12, 'active', 'NCRA', 'Newer reporter'),
        (16, 'RPR', '2019-09-15', '2025-09-15', 30, 20, 'active', 'NCRA', NULL);
    `);

    // ---- courts (18 rows) ----
    log('  Seeding courts...');
    await client.query(`
      INSERT INTO courts (court_name, court_type, address, city, state, zip, phone, clerk_name, clerk_phone, department, notes) VALUES
        ('Cook County Circuit Court', 'State - Circuit', '50 W Washington St', 'Chicago', 'IL', '60602', '(312) 603-5000', 'Iris Martinez', '(312) 603-5030', 'Law Division', 'Primary Cook County venue'),
        ('US District Court Northern District of Illinois', 'Federal - District', '219 S Dearborn St', 'Chicago', 'IL', '60604', '(312) 435-5684', 'Thomas Bruton', '(312) 435-5670', NULL, 'Dirksen Federal Building'),
        ('US District Court Southern District of New York', 'Federal - District', '500 Pearl St', 'New York', 'NY', '10007', '(212) 805-0136', 'Ruby Krajick', '(212) 805-0140', NULL, 'Daniel Patrick Moynihan Courthouse'),
        ('Los Angeles Superior Court', 'State - Superior', '111 N Hill St', 'Los Angeles', 'CA', '90012', '(213) 830-0803', 'David Yamasaki', '(213) 830-0810', 'Civil Division', 'Stanley Mosk Courthouse'),
        ('Criminal Court of the City of New York', 'State - Criminal', '100 Centre St', 'New York', 'NY', '10013', '(646) 386-4000', 'Justin Barry', '(646) 386-4010', NULL, NULL),
        ('Harris County District Court', 'State - District', '201 Caroline St', 'Houston', 'TX', '77002', '(713) 755-6700', 'Marilyn Burgess', '(713) 755-6710', 'Civil Courts', NULL),
        ('US District Court Eastern District of Pennsylvania', 'Federal - District', '601 Market St', 'Philadelphia', 'PA', '19106', '(267) 299-7000', 'Kate Barkman', '(267) 299-7010', NULL, 'James A. Byrne Courthouse'),
        ('US District Court District of Columbia', 'Federal - District', '333 Constitution Ave NW', 'Washington', 'DC', '20001', '(202) 354-3000', 'Angela Caesar', '(202) 354-3010', NULL, 'E. Barrett Prettyman Courthouse'),
        ('Miami-Dade Circuit Court', 'State - Circuit', '73 W Flagler St', 'Miami', 'FL', '33130', '(305) 349-7001', 'Harvey Ruvin', '(305) 349-7010', 'Civil Division', NULL),
        ('US District Court Northern District of California', 'Federal - District', '450 Golden Gate Ave', 'San Francisco', 'CA', '94102', '(415) 522-2000', 'Susan Soong', '(415) 522-2010', NULL, NULL),
        ('US District Court Southern District of Texas', 'Federal - District', '515 Rusk Ave', 'Houston', 'TX', '77002', '(713) 250-5500', 'Nathan Ochsner', '(713) 250-5510', NULL, NULL),
        ('Maricopa County Superior Court', 'State - Superior', '201 W Jefferson St', 'Phoenix', 'AZ', '85003', '(602) 506-3204', 'Jeff Fine', '(602) 506-3210', 'Civil Division', NULL),
        ('US Immigration Court - Arlington', 'Federal - Immigration', '1901 S Bell St', 'Arlington', 'VA', '22202', '(703) 756-8700', 'Margaret Philbin', '(703) 756-8710', NULL, 'EOIR Court'),
        ('Fulton County Superior Court', 'State - Superior', '136 Pryor St SW', 'Atlanta', 'GA', '30303', '(404) 612-4500', 'Cathelene Robinson', '(404) 612-4510', 'Civil Division', NULL),
        ('Denver District Court', 'State - District', '1437 Bannock St', 'Denver', 'CO', '80202', '(720) 865-8301', 'Steven Vasconcellos', '(720) 865-8310', NULL, 'Lindsey-Flanigan Courthouse'),
        ('King County Superior Court', 'State - Superior', '516 3rd Ave', 'Seattle', 'WA', '98104', '(206) 477-1400', 'Barbara Miner', '(206) 477-1410', 'Civil Division', NULL),
        ('US District Court District of Massachusetts', 'Federal - District', '1 Courthouse Way', 'Boston', 'MA', '02210', '(617) 748-9152', 'Robert Farrell', '(617) 748-9160', NULL, 'John Joseph Moakley Courthouse'),
        ('Dallas County District Court', 'State - District', '600 Commerce St', 'Dallas', 'TX', '75202', '(214) 653-7301', 'Felicia Pitre', '(214) 653-7310', 'Civil Division', NULL);
    `);

    // ---- contacts (18 rows) ----
    log('  Seeding contacts...');
    await client.query(`
      INSERT INTO contacts (name, contact_type, firm, email, phone, address, bar_number, specialty, notes) VALUES
        ('Richard Hale', 'attorney', 'Baker McKenzie LLP', 'rhale@bakermckenzie.com', '(312) 555-0101', '300 E Randolph St, Chicago, IL 60601', 'IL-6234567', 'Medical malpractice', 'Lead counsel Henderson case'),
        ('Susan Pratt', 'attorney', 'Kirkland & Ellis LLP', 'spratt@kirkland.com', '(312) 555-0202', '601 Lexington Ave, New York, NY 10022', 'NY-4567890', 'Intellectual property', NULL),
        ('Catherine Byrd', 'attorney', 'Skadden Arps', 'cbyrd@skadden.com', '(212) 555-0404', '4 Times Square, New York, NY 10036', 'NY-5678901', 'White collar defense', 'Defense counsel Webb trial'),
        ('Martha Brennan', 'attorney', 'Manhattan DA Office', 'mbrennan@manhattanda.gov', '(212) 555-5001', '1 Hogan Place, New York, NY 10013', 'NY-3456789', 'Prosecution', 'ADA on Webb case'),
        ('Dr. Alan Reed', 'witness', 'Memorial Hospital', 'areed@memhosp.com', '(312) 555-6001', '2300 N Children Plaza, Chicago, IL 60614', NULL, 'Orthopedic surgery', 'Treating physician Henderson case'),
        ('Dr. Samantha Li', 'expert', 'Northwestern Medical', 'sli@northwestern.edu', '(312) 555-6002', '251 E Huron St, Chicago, IL 60611', NULL, 'Medical expert', 'Expert witness Henderson case'),
        ('Michael Dunn', 'attorney', 'Jones Day', 'mdunn@jonesday.com', '(216) 555-0505', '901 Lakeside Ave, Cleveland, OH 44114', 'OH-7890123', 'Product liability', NULL),
        ('Laura Mendez', 'attorney', 'Sidley Austin LLP', 'lmendez@sidley.com', '(312) 555-0606', '1 S Dearborn St, Chicago, IL 60603', 'IL-8901234', 'Insurance defense', NULL),
        ('Peter Huang', 'attorney', 'White & Case LLP', 'phuang@whitecase.com', '(212) 555-0707', '1221 Avenue of the Americas, NY 10020', 'NY-9012345', 'Securities litigation', NULL),
        ('Janet Freeman', 'attorney', 'Morgan Lewis', 'jfreeman@morganlewis.com', '(215) 555-0808', '1701 Market St, Philadelphia, PA 19103', 'PA-0123456', 'Employment law', NULL),
        ('Kevin Marsh', 'attorney', 'Norton Rose Fulbright', 'kmarsh@nortonrosefulbright.com', '(713) 555-1313', '1301 McKinney St, Houston, TX 77010', 'TX-1234567', 'Energy litigation', NULL),
        ('Sarah Quinn', 'attorney', 'Hogan Lovells', 'squinn@hoganlovells.com', '(202) 555-1212', '555 13th St NW, Washington, DC 20004', 'DC-2345678', 'Federal litigation', NULL),
        ('Mark Thompson', 'paralegal', 'Baker McKenzie LLP', 'mthompson@bakermckenzie.com', '(312) 555-0103', '300 E Randolph St, Chicago, IL 60601', NULL, 'Litigation support', 'Coordinates scheduling'),
        ('Dr. James Crawford', 'expert', 'Independent Consultant', 'jcrawford@engexpert.com', '(214) 555-7001', '2000 McKinney Ave, Dallas, TX 75201', NULL, 'Automotive engineering', 'Expert witness Walker v. AutoMakers'),
        ('Rachel Simmons', 'paralegal', 'Kirkland & Ellis LLP', 'rsimmons@kirkland.com', '(312) 555-0205', '601 Lexington Ave, New York, NY 10022', NULL, 'IP litigation support', NULL),
        ('Anthony Reeves', 'attorney', 'Greenberg Traurig LLP', 'areeves@gtlaw.com', '(305) 555-1515', '333 SE 2nd Ave, Miami, FL 33131', 'FL-3456789', 'Personal injury', NULL),
        ('Elizabeth Doyle', 'attorney', 'Sullivan & Cromwell', 'edoyle@sullcrom.com', '(212) 555-1616', '125 Broad St, New York, NY 10004', 'NY-4567012', 'Antitrust', NULL),
        ('Howard Pham', 'attorney', 'Covington & Burling', 'hpham@cov.com', '(202) 555-1717', '850 10th St NW, Washington, DC 20001', 'DC-5678123', 'Immigration law', NULL);
    `);

    // ---- invoices (18 rows) ----
    log('  Seeding invoices...');
    await client.query(`
      INSERT INTO invoices (invoice_number, client_id, billing_id, amount, tax, total, status, issue_date, due_date, paid_date, narrative) VALUES
        ('INV-2024-0001', 1, 1, 1215.50, 0, 1215.50, 'paid', '2024-06-22', '2024-07-22', '2024-07-15', 'Deposition of Dr. Alan Reed - Henderson v. Memorial Hospital'),
        ('INV-2024-0002', 2, 2, 1638.00, 0, 1638.00, 'paid', '2024-07-28', '2024-08-28', '2024-08-20', 'Deposition of Marcus Wells - TechCorp v. InnovateSoft'),
        ('INV-2024-0003', 3, 3, 624.00, 0, 624.00, 'paid', '2024-09-02', '2024-10-02', '2024-09-28', 'Class certification hearing - Ramirez v. PG&E'),
        ('INV-2024-0004', 4, 4, 2840.00, 0, 2840.00, 'paid', '2024-09-12', '2024-10-12', '2024-10-05', 'Trial Day 1 with realtime - State v. Webb'),
        ('INV-2024-0005', 4, 5, 2735.00, 0, 2735.00, 'paid', '2024-09-13', '2024-10-13', '2024-10-05', 'Trial Day 2 with realtime - State v. Webb'),
        ('INV-2024-0006', 5, 6, 1014.00, 0, 1014.00, 'paid', '2024-10-01', '2024-10-31', '2024-10-25', 'Deposition of lead engineer - Walker v. AutoMakers'),
        ('INV-2024-0007', 6, 7, 929.50, 0, 929.50, 'paid', '2024-10-16', '2024-11-16', '2024-11-10', 'Claims adjuster deposition - Donovan v. National Insurance'),
        ('INV-2024-0008', 7, 8, 746.00, 0, 746.00, 'paid', '2024-10-22', '2024-11-22', '2024-11-18', 'Preliminary injunction hearing with rush - Chen v. GlobalBank'),
        ('INV-2024-0009', 8, 9, 1287.00, 0, 1287.00, 'paid', '2024-11-10', '2024-12-10', '2024-12-08', 'HR Director deposition - Phillips v. Mercy Health'),
        ('INV-2024-0010', 13, 10, 1072.50, 0, 1072.50, 'paid', '2024-11-18', '2024-12-18', '2024-12-12', 'Expert witness deposition - Apex Energy v. GreenFuture'),
        ('INV-2024-0011', 9, 11, 616.00, 0, 616.00, 'paid', '2024-11-27', '2024-12-27', '2024-12-20', 'Summary judgment hearing - Rodriguez v. City of LA'),
        ('INV-2024-0012', 11, 12, 1268.00, 0, 1268.00, 'sent', '2025-01-02', '2025-02-01', NULL, 'General contractor deposition with expedite - Morrison v. BuildRight'),
        ('INV-2024-0013', 12, 13, 378.00, 0, 378.00, 'paid', '2024-12-30', '2025-01-30', '2025-01-22', 'MDL status conference - US v. Opioid Distributors'),
        ('INV-2025-0001', 13, 14, 1306.50, 0, 1306.50, 'sent', '2025-01-24', '2025-02-24', NULL, 'Plaintiff deposition - Thornton v. Big Pharma'),
        ('INV-2025-0002', 15, 15, 1457.00, 0, 1457.00, 'sent', '2025-02-12', '2025-03-14', NULL, 'Facility administrator deposition with rush - Estate of Williams'),
        ('INV-2025-0003', 1, 17, 942.50, 0, 942.50, 'paid', '2024-07-08', '2024-08-08', '2024-08-01', 'Nurse deposition - Henderson v. Memorial Hospital'),
        ('INV-2025-0004', 16, 16, 0, 0, 0, 'draft', '2025-03-01', '2025-04-01', NULL, 'Class certification hearing - Sullivan v. Digital Platforms (pending)'),
        ('INV-2025-0005', 10, 18, 0, 0, 0, 'draft', '2025-03-15', '2025-04-15', NULL, 'Trial - Blackstone v. Meridian Partners (scheduled)');
    `);

    // ---- payments (16 rows) ----
    log('  Seeding payments...');
    await client.query(`
      INSERT INTO payments (invoice_id, client_id, amount, payment_method, payment_date, reference_number, status, notes) VALUES
        (1, 1, 1215.50, 'ACH', '2024-07-15', 'ACH-BM-20240715-001', 'completed', NULL),
        (2, 2, 1638.00, 'Wire', '2024-08-20', 'WIR-KE-20240820-001', 'completed', NULL),
        (3, 3, 624.00, 'Check', '2024-09-28', 'CHK-LW-78542', 'completed', 'Check #78542'),
        (4, 4, 2840.00, 'ACH', '2024-10-05', 'ACH-SA-20241005-001', 'completed', NULL),
        (5, 4, 2735.00, 'ACH', '2024-10-05', 'ACH-SA-20241005-002', 'completed', 'Paid same day as Day 1 invoice'),
        (6, 5, 1014.00, 'Wire', '2024-10-25', 'WIR-JD-20241025-001', 'completed', NULL),
        (7, 6, 929.50, 'ACH', '2024-11-10', 'ACH-SAU-20241110-001', 'completed', NULL),
        (8, 7, 746.00, 'ACH', '2024-11-18', 'ACH-WC-20241118-001', 'completed', NULL),
        (9, 8, 1287.00, 'Check', '2024-12-08', 'CHK-ML-45230', 'completed', 'Check #45230'),
        (10, 13, 1072.50, 'ACH', '2024-12-12', 'ACH-NRF-20241212-001', 'completed', NULL),
        (11, 9, 616.00, 'Wire', '2024-12-20', 'WIR-GD-20241220-001', 'completed', NULL),
        (13, 12, 378.00, 'ACH', '2025-01-22', 'ACH-HL-20250122-001', 'completed', NULL),
        (16, 1, 942.50, 'ACH', '2024-08-01', 'ACH-BM-20240801-001', 'completed', NULL),
        (1, 1, 0, 'Credit', '2024-07-15', 'CR-BM-20240715-001', 'completed', 'Volume discount applied'),
        (14, 13, 650.00, 'ACH', '2025-02-15', 'ACH-NRF-20250215-001', 'completed', 'Partial payment'),
        (15, 15, 500.00, 'Check', '2025-03-01', 'CHK-GT-12890', 'completed', 'Partial payment - Check #12890');
    `);

    // ---- transcript_archive (16 rows) ----
    log('  Seeding transcript_archive...');
    await client.query(`
      INSERT INTO transcript_archive (transcript_id, case_number, case_name, archived_date, storage_location, retention_until, access_level, file_size, checksum) VALUES
        (1, '2024-CV-01234', 'Henderson v. Memorial Hospital', '2024-07-01', 's3://court-transcripts/2024/henderson_dep_reed/', '2034-07-01', 'standard', 4521984, 'sha256:a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4'),
        (2, '2024-CV-02345', 'TechCorp Inc. v. InnovateSoft LLC', '2024-08-01', 's3://court-transcripts/2024/techcorp_dep_wells/', '2034-08-01', 'standard', 5832640, 'sha256:b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5'),
        (3, '2024-CV-03456', 'Ramirez v. Pacific Gas & Electric', '2024-09-15', 's3://court-transcripts/2024/ramirez_hearing/', '2034-09-15', 'standard', 2457600, 'sha256:c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6'),
        (4, '2024-CV-04567', 'State v. Marcus Webb', '2024-10-01', 's3://court-transcripts/2024/webb_trial_day1/', '2044-10-01', 'restricted', 7864320, 'sha256:d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1'),
        (5, '2024-CV-04567', 'State v. Marcus Webb', '2024-10-01', 's3://court-transcripts/2024/webb_trial_day2/', '2044-10-01', 'restricted', 7503872, 'sha256:e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2'),
        (6, '2024-CV-05678', 'Walker v. AutoMakers Inc.', '2024-10-15', 's3://court-transcripts/2024/walker_dep/', '2034-10-15', 'standard', 3932160, 'sha256:f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3'),
        (7, '2024-CV-06789', 'Donovan v. National Insurance Co.', '2024-11-01', 's3://court-transcripts/2024/donovan_dep/', '2034-11-01', 'standard', 3604480, 'sha256:a7b8c9d0e1f2a7b8c9d0e1f2a7b8c9d0'),
        (8, '2024-CV-07890', 'Chen v. GlobalBank Corp.', '2024-11-01', 's3://court-transcripts/2024/chen_hearing/', '2034-11-01', 'standard', 1966080, 'sha256:b8c9d0e1f2a7b8c9d0e1f2a7b8c9d0e1'),
        (11, '2024-CV-10123', 'Rodriguez v. City of Los Angeles', '2024-12-05', 's3://court-transcripts/2024/rodriguez_hearing/', '2034-12-05', 'standard', 2211840, 'sha256:c9d0e1f2a7b8c9d0e1f2a7b8c9d0e1f2'),
        (13, '2024-CV-13456', 'United States v. Opioid Distributors', '2025-01-10', 's3://court-transcripts/2024/opioid_hearing/', '2045-01-10', 'restricted', 1392640, 'sha256:d0e1f2a7b8c9d0e1f2a7b8c9d0e1f2a7'),
        (17, '2024-CV-01234', 'Henderson v. Memorial Hospital', '2024-07-15', 's3://court-transcripts/2024/henderson_dep_nurse/', '2034-07-15', 'standard', 3653632, 'sha256:e1f2a7b8c9d0e1f2a7b8c9d0e1f2a7b8'),
        (9, '2024-CV-08901', 'Phillips v. Mercy Health Systems', '2024-12-01', 's3://court-transcripts/2024/phillips_dep/', '2034-12-01', 'standard', 4980736, 'sha256:f2a7b8c9d0e1f2a7b8c9d0e1f2a7b8c9'),
        (10, '2024-CV-09012', 'Apex Energy v. GreenFuture LLC', '2024-12-01', 's3://court-transcripts/2024/apex_dep/', '2034-12-01', 'standard', 4161536, 'sha256:a3b4c5d6e7f8a3b4c5d6e7f8a3b4c5d6'),
        (1, '2024-CV-01234', 'Henderson v. Memorial Hospital', '2024-07-01', 's3://court-transcripts/backup/henderson_dep_reed/', '2034-07-01', 'backup', 4521984, 'sha256:a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4'),
        (4, '2024-CV-04567', 'State v. Marcus Webb', '2024-10-01', 's3://court-transcripts/backup/webb_trial_day1/', '2044-10-01', 'backup', 7864320, 'sha256:d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1'),
        (5, '2024-CV-04567', 'State v. Marcus Webb', '2024-10-01', 's3://court-transcripts/backup/webb_trial_day2/', '2044-10-01', 'backup', 7503872, 'sha256:e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2');
    `);

    // ---- travel_expenses (18 rows) ----
    log('  Seeding travel_expenses...');
    await client.query(`
      INSERT INTO travel_expenses (job_id, reporter_id, expense_type, amount, date_incurred, description, receipt_path, status) VALUES
        (1, 1, 'mileage', 32.50, '2024-06-10', 'Round trip to Baker McKenzie office - 50 miles @ $0.65/mi', '/receipts/2024/mileage_0610_swilliams.pdf', 'reimbursed'),
        (2, 3, 'airfare', 385.00, '2024-07-14', 'JFK to Chicago round trip - TechCorp deposition', '/receipts/2024/air_0714_lmartinez.pdf', 'reimbursed'),
        (2, 3, 'hotel', 249.00, '2024-07-14', 'Hilton Chicago overnight stay', '/receipts/2024/hotel_0714_lmartinez.pdf', 'reimbursed'),
        (4, 3, 'mileage', 18.20, '2024-09-05', 'Round trip to Criminal Court NYC - 28 miles', '/receipts/2024/mileage_0905_lmartinez.pdf', 'reimbursed'),
        (5, 3, 'mileage', 18.20, '2024-09-06', 'Round trip to Criminal Court NYC - 28 miles', '/receipts/2024/mileage_0906_lmartinez.pdf', 'reimbursed'),
        (5, 3, 'meals', 42.75, '2024-09-06', 'Working lunch during trial Day 2', '/receipts/2024/meals_0906_lmartinez.pdf', 'reimbursed'),
        (6, 4, 'mileage', 45.50, '2024-09-18', 'Round trip to Jones Day Cleveland - 70 miles', '/receipts/2024/mileage_0918_rjohnson.pdf', 'reimbursed'),
        (9, 14, 'airfare', 310.00, '2024-10-27', 'Houston to Philadelphia round trip', '/receipts/2024/air_1027_pwagner.pdf', 'reimbursed'),
        (9, 14, 'hotel', 189.00, '2024-10-27', 'Marriott Philadelphia downtown', '/receipts/2024/hotel_1027_pwagner.pdf', 'reimbursed'),
        (10, 4, 'mileage', 22.75, '2024-11-05', 'Round trip to Norton Rose Fulbright Houston - 35 miles', '/receipts/2024/mileage_1105_rjohnson.pdf', 'reimbursed'),
        (10, 4, 'parking', 28.00, '2024-11-05', 'Parking garage at 1301 McKinney St', '/receipts/2024/parking_1105_rjohnson.pdf', 'reimbursed'),
        (13, 7, 'mileage', 24.70, '2024-12-18', 'Round trip to DDC courthouse - 38 miles', '/receipts/2024/mileage_1218_hadams.pdf', 'reimbursed'),
        (14, 4, 'mileage', 19.50, '2025-01-08', 'Round trip to Norton Rose Fulbright - 30 miles', '/receipts/2025/mileage_0108_rjohnson.pdf', 'approved'),
        (15, 6, 'airfare', 275.00, '2025-02-09', 'Chicago to Miami round trip', '/receipts/2025/air_0209_mbrown.pdf', 'approved'),
        (15, 6, 'hotel', 219.00, '2025-02-09', 'Courtyard by Marriott Miami Downtown', '/receipts/2025/hotel_0209_mbrown.pdf', 'approved'),
        (15, 6, 'meals', 38.50, '2025-02-10', 'Working lunch during deposition', '/receipts/2025/meals_0210_mbrown.pdf', 'pending'),
        (17, 7, 'mileage', 15.60, '2025-03-05', 'Round trip to Arlington Immigration Court - 24 miles', NULL, 'pending'),
        (18, 5, 'airfare', 425.00, '2025-03-17', 'SFO to JFK round trip - Harper deposition', NULL, 'pending');
    `);

    // ---- rush_fees (16 rows) ----
    log('  Seeding rush_fees...');
    await client.query(`
      INSERT INTO rush_fees (job_id, transcript_id, fee_type, multiplier, base_amount, fee_amount, requested_by, approved_by, status) VALUES
        (4, 4, 'daily_copy', 1.50, 2340.00, 500.00, 'Catherine Byrd - Skadden Arps', 'Margaret Sullivan', 'approved'),
        (5, 5, 'daily_copy', 1.50, 2235.00, 500.00, 'Catherine Byrd - Skadden Arps', 'Margaret Sullivan', 'approved'),
        (4, 4, 'realtime', 2.00, 2340.00, 750.00, 'Catherine Byrd - Skadden Arps', 'Margaret Sullivan', 'approved'),
        (5, 5, 'realtime', 2.00, 2235.00, 750.00, 'Catherine Byrd - Skadden Arps', 'Margaret Sullivan', 'approved'),
        (8, 8, 'rush', 1.75, 546.00, 200.00, 'Peter Huang - White & Case', 'James Thompson', 'approved'),
        (12, 12, 'expedite', 1.25, 1118.00, 150.00, 'Mark Swanson - DLA Piper', 'Margaret Sullivan', 'approved'),
        (15, 15, 'rush', 1.50, 1157.00, 300.00, 'Anthony Reeves - Greenberg Traurig', 'James Thompson', 'approved'),
        (16, 16, 'realtime', 2.00, 0, 0, 'Elizabeth Doyle - Sullivan & Cromwell', 'Margaret Sullivan', 'approved'),
        (3, 3, 'expedite', 1.25, 624.00, 156.00, 'Daniel Cho - Latham & Watkins', 'Margaret Sullivan', 'approved'),
        (7, 7, 'rush', 1.50, 929.50, 0, 'Laura Mendez - Sidley Austin', 'James Thompson', 'denied'),
        (14, 14, 'rush', 1.50, 1306.50, 0, 'Kevin Marsh - Norton Rose Fulbright', NULL, 'pending'),
        (20, NULL, 'realtime', 2.00, 0, 0, 'Emily Chang - Weil Gotshal', 'Margaret Sullivan', 'approved'),
        (20, NULL, 'daily_copy', 1.50, 0, 0, 'Emily Chang - Weil Gotshal', 'Margaret Sullivan', 'approved'),
        (17, NULL, 'expedite', 1.25, 0, 0, 'Howard Pham - Covington', NULL, 'pending'),
        (18, NULL, 'rush', 1.50, 0, 0, 'Monica Hart - Paul Weiss', NULL, 'pending'),
        (19, NULL, 'rush', 1.50, 0, 0, 'Richard Hale - Baker McKenzie', 'Margaret Sullivan', 'approved');
    `);

    log('Seeding complete! All tables populated successfully.');

  } catch (err) {
    console.error('Error during seed:', err);
    process.exit(1);
  } finally {
    await client.end();
    log('Database connection closed.');
  }
}

run();
