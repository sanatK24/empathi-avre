import os
import json

EXCLUDED_DIRS = {
    'node_modules', 'dist', 'build', '.git', 'coverage', '.venv', 'venv', 
    'migrations', '__pycache__', '.pytest_cache', 'ml_artifacts', 'logs', 'scratch', '.claude'
}

EXCLUDED_FILES = {
    'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml'
}

VALID_EXTENSIONS = {
    '.js', '.jsx', '.ts', '.tsx', '.css', '.py', '.sql', '.yaml', '.yml'
}

def scan_project(root_dir):
    inventory = []
    
    for root, dirs, files in os.walk(root_dir):
        # Prune excluded directories
        dirs[:] = [d for d in dirs if d not in EXCLUDED_DIRS and not d.startswith('.')]
        
        for file in files:
            if file in EXCLUDED_FILES:
                continue
                
            name, ext = os.path.splitext(file)
            if ext not in VALID_EXTENSIONS:
                continue
                
            full_path = os.path.join(root, file)
            rel_path = os.path.relpath(full_path, root_dir)
            
            # Additional custom filters
            if 'alembic' in rel_path.split(os.sep):
                continue
            
            try:
                with open(full_path, 'r', encoding='utf-8', errors='ignore') as f:
                    lines = f.readlines()
                    line_count = len(lines)
            except Exception:
                line_count = 0
                
            inventory.append({
                'path': rel_path.replace('\\', '/'),
                'ext': ext,
                'loc': line_count
            })
            
    return inventory

if __name__ == '__main__':
    project_root = r'c:\Users\sanat\OneDrive\Desktop\PROJECTS\EmpathI'
    items = scan_project(project_root)
    
    frontend_loc = 0
    backend_loc = 0
    
    frontend_exts = {'.js', '.jsx', '.ts', '.tsx', '.css'}
    backend_exts = {'.py', '.sql', '.yaml', '.yml'}
    
    output_lines = []
    
    for item in items:
        p = item['path']
        loc = item['loc']
        ext = item['ext']
        
        if any(p.startswith(x) for x in ['frontend/src', 'frontend/App', 'frontend/main']):
            frontend_loc += loc
        elif p.startswith('backend/') or p.endswith('.py') or p.endswith('.db'):
            backend_loc += loc
        else:
            if ext in frontend_exts:
                frontend_loc += loc
            elif ext in backend_exts:
                backend_loc += loc
                
        output_lines.append(f"{item['path']}|{item['ext']}|{item['loc']}")
        
    output_lines.append(f"SUMMARY|FRONTEND_LOC:{frontend_loc}|BACKEND_LOC:{backend_loc}|TOTAL_LOC:{frontend_loc+backend_loc}")
    
    out_file = os.path.join(project_root, 'scratch', 'result_utf8.txt')
    with open(out_file, 'w', encoding='utf-8') as f:
        f.write('\n'.join(output_lines))
        
    print("DONE! Wrote to scratch/result_utf8.txt")
