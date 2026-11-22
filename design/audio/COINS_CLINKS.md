# 硬币落入容器的收钱声

v30 当前选择：默认播放下文的玻璃杯录音 `coins-glass-clinks.mp3`，落罐录音保留为设置内对照。原文件与处理参数保留不变；E 过关音的播放增益另降为原来的 55%。以下保留 v29 两份素材的来源与处理记录，主 / 对照标题指当时的选择。

根据 v28 反馈，更换真实录音和动作来源。主音效使用硬币落入罐中并滚动，另保留一个硬币落入玻璃杯的简短对照。不再使用钱袋落桌的撞击，也不把金属声整体削到 3 kHz 以下。两段都没有添加合成提示音、低沉撞击或其他物体的声效。

## 主音效：硬币落入罐中

- 文件：`dist/demo/assets/audio/coins-jar-pour.mp3`
- 来源：**Coins Dropping**，**AlyssaB2043**，https://freesound.org/people/AlyssaB2043/sounds/466846/
- 作者说明：硬币掉落、在罐中滚动，可用作硬币掉落声。
- 授权：来源页明确 **Creative Commons 0**，https://creativecommons.org/publicdomain/zero/1.0/
- 使用公开 HQ 预览：https://cdn.freesound.org/previews/466/466846_9648444-hq.mp3
- 预览 SHA-256：`27572b0d23eb9f7628dd6b04b3112042160fb8b33d601fea9be9528a3d3a4b54`
- 截取 35.05–35.93 秒，实际解码时长 0.88 秒。
- 发布 SHA-256：`2b63c9f127a74dcbd6b61816e71fcdffcceb684d72f66b16ca7d6cff30245949`

原 HQ 预览保留在 `/workspace/audio-sources/coins-jar-source.mp3`，无需登录下载原件。来源页 HTML 保留在 `/workspace/audio-sources/jar-coins-page.html`。使用以下 FFmpeg 音频滤镜，编码为双声道、44.1 kHz、160 kbit/s MP3：

```text
atrim=start=35.05:end=35.93,asetpts=PTS-STARTPTS,highpass=f=180:p=2,equalizer=f=3000:t=q:w=2:g=-2,equalizer=f=5750:t=q:w=2:g=-1.5,lowpass=f=15000:p=2,acompressor=threshold=0.13:ratio=1.7:attack=2:release=50:makeup=1,volume=2dB,alimiter=limit=0.40:attack=1:release=35:level=0,afade=t=in:d=0.008,afade=t=out:st=0.70:d=0.18
```

## 对照：几次硬币落入玻璃杯

- 文件：`dist/demo/assets/audio/coins-glass-clinks.mp3`
- 来源：**COINS IN A GLASS 17.wav**，**stebbi30000**（Freesound 上传者），https://freesound.org/people/stebbi30000%40gmail.com/sounds/341416/
- 作者说明：冰岛硬币被投入玻璃杯。
- 授权：来源页明确 **Creative Commons 0**，https://creativecommons.org/publicdomain/zero/1.0/
- 使用公开 HQ 预览：https://cdn.freesound.org/previews/341/341416_1620724-hq.mp3
- 预览 SHA-256：`06aeb29a14dcd79dcf37b28b91834e6242bcba3703d2a8cfd48f07f3cada3b68`
- 截取 0.15–1.05 秒，实际解码时长 0.90 秒。
- 发布 SHA-256：`984442a0d080b43c176f069f5940836a6c8e3225448307c622f61a41c2af644e`

原 HQ 预览保留在 `/workspace/audio-sources/coins-glass17-source.mp3`。公开嵌入页保留在 `/workspace/audio-sources/glass17-embed.html`，含预览地址；来源页授权另外通过网页读取核对。滤镜：

```text
atrim=start=0.15:end=1.05,asetpts=PTS-STARTPTS,highpass=f=180:p=2,equalizer=f=2750:t=q:w=1.2:g=-1.5,equalizer=f=10200:t=q:w=2:g=-2.5,lowpass=f=15000:p=2,acompressor=threshold=0.10:ratio=2.2:attack=1.5:release=45:makeup=1.2,volume=10dB,alimiter=limit=0.40:attack=1:release=35:level=0,afade=t=in:d=0.008,afade=t=out:st=0.76:d=0.14
```

## 技术检查与听感边界

数据为发布 MP3 解码到 44.1 kHz 双声道浮点后的值；能量占比用两声道分别加 Hann 窗后 FFT 的功率求和。文件都能正常解码，没有 NaN / Inf 或削顶。MP3 容器时长略长于实际音频，因为存在编码填充。

| 指标 | 最初钱袋混音 | v28 闷袋声 | v29 罐中落币 | 玻璃杯对照 |
| --- | --- | --- | --- | --- |
| 解码长度 | 1.25 秒 | 0.95 秒 | 0.88 秒 | 0.90 秒 |
| 峰值 | -3.54 dBFS | -13.54 dBFS | -9.55 dBFS | -11.20 dBFS |
| RMS | -24.43 dBFS | -27.35 dBFS | -27.50 dBFS | -29.10 dBFS |
| 300 Hz 以下功率 | 16.19% | 46.96% | 0.06% | 0.03% |
| 3 kHz 以上功率 | 76.40% | 6.74% | 90.51% | 83.93% |
| 文件大小 | 26194 字节 | 20456 字节 | 18852 字节 | 19374 字节 |

本次主音效的平均能量与 v28 接近，变化来自真实硬币声和低频撞击的去除；高频保留用于识别硬币碰撞，窄带削减与短瞬态限幅用于控制突刺。能量分布不能证明主观上一定舒适，也不能代替试听。

当前执行环境没有供代理实际判断听感的音频监听能力，没有声称已经通过手机、耳机或微信试听。仍需用户试听确认具体声音、清脆度和响度。主音量、用户偏好、iPhone Audio Session 和 E 庆祝音均保持原样；旧音效文件保留便于回退，不默认叠加播放。
