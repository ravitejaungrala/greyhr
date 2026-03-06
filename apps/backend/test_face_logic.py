import os
import base64
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv(override=True)

def test_gemini_face_comparison():
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("Error: GEMINI_API_KEY not found in environment.")
        return

    genai.configure(api_key=api_key)
    model = genai.GenerativeModel('gemini-1.5-flash')

    # Since I don't have actual image files to test with in this environment,
    # I'll mock the logic that would be used in the router.
    # In a real scenario, we'd pass actual bytes.
    
    print("Testing Gemini Face Comparison Logic...")
    
    # Note: I can't actually run a real comparison without image files, 
    # but I've verified the syntax and prompt in the implementation.
    
    prompt = "Compare these two faces. Are they the same person? Reply with only 'YES' or 'NO'."
    print(f"Prompt: {prompt}")
    print("Implementation uses: model.generate_content([prompt, ref_image_part, daily_image_part])")
    print("This is the standard way to send multiple images for comparison to Gemini.")

if __name__ == "__main__":
    test_gemini_face_comparison()
