#!/usr/bin/env python3
"""
Direct GAIA dataset download using requests
"""

import json
import os
import sys
from pathlib import Path
import requests

def download_gaia():
    """Download GAIA dataset directly from Hugging Face."""
    
    token = os.environ.get("HF_TOKEN") or os.environ.get("HUGGING_FACE_API_KEY")
    if not token:
        print("Error: No HF_TOKEN or HUGGING_FACE_API_KEY found in environment")
        sys.exit(1)
    
    print("Downloading GAIA dataset directly...")
    
    # Create output directory
    data_dir = Path(__file__).parent / "output"
    data_dir.mkdir(exist_ok=True)
    
    # Base URL for GAIA dataset files
    base_url = "https://huggingface.co/datasets/gaia-benchmark/GAIA/resolve/main/2023"
    
    # Files to download
    files = {
        "validation": "validation.jsonl",
        "test": "test.jsonl"
    }
    
    headers = {
        "Authorization": f"Bearer {token}"
    }
    
    for split_name, filename in files.items():
        print(f"Downloading {split_name} split...")
        
        url = f"{base_url}/{filename}"
        
        try:
            response = requests.get(url, headers=headers, stream=True)
            response.raise_for_status()
            
            # Parse JSONL and convert to JSON
            items = []
            for line in response.iter_lines():
                if line:
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
            
            # Save to JSON file
            output_file = data_dir / f"{split_name}.json"
            with open(output_file, "w", encoding="utf-8") as f:
                json.dump(items, f, indent=2, ensure_ascii=False)
            
            print(f"Saved {len(items)} items to {output_file}")
            
        except requests.exceptions.HTTPError as e:
            if e.response.status_code == 404:
                print(f"Warning: {split_name} split not found")
            else:
                print(f"Error downloading {split_name}: {e}")
        except Exception as e:
            print(f"Error processing {split_name}: {e}")
    
    # Create metadata file
    metadata = {
        "dataset": "gaia-benchmark/GAIA",
        "config": "2023",
        "download_method": "direct"
    }
    
    with open(data_dir / "metadata.json", "w") as f:
        json.dump(metadata, f, indent=2)
    
    print("\nDownload complete!")
    print(f"Data saved to: {data_dir}")

if __name__ == "__main__":
    download_gaia()