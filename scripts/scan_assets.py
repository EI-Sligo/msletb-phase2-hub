import os
import json

# Configuration
ASSETS_DIR = 'assets'
OUTPUT_FILE = 'content.json'

# Folders to ignore
IGNORE = ['.git', '.github', '.DS_Store', 'News'] # We scan News separately

# Categories
CATEGORIES = ["Course Notes", "Presentations", "Audio", "Video", "Miscellaneous"]

# File Types
TYPE_MAP = {
    '.pdf': 'pdf', '.doc': 'word', '.docx': 'word', '.txt': 'doc',
    '.mp3': 'audio', '.wav': 'audio', '.m4a': 'audio',
    '.mp4': 'video', '.mov': 'video', '.mkv': 'video',
    '.png': 'image', '.jpg': 'image', '.jpeg': 'image',
    '.ppt': 'ppt', '.pptx': 'ppt', '.xls': 'excel', '.xlsx': 'excel', '.csv': 'excel'
}

course_data = {
    "news": [],
    "modules": []
}

print("🤖 Robot Starting...")

if os.path.exists(ASSETS_DIR):
    
    # --- 1. SCAN NEWS ---
    news_dir = os.path.join(ASSETS_DIR, 'News')
    if os.path.exists(news_dir):
        print("   Creating News Feed...")
        news_files = sorted([f for f in os.listdir(news_dir) if f.endswith('.txt')], reverse=True)
        
        for n_file in news_files:
            # Filename becomes the Date/Header (e.g., "Jan_20.txt" -> "Jan 20")
            header = os.path.splitext(n_file)[0].replace('_', ' ')
            
            # File content becomes the message
            with open(os.path.join(news_dir, n_file), 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read().strip()
                
            course_data["news"].append({
                "date": header,
                "text": content
            })

    # --- 2. SCAN MODULES ---
    modules = sorted([d for d in os.listdir(ASSETS_DIR) if os.path.isdir(os.path.join(ASSETS_DIR, d))])
    
    for mod_folder in modules:
        if mod_folder in IGNORE or mod_folder == 'News': continue

        # Format Title
        clean_name = mod_folder[3:] if mod_folder[:2].isdigit() and mod_folder[2] == '_' else mod_folder
        mod_title = clean_name.replace('_', ' ')
        
        module_obj = { "title": mod_title, "folder": mod_folder, "units": [] }

        # Scan Units
        mod_path = os.path.join(ASSETS_DIR, mod_folder)
        units = sorted([d for d in os.listdir(mod_path) if os.path.isdir(os.path.join(mod_path, d))])

        for unit_folder in units:
            unit_title = unit_folder.replace('_', ' ')
            unit_obj = { "name": unit_title, "resources": [] }

            # Scan Sub-folders
            unit_path = os.path.join(mod_path, unit_folder)
            
            # Check for categories (Audio, Video, etc.)
            for cat in CATEGORIES:
                cat_path = os.path.join(unit_path, cat)
                if os.path.exists(cat_path):
                    files = sorted([f for f in os.listdir(cat_path) if not f.startswith('.')])
                    for filename in files:
                        name, ext = os.path.splitext(filename)
                        ext = ext.lower()
                        if ext in TYPE_MAP:
                            link = f"{ASSETS_DIR}/{mod_folder}/{unit_folder}/{cat}/{filename}"
                            unit_obj["resources"].append({
                                "category": cat,
                                "type": TYPE_MAP[ext],
                                "title": name.replace('_', ' '),
                                "link": link
                            })

            # Check for loose files in the unit root (optional fallback)
            loose_files = sorted([f for f in os.listdir(unit_path) if os.path.isfile(os.path.join(unit_path, f)) and not f.startswith('.')])
            for filename in loose_files:
                name, ext = os.path.splitext(filename)
                ext = ext.lower()
                if ext in TYPE_MAP:
                     link = f"{ASSETS_DIR}/{mod_folder}/{unit_folder}/{filename}"
                     unit_obj["resources"].append({
                        "category": "Miscellaneous",
                        "type": TYPE_MAP[ext],
                        "title": name.replace('_', ' '),
                        "link": link
                    })

            module_obj["units"].append(unit_obj)
        
        course_data["modules"].append(module_obj)

with open(OUTPUT_FILE, 'w') as f:
    json.dump(course_data, f, indent=4)

print("✅ Scan Complete. News and Modules updated.")