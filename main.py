import sys
import os
import subprocess

if __name__ == "__main__":
    # Resolve absolute path to the backend/main.py script
    current_dir = os.path.dirname(os.path.abspath(__file__))
    backend_main = os.path.join(current_dir, "backend", "main.py")
    
    if not os.path.exists(backend_main):
        print(f"Error: Backend entry point not found at: {backend_main}")
        sys.exit(1)
        
    # Execute the backend/main.py script using the same Python interpreter
    cmd = [sys.executable, backend_main] + sys.argv[1:]
    
    try:
        # Run subprocess and inherit stdin, stdout, and stderr
        res = subprocess.run(cmd)
        sys.exit(res.returncode)
    except KeyboardInterrupt:
        sys.exit(0)
    except Exception as e:
        print(f"Failed to forward execution to backend: {e}")
        sys.exit(1)
