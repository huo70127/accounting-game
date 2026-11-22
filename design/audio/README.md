# 已确认的过关音效

默认采用 **E · 小乐队庆祝**，对应游戏中的 `dist/demo/assets/audio/level-complete.mp3`。
原始试听文件为 `/workspace/audio-candidates/E-mini-orchestra-fanfare.mp3`，接入时未改动声音。

- A：保留原版清脆双拍作为风格参考。
- F：保留管弦乐庆祝句；将来可考虑用于八周通关或最终结算，目前未接入游戏。
- 默认完成音继续遵循现有播放规则：完成体验周或完成清算核对各播放一次，重新打开页面不重复播放。

素材来源、署名、授权与处理方式见仓库根目录 `ASSET_CREDITS.md`。
F 为 spuispuin 的 “Won! (Orchestral winning jingle)” 衍生剪辑，CC BY 4.0：
https://opengameart.org/content/won-orchestral-winning-jingle
https://creativecommons.org/licenses/by/4.0/

此目录用于保留设计选择，不包含在静态网站的发布目录中。

v30 默认收钱声采用硬币落入玻璃杯的 CC0 实录 `coins-glass-clinks.mp3`，v29 的落罐声 `coins-jar-pour.mp3` 保留为设置内对照。E 庆祝声保留原文件，单独播放增益降为原来的 55%，合成回退同样降低；主音量默认值仍为 82%。来源、精确参数、数值检查与试听限制见 `COINS_CLINKS.md`。

v28 的 `coins-pouch-soft.mp3` 被用户反馈为像关门或整袋钱落桌，现已替换。其来源与处理记录仍保存在 `COINS_SOFT.md`，作为历史对照。E 庆祝音保持原文件。
