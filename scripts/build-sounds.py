"""Retained early two-beat experiment; the current default is the approved E recording mix."""
from pathlib import Path
import argparse
import wave
import numpy as np
RATE=44100
parser=argparse.ArgumentParser();parser.add_argument('--output',type=Path,default=Path(__file__).resolve().parents[1]/'work/audio/level-complete-original.wav');out=parser.parse_args().output;out.parent.mkdir(parents=True,exist_ok=True)
y=np.zeros((int(RATE*1.7),2),dtype=np.float64)
rng=np.random.default_rng(160)
# Two clear attacks: a light dominant chime, then a warmer resolving major chord.
for when,frequencies,gain,length in [(0.035,[392.00,493.883,587.330],.12,.48),(.365,[523.251,659.255,783.991],.15,.9)]:
 t=np.arange(int(RATE*length))/RATE
 for i,f in enumerate(frequencies):
  attack=1-np.exp(-t/.0035)
  body=np.sin(2*np.pi*f*t)*np.exp(-t/(.15 if when<.1 else .27))
  partial=.19*np.sin(2*np.pi*f*2*t)*np.exp(-t/.11)+.07*np.sin(2*np.pi*f*3*t)*np.exp(-t/.055)
  sig=(body+partial)*attack*gain/len(frequencies)
  pans=[(.9,.7),(.72,.9),(.82,.82)][i]
  start=int(when*RATE)
  for ch,level in enumerate(pans):y[start:start+len(t),ch]+=sig*level
 # Gentle breath on the attack, kept below the pitched tones.
 n=rng.normal(0,1,len(t))*np.exp(-t/.009)*(.0015 if when<.1 else .002)
 y[start:start+len(t),:]+=n[:,None]
# Short stereo early reflections create a soft tail without a third musical beat.
wet=np.zeros_like(y)
for delay,level in [(.043,.10),(.079,.075),(.127,.045),(.181,.025)]:
 k=int(RATE*delay);wet[k:]+=y[:-k,::-1]*level
y+=wet
fade=int(.25*RATE);y[-fade:]*=np.linspace(1,0,fade)[:,None]
y=y/max(np.max(np.abs(y)),1e-6)*.62
with wave.open(str(out),'wb') as w:w.setnchannels(2);w.setsampwidth(2);w.setframerate(RATE);w.writeframes((y*32767).astype('<i2').tobytes())
print(out)
