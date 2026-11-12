# 短音效接口

由 audio.js 的 Web Audio 合成器在首次允许声音时生成 AudioBuffer 并缓存：click、confirm、increase、decrease、message、achievement、term、graduation。

不需要外部 WAV 文件；每次播放只创建一次性 BufferSource，复用 Context 与 Buffer，最多四个短音效同时发声。音效设置里可逐项试听。消息和成就业务将在 V3.2/V3.6 接入；当前仅新相识/关系阶段里程碑使用对应提示，不假装已有聊天和完整成就系统。
