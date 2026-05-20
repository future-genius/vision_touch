import os
import subprocess
import sys

def build():
    print("[VisionTouch Compiler] Starting standalone desktop compiler...")
    
    # Base workspace directory
    workspace_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Construct PyInstaller command args
    # - --onedir keeps DLLs unpacked for instant startup speeds
    # - --windowed hides backend command line consoles
    # - --add-data includes backend configs/scripts and public task/pkl model files
    cmd = [
        "pyinstaller",
        "--noconfirm",
        "--onedir",
        "--windowed",
        "--name=VisionTouch",
        "--add-data=backend;backend",
        "--add-data=public;public",
        "app_desktop.py"
    ]
    
    # Resolve pyinstaller path from virtual environment if possible
    pyinstaller_exe = "pyinstaller"
    venv_bin = os.path.join(workspace_dir, ".venv", "Scripts", "pyinstaller.exe")
    if os.path.exists(venv_bin):
        pyinstaller_exe = venv_bin
        cmd[0] = pyinstaller_exe
        
    print(f"[VisionTouch Compiler] Running: {' '.join(cmd)}")
    
    # Execute build process
    process = subprocess.Popen(
        cmd,
        cwd=workspace_dir,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1
    )
    
    # Log build steps in real-time
    if process.stdout:
        for line in process.stdout:
            print(f"[PyInstaller] {line.strip()}")
            
    process.wait()
    
    if process.returncode == 0:
        print("\n[VisionTouch Compiler] BUILD COMPLETED SUCCESSFULLY!")
        print(f"[VisionTouch Compiler] Standalone bundle created at: {os.path.join(workspace_dir, 'dist', 'VisionTouch')}")
    else:
        print(f"\n[VisionTouch Compiler] BUILD FAILED WITH EXIT CODE: {process.returncode}")
        sys.exit(process.returncode)

if __name__ == "__main__":
    build()
