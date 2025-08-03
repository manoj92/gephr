#!/usr/bin/env python3
"""
Script to run tests with proper configuration
"""
import subprocess
import sys
import os

def run_tests():
    """Run the test suite"""
    # Set environment for testing
    os.environ["TESTING"] = "1"
    
    # Test command
    cmd = [
        "python", "-m", "pytest",
        "tests/",
        "-v",
        "--tb=short",
        "--cov=app",
        "--cov-report=term-missing",
        "--cov-report=html:htmlcov",
        "--asyncio-mode=auto"
    ]
    
    print("Running tests...")
    print(" ".join(cmd))
    
    result = subprocess.run(cmd, cwd=os.path.dirname(os.path.abspath(__file__)))
    
    if result.returncode == 0:
        print("\n✅ All tests passed!")
        print("📊 Coverage report generated in htmlcov/index.html")
    else:
        print("\n❌ Some tests failed!")
        sys.exit(1)

if __name__ == "__main__":
    run_tests()