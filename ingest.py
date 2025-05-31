from gitingest import ingest
import os

# Get the directory where the script is located
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

tasks = [
    {
        # Use os.path.join to create absolute path relative to script location
        "source": os.path.join(SCRIPT_DIR),
        "output": os.path.join(SCRIPT_DIR, "be-lumbung-mesari.txt")
    },
]

def ingest_task(task_list=None):
    """
    Process the given tasks or default tasks if none provided
    
    Args:
        task_list (list, optional): List of tasks to process. Each task should be a dict
            with 'source' and 'output' keys. Defaults to None.
    """
    tasks_to_process = task_list if task_list is not None else tasks
    
    for task in tasks_to_process:
        print("Processing task:")
        print(f"  Source: {task['source']}")
        print(f"  Output: {task['output']}")
        
        # Delete the output file if it exists
        if os.path.exists(task["output"]):
            os.remove(task["output"])
            print(f"Deleted existing file: {task['output']}")
        
        # Await the async function call instead of using asyncio.run
        ingest(
            task["source"],
            exclude_patterns={"*.env"},
            output=task["output"]
        )

if __name__ == "__main__":
    # Only run this when script is run directly, not when imported
    ingest_task()