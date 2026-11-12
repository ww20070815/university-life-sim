# V2.0 交付与验收报告

## 1. 升级范围

在原 V1 工程中完成视觉和交互升级，保留 32 回合、5 项能力与金钱、7 行动、18 事件、8 结局和原判定优先级、学期总结、手记、自动存档、新局、清档、恢复。核心规则代码与修改前副本逐字一致，未调整平衡。

## 2. 男主角与女主角

原创成年中国大学生、自然人体比例、统一半写实插画。男主深蓝休闲外套、白 T 恤、长裤和浅色鞋，清爽沉稳；女主高马尾、米白衬衫、青绿针织衫、蓝灰长裤，独立明亮。两张透明图集均包含平静、开心、疲惫、沮丧、闭眼、学士服六格。角色选择只保存外观，不改数值。

精度说明：已使用生成式原创人物图像，不以几何图形冒充成品；表情图集存在少量姿态和细节差异，未制作 Live2D 或独立头发骨骼。当前待机为克制的整体呼吸、轻微旋转、面部闭眼帧，后续可由原画师进一步统一对齐。

## 3. 现代中式校园审美

当代石材/玻璃教学楼、梧桐树、上床下桌寝室、食堂窗口和田径跑道，配合奶油白、天青、青绿、浅金、少量粉色，使用宋体标题与系统无衬线正文、竖排题记、留白和柔和阳光。没有古装建筑、传统符号堆叠或管理后台式大表格。

## 4. 素材清单

| 资源 | 路径 | 大约大小 |
| --- | --- | --- |
| 男主六格图集 | assets/characters/male.webp | 216 KiB |
| 女主六格图集 | assets/characters/female.webp | 248 KiB |
| 主广场 | assets/backgrounds/campus.webp | 304 KiB |
| 图书馆 | assets/backgrounds/library.webp | 270 KiB |
| 宿舍 | assets/backgrounds/dorm.webp | 207 KiB |
| 操场 | assets/backgrounds/track.webp | 239 KiB |
| 食堂 | assets/backgrounds/canteen.webp | 280 KiB |
| 毕业礼堂 | assets/backgrounds/graduation.webp | 280 KiB |

主素材合计约 2 MiB。全部在本地。背景使用 WebP 加 SVG 后备图层，人物加载失败显示明确文字提示，游戏逻辑继续运行。仅首屏校园图预加载，其他背景在第一次用到时由浏览器加载。生成提示词和内置 imagegen 使用记录见 art-direction.md。

## 5. 动画与交互

人物呼吸、面部闭眼、情绪切换、点击开心反馈、按钮悬停/按压、真实增减浮字、数字强调、进度条变化、背景交叉淡入、页面与弹窗登场、学期回顾过场、毕业学士服与少量星光。结局通过边框色和延毕时的低饱和画面区分。优先使用 transform/opacity，数值结算不依赖动画计时器。设置开关及系统减少动画规则可关闭动效。

## 6. 跨平台布局与检查范围

实际在 Windows 当前可用的内置浏览器完成交互测试；本轮没有单独运行 Chrome、Edge、iOS Safari、安卓或 iPad 真机。

以下为真实浏览器视口检查，分别覆盖首页、游戏主界面、事件弹窗、角色选择弹窗；页面 scrollWidth 与 clientWidth 一致，弹窗内部无横向滚动：

| 设置视口宽度 | 页面可视宽度（减去桌面滚动条） | 内容宽度 |
| --- | --- | --- |
| 320 | 305 | 305 |
| 360 | 345 | 345 |
| 375 | 360 | 360 |
| 390 | 375 | 375 |
| 412 | 397 | 397 |
| 430 | 415 | 415 |
| 768 | 753 | 753 |
| 1024 | 1009 | 1009 |
| 1366 | 1351 | 1351 |

另检查 844×390 横屏，clientWidth 与 scrollWidth 都为 829。上述结果是尺寸和交互模拟，不能代替真机渲染、触摸或系统安装验收。测量记录在 screenshots/viewport-results.json；桌面及手机尺寸截图在 screenshots/。

## 7. PWA

已完成 Manifest、应用名/短名、相对 id/start_url/scope、standalone、主题色、192/512 桌面图标、180 Apple Touch 图标和 iOS 启动元数据。本版有意不注册 Service Worker，避免未经充分测试的更新缓存；不承诺托管版离线使用。添加到主屏幕是否显示、能否作为独立窗口运行，由目标浏览器决定，需 HTTPS 和真机验收。

## 8. 修改与新增文件

修改：index.html、style.css、game.js 的界面部分、preview.cjs、README.md。

新增：visual.js、manifest.webmanifest、.gitignore、assets/ 下的角色/场景/图标、scripts/prepare-assets.py、tests/v2.test.cjs、tests/storage-ui.test.cjs、tests/fixtures/v1-game.cjs、docs/ 美术记录与本报告、截图。原核心测试 tests/game.test.cjs 原样保留。素材生成输入 tests/art-input.json 含本机源文件路径，仅本地保留且 Git 忽略。

## 9. 实际测试结果

执行命令：

```powershell
node --check game.js
node --check visual.js
node --check preview.cjs
node --test tests/game.test.cjs tests/v2.test.cjs tests/storage-ui.test.cjs
git diff --check
```

17 组自动测试通过：1000 局完整随机流程、8 个结局真实路线可达、边界和余额、重复提交锁、固定事件、原版源码对照、128 条完整 V1 路线逐阶段对照、V1 四种阶段的 UI 初始化/补选人物不写原档、外观设置隔离、表情与场景、Manifest/相对资源、体积预算、预览路由。

存储 UI 测试使用最小 DOM 适配器执行真实 game.js/visual.js，验证存储副作用，不评估画面。预览路由测试通过请求/响应适配器执行真实服务器回调，无需网络端口。与真实浏览器视口检查区分记录。

真实浏览器实际完成：

- 女主开局，七种行动逐项执行并核对图书馆/广场/宿舍/操场映射。
- 事件未选时刷新：同一事件、同一属性恢复，没有重复学习奖励。
- 更换男主：属性文字一致，仍在第 9 回合。
- 完整 32 回合、8 次总结、剧情结果反馈、毕业选择，得到六边形战士。
- 毕业后刷新，首页重温结局；查看手记、返回首页。
- 关闭动画后主角计算样式 animationName 为 none；人物点击反馈显示 happy。
- 取消清档保留旅程；确认清档后继续按钮禁用，刷新仍无存档；重新选人物并正常开局。
- 检查时页面控制台未报告应用 JavaScript 错误。

## 10. 尚需真实设备验证

建议在上线前用以下清单逐项检查，不要据桌面模拟直接宣布真机通过：

1. Windows Chrome 与 Edge：文件打开和 HTTPS 托管均试玩，检查滚动、图像、键盘 Tab、连续点击和刷新。
2. iPhone Safari：竖屏/横屏、安全区、浏览器底部工具栏伸缩、事件弹窗滚动、返回后台 1 分钟后恢复。
3. 安卓 Chrome/Edge 和至少一种国产浏览器：触摸按钮、页面滚动、图片透明通道、表情、后台恢复、低电量/低性能下动画。
4. iPad/安卓平板：768 与 1024 附近宽度、横竖屏、人物脸部及主体完整可见，行动不被人物遮挡。
5. 真实旧玩家：更新前保存原键字符串；更新后在同设备同浏览器同网址继续，补选角色后核对数值、次数、学期、待选事件或原毕业结局。不要清除浏览器网站数据。
6. PWA：iOS 分享菜单添加主屏幕，安卓菜单添加/安装；从图标进入、确认名称图标、独立窗口、安全区及存档。网络离线不作为本版本的托管版支持项。
7. 故障模式：临时让某个图片 URL 无效，确认背景备用图或人物提示出现且免费行动可继续；无痕/禁存储时确认保存失败提示。
8. Windows 双击 index.html：当前自动化浏览器仅支持 HTTP/HTTPS，本轮未测试 file://，需人工确认文件模式与该浏览器本地存储行为。

## 11. V1 存档兼容结论

SAVE_KEY 仍为 university-four-years-v1，VERSION 仍为 1。没有新增游戏状态字段。有效旧档保留全部属性、counts、pendingEvent、turn、phase、summaries、termStart 和 logs。初始化只读，角色选择只写 university-four-years-visual-v2；坏档也不在初始化时被覆盖。用户明确确认新局/清档后才进行对应替换/删除。

## 12. Git 安全与更新原仓库

最初文件夹无 .git。已先创建 V1 压缩备份 backups/v1-before-v2-2026-11-11.zip，复跑 V1 测试，再读取原仓库 main（86acb28）历史；本地 V1 文件与该基线没有代码差异。建立本地 main 跟踪 origin/main，并在 v2-visual 上开发。没有向线上 main 或任何远程分支推送。

改动保持为可检查的工作区文件，尚未代替用户提交发布。README 提供 git add、commit、push v2-visual 的完整步骤，再建立 PR 审核合并到 main。压缩备份、素材本机输入和 node_modules 均被忽略；不需要 force push。

## 13. 保持网址不变

继续使用仓库 ww20070815/university-life-sim 和原来的 GitHub Pages 发布源；index.html 仍在根目录，资源全部使用 ./ 相对路径。合并新版时不改仓库名、不换发布域名、不改为新的 Site 地址。因此原网站入口继续为 https://ww20070815.github.io/university-life-sim/ 。保持原浏览器和同一 HTTPS 域名，就能继续读取原 localStorage 键。
