import psycopg2
import json
from datetime import datetime


    

message = input("Enter a message: ")

# Connect to the database (change the names as needed)
conn = psycopg2.connect(
    dbname="tn chatbot",
    user="postgres",
    password="postgres",
    host="localhost"
)
cur = conn.cursor()

# New messages to append
new_message = {"user": message, "bot": "Test 3"}

# Fetch existing history
cur.execute("SELECT chat_history FROM session_data WHERE user_id = %s", (user_id,))
result = cur.fetchone()
if result:
    chat_history = result[0]
    chat_history.append(new_message)

    # Update row
    cur.execute(
        "UPDATE session_data SET chat_history = %s, last_update = %s WHERE user_id = %s",
        (json.dumps(chat_history), datetime.now(), user_id)
    )
else:
    chat_history = [new_message]

    #Create new row and insert message
    cur.execute(
        "INSERT INTO session_data (user_id, chat_history, last_update) VALUES (%s, %s, %s)",
        (user_id, json.dumps(chat_history), datetime.now())
    )

conn.commit()
cur.close()
conn.close()
