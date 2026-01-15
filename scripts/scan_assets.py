import os
import json

# Configuration
ASSETS_DIR = 'assets'
OUTPUT_FILE = 'content.json'
IGNORE = ['.git', '.github', '.DS_Store', 'News']

# Categories (Exact match to your folders)
CATEGORIES = ["Course Notes", "Presentations", "Audio", "Video", "Quizzes", "Miscellaneous"]

# File Types
TYPE_MAP = {
    '.pdf': 'pdf', '.doc': 'word', '.docx': 'word', '.txt': 'doc',
    '.mp3': 'audio', '.wav': 'audio', '.m4a': 'audio',
    '.mp4': 'video', '.mov': 'video', '.mkv': 'video',
    '.png': 'image', '.jpg': 'image', '.jpeg': 'image',
    '.ppt': 'ppt', '.pptx': 'ppt', '.xls': 'excel', '.xlsx': 'excel',
    '.json': 'quiz'
}

course_data = { "news": [], "modules": [] }

print("🤖 Robot Starting...")

if os.path.exists(ASSETS_DIR):
    
    # 1. SCAN NEWS
    news_dir = os.path.join(ASSETS_DIR, 'News')
    if os.path.exists(news_dir):
        files = sorted([f for f in os.listdir(news_dir) if f.endswith('.txt')], reverse=True)
        for n_file in files:
            header = os.path.splitext(n_file)[0].replace('_', ' ')
            with open(os.path.join(news_dir, n_file), 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read().strip()
            course_data["news"].append({ "date": header, "text": content })

    # 2. SCAN MODULES
    modules = sorted([d for d in os.listdir(ASSETS_DIR) if os.path.isdir(os.path.join(ASSETS_DIR, d))])
    
    for mod_folder in modules:
        if mod_folder in IGNORE: continue
        
        clean_name = mod_folder[3:] if mod_folder[:2].isdigit() and mod_folder[2] == '_' else mod_folder
        module_obj = { "title": clean_name.replace('_', ' '), "folder": mod_folder, "units": [] }

        mod_path = os.path.join(ASSETS_DIR, mod_folder)
        units = sorted([d for d in os.listdir(mod_path) if os.path.isdir(os.path.join(mod_path, d))])

        for unit_folder in units:
            unit_obj = { "name": unit_folder.replace('_', ' '), "resources": [] }
            unit_path = os.path.join(mod_path, unit_folder)
            
            for cat in CATEGORIES:
                cat_path = os.path.join(unit_path, cat)
                if os.path.exists(cat_path):
                    files = sorted([f for f in os.listdir(cat_path) if not f.startswith('.')])
                    for filename in files:
                        name, ext = os.path.splitext(filename)
                        if ext.lower() in TYPE_MAP:
                            link = f"{ASSETS_DIR}/{mod_folder}/{unit_folder}/{cat}/{filename}"
                            unit_obj["resources"].append({
                                "category": cat,
                                "type": TYPE_MAP[ext.lower()],
                                "title": name.replace('_', ' '),
                                "link": link
                            })
            module_obj["units"].append(unit_obj)
        course_data["modules"].append(module_obj)

with open(OUTPUT_FILE, 'w') as f:
    json.dump(course_data, f, indent=4)

print("✅ content.json updated successfully.")