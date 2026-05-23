import os

log_path = r"C:\Users\sanat\.gemini\antigravity\brain\d7fc0a76-7c33-461c-a192-9a7b6192e318\.system_generated\tasks\task-333.log"
if os.path.exists(log_path):
    with open(log_path, "r") as f:
        lines = f.readlines()
    print("Total lines:", len(lines))
    # Look for Tracebacks
    in_traceback = False
    traceback_lines = []
    for line in lines:
        if "traceback" in line.lower() or "exception" in line.lower() or "500 internal server error" in line.lower():
            in_traceback = True
        if in_traceback:
            traceback_lines.append(line)
            if "info:" in line.lower() or "error:" in line.lower() and not ("traceback" in line.lower() or "most recent call" in line.lower()):
                # Only keep printing traceback lines
                pass
    
    # Alternatively, print the last 150 lines
    print("\n--- Last 150 lines of server log ---")
    for line in lines[-150:]:
        print(line.strip())
else:
    print("Log file not found:", log_path)
