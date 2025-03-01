import os
import psycopg2
import numpy as np
import pandas as pd
from bertopic import BERTopic
from fastapi import FastAPI, HTTPException, Query
from typing import List, Dict, Tuple
from psycopg2.pool import SimpleConnectionPool

app = FastAPI()

# Create a connection pool (adjust minconn and maxconn as needed)
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
    Combines the subject and body into a single 'email_text' field.
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
    
    # Combine subject and body as the text used for clustering
    emails = []
    for row in rows:
        email_id = row[0]
        subj = row[1] if row[1] is not None else ""
        body = row[2] if row[2] is not None else ""
        email_text = (subj + " " + body).strip()
        emails.append({"email_id": email_id, "email_text": email_text})
    return emails

def bulk_store_topics(topics_list: List[Tuple[int, str]]):
    """
    Bulk insert topics into the Groups table.
    Each tuple should be (group_id, topic_name).
    """
    conn = get_db_connection()
    try:
        cur = conn.cursor()
        query = """
            INSERT INTO Groups (group_id, name)
            VALUES (%s, %s)
            ON CONFLICT (group_id) DO NOTHING
        """
        cur.executemany(query, topics_list)
        conn.commit()
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        release_db_connection(conn)

def bulk_associate_emails(email_topic_list: List[Tuple[int, str]]):
    """
    Bulk insert email-to-topic associations into the GroupEmail table.
    Each tuple should be (group_id, email_id).
    """
    conn = get_db_connection()
    try:
        cur = conn.cursor()
        query = """
            INSERT INTO GroupEmail (group_id, email_id)
            VALUES (%s, %s)
            ON CONFLICT DO NOTHING
        """
        cur.executemany(query, email_topic_list)
        conn.commit()
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        release_db_connection(conn)

@app.get("/topics")
def get_topics(user_email: str = Query(..., description="User's email address")):
    """
    Retrieve topics for a specific user by clustering emails (using only the text).
    Outliers (BERTopic returns -1) are labeled as "Outlier".
    Bulk insert topics into Groups and email associations into GroupEmail.
    """
    emails = fetch_user_emails(user_email)
    if not emails:
        raise HTTPException(status_code=404, detail="No emails found for this user.")
    
    # Extract email texts for clustering
    documents = [email["email_text"] for email in emails]
    model_file = f"bertopic_{user_email}.pkl"
    
    # Load or create a BERTopic model for the user
    if os.path.exists(model_file):
        try:
            topic_model = BERTopic.load(model_file)
            topics, _ = topic_model.transform(documents)
        except Exception as e:
            print(f"Error loading model for {user_email}: {e}. Creating a new model.")
            topic_model = BERTopic()
            topics, _ = topic_model.fit_transform(documents)
    else:
        topic_model = BERTopic()
        topics, _ = topic_model.fit_transform(documents)
    
    # Save the model for future use
    topic_model.save(model_file)
    
    # Get topic info from the model
    topic_info = topic_model.get_topic_info()
    
    # Build a DataFrame for vectorized processing
    topics_array = np.array(topics)
    email_df = pd.DataFrame(emails)
    email_df["group_id"] = topics_array
    # Map group_id to topic_name; if group_id == -1, label as "Outlier"
    email_df["topic_name"] = email_df["group_id"].map(
        lambda tid: "Outlier" if tid == -1 else (topic_info.loc[tid, "Name"] if tid in topic_info.index else f"Topic {tid}")
    )
    
    # Prepare bulk insert data for topics (unique topics)
    unique_topics = email_df[["group_id", "topic_name"]].drop_duplicates()
    topics_list = [
        (row["group_id"], row["topic_name"])
        for _, row in unique_topics.iterrows()
    ]
    bulk_store_topics(topics_list)
    
    # Prepare bulk insert data for email-topic associations
    email_topic_list = [
        (row["group_id"], row["email_id"])
        for _, row in email_df.iterrows()
    ]
    bulk_associate_emails(email_topic_list)
    
    return {
        "topic_info": topic_info.to_dict(),
        "email_topics": email_df.to_dict(orient="records")
    }

@app.get("/")
def read_root():
    return {"Hello": "World"}
