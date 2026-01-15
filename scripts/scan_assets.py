import os
import json

# Configuration
ASSETS_DIR = 'assets'
OUTPUT_FILE = 'content.json'

# Defined Sub-categories (Must match your folder names exactly)
CATEGORIES = [
    "Course Notes", 
    "Presentations", 
    "Audio", 
    "Video", 
    "Miscellaneous"
]

# File Type Mapping
TYPE_MAP = {
    '.pdf': 'pdf', '.doc': 'word', '.docx': 'word', '.txt': 'doc',
    '.mp3': 'audio', '.wav': 'audio', '.m4a': 'audio',
    '.mp4': 'video', '.mov': 'video', '.mkv': 'video',
    '.png': 'image', '.jpg': 'image', '.jpeg': 'image',
    '.ppt': 'ppt', '.pptx': 'ppt', '.xls': 'excel', '.xlsx': 'excel', '.csv': 'excel'
}

course_data = { "modules": [] }

print("🤖 Scanning assets with Sub-folders...")

if os.path.exists(ASSETS_DIR):
    # 1. SCAN MODULES
    modules = sorted([d for d in os.listdir(ASSETS_DIR) if os.path.isdir(os.path.join(ASSETS_DIR, d))])
    
    for mod_folder in modules:
        if mod_folder.startswith('.'): continue

        # Clean Title
        clean_name = mod_folder[3:] if mod_folder[:2].isdigit() and mod_folder[2] == '_' else mod_folder
        mod_title = clean_name.replace('_', ' ')
        
        module_obj = {
            "title": mod_title,
            "folder": mod_folder,
            "units": []
        }

        # 2. SCAN UNITS
        mod_path = os.path.join(ASSETS_DIR, mod_folder)
        units = sorted([d for d in os.listdir(mod_path) if os.path.isdir(os.path.join(mod_path, d))])

        for unit_folder in units:
            unit_title = unit_folder.replace('_', ' ')
            
            unit_obj = {
                "name": unit_title,
                "resources": []
            }

            # 3. SCAN SUB-FOLDERS (The new layer)
            unit_path = os.path.join(mod_path, unit_folder)
            
            for cat in CATEGORIES:
                cat_path = os.path.join(unit_path, cat)
                
                # Only check if the folder actually exists
                if os.path.exists(cat_path):
                    files = sorted([f for f in os.listdir(cat_path) if not f.startswith('.')])
                    
                    for filename in files:
                        name, ext = os.path.splitext(filename)
                        ext = ext.lower()
                        
                        if ext in TYPE_MAP:
                            # Link includes the category folder now
                            web_link = f"{ASSETS_DIR}/{mod_folder}/{unit_folder}/{cat}/{filename}"
                            display_title = name.replace('_', ' ').replace('-', ' ')
                            
                            unit_obj["resources"].append({
                                "category": cat,  # We save the category here
                                "type": TYPE_MAP[ext],
                                "title": display_title,
                                "link": web_link
                            })

            module_obj["units"].append(unit_obj)
        
        course_data["modules"].append(module_obj)

with open(OUTPUT_FILE, 'w') as f:
    json.dump(course_data, f, indent=4)

print("✅ Scan Complete. Sub-folders processed.")