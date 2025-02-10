const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Initialize database
const db = new sqlite3.Database(path.join(__dirname, 'logs.db'), (err) => {
    if (err) {
        console.error('Error opening database:', err);
    } else {
        console.log('Connected to the SQLite database.');
        initializeDatabase();
    }
});

// Create tables if they don't exist
function initializeDatabase() {
    db.run(`
        CREATE TABLE IF NOT EXISTS interaction_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            user_query TEXT NOT NULL,
            model_response TEXT NOT NULL,
            model_name TEXT NOT NULL,
            response_time_ms INTEGER NOT NULL,
            token_count INTEGER,
            error_occurred BOOLEAN DEFAULT 0,
            error_message TEXT
        )
    `);
}

// Log interaction function
async function logInteraction(data) {
    const { userQuery, modelResponse, modelName, responseTime, tokenCount, errorOccurred, errorMessage } = data;
    
    return new Promise((resolve, reject) => {
        db.run(
            `INSERT INTO interaction_logs 
            (user_query, model_response, model_name, response_time_ms, token_count, error_occurred, error_message)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [userQuery, modelResponse, modelName, responseTime, tokenCount, errorOccurred ? 1 : 0, errorMessage],
            function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.lastID);
                }
            }
        );
    });
}

// Get logs with pagination
async function getLogs(page = 1, limit = 50) {
    const offset = (page - 1) * limit;
    
    return new Promise((resolve, reject) => {
        db.all(
            `SELECT * FROM interaction_logs 
            ORDER BY timestamp DESC 
            LIMIT ? OFFSET ?`,
            [limit, offset],
            (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            }
        );
    });
}

// Get statistics
async function getStats() {
    return new Promise((resolve, reject) => {
        db.all(`
            SELECT 
                COUNT(*) as total_interactions,
                AVG(response_time_ms) as avg_response_time,
                SUM(CASE WHEN error_occurred = 1 THEN 1 ELSE 0 END) as error_count,
                AVG(token_count) as avg_token_count,
                COUNT(DISTINCT model_name) as model_count
            FROM interaction_logs
        `, [], (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows[0]);
            }
        });
    });
}

// Export logs as CSV
async function exportLogsAsCSV() {
    return new Promise((resolve, reject) => {
        db.all(
            `SELECT * FROM interaction_logs ORDER BY timestamp DESC`,
            [],
            (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    const fields = ['id', 'timestamp', 'user_query', 'model_response', 
                                  'model_name', 'response_time_ms', 'token_count', 
                                  'error_occurred', 'error_message'];
                    
                    const csv = [
                        fields.join(','),
                        ...rows.map(row => 
                            fields.map(field => 
                                JSON.stringify(row[field] || '')
                            ).join(',')
                        )
                    ].join('\n');
                    
                    resolve(csv);
                }
            }
        );
    });
}

module.exports = {
    logInteraction,
    getLogs,
    getStats,
    exportLogsAsCSV
};