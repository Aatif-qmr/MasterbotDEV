import os
import subprocess
import time
import concurrent.futures
import re
import threading
import sys
import queue

WORKSPACE_DIR = "/Users/aatifquamre/Downloads/download-now-sort-later/MasterbotDEV"
GEMINI_BIN = os.path.join(WORKSPACE_DIR, "gemini-cli-0.41.2/bundle/gemini.js")
OUTPUT_FILE = os.path.join(WORKSPACE_DIR, "project_details.md")

# Available models
AVAILABLE_MODELS = [
    "gemini-3.1-pro-preview",
    "gemini-3-flash-preview",
    "gemini-3.1-flash-lite-preview",
    "gemini-2.5-pro",
    "gemini-2.5-flash",
    "gemini-2.5-flash-lite"
]

MAX_WORKERS = 6
file_lock = threading.Lock()
model_lock = threading.Lock()
exhausted_models = set()
model_queue = queue.Queue()
for m in AVAILABLE_MODELS:
    model_queue.put(m)

# Global stop event
stop_event = threading.Event()

EXCLUDE_DIRS = {'node_modules', 'dist', 'build', 'target', '.git', 'bundle', '.gemini', 'icons', 'assets', 'public', 'docs', 'evals', 'scripts', 'coverage'}
EXCLUDE_EXTS = {'.png', '.jpg', '.jpeg', '.ico', '.icns', '.gif', '.json', '.lock', '.yaml', '.yml', '.svg', '.woff2', '.ttf', '.md', '.txt', '.toml', '.html'}

def get_source_files(root_dir):
    source_files = []
    for dirpath, dirnames, filenames in os.walk(root_dir):
        dirnames[:] = [d for d in dirnames if d not in EXCLUDE_DIRS]
        for file in filenames:
            ext = os.path.splitext(file)[1].lower()
            if ext not in EXCLUDE_EXTS and not file.startswith('.'):
                source_files.append(os.path.relpath(os.path.join(dirpath, file), WORKSPACE_DIR))
    return source_files

def analyze_file(rel_path, max_retries=2):
    if stop_event.is_set():
        return None, "STOPPED"

    for attempt in range(max_retries + 1):
        if stop_event.is_set():
            return None, "STOPPED"

        model = None
        try:
            # Wait for a model. If none available, check if it's because they are all exhausted.
            while not stop_event.is_set():
                try:
                    model = model_queue.get(timeout=1)
                    break
                except queue.Empty:
                    with model_lock:
                        if len(exhausted_models) >= len(AVAILABLE_MODELS):
                            stop_event.set()
                            return None, "ALL_MODELS_EXHAUSTED"
                    continue
        except Exception:
            return None, "ERROR"

        if stop_event.is_set():
            if model: model_queue.put(model)
            return None, "STOPPED"

        prompt = f"Read the file '{rel_path}' and provide a concise 2-sentence summary of its purpose and its usage in the project. Output ONLY the summary text."
        cmd = ["node", GEMINI_BIN, "--model", model, "--skip-trust", "--extensions", "", prompt]
        
        try:
            time.sleep(0.5)
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=90, cwd=WORKSPACE_DIR)
            output = result.stdout.strip()
            stderr = result.stderr.strip()
            
            if "QUOTA_EXHAUSTED" in output or "QUOTA_EXHAUSTED" in stderr or "exhausted your capacity" in output:
                with model_lock:
                    if model not in exhausted_models:
                        print(f"!!! Model {model} reached quota limit. Removing from pool.")
                        exhausted_models.add(model)
                # Attempt retry with a DIFFERENT model
                continue 

            # Success or non-quota failure: put model back
            model_queue.put(model)

            output = re.sub(r'\[(ExtensionManager|ImportProcessor|ERROR|INFO|DEBUG|WARN)\].*?\n', '', output, flags=re.MULTILINE).strip()
            
            if result.returncode == 0 and output and "Error" not in output:
                if output.startswith("```"):
                    lines = output.split("\n")
                    if len(lines) > 2:
                        output = "\n".join(lines[1:-1])
                return f"### `{rel_path}` (Model: {model})\n\n{output}\n\n", "SUCCESS"
            
            if attempt < max_retries:
                print(f"--- Retrying {rel_path} (Attempt {attempt+2}/{max_retries+1})...")
                continue
                
            return f"### `{rel_path}` (Last Model: {model})\n\n*Failed: {output if output else stderr[:100]}...*\n\n", "FAILED"
        except Exception as e:
            if model: model_queue.put(model)
            if attempt < max_retries:
                continue
            return f"### `{rel_path}`\n\n*Error: {str(e)}*\n\n", "ERROR"
    
    return f"### `{rel_path}`\n\n*Failed after {max_retries+1} attempts.*\n\n", "FAILED"

def main():
    all_files = get_source_files(WORKSPACE_DIR)
    print(f"Found {len(all_files)} files.")
    
    processed = set()
    failed_files = set()
    
    if os.path.exists(OUTPUT_FILE):
        with open(OUTPUT_FILE, 'r') as f:
            content = f.read()
            parts = re.split(r'(?m)^### `', content)
            header = parts[0]
            successful_blocks = []
            
            for part in parts[1:]:
                file_path = part.split('`', 1)[0]
                if '*Failed' not in part and '*Error' not in part:
                    processed.add(file_path)
                    successful_blocks.append("### `" + part)
                else:
                    failed_files.add(file_path)
                    
        with open(OUTPUT_FILE, 'w') as f:
            f.write(header)
            for block in successful_blocks:
                f.write(block)

    files_to_process = [f for f in all_files if f not in processed]
    failed_to_process = [f for f in files_to_process if f in failed_files]
    new_to_process = [f for f in files_to_process if f not in failed_files]
    files_to_process = failed_to_process + new_to_process
    
    total = len(files_to_process)
    print(f"Remaining: {total} (including {len(failed_to_process)} previously failed files)")

    with concurrent.futures.ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        future_to_file = {executor.submit(analyze_file, f): f for f in files_to_process}
        
        count = 0
        for future in concurrent.futures.as_completed(future_to_file):
            if stop_event.is_set():
                break
                
            rel_path = future_to_file[future]
            try:
                result_text, status = future.result()
            except Exception as e:
                print(f"Worker crashed for {rel_path}: {e}")
                continue
            
            if status == "ALL_MODELS_EXHAUSTED":
                print("!!! All models have reached their quota limits. Shutting down.")
                break

            if result_text:
                with file_lock:
                    with open(OUTPUT_FILE, 'a') as f:
                        f.write(result_text)
                        f.flush()
            
            count += 1
            if count % 10 == 0 or count == total:
                print(f"Progress: {count}/{total}")

    if stop_event.is_set():
        print("Process stopped (likely quota exhaustion).")
    else:
        print("Generation complete!")

if __name__ == '__main__':
    main()
