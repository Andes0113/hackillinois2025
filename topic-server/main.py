import os
import psycopg2
import numpy as np
import pandas as pd
from bertopic import BERTopic
from fastapi import FastAPI, HTTPException, Query, Body
from typing import List, Dict, Tuple
from psycopg2.pool import SimpleConnectionPool

app = FastAPI()

# Create a connection pool
connection_pool = SimpleConnectionPool(
    minconn=1,
    maxconn=10,
    dbname="clustermail",
    user="postgres",
    password="postgres",
    host="localhost",
    port="6543"
)

def get_db_connection():
    """Retrieve a connection from the pool."""
    return connection_pool.getconn()

def release_db_connection(conn):
    """Return a connection to the pool."""
    connection_pool.putconn(conn)

def fetch_user_emails(user_email: str) -> List[Dict]:
    """
    Fetch all emails for the given user from the Emails table.
    """
    conn = get_db_connection()
    try:
        cur = conn.cursor()
        cur.execute(
            "SELECT email_id, subj, body FROM Emails WHERE user_email_address = %s",
            (user_email,)
        )
        rows = cur.fetchall()
    finally:
        release_db_connection(conn)
    
    emails = []
    for row in rows:
        email_id = row[0]
        subj = row[1] if row[1] is not None else ""
        body = row[2] if row[2] is not None else ""
        email_text = (subj + " " + body).strip()
        emails.append({"email_id": email_id, "email_text": email_text})
    return emails

def store_topics_in_db(user_email: str, email_df: pd.DataFrame):
    """
    Store topics in the Groups and GroupEmail tables.
    """
    conn = get_db_connection()
    try:
        cur = conn.cursor()
        
        # Insert topics into Groups table
        unique_topics = email_df[["group_id", "topic_name"]].drop_duplicates()
        topic_records = [
            (user_email, int(row["group_id"]), row["topic_name"])
            for _, row in unique_topics.iterrows()
        ]
        cur.executemany(
            """
            INSERT INTO Groups (user_email_address, group_id, name)
            VALUES (%s, %s, %s)
            ON CONFLICT (group_id) DO UPDATE SET name = EXCLUDED.name
            """,
            topic_records
        )
        
        # Insert email-topic associations into GroupEmail table
        email_topic_records = [
            (user_email, int(row["group_id"]), row["email_id"])
            for _, row in email_df.iterrows()
        ]
        cur.executemany(
            """
            INSERT INTO GroupEmail (user_email_address, group_id, email_id)
            VALUES (%s, %s, %s)
            ON CONFLICT DO NOTHING
            """,
            email_topic_records
        )
        
        conn.commit()
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        release_db_connection(conn)

def fetch_recent_emails(user_email: str, limit: int = 50):
    """Fetch the most recent emails for a user."""
    conn = get_db_connection()
    try:
        cur = conn.cursor()
        cur.execute(
            """
            SELECT email_id, subj, body
            FROM Emails
            WHERE user_email_address = %s
            ORDER BY email_id DESC
            LIMIT %s
            """,
            (user_email, limit)
        )
        rows = cur.fetchall()
    finally:
        release_db_connection(conn)
    
    return [{"email_id": row[0], "subject": row[1], "body": row[2]} for row in rows]

def fetch_topics_by_timeframe(user_email: str, timeframe: str):
    """Fetch topics and corresponding emails for a given timeframe."""
    timeframes = {
        "1_month": "INTERVAL '1 month'",
        "3_months": "INTERVAL '3 months'",
        "1_year": "INTERVAL '1 year'",
        "5_years": "INTERVAL '5 years'",
        "all_time": "INTERVAL '100 years'"
    }
    
    if timeframe not in timeframes:
        raise HTTPException(status_code=400, detail="Invalid timeframe")
    
    conn = get_db_connection()
    try:
        cur = conn.cursor()
        cur.execute(
            """
            SELECT ge.group_id, g.name, ge.email_id
            FROM GroupEmail ge
            JOIN Groups g ON ge.group_id = g.group_id
            JOIN Emails e ON ge.email_id = e.email_id
            WHERE ge.user_email_address = %s
            AND e.email_id >= NOW() - """ + timeframes[timeframe] + """
            ORDER BY e.email_id DESC
            """,
            (user_email,)
        )
        rows = cur.fetchall()
    finally:
        release_db_connection(conn)
    
    return [{"group_id": row[0], "topic_name": row[1], "email_id": row[2]} for row in rows]

@app.post("/update_topic")
def update_topic(user_email: str = Body(...), group_id: int = Body(...), new_name: str = Body(...)):
    """
    Update the name of a specific topic.
    """
    conn = get_db_connection()
    try:
        cur = conn.cursor()
        cur.execute(
            """
            UPDATE Groups
            SET name = %s
            WHERE user_email_address = %s AND group_id = %s
            """,
            (new_name, user_email, group_id)
        )
        conn.commit()
        return {"message": "Topic updated successfully"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        release_db_connection(conn)

@app.post("/add_email_to_topic")
def add_email_to_topic(user_email: str = Body(...), group_id: int = Body(...), email_id: str = Body(...)):
    """
    Add a specific email to an existing topic.
    """
    conn = get_db_connection()
    try:
        cur = conn.cursor()
        cur.execute(
            """
            INSERT INTO GroupEmail (user_email_address, group_id, email_id)
            VALUES (%s, %s, %s)
            ON CONFLICT DO NOTHING
            """,
            (user_email, group_id, email_id)
        )
        conn.commit()
        return {"message": "Email added to topic successfully"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        release_db_connection(conn)

@app.get("/topics")
def get_topics(user_email: str = Query(..., description="User's email address")):
    """
    Retrieve topics for a specific user by clustering emails.
    Stores results in PostgreSQL and returns email IDs with topics.
    """
    emails = fetch_user_emails(user_email)
    if not emails:
        raise HTTPException(status_code=404, detail="No emails found for this user.")
    
    documents = [email["email_text"] for email in emails]
    model_file = f"bertopic_{user_email}.pkl"
    
    if os.path.exists(model_file):
        try:
            topic_model = BERTopic.load(model_file)
            topics, _ = topic_model.transform(documents)
        except:
            topic_model = BERTopic()
            topics, _ = topic_model.fit_transform(documents)
    else:
        topic_model = BERTopic()
        topics, _ = topic_model.fit_transform(documents)
    
    topic_model.save(model_file)
    
    topic_info = topic_model.get_topic_info()
    
    # Assign topics to emails
    topics_array = np.array(topics)
    email_df = pd.DataFrame(emails)
    email_df["group_id"] = topics_array
    email_df["topic_name"] = email_df["group_id"].map(
        lambda tid: "Outlier" if tid == -1 else (topic_info.loc[tid, "Name"] if tid in topic_info.index else f"Topic {tid}")
    )
    
    # Store results in PostgreSQL
    store_topics_in_db(user_email, email_df)
    
    # Return only email ID and topic
    return email_df[["email_id", "topic_name"]].to_dict(orient="records")

@app.get("/")
def read_root():
    return {"Hello": "World"}


@app.get("/recent_emails")
def get_recent_emails(user_email: str = Query(..., description="User's email address")):
    """Get the most recent 50 emails."""
    return fetch_recent_emails(user_email)

@app.get("/topics_by_timeframe")
def get_topics_by_timeframe(user_email: str = Query(...), timeframe: str = Query(..., description="Choose from: 1_month, 3_months, 1_year, 5_years, all_time")):
    """Get topics and corresponding emails from a given timeframe."""
    return fetch_topics_by_timeframe(user_email, timeframe)