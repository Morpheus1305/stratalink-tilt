import json
import os


def write_json(data):
    """
    Write the daily summary to a JSON file.
    """
    output_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    json_path = os.path.join(output_dir, "output", "daily_summary.json")
    
    os.makedirs(os.path.dirname(json_path), exist_ok=True)
    
    with open(json_path, "w") as f:
        json.dump(data, f, indent=2)
    
    print(f"JSON summary written to {json_path}")
