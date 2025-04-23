import os
from datetime import datetime

USER_COUNT_FILE = "user_count.log"

def increment_user_count():

    """
    Increments the user count in a log file. If the file doesn't exist, it initializes it.
    """
    if not os.path.exists(USER_COUNT_FILE):
        # Create the file and initialize the count to 0
        with open(USER_COUNT_FILE, "w", encoding="utf-8") as count_file:
            count_file.write("0\n")

    # Read the current count, increment it, and write back
    with open(USER_COUNT_FILE, "r+", encoding="utf-8") as count_file:
        current_count = int(count_file.readline().strip())
        new_count = current_count + 1
        count_file.seek(0)
        count_file.write(f"{new_count}\n")


def save_choice():
    # Ask user if they would like to save their conversation history
    while True:
        save_input = input("Do you want to save your conversation history? (yes/no): ").strip().lower()
        if save_input == "yes":
            # Create the 'logs' folder if it doesn't exist
            logs_folder = "logs"
            os.makedirs(logs_folder, exist_ok=True)

            # Increment user count
            increment_user_count()

            
            # Create a timestamp to identify this conversation session
            session_start = datetime.now()

            # Build the log file path inside the 'logs' folder
            log_filename = os.path.join(
                logs_folder, f"conversation_{session_start.strftime('%Y%m%d_%H%M%S')}.log"
            )

            # Write the initial line in the log file to indicate the session start
            with open(log_filename, "a", encoding="utf-8") as log_file:
                log_file.write(f"Conversation start time: {session_start}\n\n")
            return log_filename
        elif save_input == 'no':
            return False
        else:
            print("Invalid input. Please type 'yes' or 'no'. ")


def logging(log_filename,msg1,msg2):
    # Log the user input
    with open(log_filename, "a", encoding="utf-8") as log_file:
        log_file.write(f"[User] {msg1}\n")
    with open(log_filename, "a", encoding="utf-8") as log_file:
        log_file.write(f"[AI]   {msg2}\n")

    

 