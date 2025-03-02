import os
import psycopg2
import numpy as np
import pandas as pd
from bertopic import BERTopic
from fastapi import FastAPI, HTTPException, Query, Body
from typing import List, Dict, Tuple, Optional
from psycopg2.pool import SimpleConnectionPool
from sklearn.feature_extraction.text import CountVectorizer, TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from umap import UMAP
import hdbscan
from datetime import datetime, timedelta
from pydantic import BaseModel
from rake_nltk import Rake

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
    Fetch all emails for the given user from the Emails table,
    ensuring that no implicit limit is imposed.
    """
    conn = get_db_connection()
    try:
        cur = conn.cursor()
        cur.execute(
            """
            SELECT email_id, subj, summary, date_sent
            FROM Emails
            WHERE user_email_address = %s
            ORDER BY date_sent DESC
            """,
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
        date_sent = row[3]
        email_text = (subj + " " + body).strip()
        emails.append({"email_id": email_id, "email_text": email_text, "date_sent": date_sent})
    
    print(f"Total emails fetched: {len(emails)}")
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
            SELECT email_id, subj, summary
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
    
    # Use consistent field names ("subject" from subj and "summary" instead of body)
    return [{"email_id": row[0], "subject": row[1], "summary": row[2]} for row in rows]

def fetch_topics_by_timeframe(user_email: str, timeframe: str):
    """
    Fetch topics and corresponding emails for a given timeframe.
    NOTE: Adjust the filtering as needed since date_sent is available.
    """
    # valid_timeframes = {"1_month", "3_months", "1_year", "5_years", "all_time"}
    valid_timeframes = {"1_month", "3_months", "1_year"}
    if timeframe not in valid_timeframes:
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
            ORDER BY e.email_id DESC
            """,
            (user_email,)
        )
        rows = cur.fetchall()
    finally:
        release_db_connection(conn)
    
    return [{"group_id": row[0], "topic_name": row[1], "email_id": row[2]} for row in rows]

@app.get("/topics")
def get_topics(user_email: str = Query(..., description="User's email address")):
    """
    Retrieve topics for a specific user by clustering emails.
    Ensures all emails are retrieved, processed, and stored.
    Additionally, generates better topic names based on email content.
    """
    emails = fetch_user_emails(user_email)
    print(f"Total emails retrieved: {len(emails)}")
    if not emails:
        raise HTTPException(status_code=404, detail="No emails found for this user.")
    
    # Prepare the document list for clustering
    documents = [email["email_text"] for email in emails]
    model_file = f"bertopic_{user_email}.pkl"
    
    # Load or fit the BERTopic model
    if os.path.exists(model_file):
        try:
            topic_model = BERTopic.load(model_file)
            topics, _ = topic_model.transform(documents)
        except Exception as e:
            print(f"Error loading model: {e}")
            topic_model = BERTopic(low_memory=False)
            topics, _ = topic_model.fit_transform(documents)
    else:
        custom_stopwords = ["the", "and", "to", "for", "of", "a", "in", "on", "email", "summary", "error", "generating", ""]
        vectorizer_model = CountVectorizer(stop_words=custom_stopwords)
        umap_model = UMAP(n_neighbors=10, min_dist=0.1)
        hdbscan_model = hdbscan.HDBSCAN(min_cluster_size=7)
        topic_model = BERTopic(
            vectorizer_model=vectorizer_model,
            umap_model=umap_model,
            hdbscan_model=hdbscan_model,
            nr_topics="auto",
            low_memory=False
        )
        topics, _ = topic_model.fit_transform(documents)
    
    topic_model.save(model_file)
    topic_info = topic_model.get_topic_info()
    topics_array = np.array(topics)
    
    # Create a DataFrame of emails and assign initial topic names
    email_df = pd.DataFrame(emails)
    email_df["group_id"] = topics_array
    email_df["topic_name"] = email_df["group_id"].map(
        lambda tid: "Outlier" if tid == -1 
                    else (topic_info.loc[tid, "Name"] if tid in topic_info.index 
                          else f"Topic {tid}")
    )
    
    if "date_sent" in email_df.columns:
        email_df = email_df.sort_values(by="date_sent", ascending=False)
    
    # --- Generate Better Topic Names ---
    from sklearn.feature_extraction.text import TfidfVectorizer
    unique_groups = email_df[email_df["group_id"] != -1]["group_id"].unique()
    for group in unique_groups:
        group_emails = email_df[email_df["group_id"] == group]["email_text"].tolist()
        if not group_emails:
            continue
        combined_text = " ".join(group_emails)
        vectorizer = TfidfVectorizer(stop_words="english", max_features=10)
        tfidf_matrix = vectorizer.fit_transform([combined_text])
        feature_array = vectorizer.get_feature_names_out()
        tfidf_scores = tfidf_matrix.toarray().flatten()
        sorted_indices = np.argsort(tfidf_scores)[::-1]
        top_keywords = feature_array[sorted_indices][:3]
        new_topic_name = " ".join(top_keywords)
        # Update the topic name in both topic_info and email_df
        if group in topic_info["Topic"].values:
            topic_info.loc[topic_info["Topic"] == group, "Name"] = new_topic_name
        email_df.loc[email_df["group_id"] == group, "topic_name"] = new_topic_name
    
    # Update the database with the improved topic names
    store_topics_in_db(user_email, email_df)
    
    return {
        "topics": topic_info.to_dict(),
        "email_topics": email_df[["email_id", "topic_name"]].to_dict(orient="records")
    }


@app.get("/topics_incremental")
def get_topics_incremental(user_email: str = Query(..., description="User's email address")):
    """
    Incrementally generate topic models based on timeframes:
      - For timeframes 3 months or more (3_months, 6_months, 1_year, 3_years): 
          * If a model already exists, load it; otherwise, generate a new BERTopic model.
      - For 1 month: simply filter the first month of emails without topic modeling.
    
    The models for 3+ month windows are saved separately.
    The endpoint returns the filtered one-month emails and the modeled topics from the 3-month window.
    It then calls generate_topic_names to refine the topic names.
    """
    emails = fetch_user_emails(user_email)
    if not emails:
        raise HTTPException(status_code=404, detail="No emails found for this user.")
    
    email_df = pd.DataFrame(emails)
    email_df["date_sent"] = pd.to_datetime(email_df["date_sent"])
    now = pd.Timestamp.now()

    # One-month: filter emails from the last 30 days (no modeling)
    one_month_df = email_df[email_df["date_sent"] >= (now - pd.Timedelta(days=30))].copy()
    one_month_df["group_id"] = -99  # Marker for "not modeled"
    one_month_df["topic_name"] = "Not Modeled (1 Month Only)"
    
    # Define time windows (3 months or more) and configurations
    model_time_windows = [
        ("3_months", 90),
        ("6_months", 180),
        ("1_year", 365),
        ("3_years", 1095)
    ]
    model_configs = {
        "3_months": {
            "custom_stopwords": ["the", "and", "to", "for", "of", "a", "in", "on", "email", "summary", "error", "generating"],
            "umap": {"n_neighbors": 10, "min_dist": 0.2},
            "hdbscan": {"min_cluster_size": 5},
            "nr_topics": "auto"
        },
        "6_months": {
            "custom_stopwords": ["the", "and", "to", "for", "of", "a", "in", "on", "email", "summary", "error", "generating"],
            "umap": {"n_neighbors": 15, "min_dist": 0.15},
            "hdbscan": {"min_cluster_size": 4},
            "nr_topics": "auto"
        },
        "1_year": {
            "custom_stopwords": ["the", "and", "to", "for", "of", "a", "in", "on", "email", "summary", "error", "generating"],
            "umap": {"n_neighbors": 20, "min_dist": 0.1},
            "hdbscan": {"min_cluster_size": 6},
            "nr_topics": "auto"
        },
        "3_years": {
            "custom_stopwords": ["the", "and", "to", "for", "of", "a", "in", "on", "email", "summary", "error", "generating"],
            "umap": {"n_neighbors": 25, "min_dist": 0.05},
            "hdbscan": {"min_cluster_size": 8},
            "nr_topics": "auto"
        }
    }
    
    output_results = {}
    for label, days in model_time_windows:
        window_df = email_df[email_df["date_sent"] >= (now - pd.Timedelta(days=days))]
        documents = window_df["email_text"].tolist()
        if not documents:
            print(f"No emails found for window: {label}")
            continue

        config = model_configs.get(label)
        model_file = f"bertopic_{user_email}_{label}.pkl"
        
        # If a model file already exists, load it; otherwise, create a new model.
        if os.path.exists(model_file):
            try:
                topic_model = BERTopic.load(model_file)
                topics, _ = topic_model.transform(documents)
            except Exception as e:
                print(f"Error loading model for {label}: {e}")
                topic_model = BERTopic(
                    vectorizer_model=CountVectorizer(stop_words=config["custom_stopwords"]),
                    umap_model=UMAP(**config["umap"]),
                    hdbscan_model=hdbscan.HDBSCAN(**config["hdbscan"]),
                    nr_topics=config["nr_topics"],
                    low_memory=False
                )
                topics, _ = topic_model.fit_transform(documents)
                topic_model.save(model_file)
        else:
            topic_model = BERTopic(
                vectorizer_model=CountVectorizer(stop_words=config["custom_stopwords"]),
                umap_model=UMAP(**config["umap"]),
                hdbscan_model=hdbscan.HDBSCAN(**config["hdbscan"]),
                nr_topics=config["nr_topics"],
                low_memory=False
            )
            topics, _ = topic_model.fit_transform(documents)
            topic_model.save(model_file)
        
        topic_info = topic_model.get_topic_info()
        topics_array = np.array(topics)
        window_df = window_df.copy()
        window_df["group_id"] = topics_array
        window_df["topic_name"] = window_df["group_id"].map(
            lambda tid: "Outlier" if tid == -1 
                        else (topic_info.loc[tid, "Name"] if tid in topic_info.index else f"Topic {tid}")
        )
        store_topics_in_db(user_email, window_df)
        
        # Return only the 3_months result for output purposes
        if label == "3_months":
            output_results[label] = {
                "model_file": model_file,
                "topics": topic_info.to_dict(),
                "email_topics": window_df[["email_id", "topic_name"]].to_dict(orient="records")
            }
    
    output_results["1_month"] = {
        "filtered_emails": one_month_df[["email_id", "topic_name", "date_sent"]].to_dict(orient="records")
    }
    
    # Call the existing generate_topic_names endpoint to refine topic names.
    refined_result = generate_topic_names(user_email)
    output_results["refined_topic_names"] = refined_result.get("updated_topic_names", {})

    return output_results


@app.get("/recent_emails")
def get_recent_emails(user_email: str = Query(..., description="User's email address")):
    """Get the most recent 50 emails."""
    return fetch_recent_emails(user_email)

@app.get("/topics_by_timeframe")
def get_topics_by_timeframe(user_email: str = Query(...), timeframe: str = Query(..., description="Choose from: 1_month, 3_months, 1_year, 5_years, all_time")):
    """Get topics and corresponding emails from a given timeframe."""
    return fetch_topics_by_timeframe(user_email, timeframe)

@app.post("/update_topics")
def update_topics(
    user_email: str = Query(..., description="User's email address"),
    new_documents: List[str] = Body(..., description="List of new email texts")
):
    """
    Update the BERTopic model with new topics given additional documents.
    """
    model_file = f"bertopic_{user_email}.pkl"
    if os.path.exists(model_file):
        try:
            topic_model = BERTopic.load(model_file)
        except Exception as e:
            print(f"Error loading model: {e}")
            topic_model = BERTopic()
    else:
        topic_model = BERTopic()
    existing_emails = fetch_user_emails(user_email)
    existing_documents = [email["email_text"] for email in existing_emails]
    all_documents = existing_documents + new_documents
    topics, _ = topic_model.fit_transform(all_documents)
    topic_model.save(model_file)
    topic_info = topic_model.get_topic_info()
    topics_array = np.array(topics)
    topics_series = pd.Series(topics_array)
    email_df = pd.DataFrame({
         "email_id": [email["email_id"] for email in existing_emails] + [None] * len(new_documents),
         "group_id": topics_array,
         "topic_name": topics_series.map(lambda tid: "Outlier" if tid == -1 else (topic_info.loc[tid, "Name"] if tid in topic_info.index else f"Topic {tid}"))
    })
    store_topics_in_db(user_email, email_df)
    return {"message": "BERTopic model updated successfully", "topics": email_df.to_dict(orient="records")}

class TopicReassignmentRequest(BaseModel):
    user_email: str
    email_id: int
    new_topic: str

@app.post("/reassign_topic")
def reassign_topic(request: TopicReassignmentRequest):
    """
    Reassign the topic for a specific email.
    - If the provided new_topic already exists for the user, simply update the email's topic.
    - If it's a new topic, re-run the BERTopic model on all emails to update the topics.
      If the new topic appears in the updated model, use its group id;
      otherwise, create a new group id and assign that topic.
    """
    user_email = request.user_email
    email_id = request.email_id
    new_topic = request.new_topic.strip()

    conn = get_db_connection()
    try:
        cur = conn.cursor()
        cur.execute(
            "SELECT group_id FROM Groups WHERE user_email_address = %s AND name = %s",
            (user_email, new_topic)
        )
        result = cur.fetchone()
        if result is not None:
            group_id = result[0]
            cur.execute(
                """
                INSERT INTO GroupEmail (user_email_address, group_id, email_id)
                VALUES (%s, %s, %s)
                ON CONFLICT (user_email_address, group_id, email_id) DO UPDATE SET group_id = EXCLUDED.group_id
                """,
                (user_email, group_id, email_id)
            )
            conn.commit()
            return {"message": "Email assigned to existing topic.", "group_id": group_id}
        else:
            emails = fetch_user_emails(user_email)
            if not emails:
                raise HTTPException(status_code=404, detail="No emails found for this user.")
            documents = [email["email_text"] for email in emails]
            custom_stopwords = ["the", "and", "to", "for", "of", "a", "in", "on", "email"]
            vectorizer_model = CountVectorizer(stop_words=custom_stopwords)
            umap_model = UMAP(n_neighbors=10, min_dist=0.1)
            hdbscan_model = hdbscan.HDBSCAN(min_cluster_size=3)
            topic_model = BERTopic(
                vectorizer_model=vectorizer_model,
                umap_model=umap_model,
                hdbscan_model=hdbscan_model,
                nr_topics="auto",
                low_memory=False
            )
            topics, _ = topic_model.fit_transform(documents)
            model_file = f"bertopic_{user_email}_all_time.pkl"
            topic_model.save(model_file)
            topic_info = topic_model.get_topic_info()
            
            if new_topic in topic_info["Name"].values:
                group_id = int(topic_info[topic_info["Name"] == new_topic].iloc[0]["Topic"])
            else:
                cur.execute(
                    "SELECT COALESCE(MAX(group_id), 0) FROM Groups WHERE user_email_address = %s",
                    (user_email,)
                )
                max_group = cur.fetchone()[0]
                group_id = max_group + 1
            
            cur.execute(
                """
                INSERT INTO Groups (user_email_address, group_id, name)
                VALUES (%s, %s, %s)
                ON CONFLICT (group_id) DO UPDATE SET name = EXCLUDED.name
                """,
                (user_email, group_id, new_topic)
            )
            cur.execute(
                """
                INSERT INTO GroupEmail (user_email_address, group_id, email_id)
                VALUES (%s, %s, %s)
                ON CONFLICT DO NOTHING
                """,
                (user_email, group_id, email_id)
            )
            conn.commit()
            return {"message": "New topic created and email assigned.", "group_id": group_id}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        release_db_connection(conn)

def insert_new_email(user_email: str, subj: str, summary: str, date_sent: Optional[datetime]=None) -> int:
    """
    Insert a new email into the Emails table and return its email_id.
    """
    if date_sent is None:
        date_sent = datetime.now()
    conn = get_db_connection()
    try:
        cur = conn.cursor()
        cur.execute(
            """
            INSERT INTO Emails (user_email_address, subj, summary, date_sent)
            VALUES (%s, %s, %s, %s)
            RETURNING email_id
            """,
            (user_email, subj, summary, date_sent)
        )
        email_id = cur.fetchone()[0]
        conn.commit()
        return email_id
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        release_db_connection(conn)

class NewEmailRequest(BaseModel):
    user_email: str
    subject: str
    summary: str
    date_sent: Optional[datetime] = None

@app.post("/add_email_assign_topic")
def add_email_assign_topic(request: NewEmailRequest):
    """
    Insert a new email and assign it the best matching topic based on similarity
    with existing topics. If a similar topic is found, update the GroupEmail table accordingly.
    """
    try:
        email_id = insert_new_email(request.user_email, request.subject, request.summary, request.date_sent)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error inserting new email: {e}")
    
    new_email_text = f"{request.subject} {request.summary}".strip()
    
    conn = get_db_connection()
    try:
        cur = conn.cursor()
        cur.execute(
            "SELECT group_id, name FROM Groups WHERE user_email_address = %s",
            (request.user_email,)
        )
        topics = cur.fetchall()
    finally:
        release_db_connection(conn)
    
    if not topics:
        raise HTTPException(status_code=404, detail="No topics exist for this user. Please create topics first.")
    
    topic_names = [t[1] for t in topics]
    vectorizer = TfidfVectorizer().fit(topic_names + [new_email_text])
    topic_vectors = vectorizer.transform(topic_names)
    new_email_vector = vectorizer.transform([new_email_text])
    similarities = cosine_similarity(new_email_vector, topic_vectors)[0]
    best_index = similarities.argmax()
    best_topic = topic_names[best_index]
    best_group_id = topics[best_index][0]
    
    conn = get_db_connection()
    try:
        cur = conn.cursor()
        cur.execute(
            """
            INSERT INTO GroupEmail (user_email_address, group_id, email_id)
            VALUES (%s, %s, %s)
            ON CONFLICT DO NOTHING
            """,
            (request.user_email, best_group_id, email_id)
        )
        conn.commit()
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Error updating topic assignment: {e}")
    finally:
        release_db_connection(conn)
    
    return {
        "message": "New email inserted and assigned to best matching topic.",
        "email_id": email_id,
        "assigned_topic": best_topic,
        "group_id": best_group_id
    }

@app.get("/")
def read_root():
    return {"Hello": "World"}

@app.post("/generate_topic_names")
def generate_topic_names(user_email: str = Query(..., description="User's email address")):
    """
    Generate better names for topics for a given user.
    
    For each topic in the Groups table (except placeholders), the endpoint:
      - Retrieves associated email texts by concatenating subject and summary.
      - Aggregates the texts and extracts the top key phrases using RAKE.
      - Creates a new topic name from these phrases.
      - Updates the Groups table with the new name.
    
    Returns a mapping of group_id to the updated topic names.
    """
    # Fetch existing topics for the user
    conn = get_db_connection()
    try:
        cur = conn.cursor()
        cur.execute("SELECT group_id, name FROM Groups WHERE user_email_address = %s", (user_email,))
        topics = cur.fetchall()  # Each row: (group_id, name)
    finally:
        release_db_connection(conn)
    
    updated_topic_names = {}
    
    # Define custom stopwords (you can add more if needed)
    custom_stopwords = set(["summary", "generating", "error"])
    
    for group_id, old_name in topics:
        # Skip placeholders/outliers (e.g., group_id == -99 or names with "Not Modeled")
        if group_id == -99 or "Not Modeled" in old_name:
            updated_topic_names[group_id] = old_name
            continue
        
        # Fetch email texts associated with this topic by concatenating subj and summary
        conn = get_db_connection()
        try:
            cur = conn.cursor()
            cur.execute(
                """
                SELECT COALESCE(e.subj, '') || ' ' || COALESCE(e.summary, '') AS email_text
                FROM Emails e
                JOIN GroupEmail ge ON e.email_id = ge.email_id
                WHERE ge.user_email_address = %s AND ge.group_id = %s
                """,
                (user_email, group_id)
            )
            email_texts = [row[0] for row in cur.fetchall()]
        finally:
            release_db_connection(conn)
        
        if not email_texts:
            updated_topic_names[group_id] = old_name
            continue
        
        # Combine email texts
        combined_text = " ".join(email_texts)
        
        # Use RAKE to extract key phrases
        rake_extractor = Rake(stopwords=custom_stopwords, min_length=1, max_length=3)
        rake_extractor.extract_keywords_from_text(combined_text)
        # Get the top 3 ranked phrases
        key_phrases = rake_extractor.get_ranked_phrases()[:3]
        new_name = " ".join(key_phrases) if key_phrases else old_name
        
        updated_topic_names[group_id] = new_name
        
        # Update the Groups table with the new topic name
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
        except Exception as e:
            conn.rollback()
            raise HTTPException(status_code=500, detail=f"Error updating topic name for group {group_id}: {e}")
        finally:
            release_db_connection(conn)
    
    return {"updated_topic_names": updated_topic_names}


# @app.get("/topics")
# def get_topics(user_email: str = Query(..., description="User's email address")):
#     """
#     Retrieve topics for a specific user by clustering emails.
#     Stores results in PostgreSQL and returns email IDs with topics.
#     """
#     emails = fetch_user_emails(user_email)
#     if not emails:
#         raise HTTPException(status_code=404, detail="No emails found for this user.")
    
#     documents = [email["email_text"] for email in emails]
#     model_file = f"bertopic_{user_email}.pkl"
    
#     if os.path.exists(model_file):
#         try:
#             topic_model = BERTopic.load(model_file)
#             topics, _ = topic_model.transform(documents)
#         except Exception as e:
#             print(f"Error loading model: {e}")
#         except Exception as e:
#             print(f"Error loading model: {e}")
#             # topic_model = BERTopic()
#             custom_stopwords = ["the", "and", "to", "for", "of", "a", "in", "on"]

#             vectorizer_model = CountVectorizer(stop_words=custom_stopwords)

#             topic_model = BERTopic(
#                 vectorizer_model=vectorizer_model,
#                 umap_model_params={"n_neighbors": 10, "min_dist": 0.1},
#                 hdbscan_model_params={"min_cluster_size": 3},
#                 nr_topics=None
#             )
#             topics, _ = topic_model.fit_transform(documents)
#     else:
#         topic_model = BERTopic()
#         topics, _ = topic_model.fit_transform(documents)
    
#     topic_model.save(model_file)
    
#     topic_info = topic_model.get_topic_info()
    
#     # Assign topics to emails
#     topics_array = np.array(topics)
#     email_df = pd.DataFrame(emails)
#     email_df["group_id"] = topics_array
#     email_df["topic_name"] = email_df["group_id"].map(
#         lambda tid: "Outlier" if tid == -1 else (topic_info.loc[tid, "Name"] if tid in topic_info.index else f"Topic {tid}")
#     )
    
#     # Store results in PostgreSQL
#     store_topics_in_db(user_email, email_df)
    
#     # Return only email ID and topic
#     return email_df[["email_id", "topic_name"]].to_dict(orient="records")

# @app.get("/topics")
# def get_topics(user_email: str = Query(..., description="User's email address")):
#     """
#     Retrieve topics for a specific user by clustering emails.
#     Stores results in PostgreSQL and returns:
#       - "topics": overall topic information
#       - "email_topics": email IDs with their topic names, sorted by date_sent (most recent first)
#     """
#     emails = fetch_user_emails(user_email)
#     if not emails:
#         raise HTTPException(status_code=404, detail="No emails found for this user.")
    
#     documents = [email["email_text"] for email in emails]
#     model_file = f"bertopic_{user_email}.pkl"
    
#     if os.path.exists(model_file):
#         try:
#             topic_model = BERTopic.load(model_file)
#             topics, _ = topic_model.transform(documents)
#         except Exception as e:
#             print(f"Error loading model: {e}")
#             topic_model = BERTopic()
#             topics, _ = topic_model.fit_transform(documents)
#     else:
#         # topic_model = BERTopic()
#         # custom_stopwords = ["the", "and", "to", "for", "of", "a", "in", "on"]

#         # vectorizer_model = CountVectorizer(stop_words=custom_stopwords)
#         # topic_model = BERTopic(
#         #         vectorizer_model=vectorizer_model,
#         #         umap_model_params={"n_neighbors": 10, "min_dist": 0.1},
#         #         hdbscan_model_params={"min_cluster_size": 3},
#         #         nr_topics=None
#         #     )
#         # topics, _ = topic_model.fit_transform(documents)

#         custom_stopwords = ["the", "and", "to", "for", "of", "a", "in", "on", "email", "overall", "from", "aims", "key", "themes"]
#         vectorizer_model = CountVectorizer(stop_words=custom_stopwords)
        
#         umap_model = UMAP(n_neighbors=10, min_dist=0.1)
#         hdbscan_model = hdbscan.HDBSCAN(min_cluster_size=3)
#         topic_model = BERTopic(
#             vectorizer_model=vectorizer_model,
#             umap_model=umap_model,
#             hdbscan_model=hdbscan_model,
#             nr_topics=None
#         )
#         topics, _ = topic_model.fit_transform(documents)
    
#     topic_model.save(model_file)
#     topic_info = topic_model.get_topic_info()
    
#     # Assign topics to emails
#     topics_array = np.array(topics)
#     email_df = pd.DataFrame(emails)
#     email_df["group_id"] = topics_array
#     email_df["topic_name"] = email_df["group_id"].map(
#         lambda tid: "Outlier" if tid == -1 else (topic_info.loc[tid, "Name"] if tid in topic_info.index else f"Topic {tid}")
#     )
    
#     # If date_sent is available, sort by it descending (most recent first)
#     if "date_sent" in email_df.columns:
#         email_df = email_df.sort_values(by="date_sent", ascending=False)
    
#     # Store results in PostgreSQL
#     store_topics_in_db(user_email, email_df)
    
#     # Return both overall topic info and the email-topic mapping
#     return {
#         "topics": topic_info.to_dict(),
#         "email_topics": email_df[["email_id", "topic_name"]].to_dict(orient="records")
#     }

# def fetch_user_emails(user_email: str) -> List[Dict]:
#     """
#     Fetch all emails for the given user from the Emails table.
#     """
#     conn = get_db_connection()
#     try:
#         cur = conn.cursor()
#         cur.execute(
#             "SELECT email_id, subj, summary FROM Emails WHERE user_email_address = %s",
#             (user_email,)
#         )
#         rows = cur.fetchall()
#     finally:
#         release_db_connection(conn)
    
#     emails = []
#     for row in rows:
#         email_id = row[0]
#         subj = row[1] if row[1] is not None else ""
#         body = row[2] if row[2] is not None else ""
#         email_text = (subj + " " + body).strip()
#         emails.append({"email_id": email_id, "email_text": email_text})
#     return emails

# def fetch_user_emails(user_email: str) -> List[Dict]:
#     """
#     Fetch all emails for the given user from the Emails table,
#     ordering by date_sent in descending order.
#     """
#     conn = get_db_connection()
#     try:
#         cur = conn.cursor()
#         cur.execute(
#             "SELECT email_id, subj, summary, date_sent FROM Emails WHERE user_email_address = %s ORDER BY date_sent DESC",
#             (user_email,)
#         )
#         rows = cur.fetchall()
#     finally:
#         release_db_connection(conn)
    
#     emails = []
#     for row in rows:
#         email_id = row[0]
#         subj = row[1] if row[1] is not None else ""
#         body = row[2] if row[2] is not None else ""
#         date_sent = row[3]  # New: capture the timestamp
#         email_text = (subj + " " + body).strip()
#         emails.append({"email_id": email_id, "email_text": email_text, "date_sent": date_sent})
#     return emails

# import os
# import psycopg2
# import numpy as np
# import pandas as pd
# from bertopic import BERTopic
# from fastapi import FastAPI, HTTPException, Query
# from typing import List, Dict, Tuple
# from psycopg2.pool import SimpleConnectionPool

# app = FastAPI()

# # Create a connection pool (adjust minconn and maxconn as needed)
# connection_pool = SimpleConnectionPool(
#     minconn=1,
#     maxconn=10,
#     dbname="clustermail",
#     user="postgres",
#     password="postgres",
#     host="localhost",
#     port="6543"
# )

# def get_db_connection():
#     """Retrieve a connection from the pool."""
#     return connection_pool.getconn()

# def release_db_connection(conn):
#     """Return a connection to the pool."""
#     connection_pool.putconn(conn)

# def fetch_user_emails(user_email: str) -> List[Dict]:
#     """
#     Fetch all emails for the given user from the Emails table.
#     Combines the subject and body into a single 'email_text' field.
#     """
#     conn = get_db_connection()
#     try:
#         cur = conn.cursor()
#         cur.execute(
#             "SELECT email_id, subj, body FROM Emails WHERE user_email_address = %s",
#             (user_email,)
#         )
#         rows = cur.fetchall()
#     finally:
#         release_db_connection(conn)
    
#     # Combine subject and body as the text used for clustering
#     emails = []
#     for row in rows:
#         email_id = row[0]
#         subj = row[1] if row[1] is not None else ""
#         body = row[2] if row[2] is not None else ""
#         email_text = (subj + " " + body).strip()
#         emails.append({"email_id": email_id, "email_text": email_text})
#     return emails

# def bulk_store_topics(topics_list: List[Tuple[int, str]]):
#     """
#     Bulk insert topics into the Groups table.
#     Each tuple should be (group_id, topic_name).
#     """
#     conn = get_db_connection()
#     try:
#         cur = conn.cursor()
#         query = """
#             INSERT INTO Groups (group_id, name)
#             VALUES (%s, %s)
#             ON CONFLICT (group_id) DO NOTHING
#         """
#         cur.executemany(query, topics_list)
#         conn.commit()
#     except Exception as e:
#         conn.rollback()
#         raise e
#     finally:
#         release_db_connection(conn)

# def bulk_associate_emails(email_topic_list: List[Tuple[int, str]]):
#     """
#     Bulk insert email-to-topic associations into the GroupEmail table.
#     Each tuple should be (group_id, email_id).
#     """
#     conn = get_db_connection()
#     try:
#         cur = conn.cursor()
#         query = """
#             INSERT INTO GroupEmail (group_id, email_id)
#             VALUES (%s, %s)
#             ON CONFLICT DO NOTHING
#         """
#         cur.executemany(query, email_topic_list)
#         conn.commit()
#     except Exception as e:
#         conn.rollback()
#         raise e
#     finally:
#         release_db_connection(conn)

# @app.get("/topics")
# def get_topics(user_email: str = Query(..., description="User's email address")):
#     """
#     Retrieve topics for a specific user by clustering emails (using only the text).
#     Outliers (BERTopic returns -1) are labeled as "Outlier".
#     Bulk insert topics into Groups and email associations into GroupEmail.
#     """
#     emails = fetch_user_emails(user_email)
#     if not emails:
#         raise HTTPException(status_code=404, detail="No emails found for this user.")
    
#     # Extract email texts for clustering
#     documents = [email["email_text"] for email in emails]
#     model_file = f"bertopic_{user_email}.pkl"
    
#     # Load or create a BERTopic model for the user
#     if os.path.exists(model_file):
#         try:
#             topic_model = BERTopic.load(model_file)
#             topics, _ = topic_model.transform(documents)
#         except Exception as e:
#             print(f"Error loading model for {user_email}: {e}. Creating a new model.")
#             topic_model = BERTopic()
#             topics, _ = topic_model.fit_transform(documents)
#     else:
#         topic_model = BERTopic()
#         topics, _ = topic_model.fit_transform(documents)
    
#     # Save the model for future use
#     topic_model.save(model_file)
    
#     # Get topic info from the model
#     topic_info = topic_model.get_topic_info()
    
#     # Build a DataFrame for vectorized processing
#     topics_array = np.array(topics)
#     email_df = pd.DataFrame(emails)
#     email_df["group_id"] = topics_array
#     # Map group_id to topic_name; if group_id == -1, label as "Outlier"
#     email_df["topic_name"] = email_df["group_id"].map(
#         lambda tid: "Outlier" if tid == -1 else (topic_info.loc[tid, "Name"] if tid in topic_info.index else f"Topic {tid}")
#     )
    
#     # Prepare bulk insert data for topics (unique topics)
#     unique_topics = email_df[["group_id", "topic_name"]].drop_duplicates()
#     topics_list = [
#         (row["group_id"], row["topic_name"])
#         for _, row in unique_topics.iterrows()
#     ]
#     bulk_store_topics(topics_list)
    
#     # Prepare bulk insert data for email-topic associations
#     email_topic_list = [
#         (row["group_id"], row["email_id"])
#         for _, row in email_df.iterrows()
#     ]
#     bulk_associate_emails(email_topic_list)
    
#     return {
#         "topic_info": topic_info.to_dict(),
#         "email_topics": email_df.to_dict(orient="records")
#     }

# @app.get("/")
# def read_root():
#     return {"Hello": "World"}
