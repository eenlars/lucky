#!/usr/bin/env python3
"""
Download GAIA dataset metadata files
"""

import json
import os
import sys
from pathlib import Path
import requests

def download_gaia():
    """Download GAIA dataset metadata files."""
    
    token = os.environ.get("HF_TOKEN") or os.environ.get("HUGGING_FACE_API_KEY")
    if not token:
        print("Error: No HF_TOKEN or HUGGING_FACE_API_KEY found in environment")
        sys.exit(1)
    
    print("Downloading GAIA dataset metadata...")
    
    # Create output directory
    data_dir = Path(__file__).parent / "output"
    data_dir.mkdir(exist_ok=True)
    
    # Base URL for GAIA dataset files
    base_url = "https://huggingface.co/datasets/gaia-benchmark/GAIA/resolve/main/2023"
    
    # Files to download
    files = {
        "validation": "validation/metadata.jsonl",
        "test": "test/metadata.jsonl"
    }
    
    headers = {
        "Authorization": f"Bearer {token}"
    }
    
    for split_name, filepath in files.items():
        print(f"Downloading {split_name} metadata...")
        
        url = f"{base_url}/{filepath}"
        
        try:
            response = requests.get(url, headers=headers)
            response.raise_for_status()
            
            # Parse JSONL and convert to JSON
            items = []
            for line in response.text.strip().split('\n'):
                if line:
                    try:
                        item = json.loads(line)
                        # Convert to our format
                        json_item = {
                            "task_id": item.get("task_id"),
                            "Question": item.get("Question"),
                            "Level": int(item.get("Level", 0)),
                        }
                        
                        # Add optional fields
                        if "Final answer" in item and item["Final answer"]:
                            json_item["Final answer"] = str(item["Final answer"])
                        if "file_name" in item and item["file_name"]:
                            json_item["file_name"] = str(item["file_name"])
                        
                        items.append(json_item)
                    except json.JSONDecodeError as e:
                        print(f"Error parsing line: {e}")
                        print(f"Line content: {line[:100]}...")
            
            # Save to JSON file
            output_file = data_dir / f"{split_name}.json"
            with open(output_file, "w", encoding="utf-8") as f:
                json.dump(items, f, indent=2, ensure_ascii=False)
            
            print(f"Saved {len(items)} items to {output_file}")
            
        except requests.exceptions.HTTPError as e:
            print(f"Error downloading {split_name}: HTTP {e.response.status_code}")
            print(f"Response: {e.response.text[:200]}...")
        except Exception as e:
            print(f"Error processing {split_name}: {e}")
            import traceback
            traceback.print_exc()
    
    # Create metadata file
    metadata = {
        "dataset": "gaia-benchmark/GAIA",
        "config": "2023",
        "download_method": "metadata"
    }
    
    with open(data_dir / "metadata.json", "w") as f:
        json.dump(metadata, f, indent=2)
    
    print("\nDownload complete!")
    print(f"Data saved to: {data_dir}")

if __name__ == "__main__":
    download_gaia()