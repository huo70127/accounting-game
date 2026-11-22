# v28 柔和的钱落袋音效

此版已被 v29 替换。用户反馈其听感像关门或整袋钱落桌，说明降低峰值、削高频的数值不能保证硬币声的识别度与舒适度。以下仅保留历史来源和处理记录；当前素材见 `COINS_CLINKS.md`。

替换素材为 Amarikah 的 **Sack of Gold**，协作者 pennomi：

- 来源：https://opengameart.org/content/sack-of-gold
- 下载：https://opengameart.org/sites/default/files/gold_sack.wav
- 授权：CC0 1.0，https://creativecommons.org/publicdomain/zero/1.0/
- 原文件：48 kHz、双声道浮点 WAV，1.882 秒，729370 字节。
- 原文件 SHA-256：`f3f8aaafefa1db77b69a584abd16355f2a04c5c3b24d6551f32a3e042370f958`
- 发布文件：`dist/demo/assets/audio/coins-pouch-soft.mp3`
- 发布文件 SHA-256：`3c074891770669ce7081e0ff17e09b4ad60362b96be57593ab21e5173bb85aa1`

素材是钱袋落在桌面以及硬币晃动的实录。剪成一次短促落袋、随后轻微零钱移动，避免日常营业多次播放时拖得太长。新路径避免手机继续缓存旧文件；旧 `coins-bag.mp3` 留作历史对照。主音量、播放相对增益和用户选择的 E 庆祝音不在本次资产更改范围内。

## 处理

原素材保留在 `/workspace/audio-sources/gold_sack.wav`，无需发布源 WAV。先剪 0.075–0.68 秒的落袋段与 0.96–1.61 秒的零钱段，第二段延后 120 毫秒，分别以 0.75 / 0.42 相对音量混合。首尾加渐变，切除低频杂声，压低原先刺耳的高频金属共振。

可复现 FFmpeg 滤镜（第一步生成 44.1 kHz、双声道、16 位中间 WAV）：

```text
[0:a]asplit=2[a][b];
[a]atrim=start=0.075:end=0.68,asetpts=PTS-STARTPTS,afade=t=in:d=0.012,afade=t=out:st=0.43:d=0.175,volume=0.75[drop];
[b]atrim=start=0.96:end=1.61,asetpts=PTS-STARTPTS,afade=t=in:d=0.025,afade=t=out:st=0.43:d=0.22,volume=0.42,adelay=120|120[coins];
[drop][coins]amix=inputs=2:normalize=0,highpass=f=90,lowpass=f=4500:p=2,equalizer=f=3200:t=q:w=0.8:g=-5,acompressor=threshold=0.10:ratio=3:attack=7:release=90:makeup=1,apad,atrim=duration=0.95,afade=t=out:st=0.72:d=0.23
```

再从中间 WAV 使用以下滤镜，编码为双声道、44.1 kHz、160 kbit/s MP3：

```text
lowpass=f=3000:p=2,lowpass=f=3000:p=2,volume=29dB,alimiter=limit=0.35:attack=5:release=70:level=0,volume=-4dB,afade=t=out:st=0.72:d=0.23
```

滤波后的补偿增益只恢复已被削减的能量；最终仍低于旧音效的峰值与平均能量。没有把主音量调低来替代更换素材。

## 检查与试听限制

以下为 MP3 解码为 44.1 kHz 双声道浮点后的测量，能量占比用两声道分别加 Hann 窗后 FFT 的功率求和：

| 指标 | 旧 coins-bag | 新 coins-pouch-soft |
| --- | --- | --- |
| 实际音频长度 | 1.25 秒 | 0.95 秒 |
| 峰值 | -3.54 dBFS | -13.54 dBFS |
| RMS | -24.43 dBFS | -27.35 dBFS |
| 3 kHz 以上功率占比 | 76.40% | 6.74% |
| 文件大小 | 26194 字节 | 20456 字节 |

文件可正常解码，无 NaN / Inf，文件和授权来源已核对。当前执行环境没有可供代理实际听感判断的音频监听能力；没有声称已经在耳机、手机或微信里试听通过。最终清晰度、舒适度与主观音量仍需真机试听。
