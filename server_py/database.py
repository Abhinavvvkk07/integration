import sqlite3
import json
import os
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(__file__), "finance.db")

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    c = conn.cursor()
    
    # Table for user personality/survey data
    c.execute('''
        CREATE TABLE IF NOT EXISTS user_profile (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            spending_regret TEXT,
            user_goals TEXT,
            top_categories TEXT, -- JSON list
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Table for transaction metadata (regret scores)
    c.execute('''
        CREATE TABLE IF NOT EXISTS transaction_metadata (
            transaction_id TEXT PRIMARY KEY,
            regret_score INTEGER, -- 0 to 100
            regret_reason TEXT,
            analyzed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    conn.commit()
    conn.close()

def save_user_profile(spending_regret, user_goals, top_categories):
    conn = get_db_connection()
    c = conn.cursor()
    
    # For this single-user app, we'll just keep one profile row (ID 1)
    # Check if exists
    c.execute("SELECT id FROM user_profile WHERE id = 1")
    exists = c.fetchone()
    
    cat_json = json.dumps(top_categories)
    
    if exists:
        c.execute('''
            UPDATE user_profile 
            SET spending_regret = ?, user_goals = ?, top_categories = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = 1
        ''', (spending_regret, user_goals, cat_json))
    else:
        c.execute('''
            INSERT INTO user_profile (id, spending_regret, user_goals, top_categories)
            VALUES (1, ?, ?, ?)
        ''', (spending_regret, user_goals, cat_json))
        
    conn.commit()
    conn.close()

def get_user_profile():
    conn = get_db_connection()
    c = conn.cursor()
    c.execute("SELECT * FROM user_profile WHERE id = 1")
    row = c.fetchone()
    conn.close()
    
    if row:
        return {
            "spending_regret": row["spending_regret"],
            "user_goals": row["user_goals"],
            "top_categories": json.loads(row["top_categories"])
        }
    return None

def get_transaction_metadata(transaction_ids):
    conn = get_db_connection()
    c = conn.cursor()
    
    placeholders = ','.join('?' for _ in transaction_ids)
    query = f"SELECT * FROM transaction_metadata WHERE transaction_id IN ({placeholders})"
    
    c.execute(query, transaction_ids)
    rows = c.fetchall()
    conn.close()
    
    results = {}
    for row in rows:
        results[row["transaction_id"]] = {
            "regret_score": row["regret_score"],
            "regret_reason": row["regret_reason"]
        }
    return results

def save_transaction_regret(transaction_id, score, reason):
    conn = get_db_connection()
    c = conn.cursor()
    
    c.execute('''
        INSERT OR REPLACE INTO transaction_metadata (transaction_id, regret_score, regret_reason, analyzed_at)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    ''', (transaction_id, score, reason))
    
    conn.commit()
    conn.close()

# Initialize on module load
init_db()
