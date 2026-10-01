"""Create stock synthetic narration locally; never clone a personal voice.

Install kokoro-onnx==0.6.1 and soundfile; set KOKORO_MODEL and KOKORO_VOICES
to the upstream model/voice bundle. Intermediate WAVs live outside the repo.
"""
import json, os, re
from pathlib import Path
import numpy as np
import soundfile as sf
import onnxruntime as ort
from kokoro_onnx import Kokoro

ROOT = Path(__file__).resolve().parents[1]
CACHE = Path(os.environ['NARRATION_CACHE'])
CACHE.mkdir(parents=True, exist_ok=True)
options = ort.SessionOptions()
options.intra_op_num_threads = 2
options.inter_op_num_threads = 1
session = ort.InferenceSession(os.environ['KOKORO_MODEL'], sess_options=options,
                              providers=['CPUExecutionProvider'])
model = Kokoro.from_session(session, os.environ['KOKORO_VOICES'])
pronunciations = {'LLM':'L L M', 'API':'A P I', 'CI':'C I', 'CLI':'C L I',
                  'JSON':'Jason', 'YAML':'yammel', 'AST':'A S T',
                  'SSE':'S S E', 'pgvector':'P G vector', 'RAG':'rag'}
timings = {}
for video in json.loads((ROOT/'content/videos.json').read_text()):
    clips = []
    for scene in video['scenes']:
        text = scene['text']
        if video['id'] == 'rag-walkthrough' and not scene['detail'].startswith('ritesh'):
            text += ' ' + scene['detail'].replace(' · ', '. ')
            if not text.endswith('.'): text += '.'
        spoken = text
        for original, replacement in pronunciations.items():
            spoken = re.sub(r'\b'+original+r'\b', replacement, spoken)
        samples, rate = model.create(spoken, voice='am_michael', speed=1.04, lang='en-us')
        clips.append((text, samples, rate))
    rate = clips[0][2]
    speech_length = sum(len(c[1])/rate for c in clips)
    # Keep natural delivery; adjust film duration instead of squeezing speech.
    duration = max(video['duration'], int(np.ceil(speech_length + len(clips)*0.65)))
    padding = (duration-speech_length)/len(clips)
    cursor = 0.0; timeline = []; combined = []
    for text, samples, _ in clips:
        lead = 0.2; tail = padding-lead
        start = cursor + lead; end = start+len(samples)/rate
        combined.extend([np.zeros(round(lead*rate)), samples, np.zeros(round(tail*rate))])
        timeline.append({'start':round(cursor,3), 'speechStart':round(start,3),
                         'speechEnd':round(end,3), 'end':round(cursor+len(samples)/rate+padding,3),
                         'caption':text})
        cursor += len(samples)/rate+padding
    sf.write(CACHE/(video['id']+'.wav'), np.concatenate(combined), rate)
    timings[video['id']] = {'duration':duration,'voice':'Kokoro stock am_michael',
                           'kind':'Synthetic narration; not Ritesh’s voice','scenes':timeline}
    print(video['id'], duration, 'seconds', flush=True)
(ROOT/'content/video-timings.json').write_text(json.dumps(timings,indent=2)+'\n')
