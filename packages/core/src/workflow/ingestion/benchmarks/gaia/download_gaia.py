#!/usr/bin/env python3
"""
Download and cache GAIA dataset locally
This script downloads the GAIA dataset and saves it as JSON files for easy access.
"""

import json
import os
import sys
from pathlib import Path

def download_gaia():
    """Download GAIA dataset and save as JSON files."""
    try:
        from datasets import load_dataset
    except ImportError:
        print("Error: datasets library not installed. Run: pip install datasets")
        sys.exit(1)
    
    # Get token from environment
    token = os.environ.get("HF_TOKEN") or os.environ.get("HUGGING_FACE_API_KEY")
    if not token:
        print("Error: No HF_TOKEN or HUGGING_FACE_API_KEY found in environment")
        sys.exit(1)
    
    print("Downloading GAIA dataset...")
    
    try:
        # Load the dataset with config
        dataset = load_dataset(
            "gaia-benchmark/GAIA", 
            "2023",
            token=token,
            trust_remote_code=True
        )
        
        # Create output directory
        data_dir = Path(__file__).parent / "output"
        data_dir.mkdir(exist_ok=True)
        
        # Process each split
        for split_name in ["validation", "test"]:
            if split_name not in dataset:
                print(f"Warning: Split '{split_name}' not found in dataset")
                continue
            
            print(f"Processing {split_name} split...")
            split_data = dataset[split_name]
            
            # Convert to list of dicts
            items = []
            for item in split_data:
                # Convert to JSON-serializable format
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
        
        # Create metadata file
        metadata = {
            "dataset": "gaia-benchmark/GAIA",
            "config": "2023",
            "splits": list(dataset.keys()),
            "total_items": sum(len(dataset[split]) for split in dataset.keys())
        }
        
        with open(data_dir / "metadata.json", "w") as f:
            json.dump(metadata, f, indent=2)
        
        print("\nDownload complete!")
        print(f"Data saved to: {data_dir}")
        
    except Exception as e:
        import traceback
        print(f"Error downloading dataset: {e}")
        print("Full traceback:")
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    download_gaia()