import os
import sys
import json
from openai import OpenAI

client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))

audio_file_path = sys.argv[1]
output_file = sys.argv[2]

print(f"Transcribing: {audio_file_path}")

with open(audio_file_path, 'rb') as audio_file:
    transcript = client.audio.transcriptions.create(
        model="whisper-1",
        file=audio_file,
        response_format="verbose_json",
        timestamp_granularities=["word"]
    )

# Save full response
result = {
    "text": transcript.text,
    "words": transcript.words if hasattr(transcript, 'words') else [],
    "language": transcript.language if hasattr(transcript, 'language') else "en"
}

with open(output_file, 'w') as f:
    json.dump(result, f, indent=2)

print(f"✅ Transcription complete!")
print(f"Text: {transcript.text[:100]}...")
print(f"Words with timestamps: {len(result['words'])}")
