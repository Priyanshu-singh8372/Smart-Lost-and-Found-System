require('dotenv').config();
const mysql = require('mysql2');

// Cloud DB se connect kar rahe hain, aur multiple queries allow kar rahe hain
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
    multipleStatements: true 
});

db.connect(err => {
    if (err) return console.error('❌ DB Error:', err.message);
    console.log('✅ Connected to Cloud DB. Creating Tables...');

    // Saari tables aur categories ek saath banane ka code
    const setupQueries = `
        CREATE TABLE IF NOT EXISTS users (
            user_id INT AUTO_INCREMENT PRIMARY KEY,
            username VARCHAR(255) NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            phone_number VARCHAR(20),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS item_categories (
            category_id INT AUTO_INCREMENT PRIMARY KEY,
            category_name VARCHAR(100) NOT NULL
        );

        INSERT IGNORE INTO item_categories (category_id, category_name) VALUES
        (1, 'Electronics'), (2, 'Documents'), (3, 'Keys'), (4, 'Clothing'), (5, 'Other');

        CREATE TABLE IF NOT EXISTS lost_items (
            lost_item_id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT,
            category_id INT,
            item_name VARCHAR(255) NOT NULL,
            description TEXT,
            date_lost DATE,
            location_lost VARCHAR(255),
            contact_info VARCHAR(255),
            image_url VARCHAR(255),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS found_items (
            found_item_id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT,
            category_id INT,
            item_name VARCHAR(255) NOT NULL,
            description TEXT,
            date_found DATE,
            location_found VARCHAR(255),
            contact_info VARCHAR(255),
            image_url VARCHAR(255),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS messages (
            message_id INT AUTO_INCREMENT PRIMARY KEY,
            sender_id INT,
            receiver_id INT,
            item_id INT,
            message_text TEXT,
            sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `;

    db.query(setupQueries, (err, results) => {
        if (err) {
            console.error("❌ Table creation failed:", err.message);
        } else {
            console.log("🎉 SUCCESS: All tables created in the Cloud Database!");
        }
        process.exit(); // Kaam khatam hone ke baad file auto-close ho jayegi
    });
});